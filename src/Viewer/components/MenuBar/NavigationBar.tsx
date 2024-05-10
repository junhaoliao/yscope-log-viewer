import {
    ArrowBarLeft,
    ArrowBarRight,
    ChevronDoubleLeft,
    ChevronDoubleRight,
    ChevronLeft,
    ChevronRight,
} from "react-bootstrap-icons";

import MODIFY_PAGE_ACTION from "../../services/MODIFY_PAGE_ACTION";
import STATE_CHANGE_TYPE, {CHANGE_FILE_DIREECTION} from "../../services/STATE_CHANGE_TYPE";
import LogFileState from "../../types/LogFileState";
import {EditableInput} from "./EditableInput/EditableInput";


/**
 * Renders a navigation bar to jumping between pages &/ files.
 *
 * @param props
 * @param props.logFileState
 * @param props.onStateChange
 */
const NavigationBar = ({
    logFileState,
    onStateChange,
}: {
    logFileState: LogFileState,
    onStateChange: Function
}) => {
    const goToPrevFile = () => {
        onStateChange(STATE_CHANGE_TYPE.CHANGE_FILE, {direction: CHANGE_FILE_DIREECTION.PREV});
    };
    const goToNextFile = () => {
        onStateChange(STATE_CHANGE_TYPE.CHANGE_FILE, {direction: CHANGE_FILE_DIREECTION.NEXT});
    };

    const goToFirstPage = () => {
        onStateChange(STATE_CHANGE_TYPE.PAGE_NUM, {requestedPage: MODIFY_PAGE_ACTION.firstPage});
    };
    const goToLastPage = () => {
        onStateChange(STATE_CHANGE_TYPE.PAGE_NUM, {requestedPage: MODIFY_PAGE_ACTION.lastPage});
    };
    const goToPrevPage = () => {
        onStateChange(STATE_CHANGE_TYPE.PAGE_NUM, {requestedPage: MODIFY_PAGE_ACTION.prevPage});
    };
    const goToNextPage = () => {
        onStateChange(STATE_CHANGE_TYPE.PAGE_NUM, {requestedPage: MODIFY_PAGE_ACTION.nextPage});
    };
    const goToPage = (newPageNum: number) => {
        onStateChange(STATE_CHANGE_TYPE.PAGE_NUM, {requestedPage: newPageNum});
    };

    return (
        <>
            <button
                className={"menu-item menu-item-btn"}
                disabled={null === logFileState.prevFilePath}
                onClick={goToPrevFile}
            >
                <ArrowBarLeft title={"Previous File"}/>
            </button>
            <button
                className={"menu-item menu-item-btn"}
                onClick={goToFirstPage}
            >
                <ChevronDoubleLeft title={"First Page"}/>
            </button>
            <button
                className={"menu-item menu-item-btn"}
                onClick={goToPrevPage}
            >
                <ChevronLeft title={"Previous Page"}/>
            </button>
            <div className={"menu-item"}>
                <EditableInput
                    maxValue={logFileState.numPages}
                    minValue={1}
                    value={logFileState.pageNum}
                    onChangeCallback={goToPage}/>
                <span className={"mx-1"}>
                    {` of ${logFileState.numPages}`}
                </span>
            </div>
            <button
                className={"menu-item menu-item-btn"}
                onClick={goToNextPage}
            >
                <ChevronRight title={"Next Page"}/>
            </button>
            <button
                className={"menu-item menu-item-btn"}
                onClick={goToLastPage}
            >
                <ChevronDoubleRight title={"Last Page"}/>
            </button>
            <button
                className={"menu-item menu-item-btn"}
                disabled={null === logFileState.nextFilePath}
                onClick={goToNextFile}
            >
                <ArrowBarRight title={"Next File"}/>
            </button>
        </>
    );
};

export default NavigationBar;
