import * as dayjs from "dayjs";

import CLP_WORKER_PROTOCOL from "./CLP_WORKER_PROTOCOL";
import FileManager from "./decoder/FileManager";
import {
    isBoolean, isNumeric,
} from "./decoder/utils";


// TODO: Move decompressing of file from FileManager to ActionHandler.
//  When there are multiple IRStreams in a single file, this will allow
//  the creation of multiple FileManagers. When this feature is implemented,
//  the action handler will contain multiple IRStreams and user can be prompted
//  for which IRStream they want to load in the current viewer.

/**
 * Manages all the actions that can be executed on provided file. In the future,
 * this action handler will also be used to execute jobs on file data.
 */
class ActionHandler {
    /**
     * Creates a new FileManager object and initiates the download.
     *
     * @param {object} props
     * @param {string | File} props.fileSrc
     * @param {string} props.sessionId
     * @param {boolean} props.enablePrettify
     * @param {number} props.logEventIdx
     * @param {number} props.initialTimestamp
     * @param {number} props.pageSize
     */
    constructor ({
        fileSrc,
        sessionId,
        enablePrettify,
        logEventIdx,
        initialTimestamp,
        pageSize,
    }) {
        this._logFile = new FileManager(
            fileSrc,
            sessionId,
            enablePrettify,
            logEventIdx,
            initialTimestamp,
            pageSize,
            this._loadingMessageCallback,
            this._updateStateCallback,
            this._updateLogsCallback,
            this._updateFileInfoCallback,
            this._updateSearchResultsCallback
        );
        this._logFile.loadLogFile().then(() => {
            console.log(fileSrc, "File loaded successfully");
        })
            .catch((e) => {
                this._loadingMessageCallback(e, true);
                console.error("Error processing log file:", e);
            });
    }

    /**
     * Filters the events at the given verbosity and rebuilds the pages.
     *
     * @param {number} desiredVerbosity
     */
    changeVerbosity (desiredVerbosity) {
        if (!isNumeric(desiredVerbosity)) {
            throw (new Error("Invalid verbosity provided."));
        }
        if (null !== this._logFile._logsArray) {
            // FIXME: dirty hack
            this._logFile.verbosity = -1;
            this._updateStateCallback(CLP_WORKER_PROTOCOL.UPDATE_STATE, this._logFile.state);

            return;
        }
        this._logFile.state.verbosity = desiredVerbosity;
        this._logFile.filterLogEvents(desiredVerbosity);
        this._logFile.createPages();
        this._logFile.computePageNumFromLogEventIdx();
        this._logFile.decodePage();
        this._logFile.computeLineNumFromLogEventIdx();

        // When changing verbosity, if the current log event gets removed
        // by the filter, get the new log event.
        this._logFile.computeLogEventIdxFromLineNum();
        this._updateStateCallback(CLP_WORKER_PROTOCOL.UPDATE_STATE, this._logFile.state);
    }

    /**
     * Go to the selected page and decode the relevant logs. linePos
     * indicates if the new page should be loaded with selected line
     * on top or bottom of page.
     *
     * @param {number} pageNum
     * @param {string} linePos
     */
    changePage (pageNum, linePos) {
        if (!isNumeric(pageNum)) {
            throw (new Error("Invalid page number provided."));
        }
        if (0 >= pageNum || pageNum > this._logFile.state.numPages) {
            throw (new Error("Invalid page number provided."));
        }
        this._logFile.state.pageNum = pageNum;
        this._logFile.decodePage();

        if ("top" === linePos) {
            this._logFile.state.lineNum = 1;
        } else if ("bottom" === linePos) {
            this._logFile.state.lineNum = this._logFile.logEventMetadata.reduce((a, b) => {
                return a + b.numLines;
            }, 0);
        } else {
            this._logFile.state.lineNum = 1;
        }

        this._logFile.computeLogEventIdxFromLineNum();
        this._updateStateCallback(CLP_WORKER_PROTOCOL.UPDATE_STATE, this._logFile.state);
    }

    /**
     * Search for the given string and go to the next result.
     *
     * @param {string} searchString
     * @param {boolean} isRegex
     * @param {boolean} matchCase
     */
    changeSearchString = (searchString, isRegex, matchCase) => {
        this._logFile.searchLogEvents(searchString, isRegex, matchCase);
    };

    /**
     * Set prettify state, rebuild the page and update line number
     * for the log event.
     *
     * @param {boolean} enablePrettify
     */
    changePrettify (enablePrettify) {
        this._logFile.state.enablePrettify = enablePrettify;
        this._logFile.decodePage();
        this._logFile.computeLineNumFromLogEventIdx();
        this._updateStateCallback(CLP_WORKER_PROTOCOL.UPDATE_STATE, this._logFile.state);
    }

