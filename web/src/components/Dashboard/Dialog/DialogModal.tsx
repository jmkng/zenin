import { useEffect, useRef } from "react";

import Button from "../../Button/Button";
import AddIcon from "../../Icon/AddIcon";

import "./DialogModal.css";

interface DialogModalProps {
    title: string
    content: React.ReactNode
    visible: boolean;

    onCancel: () => void;
}

export default function DialogModal(props: DialogModalProps) {
    const { title, content, visible, onCancel } = props;
    const modalRef = useRef<HTMLDialogElement>(null);

    const handleCancel = () => {
        const modal = modalRef.current;
        if (!modal) return;
        modal.close();
        onCancel();
    }

    useEffect(() => {
        const modal = modalRef.current;
        if (!modal) return;

        if (visible) modal.showModal();
        else modal.close();
    }, [visible]);

    return <dialog ref={modalRef} onCancel={onCancel} className="dialog_modal">
        <div className="dialog_modal_upper">
            <span className="dialog_modal_title">{title}</span>
            <Button onClick={handleCancel} icon={<span className="dialog_modal_close_icon">
                <AddIcon />
            </span>}>
            </Button>
        </div>
        <div className="dialog_modal_lower">
            {content}
        </div>
    </dialog>
}