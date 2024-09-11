import Layout from "./components/Layout";
import StateContextProvider from "./contexts/StateContextProvider";
import UrlContextProvider from "./contexts/UrlContextProvider";


// FIXME: this is to intentionally create an ESLint warning

/**
 * Renders the main application.
 *
 * @return
 */
const App = () => {
    return (
        <>
            <UrlContextProvider>
                <StateContextProvider>
                    <Layout/>
                </StateContextProvider>
            </UrlContextProvider>
        </>
    );
};

export default App;