    changeTimezone (timezone) {
        if (null === timezone) return;
        if ("local" === timezone) {
            dayjs.tz.setDefault();
        } else {
            dayjs.tz.setDefault(timezone);
        }
        this._logFile.decodePage();
        this._logFile.computeLineNumFromLogEventIdx();
        this._updateStateCallback(CLP_WORKER_PROTOCOL.UPDATE_STATE, this._logFile.state);
    }

    /**
     * Goes to the specified log event. Go to new page if needed.
     *
     * @param {number} logEventIdx
     */
    changeEvent (logEventIdx) {
        if (!isNumeric(logEventIdx)) {
            throw (new Error("Invalid logEventIdx provided."));
        }
        if (logEventIdx > this._logFile.state.numEvents) {
            console.debug("Log event provided was larger than the number of events.");
        } else if (0 >= logEventIdx) {
            console.debug("Log event provided was less than or equal to zero.");
        } else {
            this._logFile.state.logEventIdx = logEventIdx;
        }
        this._finalizeUpdateEvent();
    }

    /**
     * Goes to the specified log event with the specified timestamp.
     * Go to new page if needed.
     *
     * @param {number} timestamp
     */
    changeEventWithTimestamp (timestamp) {
        if (!isNumeric(timestamp)) {
            throw (new Error("Invalid timestamp provided."));
        }
        this._logFile.state.logEventIdx = this._logFile.getLogEventIdxFromTimestamp(timestamp);
        this._finalizeUpdateEvent();
    }

    /**
     * Recompute and load the page after changing the eventIdx.
     */
    _finalizeUpdateEvent () {
        const currentPage = this._logFile.state.pageNum;
        this._logFile.computePageNumFromLogEventIdx();

        // If the new event is on a new page, decode the page
        if (currentPage !== this._logFile.state.pageNum) {
            this._logFile.decodePage();
        }
        this._logFile.computeLineNumFromLogEventIdx();
        this._updateStateCallback(CLP_WORKER_PROTOCOL.UPDATE_STATE, this._logFile.state);
    }

    /**
     * Get the log event given a line number.
     *
     * @param {number} lineNum
     * @param {number} columnNum
     */
    changeLine (lineNum, columnNum) {
        if (!isNumeric(lineNum)) {
            throw (new Error("Invalid line number provided."));
        }
        this._logFile.state.lineNum = lineNum;
        this._logFile.state.columnNum = columnNum;
        this._logFile.computeLogEventIdxFromLineNum();
        this._updateStateCallback(CLP_WORKER_PROTOCOL.UPDATE_STATE, this._logFile.state);
    }

    /**
     * Redraws the page with the new page size.
     *
     * @param {number} pageSize
     */
    redraw (pageSize) {
        if (!isNumeric(pageSize)) {
            throw (new Error("Invalid page size provided."));
        }
        this._logFile.state.pageSize = pageSize;
        this._logFile.createPages();
        this._logFile.computePageNumFromLogEventIdx();
        this._logFile.decodePage();
        this._logFile.computeLineNumFromLogEventIdx();
        this._updateStateCallback(CLP_WORKER_PROTOCOL.UPDATE_STATE, this._logFile.state);
    }

    /**
     * Start decoding pages to database for Uncompressed Log Download
     */
    startDecodingPagesToDatabase () {
        this._logFile.startDecodingPagesToDatabase();
    }

    /**
     * Stop decoding pages to database if Uncompressed Log Download is canceled
     */
    stopDecodingPagesToDatabase () {
        this._logFile.stopDecodingPagesToDatabase();
    }

    /**
     * Send the newly decoded logs
     *
     * @param {string} logs
     */
    _updateLogsCallback = (logs) => {
        postMessage({
            code: CLP_WORKER_PROTOCOL.LOAD_LOGS,
            logs: logs,
        });
    };

    /**
     * Send the updated state.
     *
     * @param {number} code
     * @param {object} state
     */
    _updateStateCallback = (code, state) => {
        postMessage({
            code: code,
            state: state,
        });
    };

    /**
     * Sends loading status update and displays message in console.
     *
     * @param {string} msg
     * @param {boolean} error
     */
    _loadingMessageCallback = (msg, error) => {
        postMessage({
            code: CLP_WORKER_PROTOCOL.LOADING_MESSAGES,
            status: msg,
            error: error,
        });
        console.debug(msg);
    };


    /**
     * Send the file information.
     *
     * @param {string} fileState
     * @param fileInfo
     */
    _updateFileInfoCallback = (fileInfo) => {
        postMessage({
            code: CLP_WORKER_PROTOCOL.UPDATE_FILE_INFO,
            fileInfo: fileInfo,
        });
    };

    _updateSearchResultsCallback = (i, hasMoreResults, searchResults) => {
        postMessage({
            code: CLP_WORKER_PROTOCOL.UPDATE_SEARCH_RESULTS,
            page_num: i,
            hasMoreResults: hasMoreResults,
            searchResults: searchResults,
        });
    };
}

export default ActionHandler;
