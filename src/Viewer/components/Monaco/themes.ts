import * as monaco from "monaco-editor";

import {ThemeName} from "../../../ThemeContext/ThemeContext";


enum MonacoCustomThemeName {
    LOG_LANGUAGE_DARK="logLanguageDark",
    LOG_LANGUAGE_LIGHT= "logLanguageLight",
}

/**
 * Mappings between app theme to monaco theme
 */
const APP_THEME_TO_MONACO_THEME_MAP: Readonly<Record<ThemeName, MonacoCustomThemeName>> =
    Object.freeze({
        [ThemeName.DARK]: MonacoCustomThemeName.LOG_LANGUAGE_DARK,
        [ThemeName.LIGHT]: MonacoCustomThemeName.LOG_LANGUAGE_LIGHT,
    });

/**
 * Themes for monaco editor
 */
const MONACO_CUSTOM_THEMES: Record<MonacoCustomThemeName, monaco.editor.IStandaloneThemeData> =
    Object.freeze({
        [MonacoCustomThemeName.LOG_LANGUAGE_DARK]: {
            base: "vs-dark",
            inherit: true,
            rules: [
                {token: "custom-info", foreground: "#098658"},
                {token: "custom-warn", foreground: "#ce9178"},
                {token: "custom-error", foreground: "#ce9178", fontStyle: "bold"},
                {token: "custom-fatal", foreground: "#ce9178", fontStyle: "bold"},
                {token: "custom-date", foreground: "#529955"},
                {token: "custom-number", foreground: "#3f9ccb"},
                {token: "custom-exception", foreground: "#ce723b", fontStyle: "italic"},
                {token: "comment", foreground: "#008000"},
            ],
            colors: {
                "editor.lineHighlightBackground": "#3c3c3c",
            },
        },
        [MonacoCustomThemeName.LOG_LANGUAGE_LIGHT]: {
            base: "vs",
            inherit: true,
            rules: [
                {token: "custom-info", foreground: "#098658"},
                {token: "custom-warn", foreground: "#b81560"},
                {token: "custom-error", foreground: "#ac1515", fontStyle: "bold"},
                {token: "custom-fatal", foreground: "#ac1515", fontStyle: "bold"},
                {token: "custom-date", foreground: "#008000"},
                {token: "custom-number", foreground: "#3f9ccb"},
                {token: "custom-exception", foreground: "#ce723b", fontStyle: "italic"},
            ],
            colors: {},
        },
    });

/**
 * Sets up custom themes for the Monaco editor.
 */
const setupThemes = () => {
    monaco.editor.defineTheme(
        MonacoCustomThemeName.LOG_LANGUAGE_DARK,
        MONACO_CUSTOM_THEMES[MonacoCustomThemeName.LOG_LANGUAGE_DARK]
    );
    monaco.editor.defineTheme(
        MonacoCustomThemeName.LOG_LANGUAGE_LIGHT,
        MONACO_CUSTOM_THEMES[MonacoCustomThemeName.LOG_LANGUAGE_LIGHT]
    );
};


export {
    APP_THEME_TO_MONACO_THEME_MAP,
    setupThemes,
};
