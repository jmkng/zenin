import { useEffect } from 'react';
import { Route, Routes } from "react-router";
import { useFlaggedDispatch } from '../hooks/useFlaggedDispatch';
import { useAccountContext } from '../internal/account';
import { useLayoutContext } from '../internal/layout';
import { hideLoadingScreen, showLoadingScreen } from '../internal/layout/graphics';
import { useMetaContext } from '../internal/meta';
import { useDefaultMetaService } from '../internal/meta/service';
import { Monitor, useMonitorContext } from '../internal/monitor';
import { useDefaultMonitorService } from '../internal/monitor/service';
import { DataPacket } from '../server';
import { FEED, handleConnect, handleDisconnect } from '../server/feed';

import Private from '../components/Guard/Guard';
import Hidden from '../components/Hidden/Hidden';
import Bundle from './Bundle';
import Dashboard from './Dashboard/Dashboard';
import Login from './Login/Login';

import './Root.css';

export default function Root() {
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
    const dispatch = useFlaggedDispatch();

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
            if (!FEED) handleConnect((event: MessageEvent) => dispatch(JSON.parse(event.data)));
        }
        else handleDisconnect();
    }, [account.state.authenticated])

    const handleInitialize = async (token: string) => {
        const plugins = await meta.service.getPlugins(token);
        if (plugins.ok()) {
            const packet: DataPacket<string[]> = await plugins.json();
            if (packet) meta.context.dispatch({ type: 'reset', plugins: packet.data ?? [] })
        }
        const monitors = await monitor.service.getMonitor(token, 35);
        if (monitors.ok()) {
            const packet: DataPacket<Monitor[]> = await monitors.json();
            if (packet) monitor.context.dispatch({ type: 'reset', monitors: packet.data });
        }
        if (!plugins.ok() || !monitors.ok()) return;

        const loading = false;
        layout.dispatch({ type: 'load', loading })
    }

    return <div className='zenin__root_component'>
        <div className='zenin__main'>
            <Routes>
                <Route element={<Hidden />}>
                    <Route path="/login" element={<Login />} />
                </Route>
                <Route element={<Private />}>
                    <Route path="/" element={<Dashboard />} />
                </Route>
            </Routes>
        </div>
        <Bundle />
    </div>
}
