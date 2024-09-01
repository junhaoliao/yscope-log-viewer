import React, {
    useContext,
    useState,
} from "react";

import {StateContext} from "../../contexts/StateContextProvider";
import {CURSOR_CODE} from "../../typings/worker";

import "./index.css";


interface DropFileContextProviderProps {
    children: React.ReactNode;
}

/**
 * A container element to add drag & drop functionality to the child elements.
 *
 * @param props
 * @param props.children
 * @return
 */
const DropFileContainer = ({children}: DropFileContextProviderProps) => {
    const {loadFile} = useContext(StateContext);
    const [isFileHovering, setIsFileHovering] = useState(false);

    const handleDrag = (ev: React.DragEvent<HTMLDivElement>) => {
        ev.preventDefault();
        ev.stopPropagation();

        if ("dragenter" === ev.type) {
            setIsFileHovering(true);
        } else if ("dragleave" === ev.type) {
            // "dragleave" could get fired when the wrapped `children` receives focus.
            // Setting `pointer-events: none` on the children is viable but could cause the
            // children to be non-responsive. Instead, check if the pointer is still within the
            // range of the DropFileContainer; if so, deem the file is still hovering.
            const {bottom, left, right, top} = ev.currentTarget.getBoundingClientRect();
            if (ev.clientX >= left && ev.clientX <= right &&
                ev.clientY >= top && ev.clientY <= bottom) {
                return;
            }

            setIsFileHovering(false);
        }
    };

    const handleDrop = (ev: React.DragEvent<HTMLDivElement>) => {
        ev.preventDefault();
        ev.stopPropagation();

        setIsFileHovering(false);

        const [file] = ev.dataTransfer.files;
        if ("undefined" === typeof file) {
            console.warn("No file dropped.");

            return;
        }
        loadFile(file, {code: CURSOR_CODE.LAST_EVENT, args: null});
    };

    return (
        <div
            className={"drop-file-container"}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
        >
            <div
                className={"drop-file-children"}
                onDrop={handleDrop}
            >
                {children}
                {isFileHovering && (
                    <div
                        className={"hover-mask"}
                        onDrop={handleDrop}
                    >
                        <div
                            className={"hover-message"}
                            onDrop={handleDrop}
                        >
                            Drop file to view
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DropFileContainer;