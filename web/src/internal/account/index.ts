import { useContext } from "react";
import AccountProvider, { AccountContext, AccountDispatchContext } from "./context";

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

export const useAccountContext = () => {
    const state = useContext(AccountContext);
    const dispatch = useContext(AccountDispatchContext);
    if (!state || !dispatch) throw new Error('account context must be used within provider');
    return { state, dispatch }
}

export { AccountProvider }
