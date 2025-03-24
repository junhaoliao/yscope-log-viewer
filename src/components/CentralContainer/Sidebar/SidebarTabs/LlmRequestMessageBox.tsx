import {
    Box,
    ListItem,
    ListItemContent,
} from "@mui/joy";
import {Theme} from "@mui/joy/styles";

import LlmMarkdownTypography from "./LlmMarkdownTypography";


interface LlmRequestMessageBoxProps {
    content: string;
}

/**
 * Returns LLM request styles.
 *
 * @param theme
 * @return style
 */
const LLM_REQUEST_STYLES = (theme: Theme) => ({
    backgroundColor: theme.vars.palette.background.level1,
    borderRadius: "2em",
    float: "right",
    marginBottom: "1em",
    padding: "1em",
    width: "70%",
});

/**
 * Renders a custom list item with an icon, a title and a context text.
 *
 * @param props
 * @param props.content
 * @return
 */
const LlmRequestMessageBox = ({content}: LlmRequestMessageBoxProps) => {
// eslint-disable-next-line no-warning-comments
    // TODO: Name dark/light theme explicitly in `github-markdown-css`.
    return (
        <ListItem sx={{alignItems: "start"}}>
            <ListItemContent>
                <Box sx={LLM_REQUEST_STYLES}>
                    <LlmMarkdownTypography
                        content={content}
                        isRequest={true}/>
                </Box>
            </ListItemContent>
        </ListItem>
    );
};

export default LlmRequestMessageBox;
