/* eslint-disable @typescript-eslint/no-shadow */
import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import {
    Alert,
    Button,
    Card,
    CardActions,
    CardContent,
    IconButton,
    Textarea,
    Tooltip,
} from "@mui/joy";

import FactCheckIcon from "@mui/icons-material/FactCheck";
import ThumbDownIcon from "@mui/icons-material/ThumbDown";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";

import {Nullable} from "../../../../typings/common";


interface FeedbackBarProps {
    onSend: (isHelpful: boolean, feedbackString: string) => void;
    scrollToBottom: () => void;
}

enum FEEDBACK_STATE {
    NOT_YET_SELECTED,
    HELPFUL,
    NOT_HELPFUL,
    SENT,
    SENT_CONFIRMATION_CLOSED,
}

const SENT_CONFIRMATION_TIMEOUT: number = 2000;

/**
 * Renders a tooltip-wrapped tab button.
 *
 * @param props
 * @param props.onSend
 * @param props.scrollToBottom
 * @return
 */
const FeedbackBar = ({onSend, scrollToBottom}: FeedbackBarProps) => {
    const [feedbackState, setFeedbackState] =
    useState<FEEDBACK_STATE>(FEEDBACK_STATE.NOT_YET_SELECTED);
    const textareaRef = useRef<Nullable<HTMLTextAreaElement>>(null);
    const timeoutIdRef = useRef<Nullable<number>>(null);

    const setFeedbackStateAndCancelTimeout = useCallback(
        (feedbackState : FEEDBACK_STATE) => {
            setFeedbackState(feedbackState);
            if (null !== timeoutIdRef.current) {
                clearTimeout(timeoutIdRef.current);
            }
        }
        , [setFeedbackState]
    );

    const handleSendClicked = () => {
        if (FEEDBACK_STATE.NOT_YET_SELECTED === feedbackState) {
            throw new Error("Send button clicked without choosing helpful button.");
        }
        if (null === textareaRef.current) {
            throw new Error("Feedback textarea is null");
        }
        onSend(feedbackState === FEEDBACK_STATE.HELPFUL, textareaRef.current.value);
        setFeedbackStateAndCancelTimeout(FEEDBACK_STATE.SENT);
        timeoutIdRef.current = setTimeout(() => {
            setFeedbackStateAndCancelTimeout(FEEDBACK_STATE.SENT_CONFIRMATION_CLOSED);
        }, SENT_CONFIRMATION_TIMEOUT);
        textareaRef.current.value = "";
    };
    const showTextarea: boolean =
        feedbackState === FEEDBACK_STATE.HELPFUL ||
            feedbackState === FEEDBACK_STATE.NOT_HELPFUL;

    useEffect(() => {
        scrollToBottom();
    }, [feedbackState,
        scrollToBottom]);

    return (
        <Card
            sx={{"maxWidth": "100%",
                "--Card-padding": "8px",
                "border": 0}}
        >
            <CardActions sx={{paddingTop: 0}}>
                <Tooltip title={"Very helpful!"}>
                    <IconButton
                        size={"sm"}
                        onClick={() => {
                            setFeedbackStateAndCancelTimeout(FEEDBACK_STATE.HELPFUL);
                        }}
                    >
                        <ThumbUpIcon/>
                    </IconButton>
                </Tooltip>
                <Tooltip title={"Not helpful."}>
                    <IconButton
                        size={"sm"}
                        onClick={() => {
                            setFeedbackStateAndCancelTimeout(FEEDBACK_STATE.NOT_HELPFUL);
                        }}
                    >
                        <ThumbDownIcon/>
                    </IconButton>
                </Tooltip>
            </CardActions>
            <CardContent
                sx={{display: (showTextarea ?
                    null :
                    "none")}}
            >
                <Textarea
                    minRows={2}
                    placeholder={"Type feedback..."}
                    slotProps={{textarea: {ref: textareaRef}}}/>
            </CardContent>
            <Button
                size={"sm"}
                sx={{marginLeft: "auto",
                    display: (showTextarea ?
                        null :
                        "none")}}
                onClick={handleSendClicked}
            >
                Send Feedback
            </Button>
            <Alert
                color={"success"}
                startDecorator={<FactCheckIcon/>}
                variant={"soft"}
                sx={{display: (feedbackState !== FEEDBACK_STATE.SENT ?
                    "none" :
                    null)}}
            >
                Thank you for your feedback!
            </Alert>
        </Card>
    );
};

export default FeedbackBar;
