import PropTypes from "prop-types";
import React, {useState} from "react";
import {
    Button, Modal,
} from "react-bootstrap";

import STATE_CHANGE_TYPE from "../../../services/STATE_CHANGE_TYPE";
import DateTimePicker from "./DatetimePicker";

import dayjs from "dayjs";


/**
 * Represents a modal window with a calendar and time picker
 * for navigation to an event right after a selected timestamp.
 *
 * @param {boolean} isOpen
 * @param {object} value
 * @param {function} onClose
 * @param {function} onStateChange
 * @returns {JSX.Element}
 */
const CalendarModal = ({
    isOpen,
    onClose,
    onStateChange,
}) => {
    const [timestamp, setTimestamp] = useState(dayjs());

    const handleDatetimeChange = (newDate) => {
        setTimestamp(newDate);
    };

    const handleDatetimeSubmit = (e) => {
        e.preventDefault();
        onClose();
        onStateChange(STATE_CHANGE_TYPE.TIMESTAMP, {timestamp: timestamp});
    };

    return (
        <Modal
            className={"border-0"}
            show={isOpen}
            onHide={onClose}
        >
            <Modal.Header className={"modal-background border-0"}>
                <div className={"float-left"}>
                    Timestamp Selection
                </div>
            </Modal.Header>
            <Modal.Body className={"modal-background p-3 pt-1"}>
                <DateTimePicker
                    value={timestamp}
                    onChange={handleDatetimeChange}/>
            </Modal.Body>
            <Modal.Footer className={"modal-background border-0"}>
                <Button
                    className={"btn-sm"}
                    variant={"success"}
                    onClick={handleDatetimeSubmit}
                >
                    Submit
                </Button>
                <Button
                    className={"btn-sm"}
                    variant={"secondary"}
                    onClick={onClose}
                >
                    Close
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

CalendarModal.propTypes = {
    isOpen: PropTypes.bool,
    value: PropTypes.any,

    onClose: PropTypes.func,
    onStateChange: PropTypes.func,
};

export default CalendarModal;
