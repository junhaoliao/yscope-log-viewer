import {
    PutObjectCommand,
    S3Client,
} from "@aws-sdk/client-s3";

import {Message} from "./llm";
import {globalServerConfig} from "./serverConfig";


interface UsageStats {
    feedbackText: string;
    fileName: string;
    isHelpful: boolean;
    location: string;
    messages: Message[];
}

type UsageStatsS3Config = {
    endpoint: string;
    bucket: string;
    path: string;
};

const USER_STATS_RANDOM_ID_SETTINGS = {
    digits: 4,

    // 1 << (digits * Math.log2(radix))
    maxNum: 0x10000,
    radix: 16,
};

/**
 * Send usage stats
 *
 * @param usageStats
 */
const sendFeedbackToS3 = async (usageStats: UsageStats) => {
    // eslint-disable-next-line no-eval, @typescript-eslint/no-unsafe-call
    const usageStatsS3Config = eval(
        globalServerConfig.usageStatsConfigFunction,
    )() as UsageStatsS3Config;

    const randomId = Math.floor(Math.random() * USER_STATS_RANDOM_ID_SETTINGS.maxNum)
        .toString(USER_STATS_RANDOM_ID_SETTINGS.radix)
        .padStart(USER_STATS_RANDOM_ID_SETTINGS.digits, "0");
    const filename = `usage-stats-${new Date().toISOString()}-${randomId}.json`;

    const s3Client = new S3Client({
        credentials: {
            accessKeyId: "",
            secretAccessKey: "",
        },
        endpoint: usageStatsS3Config.endpoint,
        forcePathStyle: true,
        region: ".",
        signer: {
            // eslint-disable-next-line @typescript-eslint/require-await
            sign: async (request) => {
                delete request.headers.authorization;

                // eslint-disable-next-line no-warning-comments
                // TODO: investigate where x-id comes from
                // Clear query parameters.
                request.query = {};

                return request;
            },
        },
    });

    await s3Client.send(
        new PutObjectCommand({
            Body: JSON.stringify(usageStats),
            Bucket: usageStatsS3Config.bucket,
            Key: `${usageStatsS3Config.path}/${filename}`,
        }),
    );
};

export type {
    UsageStats, UsageStatsS3Config,
};
export {sendFeedbackToS3};
