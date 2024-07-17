import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useAccountContext } from '../../internal/account/index.ts';
import { useDefaultAccountService } from '../../internal/account/service.ts';
import { useLayoutContext } from '../../internal/layout/index.ts';
import { useLogContext } from '../../internal/log';

import Button from '../Button/Button.tsx';
import MessageIcon from '../Icon/MessageIcon/MessageIcon.tsx';
import MonitorIcon from '../Icon/MonitorIcon/MonitorIcon.tsx';

import './Nav.css';

const MIN_NAV_WIDTH = 250;

export default function NavComponent() {
    const layout = useLayoutContext();
    const log = useLogContext();
    const [resizing, setResizing] = useState<boolean>(false);
    const [width, setWidth] = useState<number>(MIN_NAV_WIDTH);
    const [render, setRender] = useState<boolean>(layout.state.navigating);
    const account = {
        context: useAccountContext(),
        service: useDefaultAccountService()
    }
    const location = useLocation();
    const navigate = useNavigate();
    const navRef = useRef<HTMLDivElement>(null);
    const initial = useRef(true);
    const navStyle = { width: `${width}px` };
    const buttonStyle = { justifyContent: "flex-start", width: "100%" };
    const cssvalue = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--slow'));
    const options = { duration: cssvalue * 1000, easing: "ease-in-out" }

    const handleStartResize = () => {
        setResizing(true);
    }

    const handleReset = async () => {
        const nav = navRef.current;
        if (!nav) return;
        const reset = nav.animate([{ width: `${width}px` }, { width: `${MIN_NAV_WIDTH}px` }], { ...options, fill: "forwards" });
        await reset.finished;
        setWidth(MIN_NAV_WIDTH)
        reset.commitStyles();
        reset.cancel();
    }

    useEffect(() => {
        const close = () => {
            const nav = navRef.current;
            if (!nav) return;
            const widthpx = `${width}px`;
            const closing = nav.animate([{ width: widthpx }, { width: 0 }], { ...options, fill: "forwards" });
            if (closing) closing.onfinish = () => setRender(false)
        }
        if (layout.state.navigating) setRender(true)
        else close();
    }, [layout.state.navigating])

    useEffect(() => {
        if (render && !initial.current) {
            const nav = navRef.current;
            if (!nav) return;
            const widthpx = `${width}px`;
            nav.animate([{ width: 0 }, { width: widthpx }], options);
        }
    }, [render]);

    useEffect(() => {
        initial.current = false;
        return () => {
            initial.current = true;
        }
    }, [])

    useEffect(() => {
        const handleResize = (event: MouseEvent) => {
            const nav = navRef.current;
            if (!nav) return;
            const MAX = event.view!.innerWidth / 2;
            const position = event.clientX;
            if (position >= MAX || position < MIN_NAV_WIDTH) return;
            setWidth(event.clientX);
        }
        const handleStopResize = () => {
            if (resizing) setResizing(false);
            const body = document.querySelector('body');
            if (!body) return;
            body.style.cursor = "default";
            body.style.userSelect = "auto";
            body.classList.remove('layout-adjust');
        }

        if (resizing) {
            const body = document.querySelector('body');
            if (!body) return;
            body.classList.add('layout-adjust');
            window.addEventListener('mousemove', handleResize)
            window.addEventListener('mouseup', handleStopResize)
        }
        return () => {
            window.removeEventListener('mousemove', handleResize)
            window.removeEventListener('mouseup', handleStopResize)
        }
    }, [resizing])

    const nav = <div className='zenin__nav'>
        <div className="zenin__nav_content" ref={navRef} style={navStyle}>
            <div className='zenin__nav_top'>
                <span className='zenin__nav_account_container'>
                    <Button>
                        {account.context.state.authenticated?.token.payload.sub || "Zenin"}
                    </Button>
                </span>
                <div className='zenin__nav_links_container'>
                    <Button style={buttonStyle} onClick={() => navigate('/')} background={location.pathname == '/'}>
                        <span className="zenin__h_center">
                            <MonitorIcon />
                        </span>
                        <span>Dashboard</span>
                    </Button>
                    <Button style={buttonStyle} onClick={() => navigate('/log')} background={location.pathname == "/log"}>
                        <span className="zenin__h_center"><MessageIcon /></span>
                        <span>Log</span>
                        <span className="zenin__h_center zenin__h_right">
                            {log.state.urgent.length > 0 ? <span className="zenin__nav_urgent" /> : null}
                        </span>
                    </Button>
                </div>
            </div>
            <div className="zenin__nav_bottom zenin__nav_links_container">

            </div>
        </div>
        <div className="zenin__nav_border" onMouseDown={handleStartResize} onDoubleClick={handleReset} />
    </div>

    return render ? nav : null
}
