import * as monaco from "monaco-editor";


const LOG_LANGUAGE_NAME = "logLanguage";

/**
 * Registers a custom log language in the Monaco editor.
 */
const setupCustomLogLanguage = () => {
    monaco.languages.register({
        id: LOG_LANGUAGE_NAME,
    });
    monaco.languages.setMonarchTokensProvider(LOG_LANGUAGE_NAME, {
        tokenizer: {
            /* eslint-disable @stylistic/js/array-element-newline */
            root: [
                ["INFO", "custom-info"],
                ["ERROR", "custom-error"],
                ["WARN", "custom-warn"],
                ["FATAL", "custom-fatal"],
                [/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3})Z/, "custom-date"],
                [/^[\t ]*at.*$/, "custom-exception"],
                [/(\d+(?:\.\d+)?([eE])([+-])[0-9](\.[0-9])?|\d+(?:\.\d+)?)/, "custom-number"],
                /* eslint-enable @stylistic/js/array-element-newline */
            ],
        },
    });
};

export {
    LOG_LANGUAGE_NAME,
    setupCustomLogLanguage,
};
