import { useEffect } from 'react';
import { Route, Routes } from "react-router";
import { useFlaggedDispatch } from '../hooks/useFlaggedDispatch';
import { useAccountContext } from '../internal/account';
import { useLayoutContext } from '../internal/layout';
import { hideLoadingScreen, showLoadingScreen } from '../internal/layout/graphics';
import { Monitor, useMonitorContext } from '../internal/monitor';
import { useDefaultMonitorService } from '../internal/monitor/service';
import { useSettingsContext } from '../internal/settings';
import { SettingsState } from '../internal/settings/reducer';
import { useDefaultSettingsService } from '../internal/settings/service';
import { DataPacket } from '../server';
import { FEED, handleConnect, handleDisconnect } from '../server/feed';

import Private from '../components/Guard/Guard';
import Hidden from '../components/Hidden/Hidden';
import Dashboard from './Dashboard/Dashboard';
import Login from './Login/Login';
import ModalGroup from './ModalGroup';

import './Root.css';

export default function Root() {
    const account = useAccountContext();
    const layout = useLayoutContext();
    const monitor = { context: useMonitorContext(), service: useDefaultMonitorService() };
    const settings = { context: useSettingsContext(), service: useDefaultSettingsService() };
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
        const settingsExtract = await settings.service.getSettings(token);
        if (settingsExtract.ok()) {
            const packet: DataPacket<SettingsState> = await settingsExtract.json();
            settings.context.dispatch({ type: 'reset', delimiters: packet.data.delimiters })
        }
        const pluginExtract = await monitor.service.getPlugins(token);
        if (pluginExtract.ok()) {
            const packet: DataPacket<string[]> = await pluginExtract.json();
            monitor.context.dispatch({ type: 'update', plugins: packet.data })
        }
        const monitorExtract = await monitor.service.getMonitor(token, 35);
        if (monitorExtract.ok()) {
            const packet: DataPacket<Monitor[]> = await monitorExtract.json();
            monitor.context.dispatch({ type: 'reset', monitors: packet.data });
        }
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

        <ModalGroup />
    </div>
}
