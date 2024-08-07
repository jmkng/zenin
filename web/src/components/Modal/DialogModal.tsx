import { useEffect, useRef, useState } from "react";
import { adjustPosition } from "../../internal/layout/graphics";

import AddIcon from "../Icon/AddIcon/AddIcon";
import Button from "../Button/Button";

import "./DialogModal.css";

interface ModalProps {
    title: string
    content: React.ReactNode
    visible: boolean;

    onCancel: () => void;
}

export default function DialogModal(props: ModalProps) {
    const { title, content, visible, onCancel } = props;
    const [render, setRender] = useState<boolean>(visible);

    const modalStyle = { animation: `${visible ? "modal-enter" : "modal-exit"} var(--fast) forwards` };
    const backdropStyle = { animation: `${visible ? "backdrop-enter" : "backdrop-exit"} var(--fast) forwards` };

    const modalRef = useRef<HTMLDivElement>(null);
    const backdropRef = useRef<HTMLDivElement>(null);

    const handleAnimationEnd = () => {
        if (!visible) setRender(false)
    }

    useEffect(() => {
        const handleClose = (event: Event) => {
            const modal = modalRef.current;
            if (onCancel && modal && !modal.contains(event.target as Node)) onCancel();
        }
        const handleKey = (event: KeyboardEvent) => {
            if (event.key == "Escape") {
                handleClose(event)
            }
        }

        if (visible) {
            window.addEventListener('keydown', handleKey);
            window.addEventListener('click', handleClose);
            setRender(true)
        }
        return () => {
            window.removeEventListener('keydown', handleKey);
            window.removeEventListener('click', handleClose);
        }
    }, [onCancel, visible]);

    useEffect(() => {
        const modalElement = modalRef.current;
        if (!modalElement) return;
        adjustPosition(modalElement)
    }, [onCancel]);

    return render ? <>
        <div ref={modalRef} className="zenin__dialog_modal zenin__dialog" style={modalStyle} onAnimationEnd={handleAnimationEnd}>
            <div className="zenin__dialog_modal_upper">
                <span className="zenin__dialog_modal_title">{title}</span>
                <Button onClick={onCancel} children={<AddIcon style={{ transform: "rotate(45deg)" }} />} />
            </div>

            <div className="zenin__dialog_modal_lower">
                {content}
            </div>
        </div>

        <div ref={backdropRef} className="zenin__dialog_modal_backdrop" style={backdropStyle} onClick={onCancel}
        />
    </> : null
}