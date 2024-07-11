import {
    ListObjectsCommand,
    S3Client,
} from "@aws-sdk/client-s3";


interface IParsedObjectInfo {
    appName: string;
    basename: string;
    endpoint: string | null;
    prefix: string;
    timestamp: number | null;
}

class S3Scanner {
    static readonly #S3_LIST_OBJECTS_MAX_KEYS_MAX_VALUE = 1000;

    static readonly #S3_URL: string = `https://${process.env.S3_BUCKET}.${new URL(process.env.S3_ENDPOINT ?? "").host}`;

    static readonly #S3_ENDPOINT: string = (window.location.origin === S3Scanner.#S3_URL) ?
        (process.env.S3_ENDPOINT ?? "") :
        (process.env.S3_ALTERNATE_ENDPOINT ?? "");

    static readonly #S3_BUCKET: string = (window.location.origin === S3Scanner.#S3_URL) ?
        (process.env.S3_BUCKET ?? "") :
        (process.env.S3_ALTERNATE_BUCKET ?? "");

    #s3Client: S3Client;

    /**
     * Parses object info from its URL or path.
     *
     * @param urlOrPath full URL of the s3 object, or path (without the gateway endpoint URL)
     */
    static #parseObjectInfo (urlOrPath: string): IParsedObjectInfo | null {
        let endpoint: string | null = null;
        let pathname: string;
        try {
            const s3EndpointUrl = new URL(S3Scanner.#S3_ENDPOINT);
            endpoint = `https://${S3Scanner.#S3_BUCKET}.${s3EndpointUrl.host}${s3EndpointUrl.pathname}`;
            pathname = urlOrPath.replace(endpoint, "");
        } catch (e) {
            pathname = urlOrPath;
        }

        const lastSlashIndex = pathname.lastIndexOf("/");
        if (-1 === lastSlashIndex) {
            return null;
        }

        const prefix = pathname.substring(0, lastSlashIndex + 1);
        const basename = pathname.substring(lastSlashIndex + 1);
        const withTimestampMatch = basename.match(/^(.*)\.(\d+)\.(.*)$/);

        let appName;
        let timestampString;
        if (null !== withTimestampMatch) {
            ([
                ,
                appName,
                timestampString,
            ] = withTimestampMatch);
        } else {
            // assume a prefix is provided in the basename part,
            // which fully or partially contains the appName
            appName = basename;
        }

        if ("undefined" === typeof appName) {
            return null;
        }

        // Parses the timestamp
        // If the provided url is only a prefix, the timestamp might not be available.
        const timestamp = ("undefined" === typeof timestampString) ?
            null :
            parseInt(timestampString, 10);

        return {
            appName: appName,
            basename: basename,
            endpoint: endpoint,
            prefix: prefix,
            timestamp: timestamp,
        };
    }

