import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAccountContext } from '../../internal/account/index.ts';
import { useDefaultAccountService } from '../../internal/account/service.ts';
import { useLayoutContext } from '../../internal/layout/index.ts';
import { useLogContext } from '../../internal/log';

import Button from '../Button/Button.tsx';
import MenuIcon from '../Icon/MenuIcon/MenuIcon.tsx';
import MessageIcon from '../Icon/MessageIcon/MessageIcon.tsx';
import MonitorIcon from '../Icon/MonitorIcon/MonitorIcon.tsx';
import SettingsIcon from '../Icon/SettingsIcon/SettingsIcon.tsx';

import './Nav.css';

const MIN_NAV_SIZE = 250;

export default function Nav() {
    const layout = useLayoutContext();
    const account = {
        context: useAccountContext(),
        service: useDefaultAccountService()
    }
    const log = useLogContext();
    const location = useLocation();
    const navigate = useNavigate();

    const [resizing, setResizing] = useState<boolean>(false);
    const [size, setSize] = useState<number>(MIN_NAV_SIZE);
    const [render, setRender] = useState<boolean>(layout.state.navigating);
    const [narrow, setNarrow] = useState<boolean>(window.matchMedia("(max-width: 700px)").matches);
    const navRef = useRef<HTMLDivElement>(null);
    const initial = useRef(true);
    const options = { duration: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--slow')) * 1000, easing: "ease-in-out" };
    const width = useMemo(() => narrow ? "100vw" : `${size}px`, [narrow, size]);

    const handleReset = async () => {
        const nav = navRef.current;
        if (!nav) return;
        const reset = nav.animate([{ width }, { width: `${MIN_NAV_SIZE}px` }], { ...options, fill: "forwards" });
        await reset.finished;
        setSize(MIN_NAV_SIZE)
        reset.commitStyles();
        reset.cancel();
    }

    useEffect(() => {
        const close = () => {
            const nav = navRef.current;
            if (!nav) return;
            const closing = nav.animate([{ width }, { width: 0 }], { ...options, fill: "forwards" });
            if (closing) closing.onfinish = () => setRender(false)
        }
        if (layout.state.navigating) setRender(true)
        else close();
    }, [layout.state.navigating])

    useEffect(() => {
        if (render && !initial.current) {
            const nav = navRef.current;
            if (!nav) return;
            nav.animate([{ width: 0 }, { width }], options);
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
            const nav = navRef.current;
            if (!nav) return;
            const MAX = event.view!.innerWidth / 2;
            const position = event.clientX;
            if (position >= MAX || position < MIN_NAV_SIZE) return;
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

    const nav = <div className='zenin__nav'>
        <div className="zenin__nav_content" ref={navRef} style={{ width }}>
            <div className='zenin__nav_top'>
                <div className='zenin__nav_account_container'>
                    {narrow
                        ? <Button onClick={() => layout.dispatch({ type: 'navigate', navigating: false })} icon={<MenuIcon />} />
                        : null}
                    <Button onClick={() => navigate("/account")}>
                        {account.context.state.authenticated?.token.payload.sub || "Zenin"}
                    </Button>
                </div>
                <div className='zenin__nav_links_container'
                    onClick={() => window.matchMedia('(max-width: 700px)').matches ? layout.dispatch({ type: 'navigate', navigating: false }) : {}}>
                    <Button onClick={() => navigate('/')} background={location.pathname == '/'}>
                        <span className="zenin__h_center"><MonitorIcon /></span>
                        <span>Dashboard</span>
                    </Button>
                    <Button onClick={() => navigate('/log')} background={location.pathname == "/log"}>
                        <span className="zenin__h_center"><MessageIcon /></span>
                        <span>Log</span>
                        <span className="zenin__h_center zenin__h_right">
                            {log.state.urgent.length > 0 ? <span className="zenin__nav_urgent" /> : null}
                        </span>
                    </Button>
                    <Button onClick={() => navigate('/settings')} background={location.pathname == "/settings"}>
                        <span className="zenin__h_center"><SettingsIcon /></span>
                        <span>Settings</span>
                    </Button>
                </div>
            </div>
            <div className="zenin__nav_bottom zenin__nav_links_container">

            </div>
        </div>
        <div className="zenin__nav_border" onMouseDown={() => setResizing(true)} onDoubleClick={handleReset} />
    </div>

    return render ? nav : null
}
