import PropTypes, {oneOfType} from "prop-types";
import React, {
    useContext, useEffect, useRef, useState,
} from "react";
import {Row} from "react-bootstrap";
import {FileEarmarkText} from "react-bootstrap-icons";
import ReactDOMServer from "react-dom/server";

import {ThemeContext} from "../ThemeContext/ThemeContext";

import "./DropFile.scss";


interface DropFileProps {
    children: false | JSX.Element | JSX.Element[],
    handleFileDrop: (file: File) => void
}

/**
 * A container element to add drag & drop functionality to the child elements.
 *
 * @param props
 * @param props.children
 * @param props.handleFileDrop
 */
const DropFile : React.FC<DropFileProps> = ({children, handleFileDrop}) => {
    const {appTheme} = useContext(ThemeContext);

    const [hasChildren, setHasChildren] = useState(false);
    const [dragging, setDragging] = useState(false);

    const selectFileEl = useRef();

    useEffect(() => {
        // Indicates if this component has any children
        // TODO Check if the child element is a Viewer component
        setHasChildren(Boolean(ReactDOMServer.renderToStaticMarkup(children)));
    }, [children]);

    /**
     * Handler for a drag event
     *
     * @param e
     */
    const handleDrag = function (e) {
        e.preventDefault();
        e.stopPropagation();
        if ("dragenter" === e.type || "dragover" === e.type) {
            setDragging(true);
        } else if ("dragleave" === e.type) {
            setDragging(false);
        }
    };

    /**
     * Handler for a drop event. handleFileDrop callback is used
     * to load the dropped file into the viewer.
     *
     * @param e
     */
    const handleDrop = function (e) {
        e.preventDefault();
        e.stopPropagation();
        setDragging(false);
        if (0 < e.dataTransfer.files.length && e.dataTransfer.files[0]) {
            handleFileDrop(e.dataTransfer.files[0]);
        }
    };

    /**
     * Triggers the file input dialog when selectFileEl is clicked
     */
    const openFile = () => {
        selectFileEl.current.click();
    };

    /**
     * Callback once file is selected from file input dialog
     *
     * @param e
     */
    const loadFile = (e) => {
        handleFileDrop(e.target.files[0]);
    };


    /**
     * Returns JSX to be rendered if there are no child components to allow
     * the user to load a file.
     *
     * @return
     */
    const getLoadFileJSX = () => {
        return (
            <div
                className={"upload-wrapper"}
                data-theme={appTheme}
            >
                <h3 className={"heading"}>Log Viewer</h3>
                <div className={"upload-container"}>
                    <FileEarmarkText
                        className={"pb-4"}
                        size={"100px"}/>
                    <Row className={"text-center d-flex flex-column"}>
                        <input
                            className={"visually-hidden"}
                            ref={selectFileEl}
                            type={"file"}
                            onChange={loadFile}/>
                        <a
                            className={"text-center"}
                            href={"#"}
                            onClick={openFile}
                        >
                            Select Log File
                        </a>
                        <span>or</span>
                        <span>Drag and Drop File</span>
                    </Row>
                </div>
            </div>
        );
    };

    return (
        <div
            className={"drag-container"}
            onDragEnter={handleDrag}
        >
            {dragging &&
                <>
                    <div className={"drag-wrapper"}>
                        <FileEarmarkText size={"50px"}/>
                        <h3 className={"ms-3"}>Drop File to View</h3>
                    </div>
                    <div
                        className={"drop-container"}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}/>
                </>}
            {hasChildren ?
                <>
                    {children}
                </> :
                <>
                    {getLoadFileJSX()}
                </>}
        </div>
    );
};

export default DropFile;
