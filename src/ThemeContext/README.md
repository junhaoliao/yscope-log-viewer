# ThemeContext

Exposes a provider which can wrap any YScope React component to manage themes.

# Usage 

The sample application provided below demonstrates the configuration needed to 
deploy the log viewer with drag&drop and theming using the Theme Context.

```shell
import React, { useState } from 'react';
import reactDom from 'react-dom';
import {DropFile} from "./DropFile/DropFile";
import {THEME_STATES} from "./ThemeContext/THEME_STATES";
import {ThemeContext} from "./ThemeContext/ThemeContext";
import {Viewer} from "./Viewer/Viewer";

import "bootstrap/dist/css/bootstrap.min.css";

const App = () => {
    const APP_STATE = {
        FILE_PROMPT: 0,
        FILE_VIEW: 1,
    };

    const [fileSrc, setfileSrc] = useState(null);
    const [appTheme, setAppTheme] = useState(THEME_STATES.DARK);
    const [appMode, setAppMode] = useState();

    const switchTheme = (appTheme) => {
        localStorage.setItem(LOCAL_STORAGE_KEYS.UI_THEME, appTheme);
        document.getElementById("app").setAttribute("data-appTheme", appTheme);
        setAppTheme(appTheme);
    };

    const handleFileChange = (file) => {
        setfileSrc(file);
        setAppMode(APP_STATE.FILE_VIEW);
    };
    
    useEffect(() => {
        console.debug("Version:", config.version);
        const lsTheme = localStorage.getItem(LOCAL_STORAGE_KEYS.UI_THEME);
        switchTheme(lsTheme === THEME_STATES.LIGHT?THEME_STATES.LIGHT:THEME_STATES.DARK);
        setAppMode(APP_STATE.FILE_PROMPT);
    }, []);

    return (
        <div id="app">
            <ThemeContext.Provider value={{appTheme, switchTheme}}>
                <DropFile handleFileDrop={handleFileChange}>
                    {appMode === APP_STATE.VIEWER &&
                        <Viewer logEventNumber={333}
                            prettifyLog={true}
                            fileSrc={fileSrc}/>
                    }
                </DropFile>
            </ThemeContext.Provider>
        </div>
    );
}

reactDom.render(<App/>, document.getElementById("root"));

```
