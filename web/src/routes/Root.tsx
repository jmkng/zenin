import { useEffect } from 'react';
import { Route, Routes } from "react-router";

import { useFeedDispatch } from '../hooks/useFlaggedDispatch';
import { useAccountContext } from '../internal/account';
import { useLayoutContext } from '../internal/layout';
import { hideLoadingScreen, showLoadingScreen } from '../internal/layout/graphics';
import { Monitor, useDefaultMonitorService, useMonitorContext } from '../internal/monitor';
import { SettingsState, useDefaultSettingsService, useSettingsContext } from '../internal/settings';
import { DataPacket, FEED, handleConnect, handleDisconnect } from '../server';

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
    const dispatch = useFeedDispatch();

    useEffect(() => {
        if (!account.state.authenticated) return;
        const token = account.state.authenticated.token.raw;
        
        (async () => {
            const [
                settingsEx,
                pluginEx,
                monitorEx
            ] = await Promise.all([
                settings.service.getSettings(token),
                monitor.service.getPlugins(token),
                monitor.service.getMonitor(token, 35),
            ]);
            if (settingsEx.ok()) {
                const settingsData: DataPacket<SettingsState> = await settingsEx.json();
                settings.context.dispatch({ type: 'reset', delimiters: settingsData.data.delimiters });
            }
            if (pluginEx.ok()) {
                const pluginData: DataPacket<string[]> = await pluginEx.json();
                monitor.context.dispatch({ type: 'update', plugins: pluginData.data });
            }
            if (monitorEx.ok()) {
                const monitorData: DataPacket<Monitor[]> = await monitorEx.json();
                monitor.context.dispatch({ type: 'reset', monitors: monitorData.data });
            }
            const loading = false;
            layout.dispatch({ type: 'load', loading })
        })();
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
