import {
    useEffect,
    useState,
} from "react";
import {
    CaretDownFill,
    CaretRightFill,
} from "react-bootstrap-icons";

import {ResultGroup} from "./types";


interface SearchResultsGroupProps {
    isAllCollapsed: boolean;
    isDateAlwaysVisible: boolean;
    pageNum: number;
    results: ResultGroup;
    resultClickHandler: (logEventIdx: number) => void;
}

// Cap prefix length so the matching part can be shown
const SEARCH_RESULT_PREFIX_MAX_CHARACTERS = 25;

/**
 * The search results on a page
 *
 * @param props
 * @param props.isAllCollapsed
 * @param props.pageNum
 * @param props.results
 * @param props.resultClickHandler
 * @param props.isDateAlwaysVisible
 * @return
 */
const SearchResultsGroup = ({
    isAllCollapsed,
    isDateAlwaysVisible,
    pageNum,
    results,
    resultClickHandler,
}:SearchResultsGroupProps) => {
    const [collapsed, setCollapsed] = useState(true);

    const onHeaderClickHandler = () => {
        setCollapsed(!collapsed);
    };

    useEffect(() => {
        setCollapsed(isAllCollapsed);
    }, [isAllCollapsed]);

    if (0 === results.searchResults.length) {
        return <></>;
    }

    const resultsRows = results.searchResults.map((r) => {
        const {content, eventIndex, match} = r;
        const split = content.split(match);
        let [prefix] = split;
        const postfix = split.slice(1).join(match);

        if ("undefined" === typeof prefix) {
            console.warn("this shall never happen but the check is necessarily as TS doesn't" +
                " know about array returned by split() has at least one element");
            prefix = "";
        }

        return (
            <button
                className={"search-result-button"}
                key={eventIndex}
                onClick={() => {
                    resultClickHandler(eventIndex + 1);
                }}
            >
                <span>
                    {
                        isDateAlwaysVisible ?
                            prefix :
                            <>
                                {(SEARCH_RESULT_PREFIX_MAX_CHARACTERS < prefix.length) && "..."}
                                {prefix.slice(-SEARCH_RESULT_PREFIX_MAX_CHARACTERS)}
                            </>
                    }
                </span>

                <span
                    className={"search-result-highlight"}
                >
                    {match}
                </span>
                <span>
                    {postfix}
                </span>
            </button>
        );
    });

    return (
        <>
            <button
                className={"search-results-page-header"}
                onClick={onHeaderClickHandler}
            >
                <div className={"search-results-page-header-page-num"}>
                    {collapsed ?
                        <CaretDownFill size={14}/> :
                        <CaretRightFill size={14}/>}
                    &nbsp;PAGE
                    {" "}
                    {pageNum + 1}
                </div>
                <div className={"search-results-page-header-result-count"}>
                    {results.searchResults.length}
                </div>
            </button>
            <div>
                {!collapsed && resultsRows}
            </div>
        </>
    );
};

export default SearchResultsGroup;
