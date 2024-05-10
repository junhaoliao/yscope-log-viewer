import {
    useContext, useState,
} from "react";
import {ProgressBar} from "react-bootstrap";
import {
    CalendarEvent, FileText, Keyboard,
} from "react-bootstrap-icons";

import {
    APP_THEME, ThemeContext,
} from "../../../ThemeContext/ThemeContext";
import LogFileState from "../../types/LogFileState";
import CalendarModal from "../modals/CalendarModal/CalendarModal";
import HelpModal from "../modals/HelpModal";
import NavigationBar from "./NavigationBar";

import "./MenuBar.scss";


interface FileInfo {
    name: string
}

/**
 * Menu bar used to navigate the log file.
 *
 * @param props
 * @param props.logFileState Current state of the log file
 * @param props.fileInfo Object containing file name & path
 * @param props.isLoading whether logs / actions are being loaded
 * @param props.onStateChange
 */
const MenuBar = ({
    logFileState,
    fileInfo,
    isLoading,
    onStateChange,
}:{
    logFileState: LogFileState,
    fileInfo: FileInfo,
    isLoading: boolean,
    onStateChange: Function,
}) => {
    const {appTheme} = useContext(ThemeContext);

    const [showCalendar, setShowCalendar] = useState<boolean>(false);
    const [showHelp, setShowHelp] = useState<boolean>(false);

    const handleCloseCalendar = () => {
        setShowCalendar(false);
    };
    const handleShowCalendar = () => {
        setShowCalendar(true);
    };

    const handleCloseHelp = () => {
        setShowHelp(false);
    };
    const handleShowHelp = () => {
        setShowHelp(true);
    };


    // Modal Functions
    const getModalClass = () => {
        return (APP_THEME.LIGHT === appTheme) ?
            "modal-light" :
            "modal-dark";
    };

    const [fileName] = fileInfo.name.split("?");

    // TODO make file icon a button to open modal with file info
    // TODO Move modals into their own component
    return (
        <>
            <div
                className={"viewer-header"}
                data-theme={appTheme}
            >
                <div className={"w-100 loading-progress-bar"}/>
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
                        <NavigationBar
                            logFileState={logFileState}
                            onStateChange={onStateChange}/>

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
                <ProgressBar
                    animated={true}
                    className={"loading-progress-bar"}
                    now={100}
                    style={{
                        visibility: isLoading ?
                            "visible" :
                            "hidden",
                    }}/>
            </div>

            <CalendarModal
                isOpen={showCalendar}
                onClose={handleCloseCalendar}
                onStateChange={onStateChange}/>

            <HelpModal
                isOpen={showHelp}
                modalClass={getModalClass()}
                theme={appTheme}
                onClose={handleCloseHelp}/>
        </>
    );
};

export default MenuBar;
