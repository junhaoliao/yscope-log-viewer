import MODIFY_PAGE_ACTION from "./MODIFY_PAGE_ACTION";


/**
 * Modifies the page by performing the specified action.
 *
 * @param {string} action
 * @param {number} currentPage
 * @param {number} requestedPage
 * @param {number} pages
 * @return {*}
 */
const modifyPage = (action, currentPage, requestedPage, pages) => {
    let newPage;
    let linePos;
    switch (action) {
        case MODIFY_PAGE_ACTION.firstPage:
            newPage = 1;
            linePos = "top";
            break;
        case MODIFY_PAGE_ACTION.lastPage:
            newPage = pages;
            linePos = "bottom";
            break;
        case MODIFY_PAGE_ACTION.newPage:
            const isValidPage = (0 < requestedPage && requestedPage <= pages);
            newPage = (isValidPage) ?
                requestedPage :
                null;
            linePos = "top";
            break;
        case MODIFY_PAGE_ACTION.prevPage:
            newPage = (0 < currentPage - 1) ?
                currentPage - 1 :
                null;
            linePos = "bottom";
            break;
        case MODIFY_PAGE_ACTION.nextPage:
            newPage = (currentPage + 1 <= pages) ?
                currentPage + 1 :
                null;
            linePos = "top";
            break;
        default:
            newPage = null;
            linePos = null;
            break;
    }

    return [linePos,
        newPage];
};

/**
 * Returns the absolute URL of a given path relative to the window.location,
 * if the given path is a relative one.
 *
 * @param {string} path that is either absolute or relative
 * @return {string}
 */
const getAbsoluteUrl = (path) => {
    try {
        // This URL() constructor should only succeed if `path`
        //  has a "protocol" scheme like "http:"
        // eslint-disable-next-line no-new
        new URL(path);
    } catch (e) {
        path = new URL(path, window.location.origin).href;
    }

    return path;
};

/**
 * Parses `filePath` from the current window location's search query.
 *
 * @return {string|null} The parsed file path or
 * null if not found.
 */
const getFilePathFromWindowLocation = () => {
    let [, filePath] = window.location.search.split("filePath=");

    if ("undefined" === typeof filePath) {
        return null;
    }

    filePath = filePath.substring(filePath.indexOf("#"));

    return getAbsoluteUrl(filePath);
};

/**
 * Get modified URL from `window.location` based on the provided search and
 * hash parameters.
 *
 * @param {object} searchParams
 * @param {object} hashParams
 * @return {string} modified URL
 */
const getModifiedUrl = (searchParams, hashParams) => {
    const url = new URL(`${window.location.origin}${window.location.pathname}`);
    let filePath = getFilePathFromWindowLocation();

    const locationSearchWithoutFilePath = window.location.search
        .split(`filePath=${filePath}`)
        .join("");

    const urlSearchParams = new URLSearchParams(locationSearchWithoutFilePath);
    const urlHashParams = new URLSearchParams(window.location.hash.substring(1));

    Object.entries(searchParams).forEach(([key, value]) => {
        if ("filePath" === key) {
            // to be appended as the last parameter
            filePath = value;
            urlSearchParams.delete(key);
        } else if (null === value || false === value) {
            urlSearchParams.delete(key);
        } else {
            urlSearchParams.set(key, value.toString());
        }
    });
    Object.entries(hashParams).forEach(([key, value]) => {
        if (null === value) {
            urlHashParams.delete(key);
        } else {
            urlHashParams.set(key, value.toString());
        }
    });

    let urlSearchParamsAsString = urlSearchParams.toString();
    if (false === (/%23|%26/).test(urlSearchParamsAsString)) {
        // avoid encoding the URL
        // if it does not contain `%23`(`#`) or `%26`(`&`)
        urlSearchParamsAsString = decodeURIComponent(urlSearchParamsAsString);
    }

    url.search = urlSearchParamsAsString;
    if (null !== filePath) {
        url.search += `${(0 === urlSearchParams.size) ?
            "" :
            "&"}filePath=${filePath}`;
    }

    url.hash = urlHashParams.toString();

    return url.toString();
};

/**
 * Tests if the provided value is numeric
 *
 * @param {string|number|boolean} value
 * @return {boolean}
 */
function isNumeric (value) {
    if ("string" === typeof value) {
        return (/^-?\d+$/).test(value);
    }

    return ("number" === typeof value);
}

/**
 * Given a list of log events, finds the first log event whose timestamp is
 * greater than or equal to the given timestamp, using binary search. The given
 * list must be sorted in increasing timestamp order.
 *
 * @param {number} timestamp The timestamp to search for as milliseconds since
 * the UNIX epoch.
 * @param {object[]} logEventMetadata An array containing log event metadata
 * objects, where the "timestamp" key in each object is the event's timestamp as
 * milliseconds since the UNIX epoch.
 * @return {number|null} Index of the log event if found, or null otherwise
 */
function binarySearchWithTimestamp (timestamp, logEventMetadata) {
    const {length} = logEventMetadata;

    let low = 0;
    let high = length - 1;
    let mid;

    // Early exit
    if (0 === length) {
        return null;
    }
    if (timestamp <= logEventMetadata[low].timestamp) {
        return low;
    }
    if (logEventMetadata[high].timestamp < timestamp) {
        return null;
    }

    // Notice that the given timestamp might not show up in the events
    // Suppose we have a list of timestamp: [2, 4, 4, 5, 6, 7],
    // if timestamp = 3 is given, we should return the index of the first "4"
    while (low <= high) {
        mid = Math.floor((low + high) / 2);
        if (logEventMetadata[mid].timestamp >= timestamp) {
            if (logEventMetadata[mid - 1].timestamp < timestamp) {
                return mid;
            }
            high = mid - 1;
        } else {
            low = mid + 1;
        }
    }

    // Not found
    return null;
}

export {
    binarySearchWithTimestamp,
    getAbsoluteUrl,
    getFilePathFromWindowLocation,
    getModifiedUrl,
    isNumeric,
    modifyPage,
};
