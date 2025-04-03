import { BASE_WINDOW_PROTO_ENDPOINT } from ".";

export class Request {
    #address = BASE_WINDOW_PROTO_ENDPOINT;
    #method = "GET";
    #headers = { "Content-Type": "application/json", "Accept": "application/json" };
    #body: string | null = null

    constructor(address: string) {
        if (!address.startsWith("/")) throw new Error("request address must start with `/`");
        this.#address += address;
    }

    headers(headers: object) {
        this.#headers = { ...this.#headers, ...headers, };
        return this;
    }

    method(method: string) {
        this.#method = method;
        return this;
    }

    body(body: string) {
        this.#body = body;
        return this;
    }

    async response(): Promise<Response> {
        const options = this.#body ? { body: this.#body } : {};
        const response = await fetch(this.#address, { ...options, headers: this.#headers, method: this.#method })
        return response;
    }
}

export class AuthenticatedRequest extends Request {
    #token: string;

    constructor(token: string, address: string) {
        super(address);
        this.#token = token;
    }

    async response(): Promise<Response> {
        const authorization = { "Authorization": `Bearer ${this.#token}` };
        super.headers(authorization);
        const result = await super.response();
        return result;
    }
}
