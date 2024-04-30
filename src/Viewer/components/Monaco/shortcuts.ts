import * as monaco from "monaco-editor";

import MODIFY_PAGE_ACTION from "../../services/MODIFY_PAGE_ACTION";
import STATE_CHANGE_TYPE from "../../services/STATE_CHANGE_TYPE";


/* eslint-disable sort-keys */
const SHORTCUTS = [
    {
        id: "nextPage",
        label: "Go To Next Page",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.BracketRight],
        action: STATE_CHANGE_TYPE.PAGE_NUM,
        getActionArgs: () => ({action: MODIFY_PAGE_ACTION.nextPage}),
    },
    {
        id: "prevPage",
        label: "Go To Previous Page",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.BracketLeft],
        action: STATE_CHANGE_TYPE.PAGE_NUM,
        getActionArgs: () => ({action: MODIFY_PAGE_ACTION.prevPage}),
    },
    {
        id: "firstPage",
        label: "Go To First Page",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Comma],
        action: STATE_CHANGE_TYPE.PAGE_NUM,
        getActionArgs: () => ({action: MODIFY_PAGE_ACTION.firstPage}),
    },
    {
        id: "lastPage",
        label: "Go To Last Page",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Period],
        action: STATE_CHANGE_TYPE.PAGE_NUM,
        getActionArgs: () => ({action: MODIFY_PAGE_ACTION.lastPage}),
    },
    {
        id: "topOfPage",
        label: "Go To Top Of Page",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyU],
        action: STATE_CHANGE_TYPE.LINE_NUM,
        getActionArgs: () => ({
            lineNum: 1,
            columnNum: 1,
        }),
    },
    {
        id: "endOfPage",
        label: "Go To End Of Page",
        keybindings: [monaco.KeyMod.CtrlCmd |
            monaco.KeyCode.KeyI],
        action: STATE_CHANGE_TYPE.LINE_NUM,
        getActionArgs: (editor: monaco.editor.IStandaloneCodeEditor) => ({
            lineNum: editor.getModel()?.getLineCount(),
            columnNum: 1,
        }),
    },
];
/* eslint-enable sort-keys */

/**
 * Sets up shortcut actions for a monaco editor.
 *
 * @param editor
 * @param changeAppState
 */
const setupShortcutActions = (
    editor: monaco.editor.IStandaloneCodeEditor,
    changeAppState: Function
) => {
    SHORTCUTS.forEach(({action, getActionArgs, id, keybindings, label}) => {
        editor.addAction({
            id: id,
            label: label,
            keybindings: keybindings,
            run: () => {
                changeAppState(action, getActionArgs(editor));
            },
        });
    });
};

export {
    setupShortcutActions,
    SHORTCUTS,
};
