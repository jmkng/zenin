import { Request } from "./request";

export const
    HTTP_API = 'HTTP',
    ICMP_API = 'ICMP',
    TCP_API = 'TCP',
    PING_API = 'PING',
    PLUGIN_API = 'PLUGIN',
    GET_API = 'GET',
    HEAD_API = 'HEAD',
    POST_API = 'POST',
    PUT_API = 'PUT',
    PATCH_API = 'PATCH',
    DELETE_API = 'DELETE',
    OPTIONS_API = 'OPTIONS',
    OK_API = 'OK',
    WARN_API = 'WARN',
    DEAD_API = 'DEAD',
    OFF_API = null,
    INFORMATIONAL_API = "100-199",
    SUCCESSFUL_API = "200-299",
    REDIRECTION_API = "300-399",
    CLIENTERROR_API = "400-499",
    SERVERERROR_API = "500-599"
    ;

export class Service {
    #interceptors: Interceptor[] = [];

    constructor() { }

    interceptor = (...interceptors: Interceptor[]) => {
        for (const n of interceptors) {
            this.#interceptors.push(n);
        }
        return this;
    }

    extract = async (request: Request) => {
        const response = await request.response();
        const extract = new Extract(response);
        for (const interceptor of this.#interceptors) {
            try {
                interceptor(extract);
            } catch {
                console.error(`failed to run interceptor task on response`);
            }
        }
        return extract;
    }
}

export type Interceptor = (extract: Extract) => void;

export class Extract {
    response: Response;
    body: unknown;

    constructor(response: Response) {
        this.response = response;
    }

    ok = () => this.response.ok

    unauthorized = () => this.response.status === 401

    json = async () => {
        try {
            const json = await this.response.json();
            return json;
        } catch {
            console.error('failed to extract response body')
            return null;
        }
    }
}

export type Packet<T> = DataPacket<T> | ErrorPacket;

export interface DataPacket<T> {
    data: T
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isDataPacket(obj: any): obj is DataPacket<any> {
    return obj && typeof obj.data == 'object'
}

export interface ErrorPacket {
    errors: string[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isErrorPacket(obj: any): obj is ErrorPacket {
    return obj && obj.errors && Array.isArray(obj.errors)
}

const PORT = import.meta.env.DEV ? '50010' : window.location.port
const BASE_ENDPOINT = `${window.location.hostname}:${PORT}/api/v1`;
export const BASE_WINDOW_PROTO_ENDPOINT = `${window.location.protocol}//${BASE_ENDPOINT}`;
export const FEED_WS_ENDPOINT = `ws://${BASE_ENDPOINT}/feed/subscribe`;
