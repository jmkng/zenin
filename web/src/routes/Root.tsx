import { useEffect } from 'react';
import { useAccountContext } from '../internal/account';
import { hideLoadingScreen, showLoadingScreen } from '../internal/layout/graphics';
import { useLocation } from 'react-router-dom';
import { useLogContext } from '../internal/log';
import { Monitor, useMonitorContext } from '../internal/monitor';
import { useDefaultMonitorService } from '../internal/monitor/service';
import { useLayoutContext } from '../internal/layout';
import { useDefaultMetaService } from '../internal/meta/service';
import { useMetaContext } from '../internal/meta';
import { DataPacket } from '../server';
import { FEED, handleConnect, handleDisconnect } from '../server/feed';
import { useFlaggedDispatch } from '../hooks/useFlaggedDispatch';

import Router from './Router/Router'
import Bundle from '../components/Modal/Bundle/Bundle';
import MenuComponent from '../components/Menu/Menu';
import NavComponent from '../components/Nav/Nav';

import './Root.css';

export default function RootComponent() {
    const account = useAccountContext();
    const layout = useLayoutContext();
    const monitor = {
        context: useMonitorContext(),
        service: useDefaultMonitorService()
    }
    const meta = {
        context: useMetaContext(),
        service: useDefaultMetaService()
    };
    const log = useLogContext();
    const location = useLocation();
    const dispatch = useFlaggedDispatch();
    const visible = location.pathname != '/login' && location.pathname != '/register';

    useEffect(() => {
        if (!account.state.authenticated) return;
        const token = account.state.authenticated.token.raw;
        handleInitialize(token); // 🌩️ => Initial data fetching
    }, [account.state.authenticated])

    useEffect(() => {
        if (layout.state.loading) showLoadingScreen();
        else hideLoadingScreen();
    }, [layout.state.loading])

    useEffect(() => {
        if (account.state.authenticated) {
            if (log.state.connected && !FEED) handleConnect((event: MessageEvent) =>
                dispatch(JSON.parse(event.data)));
            else if (!log.state.connected && FEED) handleDisconnect()
        }
        else handleDisconnect();
    }, [account.state.authenticated, log.state.connected])

    const handleInitialize = async (token: string) => {
        const plugins = await meta.service.plugins(token);
        if (plugins.ok()) {
            const packet: DataPacket<string[]> = await plugins.json();
            if (packet) meta.context.dispatch({ type: 'reset', plugins: packet.data })
        }
        const monitors = await monitor.service.get(token, 35);
        if (monitors.ok()) {
            const packet: DataPacket<Monitor[]> = await monitors.json();
            if (packet) monitor.context.dispatch({ type: 'reset', monitors: packet.data });
        }
        if (!plugins.ok() || !monitors.ok()) return;

        const loading = false;
        layout.dispatch({ type: 'load', loading })
    }

    return (
        <div className='zenin__root_component'>
            <div className='zenin__root_left'>
                {visible ? <NavComponent /> : null}
            </div>

            <div className='zenin__root_right'>
                {visible ?
                    <MenuComponent />
                    : null}
                <div className='zenin__main'>
                    <Router />
                </div>
            </div>

            <div className='zenin__modal_container'>
                <Bundle />
            </div>
        </div>
    )
}
