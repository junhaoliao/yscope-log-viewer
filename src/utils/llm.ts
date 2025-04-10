/* eslint-disable max-lines-per-function */
import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import {createOpenAICompatible} from "@ai-sdk/openai-compatible";
import {streamText} from "ai";
import {
    HttpStatusCode,
    isAxiosError,
} from "axios";

import {Nullable} from "../typings/common";
import {parseOpenAiModelResponse} from "./openai";


export type UseLlmOptions = {
    endpoint: string;
    apiKey: string;
    model: string;
    onError: (reason: string) => void;
};

export enum MESSAGE_STATUS {
    SUBMITTED,
    STREAMING,
    FINISH,
    ERROR,
}

export enum MESSAGE_ROLE {
    USER,
    ASSISTANT,
}

export type Message = {
    content: string;
    role: MESSAGE_ROLE;
    status: MESSAGE_STATUS;
};

/**
 * Manages states related to LLM.
 *
 * @param root0
 * @param root0.endpoint
 * @param root0.apiKey
 * @param root0.model
 * @param root0.onError
 * @return states
 */
const useLlm = ({endpoint, apiKey, model: initialModel, onError}: UseLlmOptions) => {
    const [model, setModel] = useState<string>(initialModel);
    const [messages, setMessages] = useState<Message[]>([]);
    const messagesRef = useRef(messages);
    const abortControllerRef = useRef<Nullable<AbortController>>(null);

    const populateMessages = () => {
        setMessages([...messagesRef.current]);
    };
    const appendMessage = (message: Message) => {
        messagesRef.current = messagesRef.current.concat([message]);
    };

    const provider = createOpenAICompatible({
        apiKey: apiKey,
        baseURL: endpoint,
        name: "provider",
    });

    const appendUserMessage = useCallback(
        async (prompt: string) => {
            if (null !== abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            abortControllerRef.current = new AbortController();

            const userMessage: Message = {
                content: prompt,
                role: MESSAGE_ROLE.USER,
                status: MESSAGE_STATUS.FINISH,
            };

            appendMessage(userMessage);
            const assistantMessage: Message = {
                content: "",
                role: MESSAGE_ROLE.ASSISTANT,
                status: MESSAGE_STATUS.SUBMITTED,
            };

            appendMessage(assistantMessage);
            populateMessages();

            const result = streamText({
                abortSignal: abortControllerRef.current.signal,
                model: provider(model),

                /**
                 * Call on error
                 */
                onError: () => {
                    assistantMessage.status = MESSAGE_STATUS.ERROR;
                    populateMessages();
                },

                /**
                 * Call on finish
                 */
                onFinish: () => {
                    assistantMessage.status = MESSAGE_STATUS.FINISH;
                    populateMessages();
                },

                prompt: prompt,
            });

            try {
                for await (const textPart of result.textStream) {
                    assistantMessage.content += textPart;
                    populateMessages();
                }
            } catch (error) {
                if (isAxiosError(error) && "AbortError" === error.name) {
                    return;
                }
                assistantMessage.status = MESSAGE_STATUS.ERROR;
                populateMessages();
            }
        },
        [model,
            provider],
    );

    const [modelList, setModelList] = useState<string[]>([]);
    const listModelsAbortControllerRef = useRef<Nullable<AbortController>>(null);

    const refreshModelList = useCallback(() => {
        try {
            if (null !== listModelsAbortControllerRef.current) {
                listModelsAbortControllerRef.current.abort();
            }
            listModelsAbortControllerRef.current = new AbortController();
            const headers = "" === apiKey ?
                {} :
                {Authorization: `Bearer ${apiKey}`};
            const endpointWithPath = new URL(
                "v1/models",
                endpoint.endsWith("/") ?
                    endpoint :
                    `${endpoint}/`,
            );
            const request = new Request(endpointWithPath, {
                headers: headers,
                method: "GET",
                redirect: "manual",
            });

            fetch(request, {signal: listModelsAbortControllerRef.current.signal})
                .then((response) => {
                    if (Number(HttpStatusCode.Ok) !== response.status) {
                        throw new Error();
                    }

                    return response.json();
                })
                .then((json) => {
                    const openAiModelResponse = parseOpenAiModelResponse(json);
                    const availableModels = openAiModelResponse.data.map(
                        (availableModel) => availableModel.id,
                    );

                    setModelList(availableModels);
                    if (!availableModels.includes(model)) {
                        setModel(availableModels.at(0) ?? "");
                    }
                })
                .catch((error: unknown) => {
                    if (isAxiosError(error) || "AbortError" === error.name) {
                        return;
                    }
                    onError("Failed to fetch model list.");
                });
        } catch {
            onError("Failed to fetch model list.");
        }
    }, [apiKey,
        endpoint,
        model,
        onError]);

    useEffect(() => {
        refreshModelList();
    }, [endpoint,
        refreshModelList]);

    return {appendUserMessage, messages, model, modelList, setModel};
};

export {useLlm};
