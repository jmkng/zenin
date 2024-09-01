import { useEffect, useMemo, useRef, useState } from 'react';
import { useLayoutContext } from '../../internal/layout/index.ts';

import Button from '../Button/Button.tsx';
import MenuIcon from '../Icon/MenuIcon/MenuIcon.tsx';

import './Shortcut.css';

const MIN_SIZE = 250;

export default function Shortcut() {
    const layout = useLayoutContext();

    const [resizing, setResizing] = useState<boolean>(false);
    const [size, setSize] = useState<number>(MIN_SIZE);
    const [render, setRender] = useState<boolean>(layout.state.shortcut);
    const [narrow, setNarrow] = useState<boolean>(window.matchMedia("(max-width: 700px)").matches);
    const shortcutRef = useRef<HTMLDivElement>(null);
    const initial = useRef(true);
    const options = { duration: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--slow')) * 1000, easing: "ease-in-out" };
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
            root.classList.remove('layout-adjust');
        }

        if (resizing) {
            const root = document.documentElement;
            root.classList.add('layout-adjust');
            window.addEventListener('mousemove', handleResize)
            window.addEventListener('mouseup', handleStopResize)
        }
        return () => {
            window.removeEventListener('mousemove', handleResize)
            window.removeEventListener('mouseup', handleStopResize)
        }
    }, [resizing])

    return render
        ? <div className='zenin__shortcut'>
            <div className="zenin__shortcut_content" ref={shortcutRef} style={{ width }}>
                <div className='zenin__shortcut_top'>
                    <div className='zenin__shortcut_account_container'>
                        {narrow
                            ? <Button onClick={() => layout.dispatch({ type: 'shortcut', shortcut: false })} icon={<MenuIcon />} />
                            : null}
                    </div>
                    <div className='zenin__shortcut_links_container'
                        onClick={() => window.matchMedia('(max-width: 700px)').matches ? layout.dispatch({ type: 'shortcut', shortcut: false }) : {}}>
                    </div>
                </div>
                <div className="zenin__shortcut_bottom zenin__shortcut_links_container">

                </div>
            </div>
            <div className="zenin__shortcut_border" onMouseDown={() => setResizing(true)} onDoubleClick={handleReset} />
        </div>
        : null
}