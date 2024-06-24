import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import initSqlJs from "sql.js";
import {XzReadableStream} from "xzwasm";

import * as msgpack from "@msgpack/msgpack";

import {
    DataInputStream, DataInputStreamEOFError,
} from "./DataInputStream";


dayjs.extend(utc);

/**
 *
 * @param byteArray
 */
const lzmaDecompress = async (byteArray) => {
    const stream = new ReadableStream({
        /**
         *
         * @param controller
         */
        start (controller) {
            controller.enqueue(byteArray);
            controller.close();
        },
    });

    const decompressedResponse = new Response(new XzReadableStream(stream));
    return new Uint8Array(await decompressedResponse.arrayBuffer());
};

/**
 *
 * @param byteArray
 */
const unpackDictionary = (byteArray) => {
    const dataInputStream = new DataInputStream(byteArray.buffer, true);
    const dictionary = [];

    while (true) {
        try {
            const id = dataInputStream.readUnsignedLong();

            // mind an overflow situation here because supposedly we should use BigInt to hold this long uint
            const payloadSize = Number(dataInputStream.readUnsignedLong());
            const payload = dataInputStream.readFully(payloadSize);

            dictionary.push(payload);
        } catch (e) {
            if (!(e instanceof DataInputStreamEOFError)) {
                throw e;
            }

            console.log(`Read ${dictionary.length} variables`);
            break;
        }
    }

    return dictionary;
};

/**
 *
 * @param encodedVar
 */
const decodeClpFloat = (encodedVar) => {
    // Mask: (1 << 54) - 1
    const EIGHT_BYTE_ENCODED_FLOAT_DIGITS_BIT_MASK = (1n << 54n) - 1n;
    const HYPHEN_CHAR_CODE = "-".charCodeAt(0);
    const PERIOD_CHAR_CODE = ".".charCodeAt(0);
    const ZERO_CHAR_CODE = "0".charCodeAt(0);

    let encodedFloat = encodedVar;

    // Decode according to the format
    const decimalPos = Number(encodedFloat & BigInt(0x0F)) + 1;
    encodedFloat >>= BigInt(4);
    const numDigits = Number(encodedFloat & BigInt(0x0F)) + 1;
    encodedFloat >>= BigInt(4);
    let digits = encodedFloat & EIGHT_BYTE_ENCODED_FLOAT_DIGITS_BIT_MASK;
    encodedFloat >>= BigInt(55);
    const isNegative = (0 < encodedFloat);

    const valueLength = numDigits + 1 + (isNegative ?
        1 :
        0);
    const value = new Uint8Array(valueLength);
    let pos = valueLength - 1;
    const decimalIdx = valueLength - 1 - decimalPos;

    for (let i = 0; i < numDigits; i++, pos--) {
        if (decimalIdx === pos) {
            value[pos--] = PERIOD_CHAR_CODE;
        }
        value[pos] = ZERO_CHAR_CODE + Number(digits % BigInt(10));
        digits /= BigInt(10);
    }

    if (true === isNegative) {
        value[0] = HYPHEN_CHAR_CODE;
    }

    return value;
};

/**
 *
 * @param str
 */
const rstrip = (str) => {
    return str.replace(/\s+$/, "");
};

export class ClpArchiveDecoder {
    static #enc = new TextEncoder();

    static #dec = new TextDecoder();

    constructor (fileByteArray) {
        this._dataInputStream = new DataInputStream(fileByteArray.buffer, true);
        this._metadata = null;

        this._numMessages = null;
        this._numVariables = null;
        this._segmentTimestampsPosition = null;
        this._segmentLogtypesPosition = null;
        this._segmentVariablesPosition = null;

        this._logTypeDict = null;
        this._varDict = null;
        this._segmentFiles = [];
        this._segments = [];

        this._decompressedLogs = [];
    }

    _parseHeader () {
        const magicNumber = this._dataInputStream.readFully(4);
        const patchVersion = this._dataInputStream.readUnsignedShort();
        const minorVersion = this._dataInputStream.readUnsignedByte();
        const majorVersion = this._dataInputStream.readUnsignedByte();
        const metaSectionSize = this._dataInputStream.readUnsignedLong();
        const reserved = this._dataInputStream.readFully(6 * 8);

        // TODO: add magic number / version checks

        const metaSection = this._dataInputStream.readFully(Number(metaSectionSize));
        this._metadata = msgpack.decode(metaSection);
    }

