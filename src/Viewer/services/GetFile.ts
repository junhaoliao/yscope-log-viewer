import axios, {AxiosError} from "axios";


type ProgressCallback = (numBytesDownloaded:number, numBytesTotal:number) => void;


/**
 * Custom error class for representing HTTP request errors.
 *
 * @class HTTPRequestError
 * @augments {Error}
 */
class HTTPRequestError extends Error {
    public url: string;

    public status: string;

    public statusText: string;

    /**
     * Constructs and initializes instance of HTTPRequestError
     *
     * @param url of the HTTP request that resulted in an error
     * @param status code of the response
     * @param statusText of the response
     */
    constructor (url: string, status: string, statusText: string) {
        super(`${url} returned ${status} ${statusText}`);

        this.name = "HTTPRequestError";
        this.url = url;
        this.status = status;
        this.statusText = statusText;
    }
}

/**
 * Downloads and reads a file with a given URL.
 *
 * @param fileUrl
 * @param progressCallback Callback to update progress
 * @return File content
 */
const downloadAndReadFile = async (fileUrl: string, progressCallback: ProgressCallback)
    : Promise<Uint8Array> => {
    try {
        const {data} = await axios.get<ArrayBuffer>(fileUrl, {
            responseType: "arraybuffer",
            onDownloadProgress: ({loaded, total}) => {
                if ("undefined" === typeof total) {
                    total = loaded;
                }
                progressCallback(loaded, total);
            },
            headers: {
                "Cache-Control": "no-cache",
                "Pragma": "no-cache",
                "Expires": "0",
            },
        });

        return new Uint8Array(data);
    } catch (e) {
        if (e instanceof AxiosError) {
            throw new HTTPRequestError(
                fileUrl,
                e.response?.status.toString() ?? "Unknown Axios Status",
                e.response?.statusText ?? "Unknown Axios Status Text"
            );
        } else {
            throw new HTTPRequestError(fileUrl, "Unknow error", "In downloading the file.");
        }
    }
};

/**
 * Reads a File object using FileReader.
 *
 * @param file File object to read data from.
 * @param progressCallback Callback to update progress
 * @return File content
 */
const readFileObject = (file: File, progressCallback:ProgressCallback)
    : Promise<Uint8Array> => new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
        progressCallback(file.size, file.size);
        if (reader.result instanceof ArrayBuffer) {
            resolve(new Uint8Array(reader.result));
        } else {
            reject(new Error("Unexpected result type from FileReader"));
        }
    };
    reader.onerror = () => {
        reject(new Error(`FileReader error: ${reader.error?.message || "Unknown error"}`));
    };

    reader.readAsArrayBuffer(file);
});

/**
 * Input File Information
 */
interface FileInfo {
    name: string;
    filePath?: string | null;
    data: Uint8Array;
}

/**
 * Gets content from an input file. If given `fileSrc` is a string, treat it as
 * a URL and download before getting data.
 *
 * @param fileSrc A File object or a file URL to download
 * @param progressCallback Callback to update progress
 * @return Input File Information which contains the file content
 */
const readFile = async (fileSrc: File | string, progressCallback: ProgressCallback)
    : Promise<FileInfo> => {
    let fileInfo;

    if (fileSrc instanceof File) {
        const data = await readFileObject(fileSrc, progressCallback);
        fileInfo = {
            name: fileSrc.name,
            filePath: null,
            data: data,
        };
    } else {
        const name = fileSrc.split("/").pop() ?? "Unknown File Name";
        const data = await downloadAndReadFile(fileSrc, progressCallback);
        fileInfo = {
            name: name,
            filePath: fileSrc,
            data: data,
        };
    }

    return fileInfo;
};

export {readFile};
