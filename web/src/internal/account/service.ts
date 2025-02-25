import { useRef } from "react";
import { AccountState } from "./reducer";
import { PATCH_API, POST_API, Service } from "../server";
import { AuthenticatedRequest, Request } from "../server/request";

class AccountService extends Service {
    #token = "zenin__auth_tk"

    constructor() { super(); }

    isAuthenticated(state: AccountState) {
        return state.initialized && (state.token !== null)
    }

    async authenticate(username: string, password: string) {
        const address = `/account/authenticate`;
        const body = JSON.stringify({ username, password });
        const request = new Request(address).body(body).method(POST_API);
        return await this.extract(request);
    }

    async getClaim() {
        const address = '/account/claim';
        const request = new Request(address);
        return await this.extract(request);
    }

    async setClaim(username: string, password: string) {
        const address = `/account/claim`;
        const body = JSON.stringify({ username, password });
        const request = new Request(address).body(body).method(POST_API);
        return await this.extract(request);
    }

    async getAccounts(token: string) {
        const address = '/account'
        const request = new AuthenticatedRequest(token, address);
        return await this.extract(request)
    }

    async updateAccount(token: string, id: number, username: string, password: string | null, reissue: boolean) {
        const address = `/account/${id}?reissue=${reissue}`;
        const body = JSON.stringify({ username, password });
        const request = new AuthenticatedRequest(token, address).body(body).method(PATCH_API);
        return await this.extract(request);
    }

    setLSToken(token: string) {
        localStorage.setItem(this.#token, token);
    }

    readLSToken() {
        return localStorage.getItem(this.#token);
    }

    clearLSToken() {
        localStorage.removeItem(this.#token);
    }
}

export const useDefaultAccountService = () => {
    const ref = useRef<AccountService | null>(null);
    if (ref.current === null) {
        const service = new AccountService();
        ref.current = service;
    }
    return ref.current;
}

export { AccountService };
