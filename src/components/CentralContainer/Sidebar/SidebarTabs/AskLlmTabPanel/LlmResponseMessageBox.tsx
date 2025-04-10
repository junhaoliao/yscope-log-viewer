import {
    ListItem,
    ListItemContent,
} from "@mui/joy";

import LlmMarkdownTypography from "./LlmMarkdownTypography";
import LlmResponseLoadingBar from "./LlmResponseLoadingBar";

import "./GithubMarkdownCss/github-markdown.css";
import "./GithubMarkdownCss/github-markdown-light.css";
import "./GithubMarkdownCss/github-markdown-dark.css";


interface LlmResponseMessageBoxProps {
    content: string;
    isStreaming: boolean;
}

/**
 * Renders a custom list item with an icon, a title and a context text.
 *
 * @param props
 * @param props.content
 * @return
 */
const LlmResponseMessageBox = ({content}: LlmResponseMessageBoxProps) => {
    return (
        <ListItem sx={{alignItems: "start"}}>
            <ListItemContent>
                {"" === content ?
                    (
                        <LlmResponseLoadingBar/>
                    ) :
                    (
                        <LlmMarkdownTypography content={content}/>
                    )}
            </ListItemContent>
        </ListItem>
    );
};

export default LlmResponseMessageBox;
