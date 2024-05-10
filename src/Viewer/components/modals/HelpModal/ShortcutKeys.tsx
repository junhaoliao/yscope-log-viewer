import * as monaco from "monaco-editor/esm/vs/editor/editor.api.js";


type MonacoKeyType = typeof monaco.KeyMod.CtrlCmd | monaco.KeyCode

interface ShortcutKeysProps {
    ctrlCmdKey: string,
    keybindings: Array<MonacoKeyType>
}

/**
 * Monaco (keycode) -> (key name) mappings
 */
const KEY_NAMES:Readonly<Record<MonacoKeyType, string>> = Object.freeze({
    [monaco.KeyCode.KeyI]: "I",
    [monaco.KeyCode.KeyU]: "U",
    [monaco.KeyCode.Comma]: ",",
    [monaco.KeyCode.Period]: ".",
    [monaco.KeyCode.Backquote]: "`",
    [monaco.KeyCode.BracketLeft]: "[",
    [monaco.KeyCode.BracketRight]: "]",
});

/**
 * Renders a shortcut keys combination.
 *
 * @param props
 * @param props.ctrlCmdKey
 * @param props.keybindings only the first keybinding is displayed
 */
const ShortcutKeys = ({
    ctrlCmdKey,
    keybindings,
}:ShortcutKeysProps) => {
    const [binding] = keybindings;
    if ("undefined" === typeof binding) {
        console.log("Invalid keybinding received.");

        return <></>;
    }

    const hasKeyMod = Boolean(monaco.KeyMod.CtrlCmd & binding);
    const keyCode = hasKeyMod ?
        binding ^ monaco.KeyMod.CtrlCmd :
        binding;

    return (
        <span>
            {hasKeyMod &&
                <kbd>
                    {ctrlCmdKey}
                </kbd>}
            {hasKeyMod &&
                <span> + </span>}
            <kbd>
                {KEY_NAMES[keyCode]}
            </kbd>
        </span>
    );
};

export default ShortcutKeys;
