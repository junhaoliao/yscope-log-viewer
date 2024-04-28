import React, {
    useContext,
    useState,
} from "react";
import {Row} from "react-bootstrap";
import {FileEarmarkText} from "react-bootstrap-icons";

import {ThemeContext} from "../ThemeContext/ThemeContext";

import "./DropFile.scss";


interface DropFileProps {
    children: React.ReactNode,
    onFileDrop: (file: File) => void
}

/**
 * A container element to add drag & drop functionality to the child elements.
 *
 * @param props
 * @param props.children
 * @param props.onFileDrop
 */
const DropFile : React.FC<DropFileProps> = ({children, onFileDrop}) => {
    const {appTheme} = useContext(ThemeContext);
    const [dragging, setDragging] = useState(false);

    /**
     * Handler for a drag event
     *
     * @param ev
     */
    const handleDrag = (ev:React.DragEvent) => {
        ev.preventDefault();
        ev.stopPropagation();
        if ("dragenter" === ev.type || "dragover" === ev.type) {
            setDragging(true);
        } else if ("dragleave" === ev.type) {
            setDragging(false);
        }
    };

    /**
     * Handler for a drop event. onFileDrop callback is used
     * to load the dropped file into the viewer.
     *
     * @param ev
     */
    const handleDrop = function (ev:React.DragEvent) {
        ev.preventDefault();
        ev.stopPropagation();
        setDragging(false);

        const [file] = ev.dataTransfer.files;
        if ("undefined" !== typeof file) {
            onFileDrop(file);
        }
    };

    /**
     * Callback once file is selected from file input dialog
     *
     * @param ev
     */
    const loadFile = (ev: React.ChangeEvent<HTMLInputElement>) => {
        if (null !== ev.target.files) {
            const [file] = ev.target.files;
            if ("undefined" !== typeof file) {
                onFileDrop(file);
            }
        }
    };

    /**
     * Triggers the file input dialog when selectFileEl is clicked
     */
    const openFile = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.onchange = loadFile as unknown as (ev:Event)=>void;
        input.click();
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
            {(false !== children) ?
                children :
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
                </div>}
        </div>
    );
};

export default DropFile;
