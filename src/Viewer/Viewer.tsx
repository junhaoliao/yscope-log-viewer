import PropTypes, {oneOfType} from "prop-types";
import React, {
    useCallback, useContext, useEffect, useRef, useState,
} from "react";
import {Row} from "react-bootstrap";
import LoadingIcons from "react-loading-icons";

import {v1 as uuidv1} from "uuid";

import {
    AppThemeName, ThemeContext,
} from "../ThemeContext/ThemeContext";
import {
    LEFT_PANEL_DEFAULT_WIDTH_FACTOR,
    LEFT_PANEL_TAB_IDS,
    LeftPanel,
} from "./components/LeftPanel/LeftPanel";
import MenuBar from "./components/MenuBar/MenuBar";
import MonacoInstance from "./components/Monaco/MonacoInstance";
import SearchPanel from "./components/SearchPanel/SearchPanel";
import {StatusBar} from "./components/StatusBar/StatusBar";
import CLP_WORKER_PROTOCOL from "./services/CLP_WORKER_PROTOCOL";
import FourByteClpIrStreamReader from "./services/decoder/FourByteClpIrStreamReader";
import LOCAL_STORAGE_KEYS from "./services/LOCAL_STORAGE_KEYS";
import MessageLogger from "./services/MessageLogger";
import STATE_CHANGE_TYPE from "./services/STATE_CHANGE_TYPE";
import {
    getModifiedUrl, isNumeric, modifyPage,
} from "./services/utils";

import "./Viewer.scss";


Viewer.propTypes = {
    fileSrc: oneOfType([
        PropTypes.object,
        PropTypes.string,
    ]),
    filePath: PropTypes.string,
    prettifyLog: PropTypes.bool,
    logEventNumber: PropTypes.string,
    timestamp: PropTypes.string,
};

/**
 * Contains the menu, Monaco editor, and status bar. Viewer spawns its own
 * worker to manage the file and perform CLP operations.
 *
 * @param props
 * @param props.fileSrc File object to read or file path to load
 * @param props.logEventNumber The initial log event number
 * @param props.prettifyLog Whether to prettify the log file
 * @param props.initialQuery
 * @param props.timestamp The initial timestamp to show. If this field is
 * valid, logEventNumber will be ignored.
 * @return
 */
