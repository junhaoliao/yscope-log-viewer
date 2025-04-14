import {HttpStatusCode} from "axios";


type ServerConfig = {
    defaultLlmEndpoint: string;
    defaultLlmModel: string;
    usageStatsConfigFunction: string;
};

let globalServerConfig: ServerConfig;

/**
 * Initialize `globalServerConfig`.
 */
const initGlobalServerConfig = async () => {
    await fetch("serverConfig.json")
        .then((response) => {
            if (Number(HttpStatusCode.Ok) !== response.status) {
                throw new Error();
            }

            return response.json();
        })
        .then((json) => {
            const newServerConfig = json as ServerConfig;
            globalServerConfig = newServerConfig;
        })
        .catch(() => {
            throw new Error("Failed to fetch server config.");
        });
};

export {
    globalServerConfig, initGlobalServerConfig,
};
