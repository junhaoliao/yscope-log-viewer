import {createContext} from "react";


enum AppThemeName {
    LIGHT = "light",
    DARK = "dark",
}

interface ThemeContextType {
    appTheme: AppThemeName;
    setAppTheme: null | ((theme: string) => void);
}

const ThemeContext = createContext<ThemeContextType>({
    appTheme: AppThemeName.DARK,
    setAppTheme: null,
});

export {
    AppThemeName,
    ThemeContext,
};
