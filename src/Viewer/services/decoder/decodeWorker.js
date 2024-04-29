import Database from "../Database";
import {DataInputStream, DataInputStreamEOFError} from "./DataInputStream";
import FourByteClpIrStreamReader from "./FourByteClpIrStreamReader";
import ResizableUint8Array from "./ResizableUint8Array";

const decodePage = async (sessionId, logEvents, inputStream, pageNum, pageLogs) => {
    let _logs = pageLogs;

    if (null === _logs) {
        const dataInputStream = new DataInputStream(inputStream);
        const _outputResizableBuffer = new ResizableUint8Array(inputStream.byteLength);
        const _irStreamReader = new FourByteClpIrStreamReader(dataInputStream, null);

        const _logEventMetadata = [];
        for (let i = 0; i < logEvents.length; i++) {
            const decoder = _irStreamReader._streamProtocolDecoder;
            decoder._setTimestamp(logEvents[i].prevTs);

            try {
                _irStreamReader.readAndDecodeLogEvent(
                    _outputResizableBuffer,
                    _logEventMetadata
                );
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

        // Decode the text
        const _textDecoder = new TextDecoder();
        const logs = _textDecoder.decode(_outputResizableBuffer.getUint8Array());
        _logs = logs.trim();
    }

    const db = new Database(sessionId);
    db.addPage(pageNum, _logs).then(() => {
        console.debug(`Finished decoding page ${pageNum} to database.`);
        postMessage(true);
    }).catch((e) => {
        console.debug(e.toString());
        postMessage(false);
    });
};

onmessage = (e) => {
    const sessionId = e.data.sessionId;
    const logEvents = e.data.logEvents;
    const inputStream = e.data.inputStream;
    const pageNum = e.data.pageNum;
    const pageLogs = e.data.pageLogs;
    decodePage(sessionId, logEvents, inputStream, pageNum, pageLogs);
};
