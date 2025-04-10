import Markdown from "react-markdown";

import {
    Typography,
    useColorScheme,
} from "@mui/joy";
import rehypeSanitize from "rehype-sanitize";

import {THEME_NAME} from "../../../../../typings/config";

import "./LlmMarkdownTypography.css";
import "./GithubMarkdownCss/github-markdown.css";
import "./GithubMarkdownCss/github-markdown-light.css";
import "./GithubMarkdownCss/github-markdown-dark.css";


interface LlmMarkdownTypographyProps {
    content: string;
}

/**
 * Renders markdown.
 *
 * @param props
 * @param props.content
 * @return
 */
const LlmMarkdownTypography = ({content}: LlmMarkdownTypographyProps) => {
    const {mode, systemMode} = useColorScheme();
    const themeName: string = ("system" === mode ?
        systemMode :
        mode) ?? THEME_NAME.DARK;
    let markdownClassName: string;
    switch (themeName) {
        case "dark":
            markdownClassName = "markdown-body-dark";
            break;
        case "light":
            markdownClassName = "markdown-body-light";
            break;
        case "system":
            markdownClassName = "markdown-body";
            break;
        default:
            markdownClassName = "markdown-body";
            break;
    }

    return (
        <Typography
            component={"div"}
            level={"body-sm"}
            className={[markdownClassName,
                "llm-markdown"].join(" ")}
            sx={{
                backgroundColor: "rgba(0, 0, 0, 0)",
                fontFamily: "var(--joy-fontFamily-body), 'Noto Color Emoji'",
                overflow: "clip",
            }}
        >
            <Markdown rehypePlugins={[rehypeSanitize]}>
                {content}
            </Markdown>
        </Typography>
    );
};

export default LlmMarkdownTypography;
