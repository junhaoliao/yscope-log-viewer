import {
    useContext, useState,
} from "react";
import {ProgressBar} from "react-bootstrap";
import {
    CalendarEvent, FileText, Keyboard,
} from "react-bootstrap-icons";

import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

import Button from "@mui/joy/Button";
import ToggleButtonGroup from "@mui/joy/ToggleButtonGroup";

import {
    APP_THEME, ThemeContext,
} from "../../../ThemeContext/ThemeContext";
import STATE_CHANGE_TYPE from "../../services/STATE_CHANGE_TYPE";
import LogFileState from "../../types/LogFileState";
import CalendarModal from "../modals/CalendarModal/CalendarModal";
import HelpModal from "../modals/HelpModal";
import NavigationBar from "./NavigationBar";

import "./MenuBar.scss";


dayjs.extend(timezone);
dayjs.extend(utc);

interface FileInfo {
    name: string
}

/**
 *
 * @param root0
 * @param root0.value
 * @param root0.label
 */
const ToggleButton = ({value, label}) => (
    <Button
        sx={{minHeight: "100%"}}
        value={value}
    >
        {label}
    </Button>
);

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
    const [curTimezone, setCurTimezone] = useState<string | null>(null);

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
    const handleTimezoneChange = (event, newTimezone) => {
        console.log(newTimezone);
        if (null === newTimezone) return;

        setCurTimezone(newTimezone);
        console.log("Timezone changed to", newTimezone);
        onStateChange(STATE_CHANGE_TYPE.TIMEZONE, {
            timezone: newTimezone,
        });
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


                        <ToggleButtonGroup
                            aria-label={"Platform"}
                            color={"neutral"}
                            sx={{borderRadius: "0px"}}

                            value={curTimezone}
                            variant={"outlined"}
                            onChange={handleTimezoneChange}
                        >
                            <ToggleButton
                                label={"Local"}
                                value={"local"}/>
                            <ToggleButton
                                label={"UTC"}
                                value={"UTC"}/>
                        </ToggleButtonGroup>

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
