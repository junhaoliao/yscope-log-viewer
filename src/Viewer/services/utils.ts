import MODIFY_PAGE_ACTION from "./MODIFY_PAGE_ACTION";


/**
 * Modifies the page by performing the specified action.
 *
 * @param action The action to be performed.
 * @param currentPage The current page number.
 * @param requestedPage The page number requested.
 * @param pages The total number of pages.
 * @return A tuple containing the line position and the new page number.
 */
const modifyPage = (
    action: MODIFY_PAGE_ACTION,
    currentPage: number,
    requestedPage: number,
    pages: number
): [string | null, number | null] => {
    let newPage: number | null;
    let linePos: string | null;
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
            newPage = (0 < requestedPage && requestedPage <= pages) ?
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
 * @param path The path to be resolved.
 * @return The absolute URL as a string.
 */
const getAbsoluteUrl = (path: string): string => {
    try {
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
 * @return The parsed file path or null if not found.
 */
const getFilePathFromWindowLocation = (): string | null => {
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
 * @param newSearchParams Object containing new search parameters.
 * @param newHashParams Object containing new hash parameters.
 * @return The modified URL as a string.
 */
const getModifiedUrl = (
    newSearchParams: Record<string, string | null | false>,
    newHashParams: Record<string, string | null>
): string => {
    const url = new URL(`${window.location.origin}${window.location.pathname}`);
    let filePath = getFilePathFromWindowLocation();

    const locationSearchWithoutFilePath = window.location.search
        .split(
            (null === filePath) ?
                "" :
                `filePath=${filePath}`
        )
        .join("");

    const urlSearchParams = new URLSearchParams(locationSearchWithoutFilePath);
    const urlHashParams = new URLSearchParams(window.location.hash.substring(1));

    Object.entries(newSearchParams).forEach(([key, value]) => {
        if ("filePath" === key) {
            if ("string" !== typeof value) {
                throw new Error(`Unexpected filePath type: ${typeof value}`);
            }
            filePath = value;
            urlSearchParams.delete(key);
        } else if (null === value || false === value) {
            urlSearchParams.delete(key);
        } else {
            urlSearchParams.set(key, value.toString());
        }
    });

    Object.entries(newHashParams).forEach(([key, value]) => {
        if (null === value) {
            urlHashParams.delete(key);
        } else {
            urlHashParams.set(key, value.toString());
        }
    });

    let urlSearchParamsAsString = urlSearchParams.toString();
    if (!(/%23|%26/).test(urlSearchParamsAsString)) {
        urlSearchParamsAsString = decodeURIComponent(urlSearchParamsAsString);
    }

    url.search = urlSearchParamsAsString;
    if (null !== filePath) {
        url.search += `${0 === urlSearchParams.size ?
            "" :
            "&"}filePath=${filePath}`;
    }

    url.hash = urlHashParams.toString();

    return url.toString();
};

/**
 * Parses a value into a number if it is numeric.
 *
 * @param value The value to parse.
 * @return The parsed number or null if the value is not numeric.
 */
const parseNum = (value: unknown): number | null => {
    const isNumeric = "number" === typeof value ||
        ("string" === typeof value && (/^-?\d+$/).test(value));

    if (isNumeric) {
        return Number(value);
    }

    return null;
};

/**
 * Given a list of log events, finds the first log event whose timestamp is
 * greater than or equal to the given timestamp, using binary search.
 *
 * @param timestamp The timestamp to search for as milliseconds since the UNIX epoch.
 * @param logEventMetadata An array containing log event metadata
 * objects, where the "timestamp" key in each object is the event's timestamp as milliseconds
 * since the UNIX epoch.
 * @return Index of the log event if found, or null otherwise.
 */
const binarySearchWithTimestamp = (
    timestamp: number,
    logEventMetadata: { timestamp: number }[]
): number | null => {
    if (0 === logEventMetadata.length) {
        return null;
    }

    let low = 0;
    let high = logEventMetadata.length - 1;
    let mid;

    // @ts-expect-error `low=0` is greater than `logEventMetadata.length`
    if (timestamp <= logEventMetadata[low].timestamp) {
        return low;
    }

    // @ts-expect-error `high=length-1` is less than `logEventMetadata.length`
    if (logEventMetadata[high].timestamp < timestamp) {
        return null;
    }

    while (low <= high) {
        mid = Math.floor((low + high) / 2);

        // @ts-expect-error low <= mid <= high
        if (logEventMetadata[mid].timestamp >= timestamp) {
            // @ts-expect-error low <= mid <= high
            if (logEventMetadata[mid - 1].timestamp < timestamp) {
                return mid;
            }
            high = mid - 1;
        } else {
            low = mid + 1;
        }
    }

    return null;
};

export {
    binarySearchWithTimestamp,
    getAbsoluteUrl,
    getFilePathFromWindowLocation,
    getModifiedUrl,
    modifyPage,
    parseNum,
};
