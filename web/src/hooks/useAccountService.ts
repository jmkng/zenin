import { AccountService } from "@/internal/account/service";
import { useDefaultInterceptors } from "./useDefaultInterceptors";
import { useNetworkErrorHandler } from "./useNetworkErrorHandler";

export const useAccountService = () => {
    const onNetworkError = useNetworkErrorHandler();
    return useDefaultAccountService().onNetworkError(onNetworkError);
}

export const useDefaultAccountService = () => {
    const interceptors = useDefaultInterceptors();
    return new AccountService().interceptor(...interceptors);
};