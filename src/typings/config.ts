import {DecoderOptions} from "./decoders";
import {LlmOptions} from "./llm";
import {TAB_NAME} from "./tab";


enum THEME_NAME {
    SYSTEM = "system",
    DARK = "dark",
    LIGHT = "light",
}

enum GLOBAL_CONFIG_KEY {
    INITIAL_TAB_NAME = "initialTabName",
    PAGE_SIZE = "pageSize",
    THEME = "uiTheme",
    LLM_OPTIONS = "llmOptions",
}

enum PROFILE_MANAGED_CONFIG_KEY {
    DECODER_OPTIONS_FORMAT_STRING = "decoderOptions/formatString",
    DECODER_OPTIONS_LOG_LEVEL_KEY = "decoderOptions/logLevelKey",
    DECODER_OPTIONS_TIMESTAMP_KEY = "decoderOptions/timestampKey",
}

/**
 *
 */
const CONFIG_KEY = Object.freeze({
    ...GLOBAL_CONFIG_KEY,
    ...PROFILE_MANAGED_CONFIG_KEY,
});

type CONFIG_KEY = GLOBAL_CONFIG_KEY | PROFILE_MANAGED_CONFIG_KEY;


// FIXME: make use of it
const APP_SPECIFIC_LOCAL_STORAGE_KEY_PREFIX = "com.yscope.logviewer/";

const LOCAL_STORAGE_KEY_PROFILE_PREFIX = "profile:";

/**
 *
 * @param key
 */
const isLocalStorageKeyProfile = (key: string): boolean => key.startsWith(LOCAL_STORAGE_KEY_PROFILE_PREFIX);

/**
 *
 * @param key
 */
const getProfileNameFromLocalStorageKey = (key: string): string => key.substring(LOCAL_STORAGE_KEY_PROFILE_PREFIX.length);

/**
 *
 * @param profileName
 */
const getLocalStorageKeyFromProfileName = (profileName: string): string => `${LOCAL_STORAGE_KEY_PROFILE_PREFIX}${profileName}`;

/* eslint-disable @typescript-eslint/prefer-literal-enum-member */
enum LOCAL_STORAGE_KEY {
    FORCED_PROFILE = "forcedProfile",
    DECODER_OPTIONS_FORMAT_STRING = `${CONFIG_KEY.DECODER_OPTIONS}/formatString`,
    DECODER_OPTIONS_LOG_LEVEL_KEY = `${CONFIG_KEY.DECODER_OPTIONS}/logLevelKey`,
    DECODER_OPTIONS_TIMESTAMP_KEY = `${CONFIG_KEY.DECODER_OPTIONS}/timestampKey`,
    INITIAL_TAB_NAME = CONFIG_KEY.INITIAL_TAB_NAME,
    THEME = CONFIG_KEY.THEME,
    PAGE_SIZE = CONFIG_KEY.PAGE_SIZE,
    LLM_OPTIONS_AUTHORIZATION = `${CONFIG_KEY.LLM_OPTIONS}/authorization`,
    LLM_OPTIONS_ENDPOINT = `${CONFIG_KEY.LLM_OPTIONS}/endpoint`,
    LLM_OPTIONS_EVENT_NUM = `${CONFIG_KEY.LLM_OPTIONS}/eventNum`,
    LLM_OPTIONS_PROMPT = `${CONFIG_KEY.LLM_OPTIONS}/prompt`,
}
/* eslint-enable @typescript-eslint/prefer-literal-enum-member */

interface ProfileManagedConfigMap {
    [PROFILE_MANAGED_CONFIG_KEY.DECODER_OPTIONS_FORMAT_STRING]: DecoderOptions["formatString"];
    [PROFILE_MANAGED_CONFIG_KEY.DECODER_OPTIONS_LOG_LEVEL_KEY]: DecoderOptions["logLevelKey"];
    [PROFILE_MANAGED_CONFIG_KEY.DECODER_OPTIONS_TIMESTAMP_KEY]: DecoderOptions["timestampKey"];
}

interface ConfigMap extends ProfileManagedConfigMap {
    [GLOBAL_CONFIG_KEY.INITIAL_TAB_NAME]: TAB_NAME;
    [GLOBAL_CONFIG_KEY.PAGE_SIZE]: number;
    [GLOBAL_CONFIG_KEY.THEME]: THEME_NAME;
    [GLOBAL_CONFIG_KEY.LLM_OPTIONS]: LlmOptions;
}

type ConfigUpdates = {
    [T in keyof ConfigMap]?: ConfigMap[T];
};

type ConfigUpdateEntry = {
    [T in keyof ConfigMap]: {
        key: T;
        value: ConfigMap[T];
    }
}[keyof ConfigMap];

/**
 *
 * @param key
 * @param value
 */
const createUpdateEntry = <K extends keyof ConfigMap>(
    key: K,
    value: ConfigMap[K]
): ConfigUpdateEntry => ({key, value} as ConfigUpdateEntry);

interface Profile {
    config: ProfileManagedConfigMap;
    filePathPrefixes: string[];
    lastModificationTimestampMillis: number;
}

type ProfileName = string;

export {
    CONFIG_KEY,
    createUpdateEntry,
    getLocalStorageKeyFromProfileName,
    getProfileNameFromLocalStorageKey,
    isLocalStorageKeyProfile,
    LOCAL_STORAGE_KEY,
    PROFILE_MANAGED_CONFIG_KEY,
    THEME_NAME,
};
export type {
    ConfigMap,
    ConfigUpdateEntry,
    ConfigUpdates,
    Profile,
    ProfileName,
};
