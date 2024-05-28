import ActionHandler from "./ActionHandler";
import CLP_WORKER_PROTOCOL from "./CLP_WORKER_PROTOCOL";


/**
 * Send error to component which created worker.
 *
 * @param {string} error
 */
const sendError = (error) => {
    postMessage({
        code: CLP_WORKER_PROTOCOL.ERROR,
        error: error.toString(),
    });
    console.debug(error);
};

let handler = null;

/**
 *
 * @param e
 */
onmessage = function (e) {
    switch (e.data.code) {
        case CLP_WORKER_PROTOCOL.LOAD_FILE:
            try {
                handler = new ActionHandler(e.data);
            } catch (e) {
                sendError(e);
            }
            break;

        case CLP_WORKER_PROTOCOL.UPDATE_VERBOSITY:
            try {
                handler.changeVerbosity(e.data.verbosity);
            } catch (e) {
                sendError(e);
            }
            break;

        case CLP_WORKER_PROTOCOL.UPDATE_SEARCH_STRING:
            try {
                console.debug(e.data);
                handler.changeSearchString(e.data.searchString, e.data.isRegex, e.data.matchCase);
            } catch (e) {
                sendError(e);
            }
            break;

        case CLP_WORKER_PROTOCOL.CHANGE_PAGE_NUM:
            try {
                handler.changePage(e.data.pageNum, e.data.linePos);
            } catch (e) {
                sendError(e);
            }
            break;

        case CLP_WORKER_PROTOCOL.PRETTIFY:
            try {
                handler.changePrettify(e.data.enablePrettify);
            } catch (e) {
                sendError(e);
            }
            break;

        case CLP_WORKER_PROTOCOL.GET_LINE_FROM_EVENT:
            try {
                handler.changeEvent(e.data.desiredLogEventIdx);
            } catch (e) {
                sendError(e);
            }
            break;

        case CLP_WORKER_PROTOCOL.GET_EVENT_FROM_LINE:
            try {
                handler.changeLine(e.data.lineNum, e.data.columnNum);
            } catch (e) {
                sendError(e);
            }
            break;

        case CLP_WORKER_PROTOCOL.REDRAW_PAGE:
            try {
                handler.redraw(e.data.pageSize);
            } catch (e) {
                sendError(e);
            }
            break;

        case CLP_WORKER_PROTOCOL.START_DOWNLOAD:
            try {
                handler.startDecodingPagesToDatabase();
            } catch (e) {
                sendError(e);
            }
            break;

        case CLP_WORKER_PROTOCOL.STOP_DOWNLOAD:
            try {
                handler.stopDecodingPagesToDatabase();
            } catch (e) {
                sendError(e);
            }
            break;

        case CLP_WORKER_PROTOCOL.CHANGE_TIMESTAMP:
            try {
                handler.changeEventWithTimestamp(e.data.timestamp);
            } catch (e) {
                sendError(e);
            }
            break;

        default:
            console.error(`Unexpected CLP_WORKER_PROTOCOL code: ${e.data.code}`);
            break;
    }
};

onerror = (e) => {
    console.debug(e);
};
