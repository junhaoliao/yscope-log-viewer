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

enum FileOrder {
    FIRST = "first",
    LAST = "last"
}

/**
 * Retrieves the file order from the provided URLSearchParams object.
 *
 * @param urlSearchParams The URLSearchParams object containing the search parameters.
 * @return The file order value, or null if not found or invalid.
 */
const getAndClearFileOrderFrom = (urlSearchParams: URLSearchParams):
    (FileOrder | null) => {
    const paramFileOrder = urlSearchParams.get("fileOrder");
    if (null !== paramFileOrder) {
        // Clear the parameter
        const newUrl = getModifiedUrl({
            fileOrder: null,
        }, {});

        window.history.pushState({}, "", newUrl);

        if (Object.values<string>(FileOrder).includes(paramFileOrder)) {
            console.log(`Will be looking for the ${paramFileOrder} file from prefix=${
                urlSearchParams.get("filePath")}`);

            return paramFileOrder as FileOrder;
        }
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
    const initialFileOrderRef = useRef<FileOrder|null>(null);

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
        if (null !== filePath) {
            setFileSrc(filePath);
            setAppMode(APP_STATE.FILE_VIEW);
            if (null === initialFileOrderRef.current) {
                initialFileOrderRef.current = getAndClearFileOrderFrom(urlSearchParams);
            }
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

    console.log(initialFileOrderRef.current);

    return (
        <div id={"app"}>
            <ThemeContextProvider>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DropFile onFileDrop={handleFileChange}>
                        {(APP_STATE.FILE_VIEW === appMode) &&
                        <Viewer
                            enablePrettify={enablePrettify}
                            fileSrc={fileSrc}
                            initialFileOrder={initialFileOrderRef.current}
                            initialQuery={initialQuery}
                            logEventNumber={logEventIdx}
                            timestamp={timestamp}/>}
                    </DropFile>
                </LocalizationProvider>
            </ThemeContextProvider>
        </div>
    );
};

export default App;
