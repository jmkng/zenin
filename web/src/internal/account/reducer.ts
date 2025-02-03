import { Account, Token } from ".";

export interface AccountState {
    initialized: boolean;

    /** A token representing the currently authenticated account. Null when unauthenticated. */
    token: Token | null
    accounts: Account[]
}

export const accountDefault: AccountState = {
    initialized: false,
    token: null,
    accounts: []
}

type LoginAction = { type: 'login', token: string };
type LogoutAction = { type: 'logout' };
type ResetAction = { type: 'reset', accounts: Account[] };

export type AccountAction =
    | LoginAction
    | LogoutAction
    | ResetAction

const loginAction = (state: AccountState, action: LoginAction): AccountState => {
    const raw = action.token;
    const header = JSON.parse(window.atob(raw.split('.')[0]));
    const payload = JSON.parse(window.atob(raw.split('.')[1]));
    const token: Token = { raw, header, payload };
    const initialized = true;
    return { ...state, initialized, token: token };
}

const logoutAction = (state: AccountState): AccountState => {
    const initialized = true;
    const authenticated = null;
    return { ...state, initialized, token: authenticated };
}

const resetAction = (state: AccountState, action: ResetAction): AccountState => {
    const accounts = action.accounts;
    return { ...state, accounts };
};

const accountReducer = (state: AccountState, action: AccountAction): AccountState => {
    switch (action.type) {
        case "login": return loginAction(state, action);
        case "logout": return logoutAction(state);
        case "reset": return resetAction(state, action);
    }
}

export { accountReducer };
