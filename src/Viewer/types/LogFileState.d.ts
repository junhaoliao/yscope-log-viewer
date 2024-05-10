interface LogFileState {
    compressedSize: number | null,
    decompressedSize: number | null,
    numPages: number | null,
    numEvents: number | null,

    columnNum: number | null,
    lineNum: number | null,
    logEventIdx: number | null,
    pageNum: number | null,

    enablePrettify: boolean,
    pageSize: number,
    verbosity: number,

    nextFilePath: string|null,
    prevFilePath: string|null,

    [key: string]: never
}

export default LogFileState;
