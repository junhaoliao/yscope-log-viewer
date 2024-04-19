import PropTypes from "prop-types";
import React from "react";

import {
    DateCalendar, DateTimeField, MultiSectionDigitalClock,
} from "@mui/x-date-pickers";


/**
 * Customized datetime picker.
 *
 * @param {Function} onChange triggered when the selected date or time changes
 * @param {object} value timestamp
 * @return {JSX.Element}
 */
const DateTimePicker = ({onChange, value}) => {
    const commonProps = {
        autoFocus: false,
        timezone: "UTC",
        onChange: onChange,
        value: value,
    };

    return (
        <>
            <DateTimeField
                {...commonProps}
                ampm={false}
                format={"YYYY-MM-DD HH:mm:ss"}
                size={"medium"}
                slotProps={{
                    textField: {
                        fullWidth: true,
                        variant: "standard",
                        inputProps: {
                            sx: {
                                textAlign: "center",
                                fontSize: "22px",
                            },
                        },
                    },
                }}/>

            <div style={{display: "flex"}}>
                <DateCalendar
                    {...commonProps}
                    sx={{
                        ".MuiMonthCalendar-root": {
                            width: "100%",
                        },
                        ".MuiYearCalendar-root": {
                            width: "100%",
                        },
                        "borderRight": "1px solid rgba(0, 0, 0, 0.2)",
                        "height": "320px",
                        "minWidth": "260px",
                    }}
                    views={[
                        "year",
                        "month",
                        "day",
                    ]}/>

                <MultiSectionDigitalClock
                    {...commonProps}
                    ampm={false}
                    timeSteps={{hours: 1, minutes: 1, seconds: 1}}
                    sx={{
                        ".MuiMultiSectionDigitalClockSection-root": {
                            maxHeight: "320px",
                            width: "72px",
                        },
                        "borderBottom": "0",
                    }}
                    views={[
                        "hours",
                        "minutes",
                        "seconds",
                    ]}/>
            </div>
        </>
    );
};

DateTimePicker.propTypes = {
    value: PropTypes.any,
    onChange: PropTypes.func,
};

export default DateTimePicker;
