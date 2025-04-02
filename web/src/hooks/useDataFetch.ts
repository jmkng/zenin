import { useMonitor } from "@/hooks/useMonitor";
import { Account } from "@/internal/account";
import { formatTheme } from "@/internal/layout/graphics";
import { Monitor } from "@/internal/monitor";
import { inventoryBatchSize, monitorDefault } from "@/internal/monitor/reducer";
import { DataPacket, Extract } from "@/internal/server";
import { Settings } from "@/internal/settings";
import { useAccount } from "./useAccount";
import { useNetworkErrorHandler } from "./useNetworkErrorHandler";
import { useSettings } from "./useSettings";

export function useDataFetch() {
    const { service: monitorService, context: monitorContext } = useMonitor();
    const { service: settingsService, context: settingsContext } = useSettings();
    const { service: accountService, context: accountContext } = useAccount();
    const onNetworkError = useNetworkErrorHandler();
    
    async function load() {
        const token = accountContext.state.token!;
        let queue = [
            monitorService.getMonitor(token.raw, inventoryBatchSize, true),
            settingsService.getSettings(token.raw, true),
        ];
        if (token.payload.root) queue.push(accountService.getAccounts(token.raw));

        try {
            const [monitorEx, settingsEx, accountEx] = await Promise.all(queue);
            if (monitorEx.ok()) await resetMonitors(monitorEx);
            if (settingsEx.ok()) await resetSettings(settingsEx);
            if (accountEx?.ok()) await resetAccounts(accountEx); 
        } catch (err) {
            onNetworkError(err);
        }
    }

    async function resetMonitors (ex: Extract) {
        const packet: DataPacket<{monitors: Monitor[], plugins: string[]}> = await ex.json();
        const monitors = packet.data.monitors;
        const plugins = packet.data.plugins;
        const state = { ...monitorDefault, monitors, plugins };
        monitorContext.dispatch({ type: 'reset', state });
    }
    
    async function resetSettings(ex: Extract) {
        const packet: DataPacket<{settings: Settings, themes: string[]}> = await ex.json();
        const delimiters = packet.data.settings.delimiters;
        const active = packet.data.settings.theme;
        const themes = packet.data.themes;
        const state = { delimiters, active, themes };
        if (active) document.documentElement.setAttribute("data-theme", formatTheme(active));
        settingsContext.dispatch({ type: 'reset', state });
    }

    async function resetAccounts(ex: Extract) {
        const packet: DataPacket<{accounts: Account[]}> = await ex.json();
        const accounts = packet.data.accounts;
        accountContext.dispatch({ type: 'reset', accounts });
    }

    return load;
}
