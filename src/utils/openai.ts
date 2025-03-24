/* eslint-disable max-classes-per-file */
import {Nullable} from "../typings/common";


interface OpenAiStreamingResponseDelta {
    content: Nullable<string>;
    role: string;
}

interface OpenAiStreamingResponseChoice {
    index: number;
    delta: OpenAiStreamingResponseDelta;
}

interface OpenAiStreamingResponse {
    id: string;
    object: string;
    model: string;
    created: number;
    choices: OpenAiStreamingResponseChoice[];
}

const OPEN_AI_STREAMING_PREFIX: string = "data: ";
const OPEN_AI_STREAMING_DONE_PREFIX: string = "data: [DONE]";

class NewlineDelimitedStream extends TransformStream<Uint8Array, string> {
    private buffer: string = "";

    private decoder: TextDecoder;

    constructor () {
        super({
            transform: (chunk, controller) => {
                this.transform(chunk, controller);
            },
            flush: (controller) => {
                this.transform(new Uint8Array(), controller);
                if (0 !== this.buffer.length) {
                    controller.enqueue(this.buffer);
                    this.buffer = "";
                }
            },
        });
        this.decoder = new TextDecoder("utf-8");
    }

    transform = (chunk: Uint8Array, controller: TransformStreamDefaultController<string>): void => {
        let buffer = this.buffer + this.decoder.decode(chunk);
        let position: number = buffer.search(/\n/);
        while (-1 !== position) {
            controller.enqueue(buffer.substring(0, position));
            buffer = buffer.substring(position + 1);
            position = buffer.search(/\n/);
        }
        this.buffer = buffer;
    };
}


class OpenAiDeltaStream extends TransformStream<string, string> {
    constructor () {
        super({
            transform: (chunk, controller) => {
                if ("" === chunk || OPEN_AI_STREAMING_DONE_PREFIX === chunk) {
                    return;
                }
                if (false === chunk.startsWith(OPEN_AI_STREAMING_PREFIX)) {
                    return;
                }
                const openAiResponse: OpenAiStreamingResponse =
                    JSON.parse(
                        chunk.substring(
                            OPEN_AI_STREAMING_PREFIX.length
                        )
                    ) as OpenAiStreamingResponse;
                const deltaString = openAiResponse.choices[0]?.delta.content;
                if (null === deltaString) {
                    // The final delta content of an OpenAI stream is null.
                    return;
                }
                if ("undefined" === typeof deltaString) {
                    throw new Error("Malformed response from LLM.");
                }
                controller.enqueue(deltaString);
            },
        });
    }
}


/**
 * Parse a `ReadableStream` with OpenAI's response format.
 *
 * @param stream
 * @return a `ReadableStream` where each `read()` gets a delta content in OpenAI's response.
 */
const pipeThroughOpenAiStream = (stream: ReadableStream) => {
    return stream.pipeThrough(new NewlineDelimitedStream()).pipeThrough(new OpenAiDeltaStream());
};

interface OpenAiModelResponseModel {
    id: string;
    endpoints: string[];
}

interface OpenAiModelResponse {
    object: string;
    data: OpenAiModelResponseModel[];
}

/**
 * Parse a json response into OpenAiModelREsponse
 *
 * @param json
 * @return
 * @throws a new Error if the `object` field is not labelled as `list`
 */
const parseOpenAiModelResponse = (json): OpenAiModelResponse => {
    const ret = json as OpenAiModelResponse;
    if ("list" !== ret.object) {
        throw new Error();
    }

    return ret;
};

export {
    parseOpenAiModelResponse, pipeThroughOpenAiStream,
};
