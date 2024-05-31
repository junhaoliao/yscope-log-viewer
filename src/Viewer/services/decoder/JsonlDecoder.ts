import dayjs from "dayjs";
import DayjsTimezone from "dayjs/plugin/timezone";
import DayjsUtc from "dayjs/plugin/utc";

import FileDecoder from "./FileDecoder";


dayjs.extend(DayjsTimezone);
dayjs.extend(DayjsUtc);

interface LogEvent {
    [key: string]: string | number;
}

class JsonlDecoder implements FileDecoder {
    static TEXT_DECODER = new TextDecoder();

    readonly #fileContent: Uint8Array;

    #encoderPattern: string =
        "%d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] %level %class.%method(%file:%line): %message";

    #encoderDatePattern: string = "%d{yyyy-MM-dd HH:mm:ss.SSS}";

    #dateFormat: string = "YYYY-MM-DD HH:mm:ss.SSS ZZ";

    #timestampPropName: string = "ts";

    #propertyNames: string[] = [];

    static #convertLogbackDateFormatToDayjs (dateFormat: string) {
        // Fix year
        dateFormat = dateFormat.replace("yyyy", "YYYY");
        dateFormat = dateFormat.replace("yy", "YY");

        // Fix day
        dateFormat = dateFormat.replace("dd", "D");
        dateFormat = dateFormat.replace("d", "D");

        return dateFormat;
    }

    static #formatDate (timestamp: number | string, format: string): string {
        return dayjs(timestamp)
            .tz("UTC")
            .format(format);
    }

    #extractDateFormat () {
        // Extract date format from encoder string
        const dateFormatMatch = this.#encoderPattern.match(/%d\{(.+?)}/);
        if (null === dateFormatMatch) {
            console.warn(
                "Unable to find date format string in #encoderPattern:",
                this.#encoderPattern
            );

            return;
        }

        // e.g. "%d{yyyy-MM-dd HH:mm:ss.SSS}", "yyyy-MM-dd HH:mm:ss.SSS"
        const [pattern, dateFormat] = dateFormatMatch;
        this.#encoderDatePattern = pattern;
        if ("undefined" === typeof dateFormat) {
            console.warn("Unexpected undefined dateFormat");

            return;
        }

        this.#dateFormat = JsonlDecoder.#convertLogbackDateFormatToDayjs(dateFormat);
    }

    #setEncoderPattern (pattern: string) {
        this.#encoderPattern = pattern;
        this.#extractDateFormat();

        // Remove new line
        this.#encoderPattern = this.#encoderPattern.replace("%n", "");

        // Use a regular expression to find all placeholders
        const placeholderRegex = /%([\w.]+)/g;
        let match;
        while (null !== (match = placeholderRegex.exec(this.#encoderPattern))) {
            // e.g., "%thread", "thread"
            const [, propName] = match;
            if ("undefined" !== typeof propName) {
                this.#propertyNames.push(propName);
            }
        }
    }

    #formatLogEvent (logEvent: LogEvent) {
        let result = this.#encoderPattern;

        // Replace date placeholder with formatted date
        const timestamp = logEvent[this.#timestampPropName];
        if ("undefined" !== typeof timestamp) {
            const formattedDate = JsonlDecoder.#formatDate(
                timestamp,
                this.#dateFormat
            );

            result = result.replace(this.#encoderDatePattern, formattedDate);
        }

        // Replace each placeholder with the corresponding property from logEvent
        for (const propName of this.#propertyNames) {
            if (Object.hasOwn(logEvent, propName)) {
                const placeholder = `%${propName}`;
                const propValue = logEvent[propName];
                if ("undefined" === typeof propValue) {
                    console.error(`Unexpected undefined logEvent[${propName}]`);
                } else {
                    result = result.replace(placeholder, propValue.toString());
                }
            }
        }

        return result;
    }

    constructor (fileContent: Uint8Array) {
        this.#fileContent = fileContent;

        // FIXME
        // this.#timestampPropName = "ts";
        // this.#setEncoderPattern(
        //     "%d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] %level %class.%method(%file:%line): %message%n"
        // );
        this.#timestampPropName = "@timestamp";
        this.#setEncoderPattern(
            "%d{yyyy-MM-dd HH:mm:ss.SSS} [%process.thread.name] %log.level" +
            " %message%n"
        );
    }

    decode (): string[] {
        const text = JsonlDecoder.TEXT_DECODER.decode(this.#fileContent);
        const split = text.split("\n");
        const result = [];
        for (const line of split) {
            if (0 === line.length) {
                continue;
            }
            try {
                const logEvent = JSON.parse(line) as LogEvent;
                const formatted = this.#formatLogEvent(logEvent);
                result.push(formatted);
            } catch (e) {
                if (e instanceof SyntaxError) {
                    console.error(e, line);
                }
            }
        }

        return result;
    }
}

export default JsonlDecoder;
