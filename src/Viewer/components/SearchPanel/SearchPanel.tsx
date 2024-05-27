import {
    ReactElement,
    useState,
} from "react";
import {ProgressBar} from "react-bootstrap";
import {ExclamationTriangle} from "react-bootstrap-icons";

import {getModifiedUrl} from "../../services/utils";
import QueryInputForm from "./QueryInputForm";
import SearchPanelHeader from "./SearchPanelHeader";
import SearchResultsGroup from "./SearchResultsGroup";
import {
    Query, ResultGroup,
} from "./types";

import "./SearchPanel.scss";


// instead of 0 set progress as 5% to show something is being loaded
const QUERY_INITIAL_PROGRESS = 5;

interface SearchPanelProps {
    query: Query;
    handleQueryChange: (query: Query) => void;
    searchResultClickHandler: (logEventIdx: number) => void;
    searchResults: ResultGroup[] | null;
    totalPages: number;
    onStatusMessageChange: (message: string) => void;
}

/**
 * Renders a search panel for submitting and viewing queries.
 *
 * @param props
 * @param props.query
 * @param props.handleQueryChange
 * @param props.searchResultClickHandler
 * @param props.searchResults
 * @param props.totalPages
 * @param props.onStatusMessageChange
 * @return
 */
const SearchPanel = ({
    query,
    handleQueryChange,
    searchResults,
    searchResultClickHandler,
    totalPages,
    onStatusMessageChange,
}: SearchPanelProps) => {
    const [isAllCollapsed, setIsAllCollapsed] = useState(false);
    const [isDateAlwaysVisible, setIsDateAlwaysVisible] = useState(false);


    const handleCollapseAllClick = () => {
        setIsAllCollapsed(!isAllCollapsed);
    };
    const handleAlwaysShowDateClick = () => {
        setIsDateAlwaysVisible(!isDateAlwaysVisible);
    };

    const handleShareButtonClick = () => {
        const searchParams = {
            "query.searchString": query.searchString,
            "query.matchCase": query.matchCase,
            "query.isRegex": query.isRegex,
        };

        const link = getModifiedUrl(searchParams, {});

        navigator.clipboard.writeText(link).then(() => {
            onStatusMessageChange("Copied link to search query.");
        }, (err) => {
            onStatusMessageChange(`Failed to copy link to search query: ${err}`);
        });
    };

    let resultGroups: ReactElement[] = [];
    let progress = 0;
    let hasMoreResults = false;
    if (null !== searchResults) {
        resultGroups = searchResults.map((resultGroup, index) => (
            <SearchResultsGroup
                isAllCollapsed={isAllCollapsed}
                isDateAlwaysVisible={isDateAlwaysVisible}
                key={index}
                pageNum={resultGroup.page_num}
                resultClickHandler={searchResultClickHandler}
                results={resultGroup}/>
        ));
        const lastResult = searchResults[searchResults.length - 1];
        if ("undefined" === typeof lastResult) {
            progress = QUERY_INITIAL_PROGRESS;
        } else {
            progress = (lastResult.page_num + 1) /
                totalPages * 100;
            ({hasMoreResults} = lastResult);
        }
    }

    return (
        <>
            <div style={{padding: "0 15px"}}>
                <SearchPanelHeader
                    handleAlwaysShowDateClick={handleAlwaysShowDateClick}
                    handleCollapseAllClick={handleCollapseAllClick}
                    handleShareButtonClick={handleShareButtonClick}
                    isAllCollapsed={isAllCollapsed}
                    isDateAlwaysVisible={isDateAlwaysVisible}
                    isShareDisabled={0 === query.searchString.length}/>
                <QueryInputForm
                    query={query}
                    queryChangeHandler={handleQueryChange}/>
                <ProgressBar
                    animated={100 !== progress}
                    now={progress}
                    style={{height: "3px"}}
                    variant={100 === progress ?
                        "success" :
                        ""}/>
            </div>
            <div className={"search-results-container"}>
                {hasMoreResults &&
                    <div>
                        <ExclamationTriangle
                            color={"#FFBF00"}
                            size={14}/>
                        &nbsp;
                        <span>
                            The result set only contains a subset of all matches.
                            Be more specific in your search to narrow down the results.
                        </span>
                    </div>}
                {resultGroups}
            </div>
        </>
    );
};

export default SearchPanel;
