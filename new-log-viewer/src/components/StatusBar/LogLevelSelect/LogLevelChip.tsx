import React from "react";

import {
    Chip,
    Tooltip,
} from "@mui/joy";
import {DefaultColorPalette} from "@mui/joy/styles/types/colorSystem";

import {LOG_LEVEL} from "../../../typings/logs";

import "./LogLevelChip.css";


/**
 * Maps log levels with colors from JoyUI's default color palette.
 */
const LOG_LEVEL_COLOR_MAP: Record<LOG_LEVEL, DefaultColorPalette> = Object.freeze({
    [LOG_LEVEL.NONE]: "neutral",
    [LOG_LEVEL.TRACE]: "neutral",
    [LOG_LEVEL.DEBUG]: "neutral",
    [LOG_LEVEL.INFO]: "primary",
    [LOG_LEVEL.WARN]: "warning",
    [LOG_LEVEL.ERROR]: "danger",
    [LOG_LEVEL.FATAL]: "danger",
});

interface LogLevelChipProps {
    name: string,
    value: LOG_LEVEL,
}

/**
 * Renders a log level chip.
 *
 * @param props
 * @param props.name
 * @param props.value
 * @return
 */
const LogLevelChip = ({name, value}: LogLevelChipProps) => (
    <Tooltip
        key={value}
        title={name}
    >
        <Chip
            className={"log-level-chip"}
            color={LOG_LEVEL_COLOR_MAP[value]}
            variant={"outlined"}
        >
            {name[0]}
        </Chip>
    </Tooltip>
);
export default LogLevelChip;