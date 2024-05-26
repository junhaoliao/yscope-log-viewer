import {
    ListObjectsCommand,
    S3Client,
} from "@aws-sdk/client-s3";


interface IParsedObjectInfo {
    appName: string;
    basename: string;
    endpoint: string | null;
    prefix: string;
    timestamp: number;
}

class S3Scanner {
    static readonly #S3_ENDPOINT: string = process.env.S3_ENDPOINT ?? "";

    static readonly #S3_BUCKET: string = process.env.S3_BUCKET ?? "";

    #s3Client: S3Client;

    /**
     * Parses object info from its URL or path.
     *
     * @param urlOrPath full URL of the s3 object, or path (without the gateway endpoint URL)
     */
    static #parseObjectInfo (urlOrPath: string): IParsedObjectInfo | null {
        let pathname: string | null = null;
        let endpoint: string | null = null;
        try {
            (
                {origin: endpoint, pathname} = new URL(urlOrPath)
            );
        } catch (e) {
            pathname = urlOrPath;
        }

        const lastSlashIndex = pathname.lastIndexOf("/");
        if (-1 === lastSlashIndex) {
            return null;
        }

        const prefix = pathname.substring(0, lastSlashIndex + 1);
        const basename = pathname.substring(lastSlashIndex + 1);
        const match = basename.match(/^(.*)\.(\d+)\.(.*)$/);

        if (null === match) {
            return null;
        }

        const [,
            appName,
            timestampString] = match;

        if ("undefined" === typeof appName || "undefined" === typeof timestampString) {
            return null;
        }

        return {
            appName: appName,
            basename: basename,
            endpoint: endpoint,
            prefix: prefix,
            timestamp: parseInt(timestampString, 10),
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
                MaxKeys: 1000,
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
}

export default S3Scanner;
