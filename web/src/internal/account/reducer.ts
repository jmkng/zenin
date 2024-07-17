import { Account, Token } from ".";

export interface AccountState {
    initialized: boolean;
    authenticated: Account | null
}

export const accountDefault: AccountState = {
    initialized: false,
    authenticated: null,
}

type LoginAction = { type: 'login', token: string };
type LogoutAction = { type: 'logout' };

export type AccountAction =
    | LoginAction
    | LogoutAction

const login = (state: AccountState, action: LoginAction): AccountState => {
    const raw = action.token;
    const header = JSON.parse(window.atob(raw.split('.')[0]));
    const payload = JSON.parse(window.atob(raw.split('.')[1]));
    const token: Token = { raw, header, payload };
    const initialized = true;
    const authenticated = { token };
    return { ...state, initialized, authenticated };
}

const logout = (state: AccountState): AccountState => {
    const initialized = true;
    const authenticated = null;
    return { ...state, initialized, authenticated };
}

const accountReducer = (state: AccountState, action: AccountAction): AccountState => {
    switch (action.type) {
        case "login": return login(state, action);
        case "logout": return logout(state);
    }
}

export { accountReducer };
