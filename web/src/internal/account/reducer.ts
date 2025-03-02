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
type UpdateAction = { type: 'update', id: number, username: string, updatedAt: string };
type RemoveAction = { type: 'remove', id: number };
type CreateAction = { type: 'create', account: Account };

export type AccountAction =
    | LoginAction
    | LogoutAction
    | ResetAction
    | UpdateAction
    | RemoveAction
    | CreateAction

const loginAction = (state: AccountState, action: LoginAction): AccountState => {
    const raw = action.token;
    const header = JSON.parse(window.atob(raw.split('.')[0]));
    const payload = JSON.parse(window.atob(raw.split('.')[1]));
    const token: Token = { raw, header, payload };
    const initialized = true;
    return { ...state, initialized, token };
}

const logoutAction = (state: AccountState): AccountState => {
    const initialized = true;
    const token = null;
    const accounts: Array<Account> = [];
    return { ...state, initialized, token, accounts };
}

const resetAction = (state: AccountState, action: ResetAction): AccountState => {
    const accounts = action.accounts;
    return { ...state, accounts };
}

const updateAction = (state: AccountState, action: UpdateAction): AccountState => {
    const username = action.username;
    const updatedAt = action.updatedAt;
    return {
        ...state,
        accounts: state.accounts.map(acc => acc.id === action.id ? { ...acc, username, updatedAt } : acc),
    };
};

const removeAction = (state: AccountState, action: RemoveAction): AccountState => {
    return { ...state, accounts: state.accounts.filter(n => n.id != action.id) };
};

const createAction = (state: AccountState, action: CreateAction): AccountState => {
    return { ...state, accounts: [...state.accounts, action.account] }
};

const accountReducer = (state: AccountState, action: AccountAction): AccountState => {
    switch (action.type) {
        case "login": return loginAction(state, action);
        case "logout": return logoutAction(state);
        case "reset": return resetAction(state, action);
        case "update": return updateAction(state, action);
        case "remove": return removeAction(state, action);
        case "create": return createAction(state, action);
    }
}

export { accountReducer };
