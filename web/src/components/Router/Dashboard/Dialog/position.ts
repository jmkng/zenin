export const defaultDialogStrategy: PositionStrategy = (rootRect: DOMRect, portalRect: DOMRect) => {
    const doc = window.document.documentElement || window.document.body;
    
    const openAbove = rootRect.top + rootRect.height + portalRect.height
        > doc.clientHeight
        && rootRect.top - portalRect.height > 0;

    const top = openAbove
        ? (rootRect.top - portalRect.height + window.scrollY) - 6  // Padding equal to var(--px-b);
        : (rootRect.top + rootRect.height + window.scrollY) + 6;

    // Open to the left or right based on available space. Prefers right.
    const alignRight = rootRect.left + portalRect.width
        > doc.clientWidth
        && rootRect.left - portalRect.width > 0;

    const left = !alignRight
        ? rootRect.left + window.scrollX
        : window.scrollX + rootRect.left - portalRect.width + rootRect.width;

    return { top, left };
}

/** A function that calculates the position of a portal relative to some root anchor. */
export type PositionStrategy = (rootRect: DOMRect, portalRect: DOMRect) => { top: number, left: number }

export interface DialogState {
    rootRect: DOMRect | null
    portalRect: DOMRect | null
    top: number | null
    left: number | null
    isPositioned: boolean
}

export const defaultDialogState = {
    rootRect: null,
    portalRect: null,
    top: null,
    left: null,
    isPositioned: false,
};