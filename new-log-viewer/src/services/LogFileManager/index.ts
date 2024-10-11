import {
    Decoder,
    DecoderOptionsType,
} from "../../typings/decoders";
import {MAX_V8_STRING_LENGTH} from "../../typings/js";
import {
    BeginLineNumToLogEventNumMap,
    CURSOR_CODE,
    CursorType,
    FileSrcType,
} from "../../typings/worker";
import {EXPORT_LOGS_CHUNK_SIZE} from "../../utils/config";
import {getChunkNum} from "../../utils/math";
import {formatSizeInBytes} from "../../utils/units";
import ClpIrDecoder from "../decoders/ClpIrDecoder";
import JsonlDecoder from "../decoders/JsonlDecoder";
import {
    getEventNumCursorData,
    getLastEventCursorData,
    getPageNumCursorData,
    loadFile,
} from "./utils";


/**
 * Class to manage the retrieval and decoding of a given log file.
 */
class LogFileManager {
    readonly #pageSize: number;

    readonly #fileName: string;

    #decoder: Decoder;

    #numEvents: number = 0;

    /**
     * Private constructor for LogFileManager. This is not intended to be invoked publicly.
     * Instead, use LogFileManager.create() to create a new instance of the class.
     *
     * @param decoder
     * @param fileName
     * @param pageSize Page size for setting up pagination.
     */
    constructor (
        decoder: Decoder,
        fileName: string,
        pageSize: number,
    ) {
        this.#fileName = fileName;
        this.#pageSize = pageSize;
        this.#decoder = decoder;

        // Build index for the entire file.
        const buildResult = decoder.build();
        if (0 < buildResult.numInvalidEvents) {
            console.error("Invalid events found in decoder.build():", buildResult);
        }

        this.#numEvents = decoder.getEstimatedNumEvents();
        console.log(`Found ${this.#numEvents} log events.`);
    }

    get fileName () {
        return this.#fileName;
    }

    get numEvents () {
        return this.#numEvents;
    }

    /**
     * Creates a new LogFileManager.
     *
     * @param fileSrc The source of the file to load. This can be a string representing a URL, or a
     * File object.
     * @param pageSize Page size for setting up pagination.
     * @param decoderOptions Initial decoder options.
     * @return A Promise that resolves to the created LogFileManager instance.
     */
    static async create (
        fileSrc: FileSrcType,
        pageSize: number,
        decoderOptions: DecoderOptionsType
    ): Promise<LogFileManager> {
        const {fileName, fileData} = await loadFile(fileSrc);
        const decoder = await LogFileManager.#initDecoder(fileName, fileData, decoderOptions);

        return new LogFileManager(decoder, fileName, pageSize);
    }

