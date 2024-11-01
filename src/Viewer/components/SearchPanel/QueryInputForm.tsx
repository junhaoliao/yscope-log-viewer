import {
    ChangeEvent,
    MouseEvent,
    useEffect,
    useRef,
} from "react";
import {Regex} from "react-bootstrap-icons";

import {Query} from "./types";


interface QueryInputFormProps {
    query: Query;
    queryChangeHandler: (query: Query) =>void
}

// Additional height to account for padding/border when auto-sizing the height
const QUERY_INPUT_TEXTAREA_EXTRA_HEIGHT = 6;

/**
 * Represents a form for receiving query strings and various query settings such as matchCase,
 * isRegex.
 *
 * @param props
 * @param props.query
 * @param props.queryChangeHandler
 */
const QueryInputForm = ({
    query,
    queryChangeHandler,
}:QueryInputFormProps) => {
    const queryInputRef = useRef<HTMLTextAreaElement>(null);
    const handleQueryButtonClick = (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        const {action} = e.currentTarget.dataset;
        switch (action) {
            case "matchCase":
                queryChangeHandler({...query, matchCase: !query.matchCase});
                break;
            case "isRegex":
                queryChangeHandler({...query, isRegex: !query.isRegex});
                break;
            default:
                break;
        }
    };

    const autoResizeHeight = () => {
        if (null === queryInputRef.current) {
            return;
        }
        queryInputRef.current.style.height = "0";
        queryInputRef.current.style.height =
            `${queryInputRef.current.scrollHeight + QUERY_INPUT_TEXTAREA_EXTRA_HEIGHT}px`;
    };

    const handleQueryInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
        autoResizeHeight();

        const newQuery = e.target.value;
        queryChangeHandler({...query, searchString: newQuery});
    };

    useEffect(() => {
        autoResizeHeight();
    }, []);

    return (
        <form style={{display: "flex"}}>
            <textarea
                className={"search-input"}
                placeholder={"Query"}
                ref={queryInputRef}
                style={{paddingRight: "66px"}}
                value={query.searchString}
                onChange={handleQueryInputChange}
                onKeyDown={(event) => {
                    if ("Enter" === event.key && !event.shiftKey) {
                        event.preventDefault();
                    }
                }}/>
            <span style={{position: "absolute", right: "14px"}}>
                <button
                    data-action={"matchCase"}
                    className={`search-input-button 
                                ${query.matchCase ?
            "search-input-button-active" :
            ""}`}
                    onClick={handleQueryButtonClick}
                >
                    {/* TODO: Replace with some icon */}
                    Aa
                </button>
                <button
                    data-action={"isRegex"}
                    className={`search-input-button 
                                ${query.isRegex ?
            "search-input-button-active" :
            ""}`}
                    onClick={handleQueryButtonClick}
                >
                    <Regex/>
                </button>
            </span>
        </form>
    );
};

export default QueryInputForm;
