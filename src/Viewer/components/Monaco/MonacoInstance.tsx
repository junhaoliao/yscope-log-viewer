import React, {
    useContext,
    useEffect,
    useRef,
} from "react";

import * as monaco from "monaco-editor/esm/vs/editor/editor.api.js";

import {ThemeContext} from "../../../ThemeContext/ThemeContext";
import {APP_THEME_TO_MONACO_THEME_MAP} from "./themes";
import {
    goToLineAndCenter,
    initMonacoEditor,
} from "./utils";

import "./MonacoInstance.scss";


interface LogFileState {
    columnNumber: number,
    currPage: number,
    currEvent: number,
    lineNumber: number,
    maxNumEventPerPage: number,
    numPages: number,
    numEvents: number,

    enablePrettify: boolean,
    verbosity: null,

    compressedSize: number,
    decompressedSize: number,
}


/**
 * Contains the monaco editor used to display the log data. When user
 * interacts with editor, the callback is used to update the selected
 * log event.
 *
 * @param props
 * @param props.logFileState
 * @param props.logData
 * @param props.onStateChange
 * @param props.beforeMount
 * @param props.onMount
 */
const MonacoInstance = ({
    logFileState,
    logData,
    onStateChange,
    beforeMount,
    onMount,
}: {
    logFileState: LogFileState;
    logData: string | null;
    onStateChange: (type: string, args: object) => void;
    beforeMount: ()=>void;
    onMount: ()=>void;
}): React.ReactElement => {
    const {theme} = useContext(ThemeContext);
    const editorRef = useRef<null|monaco.editor.IStandaloneCodeEditor>(null);
    const editorContainerRef = useRef<HTMLDivElement>(null);

    // Shortcut for focusing on the monaco editor and to enable
    // keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
        if ("`" === e.key) {
            e.stopPropagation();
            e.preventDefault();
            editorRef.current?.focus();
        }
    };

    useEffect(
        () => {
            beforeMount();
            editorRef.current = initMonacoEditor(
                editorContainerRef.current as HTMLDivElement,
                onStateChange
            );
            onMount();
            window.addEventListener("keypress", handleKeyDown);

            return () => {
                editorRef.current?.dispose();
                editorRef.current = null;
                window.removeEventListener("keypress", handleKeyDown);
            };
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

    useEffect(() => {
        monaco.editor.setTheme(APP_THEME_TO_MONACO_THEME_MAP[theme]);
    }, [theme]);

    useEffect(
        () => {
            if (null !== editorRef.current && null !== logData) {
                editorRef.current.setValue(logData);
                goToLineAndCenter(
                    editorRef.current,
                    logFileState.lineNumber,
                    logFileState.columnNumber
                );
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [logData]
    );

    useEffect(() => {
        if (null === editorRef.current) {
            return;
        }
        const currPos = editorRef.current.getPosition();
        if (null === currPos) {
            console.error("Unexpected null by editor.getPosition()");

            return;
        }

        const newLine = logFileState.lineNumber;
        const newColumn = logFileState.columnNumber;
        if (newLine !== currPos.lineNumber || newColumn !== currPos.column) {
            // Only if the lineNumber / columnNumber change is not caused by
            // user moving the cursor
            goToLineAndCenter(editorRef.current, newLine, newColumn);
        }
    }, [
        logFileState.lineNumber,
        logFileState.columnNumber,
    ]);

    return (
        <div
            className={"monaco-container"}
            ref={editorContainerRef}/>
    );
};

export default MonacoInstance;