    /**
     * Constructs a decoder instance based on the file extension.
     *
     * @param fileName
     * @param fileData
     * @param decoderOptions Initial decoder options.
     * @return The constructed decoder.
     * @throws {Error} if no decoder supports a file with the given extension.
     */
    static async #initDecoder (
        fileName: string,
        fileData: Uint8Array,
        decoderOptions: DecoderOptionsType
    ): Promise<Decoder> {
        let decoder: Decoder;
        if (fileName.endsWith(".jsonl")) {
            decoder = new JsonlDecoder(fileData, decoderOptions);
        } else if (fileName.endsWith(".clp.zst")) {
            decoder = await ClpIrDecoder.create(fileData);
        } else {
            throw new Error(`No decoder supports ${fileName}`);
        }

        if (fileData.length > MAX_V8_STRING_LENGTH) {
            throw new Error(`Cannot handle files larger than ${
                formatSizeInBytes(MAX_V8_STRING_LENGTH)
            } due to a limitation in Chromium-based browsers.`);
        }

        return decoder;
    }

    /* Sets any formatter options that exist in the decoder's options.
     * @param options
     */
    setFormatterOptions (options: DecoderOptionsType) {
        this.#decoder.setFormatterOptions(options);
    }

    /**
     * Loads log events in the range
     * [`beginLogEventIdx`, `beginLogEventIdx + EXPORT_LOGS_CHUNK_SIZE`), or all remaining log
     * events if `EXPORT_LOGS_CHUNK_SIZE` log events aren't available.
     *
     * @param beginLogEventIdx
     * @return An object containing the log events as a string.
     * @throws {Error} if any error occurs when decoding the log events.
     */
    loadChunk (beginLogEventIdx: number): {
        logs: string,
    } {
        const endLogEventIdx = Math.min(beginLogEventIdx + EXPORT_LOGS_CHUNK_SIZE, this.#numEvents);
        const results = this.#decoder.decodeRange(
            beginLogEventIdx,
            endLogEventIdx,
            false,
        );

        if (null === results) {
            throw new Error(
                `Failed to decode log events in range [${beginLogEventIdx}, ${endLogEventIdx})`
            );
        }

        const messages = results.map(([msg]) => msg);

        return {
            logs: messages.join(""),
        };
    }

    /**
     * Loads a page of log events based on the provided cursor.
     *
     * @param cursor The cursor indicating the page to load. See {@link CursorType}.
     * @return An object containing the logs as a string, a map of line numbers to log event
     * numbers, and the line number of the first line in the cursor identified event.
     * @throws {Error} if any error occurs during decode.
     */
    loadPage (cursor: CursorType): {
        beginLineNumToLogEventNum: BeginLineNumToLogEventNumMap,
        cursorLineNum: number
        logEventNum: number
        logs: string,
        pageNum: number
    } {
        console.debug(`loadPage: cursor=${JSON.stringify(cursor)}`);

        const {
            pageBeginLogEventNum,
            pageEndLogEventNum,
            matchingLogEventNum,
        } = this.#getCursorData(cursor);

        const results = this.#decoder.decodeRange(
            pageBeginLogEventNum - 1,
            pageEndLogEventNum - 1,
            false
        );

        if (null === results) {
            throw new Error("Error occurred during decoding. " +
                `pageBeginLogEventNum=${pageBeginLogEventNum}, ` +
                `pageEndLogEventNum=${pageEndLogEventNum}`);
        }

        const messages: string[] = [];
        const beginLineNumToLogEventNum: BeginLineNumToLogEventNumMap = new Map();
        let currentLine = 1;
        results.forEach((r) => {
            const [
                msg,
                ,
                ,
                logEventNum,
            ] = r;

            messages.push(msg);
            beginLineNumToLogEventNum.set(currentLine, logEventNum);
            currentLine += msg.split("\n").length - 1;
        });

        const newPageNum: number = getChunkNum(pageBeginLogEventNum, this.#pageSize);

        return {
            beginLineNumToLogEventNum: beginLineNumToLogEventNum,
            cursorLineNum: 1,
            logEventNum: matchingLogEventNum,
            logs: messages.join(""),
            pageNum: newPageNum,
        };
    }

    /**
     * Gets the data that corresponds to the cursor.
     *
     * @param cursor
     * @return Log event numbers for:
     * - the range [begin, end) of the page containing the matching log event.
     * - the log event number that matches the cursor.
     * @throws {Error} if the type of cursor is not supported.
     */
    #getCursorData (cursor: CursorType): {
        pageBeginLogEventNum: number,
        pageEndLogEventNum: number,
        matchingLogEventNum: number
    } {
        const {code, args} = cursor;
        switch (code) {
            case CURSOR_CODE.PAGE_NUM:
                return getPageNumCursorData(
                    args.pageNum,
                    args.eventPositionOnPage,
                    this.#numEvents,
                    this.#pageSize
                );

            case CURSOR_CODE.LAST_EVENT:
                return getLastEventCursorData(
                    this.#numEvents,
                    this.#pageSize
                );

            case CURSOR_CODE.EVENT_NUM:
                return getEventNumCursorData(
                    args.eventNum,
                    this.#numEvents,
                    this.#pageSize
                );

            default:
                throw new Error(`Unsupported cursor type: ${code}`);
        }
    }
}

export default LogFileManager;
