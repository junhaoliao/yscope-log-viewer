import {
    useCallback,
    useEffect,
    useState,
} from "react";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import {LocalizationProvider} from "@mui/x-date-pickers";
import {AdapterDayjs} from "@mui/x-date-pickers/AdapterDayjs";

import config from "./config.json";
import DropFile from "./DropFile/DropFile";
import {
    APP_THEME,
    APP_THEME_DEFAULT,
    ThemeContext,
} from "./ThemeContext/ThemeContext";
import LOCAL_STORAGE_KEYS from "./Viewer/services/LOCAL_STORAGE_KEYS";
import {getFilePathFromWindowLocation} from "./Viewer/services/utils";
import {Viewer} from "./Viewer/Viewer";

import "bootstrap/dist/css/bootstrap.min.css";
import "./App.scss";


dayjs.extend(utc);

enum APP_STATE {
    FILE_PROMPT = "file_prompt",
    FILE_VIEW = "file_view",
}

/**
 * Main component which renders viewer and scanner depending
 * on the state of the application.
 *
 * @class
 * @return
 */
const App = () => {
    const [appMode, setAppMode] = useState<APP_STATE>();
    const [fileSrc, setFileSrc] = useState<File|string|null>(null);
    const [logEventIdx, setLogEventIdx] = useState<number|null>(null);
    const [timestamp, setTimestamp] = useState<number|null>(null);
    const [prettify, setPrettify] = useState<boolean>(false);
    const [query, setQuery] = useState({});
    const [appTheme, setAppTheme] = useState(APP_THEME.DARK);

    const switchTheme = useCallback((theme: APP_THEME) => {
        localStorage.setItem(LOCAL_STORAGE_KEYS.UI_THEME, theme);
        document.getElementById("app")?.setAttribute("data-theme", theme);
        setAppTheme(theme);
    }, [setAppTheme]);

    /**
     * Initializes the application's state. The file to load is set based on
     * this order of precedence:
     * <ul>
     *   <li>`filePath` from url if it is provided</li>
     *   <li>`defaultFileUrl` if it is provided in config file</li>
     * </ul>
     * If neither are provided, we display a prompt to load a file.
     */
    const init = () => {
        const urlSearchParams = new URLSearchParams(window.location.search.substring(1));
        const urlHashParams = new URLSearchParams(window.location.hash.substring(1));

        // Load the initial state of the viewer from url
        setPrettify("true" === urlSearchParams.get("prettify"));
        setQuery({
            isRegex: Boolean(urlSearchParams.get("query.isRegex")) || false,
            matchCase: Boolean(urlSearchParams.get("query.matchCase")) || false,
            searchString: urlSearchParams.get("query.searchString") ?? "",
        });
        const logEventIdxParam = urlHashParams.get("logEventIdx");
        if (null !== logEventIdxParam) {
            setLogEventIdx(parseInt(logEventIdxParam, 10));
        }
        const timestampParam = urlSearchParams.get("timestamp");
        if (null !== timestampParam) {
            setTimestamp(parseInt(timestampParam, 10));
        }

        const filePath = getFilePathFromWindowLocation();

        if (null !== filePath) {
            setFileSrc(filePath);
            setAppMode(APP_STATE.FILE_VIEW);
        } else if (
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            null === config.defaultFileUrl
        ) {
            setFileSrc(config.defaultFileUrl);
            setAppMode(APP_STATE.FILE_VIEW);
        } else {
            setAppMode(APP_STATE.FILE_PROMPT);
        }
    };

    /**
     * Handles the file being changed
     *
     * @param file
     */
    const handleFileChange = (file: File) => {
        setFileSrc(file);
        setAppMode(APP_STATE.FILE_VIEW);
    };

    useEffect(() => {
        console.debug("Version:", config.version);
        const lsTheme = localStorage.getItem(LOCAL_STORAGE_KEYS.UI_THEME) ?? APP_THEME_DEFAULT;
        switchTheme(lsTheme as APP_THEME);
        init();
    }, [switchTheme]);

    return (
        <div id={"app"}>
            <ThemeContext.Provider value={{appTheme, switchTheme}}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DropFile handleFileDrop={handleFileChange}>
                        {(APP_STATE.FILE_VIEW === appMode) &&
                        <Viewer
                            fileSrc={fileSrc}
                            initialQuery={query}
                            logEventNumber={logEventIdx}
                            prettifyLog={prettify}
                            timestamp={timestamp}/>}
                    </DropFile>
                </LocalizationProvider>
            </ThemeContext.Provider>
        </div>
    );
};

export default App;
