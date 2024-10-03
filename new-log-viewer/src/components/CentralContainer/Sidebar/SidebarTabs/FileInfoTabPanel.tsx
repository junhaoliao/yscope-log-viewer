import {
    useContext,
    useMemo,
} from "react";

import {
    Divider,
    List,
} from "@mui/joy";

import AbcIcon from "@mui/icons-material/Abc";
import StorageIcon from "@mui/icons-material/Storage";

import {StateContext} from "../../../../contexts/StateContextProvider";
import {
    TAB_DISPLAY_NAMES,
    TAB_NAME,
} from "../../../../typings/tab";
import {formatSizeInBytes} from "../../../../utils/units";
import CustomListItem from "./CustomListItem";
import CustomTabPanel from "./CustomTabPanel";


/**
 * Displays a panel containing the file name and original size of the selected file.
 *
 * @return
 */
const FileInfoTabPanel = () => {
    const {fileName, originalFileSizeInBytes} = useContext(StateContext);

    const isFileUnloaded = 0 === fileName.length;
    const formattedOriginalSize = useMemo(
        () => formatSizeInBytes(originalFileSizeInBytes),
        [originalFileSizeInBytes]
    );

    return (
        <CustomTabPanel
            tabName={TAB_NAME.FILE_INFO}
            title={TAB_DISPLAY_NAMES[TAB_NAME.FILE_INFO]}
        >
            {isFileUnloaded ?
                "No file is open." :
                <List>
                    <CustomListItem
                        content={fileName}
                        icon={<AbcIcon/>}
                        slotProps={{content: {sx: {wordBreak: "break-word"}}}}
                        title={"Name"}/>
                    <Divider/>
                    <CustomListItem
                        content={formattedOriginalSize}
                        icon={<StorageIcon/>}
                        title={"Original Size"}/>
                </List>}
        </CustomTabPanel>
    );
};

export default FileInfoTabPanel;
