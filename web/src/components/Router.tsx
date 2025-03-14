import { useEffect } from 'react';
import { Route, Routes } from "react-router";

import { useFeedDispatch } from '@/hooks/useFlaggedDispatch';
import { Account, useAccountContext } from '@/internal/account';
import { useDefaultAccountService } from '@/internal/account/service';
import { useLayoutContext } from '@/internal/layout';
import { hideLoadingScreen, showLoadingScreen } from '@/internal/layout/graphics';
import { Monitor, useDefaultMonitorService, useMonitorContext } from '@/internal/monitor';
import { DataPacket, FEED, handleConnect, handleDisconnect } from '@/internal/server';
import { Settings, useDefaultSettingsService, useSettingsContext } from '@/internal/settings';

import Dashboard from './Dashboard/Dashboard';
import Hidden from './Hidden';
import Login from './Login/Login';
import NotFound from './NotFound';
import Private from './Private';

import './Router.css';

export default function Router() {
    const account = {
        context: useAccountContext(),
        service: useDefaultAccountService()
    };
    const monitor = {
        context: useMonitorContext(),
        service: useDefaultMonitorService()
    };
    const settings = {
        context: useSettingsContext(),
        service: useDefaultSettingsService()
    };
    const layout = useLayoutContext();
    const dispatch = useFeedDispatch();

    useEffect(() => {
        if (!account.context.state.token) return;
        const token = account.context.state.token;

        let queue = [
            settings.service.getSettings(token.raw),
            monitor.service.getPlugins(token.raw),
            monitor.service.getMonitor(token.raw, 35),
        ];
        if (token.payload.root) queue.push(account.service.getAccounts(token.raw));

        (async () => {
            const [
                settingsEx,
                pluginEx,
                monitorEx,
                accountEx
            ] = await Promise.all(queue);
            if (settingsEx.ok()) {
                const packet: DataPacket<Settings> = await settingsEx.json();
                settings.context.dispatch({ type: 'reset', delimiters: packet.data.delimiters });
            }
            if (pluginEx.ok()) {
                const packet: DataPacket<{plugins: string[] | null}> = await pluginEx.json();
                monitor.context.dispatch({ type: 'update', plugins: packet.data.plugins || [] });
            }
            if (monitorEx.ok()) {
                const packet: DataPacket<{monitors: Monitor[]}> = await monitorEx.json();
                monitor.context.dispatch({ type: 'reset', monitors: packet.data.monitors });
            }
            if (accountEx !== undefined && accountEx.ok()) {
                const packet: DataPacket<Account[]> = await accountEx.json();
                account.context.dispatch({ type: 'reset', accounts: packet.data });
            }

            const loading = false;
            layout.dispatch({ type: 'load', loading })
        })();
    }, [account.context.state.token])

    useEffect(() => {
        if (layout.state.loading) showLoadingScreen();
        else hideLoadingScreen();
    }, [layout.state.loading])

    useEffect(() => {
        if (account.context.state.token) {
            if (!FEED) handleConnect((event: MessageEvent) => dispatch(JSON.parse(event.data)));
        }
        else handleDisconnect();
    }, [account.context.state.token])

    return <div className='zenin__router'>
        <Routes>
            <Route element={<Hidden />}>
                <Route path="/login" element={<Login />} />
            </Route>
            <Route element={<Private />}>
                <Route path="/" element={<Dashboard />} />
            </Route>

            <Route path="*" element={<NotFound/>} />
        </Routes>
    </div>
}
