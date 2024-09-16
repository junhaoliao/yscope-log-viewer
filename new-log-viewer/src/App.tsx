import Layout from "./components/Layout";
import StateContextProvider from "./contexts/StateContextProvider";
import UrlContextProvider from "./contexts/UrlContextProvider";


// FIXME: this is a lint violation.
// FIXME: this is another lint violation.

/**
 * Renders the main application.
 *
 * @return
 */
const App = () => {
    return (<UrlContextProvider>
        
            <StateContextProvider>
                <Layout/>
            </StateContextProvider>
        </UrlContextProvider>
    );
};

export default App;
