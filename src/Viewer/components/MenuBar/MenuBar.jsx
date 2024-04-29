import PropTypes from "prop-types";
import React, {
    useContext, useState,
} from "react";
import {
    Button, Modal, ProgressBar, Table,
} from "react-bootstrap";
import {
    CalendarEvent,
    ChevronDoubleLeft,
    ChevronDoubleRight,
    ChevronLeft,
    ChevronRight,
    FileText,
    Keyboard,
} from "react-bootstrap-icons";

import {
    APP_THEME, ThemeContext,
} from "../../../ThemeContext/ThemeContext";
import MODIFY_PAGE_ACTION from "../../services/MODIFY_PAGE_ACTION";
import STATE_CHANGE_TYPE from "../../services/STATE_CHANGE_TYPE";
import CalendarModal from "../modals/CalendarModal/CalendarModal";
import {EditableInput} from "./EditableInput/EditableInput";

import "./MenuBar.scss";


/**
 * Menu bar used to navigate the log file.
 *
 * @param logFileState.logFileState
 * @param {object} logFileState Current state of the log file
 * @param {object} fileInfo Object containing file name & path
 * @param {boolean} isLoading whether logs / actions are being loaded
 * @param {ChangeStateCallback} onStateChange
 * @param logFileState.fileInfo
 * @param logFileState.isLoading
 * @param logFileState.onStateChange
 * @return {JSX.Element}
 */
