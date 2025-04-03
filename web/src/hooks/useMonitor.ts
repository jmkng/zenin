import { MonitorState } from "@/internal/monitor";
import { MonitorContext, MonitorDispatchContext } from "@/internal/monitor/context";
import { MonitorAction } from "@/internal/monitor/reducer";
import { MonitorService } from "@/internal/monitor/service";
import { useContext } from "react";
import { useDefaultInterceptors } from "./useDefaultInterceptors";
import { useNetworkErrorHandler } from "./useNetworkErrorHandler";

export function useMonitor(): { service: MonitorService, context: MonitorContextBundle } {
    const service = useMonitorService();
    const context = useMonitorContext();
    return { service, context };
}

export function useMonitorService(): MonitorService {
    const onNetworkError = useNetworkErrorHandler();
    return useDefaultMonitorService().onNetworkError(onNetworkError);
}

export function useDefaultMonitorService(): MonitorService {
    const interceptors = useDefaultInterceptors();
    return new MonitorService().interceptor(...interceptors);
}

type MonitorContextBundle = { state: MonitorState, dispatch: (action: MonitorAction) => void }

export function useMonitorContext() {
    const state = useContext(MonitorContext);
    const dispatch = useContext(MonitorDispatchContext);
    if (!state || !dispatch) throw new Error("monitor context must be used within provider");
    return { state, dispatch }
}