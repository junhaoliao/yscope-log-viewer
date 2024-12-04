import {
    TAB_DISPLAY_NAMES,
    TAB_NAME,
} from "../../../../typings/tab";
import SettingsDialog from "../../../modals/SettingsModal/SettingsDialog";
import CustomTabPanel from "./CustomTabPanel";


/**
 * Displays a panel containing the file name and on-disk size of the selected file.
 *
 * @return
 */
const SettingsTabPanel = () => {
    return (
        <CustomTabPanel
            tabName={TAB_NAME.SETTINGS}
            title={TAB_DISPLAY_NAMES[TAB_NAME.SETTINGS]}
        >
            <SettingsDialog/>
        </CustomTabPanel>
    );
};

export default SettingsTabPanel;