    async __readMetaDataDb (fileBytes) {
        const SQL = await initSqlJs({
            locateFile: (file) => `static/js/${file}`,
        });
        const db = new SQL.Database(fileBytes);
        const queryResult = db.exec(`
            SELECT num_messages,
                   num_variables,
                   segment_timestamps_position,
                   segment_logtypes_position,
                   segment_variables_position
            FROM files
        `)[0];

        for (let i = 0; i < queryResult.columns.length; i++) {
            const columnName = queryResult.columns[i];
            const value = queryResult.values[0][i];
            switch (columnName) {
                case "num_messages":
                    this._numMessages = value;
                    break;
                case "num_variables":
                    this._numVariables = value;
                    break;
                case "segment_timestamps_position":
                    this._segmentTimestampsPosition = value;
                    break;
                case "segment_logtypes_position":
                    this._segmentLogtypesPosition = value;
                    break;
                case "segment_variables_position":
                    this._segmentVariablesPosition = value;
                    break;
                default:
                    console.error(f`Unexpected column name: ${columnName}`);
            } // switch (columnName)
        } // for (let i = 0; i < queryResult["columns"].length; i++)
    }

    async _populateFiles () {
        const fileOffsets = this._metadata.archive_files;
        const archiveFiles = [];

        for (let i = 0; i < fileOffsets.length - 1; i++) {
            const fileInfo = fileOffsets[i];
            const nextFileInfo = fileOffsets[1 + i];
            archiveFiles.push({
                fileName: fileInfo.n,
                offset: fileInfo.o,
                size: nextFileInfo.o - fileInfo.o,
            });
        }

        let segmentsAvailable = false;

        for (let i = 0; i < archiveFiles.length; i++) {
            const f = archiveFiles[i];
            const {fileName} = f;

            f.bytes = this._dataInputStream.readFully(f.size);

            if ("logtype.dict" === fileName) {
                this._logTypeDict = unpackDictionary(await lzmaDecompress(f.bytes.slice(8)));
            } else if ("var.dict" === fileName) {
                this._varDict = unpackDictionary(await lzmaDecompress(f.bytes.slice(8)));
            } else if ("metadata.db" === fileName) {
                await this.__readMetaDataDb(f.bytes);
            } else if ("var.segindex" === fileName) {
                segmentsAvailable = true;
            } else if (true === segmentsAvailable) {
                this._segmentFiles.push(f);
            }
        } // for (let i = 0; i < archiveFiles.length; i++)
    }

    async _unpackOneSegment (segmentBytes) {
        const decompressedBytes = await lzmaDecompress(segmentBytes);
        const dataInputStream = new DataInputStream(decompressedBytes.buffer, true);
        const timestamps = [];
        const logTypes = [];
        const variables = [];

        for (let i = 0; i < this._numMessages; i++) {
            timestamps.push(dataInputStream.readUnsignedLong());
        }
        for (let i = 0; i < this._numMessages; i++) {
            logTypes.push(dataInputStream.readUnsignedLong());
        }
        for (let i = 0; i < this._numVariables; i++) {
            variables.push(dataInputStream.readUnsignedLong());
        }

        this._segments.push({
            timestamps, logTypes, variables,
        });
    }

    async _unpackSegments () {
        const unpackPromises = this._segmentFiles.map(
            (f) => this._unpackOneSegment(f.bytes)
        );

        await Promise.all(unpackPromises);
    }

    _getBytesForVariable (logTypeCharByte, variable) {
        switch (logTypeCharByte) {
            case 0x11: return ClpArchiveDecoder.#enc.encode(variable);
            case 0x12: return this._varDict[variable];
            case 0x13: return decodeClpFloat(variable);
            default: return [];
        }
    }

    _decodeOneSegment (timestamps, logTypes, variables) {
        const variablesIterator = variables[Symbol.iterator]();

        for (let i = 0; i < this._numMessages; i++) {
            const timestamp = timestamps[i];
            const logType = logTypes[i];
            const logMessageBytes = [];

            this._logTypeDict[logType].forEach((logTypeCharByte) => {
                if ([0x11,
                    0x12,
                    0x13].includes(logTypeCharByte)) {
                    const variable = variablesIterator.next().value;
                    const bytes = this._getBytesForVariable(logTypeCharByte, variable);

                    logMessageBytes.push(...bytes);
                } else {
                    logMessageBytes.push(logTypeCharByte);
                }
            });


            const formattedTimestamp = (
                "UTC" === globalThis.timezone ?
                    dayjs.utc(Number(timestamp)) :
                    dayjs(Number(timestamp))
            )
                .format();
            const formattedMessage = ClpArchiveDecoder.#dec.decode(new Uint8Array(logMessageBytes)).trim();

            this._decompressedLogs.push(`${formattedTimestamp} ${formattedMessage}`);
        } // for (let i = 0; i < numMessages; i++)
    }

    _decodeSegments () {
        for (const s of this._segments) {
            this._decodeOneSegment(s.timestamps, s.logTypes, s.variables);
        }
    }

    async decode () {
        this._parseHeader();
        await this._populateFiles();
        await this._unpackSegments();
        this._decodeSegments();

        return this._decompressedLogs;
    }
}
