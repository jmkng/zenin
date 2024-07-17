import { adjustPosition } from '../../internal/layout/graphics';
import './Button.css'
import { CSSProperties, ReactNode, useCallback, useEffect, useRef } from 'react';

interface ButtonProps {
    children: ReactNode
    kind?: "default" | "primary" | "destructive"
    border?: boolean;
    hover?: boolean;
    icon?: ReactNode;
    background?: boolean;
    disabled?: boolean;
    tooltip?: ButtonTooltipOptions | null
    style?: CSSProperties

    onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

export interface ButtonTooltipOptions {
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
        style,
        onClick
    } = props;
    const tooltipStyle = {}
    const timeout = useRef<number | null>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        if (onClick) {
            onClick(event);
            handleHideTooltip();
        }
    }, [onClick])

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
            timeout.current = setTimeout(() => handleShowTooltip(), 750)
        }
        const handleMouseLeave = () => {
            const id = timeout.current;
            if (!id) return;
            clearTimeout(id);
            timeout.current = null;
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

    return (
        <button
            className={[
                'zenin__button',
                'zenin__input',
                kind,
                border ? 'border' : '',
                hover ? 'hover' : '',
                background ? 'background' : '',
                disabled ? 'disabled' : '',
            ].join(' ')}
            ref={buttonRef}
            style={style}
            onClick={(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => { if (!disabled) { handleClick(event) } }}
        >
            {icon ? <span className="zenin__button_icon">{icon}</span> : null}
            {children}
            {tooltip ?
                <div
                    className="zenin__tooltip"
                    style={tooltipStyle}
                    ref={tooltipRef}
                >
                    {tooltip.text}
                </div>
                : null
            }
        </button >
    );
}

