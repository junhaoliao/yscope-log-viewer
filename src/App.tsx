import Layout from "./components/Layout";
import LlmContextProvider from "./contexts/LlmContextProvider";
import NotificationContextProvider from "./contexts/NotificationContextProvider";
import StateContextProvider from "./contexts/StateContextProvider";
import UrlContextProvider from "./contexts/UrlContextProvider";


/**
 * Renders the main application.
 *
 * @return
 */
const App = () => {
    return (
        <NotificationContextProvider>
            <UrlContextProvider>
                <StateContextProvider>
                    <LlmContextProvider>
                        <Layout/>
                    </LlmContextProvider>
                </StateContextProvider>
            </UrlContextProvider>
        </NotificationContextProvider>
    );
};

export default App;
