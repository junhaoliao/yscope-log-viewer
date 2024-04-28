import {createContext} from "react";


enum APP_THEME {
    LIGHT = "light",
    DARK = "dark",
}

interface ThemeContextType {
    appTheme: APP_THEME;
    setAppTheme: null | ((theme: string) => void);
}

const ThemeContext = createContext<ThemeContextType>({
    appTheme: APP_THEME.DARK,
    setAppTheme: null,
});

export {
    APP_THEME,
    ThemeContext,
};
