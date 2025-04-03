import { Request } from "./request";
import { FEED, handleConnect, handleDisconnect } from "./feed";

export const
    HTTP_API = "HTTP",
    ICMP_API = "ICMP",
    UDP_API = "UDP",
    TCP_API = "TCP",
    PLUGIN_API = "PLUGIN",
    GET_API = "GET",
    HEAD_API = "HEAD",
    POST_API = "POST",
    PUT_API = "PUT",
    PATCH_API = "PATCH",
    DELETE_API = "DELETE",
    OPTIONS_API = "OPTIONS",
    OK_API = "OK",
    WARN_API = "WARN",
    DEAD_API = "DEAD",
    OFF_API = null,
    INFORMATIONAL_API = "100-199",
    SUCCESSFUL_API = "200-299",
    REDIRECTION_API = "300-399",
    CLIENTERROR_API = "400-499",
    SERVERERROR_API = "500-599"
    ;

type ErrorHandler = (error: unknown) => void;
    
export class Service {
    #interceptors: Interceptor[] = [];
    
    #networkErrorHandler?: ErrorHandler;
    #interceptorErrorHandler?: ErrorHandler;

    constructor() { }

    interceptor = (...interceptors: Interceptor[]): this => {
        for (const n of interceptors) {
            this.#interceptors.push(n);
        }
        return this;
    }

    /** Set a network error handler. */
    onNetworkError = (fn: ErrorHandler): this => {
        this.#networkErrorHandler = fn;
        return this;
    };
    
    /** Set an interceptor error handler. */
    onInterceptorError = (fn: ErrorHandler): this => {
        this.#interceptorErrorHandler = fn;
        return this;
    };

    extract = async (request: Request): Promise<Extract> => {
        let response;
        try {
            response = await request.response();
        } catch(err) {
            this.#networkErrorHandler?.(err);
            throw new Error("network request failed", { cause: err });
        }
        try {
            const extract = new Extract(response);
            for (const interceptor of this.#interceptors) {
                interceptor(extract);
            }
            return extract;
        } catch(err) {
            this.#interceptorErrorHandler?.(err);
            throw new Error("interceptor processing failed", { cause: err });
        }
    }
}

export type Interceptor = (extract: Extract) => void;

export class Extract {
    response: Response;

    constructor(response: Response) {
        this.response = response;
    }

    ok = () => this.response.ok

    status = () => this.response.status;

    unauthorized = () => this.response.status === 401

    json = async () => {
        try {
            const json = await this.response.json();
            return json;
        } catch(err) {
            console.error("failed to extract JSON response body:", err)
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
    return obj && typeof obj.data == "object"
}

export interface CreatedTimestamp {
    id: number,
    time: TimestampRFC3339
}

export interface Timestamp { 
    time: TimestampRFC3339 
}

/** An RFC3339 timestamp. (Ex. "2006-01-02T15:04:05Z07:00") */
export type TimestampRFC3339 = string;

export interface ErrorPacket {
    errors: string[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isErrorPacket(obj: any): obj is ErrorPacket {
    return obj && obj.errors && Array.isArray(obj.errors)
}

const PORT = import.meta.env.DEV ? "23111" : window.location.port
const BASE_ENDPOINT = `${window.location.hostname}:${PORT}/api/v1`;
export const BASE_WINDOW_PROTO_ENDPOINT = `${window.location.protocol}//${BASE_ENDPOINT}`;
export const FEED_WS_ENDPOINT = `ws://${BASE_ENDPOINT}/feed`;

export { FEED, handleConnect, handleDisconnect };