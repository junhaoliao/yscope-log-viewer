import React from "react";
import {
    ChevronDoubleLeft, ChevronDoubleRight, ChevronLeft, ChevronRight,
} from "react-bootstrap-icons";

import MODIFY_PAGE_ACTION from "../../services/MODIFY_PAGE_ACTION";
import STATE_CHANGE_TYPE from "../../services/STATE_CHANGE_TYPE";
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
    const goToPage = (newPageNum: number) => {
        onStateChange(STATE_CHANGE_TYPE.PAGE_NUM, {requestedPage: newPageNum});
    };

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
                <span className={"mx-1"}>
                    {` of ${logFileState.numPages}`}
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

export default NavigationBar;
