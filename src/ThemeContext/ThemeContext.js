import React, {
    createContext,
    useCallback,
    useEffect,
    useState,
} from "react";

import {useColorScheme} from "@mui/joy/styles/CssVarsProvider";
import {
    Experimental_CssVarsProvider as MaterialCssVarsProvider,
    experimental_extendTheme as extendMaterialTheme,
    THEME_ID,
} from "@mui/material/styles";

import LOCAL_STORAGE_KEYS from "../Viewer/services/LOCAL_STORAGE_KEYS";
import {THEME_STATES} from "./THEME_STATES";


const ThemeContext = createContext({theme: THEME_STATES.DARK});

const materialTheme = extendMaterialTheme();

/**
 * Provides a theme context for its children.
 *
 * @param props
 * @param props.children
 */
const ThemeContextProvider = ({children}) => {
    const [theme, setTheme] = useState(THEME_STATES.DARK);
    const {setMode} = useColorScheme();

    const switchTheme = useCallback((newTheme) => {
        localStorage.setItem(LOCAL_STORAGE_KEYS.UI_THEME, newTheme);
        document.getElementById("app")?.setAttribute("data-theme", newTheme);
        setTheme(newTheme);
        setMode(newTheme);
    }, [setMode]);

    useEffect(() => {
        const lsTheme = localStorage.getItem(LOCAL_STORAGE_KEYS.UI_THEME);
        switchTheme(lsTheme ?? THEME_STATES.DARK);
    }, [switchTheme]);

    return (
        <ThemeContext.Provider value={{theme, switchTheme}}>
            <MaterialCssVarsProvider theme={{[THEME_ID]: materialTheme}}>
                {children}
            </MaterialCssVarsProvider>
        </ThemeContext.Provider>
    );
};

export {
    ThemeContext,
    ThemeContextProvider,
};
