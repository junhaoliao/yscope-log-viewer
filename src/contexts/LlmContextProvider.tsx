/* eslint max-lines: ["error", 1000] */

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";

import {CONFIG_KEY} from "../typings/config";
import {LOG_LEVEL} from "../typings/logs";
import {getConfig} from "../utils/config";
import {
    Message,
    useLlm,
} from "../utils/llm";
import {globalServerConfig} from "../utils/serverConfig";
import {
    sendFeedbackToS3,
    UsageStats,
} from "../utils/usageStats";
import {NotificationContext} from "./NotificationContextProvider";
import {StateContext} from "./StateContextProvider";


interface LlmContextType {
    messages: Message[];
    model: string;
    setModel: (model: string) => void;
    sendFeedback: (usageStats: UsageStats) => Promise<void>;
    modelList: string[];
    requestLlmWithLog: (log: string) => void;
    requestLlmWithRange: (beginLogEventNum: number, endLogEventNum: number) => void;
}

interface LlmContextProviderProps {
    children: React.ReactNode;
}

const LlmContext = createContext<LlmContextType>({} as LlmContextType);

/**
 * Concatenate prompt with log.
 *
 * @param log
 * @param prompt
 * @return a concatenated string of prompt and log
 */
const formatPromptWithLog = (log: string, prompt: string): string => {
    const tripleBacktick = "```";
    return `${prompt}\n${tripleBacktick}\n${log}\n${tripleBacktick}`;
};

const MESSAGE_NUM: number = 2;

/**
 * Provides state management for the LLM.
 *
 * @param root0
 * @param root0.children
 * @return
 * @throws an Error when serverConfig is null
 */
const LlmContextProvider = ({children}: LlmContextProviderProps) => {
    const {postPopUp} = useContext(NotificationContext);
    const {loadRange, settingsChanged} = useContext(StateContext);
    const [llmOptions, setLlmOptions] = useState(getConfig(CONFIG_KEY.LLM_OPTIONS));
    const handleLlmErrors = useCallback(
        (reason: string) => {
            postPopUp({
                level: LOG_LEVEL.ERROR,
                message: reason,
                timeoutMillis: 5000,
                title: "LLM",
            });
        },
        [postPopUp],
    );
    const {
        messages: llmMessages,
        model,
        setModel,
        modelList,
        appendUserMessage,
    } = useLlm({
        apiKey: llmOptions.authorization,
        endpoint: llmOptions.endpoint,
        model: globalServerConfig.defaultLlmModel,
        onError: handleLlmErrors,
    });
    const [messages, setMessages] = useState<Message[]>(llmMessages.slice(-MESSAGE_NUM));

    const requestLlmWithLog = useCallback(
        (logText: string) => {
            const prompt = formatPromptWithLog(logText, llmOptions.prompt);
            appendUserMessage(prompt).catch(() => {
                handleLlmErrors("Failed to send a new message.");
            });
        },
        [appendUserMessage,
            handleLlmErrors,
            llmOptions],
    );

    const requestLlmWithRange = useCallback(
        (beginLogEventNum: number, endLogEventNum: number) => {
            loadRange(beginLogEventNum, endLogEventNum)
                .then((logText) => {
                    const prompt = formatPromptWithLog(logText, llmOptions.prompt);
                    appendUserMessage(prompt).catch(() => {
                        handleLlmErrors("Failed to send a new message.");
                    });
                })
                .catch(() => {
                    handleLlmErrors("Failed to get logs.");
                });
        },
        [appendUserMessage,
            handleLlmErrors,
            llmOptions,
            loadRange],
    );

    useEffect(() => {
        setLlmOptions({...getConfig(CONFIG_KEY.LLM_OPTIONS)});
    }, [settingsChanged]);

    useEffect(() => {
        setMessages(llmMessages.slice(-MESSAGE_NUM));
    }, [llmMessages]);

    const sendFeedback = useCallback(async (usageStats: UsageStats) => {
        await sendFeedbackToS3(usageStats);
    }, []);

    return (
        <LlmContext.Provider
            value={{
                messages,
                model,
                modelList,
                requestLlmWithLog,
                requestLlmWithRange,
                sendFeedback,
                setModel,
            }}
        >
            {children}
        </LlmContext.Provider>
    );
};

export default LlmContextProvider;
export {LlmContext};
