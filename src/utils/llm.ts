/**
 * Concatenate prompt with log.
 *
 * @param log
 * @param prompt
 * @return a concatenated string of prompt and log
 */
const formatPromptWithLog = (log: string, prompt: string): string => {
    const tripleBacktick = "```";
    return `${prompt}\n${tripleBacktick}\n${log}\n${tripleBacktick}`;
};

export {formatPromptWithLog};
