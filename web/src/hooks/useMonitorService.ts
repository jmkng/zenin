import { MonitorService } from "@/internal/monitor/service";
import { useNetworkErrorHandler } from "./useNetworkErrorHandler";
import { useDefaultInterceptors } from "./useDefaultInterceptors";

export const useMonitorService = (): MonitorService => {
    const onNetworkError = useNetworkErrorHandler();
    return useDefaultMonitorService().onNetworkError(onNetworkError);
}

export const useDefaultMonitorService = (): MonitorService => {
    const interceptors = useDefaultInterceptors();
    return new MonitorService().interceptor(...interceptors);
}