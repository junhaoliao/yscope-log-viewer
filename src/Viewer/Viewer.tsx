import {
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {Row} from "react-bootstrap";
import LoadingIcons from "react-loading-icons";

import dayjs from "dayjs";
import tz from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import {v1 as uuidv1} from "uuid";

import {
    APP_THEME,
    ThemeContext,
} from "../ThemeContext/ThemeContext";
import {
    FileSeek,
    SEEK_PARAM_VALUE,
} from "../types/url.types";
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
import S3Scanner from "./services/S3Scanner";
import STATE_CHANGE_TYPE, {CHANGE_FILE_DIREECTION} from "./services/STATE_CHANGE_TYPE";
import {
    getModifiedUrl,
    getNewLineAndPage,
    parseNum,
} from "./services/utils";
import LogFileState from "./types/LogFileState";

import "./Viewer.scss";


dayjs.extend(utc);
dayjs.extend(tz);

interface QueryOptions {
    isRegex: boolean,
    matchCase: boolean,
    searchString: string
}

interface ViewerProps {
    fileSrc: File | string | null,
    enablePrettify: boolean,
    logEventNumber: number | null,
    seekParams: FileSeek | null,
    initialQuery: QueryOptions,
    timestamp: number | null,
}


const DEFAULT_PAGE_SIZE = 10000;

interface FileAndLogEventIdx {
    fileSrc: string,
    logEventIdx: number
}

/**
 *
 * @param s3Scanner
 * @param seekParams
 */
const getFileFromSeekParams = async (s3Scanner: S3Scanner, seekParams: FileSeek):
    Promise<FileAndLogEventIdx | null> => {
    let fileSrc: string | null;
    let logEventIdx: number;
    if (SEEK_PARAM_VALUE.BEGIN === seekParams.seek) {
        fileSrc = await s3Scanner.getBeginObject(seekParams.filePathPrefix);
        logEventIdx = 1;
    } else {
        // SEEK_PARAM_VALUE.END === seekParams.seek
        fileSrc = await s3Scanner.getEndObject(seekParams.filePathPrefix);
        logEventIdx = -1;
    }

    if (null === fileSrc) {
        console.log(`Unable to find ${seekParams.seek} file from filePathPrefix=${
            seekParams.filePathPrefix}`);

        return null;
    }

    console.log(`Found ${seekParams.seek} file from filePathPrefix=${
        seekParams.filePathPrefix} as ${fileSrc}`);

    return {
        fileSrc: fileSrc,
        logEventIdx: logEventIdx,
    };
};

/**
 * Contains the menu, Monaco editor, and status bar. Viewer spawns its own
 * worker to manage the file and perform CLP operations.
 *
 * @param props
 * @param props.fileSrc File object to read or file path to load
 * @param props.logEventNumber The initial log event number
 * @param props.enablePrettify Whether to prettify the log file
 * @param props.seekParams
 * @param props.initialQuery
 * @param props.timestamp The initial timestamp to show. If this field is
 * valid, logEventNumber will be ignored.
 * @return
 */
const Viewer = ({
    fileSrc,
    enablePrettify,
    logEventNumber,
    seekParams,
    initialQuery,
    timestamp,
}: ViewerProps) => {
    const {appTheme} = useContext(ThemeContext);

    // Ref hook used to reference worker used for loading and decoding
    const clpWorker = useRef<Worker|null>(null);

    // s3 scanner for navigating among related files
    // FIXME: hide the prevFile / nextFile buttons
    //  when the S3_ENDPOINT envvar isn't specified
    const s3Scanner = useMemo<null|S3Scanner>(
        () => (
            (
                "undefined" === typeof process.env.S3_ENDPOINT ||
                0 === process.env.S3_ENDPOINT.length
            ) ?
                null :
                new S3Scanner()),
        []
    );

    // Logger used to track of all loading messages and state transitions
    const msgLogger = useRef(new MessageLogger());

    // Loading States
    const [loadingFile, setLoadingFile] = useState(true);
    const [loadingLogs, setLoadingLogs] = useState(true);
    const [shouldReloadSearch, setShouldReloadSearch] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const [statusMessageLogs, setStatusMessageLogs] = useState([]);

    // Log States
    const lsPageSize = parseNum(localStorage.getItem(LOCAL_STORAGE_KEYS.PAGE_SIZE));
    const defaultLogFileState = {
        compressedSize: null,
        decompressedSize: null,
        numEvents: null,
        numPages: null,

        columnNum: null,
        lineNum: null,
        logEventIdx: logEventNumber,
        pageNum: null,

        enablePrettify: enablePrettify,
        pageSize: lsPageSize ?? DEFAULT_PAGE_SIZE,
        verbosity: -1,

        nextFilePath: null,
        prevFilePath: null,
    };
    const [logFileState, setLogFileState] = useState<LogFileState>(defaultLogFileState);
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
     * @param prevLogFileState
     */
    const loadFile = (fileSrc, prevLogFileState) => {
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
            prevLogFileState.logEventIdx :
            null;

        const sessionId = uuidv1();
        window.sessionStorage.setItem("sessionId", sessionId);
        clpWorker.current.postMessage({
            code: CLP_WORKER_PROTOCOL.LOAD_FILE,
            enablePrettify: prevLogFileState.enablePrettify,
            fileSrc: fileSrc,
            initialTimestamp: timestamp,
            logEventIdx: logEvent,
            pageSize: prevLogFileState.pageSize,
            sessionId: sessionId,
        });
    };

    // Load file if file info changes (this could happen from drag and drop)
    useEffect(() => {
        const fileChange = async () => {
            if (null !== s3Scanner && null !== seekParams) {
                const fileAndLogEventIdx =
                    await getFileFromSeekParams(s3Scanner, seekParams);

                if (null !== fileAndLogEventIdx) {
                    ({fileSrc, logEventIdx: logEventNumber} = fileAndLogEventIdx);
                }
            }
            loadFile(fileSrc, {...logFileState, logEventNumber: logEventNumber});
        };

        fileChange();
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
            case STATE_CHANGE_TYPE.CHANGE_FILE: {
                const filePath = (args.direction === CHANGE_FILE_DIREECTION.PREV) ?
                    logFileState.prevFilePath :
                    logFileState.nextFilePath;
                const logEventIdx = (args.direction === CHANGE_FILE_DIREECTION.PREV) ?
                    -1 :
                    1;
                const logViewerUrl = window.location.origin + window.location.pathname;
                window.open(
                    `${logViewerUrl}?filePath=${filePath}#logEventIdx=${logEventIdx}`,
                    "_blank"
                );
                break;
            }
            case STATE_CHANGE_TYPE.PAGE_NUM:
                if (null === logFileState.pageNum) {
                    throw new Error("Unexpected null logFileState.pageNum");
                }
                const [newPage, newLine] = getNewLineAndPage(
                    logFileState.pageNum,
                    args.requestedPage,
                    logFileState.numPages
                );

                if (null !== newPage) {
                    setLoadingLogs(true);
                    setStatusMessage(`Loading page number ${newPage}...`);
                    clpWorker.current.postMessage({
                        code: CLP_WORKER_PROTOCOL.CHANGE_PAGE_NUM,
                        pageNum: newPage,
                        linePos: newLine,
                    });
                }
                break;
            case STATE_CHANGE_TYPE.VERBOSITY:
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
            case STATE_CHANGE_TYPE.PAGE_SIZE:
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
            case STATE_CHANGE_TYPE.PRETTIFY:
                setLoadingLogs(true);
                setStatusMessage(
                    args.enablePrettify ?
                        "Prettifying..." :
                        "Un-prettifying..."
                );
                clpWorker.current.postMessage({
                    code: CLP_WORKER_PROTOCOL.PRETTIFY,
                    enablePrettify: args.enablePrettify,
                });
                break;
            case STATE_CHANGE_TYPE.LINE_NUM:
                clpWorker.current.postMessage({
                    code: CLP_WORKER_PROTOCOL.GET_EVENT_FROM_LINE,
                    lineNum: args.lineNum,
                    columnNum: args.columnNum,
                });
                break;
            case STATE_CHANGE_TYPE.LOG_EVENT_IDX:
                setLoadingLogs(true);
                setStatusMessage(`Going to new log event ${args.logEventIdx}`);
                clpWorker.current.postMessage({
                    code: CLP_WORKER_PROTOCOL.GET_LINE_FROM_EVENT,
                    desiredLogEventIdx: args.logEventIdx,
                });
                break;
            case STATE_CHANGE_TYPE.SEARCH:
                handleStateChangeSearch(args);
                break;
            case STATE_CHANGE_TYPE.START_DOWNLOAD:
                clpWorker.current.postMessage({
                    code: CLP_WORKER_PROTOCOL.START_DOWNLOAD,
                });
                break;
            case STATE_CHANGE_TYPE.STOP_DOWNLOAD:
                clpWorker.current.postMessage({
                    code: CLP_WORKER_PROTOCOL.STOP_DOWNLOAD,
                });
                break;
            case STATE_CHANGE_TYPE.TIMESTAMP:
                setLoadingLogs(true);
                setStatusMessage(`Jump to timestamp: ${args.timestamp}`);
                clpWorker.current.postMessage({
                    code: CLP_WORKER_PROTOCOL.CHANGE_TIMESTAMP,
                    timestamp: Number(args.timestamp),
                });
                break;
            case STATE_CHANGE_TYPE.TIMEZONE:
                setLoadingLogs(true);
                if ("local" === args.timezone) {
                    dayjs.tz.setDefault();
                } else {
                    dayjs.tz.setDefault(args.timezone);
                }
                clpWorker.current.postMessage({
                    code: CLP_WORKER_PROTOCOL.TIMEZONE,
                    timezone: args.timezone,
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
                if ("string" === typeof event.data.status.message &&
                    event.data.status.message.includes("Input protocol version is too new")) {
                    window.location.href = window.location.href.replace("/prod/log-viewer", "/staging/log-viewer");
                }
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
                setLogFileState((v) => ({
                    ...v,
                    ...event.data.state,
                }));
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
                s3Scanner?.getPrevObject(event.data.fileInfo.filePath).then((path) => {
                    setLogFileState((v) => ({...v, prevFilePath: path}));
                });
                s3Scanner?.getNextObject(event.data.fileInfo.filePath).then((path) => {
                    setLogFileState((v) => ({...v, nextFilePath: path}));
                });
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
        logData,
        searchQuery,
        shouldReloadSearch,
    ]);

    useEffect(() => {
        if (null === clpWorker.current) {
            // FIXME: why the check?
            return;
        }
        clpWorker.current.onmessage = handleWorkerMessage;
    }, [
        logFileState,
        logData,
        searchQuery,
        shouldReloadSearch,
    ]);

    useEffect(() => {
        if (null !== fileInfo) {
            const searchParams = {filePath: fileInfo.filePath ?? null};
            const hashParams = {logEventIdx: logFileState.logEventIdx};

            const newUrl = getModifiedUrl(searchParams, hashParams);
            window.history.pushState({}, null, newUrl);
        }
    }, [
        fileInfo,
        logFileState.logEventIdx,
    ]);

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
        // FIXME: shouldn't this be moved to App.tsx?
        const urlHashParams = new URLSearchParams(window.location.hash.substring(1));
        const logEventIdx = urlHashParams.get("logEventIdx");
        changeState(STATE_CHANGE_TYPE.LOG_EVENT_IDX, {logEventIdx: parseNum(logEventIdx)});
    };

    const handleSearchQueryChange = (newQuery) => {
        setSearchQuery(newQuery);
        changeState(STATE_CHANGE_TYPE.SEARCH, {...newQuery});
    };

    const goToEventCallback = (logEventIdx) => {
        changeState(STATE_CHANGE_TYPE.LOG_EVENT_IDX, {logEventIdx: logEventIdx});
    };

    let leftPanelContent = (<></>);
    if (0 !== leftPanelWidth) {
        if (LEFT_PANEL_TAB_IDS.SEARCH === leftPanelActiveTabId) {
            leftPanelContent = (
                <SearchPanel
                    handleQueryChange={handleSearchQueryChange}
                    query={searchQuery}
                    searchResultClickHandler={goToEventCallback}
                    searchResults={searchResults}
                    totalPages={logFileState.numPages}
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
                            stroke={(APP_THEME.LIGHT === appTheme) ?
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
            {/* FIXME: why we need to null check fileInfo here? */}
            {!loadingFile && fileInfo &&
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
};

export default Viewer;
export type {QueryOptions};
