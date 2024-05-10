import {Table} from "react-bootstrap";

import {SHORTCUTS} from "../../Monaco/shortcuts";
import ShortcutKeys from "./ShortcutKeys";


/**
 * Renders a tables for shortcuts on different platforms.
 */
const ShortcutsTable = () => (
    <Table
        borderless={true}
        style={{fontSize: "15px"}}
    >
        <thead>
            <tr>
                <th>Action</th>
                <th>Windows</th>
                <th>macOS</th>
            </tr>
        </thead>
        <tbody>
            {SHORTCUTS.map((shortcut, actionIdx) => (
                <tr key={actionIdx}>
                    <td>
                        {shortcut.label}
                    </td>
                    <td>
                        <ShortcutKeys
                            ctrlCmdKey={"Ctrl"}
                            keybindings={shortcut.keybindings}/>
                    </td>
                    <td>
                        <ShortcutKeys
                            ctrlCmdKey={"⌘"}
                            keybindings={shortcut.keybindings}/>
                    </td>
                </tr>
            ))}
        </tbody>
    </Table>
);

export default ShortcutsTable;
