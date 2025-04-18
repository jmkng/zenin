import { ReactNode, useCallback, useEffect, useRef } from "react";
import { PositionStrategy } from "../Dashboard/Dialog/position";

import "./Button.css";

interface ButtonProps {
    children?: ReactNode;
    kind?: "default" | "primary" | "destructive";
    border?: boolean;
    hover?: boolean;
    icon?: ReactNode;
    background?: boolean;
    disabled?: boolean;
    tooltip?: string;
    ariaLabel?: string;

    onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
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
        onClick,
        ariaLabel
    } = props;

    const rootRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const click = useCallback((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        if (onClick) onClick(event);
        hideTooltip();
    }, [onClick])

    function hideTooltip() {
        const id = timeoutRef.current;
        if (!id) return;
        clearTimeout(id);
        timeoutRef.current = null;

        const element = tooltipRef.current;
        if (!element) return;

        element.classList.remove("visible")
    }

    useEffect(() => {
        const handleShowTooltip = () => {
            const tooltipElement = tooltipRef.current;
            const root = rootRef.current;
            if (!tooltipElement || !tooltip || !root) return;

            const { top, left } = relativeTooltipStrategy(root.getBoundingClientRect(), tooltipElement.getBoundingClientRect())

            tooltipElement.style.left = `${left}px`;
            tooltipElement.style.top = `${top}px`;

            tooltipElement.classList.add("visible")
        };
        const handleMouseEnter = () => {
            if (!window.matchMedia("(max-width: 700px)").matches) {
                timeoutRef.current = setTimeout(() => handleShowTooltip(), 1000);
            }
        }

        const buttonElement = buttonRef.current;
        if (!buttonElement) return;
        buttonElement.addEventListener("mouseenter", handleMouseEnter);
        buttonElement.addEventListener("mouseleave", hideTooltip);
        return () => {
            if (!buttonElement) return;
            buttonElement.removeEventListener("mouseenter", handleMouseEnter);
            buttonElement.removeEventListener("mouseleave", hideTooltip);
        }
    }, [tooltip])

    const button = <button
        ref={buttonRef}
        onClick={event => { if (!disabled) click(event) }}
        aria-label={ariaLabel}
        className={[
            "button",
            kind,
            border ? "border" : "",
            hover ? "hover" : "",
            background ? "background" : "",
            disabled ? "disabled" : "",
        ].join(" ")}
    >
        {icon
            ? <span className={["button_icon", children ? "pair" : ""].join(" ")}>{icon}</span>
            : null}

        <span className="button_child">{children}</span>
    </button>;

    return tooltip
        ? <div ref={rootRef} className="button_tooltip">
            {button}
            <div className="tooltip" ref={tooltipRef}>{tooltip}</div>
        </div>
        : button
}

// Put the tooltip below the anchor, and try to center it. 
// Prefer left/right side based on available space.
const relativeTooltipStrategy: PositionStrategy = (rootRect: DOMRect, portalRect: DOMRect) => {
    const top = rootRect.height + 6; // Padding equal to 6px;
    let left = (rootRect.width - portalRect.width) / 2;

    // Check for viewport overflow on wide tooltips.
    if (portalRect.width > rootRect.width) {
        // Assumed left position of the portal relative to viewport after calculations.
        const leftPosRelViewport = rootRect.left + left;
        const rightPosRelViewport = leftPosRelViewport + portalRect.width;

        // Stick to left/right of anchor.
        if (leftPosRelViewport < 0) left = 0;
        else if (rightPosRelViewport > window.innerWidth) left = -(portalRect.width - rootRect.width)

        // Alternatively, stick to viewport edges instead...
        // if (leftPosRelViewport < 0) left = -rootRect.left;
        // else if (rightPosRelViewport > window.innerWidth) left -= (rightPosRelViewport - window.innerWidth)
    }

    return { top, left };
};
