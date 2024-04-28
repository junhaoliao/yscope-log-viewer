import {createContext} from "react";


enum ThemeName {
    LIGHT = "light",
    DARK = "dark",
}

interface ThemeContextType {
    theme: ThemeName;
    setTheme: null | ((theme: string) => void);
}

const ThemeContext = createContext<ThemeContextType>({
    theme: ThemeName.DARK,
    setTheme: null,
});

export {
    ThemeContext,
    ThemeName,
};
