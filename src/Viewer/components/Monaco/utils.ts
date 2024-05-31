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
 * @param lineNum
 * @param columnNum
 */
const goToLineAndCenter = (
    editor: monaco.editor.IStandaloneCodeEditor,
    lineNum:number,
    columnNum:number
) => {
    editor.revealLineInCenter(lineNum);
    editor.setPosition({
        column: columnNum, lineNumber: lineNum,
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
            automaticLayout: false,
            language: LOG_LANGUAGE_NAME,
            maxTokenizationLineLength: 30_000,
            mouseWheelZoom: true,
            readOnly: true,
            renderWhitespace: "none",
            scrollBeyondLastLine: false,
            wordWrap: "on",
        }
    );

    let resizeTimeout: NodeJS.Timeout;
    const resizeObserver = new ResizeObserver((entries) => {
        if (null !== resizeTimeout) {
            console.log("canceled");
            clearTimeout(resizeTimeout);
        }
        resizeTimeout = setTimeout(() => {
            editor.layout();
        }, 250);
    });

    resizeObserver.observe(editorContainer);

    setupShortcutActions(editor, changeAppState);
    setupCursorPosChangeAction(editor, changeAppState);
    setupMobileZoom(editor, editorContainer);

    return editor;
};

export {
    goToLineAndCenter,
    initMonacoEditor,
};