    constructor () {
        this.#s3Client = new S3Client({
            endpoint: S3Scanner.#S3_ENDPOINT,
            region: S3Scanner.#S3_BUCKET,
            // eslint-disable-next-line @typescript-eslint/require-await
            signer: {sign: async (request) => (request)},
        });
    }

    /**
     * Queries the "previous" object's path, whose timestamp is right lower than the current object,
     * by assuming the log files named with below format:
     *      `appName.timestamp.clp.zst`
     *
     * @param objectPath of current
     */
    public async getPrevObject (objectPath: string): Promise<string | null> {
        const objectInfo = S3Scanner.#parseObjectInfo(objectPath);
        if (null === objectInfo || null === objectInfo.endpoint) {
            return null;
        }

        const {appName, endpoint, prefix, timestamp} = objectInfo;
        let marker = appName;
        let lastKeyOnLastPage: string | null = null;

        while (true) {
            const input = {
                Bucket: S3Scanner.#S3_BUCKET,
                MaxKeys: S3Scanner.#S3_LIST_OBJECTS_MAX_KEYS_MAX_VALUE,
                Marker: marker,
                Prefix: prefix,
            };

            const command = new ListObjectsCommand(input);

            try {
                const response = await this.#s3Client.send(command);

                if ("undefined" !== typeof response.NextMarker) {
                    const lastObjectInfo = S3Scanner.#parseObjectInfo(response.NextMarker);

                    if (null === lastObjectInfo) {
                        console.error(
                            "Unable to parse info of last object listed by ListObjects:",
                            response.NextMarker
                        );

                        return null;
                    }

                    if (lastObjectInfo.appName === appName &&
                        lastObjectInfo.timestamp < timestamp) {
                        // the current item is on the next page
                        marker = response.NextMarker;

                        // in case the current item is the first one on the next page,
                        // backup this potential previous item
                        lastKeyOnLastPage = response.NextMarker;

                        // query the next page
                        continue;
                    }
                }

                // Binary search to find position of the current object
                const {Contents} = response;

                if ("undefined" === typeof Contents) {
                    console.error("Unexpected empty Contents in ListObjects response:", response);

                    return null;
                }

                let lowerBound = 0;
                let upperBound = 1 + Contents.findLastIndex((element) => {
                    if ("undefined" === typeof element.Key) {
                        return false;
                    }
                    const elementInfo = S3Scanner.#parseObjectInfo(element.Key);
                    return elementInfo?.appName === appName;
                });

                let midIndex = Math.floor((lowerBound + upperBound) / 2);

                while (lowerBound < upperBound) {
                    const midFile = Contents[midIndex];

                    if ("undefined" === typeof midFile || "undefined" === typeof midFile.Key) {
                        console.error(`Undefined midFile.Key, Contents=${Contents.toString()
                        }, midIndex=${midIndex}`);

                        return null;
                    }

                    const midFileInfo = S3Scanner.#parseObjectInfo(midFile.Key);

                    if (null === midFileInfo) {
                        console.error(
                            "Unable to parse info of mid object during binary search:",
                            response.NextMarker
                        );

                        return null;
                    }

                    if (midFileInfo.timestamp < timestamp) {
                        lowerBound = midIndex + 1;
                    } else if (midFileInfo.timestamp > timestamp) {
                        upperBound = midIndex - 1;
                    } else {
                        // Found location of current item
                        break;
                    }

                    midIndex = Math.floor((lowerBound + upperBound) / 2);
                }

                const prevItemIdx = midIndex - 1;

                if (-1 === prevItemIdx) {
                    return lastKeyOnLastPage && (endpoint + lastKeyOnLastPage);
                }

                const prevItem = Contents[prevItemIdx];

                if ("undefined" === typeof prevItem) {
                    return null;
                }

                const prevKey = prevItem.Key ?? null;

                return prevKey && (endpoint + prevKey);
            } catch (e) {
                console.error("Error happened in ListObjectsCommand:", e);

                return null;
            }
        }
    }

    /**
     * Queries the "next" object's path, whose timestamp is right larger than the current object.
     *
     * @param objectPath of current
     */
    public async getNextObject (objectPath: string): Promise<string | null> {
        const objectInfo = S3Scanner.#parseObjectInfo(objectPath);
        if (null === objectInfo || null === objectInfo.endpoint) {
            return null;
        }

        const {prefix, appName, basename, endpoint} = objectInfo;
        const input = {
            Bucket: S3Scanner.#S3_BUCKET,
            MaxKeys: 1,
            Marker: basename,
            Prefix: prefix,
        };

        try {
            const command = new ListObjectsCommand(input);
            const response = await this.#s3Client.send(command);

            if ("undefined" === typeof response.NextMarker) {
                return null;
            }

            const nextItemInfo = S3Scanner.#parseObjectInfo(response.NextMarker);

            if (null === nextItemInfo || nextItemInfo.appName !== appName) {
                return null;
            }

            return endpoint + response.NextMarker;
        } catch (e) {
            console.error("Error happened in ListObjectsCommand:", e);

            return null;
        }
    }

    /**
     * Queries the "begin" object's path starting with the same prefix.
     *
     * @param objectPath of current
     */
    public async getBeginObject (objectPath: string): Promise<string | null> {
        const objectInfo = S3Scanner.#parseObjectInfo(objectPath);
        if (null === objectInfo || null === objectInfo.endpoint) {
            return null;
        }

        const {prefix, endpoint, appName} = objectInfo;
        const input = {
            Bucket: S3Scanner.#S3_BUCKET,
            MaxKeys: 1,
            Prefix: prefix,
            Marker: appName,
        };

        try {
            const command = new ListObjectsCommand(input);
            const response = await this.#s3Client.send(command);

            const {Contents} = response;

            if ("undefined" === typeof Contents || 0 === Contents.length) {
                return null;
            }

            const [firstItem] = Contents;
            const firstKey = firstItem?.Key ?? null;

            return firstKey && (endpoint + firstKey);
        } catch (e) {
            console.error("Error happened in ListObjectsCommand:", e);

            return null;
        }
    }

    /**
     * Queries the "end" object's path starting with the same prefix.
     *
     * @param objectPath of current
     */
    public async getEndObject (objectPath: string): Promise<string | null> {
        const objectInfo = S3Scanner.#parseObjectInfo(objectPath);
        if (null === objectInfo || null === objectInfo.endpoint) {
            return null;
        }

        const {appName, prefix, endpoint} = objectInfo;
        let marker: string = appName;
        let lastKey: string | null = null;

        while (true) {
            const input = {
                Bucket: S3Scanner.#S3_BUCKET,
                MaxKeys: S3Scanner.#S3_LIST_OBJECTS_MAX_KEYS_MAX_VALUE,
                Prefix: prefix,
                Marker: marker,
            };

            const command = new ListObjectsCommand(input);

            try {
                const response = await this.#s3Client.send(command);
                const {Contents} = response;

                if ("undefined" === typeof Contents || 0 === Contents.length) {
                    break;
                }

                const lastObjectIndex = Contents.findLastIndex((element) => {
                    if ("undefined" === typeof element.Key) {
                        return false;
                    }
                    const elementInfo = S3Scanner.#parseObjectInfo(element.Key);

                    return elementInfo?.appName === appName;
                });

                lastKey = Contents[lastObjectIndex]?.Key ?? lastKey;
                console.log(lastKey);

                // Stop querying the next page when the last object is found:
                //  - if this page has been the last page OR
                //  - the last appName matching object isn't the last one enumerated
                if ("undefined" === typeof response.NextMarker ||
                    lastObjectIndex !== Contents.length - 1) {
                    break;
                }

                marker = response.NextMarker;
            } catch (e) {
                console.error("Error happened in ListObjectsCommand:", e);

                return null;
            }
        }

        return lastKey && (endpoint + lastKey);
    }
}

export default S3Scanner;
