import { useEffect, useRef, useState } from "react";
import { adjustPosition } from "../../internal/layout/graphics";
import { isAttached, isFloating, isGroup, ModalAttached, ModalFloating, ModalItem } from "./ModalItem";

import AddIcon from "../Icon/AddIcon/AddIcon";
import Button from "../Button/Button";

import "./Modal.css";

interface ModalProps {
    visible: boolean;
    kind: ModalAttached | ModalFloating,

    onCancel: () => void;
}

export default function ModalComponent(props: ModalProps) {
    const { visible, kind, onCancel } = props;
    const [render, setRender] = useState<boolean>(visible);

    const title = isFloating(kind) ? kind.title : "";
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

    const modal = <>
        <div
            className={`zenin__modal ${kind.flag}`}
            ref={modalRef}
            style={isFloating(kind) ? modalStyle : {}}
            onAnimationEnd={handleAnimationEnd}
        >
            {isFloating(kind) ?
                <div className="zenin__modal_upper">
                    <span className="zenin__modal_title">{title}</span>
                    <Button onClick={onCancel} children={<AddIcon style={{ transform: "rotate(45deg)" }} />} />
                </div>
                :
                null}

            <div className="zenin__modal_lower">
                {isAttached(kind) ?
                    <ul className="zenin__modal_list zenin__modal_content">
                        <div>
                            {kind.content.every(isGroup) ? (
                                kind.content.map((group, index) => (
                                    <div key={index} className="zenin__modal_group">
                                        <div className="zenin__modal_group_items zenin__modal_padded">
                                            {group.items.map((item, index) => renderModalItem(item, index))}
                                        </div>
                                        {index < kind.content.length - 1 ? <div className="zenin__modal_group_border" /> : null}
                                    </div>
                                ))
                            ) : (
                                <div className="zenin__modal_group zenin__modal_padded">
                                    {kind.content.map((item, index) => renderModalItem(item, index))}
                                </div>
                            )}
                        </div>
                    </ul >
                    :
                    <div className="zenin__modal_children zenin__modal_content">{kind.content}</div>}
            </div>
        </div>

        {isFloating(kind) ?
            <div
                ref={backdropRef}
                className="zenin__modal_backdrop"
                style={backdropStyle}
                onClick={onCancel}
            />
            : null}
    </>

    return (isFloating(kind) && render) || (isAttached(kind) && visible) ? modal : null
}

function renderModalItem(item: ModalItem, index: number) {
    return (
        <li
            className={[
                "zenin__modal_item", item.disabled ? 'disabled' : '', item.destructive ? 'destructive' : '',
            ].join(' ')}
            key={index}
            onClick={item.onClick}
        >
            {item.icon && <span className="zenin__h_center zenin__modal_icon_container">{item.icon}</span>}
            <span>{item.text}</span>
        </li>
    );
}
