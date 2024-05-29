import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import {LocalizationProvider} from "@mui/x-date-pickers";
import {AdapterDayjs} from "@mui/x-date-pickers/AdapterDayjs";

import config from "./config.json";
import DropFile from "./DropFile/DropFile";
import {ThemeContextProvider} from "./ThemeContext/ThemeContext";
import {
    APP_URL_SEARCH_PARAMS,
    FileSeek,
    SEEK_PARAM_VALUE,
} from "./types/url.types";
import {
    getFilePathFromWindowLocation, getModifiedUrl, parseNum,
} from "./Viewer/services/utils";
import Viewer from "./Viewer/Viewer";

import "bootstrap/dist/css/bootstrap.min.css";
import "./App.scss";


dayjs.extend(utc);

enum APP_STATE {
    FILE_PROMPT = "file_prompt",
    FILE_VIEW = "file_view",
}


/**
 * Retrieves "seek" related parameters from the provided URLSearchParams object.
 *
 * @param urlSearchParams The URLSearchParams object containing the search parameters.
 * @return The "seek" related parameters, or null if not found or invalid.
 */
const getAndClearFileSeek = (urlSearchParams: URLSearchParams):
    (FileSeek | null) => {
    const paramFilePathPrefix = urlSearchParams.get(APP_URL_SEARCH_PARAMS.FILE_PATH_PREFIX);
    const paramSeek = urlSearchParams.get(APP_URL_SEARCH_PARAMS.SEEK);
    if (null === paramFilePathPrefix || null === paramSeek) {
        console.debug(`Either seek="${paramSeek}" or filePathPrefix="${paramFilePathPrefix}" ` +
            "is null. No file seeking will be performed.");

        return null;
    }

    // Clear the parameter
    const newUrl = getModifiedUrl({
        [APP_URL_SEARCH_PARAMS.FILE_PATH_PREFIX]: null,
        [APP_URL_SEARCH_PARAMS.SEEK]: null,
    }, {});

    window.history.pushState({}, "", newUrl);

    if (Object.values<string>(SEEK_PARAM_VALUE).includes(paramSeek)) {
        console.log(`Will be seeking for the ${paramSeek} file from ` +
                `filePathPrefix=${paramFilePathPrefix}`);

        return {
            seek: paramSeek as SEEK_PARAM_VALUE,
            filePathPrefix: paramFilePathPrefix,
        };
    }

    return null;
};

/**
 * Main component which renders viewer and scanner depending
 * on the state of the application.
 *
 * @class
 * @return
 */
const App = () => {
    const [appMode, setAppMode] = useState<APP_STATE>(APP_STATE.FILE_PROMPT);
    const [fileSrc, setFileSrc] = useState<File|string|null>(null);
    const [logEventIdx, setLogEventIdx] = useState<number|null>(null);
    const [timestamp, setTimestamp] = useState<number|null>(null);
    const [enablePrettify, setEnablePrettify] = useState<boolean>(false);
    const urlSearchParams = useMemo(
        () => new URLSearchParams(window.location.search.substring(1)),
        []
    );
    const urlHashParams = useMemo(
        () => new URLSearchParams(window.location.hash.substring(1)),
        []
    );
    const initialQuery = {
        isRegex: "true" === urlSearchParams.get("query.isRegex"),
        matchCase: "true" === urlSearchParams.get("query.matchCase"),
        searchString: urlSearchParams.get("query.searchString") ?? "",
    };
    const initialSeekRef = useRef<FileSeek|null>(null);

    /**
     * Handles the file being changed
     *
     * @param file
     */
    const handleFileChange = (file: File) => {
        setFileSrc(file);
        setAppMode(APP_STATE.FILE_VIEW);
    };

    /**
     * Initializes the application's state. The file to load is set based on
     * this order of precedence:
     * <ul>
     *   <li>`filePath` from url if it is provided</li>
     *   <li>`defaultFileUrl` if it is provided in config file</li>
     * </ul>
     * If neither are provided, we display a prompt to load a file.
     */
    useEffect(() => {
        console.debug("Version:", config.version);

        // Load the initial state of the viewer from url
        setEnablePrettify("true" === urlSearchParams.get("prettify"));
        setTimestamp(
            parseNum(
                urlSearchParams.get("timestamp")
            )
        );
        setLogEventIdx(
            parseNum(
                urlHashParams.get("logEventIdx")
            )
        );

        const filePath = getFilePathFromWindowLocation();
        initialSeekRef.current = getAndClearFileSeek(urlSearchParams);
        if (null !== filePath) {
            setFileSrc(filePath);
            setAppMode(APP_STATE.FILE_VIEW);
        } else if (null !== initialSeekRef.current) {
            setAppMode(APP_STATE.FILE_VIEW);
        } else if (
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            null !== config.defaultFileUrl
        ) {
            setFileSrc(config.defaultFileUrl);
            setAppMode(APP_STATE.FILE_VIEW);
        } else {
            setAppMode(APP_STATE.FILE_PROMPT);
        }
    }, [
        urlHashParams,
        urlSearchParams,
    ]);

    return (
        <div id={"app"}>
            <ThemeContextProvider>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DropFile onFileDrop={handleFileChange}>
                        {(APP_STATE.FILE_VIEW === appMode) &&
                        <Viewer
                            enablePrettify={enablePrettify}
                            fileSrc={fileSrc}
                            initialQuery={initialQuery}
                            logEventNumber={logEventIdx}
                            seekParams={initialSeekRef.current}
                            timestamp={timestamp}/>}
                    </DropFile>
                </LocalizationProvider>
            </ThemeContextProvider>
        </div>
    );
};

export default App;
