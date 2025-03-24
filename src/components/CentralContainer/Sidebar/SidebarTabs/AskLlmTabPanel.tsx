import {
    useCallback,
    useContext,
    useEffect,
    useRef,
} from "react";

import {
    Autocomplete,
    List,
} from "@mui/joy";

import {StateContext} from "../../../../contexts/StateContextProvider";
import {LLM_REQUEST_STATUS} from "../../../../typings/llm";
import {
    TAB_DISPLAY_NAMES,
    TAB_NAME,
} from "../../../../typings/tab";
import {formatPromptWithLog} from "../../../../utils/llm";
import CustomTabPanel from "./CustomTabPanel";
import FeedbackBar from "./FeedbackBar";
import LlmRequestMessageBox from "./LlmRequestMessageBox";
import LlmResponseMessageBox from "./LlmResponseMessageBox";


const NOT_YET_INITIATED_TEXT = "You haven't asked LLM yet.";
const AT_BOTTOM_THRESHOLD: number = 100;

/**
 * Displays a panel containing LLM's response.
 *
 * @return
 */
const AskLlmTabPanel = () => {
    const {llmState, setLlmState} = useContext(StateContext);
    const hasNotScrolledRef = useRef<boolean>(true);
    const promptWithLog: string = formatPromptWithLog(llmState.log, llmState.prompt);
    const tabPanelRef = useRef<HTMLDivElement>(null);

    const sendFeedback = (isHelpful: boolean, feedbackText: string) => {
        const userStats = {
            feedbackText: feedbackText,
            isHelpful: isHelpful,
            log: llmState.log,
            prompt: llmState.prompt,
            response: llmState.response,
        };

        console.log(userStats);
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
        const isAtBottom: boolean = AT_BOTTOM_THRESHOLD >
            Math.abs(scrollTop - (scrollHeight - clientHeight));

        if (isAtBottom || hasNotScrolledRef.current) {
            scrollToBottom();
        }
        if (tabPanelRefCurrent.scrollTop !== scrollTop) {
            hasNotScrolledRef.current = false;
        }
    }, [llmState,
        scrollToBottom]);

    let content;
    switch (llmState.status) {
        case LLM_REQUEST_STATUS.NOT_YET_INITIATED:
            content = (
                <List>
                    {NOT_YET_INITIATED_TEXT}
                </List>
            );
            break;
        case LLM_REQUEST_STATUS.COMPLETED:
            content = (
                <List>
                    <LlmRequestMessageBox
                        content={promptWithLog}/>
                    <LlmResponseMessageBox
                        content={llmState.response.join("")}
                        isStreaming={false}/>
                    <FeedbackBar
                        scrollToBottom={scrollToBottom}
                        onSend={sendFeedback}/>
                </List>
            );
            break;
        case LLM_REQUEST_STATUS.STREAMING:
            content = (
                <List>
                    <LlmRequestMessageBox
                        content={promptWithLog}/>
                    <LlmResponseMessageBox
                        content={llmState.response.join("")}
                        isStreaming={true}/>
                </List>
            );
            break;
        case LLM_REQUEST_STATUS.ERROR:
            content = (
                <List>
                    <LlmRequestMessageBox
                        content={promptWithLog}/>
                    <LlmResponseMessageBox
                        content={"An error occurred when connecting to the LLM."}
                        isStreaming={false}/>
                </List>
            );
            break;
        default:
            // unreachable
            break;
    }

    return (
        <CustomTabPanel
            contentContainerRef={tabPanelRef}
            tabName={TAB_NAME.ASK_LLM}
            title={TAB_DISPLAY_NAMES[TAB_NAME.ASK_LLM]}
        >
            <Autocomplete
                options={llmState.availableModels}
                value={llmState.model}
                onChange={(_: unknown, newValue) => {
                    if (null === newValue) {
                        return;
                    }
                    setLlmState({...llmState, model: newValue});
                }}/>
            {content}
        </CustomTabPanel>
    );
};

export default AskLlmTabPanel;
