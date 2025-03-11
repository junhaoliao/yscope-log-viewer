import React, {
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    Divider,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemDecorator,
    ListSubheader,
    Sheet,
    Skeleton,
    Tooltip,
} from "@mui/joy";

import AbcIcon from "@mui/icons-material/Abc";
import AdjustIcon from "@mui/icons-material/Adjust";
import ArticleIcon from "@mui/icons-material/Article";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import StorageIcon from "@mui/icons-material/Storage";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";

import {StateContext} from "../../../../contexts/StateContextProvider";
import {UrlContext} from "../../../../contexts/UrlContextProvider";
import {Nullable} from "../../../../typings/common";
import {
    TAB_DISPLAY_NAMES,
    TAB_NAME,
} from "../../../../typings/tab";
import {formatSizeInBytes} from "../../../../utils/units";
import CustomListItem from "./CustomListItem";
import CustomTabPanel from "./CustomTabPanel";


interface FileItemProps {
    currentFileIdx: number;
    currentFileRef: React.Ref<HTMLLIElement>;
    filePath: string;
    filePathPrefix: string;
    index: number;
    totalNum: number;
}

const OMITTED_FILE_PATH = "...";

/**
 *
 * @param props
 * @param props.currentFileIdx
 * @param props.filePath
 * @param props.filePathPrefix
 * @param props.index
 * @param props.currentFileRef
 * @param props.totalNum
 */
const FileItem = ({
    currentFileIdx,
    currentFileRef,
    filePath,
    filePathPrefix,
    index,
    totalNum,
}: FileItemProps) => {
    const baseName = filePath.substring(filePath.lastIndexOf("/") + 1);
    const isCurrentFile = currentFileIdx === index;
    let tooltipTitle: string;
    let logEventNum: Nullable<number>;

    let Icon;
    switch (index) {
        case currentFileIdx:
            tooltipTitle = "Current file";
            Icon = AdjustIcon;

            // unused
            logEventNum = null;
            break;
        case currentFileIdx - 1:
            tooltipTitle = "Previous file";
            Icon = KeyboardArrowLeftIcon;
            logEventNum = null;
            break;
        case currentFileIdx + 1:
            tooltipTitle = "Next file";
            Icon = KeyboardArrowRightIcon;
            logEventNum = 1;
            break;
        case 0:
            tooltipTitle = "First file";
            Icon = KeyboardArrowUpIcon;
            logEventNum = 1;
            break;
        case totalNum - 1:
            tooltipTitle = "Last file";
            Icon = KeyboardArrowDownIcon;
            logEventNum = null;
            break;
        default:
            tooltipTitle = "Open";
            Icon = ArticleIcon;
    }

    return (
        <ListItem
            ref={isCurrentFile ?
                currentFileRef :
                null}
        >
            <Tooltip
                arrow={false}
                placement={"bottom-start"}
                title={tooltipTitle}
            >
                <ListItemButton
                    selected={isCurrentFile}
                    onClick={isCurrentFile ?
                        () => null :
                        () => {
                            const newFilePath = `${filePathPrefix}/${baseName}`;
                            const url = new URL(window.location.href);
                            url.search = `?filePath=${newFilePath}`;
                            url.hash = null === logEventNum ?
                                "" :
                                `#logEventNum=${logEventNum}`;
                            window.open(url, "_blank");
                        }}
                >
                    <ListItemDecorator>
                        <Icon/>
                    </ListItemDecorator>
                    <span style={{wordBreak: "break-all"}}>
                        {baseName.split(".")[0]}
                    </span>
                </ListItemButton>
            </Tooltip>
        </ListItem>
    );
};

/**
 *
 */
