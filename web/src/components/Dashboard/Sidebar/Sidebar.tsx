import { useEffect, useMemo, useRef, useState } from 'react';
import { useLayoutContext } from '@/internal/layout';

import Button from '../../Button/Button';
import MenuIcon from '../../Icon/FirstIcon';

import './Sidebar.css';

const MIN_SIZE = 250;

export default function Sidebar() {
    const layout = useLayoutContext();

    const [resizing, setResizing] = useState<boolean>(false);
    const [size, setSize] = useState<number>(MIN_SIZE);
    const [render, setRender] = useState<boolean>(layout.state.shortcut);
    const [narrow, setNarrow] = useState<boolean>(window.matchMedia("(max-width: 700px)").matches);
    const shortcutRef = useRef<HTMLDivElement>(null);
    const initial = useRef(true);
    const options = { duration: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--duration01')) * 1000, easing: "ease-in-out" };
    const width = useMemo(() => narrow ? "100vw" : `${size}px`, [narrow, size]);

    const handleReset = async () => {
        const shortcut = shortcutRef.current;
        if (!shortcut) return;
        const reset = shortcut.animate([{ width }, { width: `${MIN_SIZE}px` }], { ...options, fill: "forwards" });
        await reset.finished;
        setSize(MIN_SIZE)
        reset.commitStyles();
        reset.cancel();
    }

    useEffect(() => {
        initial.current = false;
        const media = window.matchMedia("(max-width: 700px)");
        const mediaReset = () => setNarrow(media.matches);

        media.addEventListener('change', mediaReset);
        return () => {
            initial.current = true;
            media.removeEventListener('change', mediaReset);
        }
    }, [])

    useEffect(() => {
        const close = () => {
            const shortcut = shortcutRef.current;
            if (!shortcut) return;
            const closing = shortcut.animate([{ width }, { width: 0 }], { ...options, fill: "forwards" });
            if (closing) closing.onfinish = () => setRender(false)
        }
        if (layout.state.shortcut) setRender(true)
        else close();
    }, [layout.state.shortcut])

    useEffect(() => {
        if (render && !initial.current) {
            const shortcut = shortcutRef.current;
            if (!shortcut) return;
            shortcut.animate([{ width: 0 }, { width }], options);
        }
    }, [render]);

    useEffect(() => {
        const handleResize = (event: MouseEvent) => {
            const shortcut = shortcutRef.current;
            if (!shortcut) return;
            const MAX = event.view!.innerWidth / 2;
            const position = event.clientX;
            if (position >= MAX || position < MIN_SIZE) return;
            setSize(event.clientX);
        }
        const handleStopResize = () => {
            if (resizing) setResizing(false);
            const root = document.documentElement;
            root.classList.remove('ew-resize');
        }

        if (resizing) {
            const root = document.documentElement;
            root.classList.add('ew-resize');
            window.addEventListener('mousemove', handleResize)
            window.addEventListener('mouseup', handleStopResize)
        }
        return () => {
            window.removeEventListener('mousemove', handleResize)
            window.removeEventListener('mouseup', handleStopResize)
        }
    }, [resizing])

    return render
        ? <div className='shortcut'>
            <div className="shortcut_content" ref={shortcutRef} style={{ width }}>
                <div className='shortcut_top'>
                    {narrow
                        ? <div className='shortcut_controls_container'>
                            <Button onClick={() => layout.dispatch({ type: 'shortcut', shortcut: false })} icon={<MenuIcon />} />
                        </div>
                        : null}
                </div>
            </div>
            <div className="shortcut_border" onMouseDown={() => setResizing(true)} onDoubleClick={handleReset} />
        </div>
        : null
}
