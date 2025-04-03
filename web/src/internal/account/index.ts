import AccountProvider from "./context";

export const
    ROOT_ACCOUNT_UI = "Root"
    ;

export interface Account {
    id: number,
    createdAt: string,
    updatedAt: string,
    username: string,
    root: boolean
}

export interface Token {
    raw: string,
    header: TokenHeader,
    payload: TokenPayload
}

interface TokenHeader {
    typ: string,
    alg: string
}

interface TokenPayload {
    sub: number,
    iat: number,
    exp: number,
    username: string,
    root: boolean,
}

const TOKEN_KEY: string = "token";

/** Set the `token` key to the provided string in localStorage. */
export const setLSToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);

/** Read the `token` key from localStorage. */
export const readLSToken = () => localStorage.getItem(TOKEN_KEY);

/** Clear the `token` key from localStorage. */
export const clearLSToken = () => localStorage.removeItem(TOKEN_KEY);

export { AccountProvider }
