import React, {useCallback, useContext, useEffect, useRef, useState} from "react";

import PropTypes from "prop-types";
import {Button, Form, Modal, ProgressBar, Row} from "react-bootstrap";
import {CloudArrowDown, Download, Folder, Gear, Moon, Search, Sun, XCircle} from "react-bootstrap-icons";

import {THEME_STATES} from "../../../ThemeContext/THEME_STATES";
import {ThemeContext} from "../../../ThemeContext/ThemeContext";
import STATE_CHANGE_TYPE from "../../services/STATE_CHANGE_TYPE";
import {ResizeHandle} from "../ResizeHandle/ResizeHandle";
import DOWNLOAD_WORKER_ACTION from "./DOWNLOAD_WORKER_ACTION";
import {BlobAppender, downloadBlob, downloadCompressedFile} from "./DownloadHelper";

import "./LeftPanel.scss";

const LEFT_PANEL_WIDTH_LIMIT_FACTOR = 0.8;
const LEFT_PANEL_SNAP_WIDTH = 108;
const LEFT_PANEL_DEFAULT_WIDTH_FACTOR = 0.2;

LeftPanel.propTypes = {
    logFileState: PropTypes.object,
    fileInfo: PropTypes.object,
    panelWidth: PropTypes.number,
    setPanelWidth: PropTypes.func,
    activeTabId: PropTypes.number,
    setActiveTabId: PropTypes.func,
    loadFileCallback: PropTypes.func,
    changeStateCallback: PropTypes.func,
    children: PropTypes.element,
};

/**
 * Callback used to set the panel's width
 * @callback SetPanelWidth
 * @param {number} width
 */

/**
 * Callback used to set the ID of the active tab
 * @callback SetActiveTabId
 * @param {number} id
 */

/**
 * This callback is used to load a new file.
 *
 * @callback LoadFileCallback
 * @param {File|String} fileInfo File object or file path to load.
 */

/**
 * Callback used to change the parent component's state
 * @callback ChangeStateCallback
 * @param {string} type The type of state change ({@link STATE_CHANGE_TYPE})
 * @param {object} args Arguments used to update the state
 */

/**
 * The left panel component
 * @param {object} logFileState Current state of the log file
 * @param {object} fileInfo Object containing file metadata
 * @param {number} panelWidth
 * @param {SetPanelWidth} setPanelWidth
 * @param {number} activeTabId
 * @param {SetActiveTabId} setActiveTabId
 * @param {LoadFileCallback} loadFileCallback
 * @param {ChangeStateCallback} changeStateCallback
 * @param {JSX.Element} children
 * @return {JSX.Element}
 */
export function LeftPanel ({
    logFileState,
    fileInfo,
    panelWidth,
    setPanelWidth,
    activeTabId,
    setActiveTabId,
    loadFileCallback,
    changeStateCallback,
    children,
}) {
    const handleLeftPanelResize = useCallback((newWidth) => {
        setPanelWidth((prev) => {
            // limit search panel width
            if (newWidth > window.innerWidth * LEFT_PANEL_WIDTH_LIMIT_FACTOR) {
                return prev;
            }
            // get panel to snap if it gets too small
            if (newWidth < LEFT_PANEL_SNAP_WIDTH) {
                return 0;
            }

            return newWidth;
        });
    }, []);

    const togglePanel = (activeTabId) => {
        setActiveTabId(activeTabId);
        setPanelWidth((prev) => {
            if (prev > 0) {
                // if previously opened, hide panel
                return 0;
            } else {
                // if previously not opened, open panel
                return window.innerWidth * LEFT_PANEL_DEFAULT_WIDTH_FACTOR;
            }
        });
    };

    return (
        <>
            <LeftPanelTabs
                logFileState={logFileState}
                fileInfo={fileInfo}
                activeTabId={panelWidth > 0 ? activeTabId : -1}
                togglePanel={togglePanel}
                loadFileCallback={loadFileCallback}
                changeStateCallback={changeStateCallback}
            />
            <div className={"left-panel-container"}>
                <div className={"left-panel-content-container"} style={{
                    minWidth: panelWidth,
                    width: panelWidth,
                }}>
                    {children}
                </div>
                <ResizeHandle resizeCallback={handleLeftPanelResize}/>
            </div>
        </>
    );
}

