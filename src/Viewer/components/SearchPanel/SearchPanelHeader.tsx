import {
    ArrowsCollapse,
    ArrowsExpand,
    CalendarDate,
    CalendarX,
    ShareFill,
} from "react-bootstrap-icons";


interface SearchPanelHeaderProps {
    isAllCollapsed: boolean;
    isDateAlwaysVisible: boolean;
    isShareDisabled: boolean;
    handleAlwaysShowDateClick: () => void
    handleCollapseAllClick: () => void
    handleShareButtonClick: () => void
}

/**
 *
 * @param props
 * @param props.isAllCollapsed
 * @param props.isDateAlwaysVisible
 * @param props.isShareDisabled
 * @param props.handleAlwaysShowDateClick
 * @param props.handleCollapseAllClick
 * @param props.handleShareButtonClick
 */
const SearchPanelHeader = ({
    isAllCollapsed,
    isDateAlwaysVisible,
    isShareDisabled,
    handleAlwaysShowDateClick,
    handleCollapseAllClick,
    handleShareButtonClick,
}: SearchPanelHeaderProps) => (
    <div className={"tab-search-header"}>
        <div className={"tab-search-header-text"}>SEARCH</div>
        <button
            className={"tab-search-header-button"}
            title={isDateAlwaysVisible ?
                "Show matching text" :
                "Always show date"}
            onClick={handleAlwaysShowDateClick}
        >
            {isDateAlwaysVisible ?
                <CalendarX/> :
                <CalendarDate/>}
        </button>
        <button
            className={"tab-search-header-button"}
            title={isAllCollapsed ?
                "Expand all" :
                "Collapse all"}
            onClick={handleCollapseAllClick}
        >
            {isAllCollapsed ?
                <ArrowsExpand/> :
                <ArrowsCollapse/>}
        </button>
        <button
            className={"tab-search-header-button"}
            disabled={isShareDisabled}
            title={"Share query"}
            onClick={handleShareButtonClick}
        >
            <ShareFill/>
        </button>
    </div>
);

export default SearchPanelHeader;
