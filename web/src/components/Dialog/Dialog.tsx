import { useCallback } from "react";
import { useEffect, useRef, useState } from "react";
import { defaultDialogStrategy, PositionStrategy } from "./position";

interface DialogState {
    rootRect: DOMRect | null
    portalRect: DOMRect | null
    top: number | null
    left: number | null
    isPositioned: boolean
}

const defaultDialogState = {
    rootRect: null,
    portalRect: null,
    top: null,
    left: null,
    isPositioned: false,
};

interface Dialog { 
    /** The dialog content. */
    content: React.ReactNode,
    /** Element classes within the dialog that will cause the dialog to close. */
    closers?: Array<string>
}

interface DialogProps {
    /** The anchor element that the dialog will be positioned next to. */
    children: React.ReactNode,

    dialog: Dialog
    /** A positioning strategy. Optional. */
    strategy?: PositionStrategy,
}

export default function Dialog(props: DialogProps) {
    const {
        children,
        dialog: { content, closers = ["zenin__button:not(.disabled)"] },
        strategy = defaultDialogStrategy,
    } = props;
    const [state, setState] = useState<DialogState>(defaultDialogState);

    const rootRef = useRef<HTMLDivElement>(null);
    const portalRef = useRef<HTMLDialogElement>(null);

    const handleClose = useCallback(() => {
        setState(defaultDialogState);
        const portal = portalRef.current;
        if (!portal) return;
        portal.hidePopover();
    }, [])
    
    const handleToggle = useCallback(() => {
        const stage1 = async () => {
            const root = rootRef.current;
            if (!root || root.nodeType !== Node.ELEMENT_NODE) return;

            const rootRect = root.getBoundingClientRect();
            setState(prev => ({ ...prev, rootRect }));
        }
        const stage2 = async () => {
            const portal = portalRef.current;
            if (!portal) return;

            setState(prev => {
                if (prev.rootRect && !prev.isPositioned) {
                    const portalRect = portal.getBoundingClientRect();
                    const { left, top } = strategy(prev.rootRect, portalRect);
                    const isPositioned = true;
                    return { ...prev, isPositioned, left, top, portalRect };
                }
                return prev;
            });

            portal.showPopover();
        };

        if (state.isPositioned) handleClose();
        else stage1().then(stage2);
    }, [handleClose, state.isPositioned, strategy])

    const handleClick = (e: React.MouseEvent<HTMLDialogElement, MouseEvent>) => {
        const target = e.target as HTMLElement;
        if (closers.some(n => target.closest(`.${n}`))) {
            handleClose();
        }
    }

    useEffect(() => {
        const root = rootRef.current;
        const portal = portalRef.current;
        if (!state.isPositioned || !root || !portal) return;

        // Listen for popover close.
        // TODO: What is the proper TS type here?
        const handleClose = (e: Event & { newState?: string }) => {
            if (e.newState === "closed") {
                setState(defaultDialogState)
            }
        }
        portal.addEventListener('beforetoggle', handleClose, false)
        
        // Popover API doesn't seem to support closing on scroll, so this handles that.
        const handleScroll = () => {
            portal.hidePopover();
        }
        const scrollParents = getScrollParents(root);
        scrollParents.forEach(n => n.addEventListener('scroll', handleScroll, false));
        
        return () => {
            scrollParents.forEach(n => n.removeEventListener('scroll', handleScroll, false));
            portal.removeEventListener('beforetoggle', handleClose, false)
        };
    }, [state.isPositioned])

    return <div className="zenin__dialog" ref={rootRef}>
        <div className="zenin__dialog_anchor" onClick={handleToggle}>
            {children}
        </div>
        <dialog
            className="zenin__dialog_portal"
            popover="auto"
            ref={portalRef}
            style={{ left: `${state.left}px`, top: `${state.top}px` }}
            onClick={e => handleClick(e)}
        >
            {content}
        </dialog>
    </div>
}

function getScrollParents(e: HTMLElement | null, parents: Array<HTMLElement | Window> = []): Array<HTMLElement | Window> {
    if (!e || e.tagName === 'BODY') return [...parents, window];
    return getScrollParents(e.parentElement, isScrollParent(e) ? [...parents, e] : parents)
}

function isScrollParent(element: HTMLElement): boolean {
    try {
        const { overflow, overflowY, overflowX } = getComputedStyle(element);
        return /(auto|scroll)/.test(overflow + overflowX + overflowY);
    } catch {
        return false;
    }
}