export function Viewer ({
    fileSrc,
    prettifyLog,
    logEventNumber,
    initialQuery,
    timestamp,
}) {
    const {appTheme} = useContext(ThemeContext);

    // Ref hook used to reference worker used for loading and decoding
    const clpWorker = useRef(null);

    // Logger used to track of all loading messages and state transitions
    const msgLogger = useRef(new MessageLogger());

    // Loading States
    const [loadingFile, setLoadingFile] = useState(true);
    const [loadingLogs, setLoadingLogs] = useState(true);
    const [shouldReloadSearch, setShouldReloadSearch] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const [statusMessageLogs, setStatusMessageLogs] = useState([]);

    // Log States
    const lsPageSize = localStorage.getItem(LOCAL_STORAGE_KEYS.PAGE_SIZE);
    const [logFileState, setLogFileState] = useState({
        columnNumber: null,
        lineNumber: null,
        logEventIdx: isNumeric(logEventNumber) ?
            Number(logEventNumber) :
            null,
        numberOfEvents: null,
        page: null,
        pageSize: lsPageSize ?
            Number(lsPageSize) :
            10000,
        pages: null,
        prettify: prettifyLog ?
            prettifyLog :
            false,
        verbosity: null,
    });
    const [fileInfo, setFileInfo] = useState(null);
    const [logData, setLogData] = useState(null);

    const [leftPanelActiveTabId, setLeftPanelActiveTabId] = useState(LEFT_PANEL_TAB_IDS.SEARCH);
    const [leftPanelWidth, setLeftPanelWidth] = useState(
        (0 === initialQuery.searchString.length) ?
            0 :
            window.innerWidth * LEFT_PANEL_DEFAULT_WIDTH_FACTOR
    );
    const [searchQuery, setSearchQuery] = useState(initialQuery);
    const [searchResults, setSearchResults] = useState(null);

    useEffect(() => {
        // Cleanup
        return () => {
            if (clpWorker.current) {
                clpWorker.current.terminate();
            }
        };
    }, []);

    /**
     * Reload viewer on fileSrc change
     *
     * @param fileSrc
     */
    const loadFile = (fileSrc) => {
        if (clpWorker.current) {
            clpWorker.current.terminate();
        }
        setStatusMessageLogs([...msgLogger.current.reset()]);
        setLoadingLogs(false);
        setLoadingFile(true);
        setShouldReloadSearch(true);

        // Create new worker and pass args to worker to load file
        clpWorker.current = new Worker(new URL("./services/clpWorker.js", import.meta.url));

        // If file was loaded using file dialog or drag/drop, reset logEventIdx
        const logEvent = ("string" === typeof fileSrc) ?
            logFileState.logEventIdx :
            null;
        const initialTimestamp = isNumeric(timestamp) ?
            Number(timestamp) :
            null;

        const sessionId = uuidv1();
        window.sessionStorage.setItem("sessionId", sessionId);
        clpWorker.current.postMessage({
            code: CLP_WORKER_PROTOCOL.LOAD_FILE,
            sessionId: sessionId,
            fileSrc: fileSrc,
            prettify: logFileState.prettify,
            logEventIdx: logEvent,
            initialTimestamp: initialTimestamp,
            pageSize: logFileState.pageSize,
        });
    };

    // Load file if file info changes (this could happen from drag and drop)
    useEffect(() => {
        loadFile(fileSrc);
    }, [fileSrc]);

    // Save statusMessages to the msg logger for debugging
    useEffect(() => {
        msgLogger.current.add(statusMessage);
    }, [statusMessage]);

    const handleStateChangeSearch = (args) => {
        if ("" === args.searchString) {
            setSearchResults(null);
        } else {
            setSearchResults([]);
        }

        clpWorker.current.postMessage({
            code: CLP_WORKER_PROTOCOL.UPDATE_SEARCH_STRING,
            searchString: args.searchString,
            isRegex: args.isRegex,
            matchCase: args.matchCase,
        });
    };

    /**
     * Passes state changes to the worker. Worker performs operation
     * and returns an updated state which is used to update the UI.
     *
     * @param {string} type The type of state change to execute.
     * @param {object} args The argument used to execute state change.
     */
    const changeState = useCallback((type, args) => {
        if (loadingLogs) {
            return;
        }
        switch (type) {
            case STATE_CHANGE_TYPE.page:
                const [linePos, validNewPage] = modifyPage(
                    args.action,
                    logFileState.page,
                    args.requestedPage,
                    logFileState.pages
                );

                if (validNewPage) {
                    setLoadingLogs(true);
                    setStatusMessage(`Loading page number ${validNewPage}...`);
                    clpWorker.current.postMessage({
                        code: CLP_WORKER_PROTOCOL.CHANGE_PAGE,
                        page: validNewPage,
                        linePos: linePos,
                    });
                }
                break;
            case STATE_CHANGE_TYPE.verbosity:
                if (args.verbosity !== logFileState.verbosity) {
                    setShouldReloadSearch(true);
                    handleStateChangeSearch({searchString: ""});
                    setLoadingLogs(true);
                    const verbosity = (-1 === args.verbosity) ?
                        "ALL" :
                        FourByteClpIrStreamReader.VERBOSITIES[args.verbosity].label;

                    setStatusMessage(`Filtering logs with level: ${verbosity}`);
                    clpWorker.current.postMessage({
                        code: CLP_WORKER_PROTOCOL.UPDATE_VERBOSITY,
                        verbosity: args.verbosity,
                    });
                }
                break;
            case STATE_CHANGE_TYPE.pageSize:
                if (args.pageSize !== logFileState.pageSize) {
                    setShouldReloadSearch(true);
                    handleStateChangeSearch({searchString: ""});
                    setLoadingLogs(true);
                    setStatusMessage(`Changing events per page to ${args.pageSize}`);
                    clpWorker.current.postMessage({
                        code: CLP_WORKER_PROTOCOL.REDRAW_PAGE,
                        pageSize: Number(args.pageSize),
                    });
                }
                break;
            case STATE_CHANGE_TYPE.prettify:
                setLoadingLogs(true);
                setStatusMessage(args.prettify ?
                    "Prettifying..." :
                    "Un-prettifying...");
                clpWorker.current.postMessage({
                    code: CLP_WORKER_PROTOCOL.PRETTY_PRINT,
                    prettify: args.prettify,
                });
                break;
            case STATE_CHANGE_TYPE.lineNumber:
                clpWorker.current.postMessage({
                    code: CLP_WORKER_PROTOCOL.GET_EVENT_FROM_LINE,
                    lineNumber: args.lineNumber,
                    columnNumber: args.columnNumber,
                });
                break;
            case STATE_CHANGE_TYPE.logEventIdx:
                setLoadingLogs(true);
                setStatusMessage(`Going to new log event ${args.logEventIdx}`);
                clpWorker.current.postMessage({
                    code: CLP_WORKER_PROTOCOL.GET_LINE_FROM_EVENT,
                    desiredLogEventIdx: args.logEventIdx,
                });
                break;
            case STATE_CHANGE_TYPE.search:
                handleStateChangeSearch(args);
                break;
            case STATE_CHANGE_TYPE.startDownload:
                clpWorker.current.postMessage({
                    code: CLP_WORKER_PROTOCOL.START_DOWNLOAD,
                });
                break;
            case STATE_CHANGE_TYPE.stopDownload:
                clpWorker.current.postMessage({
                    code: CLP_WORKER_PROTOCOL.STOP_DOWNLOAD,
                });
                break;
            case STATE_CHANGE_TYPE.timestamp:
                setLoadingLogs(true);
                setStatusMessage(`Jump to timestamp: ${args.timestamp}`);
                clpWorker.current.postMessage({
                    code: CLP_WORKER_PROTOCOL.CHANGE_TIMESTAMP,
                    timestamp: Number(args.timestamp),
                });
                break;
            default:
                break;
        }
    }, [
        logFileState,
        loadingLogs,
    ]);

    /**
     * Handles messages sent from clpWorker and updates the
     * relevant component states
     *
     * @param {object} event
     */
    const handleWorkerMessage = useCallback((event) => {
        switch (event.data.code) {
            case CLP_WORKER_PROTOCOL.LOADING_MESSAGES:
                msgLogger.current.add(event.data.status, event.data.error);
                setStatusMessageLogs([...msgLogger.current.get()]);
                break;
            case CLP_WORKER_PROTOCOL.ERROR:
                msgLogger.current.add(event.data.error);
                setStatusMessageLogs([...msgLogger.current.get()]);
                setStatusMessage(event.data.error);
                setLoadingFile(false);
                setLoadingLogs(false);
                break;
            case CLP_WORKER_PROTOCOL.UPDATE_STATE:
                setLogFileState({
                    ...logFileState,
                    ...event.data.state,
                });
                setLoadingFile(false);
                setLoadingLogs(false);
                setStatusMessage("");
                if (shouldReloadSearch) {
                    handleStateChangeSearch({...searchQuery});
                    setShouldReloadSearch(false);
                }
                break;
            case CLP_WORKER_PROTOCOL.LOAD_LOGS:
                setLogData(event.data.logs);
                setLoadingLogs(false);
                setStatusMessage("");
                break;
            case CLP_WORKER_PROTOCOL.UPDATE_FILE_INFO:
                setFileInfo(event.data.fileInfo);
                break;
            case CLP_WORKER_PROTOCOL.UPDATE_SEARCH_RESULTS:
                setSearchResults((prevArray) => [
                    ...prevArray,
                    {
                        page_num: event.data.page_num,
                        hasMoreResults: event.data.hasMoreResults,
                        searchResults: event.data.searchResults,
                    },
                ]);
                break;
            default:
                console.error("Unhandled code:", event.data);
                break;
        }
    }, [
        logFileState,
        logData,
        searchQuery,
        shouldReloadSearch,
    ]);

    useEffect(() => {
        clpWorker.current.onmessage = handleWorkerMessage;
    }, [
        logFileState,
        logData,
        searchQuery,
        shouldReloadSearch,
    ]);

    useEffect(() => {
        if (null !== fileInfo) {
            const searchParams = {filePath: fileInfo.filePath};
            const hashParams = {logEventIdx: logFileState.logEventIdx};

            const newUrl = getModifiedUrl(searchParams, hashParams);
            window.history.pushState({}, null, newUrl);
        }
    }, [fileInfo]);

    /**
     * Unsets the cached page size in case it causes a client OOM. If it
     * doesn't, the saved value will be restored when
     * {@link restoreCachedPageSize} is called.
     */
    const unsetCachedPageSize = () => {
        localStorage.removeItem(LOCAL_STORAGE_KEYS.PAGE_SIZE);
    };

    /**
     * Restores the cached page size that was unset in
     * {@link unsetCachedPageSize}.
     */
    const restoreCachedPageSize = useCallback(() => {
        localStorage.setItem(LOCAL_STORAGE_KEYS.PAGE_SIZE, logFileState.pageSize.toString());
    }, [logFileState]);

    // Fires when hash is changed in the window.
    window.onhashchange = () => {
        const urlHashParams = new URLSearchParams(window.location.hash.substring(1));
        const logEventIdx = urlHashParams.get("logEventIdx");
        if (isNumeric(logEventIdx)) {
            changeState(STATE_CHANGE_TYPE.logEventIdx, {logEventIdx: Number(logEventIdx)});
        } else {
            changeState(STATE_CHANGE_TYPE.logEventIdx, {logEventIdx: logFileState.logEventIdx});
        }
    };

    const searchQueryChangeHandler = (newQuery) => {
        setSearchQuery(newQuery);
        changeState(STATE_CHANGE_TYPE.search, {...newQuery});
    };

    const goToEventCallback = (logEventIdx) => {
        changeState(STATE_CHANGE_TYPE.logEventIdx, {logEventIdx: logEventIdx});
    };

    let leftPanelContent = (<></>);
    if (0 !== leftPanelWidth) {
        if (LEFT_PANEL_TAB_IDS.SEARCH === leftPanelActiveTabId) {
            leftPanelContent = (
                <SearchPanel
                    query={searchQuery}
                    queryChangeHandler={searchQueryChangeHandler}
                    searchResultClickHandler={goToEventCallback}
                    searchResults={searchResults}
                    totalPages={logFileState.pages}
                    onStatusMessageChange={setStatusMessage}/>
            );
        }
    }

    return (
        <div
            className={"viewer-container"}
            data-theme={appTheme}
        >
            {loadingFile &&
                <div className={"viewer-loading-container"}>
                    <Row className={"m-0"}>
                        <LoadingIcons.Oval
                            height={"5em"}
                            stroke={(AppThemeName.LIGHT === appTheme) ?
                                "black" :
                                "white"}/>
                    </Row>
                    <Row className={"loading-container"}>
                        <ul>
                            {statusMessageLogs.map((status, index) => (
                                <li key={index}>
                                    {status}
                                </li>
                            ))}
                        </ul>
                    </Row>
                </div>}
            {!loadingFile &&
                <>
                    <div
                        style={{
                            display: "flex",
                            flexGrow: 1,
                            height: "100%",

                            // Without this, if this element's content exceeds the
                            // size of this element's parent, flex-grow won't shrink
                            // this element to fit within the parent.
                            minHeight: 0,
                            overflow: "hidden",
                            width: "100%",
                        }}
                    >
                        <LeftPanel
                            activeTabId={leftPanelActiveTabId}
                            changeStateCallback={changeState}
                            fileInfo={fileInfo}
                            loadFileCallback={loadFile}
                            logFileState={logFileState}
                            panelWidth={leftPanelWidth}
                            setActiveTabId={setLeftPanelActiveTabId}
                            setPanelWidth={setLeftPanelWidth}
                        >
                            {leftPanelContent}
                        </LeftPanel>

                        <div
                            style={{
                                flexGrow: 1,
                                height: "100%",
                                overflow: "hidden",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    height: "100%",
                                }}
                            >
                                <MenuBar
                                    fileInfo={fileInfo}
                                    isLoading={loadingLogs}
                                    logFileState={logFileState}
                                    onStateChange={changeState}/>
                                <div
                                    style={{
                                        flexGrow: 1,

                                        // Without this, if this element's content
                                        // exceeds the size of this element's
                                        // parent, flex-grow won't shrink this
                                        // element to fit within the parent.
                                        minHeight: 0,
                                        height: "100%",
                                    }}
                                >
                                    <MonacoInstance
                                        beforeMount={unsetCachedPageSize}
                                        loadingLogs={loadingLogs}
                                        logData={logData}
                                        logFileState={logFileState}
                                        onMount={restoreCachedPageSize}
                                        onStateChange={changeState}/>
                                </div>
                            </div>
                        </div>
                    </div>

                    <StatusBar
                        changeStateCallback={changeState}
                        loadingLogs={loadingLogs}
                        logFileState={logFileState}
                        status={statusMessage}/>
                </>}
        </div>
    );
}
