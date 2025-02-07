import {StatusCodes} from "http-status-codes";

import {
    getJsonObjectFrom,
    getUint8ArrayFrom,
} from "../../src/utils/http";


describe("getJsonObjectFrom", () => {
    it("should fetch with progress callback and return a JSON object", async () => {
        const handleProgress = jest.fn((loaded, total) => {
            expect(loaded).toBeGreaterThanOrEqual(0);
            expect(total).toBeGreaterThanOrEqual(0);
        });
        const result = await getJsonObjectFrom<Record<string, never>>(
            "https://httpbin.org/json",
            handleProgress
        );

        expect(handleProgress).toHaveBeenCalled();
        expect(result).toEqual({
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
        });
    });

    it("should fetch and return a string if response is non-JSON", async () => {
        const result = await getJsonObjectFrom<string>("https://httpbin.org/html");

        expect(result).toContain("<html");
    });

    it("should handle HTTP error and throw custom error", async () => {
        const url = `https://httpbin.org/status/${StatusCodes.NOT_FOUND}`;
        await expect(getJsonObjectFrom(url)).rejects.toMatchObject({
            message: `Request failed with status code ${StatusCodes.NOT_FOUND}`,
            cause: {
                url: url,
            },
        });
    });
});

describe("getUint8ArrayFrom", () => {
    it("should fetch a file and return a Uint8Array", async () => {
        const myString = "hello";
        const myDataArray = new TextEncoder().encode(myString);
        const handleProgress = jest.fn((loaded, total) => {
            expect(loaded).toBeGreaterThanOrEqual(0);
            expect(total).toBeGreaterThanOrEqual(0);
        });
        const result = await getUint8ArrayFrom(
            `https://httpbin.org/base64/${btoa(myString)}`,
            handleProgress
        );

        expect(handleProgress).toHaveBeenCalled();
        expect(result).toEqual(myDataArray);
    });

    it("should handle HTTP error and throw a custom error", async () => {
        const url = `https://httpbin.org/status/${StatusCodes.NOT_FOUND}`;
        await expect(getUint8ArrayFrom(url)).rejects.toMatchObject({
            message: `Request failed with status code ${StatusCodes.NOT_FOUND}`,
            cause: {
                url: url,
            },
        });
    });
});