const RelatedFileList = () => {
    const {filePath} = useContext(UrlContext);
    const {s3FileList} = useContext(StateContext);

    const [isAllVisible, setIsAllVisible] = useState<boolean>(false);
    const currentFileRef = useRef<HTMLLIElement>(null);

    const listItems: React.ReactNode[] = useMemo(() => {
        let items;
        if (null === s3FileList || null === filePath) {
            items = [
                <ListItem key={"file-list-skeleton"}>
                    <Skeleton
                        level={"h2"}
                        loading={true}
                        variant={"text"}/>
                </ListItem>,
            ];
        } else if (0 === s3FileList.length) {
            items = [
                <ListItem key={"no-logs-found"}>
                    No other logs found.
                </ListItem>,
            ];
        } else {
            const isOptimizationNeeded = false === isAllVisible && 1000 < s3FileList.length;
            let currentFileIdx = s3FileList.findIndex((f) => filePath.includes(f));
            const filePathPrefix = filePath.substring(0, filePath.lastIndexOf("/"));
            const optimizedList: string[] = [];

            if (isOptimizationNeeded) {
                const prevIdx = currentFileIdx - 1;
                const nextIdx = currentFileIdx + 1;

                // eslint-disable-next-line prefer-destructuring
                const first = s3FileList[0];
                const prev = s3FileList[prevIdx];
                const curr = s3FileList[currentFileIdx];
                const next = s3FileList[nextIdx];
                const last = s3FileList[s3FileList.length - 1];

                if (0 < currentFileIdx) {
                    if (0 < prevIdx) {
                        optimizedList.push(first ?? OMITTED_FILE_PATH);
                        if (1 < prevIdx) {
                            optimizedList.push(OMITTED_FILE_PATH);
                        }
                    }

                    optimizedList.push(prev ?? OMITTED_FILE_PATH);
                }

                optimizedList.push(curr ?? OMITTED_FILE_PATH);

                if (currentFileIdx < s3FileList.length - 1) {
                    optimizedList.push(next ?? OMITTED_FILE_PATH);

                    if (nextIdx < s3FileList.length - 1) {
                        if (nextIdx < s3FileList.length - 2) {
                            optimizedList.push(OMITTED_FILE_PATH);
                        }
                        optimizedList.push(last ?? OMITTED_FILE_PATH);
                    }
                }

                currentFileIdx = optimizedList.findIndex((f) => filePath.includes(f));
            }
            const finalList = isOptimizationNeeded ?
                optimizedList :
                s3FileList;

            items = finalList.map((f, index) => (
                f === OMITTED_FILE_PATH ?
                    <ListItem key={`${f}-${index}`}>
                        <Tooltip
                            arrow={false}
                            placement={"bottom-start"}
                            title={"Show all files. " +
                            "This may crash your browser if there are a lot of files."}
                        >
                            <ListItemButton
                                sx={{justifyContent: "center"}}
                                variant={"soft"}
                                onClick={() => {
                                    setIsAllVisible(true);
                                }}
                            >
                                <UnfoldMoreIcon/>
                            </ListItemButton>
                        </Tooltip>
                    </ListItem> :
                    <FileItem
                        currentFileIdx={currentFileIdx}
                        currentFileRef={currentFileRef}
                        filePath={f}
                        filePathPrefix={filePathPrefix}
                        index={index}
                        key={f}
                        totalNum={finalList.length}/>
            ));
        }

        return items;
    }, [
        filePath,
        isAllVisible,
        s3FileList,
    ]);

    const scrollCurrentFileIntoView = () => {
        currentFileRef.current?.scrollIntoView({block: "center", behavior: "smooth"});
    };

    useEffect(() => {
        scrollCurrentFileIntoView();
    }, [s3FileList]);

    return (
        <Sheet>
            <List size={"sm"}>
                <ListSubheader sticky={true}>
                    <span style={{flexGrow: 1}}>Logs from the same container</span>
                    <Tooltip
                        arrow={false}
                        title={"Locate current file"}
                    >
                        <span>
                            <IconButton
                                disabled={null === s3FileList}
                                size={"sm"}
                                onClick={scrollCurrentFileIntoView}
                            >
                                <AdjustIcon/>
                            </IconButton>
                        </span>
                    </Tooltip>
                </ListSubheader>
                {listItems}
            </List>
        </Sheet>
    );
};

/**
 * Displays a panel containing the file name and on-disk size of the selected file.
 *
 * @return
 */
const FileInfoTabPanel = () => {
    const {fileName, onDiskFileSizeInBytes} = useContext(StateContext);

    const isFileUnloaded = 0 === fileName.length;
    const formattedOnDiskSize = useMemo(
        () => formatSizeInBytes(onDiskFileSizeInBytes, false),
        [onDiskFileSizeInBytes]
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
                        content={formattedOnDiskSize}
                        icon={<StorageIcon/>}
                        title={"On-disk Size"}/>
                </List>}
            <Divider/>
            <RelatedFileList/>
        </CustomTabPanel>
    );
};

export default FileInfoTabPanel;
