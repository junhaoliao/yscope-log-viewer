enum APP_URL_SEARCH_PARAMS {
    FILE_PATH = "filePath",
    FILE_PATH_PREFIX = "filePathPrefix",
    SEEK = "seek",
}


enum SEEK_PARAM_VALUE {
    BEGIN = "begin",
    END = "end"
}


interface FileSeek {
    seek: SEEK_PARAM_VALUE,
    filePathPrefix: string
}

export {
    APP_URL_SEARCH_PARAMS,
    SEEK_PARAM_VALUE,
};

export type {FileSeek};
