interface LogFileState {
    compressedSize: number,
    decompressedSize: number,
    numPages: number | null,
    numEvents: number | null,

    columnNum: number | null,
    pageNum: number | null,
    lineNum: number | null,
    logEventIdx: number | null,

    enablePrettify: boolean,
    pageSize: number,
    verbosity: null,

    [key: string]: never
}

export default LogFileState;
