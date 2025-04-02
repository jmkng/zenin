import { useContext } from "react";

import { SettingsState } from "@/internal/settings";
import { SettingsContext, SettingsDispatchContext } from "@/internal/settings/context";
import { SettingsAction } from "@/internal/settings/reducer";
import { SettingsService } from "@/internal/settings/service";
import { useDefaultInterceptors } from "./useDefaultInterceptors";
import { useNetworkErrorHandler } from "./useNetworkErrorHandler";

export function useSettings(): { service: SettingsService, context: SettingsContextBundle } {
    const service = useSettingsService();
    const context = useSettingsContext();
    return { service, context };
}

export function useSettingsService() {
    const onNetworkError = useNetworkErrorHandler();
    return useDefaultSettingsService().onNetworkError(onNetworkError);
}

export function useDefaultSettingsService() {
    const interceptors = useDefaultInterceptors();
    return new SettingsService().interceptor(...interceptors);
}

type SettingsContextBundle = { state: SettingsState, dispatch: (action: SettingsAction) => void }

export function useSettingsContext(): SettingsContextBundle {
    const state = useContext(SettingsContext);
    const dispatch = useContext(SettingsDispatchContext);
    if (!state || !dispatch) throw new Error('settings context must be used within provider');
    return { state, dispatch }
}