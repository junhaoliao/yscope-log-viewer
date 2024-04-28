import React, {
    useEffect, useState,
} from "react";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import {LocalizationProvider} from "@mui/x-date-pickers";
import {AdapterDayjs} from "@mui/x-date-pickers/AdapterDayjs";

import config from "./config.json";
import {DropFile} from "./DropFile/DropFile";
import {THEME_STATES} from "./ThemeContext/THEME_STATES";
import {ThemeContext} from "./ThemeContext/ThemeContext";
import LOCAL_STORAGE_KEYS from "./Viewer/services/LOCAL_STORAGE_KEYS";
import {getFilePathFromWindowLocation} from "./Viewer/services/utils";
import {Viewer} from "./Viewer/Viewer";

import "bootstrap/dist/css/bootstrap.min.css";
import "./App.scss";


dayjs.extend(utc);

/**
 * Main component which renders viewer and scanner depending
 * on the state of the application.
 *
 * @class
 * @return {JSX.Element}
 */
export function App () {
    const APP_STATE = {
        FILE_PROMPT: 0,
        FILE_VIEW: 1,
    };

    const [appMode, setAppMode] = useState(null);
    const [fileSrc, setFileSrc] = useState(null);
    const [logEventIdx, setLogEventIdx] = useState(null);
    const [timestamp, setTimestamp] = useState(null);
    const [prettify, setPrettify] = useState(null);
    const [query, setQuery] = useState({});
    const [appTheme, setAppTheme] = useState(THEME_STATES.DARK);

    useEffect(() => {
        console.debug("Version:", config.version);
        const lsTheme = localStorage.getItem(LOCAL_STORAGE_KEYS.UI_THEME);
        switchTheme(THEME_STATES.LIGHT === lsTheme ?
            THEME_STATES.LIGHT :
            THEME_STATES.DARK);
        init();
    }, []);

    const switchTheme = (theme) => {
        localStorage.setItem(LOCAL_STORAGE_KEYS.UI_THEME, theme);
        document.getElementById("app").setAttribute("data-theme", theme);
        setAppTheme(theme);
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
    const init = () => {
        const urlSearchParams = new URLSearchParams(window.location.search.substring(1));
        const urlHashParams = new URLSearchParams(window.location.hash.substring(1));

        // Load the initial state of the viewer from url
        setPrettify("true" === urlSearchParams.get("prettify"));
        setLogEventIdx(urlHashParams.get("logEventIdx"));
        setQuery({
            isRegex: Boolean(urlSearchParams.get("query.isRegex")) || false,
            matchCase: Boolean(urlSearchParams.get("query.matchCase")) || false,
            searchString: urlSearchParams.get("query.searchString") || "",
        });
        setTimestamp(urlSearchParams.get("timestamp"));

        const filePath = getFilePathFromWindowLocation();

        if (null !== filePath) {
            setFileSrc(filePath);
            setAppMode(APP_STATE.FILE_VIEW);
        } else if (null !== config.defaultFileUrl) {
            setFileSrc(config.defaultFileUrl);
            setAppMode(APP_STATE.FILE_VIEW);
        } else {
            setAppMode(APP_STATE.FILE_PROMPT);
        }
    };

    /**
     * Handles the file being changed
     *
     * @param {File} file
     */
    const handleFileChange = (file) => {
        setFileSrc(file);
        setAppMode(APP_STATE.FILE_VIEW);
    };

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
}
