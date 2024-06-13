import React, {
    createContext,
    useCallback,
    useEffect,
    useState,
} from "react";

import {useColorScheme} from "@mui/joy/styles/CssVarsProvider";

import LOCAL_STORAGE_KEYS from "../Viewer/services/LOCAL_STORAGE_KEYS";


enum APP_THEME {
    LIGHT = "light",
    DARK = "dark",
}

const APP_THEME_DEFAULT = APP_THEME.DARK;

interface ThemeContextType {
    appTheme: APP_THEME;
    switchTheme: ((theme: APP_THEME) => void);
}

const ThemeContext = createContext<ThemeContextType>({
    appTheme: APP_THEME.DARK,
    switchTheme: () => null,
});

/**
 * Provides a theme context for its children.
 *
 * @param props
 * @param props.children
 */
const ThemeContextProvider = ({children}: {children: React.ReactNode}):
    React.ReactElement => {
    const [appTheme, setAppTheme] = useState(APP_THEME.DARK);
    const {setMode} = useColorScheme();

    const switchTheme = useCallback((theme: APP_THEME) => {
        localStorage.setItem(LOCAL_STORAGE_KEYS.UI_THEME, theme);
        document.getElementById("app")?.setAttribute("data-theme", theme);
        setAppTheme(theme);
        setMode(theme);
    }, [setMode]);

    useEffect(() => {
        const lsTheme = localStorage.getItem(LOCAL_STORAGE_KEYS.UI_THEME);
        switchTheme((lsTheme ?? APP_THEME_DEFAULT) as APP_THEME);
    }, [switchTheme]);

    return (
        <ThemeContext.Provider value={{appTheme, switchTheme}}>
            {children}
        </ThemeContext.Provider>
    );
};

export {
    APP_THEME,
    ThemeContext,
    ThemeContextProvider,
};
