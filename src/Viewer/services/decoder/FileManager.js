import {Tarball} from "@obsidize/tar-browserify";
import JSZip from "jszip";
import pako from "pako";
import {v1 as uuidv1} from "uuid";

import {ZstdCodec} from "../../../../customized-packages/zstd-codec/js";
import CLP_WORKER_PROTOCOL from "../CLP_WORKER_PROTOCOL";
import {readFile} from "../GetFile";
import {binarySearchWithTimestamp} from "../utils";
import WorkerPool from "../WorkerPool";
import {ClpArchiveDecoder} from "./ClpArchiveDecoder";
import {DataInputStream, DataInputStreamEOFError} from "./DataInputStream";
import FourByteClpIrStreamReader from "./FourByteClpIrStreamReader";
import ResizableUint8Array from "./ResizableUint8Array";
import SimplePrettifier from "./SimplePrettifier";
import {combineArrayBuffers, formatSizeInBytes} from "./utils";

const FILE_MANAGER_LOG_SEARCH_MAX_RESULTS = 1000;
const FILE_MANAGER_LOG_SEARCH_CHUNK_SIZE = 10000;

/**
 * File manager to manage and track state of each file that is loaded.
 */
class FileManager {
    static #decompressZstd = async (data) => {
        const zstd = await new Promise((resolve) => {
            ZstdCodec.run((zstd) => {
                resolve(zstd);
            });
        });
        const zstdCtx = new zstd.Streaming();

