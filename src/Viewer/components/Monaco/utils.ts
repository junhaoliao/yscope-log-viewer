import * as monaco from "monaco-editor";

import {
    setupCursorPosChangeAction,
    setupMobileZoom,
} from "./actions";
import {
    LOG_LANGUAGE_NAME,
    setupCustomLogLanguage,
} from "./language";
import {setupShortcutActions} from "./shortcuts";
import {setupThemes} from "./themes";


/**
 * Centers the line in the editor and change the cursor position.
 *
 * @param editor
 * @param lineNumber
 * @param columnNumber
 */
const goToLineAndCenter = (
    editor: monaco.editor.IStandaloneCodeEditor,
    lineNumber:number,
    columnNumber:number
) => {
    editor.revealLineInCenter(lineNumber);
    editor.setPosition({
        column: columnNumber, lineNumber: lineNumber,
    });
    editor.focus();
};

/**
 * Initializes a Monaco Editor instance.
 *
 * @param editorContainer
 * @param changeAppState
 * @return The initialized editor instance.
 */
const initMonacoEditor = (
    editorContainer: HTMLDivElement,
    changeAppState: Function
): monaco.editor.IStandaloneCodeEditor => {
    setupThemes();
    setupCustomLogLanguage();

    const editor = monaco.editor.create(
        editorContainer,
        {
            // FIXME: add custom observer debounce automatic layout
            automaticLayout: true,
            language: LOG_LANGUAGE_NAME,
            mouseWheelZoom: true,
            readOnly: true,
            renderWhitespace: "none",
            scrollBeyondLastLine: false,
            wordWrap: "on",
        }
    );

    setupShortcutActions(editor, changeAppState);
    setupCursorPosChangeAction(editor, changeAppState);
    setupMobileZoom(editor, editorContainer);

    return editor;
};

export {
    goToLineAndCenter,
    initMonacoEditor,
};
