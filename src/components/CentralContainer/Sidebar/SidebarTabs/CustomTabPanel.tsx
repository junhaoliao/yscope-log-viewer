import React, {Ref} from "react";

import {
    Box,
    ButtonGroup,
    DialogContent,
    DialogTitle,
    TabPanel,
    Typography,
} from "@mui/joy";

import "./CustomTabPanel.css";


interface CustomTabPanelProps {
    children: React.ReactNode;
    contentContainerRef?: Ref<HTMLDivElement>;
    tabName: string;
    title: string;
    titleButtons?: React.ReactNode;
}

/**
 * Renders a customized tab panel to be extended for displaying extra information in the sidebar.
 *
 * @param props
 * @param props.children
 * @param props.tabName
 * @param props.title
 * @param props.titleButtons
 * @param props.contentContainerRef
 * @return
 */
const CustomTabPanel = ({
    children,
    contentContainerRef,
    tabName,
    title,
    titleButtons,
}: CustomTabPanelProps) => {
    return (
        <TabPanel
            className={"sidebar-tab-panel"}
            sx={{width: "0"}}
            value={tabName}
        >
            <Box
                className={"sidebar-tab-panel-container"}
            >
                <DialogTitle className={"sidebar-tab-panel-title-container"}>
                    <Typography
                        className={"sidebar-tab-panel-title"}
                        level={"body-md"}
                    >
                        {title}
                    </Typography>
                    <ButtonGroup
                        size={"sm"}
                        spacing={"1px"}
                        variant={"plain"}
                    >
                        {titleButtons}
                    </ButtonGroup>
                </DialogTitle>
                <DialogContent ref={contentContainerRef}>
                    {children}
                </DialogContent>
            </Box>
        </TabPanel>
    );
};


export default CustomTabPanel;
