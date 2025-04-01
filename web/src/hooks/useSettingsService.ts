import { SettingsService } from "@/internal/settings/service";
import { useDefaultInterceptors } from "./useDefaultInterceptors";
import { useNetworkErrorHandler } from "./useNetworkErrorHandler";

export const useSettingsService = () => {
    const onNetworkError = useNetworkErrorHandler();
    return useDefaultSettingsService().onNetworkError(onNetworkError);
}

export const useDefaultSettingsService = () => {
    const interceptors = useDefaultInterceptors();
    return new SettingsService().interceptor(...interceptors);
}