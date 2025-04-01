import { useEffect } from 'react';
import { Route, Routes } from "react-router";

import { useFeedDispatch } from '@/hooks/useFlaggedDispatch';
import { Account, useAccountContext } from '@/internal/account';
import { useDefaultAccountService } from '@/internal/account/service';
import { useLayoutContext } from '@/internal/layout';
import { formatTheme, hideLoadingScreen, showLoadingScreen } from '@/internal/layout/graphics';
import { Monitor, useDefaultMonitorService, useMonitorContext } from '@/internal/monitor';
import { inventoryBatchSize, monitorDefault } from '@/internal/monitor/reducer';
import { DataPacket, Extract, FEED, handleConnect, handleDisconnect } from '@/internal/server';
import { Settings, useDefaultSettingsService, useSettingsContext } from '@/internal/settings';

import Dashboard from './Dashboard/Dashboard';
import Hidden from './Hidden';
import Login from './Login/Login';
import NotFound from './NotFound';
import Notifications from './Notifications/Notifications';
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
            monitor.service.getMonitor(token.raw, inventoryBatchSize, true),
            settings.service.getSettings(token.raw, true),
        ];
        if (token.payload.root) queue.push(account.service.getAccounts(token.raw));
        
        (async () => {
            const [monitorEx, settingsEx, accountEx] = await Promise.all(queue);
            if (monitorEx.ok()) await resetMonitors(monitorEx);
            if (settingsEx.ok()) await resetSettings(settingsEx);
            if (accountEx?.ok()) await resetAccounts(accountEx); 

            const loading = false;
            layout.dispatch({ type: 'load', loading })
        })();
    }, [account.context.state.token])

    const resetMonitors = async (ex: Extract) => {
        const packet: DataPacket<{monitors: Monitor[], plugins: string[]}> = await ex.json();
        const monitors = packet.data.monitors;
        const plugins = packet.data.plugins;
        const state = { ...monitorDefault, monitors, plugins };
        monitor.context.dispatch({ type: 'reset', state });
    }
    
    const resetSettings = async (ex: Extract) => {
        const packet: DataPacket<{settings: Settings, themes: string[]}> = await ex.json();
        const delimiters = packet.data.settings.delimiters;
        const active = packet.data.settings.theme;
        const themes = packet.data.themes;
        const state = { delimiters, active, themes };
        if (active) document.documentElement.setAttribute("data-theme", formatTheme(active));
        settings.context.dispatch({ type: 'reset', state });
    }

    const resetAccounts = async (ex: Extract) => {
        const packet: DataPacket<{accounts: Account[]}> = await ex.json();
        const accounts = packet.data.accounts;
        account.context.dispatch({ type: 'reset', accounts });
    }
    
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

    return <div className='router'>
        <Routes>
            <Route element={<Hidden />}>
                <Route path="/login" element={<Login />} />
            </Route>
            
            <Route element={<Private />}>
                <Route path="/" element={<Dashboard />} />
               <Route path="*" element={<NotFound/>} />
            </Route>

        </Routes>

        <Notifications/>
    </div>
}