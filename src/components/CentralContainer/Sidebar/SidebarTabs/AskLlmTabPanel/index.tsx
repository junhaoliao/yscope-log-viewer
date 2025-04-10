/* eslint-disable max-lines-per-function */
import {
    useCallback,
    useContext,
    useEffect,
    useRef,
} from "react";

import {
    Autocomplete,
    Box,
    List,
} from "@mui/joy";

import {LlmContext} from "../../../../../contexts/LlmContextProvider";
import {NotificationContext} from "../../../../../contexts/NotificationContextProvider";
import {StateContext} from "../../../../../contexts/StateContextProvider";
import {LOG_LEVEL} from "../../../../../typings/logs";
import {
    TAB_DISPLAY_NAMES,
    TAB_NAME,
} from "../../../../../typings/tab";
import {
    MESSAGE_ROLE,
    MESSAGE_STATUS,
} from "../../../../../utils/llm";
import {UsageStats} from "../../../../../utils/usageStats";
import CustomTabPanel from "../CustomTabPanel";
import FeedbackBar from "./FeedbackBar";
import LlmRequestMessageBox from "./LlmRequestMessageBox";
import LlmResponseMessageBox from "./LlmResponseMessageBox";


const NOT_YET_INITIATED_TEXT = "You haven't asked LLM yet.";
const AT_BOTTOM_THRESHOLD: number = 0.2;

/**
 * Displays a panel containing LLM's response.
 *
 * @return
 */
const AskLlmTabPanel = () => {
    const {
        model,
        setModel,
        modelList,
        messages,
        sendFeedback: sendFeedbackToBackend,
    } = useContext(LlmContext);
    const hasNotScrolledRef = useRef<boolean>(true);
    const tabPanelRef = useRef<HTMLDivElement>(null);
    const {postPopUp} = useContext(NotificationContext);
    const {fileName} = useContext(StateContext);

    const sendFeedback = (isHelpful: boolean, feedbackText: string) => {
        const usageStats: UsageStats = {
            feedbackText: feedbackText,
            fileName: fileName,
            isHelpful: isHelpful,
            location: String(window.location),
            messages: messages,
        };

        sendFeedbackToBackend(usageStats).catch(() => {
            postPopUp({
                level: LOG_LEVEL.ERROR,
                message: "Failed to send feedback.",
                timeoutMillis: 5000,
                title: "Feedback",
            });
        });
    };

    const scrollToBottom = useCallback(() => {
        if (null === tabPanelRef.current) {
            return;
        }
        tabPanelRef.current.scrollTo(0, tabPanelRef.current.scrollHeight);
    }, [tabPanelRef]);

    useEffect(() => {
        if (null === tabPanelRef.current) {
            return;
        }

        const tabPanelRefCurrent = tabPanelRef.current;
        const {scrollHeight, clientHeight, scrollTop} = tabPanelRefCurrent;
        const isAtBottom: boolean =
            clientHeight * AT_BOTTOM_THRESHOLD >
            Math.abs(scrollTop - (scrollHeight - clientHeight));

        if (isAtBottom || hasNotScrolledRef.current) {
            scrollToBottom();
        }
        if (tabPanelRefCurrent.scrollTop !== scrollTop) {
            hasNotScrolledRef.current = false;
        }
    }, [messages,
        scrollToBottom]);

    let content;
    if (0 === messages.length) {
        content = (
            <List>
                <Box>
                    {NOT_YET_INITIATED_TEXT}
                </Box>
            </List>
        );
    } else {
        let i = 0;
        content = Array.from(messages)
            .map((message) => {
                switch (true) {
                    case message.role === MESSAGE_ROLE.USER:
                        return <LlmRequestMessageBox content={message.content}/>;

                    case message.role === MESSAGE_ROLE.ASSISTANT &&
                        (message.status === MESSAGE_STATUS.SUBMITTED ||
                            message.status === MESSAGE_STATUS.STREAMING):
                        return (
                            <LlmResponseMessageBox
                                content={message.content}
                                isStreaming={true}/>
                        );

                    case message.role === MESSAGE_ROLE.ASSISTANT &&
                        message.status === MESSAGE_STATUS.FINISH:
                        return (
                            <>
                                <LlmResponseMessageBox
                                    content={message.content}
                                    isStreaming={true}/>
                                <FeedbackBar
                                    scrollToBottom={scrollToBottom}
                                    onSend={sendFeedback}/>
                            </>
                        );
                    case message.role === MESSAGE_ROLE.ASSISTANT &&
                        message.status === MESSAGE_STATUS.ERROR:
                        return (
                            <LlmResponseMessageBox
                                content={"An error occurred when connecting to the LLM."}
                                isStreaming={true}/>
                        );
                    default:
                        // unreachable
                        return null;
                }
            })
            .map((component) => {
                i += 1;

                return (
                    <div key={i}>
                        {component}
                    </div>
                );
            });
        content = (
            <List>
                {content}
            </List>
        );
    }

    return (
        <CustomTabPanel
            contentContainerRef={tabPanelRef}
            tabName={TAB_NAME.ASK_LLM}
            title={TAB_DISPLAY_NAMES[TAB_NAME.ASK_LLM]}
        >
            <Autocomplete
                options={modelList}
                value={model}
                onChange={(_: unknown, newModel) => {
                    if (null === newModel || !modelList.includes(model)) {
                        return;
                    }
                    setModel(newModel);
                }}/>
            {content}
        </CustomTabPanel>
    );
};

export default AskLlmTabPanel;
