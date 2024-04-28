import * as monaco from "monaco-editor";

import STATE_CHANGE_TYPE from "../../services/STATE_CHANGE_TYPE";


const MIN_FONT_SIZE = 1;
const MAX_FONT_SIZE = 40;
const MOBILE_ZOOM_DEBOUNCE_TIMEOUT_MILLIS = 10;
const POSITION_CHANGE_DEBOUNCE_TIMEOUT_MILLIS = 50;

/**
 * Sets up an action that is triggered when the cursor position changes in a Monaco code editor.
 *
 * @param editor
 * @param changeAppState
 */
const setupCursorPosChangeAction = (
    editor: monaco.editor.IStandaloneCodeEditor,
    changeAppState: Function
) => {
    let posChangeDebounceTimeout: null | ReturnType<typeof setTimeout> = null;
    editor.onDidChangeCursorPosition((e) => {
        // only trigger if there was an explicit change that was made by keyboard or mouse
        if (monaco.editor.CursorChangeReason.Explicit !== e.reason) {
            return;
        }

        if (null !== posChangeDebounceTimeout) {
            clearTimeout(posChangeDebounceTimeout);
        }
        posChangeDebounceTimeout = setTimeout(() => {
            changeAppState(STATE_CHANGE_TYPE.lineNumber, {
                lineNumber: e.position.lineNumber,
                columnNumber: e.position.column,
            });
            posChangeDebounceTimeout = null;
        }, POSITION_CHANGE_DEBOUNCE_TIMEOUT_MILLIS);
    });
};

/**
 * Calculates the distance between two touch points.
 *
 * @param touch1
 * @param touch2
 * @return The Euclidean distance between the touch points.
 */
const getTouchDistance = (touch1: Touch, touch2: Touch): number => Math.sqrt(
    ((touch2.pageX - touch1.pageX) ** 2) + ((touch2.pageY - touch1.pageY) ** 2)
);

/**
 * Sets up mobile zoom functionality for the given editor and editor container.
 *
 * @param editor
 * @param editorContainer
 */
const setupMobileZoom = (
    editor: monaco.editor.IStandaloneCodeEditor,
    editorContainer: HTMLElement
) => {
    const editorDomNode = editor.getDomNode();
    if (null === editorDomNode) {
        return;
    }

    let initialDistance: null|number = null;
    let lastFontSize = parseInt(window.getComputedStyle(editorDomNode).fontSize, 10);
    let debounceTimeout: null|ReturnType<typeof setTimeout> = null;

    editorContainer.addEventListener("touchstart", (e) => {
        const [touch0, touch1] = e.touches;
        if (
            2 !== e.touches.length ||
            "undefined" === typeof touch0 ||
            "undefined" === typeof touch1
        ) {
            return;
        }

        e.preventDefault();
        initialDistance = getTouchDistance(touch0, touch1);
    }, {passive: false});

    editorContainer.addEventListener("touchmove", (e) => {
        const [touch0, touch1] = e.touches;
        if (
            2 !== e.touches.length ||
            "undefined" === typeof touch0 ||
            "undefined" === typeof touch1
        ) {
            return;
        }
        e.preventDefault();

        if (debounceTimeout) {
            clearTimeout(debounceTimeout);
        }
        debounceTimeout = setTimeout(() => {
            if (null === initialDistance) {
                console.error("initialDistance is cleared during touchstart and touchend");

                return;
            }
            const newDistance = getTouchDistance(touch0, touch1);
            const ratio = newDistance / initialDistance;
            const newFontSize = Math.max(
                MIN_FONT_SIZE,
                Math.min(MAX_FONT_SIZE, lastFontSize * ratio)
            );

            editor.updateOptions({fontSize: newFontSize});
            lastFontSize = newFontSize;

            debounceTimeout = null;
        }, MOBILE_ZOOM_DEBOUNCE_TIMEOUT_MILLIS);
    }, {passive: false});

    editorContainer.addEventListener("touchend", () => {
        initialDistance = null;
        if (null !== debounceTimeout) {
            clearTimeout(debounceTimeout);
            debounceTimeout = null;
        }
    });
};

export {
    setupCursorPosChangeAction,
    setupMobileZoom,
};
