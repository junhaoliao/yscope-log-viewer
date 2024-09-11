import Layout from "./components/Layout";
import StateContextProvider from "./contexts/StateContextProvider";
import UrlContextProvider from "./contexts/UrlContextProvider";


// TODO: put a rick roll inside the layout
// TODO: delete the previous TODO
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
