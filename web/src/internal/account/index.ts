import { useContext } from "react"
import { AccountContext, AccountDispatchContext } from "./context"

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
    sub: string,
    iat: number,
    exp: number,
    root: boolean,
}

export const useAccountContext = () => {
    const state = useContext(AccountContext);
    const dispatch = useContext(AccountDispatchContext);
    if (!state || !dispatch) throw new Error('account context must be used within provider');
    return { state, dispatch }
}
