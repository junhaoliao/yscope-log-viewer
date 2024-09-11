import Layout from "./components/Layout";
import StateContextProvider from "./contexts/StateContextProvider";
import UrlContextProvider from "./contexts/UrlContextProvider";


// TODO: put a rick roll inside the layout
// TODO: delete the previous TODO

// TODO: Ah, yes, the third TODO.
// TODO: give you up
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
