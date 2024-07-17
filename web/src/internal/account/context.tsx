import { createContext, ReactNode, useReducer } from 'react';
import { AccountAction, accountDefault, accountReducer, AccountState } from './reducer';

export const AccountContext = createContext<AccountState | null>(null);
export const AccountDispatchContext = createContext<((action: AccountAction) => void) | null>(null);

interface AccountProviderProps {
    children?: ReactNode;
}

const AccountProvider = (props: AccountProviderProps) => {
    const { children } = props;
    const [state, dispatch] = useReducer(accountReducer, accountDefault);

    return (
        <AccountContext.Provider value={state}>
            <AccountDispatchContext.Provider value={dispatch}>
                {children}
            </AccountDispatchContext.Provider>
        </AccountContext.Provider>
    )
}

export default AccountProvider;
