import React from "react";
import {
    Button,
    Modal,
} from "react-bootstrap";

import ShortcutsTable from "./ShortcutsTabe";


interface HelpModalProps {
    isOpen: boolean,
    modalClass: string,
    onClose: ()=>void,
    theme: string
}

/**
 * Renders a Help Modal.
 *
 * @param props
 * @param props.modalClass
 * @param props.isOpen
 * @param props.onClose
 * @param props.theme
 * @return
 */
const HelpModal = ({
    isOpen,
    modalClass,
    onClose,
    theme,
}: HelpModalProps): React.ReactElement => (
    <Modal
        className={"help-modal border-0"}
        contentClassName={modalClass}
        data-theme={theme}
        show={isOpen}
        onHide={onClose}
    >
        <Modal.Header className={"modal-background"}>
            <div className={"float-left"}>
                Keyboard Shortcuts
            </div>
        </Modal.Header>
        <Modal.Body className={"modal-background p-3 pt-2"}>
            <ShortcutsTable/>
        </Modal.Body>
        <Modal.Footer className={"modal-background"}>
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

export default HelpModal;
