import {createContext} from "react";


enum APP_THEME {
    LIGHT = "light",
    DARK = "dark",
}
const APP_THEME_DEFAULT = APP_THEME.DARK;

interface ThemeContextType {
    appTheme: APP_THEME;
    switchTheme: null | ((theme: APP_THEME) => void);
}

const ThemeContext = createContext<ThemeContextType>({
    appTheme: APP_THEME.DARK,
    switchTheme: null,
});

export {
    APP_THEME,
    APP_THEME_DEFAULT,
    ThemeContext,
};
