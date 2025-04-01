import { DELETE_API, PATCH_API, POST_API, Service } from "../server";
import { AuthenticatedRequest, Request } from "../server/request";

class AccountService extends Service {
    constructor() { super(); }

    async authenticate(username: string, password: string) {
        const address = `/account/authenticate`;
        const body = JSON.stringify({ username, password });
        const request = new Request(address).body(body).method(POST_API);
        return await this.extract(request);
    }

    async getClaimed() {
        const address = '/account/claim';
        const request = new Request(address);
        return await this.extract(request);
    }

    async setClaimed(username: string, password: string) {
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

    async createAccount(token: string, username: string, password: string) {
        const address = "/account";
        const body = JSON.stringify({ username, password });
        const request = new AuthenticatedRequest(token, address).method(POST_API).body(body);
        return await this.extract(request);
    }

    async deleteAccount(token: string, id: number[]) {
        const joined = id.join(',');
        const address = `/account?id=${joined}`;
        const request = new AuthenticatedRequest(token, address).method(DELETE_API);
        return await this.extract(request);
    }

    async updateAccount(token: string, id: number, username: string, password: string | null, reissue: boolean) {
        const address = `/account/${id}?reissue=${reissue}`;
        const body = JSON.stringify({ username, password });
        const request = new AuthenticatedRequest(token, address).body(body).method(PATCH_API);
        return await this.extract(request);
    }
}

export { AccountService };
