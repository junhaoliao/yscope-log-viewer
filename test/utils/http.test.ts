import {StatusCodes} from "http-status-codes";

import {
    getJsonObjectFrom,
    getUint8ArrayFrom,
} from "../../src/utils/http";


const handleProgress = jest.fn((loaded, total) => {
    expect(loaded).toBeGreaterThanOrEqual(0);
    expect(total).toBeGreaterThanOrEqual(0);
});

beforeEach(() => {
    handleProgress.mockReset();
});

describe("getJsonObjectFrom", () => {
    it("should fetch a JSON with an optional progress callback and return a object", async () => {
        const url = "https://httpbin.org/json";
        const expected = {
            slideshow: {
                author: "Yours Truly",
                date: "date of publication",
                slides: [
                    {
                        title: "Wake up to WonderWidgets!",
                        type: "all",
                    },
                    {
                        items: [
                            "Why <em>WonderWidgets</em> are great",
                            "Who <em>buys</em> WonderWidgets",
                        ],
                        title: "Overview",
                        type: "all",
                    },
                ],
                title: "Sample Slide Show",
            },
        };

        let result = await getJsonObjectFrom<Record<string, never>>(url);
        expect(result).toEqual(expected);

        result = await getJsonObjectFrom<Record<string, never>>(url, handleProgress);
        expect(result).toEqual(expected);
        expect(handleProgress).toHaveBeenCalled();
    });

    it("should fetch and return a string if response is non-JSON", async () => {
        const result = await getJsonObjectFrom<string>("https://httpbin.org/html");

        expect(result).toContain("<html");
    });
});

describe("getUint8ArrayFrom", () => {
    it(
        "should fetch a file with an optional progress callback and return a Uint8Array",
        async () => {
            const myString = "hello";
            const myDataArray = new TextEncoder().encode(myString);
            const url = `https://httpbin.org/base64/${btoa(myString)}`;

            let result = await getUint8ArrayFrom(url);
            expect(result).toEqual(myDataArray);

            result = await getUint8ArrayFrom(url, handleProgress);
            expect(result).toEqual(myDataArray);
            expect(handleProgress).toHaveBeenCalled();
        }
    );
});

describe("normalizeTotalSize", () => {
    it(
        'should normalize total size if the response headers do not contain "Content-Length"',
        async () => {
            await getUint8ArrayFrom(
                "https://httpbin.org/stream-bytes/4",
                handleProgress
            );

            expect(handleProgress).toHaveBeenCalled();
        }
    );
});

describe("Invalid HTTP sources", () => {
    it(
        "should cause a custom error to be thrown when the HTTP request is not successful",
        async () => {
            const url = `https://httpbin.org/status/${StatusCodes.NOT_FOUND}`;
            await expect(getJsonObjectFrom(url)).rejects.toMatchObject({
                message: `Request failed with status code ${StatusCodes.NOT_FOUND}`,
                cause: {
                    url: url,
                },
            });
            await expect(getUint8ArrayFrom(url)).rejects.toMatchObject({
                message: `Request failed with status code ${StatusCodes.NOT_FOUND}`,
                cause: {
                    url: url,
                },
            });
        }
    );

    it("should cause a TypeError to be thrown when the URL is invalid", async () => {
        const url = "/";
        await expect(() => getJsonObjectFrom(url)).rejects.toThrow({
            name: "TypeError",
            message: "Invalid URL",
        });
        await expect(() => getUint8ArrayFrom(url)).rejects.toThrow({
            name: "TypeError",
            message: "Invalid URL",
        });
    });
});