        return zstdCtx.decompress(data).buffer;
    };

    /**
     * Initializes the class and sets the default states.
     *
     * @param {string} fileSrc
     * @param {boolean} prettify
     * @param {number} logEventIdx
     * @param {number} initialTimestamp
     * @param {number} pageSize
     * @param {function} loadingMessageCallback
     * @param {function} updateStateCallback
     * @param {function} updateLogsCallback
     * @param {function} updateFileInfoCallback
     * @param {function} updateSearchResultsCallback
     */
    constructor (fileSrc, prettify, logEventIdx, initialTimestamp, pageSize,
        loadingMessageCallback,
        updateStateCallback, updateLogsCallback, updateFileInfoCallback,
        updateSearchResultsCallback) {
        this._fileSrc = fileSrc;
        this._prettify = prettify;
        this._initialTimestamp = initialTimestamp;
        this._logEventOffsets = [];
        this._logEventOffsetsFiltered = [];
        this.logEventMetadata = [];
        this._irStreamReader = null;
        this._displayedMinVerbosityIx = -1;
        this._arrayBuffer = null;
        this._outputResizableBuffer = null;
        this._availableVerbosityIndexes = new Set();
        this._IRStreamHeader = null;
        this._timestampSorted = false;

        this._fileInfo = {
            name: null,
            path: null,
            dbID: null,
        };

        this.state = {
            pageSize: pageSize,
            pages: null,
            page: null,
            prettify: prettify,
            logEventIdx: logEventIdx,
            lineNumber: null,
            columnNumber: null,
            numberOfEvents: null,
            verbosity: null,
            compressedHumanSize: null,
            decompressedHumanSize: null,
            downloadChunkSize: 10000,
        };

        this._logs = "";
        this._logsArray = null; // for Single-file CLP Archive only
        this._logsPageLineOffsetsArray = [];

        this._loadState = {
            prevCheckTime: null,
        };

        this._textDecoder = new TextDecoder();
        this._prettifier = new SimplePrettifier();
        this._minAvailableVerbosityIx = FourByteClpIrStreamReader.VERBOSITIES.length - 1;

        this._loadingMessageCallback = loadingMessageCallback;
        this._updateStateCallback = updateStateCallback;
        this._updateLogsCallback = updateLogsCallback;
        this._updateFileInfoCallback = updateFileInfoCallback;
        this._updateSearchResultsCallback = updateSearchResultsCallback;

        this._PRETTIFICATION_THRESHOLD = 200;

        this._logSearchJobId = 0;

        this._workerPool = new WorkerPool();
    }


    /**
     * Sets up the variables needed for decoding of pages to database.
     */
    _setupDecodingPagesToDatabase () {
        this.state.downloadChunkSize = 10000;
        const numOfEvents = this._logEventOffsets.length;
        this.state.downloadPageChunks = (0 === (numOfEvents % this.state.downloadChunkSize))
            ? Math.floor(numOfEvents/this.state.downloadChunkSize)
            : Math.floor(numOfEvents/this.state.downloadChunkSize) + 1;
    }

    /**
     * Sends the chunks to the worker pool to be decompressed into database.
     */
    startDecodingPagesToDatabase () {
        console.debug("Starting download...");
        for (let chunk = 1; chunk <= this.state.downloadPageChunks; chunk++) {
            this._decodePageWithWorker(chunk, this.state.downloadChunkSize);
        }
    }

    /**
     * Terminates all the workers in pool.
     */
    stopDecodingPagesToDatabase () {
        console.debug("Stopping download...");
        this._workerPool.clearPool();
    }

    /**
     * Callback when progress is updated in file getXMLHttpRequest.
     * @param {number} numBytesDownloaded Number of bytes downloaded
     * @param {number} fileSizeBytes Total file size
     * @private
     */
    _updateFileLoadProgress = (numBytesDownloaded, fileSizeBytes) => {
        const percentComplete = (numBytesDownloaded / fileSizeBytes) * 100;
        if (this._loadState.prevCheckTime != null) {
            const loadedTime = performance.now() - this._loadState.prevCheckTime;
            const downloadSpeed =
                `${formatSizeInBytes(numBytesDownloaded / (loadedTime / 1000),
                    false)}/s`;
            this._loadingMessageCallback(
                `Download Progress: ${percentComplete.toFixed(
                    2)}% at ${downloadSpeed}`
            );
        } else {
            this._loadingMessageCallback(
                `Download Progress: ${percentComplete.toFixed(2)}%`);
            this._loadState.prevCheckTime = performance.now();
        }
    };

    /**
     * Callback when file is size is received from getXMLHttpRequest.
     * @param {event} evt
     * @private
     */
    _updateFileSize = (evt) => {
        this._loadingMessageCallback(
            `Loading ${formatSizeInBytes(evt, false)} file from object store...`
        );
    };

    /**
     * Builds file index from startIndex, endIndex, verbosity,
     * timestamp for each log event.
     */
    _buildIndex () {
        // Building log event offsets
        const dataInputStream = new DataInputStream(this._arrayBuffer);
        this._outputResizableBuffer = new ResizableUint8Array(511000000);
        this._irStreamReader = new FourByteClpIrStreamReader(dataInputStream,
            this._prettify ? this._prettifyLogEventContent : null);
        const decoder = this._irStreamReader._streamProtocolDecoder;

        try {
            this._timestampSorted = true;
            let prevTimestamp = decoder._metadataTimestamp;
            while (this._irStreamReader.indexNextLogEvent(this._logEventOffsets)) {
                const currEv = this._logEventOffsets[this._logEventOffsets.length - 1];
                const timestamp = currEv.timestamp;
                if (timestamp < prevTimestamp) {
                    this._timestampSorted = false;
                }
                currEv.prevTs = prevTimestamp;
                prevTimestamp = timestamp;
            }
        } catch (error) {
            // Ignore EOF errors since we should still be able
            // to print the decoded messages
            if (error instanceof DataInputStreamEOFError) {
                // TODO Give visual indication the stream is truncated to user
                console.error("Stream truncated!");
            } else {
                throw error;
            }
        }

        this.state.numberOfEvents = this._logEventOffsets.length;
        if (this.state.numberOfEvents > 0) {
            this._IRStreamHeader = this._arrayBuffer.slice(0, this._logEventOffsets[0].startIndex);
        }
    };

    /**
     * Append token to the end of this._fileInfo.name
     * @param {string} token to append
     * @private
     */
    _appendToFileInfoName (token) {
        this._fileInfo.name += token;
        this._updateFileInfoCallback(this._fileInfo);
    }

    /**
     * Update input file and status
     * @param {object} file to use as input
     * @private
     */
    _updateInputFileInfo (file) {
        this._fileInfo = file;
        this._fileInfo.dbID = uuidv1();
        this._updateFileInfoCallback(this._fileInfo);

        this.state.compressedHumanSize = formatSizeInBytes(file.data.byteLength, false);
        this._loadingMessageCallback(`Decompressing ${this.state.compressedHumanSize}.`);

        return file;
    }

    /**
     * Decode plain-text log buffer and update editor state
     * @param {Uint8Array} decompressedLogFile buffer to
     * decode to string and update editor
     * @private
     */
    _decodePlainTextLogAndUpdate (decompressedLogFile) {
        // Update decompression status
        this.state.decompressedHumanSize = formatSizeInBytes(decompressedLogFile.byteLength, false);
        this._loadingMessageCallback(`Decompressed ${this.state.decompressedHumanSize}.`);

        this._logsArray = this._textDecoder.decode(decompressedLogFile).split("\n");

        // Update state
        this.state.verbosity = -1;
        this.state.lineNumber = 1;
        this.state.columnNumber = 1;
        this.state.numberOfEvents = this._logsArray.length;
        this.computePageNumFromLogEventIdx();
        this.createPages();

        this.decodePage();

        // FIXME: dirty hack to get search working
        this._logEventOffsetsFiltered.length = this._logsArray.length;
        this._logEventOffsets.length = this._logsArray.length;
        this._setupDecodingPagesToDatabase();

        this._updateStateCallback(CLP_WORKER_PROTOCOL.UPDATE_STATE, this.state);
    }

    /**
     * Decode IRStream log buffer and update editor state
     * @param {Uint8Array} decompressedIRStreamFile buffer to
     * decode to log events and update editor
     * @private
     */
    _decodeIRStreamLogAndUpdate (decompressedIRStreamFile) {
        // Need to cache this for repeated access
        this._arrayBuffer = decompressedIRStreamFile;

        // Approximated decompressed file size
        this.state.decompressedHumanSize = formatSizeInBytes(this._arrayBuffer.byteLength, false);

        this._buildIndex();
        this.filterLogEvents(-1);

        const numberOfEvents = this._logEventOffsets.length;
        if (null !== this._initialTimestamp) {
            this.state.logEventIdx = this.getLogEventIdxFromTimestamp(this._initialTimestamp);
            console.debug(`Initial Timestamp: ${this._initialTimestamp}`);
            console.debug(`logEventIdx: ${this.state.logEventIdx}`);
        } else if (null === this.state.logEventIdx
            || this.state.logEventIdx > numberOfEvents
            || this.state.logEventIdx <= 0) {
            this.state.logEventIdx = numberOfEvents;
        }

        this.createPages();
        this.computePageNumFromLogEventIdx();
        this.decodePage();
        this.computeLineNumFromLogEventIdx();

        this._setupDecodingPagesToDatabase();

        this._updateStateCallback(CLP_WORKER_PROTOCOL.UPDATE_STATE, this.state);
    }


    /**
     * Get the file name associated with this.fileSrc,
     * whether it's a File object or a URL.
     *
     * @return {string}
     * @private
     */
    _getFileName () {
        return this._fileSrc instanceof File ?
            this._fileSrc.name :
            new URL(this._fileSrc).pathname;
    }

    /**
     * Extracts and retrieves content of the first file within a ZIP archive.
     *
     * @return {Uint8Array} content of the first file as a Uint8Array.
     * @throws {Error} if there is an issue loading or extracting the archive
     * @private
     */
    async _getZipFirstFileContent () {
        const zipArchive = await new JSZip().loadAsync(this._fileInfo.data);
        const [filePathToDecompress] = Object.keys(zipArchive.files);
        this._appendToFileInfoName("/" + filePathToDecompress);

        return zipArchive.files[filePathToDecompress].async("uint8array");
    }

    /**
     * Decompresses and retrieves the content of the first file within a
     * TAR GZIP archive.
     *
     * @return {Uint8Array} content of the first file as a Uint8Array.
     * @throws {Error} if there is an issue loading or extracting the archive
     * @private
     */
    _getTarGzipFirstFileContent () {
        const tarArchive = pako.inflate(this._fileInfo.data, {to: "Uint8Array"});
        const [entry] = Tarball.extract(tarArchive).filter((entry) => entry.isFile());
        this._appendToFileInfoName("/" + entry.fileName);

        return entry.content;
    }

    /**
     * Load log file into editor
     */
    async loadLogFile () {
        const fileName = this._getFileName();
        const fileInfo = await readFile(this._fileSrc, this._updateFileLoadProgress);
        this._updateInputFileInfo(fileInfo);

        const fileExtensionHandlers = {
            ".clp": async () => {
                console.log("Opening CLP compressed archive");
                return this._decodeClpArchiveLogAndUpdate(fileInfo.data);
            },
            ".clp.zst": async () => {
                console.log("Opening CLP IRStream compressed file: " + fileName);
                return FileManager.#decompressZstd(fileInfo.data);
            },
            ".zst": async () => {
                console.log("Opening zst compressed file: " + fileName);
                return FileManager.#decompressZstd(fileInfo.data);
            },
            ".zip": async () => {
                console.log("Opening zip compressed archive: " + fileName);
                return this._getZipFirstFileContent();
            },
            ".tar.gz": async () => {
                console.log("Opening tar.gz compressed archive: " + fileName);
                return this._getTarGzipFirstFileContent();
            },
            ".gz": async () => {
                console.log("Opening gzip compressed file: " + fileName);
                return pako.inflate(fileInfo.data, {to: "Uint8Array"});
            },
            ".gzip": async () => {
                console.log("Opening gzip compressed file: " + fileName);
                return pako.inflate(fileInfo.data, {to: "Uint8Array"});
            },
        };

        let isPlainTextFile = true;
        for (const extension in fileExtensionHandlers) {
            if (fileName.endsWith(extension)) {
                isPlainTextFile = false;

                const decompressedLogFile = await fileExtensionHandlers[extension]();
                if (".clp.zst" === extension) {
                    this._decodeIRStreamLogAndUpdate(decompressedLogFile);
                } else if (".clp" !== extension) {
                    this._decodePlainTextLogAndUpdate(decompressedLogFile);
                }

                break;
            }
        }

        if (isPlainTextFile) {
            console.log("Opening plain-text file: " + fileName);
            this._decodePlainTextLogAndUpdate(fileInfo.data);
        }
    }

    /**
     * Decode CLP Archive log buffer and update editor state
     * @param {Uint8Array} decompressedLogFile buffer to
     * decode to string and update editor
     * @private
     */
    async _decodeClpArchiveLogAndUpdate (decompressedLogFile) {
        const clpArchiveDecoder = new ClpArchiveDecoder(decompressedLogFile);
        this._logsArray = await clpArchiveDecoder.decode();

        // Update decompression status
        this.state.decompressedHumanSize =
            formatSizeInBytes(this._logsArray.join("\n").length, false);
        this._loadingMessageCallback(`Decompressed ${this.state.decompressedHumanSize}.`);

        // Update state
        this.state.verbosity = -1;
        this.state.lineNumber = 1;
        this.state.columnNumber = 1;
        this.state.numberOfEvents = this._logsArray.length;
        this.computePageNumFromLogEventIdx();
        this.createPages();
        this.decodePage();

        // FIXME: dirty hack to get search working
        this._logEventOffsetsFiltered.length = this._logsArray.length;
        this._logEventOffsets.length = this._logsArray.length;
        this._setupDecodingPagesToDatabase();

        this._updateStateCallback(CLP_WORKER_PROTOCOL.UPDATE_STATE, this.state);
    }

    /**
     * @param {number} timestamp The timestamp to search for as milliseconds
     * since the UNIX epoch.
     * @return {number} The logEventIdx for the log event whose timestamp is
     * greater than or equal to the given timestamp
     */
    getLogEventIdxFromTimestamp (timestamp) {
        const numberOfEvents = this._logEventOffsets.length;
        if (this._timestampSorted) {
            const targetIdx = binarySearchWithTimestamp(timestamp,
                this._logEventOffsets);
            return null === targetIdx ? numberOfEvents : targetIdx + 1;
        } else {
            for (let idx = 0; idx < numberOfEvents; idx++) {
                if (this._logEventOffsets[idx].timestamp >= timestamp) {
                    return idx + 1;
                }
            }
            return numberOfEvents;
        }
    }

    /**
     * Gets the page of the current log event
     */
    computePageNumFromLogEventIdx () {
        // FIXME: dirty hack for Single-file CLP Archive
        if (null !== this._logsArray) {
            this.state.page = Math.floor(this.state.logEventIdx / this.state.pageSize) + 1;
            return;
        }

        for (let index = 0; index < this._logEventOffsetsFiltered.length; index++) {
            const event = this._logEventOffsetsFiltered[index];
            const logEventIndex = event.mappedIndex + 1;
            if (logEventIndex >= this.state.logEventIdx) {
                this.state.page = Math.floor(index / this.state.pageSize) + 1;
                return;
            }
        }
        this.state.page = this.state.pages;
    };

    /**
     * Creates pages from the filtered log events and the page size.
     */
    createPages () {
        if (null !== this._logsArray) {
            // for Single-file CLP Archive only
            this.state.page = 1;
            if (0 === this.state.numberOfEvents % this.state.pageSize) {
                this.state.pages = Math.floor(this.state.numberOfEvents / this.state.pageSize);
            } else {
                this.state.pages = Math.floor(this.state.numberOfEvents / this.state.pageSize) + 1;
            }
            return;
        }

        if (this._logEventOffsetsFiltered.length <= this.state.pageSize) {
            this.state.page = 1;
            this.state.pages = 1;
        } else {
            const numOfEvents = this._logEventOffsetsFiltered.length;
            if (0 === numOfEvents % this.state.pageSize) {
                this.state.pages = Math.floor(numOfEvents / this.state.pageSize);
            } else {
                this.state.pages = Math.floor(numOfEvents / this.state.pageSize) + 1;
            }

            this.state.page = this.state.pages;
        }
    };


    /**
     * Sends page to be decoded with worker.
     *
     * @param {number} page Page to be decoded.
     * @param {number} pageSize Size of the page to be decoded.
     * @private
     */
    _decodePageWithWorker (page, pageSize) {
        const numEventsAtLevel = this._logEventOffsetsFiltered.length;

        // Calculate where to start decoding from and how many events to decode
        // On final page, the numberOfEvents is likely less than pageSize
        const targetEvent = ((page-1) * pageSize);
        const numberOfEvents = (targetEvent + pageSize >= numEventsAtLevel)
            ?numEventsAtLevel - targetEvent
            :pageSize;

        if (null !== this._logsArray) {
            // FIXME: dirty hack to get download working
            this._workerPool.assignTask({
                dbID: this._fileInfo.dbID,
                page: page,
                pageLogs:
                    this._logsArray?.slice(targetEvent, targetEvent + numberOfEvents).join("\n"),
            });
            return;
        }

        const pageData = this._arrayBuffer.slice(
            this._logEventOffsets[targetEvent].startIndex,
            this._logEventOffsets[targetEvent + numberOfEvents - 1].endIndex + 1
        );
        const inputStream = combineArrayBuffers(this._IRStreamHeader, pageData);
        const logEvents = this._logEventOffsets.slice(targetEvent, targetEvent + numberOfEvents );

        this._workerPool.assignTask({
            dbID: this._fileInfo.dbID,
            page: page,
            logEvents: logEvents,
            inputStream: inputStream,
            pageLogs: null, // FIXME: dirty hack to get download working
        });
    }

    /**
     * Decodes the logs for the selected page (state.page).
     */
    decodePage () {
        if (null !== this._logsArray) {
            // for Single-file CLP Archive only
            const startingEventIdx = this.state.pageSize * (this.state.page - 1);
            const endingEventIdx = Math.min(
                this._logsArray.length,
                this.state.pageSize * (this.state.page));

            let offset = 0;
            this._logsPageLineOffsetsArray.length = 0;
            this._logs = "";

            for (let i = startingEventIdx; i< endingEventIdx; i++) {
                this._logs += this._logsArray[i] + "\n";
                this._logsPageLineOffsetsArray.push(offset);
                offset += this._logsArray[i].split("\n").length;
            }

            this._updateLogsCallback(this._logs);
            return;
        }

        const numEventsAtLevel = this._logEventOffsetsFiltered.length;

        // If there are no logs at this verbosity level, return
        if (0 === numEventsAtLevel) {
            this._updateLogsCallback("No logs at selected verbosity level");
            return;
        }

        // Calculate where to start decoding from and how many events to decode
        // On final page, the numberOfEvents is likely less than pageSize
        const logEventsBeginIdx = ((this.state.page - 1) * this.state.pageSize);
        const numOfEvents = Math.min(this.state.pageSize,
            numEventsAtLevel - logEventsBeginIdx);

        // Create IRStream Reader with the input stream
        const dataInputStream = new DataInputStream(this._arrayBuffer);
        this._irStreamReader = new FourByteClpIrStreamReader(dataInputStream,
            this.state.prettify ? this._prettifyLogEventContent : null);

        // Create variables to store output from reader
        this._outputResizableBuffer = new ResizableUint8Array(511000000);
        this._availableVerbosityIndexes = new Set();
        this.logEventMetadata = [];

        for (let i = logEventsBeginIdx; i < logEventsBeginIdx + numOfEvents; i++) {
            const event = this._logEventOffsetsFiltered[i];
            const decoder = this._irStreamReader._streamProtocolDecoder;

            this._irStreamReader._dataInputStream.seek(event.startIndex);

            // Set the timestamp before decoding the message.
            // If it is first message, use timestamp in metadata.
            if (event.mappedIndex === 0) {
                decoder._reset();
            } else {
                decoder._setTimestamp(
                    this._logEventOffsets[event.mappedIndex - 1].timestamp);
            }

            try {
                this._irStreamReader.readAndDecodeLogEvent(
                    this._outputResizableBuffer,
                    this.logEventMetadata
                );
                const lastEvent = this.logEventMetadata[this.logEventMetadata.length - 1];
                this._availableVerbosityIndexes.add(lastEvent["verbosityIx"]);
                lastEvent.mappedIndex = event.mappedIndex;
            } catch (error) {
                // Ignore EOF errors since we should still be able
                // to print the decoded messages
                if (error instanceof DataInputStreamEOFError) {
                    // TODO Give visual indication that the stream is truncated
                    console.error("Stream truncated.");
                } else {
                    console.log("random error");
                    throw error;
                }
            }
        }

        // Decode the text and set the available verbosities
        const logs = this._textDecoder.decode(
            this._outputResizableBuffer.getUint8Array());

        for (const verbosityIx of this._availableVerbosityIndexes) {
            if (verbosityIx < this._minAvailableVerbosityIx) {
                this._minAvailableVerbosityIx = verbosityIx;
            }
        }
        this._displayedMinVerbosityIx = this._minAvailableVerbosityIx;
        this._logs = logs.trim();
        this._updateLogsCallback(this._logs);
    };

    /**
     * Searches log events for a specified string or regular expression.
     *
     * @param {string} searchString string or regular expression to search for
     * @param {boolean} isRegex whether the search string is regular expression
     * @param {boolean} matchCase whether the search should be case-sensitive
     */
    searchLogEvents = (searchString, isRegex, matchCase) => {
        // increment job id for every new query
        //  so the last job can be interrupted by itself checking
        //  if the job id matches
        this._logSearchJobId++;

        // If the search string is empty,
        // or there are no logs at this verbosity level, return
        const numEventsAtLevel = this._logEventOffsetsFiltered.length;
        if (searchString === "") {
            return;
        } else if (0 === numEventsAtLevel) {
            return;
        }

        const pageEndEventIdx = Math.min(
            this.state.pageSize,
            numEventsAtLevel
        );

        // construct search RegExp
        const regexPattern = isRegex ? searchString :
            searchString.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regexFlags = matchCase ? "":"i";
        const searchRegex = new RegExp(regexPattern, regexFlags);

        // FIXME: this null check was added to hack searching for
        // Single-file CLP Archive
        if (null !== this._arrayBuffer) {
            const dataInputStream = new DataInputStream(this._arrayBuffer);

            this._irStreamReader = new FourByteClpIrStreamReader(dataInputStream, null);
            this._outputResizableBuffer = new ResizableUint8Array(100000);
        }

        const searchState = {
            isSearching: true,
            searchRegex: searchRegex,
            numTotalResults: 0,
            currPageIdx: 0,
            pageEndEventIdx: pageEndEventIdx,
            resultsOnCurrPage: [],
            resultsByPages: [],
        };

        this._searchChunk(searchState, 0);
    };

    /**
     * Searches for log events within a specified range and updates the search
     * state.
     *
     * @param {Object} searchState including search settings and results.
     * @param {number} logEventsBeginIdx first log event to search from
     * @private
     */
    _searchChunk (searchState, logEventsBeginIdx) {
        const numEventsAtLevel = this._logEventOffsetsFiltered.length;

        const logEventsEndIdx = logEventsBeginIdx + FILE_MANAGER_LOG_SEARCH_CHUNK_SIZE;
        for (
            let eventIdx = logEventsBeginIdx;
            eventIdx < logEventsEndIdx;
            eventIdx++
        ) {
            const contentString = this._getLogContentFromEventIdx(eventIdx);

            const match = contentString.match(searchState.searchRegex);
            if (match) {
                searchState.resultsOnCurrPage.push({
                    eventIndex: eventIdx,
                    content: contentString,
                    match: match,
                });
                searchState.numTotalResults++;

                if (FILE_MANAGER_LOG_SEARCH_MAX_RESULTS <= searchState.numTotalResults) {
                    searchState.isSearching = false;
                    searchState.resultsByPages.push({
                        pageIdx: searchState.currPageIdx,
                        results: structuredClone(searchState.resultsOnCurrPage),
                    });
                    searchState.resultsByPages.push({
                        pageIdx: this.state.pages - 1,
                        results: [],
                    });
                    break;
                }
            }

            if (eventIdx + 1 === searchState.pageEndEventIdx) {
                // To update progress, always send searchResults
                // even if it is empty
                searchState.resultsByPages.push({
                    pageIdx: searchState.currPageIdx,
                    results: structuredClone(searchState.resultsOnCurrPage),
                });

                searchState.resultsOnCurrPage.length = 0;

                // update current page index and page end event index
                searchState.currPageIdx++;
                if (searchState.currPageIdx >= this.state.pages) {
                    searchState.isSearching = false;
                    break;
                }
                searchState.pageEndEventIdx = Math.min(
                    this.state.pageSize * (searchState.currPageIdx + 1),
                    numEventsAtLevel
                );
            } // if (eventIdx + 1 === searchState.pageEndEventIdx)
        } // for (let eventIdx = logEventsBeginIdx; eventIdx < logEventsEndIdx; eventIdx++)

        const currentLogSearchJobId = this._logSearchJobId;
        setTimeout(() => {
            // skip if a new search job has come in
            if (currentLogSearchJobId !== this._logSearchJobId) {
                return;
            }
            // schedule the iterations one-by-one to avoid clogging up
            this._sendSearchResultsAndSearchNextChunk(
                searchState,
                logEventsEndIdx);
        }, 0);
    }

    /**
     * Retrieves the log content from a specified log event index.
     *
     * @param {number} eventIdx of the log event to retrieve content from
     * @return {string} the log content as a string
     * @private
     */
    _getLogContentFromEventIdx (eventIdx) {
        // FIXME: hack for Single-file CLP Archive searching
        if (null !== this._logsArray) {
            return this._logsArray[eventIdx];
        }

        const event = this._logEventOffsetsFiltered[eventIdx];
        this._irStreamReader._dataInputStream.seek(event.startIndex);

        this._outputResizableBuffer.clear();
        this._irStreamReader.readAndDecodeLogEventIntoBuffer(this._outputResizableBuffer);

        return FourByteClpIrStreamReader.textDecoder.decode(
            this._outputResizableBuffer.getUint8Array()
        );
    }

    /**
     * Sends search results for processed log pages and continues searching the
     * next chunk if needed.
     *
     * @param {Object} searchState including search settings and results.
     * @param {number} logEventsBeginIdx first log event to search from
     * @private
     */
    _sendSearchResultsAndSearchNextChunk (searchState, logEventsBeginIdx) {
        let lastEmptyResultPageIdx = null;

        searchState.resultsByPages.forEach((r) => {
            if (r.results.length === 0) {
                // avoid sending consecutive pages with no result
                lastEmptyResultPageIdx = r.pageIdx;
            } else {
                if (lastEmptyResultPageIdx !== null) {
                    this._updateSearchResultsCallback(lastEmptyResultPageIdx, []);
                    lastEmptyResultPageIdx = null;
                }
                this._updateSearchResultsCallback(r.pageIdx, r.results);
            }
        });
        if (lastEmptyResultPageIdx !== null) {
            this._updateSearchResultsCallback(lastEmptyResultPageIdx, []);
        }

        searchState.resultsByPages.length = 0;
        if (searchState.isSearching) {
            this._searchChunk(searchState, logEventsBeginIdx);
        }
    }

    /**
     * Get the long event from the selected line number
     */
    computeLogEventIdxFromLineNum () {
        // If there are no logs, return
        if (this.logEventMetadata.length === 0) {
            this.state.logEventIdx = null;
            return;
        }
        let trackedLineNumber = this.state.lineNumber;
        let numLines = 0;
        --trackedLineNumber;
        for (let i = 0; i < this.logEventMetadata.length; ++i) {
            const metadata = this.logEventMetadata[i];
            if (metadata.verbosityIx >= this._displayedMinVerbosityIx) {
                numLines += metadata.numLines;
                if (numLines > trackedLineNumber) {
                    this.state.logEventIdx = metadata.mappedIndex + 1;
                    break;
                }
            }
        }
    };

    /**
     * Get the line number from the log event.
     */
    computeLineNumFromLogEventIdx () {
        if (null !== this._logsArray) {
            // FIXME: dirty hack for Single-file CLP Archive
            this.state.columnNumber = 1;
            this.state.lineNumber =
                this._logsPageLineOffsetsArray[
                    this.state.logEventIdx - this.state.pageSize * (this.state.page - 1)
                ];
            return;
        }

        // If there are no logs, go to line 1
        if (0 === this._logEventOffsetsFiltered.length) {
            this.state.columnNumber = 1;
            this.state.lineNumber = 1;
        }

        if (0 === this.state.logEventIdx) {
            throw new Error("0 is not a valid logEventIdx");
        }

        let lineNumberFound = 1;
        for (let i = 0; i < this.logEventMetadata.length; ++i) {
            // Mapped index is zero indexed, so we need to add one more to it
            if (this.logEventMetadata[i].mappedIndex + 1 >= this.state.logEventIdx) {
                // We"ve passed the log event
                // foundLogEventIdx = this.logEventMetadata[i].mappedIndex + 1;
                break;
            }
            lineNumberFound += this.logEventMetadata[i].numLines;
        }

        this.state.columnNumber = 1;
        this.state.lineNumber = lineNumberFound;
    };

    /**
     * Filters the log events with the given verbosity.
     * @param {number} desiredMinVerbosityIx
     */
    filterLogEvents (desiredMinVerbosityIx) {
        this.state.verbosity = desiredMinVerbosityIx;
        this._logEventOffsetsFiltered = [];
        for (let i = 0; i < this._logEventOffsets.length; i++) {
            const verbosity = Number(this._logEventOffsets[i].verbosityIx);

            // Save the index of the event in the unfiltered array.
            // When decoding a message, we need the timestamp from
            // the previous event since the timestamps are delta encoded.
            this._logEventOffsets[i].mappedIndex = i;

            if (verbosity >= desiredMinVerbosityIx) {
                this._logEventOffsetsFiltered.push(this._logEventOffsets[i]);
            }
        }
    };

    /**
     * Prettifies the given log event content, if necessary
     * @param {Uint8Array} contentUint8Array The content as a Uint8Array
     * @return {[boolean, (string|*)]} A tuple containing a boolean indicating
     * whether the content was prettified, and if so, the prettified content.
     */
    _prettifyLogEventContent = (contentUint8Array) => {
        if (contentUint8Array.length > this._PRETTIFICATION_THRESHOLD) {
            return this._prettifier.prettify(
                this._textDecoder.decode(contentUint8Array));
        } else {
            return [false, null];
        }
    };
}

export default FileManager;
