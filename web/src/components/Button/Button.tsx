import { adjustPosition } from '../../internal/layout/graphics';
import DialogMenuComponent, { DialogGroup, DialogItem } from '../Modal/DialogMenu';
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';

import './Button.css'

interface ButtonProps {
    children?: ReactNode
    kind?: "default" | "primary" | "destructive"
    border?: boolean;
    hover?: boolean;
    icon?: ReactNode;
    background?: boolean;
    disabled?: boolean;
    tooltip?: ButtonTooltipOptions

    dialog?: DialogGroup[] | DialogItem[]
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
        hover = false,
        icon,
        background = false,
        disabled = false,
        tooltip = null,
        dialog,
        onClick
    } = props;
    const [dialogVisible, setDialogVisible] = useState(false);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dialogRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<number | null>(null);

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
        const tooltipElement = tooltipRef.current;
        if (!tooltipElement) return;
        tooltipElement.classList.remove('visible')
        tooltipElement.classList.remove('zenin__h_limit_top')
        tooltipElement.classList.remove('zenin__h_limit_right')
        tooltipElement.classList.remove('zenin__h_limit_bottom')
        tooltipElement.classList.remove('zenin__h_limit_left')
    };

    useEffect(() => {
        const handleShowTooltip = () => {
            const tooltipElement = tooltipRef.current;
            if (!tooltipElement || !tooltip) return;
            tooltipElement.classList.add('visible')
            adjustPosition(tooltipElement);
        };
        const handleMouseEnter = () => {
            if (!window.matchMedia("(max-width: 700px)").matches) timeoutRef.current = setTimeout(() => handleShowTooltip(), 750);
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
    }, [tooltip])

    return <button
        ref={buttonRef}
        onClick={event => { if (!disabled) handleClick(event) }}
        className={[
            'zenin__button',
            'zenin__input',
            kind,
            border ? 'border' : '',
            hover ? 'hover' : '',
            (background || dialogVisible) ? 'background' : '',
            disabled ? 'disabled' : '',
        ].join(' ')}
    >
        {icon
            ? <span className={["zenin__button_icon", children ? "pair" : ""].join(" ")}>{icon}</span>
            : null}
        {children}
        {tooltip
            ? <div className="zenin__tooltip" ref={tooltipRef}>{tooltip.text}</div>
            : null}
        {dialog && dialogVisible
            ? <div
                role="dialog"
                ref={dialogRef}
                onClick={event => event.stopPropagation()}
            >
                <DialogMenuComponent content={dialog} onItemClick={() => setDialogVisible(false)} />
            </div>
            : null}
    </button >
}