LeftPanelTabs.propTypes = {
    logFileState: PropTypes.object,
    fileInfo: PropTypes.object,
    activeTabId: PropTypes.number,
    togglePanel: PropTypes.func,
    loadFileCallback: PropTypes.func,
    changeStateCallback: PropTypes.func,
};

/**
 * Callback used to toggle (open/close) the panel
 * @callback TogglePanel
 * @param {number} activeTabId
 */

/**
 * This callback is used to load a new file.
 *
 * @callback LoadFileCallback
 * @param {File|String} fileInfo File object or file path to load.
 */

/**
 * Callback used to change the parent component's state
 * @callback ChangeStateCallback
 * @param {string} type The type of state change ({@link STATE_CHANGE_TYPE})
 * @param {object} args Arguments used to update the state
 */

/**
 * The tabs of the left panel
 * @param {object} logFileState Current state of the log file
 * @param {number} activeTabId
 * @param {TogglePanel} togglePanel
 * @param {LoadFileCallback} loadFileCallback
 * @param {ChangeStateCallback} changeStateCallback
 * @return {JSX.Element}
 *
 */
function LeftPanelTabs ({
    logFileState,
    fileInfo,
    activeTabId,
    togglePanel,
    loadFileCallback,
    changeStateCallback,
}) {
    const {theme, switchTheme} = useContext(ThemeContext);

    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadingMessage, setDownloadingMessage] = useState("Decoding pages to database...");
    const [progress, setProgress] = useState(0);

    const [showDownload, setShowDownload] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [eventsPerPage, setEventsPerPage] = useState(logFileState.pages);
    const inputFile = useRef(null);
    const downloadWorker = useRef(null);

    // Search Functions
    const toggleSearchPanel = () => {
        togglePanel(LEFT_PANEL_TAB_IDS.SEARCH);
    };

    // Settings Functions
    const handleCloseSettings = () => setShowSettings(false);
    const handleShowSettings = () => setShowSettings(true);

    // Download Functions
    const handleCloseDownload = () => setShowDownload(false);
    const handleShowDownload = () => setShowDownload(true);

    // File functions
    const openFile = () => {
        inputFile.current.click();
    };

    const loadFile = (e) => {
        loadFileCallback(e.target.files[0]);
    };

    // Modal Functions
    const getModalClass = () => {
        return (THEME_STATES.LIGHT === theme)?"modal-light":"modal-dark";
    };

    const saveModalChanges = (e) => {
        // TODO Can't backspace 0 from the number input
        // TODO What is the maximum number of events monaco can support?
        e.preventDefault();
        handleCloseSettings();
        changeStateCallback(STATE_CHANGE_TYPE.pageSize, {pageSize: eventsPerPage});
        localStorage.setItem("pageSize", String(eventsPerPage));
    };

    const closeModal = () => {
        handleCloseSettings();
    };

    const openModal = () => {
        handleShowSettings();
        setEventsPerPage(logFileState.pageSize);
    };

    const stopUncompressedDownload = () => {
        setDownloadingMessage("Clearing database and terminating download...");
        changeStateCallback(STATE_CHANGE_TYPE.stopDownload, null);
        downloadWorker.current.postMessage({
            code: DOWNLOAD_WORKER_ACTION.clearDatabase,
        });
    };

    const downloadUncompressedFile = async () => {
        changeStateCallback(STATE_CHANGE_TYPE.startDownload, null);
        setDownloadingMessage("Decoding data to database...");
        setIsDownloading(true);
        if (downloadWorker.current) {
            downloadWorker.current.terminate();
        }

        const worker = new Worker(new URL("./downloadWorker.js", import.meta.url));
        downloadWorker.current = worker;

        worker.postMessage({
            code: DOWNLOAD_WORKER_ACTION.initialize,
            sessionID: fileInfo.sessionID,
            count: logFileState.downloadPageChunks,
        });

        let page = 1;
        const blob = new BlobAppender();
        worker.onmessage = (e) => {
            const msg = e.data;
            switch (msg.code) {
                case DOWNLOAD_WORKER_ACTION.pageData:
                    blob.append(msg.data + "\n");
                    console.debug(`Added page ${msg.page} to stream.`);
                    if (page <= logFileState.downloadPageChunks) {
                        setProgress(90 + ((page/logFileState.downloadPageChunks) * 10));
                        worker.postMessage({
                            code: DOWNLOAD_WORKER_ACTION.pageData,
                            page: page++,
                        });
                    } else {
                        setIsDownloading(false);
                        worker.postMessage({
                            code: DOWNLOAD_WORKER_ACTION.clearDatabase,
                        });
                        worker.terminate();
                        downloadBlob(blob.getBlob(), fileInfo.name);
                    }
                    break;
                case DOWNLOAD_WORKER_ACTION.progress:
                    setProgress(msg.progress);
                    if (msg.done) {
                        setDownloadingMessage("Adding logs to stream...");
                        setProgress(0);
                        worker.postMessage({
                            code: DOWNLOAD_WORKER_ACTION.pageData,
                            page: page++,
                        });
                    }
                    break;
                case DOWNLOAD_WORKER_ACTION.clearDatabase:
                    setIsDownloading(false);
                    worker.terminate();
                    console.error(msg.error);
                    break;
                case DOWNLOAD_WORKER_ACTION.error:
                    console.error(msg.error);
                    break;
                default:
                    break;
            }
        };
        worker.postMessage({
            code: DOWNLOAD_WORKER_ACTION.progress,
        });
    };

    const hasFilePath = () => {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get("filePath");
    };

    const getThemeIcon = () => {
        if (THEME_STATES.LIGHT === theme) {
            return (
                <Moon className="cursor-pointer" title="Set Light Mode"
                    onClick={() => switchTheme(THEME_STATES.DARK)}/>
            );
        } else if (THEME_STATES.DARK === theme) {
            return (
                <Sun className="cursor-pointer" title="Set Dark Mode"
                    onClick={() => switchTheme(THEME_STATES.LIGHT)}/>
            );
        }
    };

    useEffect(() => {
        return () => {
            changeStateCallback(STATE_CHANGE_TYPE.stopDownload, null);
            if (downloadWorker.current) {
                downloadWorker.current.terminate();
            }
        };
    }, []);

    window.onbeforeunload = function (e) {
        changeStateCallback(STATE_CHANGE_TYPE.stopDownload, null);
        if (downloadWorker.current !== null) {
            downloadWorker.current.postMessage({
                code: DOWNLOAD_WORKER_ACTION.clearDatabase,
            });
        }
    };

    return (
        <>
            <div className={"left-panel-tabs-container"}>
                <div style={{
                    display: "flex",
                    flexFlow: "column",
                    height: "100%",
                }}>
                    <div style={{flexGrow: 1}}>
                        <button
                            className={"left-panel-tab"}
                            onClick={openFile}>
                            <Folder size={25}/>
                        </button>
                        <button
                            className={`left-panel-tab 
                            ${(LEFT_PANEL_TAB_IDS.SEARCH === activeTabId ?
            "left-panel-tab-selected" :
            "")}`}
                            onClick={toggleSearchPanel}>
                            <Search size={25} style={{transform: "scaleX(-1)"}}/>
                        </button>
                        <button className={"left-panel-tab"} onClick={handleShowDownload}>
                            <CloudArrowDown size={28}/>
                        </button>
                    </div>
                    <div>
                        <button
                            className={"left-panel-tab"}
                            onClick={openModal}>
                            <Gear size={25}/>
                        </button>
                    </div>
                </div>
            </div>
            <input type='file' id='file' onChange={loadFile} ref={inputFile}
                style={{display: "none"}}/>
            <Modal show={showDownload} className="border-0" onHide={handleShowDownload}
                contentClassName={getModalClass()}>
                <Modal.Header className="modal-background border-0" >
                    <div className="float-left">
                        Download
                    </div>
                </Modal.Header>
                <Modal.Body className="modal-background pt-1">
                    <div style={{fontSize: "14px"}}>
                        {hasFilePath() &&
                            <Row className="m-0 mb-4 d-flex flex-column align-items-center text-center">
                                <label style={{fontSize: "17px"}}>Compressed Log ({logFileState.compressedHumanSize})</label>
                                <button className="btn btn-secondary download-button m-2"
                                    style={{fontSize: "13px", width: "200px"}} onClick={downloadCompressedFile}>
                                    <Download className="me-3 icon-button"/>
                                    Download File
                                </button>
                            </Row>
                        }

                        <Row className="m-0 d-flex flex-column align-items-center text-center">
                            <label style={{fontSize: "17px"}}>Uncompressed Log ({logFileState.decompressedHumanSize})</label>
                            {!isDownloading &&
                                <button className="btn btn-secondary download-button m-2"
                                    style={{fontSize: "13px", width: "200px"}} onClick={downloadUncompressedFile}>
                                    <Download className="me-3 icon-button"/>
                                    Start Download
                                </button>
                            }
                            {isDownloading &&
                                <button className="btn btn-outline-warning download-button m-2"
                                    style={{fontSize: "15px", width: "200px"}} onClick={stopUncompressedDownload}>
                                    <XCircle className="me-3 icon-button"/>
                                    Cancel Download
                                </button>
                            }
                        </Row>

                        <Row className="px-3 m-0 mt-3">
                            {isDownloading &&
                                <Row className="m-0 p-0">
                                    <div className="p-0 m-0 mb-2" style={{fontSize: "13px"}}>
                                        <div className="p-0" style={{float: "left"}}>
                                            {downloadingMessage}
                                        </div>
                                        <div className="p-0" style={{float: "right"}}>
                                            {progress.toFixed(2)} %
                                        </div>
                                    </div>
                                    <ProgressBar animated now={progress} style={{height: "10px"}}
                                        className="p-0 border-0 rounded-0"/>
                                </Row>
                            }
                        </Row>
                    </div>
                </Modal.Body>
                <Modal.Footer className="modal-background border-0" >
                    <Button className="btn-sm" variant="secondary" onClick={handleCloseDownload}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>

            <Modal show={showSettings} className="border-0" onHide={handleCloseSettings}
                contentClassName={getModalClass()}>
                <Modal.Header className="modal-background border-0" >
                    <div className="float-left">
                        App Settings
                    </div>
                    <div className="float-right">
                        {getThemeIcon()}
                    </div>
                </Modal.Header>
                <Modal.Body className="modal-background p-3 pt-1" >
                    <label className="mb-2">Log Events per Page</label>
                    <Form onSubmit={saveModalChanges}>
                        <Form.Control type="number"
                            value={eventsPerPage}
                            onChange={(e) => setEventsPerPage(Number(e.target.value))}
                            className="input-sm num-event-input" />
                    </Form>
                </Modal.Body>
                <Modal.Footer className="modal-background border-0" >
                    <Button className="btn-sm" variant="success" onClick={saveModalChanges}>
                        Save Changes
                    </Button>
                    <Button className="btn-sm" variant="secondary" onClick={closeModal}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
}

export const LEFT_PANEL_TAB_IDS = {
    SEARCH: 0,
};