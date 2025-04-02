import { useContext } from "react";

import { AccountContext, AccountDispatchContext } from "@/internal/account/context";
import { AccountAction, AccountState } from "@/internal/account/reducer";
import { AccountService } from "@/internal/account/service";
import { useDefaultInterceptors } from "./useDefaultInterceptors";
import { useNetworkErrorHandler } from "./useNetworkErrorHandler";

export function useAccount(): { service: AccountService, context: AccountContextBundle } {
    const service = useAccountService();
    const context = useAccountContext();
    return { service, context };
}

export function useAccountService() {
    const onNetworkError = useNetworkErrorHandler();
    return useDefaultAccountService().onNetworkError(onNetworkError);
}

export function useDefaultAccountService() {
    const interceptors = useDefaultInterceptors();
    return new AccountService().interceptor(...interceptors);
};

type AccountContextBundle = { state: AccountState, dispatch: (action: AccountAction) => void }

export function useAccountContext(): AccountContextBundle {
    const state = useContext(AccountContext);
    const dispatch = useContext(AccountDispatchContext);
    if (!state || !dispatch) throw new Error('account context must be used within provider');
    return { state, dispatch }
}