enum CHANGE_FILE_DIREECTION {
    PREV = "prev",
    NEXT = "next",
}

/**
 * Enum to identify the primary action in the state change handler.
 */
enum STATE_CHANGE_TYPE {
    CHANGE_FILE = "changeFile",
    LINE_NUM = "lineNum",
    LOG_EVENT_IDX = "logEventIdx",
    PAGE_NUM = "pageNum",
    PAGE_SIZE = "pageSize",
    PRETTIFY = "prettify",
    SEARCH = "search",
    VERBOSITY = "verbosity",
    START_DOWNLOAD = "startDownload",
    STOP_DOWNLOAD = "stopDownload",
    TIMESTAMP = "timestamp",
}

export default STATE_CHANGE_TYPE;
export {CHANGE_FILE_DIREECTION};