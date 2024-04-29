interface LogFileState {
    compressedSize: number,
    decompressedSize: number,
    numPages: number,
    numEvents: number,

    columnNumber: number,
    pageNumber: number,
    logEventIdx: number,
    lineNumber: number,

    enablePrettify: boolean,
    pageSize: number,
    verbosity: null,

    [key: string]: never
}

export default LogFileState;
