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

export {parseOpenAiModelResponse};
