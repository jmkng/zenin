import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { adjustPosition, unlimit } from '../../internal/layout/graphics';
import DialogMenu, { DialogGroup, DialogItem, DialogSideKind } from '../Modal/DialogMenu';

import './Button.css';

interface ButtonProps {
    children?: ReactNode
    kind?: "default" | "primary" | "destructive"
    border?: boolean;
    hover?: boolean;
    icon?: ReactNode;
    background?: boolean;
    disabled?: boolean;
    tooltip?: ButtonTooltipOptions;
    dialog?: { content: DialogGroup[] | DialogItem[], side: DialogSideKind }
    loading?: boolean;
    onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

interface ButtonTooltipOptions {
    text: string
}

export default function Button(props: ButtonProps) {
    const {
        children,
        kind = "default",
        border = false,
        hover = true,
        icon,
        background = false,
        disabled = false,
        tooltip = null,
        dialog,
        loading = false,
        onClick
    } = props;
    const [dialogVisible, setDialogVisible] = useState(false);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dialogRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        if (dialog) setDialogVisible(prev => !prev);
        if (onClick) onClick(event);
        handleHideTooltip();
    }, [dialog, onClick])

    useEffect(() => {
        if (!dialogVisible) return;
        const handleClick = (event: MouseEvent) => {
            if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) setDialogVisible(false)
        };
        document.addEventListener('click', handleClick, true);

        return () => {
            document.removeEventListener('click', handleClick, true);
        };
    }, [dialogVisible])

    const handleHideTooltip = () => {
        const element = tooltipRef.current;
        if (!element) return;

        element.classList.remove('visible')
        unlimit(element);
    };

    useEffect(() => {
        const handleShowTooltip = () => {
            const tooltipElement = tooltipRef.current;
            if (!tooltipElement || !tooltip) return;

            tooltipElement.classList.add('visible')
            adjustPosition(tooltipElement);
        };
        const handleMouseEnter = () => {
            if (!window.matchMedia("(max-width: 700px)").matches && !dialogVisible) {
                timeoutRef.current = setTimeout(() => handleShowTooltip(), 1000);
            }
        }
        const handleMouseLeave = () => {
            const id = timeoutRef.current;
            if (!id) return;
            clearTimeout(id);
            timeoutRef.current = null;
            handleHideTooltip();
        }

        const buttonElement = buttonRef.current;
        if (!buttonElement) return;
        buttonElement.addEventListener('mouseenter', handleMouseEnter);
        buttonElement.addEventListener('mouseleave', handleMouseLeave);
        return () => {
            if (!buttonElement) return;
            buttonElement.removeEventListener('mouseenter', handleMouseEnter);
            buttonElement.removeEventListener('mouseleave', handleMouseLeave);
        }
    }, [dialogVisible, tooltip])

    return <button
        ref={buttonRef}
        onClick={event => { if (!disabled && !loading) handleClick(event) }}
        className={[
            'zenin__button',
            'zenin__input',
            kind,
            border ? 'border' : '',
            hover ? 'hover' : '',
            (background || dialogVisible) ? 'background' : '',
            disabled ? 'disabled' : '',
            loading ? 'loading' : '',
        ].join(' ')}
    >
        {loading ?
            <div className="zenin__button_spinner_overlay">
                <div className="zenin__button_spinner"></div>
            </div>
            : null}

        {icon
            ? <span className={["zenin__button_icon", children ? "pair" : ""].join(" ")}>{icon}</span>
            : null}

        <span className="zenin__button_child">{children}</span>

        {tooltip && !dialogVisible
            ? <div className="zenin__tooltip" ref={tooltipRef}>{tooltip.text}</div>
            : null}

        {dialog && dialogVisible
            ? <div role="dialog" ref={dialogRef} onClick={event => event.stopPropagation()}>
                <DialogMenu content={dialog.content} side={dialog.side} onItemClick={() => setDialogVisible(false)} />
            </div>
            : null}
    </button >
}

