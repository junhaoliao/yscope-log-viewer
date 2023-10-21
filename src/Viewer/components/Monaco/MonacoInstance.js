import React, {useContext, useEffect, useRef, useState} from "react";

import Editor, {loader} from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import PropTypes from "prop-types";

import {THEME_STATES} from "../../../ThemeContext/THEME_STATES";
import {ThemeContext} from "../../../ThemeContext/ThemeContext";
import STATE_CHANGE_TYPE from "../../services/STATE_CHANGE_TYPE";
import {SHORTCUTS} from "./Shortcuts";

import "monaco-editor/min/vs/editor/editor.main.css";
import "./MonacoInstance.scss";

// Themes for monaco editor
const themes = {
    dark: {
        base: "vs-dark", inherit: true, rules: [
            {token: "custom-info", foreground: "#098658"},
            {token: "custom-warn", foreground: "#ce9178"},
            {token: "custom-error", foreground: "#ce9178", fontStyle: "bold"},
            {token: "custom-fatal", foreground: "#ce9178", fontStyle: "bold"},
            {token: "custom-date", foreground: "#529955"},
            {token: "custom-number", foreground: "#3f9ccb"},
            {token: "custom-exception", foreground: "#ce723b", fontStyle: "italic"},
            {token: "comment", foreground: "#008000"}], colors: {
            "editor.lineHighlightBackground": "#3c3c3c",
        },
    }, light: {
        base: "vs",
        inherit: true,
        rules: [
            {token: "custom-info", foreground: "#098658"},
            {token: "custom-warn", foreground: "#b81560"},
            {token: "custom-error", foreground: "#ac1515", fontStyle: "bold"},
            {token: "custom-fatal", foreground: "#ac1515", fontStyle: "bold"},
            {token: "custom-date", foreground: "#008000"},
            {token: "custom-number", foreground: "#3f9ccb"},
            {token: "custom-exception", foreground: "#ce723b", fontStyle: "italic"}],
        colors: {},
    },
};

MonacoInstance.propTypes = {
    logFileState: PropTypes.object,
    loadingLogs: PropTypes.bool,
    logData: PropTypes.string,
    changeStateCallback: PropTypes.func,
};

/**
 * Callback used to change the parent component's state
 * @callback ChangeStateCallback
 * @param {string} type The type of state change ({@link STATE_CHANGE_TYPE})
 * @param {object} args Arguments used to update the state
 */

/**
 * Contains the monaco editor used to display the log data. When user
 * interacts with editor, the callback is used to update the selected
 * log event.
 *
 * @param {object} logFileState Current state of the log file
 * @param {boolean} loadingLogs Indicates if loading is in progress
 * @param {ChangeStateCallback} changeStateCallback
 * @param {string} logData Decoded log data to display
 * @return {JSX.Element}
 * @constructor
 */
