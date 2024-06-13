let enumClpWorkerProtocol = 0;
const CLP_WORKER_PROTOCOL = Object.freeze({
    ERROR: enumClpWorkerProtocol++,
    LOADING_MESSAGES: enumClpWorkerProtocol++,
    LOAD_FILE: enumClpWorkerProtocol++,
    UPDATE_VERBOSITY: enumClpWorkerProtocol++,
    GET_LINE_FROM_EVENT: enumClpWorkerProtocol++,
    GET_EVENT_FROM_LINE: enumClpWorkerProtocol++,
    CHANGE_PAGE: enumClpWorkerProtocol++,
    LOAD_LOGS: enumClpWorkerProtocol++,
    REDRAW_PAGE: enumClpWorkerProtocol++,
    PRETTY_PRINT: enumClpWorkerProtocol++,
    UPDATE_STATE: enumClpWorkerProtocol++,
    UPDATE_FILE_INFO: enumClpWorkerProtocol++,
    UPDATE_SEARCH_STRING: enumClpWorkerProtocol++,
    UPDATE_SEARCH_RESULTS: enumClpWorkerProtocol++,
    START_DOWNLOAD: enumClpWorkerProtocol++,
    STOP_DOWNLOAD: enumClpWorkerProtocol++,
    CHANGE_TIMESTAMP: enumClpWorkerProtocol++,
    TIMEZONE: enumClpWorkerProtocol++,
});

export default CLP_WORKER_PROTOCOL;
