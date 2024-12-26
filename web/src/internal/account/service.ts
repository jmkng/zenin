import { useRef } from "react";
import { AccountState } from "./reducer";
import { POST_API, Service } from "../../server";
import { Request } from "../../server/request";

class AccountService extends Service {
    #token = "zenin__auth_tk"

    constructor() { super(); }

    isAuthenticated(state: AccountState) {
        return state.initialized && (state.authenticated != null)
    }

    async login(username: string, password: string) {
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
