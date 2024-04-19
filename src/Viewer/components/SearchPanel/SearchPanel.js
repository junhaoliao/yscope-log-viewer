import PropTypes from "prop-types";
import React, {
    useEffect, useState,
} from "react";
import {ProgressBar} from "react-bootstrap";
import {
    ArrowsCollapse,
    ArrowsExpand,
    CaretDownFill,
    CaretRightFill,
    ExclamationTriangle,
    Regex,
    ShareFill,
} from "react-bootstrap-icons";

import {getModifiedUrl} from "../../services/utils";

import "./SearchPanel.scss";


/**
 * Callback when the query is changed
 *
 * @callback QueryChangeHandler
 * @param {string} query
 */

/**
 * Callback when a result is clicked
 *
 * @callback SearchResultClickHandler
 * @param {number} logEventIdx
 */

/**
 * Renders a search panel for submitting and viewing queries.
 *
 * @param {object} props
 * @param {object} props.query
 * @param {QueryChangeHandler} props.queryChangeHandler
 * @param {SearchResultClickHandler} props.searchResultClickHandler
 * @param {Array} props.searchResults
 * @param {number} props.totalPages
 * @param {Function} props.onStatusMessageChange
 * @return {React.ReactElement}
 */
const SearchPanel = ({
    query,
    queryChangeHandler,
    searchResults,
    searchResultClickHandler,
    totalPages,
    onStatusMessageChange,
}) => {
    const [isAllCollapsed, setIsAllCollapsed] = useState(false);

    const handleCollapseAllClick = () => {
        setIsAllCollapsed(!isAllCollapsed);
    };

    const handleShareButtonClick = () => {
        const searchParams = {
            "query.searchString": query.searchString,
            "query.matchCase": query.matchCase,
            "query.isRegex": query.isRegex,
        };

        const link = getModifiedUrl(
            searchParams,
            {}
        );

        navigator.clipboard.writeText(link).then(() => {
            onStatusMessageChange("Copied link to search query.");
        }, (err) => {
            onStatusMessageChange(`Failed to copy link to search query: ${err}`);
        });
    };

    const queryInputChangeHandler = (e) => {
        // auto resize height of the input box
        e.target.style.height = 0;
        e.target.style.height = `${e.target.scrollHeight + 6}px`;

        const newQuery = e.target.value;
        queryChangeHandler({...query, searchString: newQuery});
    };

    const queryButtonClickHandler = (e) => {
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

    let resultGroups = <></>;
    let progress = null;
    let hasMoreResults = false;
    if (null !== searchResults) {
        resultGroups = searchResults.map((resultGroup, index) => (
            <SearchResultsGroup
                isAllCollapsed={isAllCollapsed}
                key={index}
                pageNum={resultGroup.page_num}
                resultClickHandler={searchResultClickHandler}
                results={resultGroup}/>
        ));
        if (searchResults.length) {
            progress = (searchResults[searchResults.length - 1].page_num + 1) /
                totalPages * 100;
            hasMoreResults = searchResults[searchResults.length - 1].hasMoreResults;
        } else {
            // instead of 0 set progress as 5% to show something is being loaded
            progress = 5;
        }
    }

    return (
        <>
            <div style={{padding: "0 15px"}}>
                <div className={"tab-search-header"}>
                    <div className={"tab-search-header-text"}>SEARCH</div>
                    <button
                        className={"tab-search-header-button"}
                        disabled={0 === query.searchString.length}
                        title={"Share query"}
                        onClick={handleShareButtonClick}
                    >
                        <ShareFill/>
                    </button>
                    <button
                        className={"tab-search-header-button"}
                        title={"Collapse All"}
                        onClick={handleCollapseAllClick}
                    >
                        {isAllCollapsed ?
                            <ArrowsExpand/> :
                            <ArrowsCollapse/>}
                    </button>
                </div>
                <form style={{display: "flex"}}>
                    <textarea
                        className={"search-input"}
                        placeholder={"Query"}
                        style={{paddingRight: "66px"}}
                        value={query.searchString}
                        onChange={queryInputChangeHandler}
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
                            onClick={queryButtonClickHandler}
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
                            onClick={queryButtonClickHandler}
                        >
                            <Regex/>
                        </button>
                    </span>
                </form>
                {(null !== progress) &&
                    <ProgressBar
                        animated={100 !== progress}
                        now={progress}
                        style={{height: "3px"}}
                        variant={100 === progress ?
                            "success" :
                            undefined}/>}
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

SearchPanel.propTypes = {
    query: PropTypes.object,
    queryChangeHandler: PropTypes.func,
    searchResultClickHandler: PropTypes.func,
    searchResults: PropTypes.array,
    totalPages: PropTypes.number,
};

/**
 * Callback used to set collapse all flag
 *
 * @callback SetCollapseAll
 * @param {boolean} collapseAll
 */

/**
 * Callback when a result is clicked
 *
 * @callback ResultClickHandler
 * @param {number} logEventIdx
 */

/**
 * The search results on a page
 *
 * @param {object} props
 * @param {boolean} props.isAllCollapsed
 * @param {number} props.pageNum
 * @param {object} props.results
 * @param {ResultClickHandler} props.resultClickHandler
 * @return {JSX.Element}
 */
const SearchResultsGroup = ({
    isAllCollapsed,
    pageNum,
    results,
    resultClickHandler,
}) => {
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
        const [prefix] = split;
        const postfix = split.slice(1).join(match);

        return (
            <button
                className={"search-result-button"}
                key={eventIndex}
                onClick={() => {
                    resultClickHandler(eventIndex + 1);
                }}
            >
                {/* Cap prefix length to be 25 characters
                     so highlighted text can be shown */}
                <span>
                    {(25 < prefix.length) && "..."}
                    {prefix.slice(-25)}
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

SearchResultsGroup.propTypes = {
    isAllCollapsed: PropTypes.bool,
    pageNum: PropTypes.number,
    results: PropTypes.object,
    resultClickHandler: PropTypes.func,
};


export default SearchPanel;