const MenuBar = ({
    logFileState, fileInfo, isLoading, onStateChange,
}) => {
    const {appTheme} = useContext(ThemeContext);


    const [showCalendar, setShowCalendar] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    const handleCloseCalendar = () => setShowCalendar(false);
    const handleShowCalendar = () => setShowCalendar(true);

    const handleCloseHelp = () => setShowHelp(false);
    const handleShowHelp = () => setShowHelp(true);

    const goToFirstPage = () => {
        onStateChange(STATE_CHANGE_TYPE.PAGE_NUM, {requestedPage: MODIFY_PAGE_ACTION.firstPage});
    };

    const goToPrevPage = () => {
        onStateChange(STATE_CHANGE_TYPE.PAGE_NUM, {requestedPage: MODIFY_PAGE_ACTION.prevPage});
    };

    const goToNextPage = () => {
        onStateChange(STATE_CHANGE_TYPE.PAGE_NUM, {requestedPage: MODIFY_PAGE_ACTION.nextPage});
    };

    const goToLastPage = () => {
        onStateChange(STATE_CHANGE_TYPE.PAGE_NUM, {requestedPage: MODIFY_PAGE_ACTION.lastPage});
    };

    const goToPage = (pageNum) => {
        onStateChange(STATE_CHANGE_TYPE.PAGE_NUM, {
            requestedPage: pageNum,
        });
    };


    // Modal Functions
    const getModalClass = () => {
        return (APP_THEME.LIGHT === appTheme) ?
            "modal-light" :
            "modal-dark";
    };

    const getPageNav = () => {
        return (
            <>
                <div
                    className={"menu-item menu-item-btn"}
                    onClick={goToFirstPage}
                >
                    <ChevronDoubleLeft title={"First Page"}/>
                </div>
                <div
                    className={"menu-item menu-item-btn"}
                    onClick={goToPrevPage}
                >
                    <ChevronLeft title={"Previous Page"}/>
                </div>
                <div className={"menu-item"}>
                    <EditableInput
                        maxValue={logFileState.numPages}
                        minValue={1}
                        value={logFileState.pageNum}
                        onChangeCallback={goToPage}/>
                    <span className={"mx-1"}> of</span>
                    <span className={"mx-1"}>
                        {" "}
                        {logFileState.numPages}
                    </span>
                </div>
                <div
                    className={"menu-item menu-item-btn"}
                    onClick={goToNextPage}
                >
                    <ChevronRight title={"Next Page"}/>
                </div>
                <div
                    className={"menu-item menu-item-btn"}
                    onClick={goToLastPage}
                >
                    <ChevronDoubleRight title={"Last Page"}/>
                </div>
            </>
        );
    };

    const loadingBarHeight = "3px";
    const getLoadingBar = () => {
        return (isLoading) ?
            <ProgressBar
                animated={true}
                now={100}
                style={{height: loadingBarHeight}}/> :
            <div
                className={"w-100"}
                style={{height: loadingBarHeight}}/>;
    };

    const fileName = fileInfo.name.split("?")[0];

    // TODO make file icon a button to open modal with file info
    // TODO Move modals into their own component
    return (
        <>
            <div
                className={"viewer-header"}
                data-theme={appTheme}
            >
                <div
                    className={"w-100"}
                    style={{height: loadingBarHeight}}/>
                <div className={"viewer-header-menu-container"}>
                    <div className={"menu-left"}>
                        <div
                            className={"menu-item"}
                            title={fileName}
                        >
                            <FileText className={"mx-2"}/>
                            <span className={"d-none d-lg-block"}>
                                {fileName}
                            </span>
                        </div>
                    </div>
                    <div className={"menu-right"}>
                        {getPageNav()}
                        <div className={"menu-divider"}/>

                        <div
                            className={"menu-item menu-item-btn"}
                            onClick={handleShowCalendar}
                        >
                            <CalendarEvent title={"Calendar"}/>
                        </div>
                        <div className={"menu-divider"}/>

                        <div
                            className={"menu-item menu-item-btn"}
                            title={"Show Help"}
                            onClick={handleShowHelp}
                        >
                            <Keyboard/>
                        </div>
                    </div>
                </div>
                {getLoadingBar()}
            </div>

            <CalendarModal
                isOpen={showCalendar}
                onClose={handleCloseCalendar}
                onStateChange={onStateChange}/>

            <Modal
                className={"help-modal border-0"}
                contentClassName={getModalClass()}
                data-theme={appTheme}
                show={showHelp}
                onHide={handleCloseHelp}
            >
                <Modal.Header className={"modal-background"}>
                    <div className={"float-left"}>
                        Keyboard Shortcuts
                    </div>
                </Modal.Header>
                <Modal.Body className={"modal-background p-3 pt-2"}>
                    <Table
                        borderless={true}
                        style={{fontSize: "15px"}}
                    >
                        <thead>
                            <tr>
                                <th>Action</th>
                                <th>Windows</th>
                                <th>macOS</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Focus on Editor</td>
                                <td>
                                    <kbd>`</kbd>
                                </td>
                                <td>
                                    <kbd>`</kbd>
                                </td>
                            </tr>
                            <tr>
                                <td>Next Page</td>
                                <td>
                                    <kbd>CTRL</kbd>
                                    +
                                    <kbd>]</kbd>
                                </td>
                                <td>
                                    <kbd>⌘</kbd>
                                    +
                                    <kbd>]</kbd>
                                </td>
                            </tr>
                            <tr>
                                <td>Prev Page</td>
                                <td>
                                    <kbd>CTRL</kbd>
                                    +
                                    <kbd>[</kbd>
                                </td>
                                <td>
                                    <kbd>⌘</kbd>
                                    +
                                    <kbd>[</kbd>
                                </td>
                            </tr>
                            <tr>
                                <td>First Page</td>
                                <td>
                                    <kbd>CTRL</kbd>
                                    +
                                    <kbd>,</kbd>
                                </td>
                                <td>
                                    <kbd>⌘</kbd>
                                    +
                                    <kbd>,</kbd>
                                </td>
                            </tr>
                            <tr>
                                <td>Last Page</td>
                                <td>
                                    <kbd>CTRL</kbd>
                                    +
                                    <kbd>.</kbd>
                                </td>
                                <td>
                                    <kbd>⌘</kbd>
                                    +
                                    <kbd>.</kbd>
                                </td>
                            </tr>
                            <tr>
                                <td>Top of Page</td>
                                <td>
                                    <kbd>CTRL</kbd>
                                    +
                                    <kbd>U</kbd>
                                </td>
                                <td>
                                    <kbd>⌘</kbd>
                                    +
                                    <kbd>U</kbd>
                                </td>
                            </tr>
                            <tr>
                                <td>End of Page</td>
                                <td>
                                    <kbd>CTRL</kbd>
                                    +
                                    <kbd>I</kbd>
                                </td>
                                <td>
                                    <kbd>⌘</kbd>
                                    +
                                    <kbd>I</kbd>
                                </td>
                            </tr>
                        </tbody>
                    </Table>
                </Modal.Body>
                <Modal.Footer className={"modal-background"}>
                    <Button
                        className={"btn-sm"}
                        variant={"secondary"}
                        onClick={handleCloseHelp}
                    >
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

MenuBar.propTypes = {
    logFileState: PropTypes.object,
    fileInfo: PropTypes.object,
    isLoading: PropTypes.bool,

    onStateChange: PropTypes.func,
};

export default MenuBar;
