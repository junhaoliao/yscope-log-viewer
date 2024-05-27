// FIXME: move this into a shared location by the UI and service workers
interface Query {
    searchString: string;
    matchCase: boolean;
    isRegex: boolean;
}

interface SearchResult {
    content: string;
    eventIndex: number;
    match: string;
}

interface ResultGroup {
    page_num: number;
    searchResults: SearchResult[];
    hasMoreResults: boolean;
}

export {
    Query,
    ResultGroup,
};