function MonacoInstance ({
    logFileState, changeStateCallback, loadingLogs, logData,
}) {
    const {theme} = useContext(ThemeContext);
    const editorRef = useRef(null);
    const monacoRef = useRef(null);
    const timeoutRef = useRef(null);
    const [monacoTheme, setMonacoTheme] = useState("customLogLanguageLight");

    const [language, setLanguage] = useState("");

    loader.config({monaco});

    /**
   * Called before the monaco editor is mounted.
   *
   * @param {object} monaco
   */
    function handleEditorWillMount (monaco) {
        monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);
        monaco.editor.defineTheme("customLogLanguageDark", themes.dark);
        monaco.editor.defineTheme("customLogLanguageLight", themes.light);

        monaco.languages.register({
            id: "logLanguage",
        });

        monaco.languages.setMonarchTokensProvider("logLanguage", {
            tokenizer: {
                root: [
                    ["INFO", "custom-info"],
                    ["ERROR", "custom-error"],
                    ["WARN", "custom-warn"],
                    ["FATAL", "custom-fatal"],
                    [/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3})Z/, "custom-date"],
                    [/^[\t ]*at.*$/, "custom-exception"],
                    [
                        /(\d+(?:\.\d+)?([eE])([+\-])[0-9](\.[0-9])?|\d+(?:\.\d+)?)/,
                        "custom-number"]],
            },
        });
        setLanguage("logLanguage");
    }

    const _registerMobileZoomHandler = (editor) => {
        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
            console.log(
                "This is an iOS device. CSS style zoom will not work as "+
                "expected; please use Safari's zoom buttons instead");
            return;
        } else {
            console.log(
                "This is not an iOS device. We will use our own zoom handler. ");
        }
        let touchStartDelta = null;
        let scaleLevel = 1;
        editor.getDomNode().ontouchend = () => {
            // reset touches distance after current pinch ends
            touchStartDelta = null;
        };
        editor.getDomNode().addEventListener("touchstart", (ev) => {
            if (ev.touches.length === 2) {
                // calculate touches distance
                touchStartDelta = Math.hypot(
                    ev.touches[0].clientX - ev.touches[1].clientX,
                    ev.touches[0].clientY - ev.touches[1].clientY);
            }
        });

        editor.getDomNode().addEventListener("touchmove", (ev) => {
            if (touchStartDelta == null) {
                // nothing to be compared against
                return;
            } else if (ev.touches.length !== 2) {
                // not pinching with 2 fingers
                touchStartDelta = null;
                return;
            }

            // calculate current touches distance
            const touchEndDelta = Math.hypot(
                ev.touches[0].clientX - ev.touches[1].clientX,
                ev.touches[0].clientY - ev.touches[1].clientY);

            // compare current touches distance with the lsat one
            if (Math.abs(touchEndDelta - touchStartDelta) > 1) {
                // adjust zoom level
                if (touchEndDelta > touchStartDelta) {
                    scaleLevel += touchEndDelta / touchStartDelta / 10;
                } else {
                    scaleLevel -= touchStartDelta / touchEndDelta / 4;
                }

                // cap the zoom level
                scaleLevel = Math.max(0.3, scaleLevel);
                scaleLevel = Math.min(2, scaleLevel);

                // set the zoom level
                document.body.style.zoom = scaleLevel;
            }

            // update touchStartDelta to be used in next comparison
            touchStartDelta = touchEndDelta;
        }, {passive: false});
    };

    /**
   * Called when editor is finished mounting.
   *
   * @param {object} editor
   * @param {object} monaco
   */
    const handleEditorDidMount = (editor, monaco) => {
        monacoRef.current = monaco;
        editorRef.current = editor;
        editorRef.current.setValue(logData);
        editorRef.current.revealLine(logFileState.lineNumber, 1);
        editor.setPosition({column: 1, lineNumber: logFileState.lineNumber});
        editorRef.current.focus();
        editorRef.current.onDidChangeCursorPosition((e) => {
            // only trigger if there was an explicit change that
            // was made by keyboard or mouse
            // 3 is monacoRef.current.CursorChangeReason.Explicit
            if (3 === e.reason) {
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }
                timeoutRef.current = setTimeout(() => {
                    changeStateCallback(STATE_CHANGE_TYPE.lineNumber, {
                        lineNumber: e.position.lineNumber, columnNumber: e.position.column,
                    });
                }, 50);
            }
        });

        _registerMobileZoomHandler(editor);
    };

    useEffect(() => {
        if (editorRef && editorRef.current) {
            for (const shortcut of SHORTCUTS) {
                editorRef.current.addAction({
                    id: shortcut.id, label: shortcut.label, keybindings: [
                        shortcut.keybindings], run: () => {
                        if (!loadingLogs) {
                            changeStateCallback(shortcut.action, shortcut.actionArgs);
                        }
                    },
                });
            }
            editorRef.current.addAction({
                id: "topOfPage", label: "Go To Top Of Page", keybindings: [
                    monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyU], run: () => {
                    if (!loadingLogs) {
                        changeStateCallback(STATE_CHANGE_TYPE.lineNumber, {
                            lineNumber: 1, columnNumber: 1,
                        });
                    }
                },
            });
            editorRef.current.addAction({
                id: "endOfPage", label: "Go To End Of Page", keybindings: [
                    monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI], run: (editor) => {
                    if (!loadingLogs) {
                        changeStateCallback(STATE_CHANGE_TYPE.lineNumber, {
                            lineNumber: editor.getModel().getLineCount(), columnNumber: 1,
                        });
                    }
                },
            });
        }
    }, [logFileState, loadingLogs]);

    const goToLine = (lineNumber, columnNumber) => {
        editorRef.current.revealLineInCenter(lineNumber);
        editorRef.current.setPosition({
            column: columnNumber, lineNumber: lineNumber,
        });
        editorRef.current.focus();
    };

    useEffect(() => {
        if (editorRef && editorRef.current) {
            const currPos = editorRef.current.getPosition();
            const newLine = logFileState.lineNumber;
            const newColumn = logFileState.columnNumber;
            if (newLine !== currPos.lineNumber || newColumn !== currPos.column) {
                goToLine(logFileState.lineNumber, logFileState.columnNumber);
            }
        }
    }, [logFileState.lineNumber, logFileState.columnNumber]);

    useEffect(() => {
        if (null != editorRef.current && undefined !== logData) {
            editorRef.current.setValue(logData);
            goToLine(logFileState.lineNumber, logFileState.columnNumber);
        }
    }, [logData]);

    useEffect(() => {
        setMonacoTheme((theme === THEME_STATES.LIGHT)
            ? "customLogLanguageLight"
            : "customLogLanguageDark");
    }, [theme]);

    // Shortcut for focusing on the monaco editor and to enable
    // keyboard shortcuts
    const handleKeyDown = (e) => {
        if (e.key === "`") {
            e.stopPropagation();
            e.preventDefault();
            editorRef.current.focus();
        }
    };

    useEffect(() => {
        window.addEventListener("keypress", handleKeyDown);
        return () => {
            window.removeEventListener("keypress", handleKeyDown);
        };
    }, []);

    const monacoOptions = {
        "readOnly": true,
        "renderWhitespace": "none",
        "wordWrap": "on",
        "scrollBeyondLastLine": false,
        "mouseWheelZoom": true,
    };

    return (<Editor
        defaultValue="Loading content..."
        theme={monacoTheme}
        language={language}
        beforeMount={handleEditorWillMount}
        onMount={handleEditorDidMount}
        options={monacoOptions}
    />);
}

export default MonacoInstance;
