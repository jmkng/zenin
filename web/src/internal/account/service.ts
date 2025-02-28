import { useRef } from "react";
import { AccountState } from "./reducer";
import { DELETE_API, PATCH_API, POST_API, Service } from "../server";
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

    async deleteAccount(token: string, id: number[]) {
        const joined = id.join(',');
        const address = `/account?id=${joined}`;
        const request = new AuthenticatedRequest(token, address).method(DELETE_API);
        return await this.extract(request);
    }

    /** Set the `zenin__auth_tk` key to the provided string in localStorage. */
    setLSToken = (token: string) => localStorage.setItem(this.#token, token);

    /** Read the `zenin__auth_tk` key from localStorage. */
    readLSToken = () => localStorage.getItem(this.#token);

    /** Clear the `zenin__auth_tk` key from localStorage. */
    clearLSToken = () => localStorage.removeItem(this.#token);
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
