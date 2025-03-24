import {Nullable} from "./common";


enum LLM_REQUEST_STATUS {
    COMPLETED,
    ERROR,
    NOT_YET_INITIATED,
    STREAMING,
}

type LlmState = {
    abortController: Nullable<AbortController>;
    modelRefreshAbortController: Nullable<AbortController>;
    modelRefreshStatus: LLM_REQUEST_STATUS;
    availableModels: string[];
    model: string;
    log: string;
    prompt: string;
    response: string[];
    status: LLM_REQUEST_STATUS;
};

interface LlmOptions {
    authorization: string;
    endpoint: string;
    eventNum: number;
    prompt: string;
}

/**
 * The default value for `LlmState`.
 *
 */
const LLM_STATE_DEFAULT: Readonly<LlmState> = Object.freeze({
    abortController: null,
    availableModels: [],
    log: "",
    model: "",
    modelRefreshAbortController: null,
    modelRefreshStatus: LLM_REQUEST_STATUS.NOT_YET_INITIATED,
    prompt: "",
    response: [],
    status: LLM_REQUEST_STATUS.NOT_YET_INITIATED,
});

export {
    LLM_REQUEST_STATUS,
    LLM_STATE_DEFAULT,
};
export type {
    LlmOptions, LlmState,
};
