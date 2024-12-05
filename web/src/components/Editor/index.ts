import { MetaState } from "../../internal/meta/reducer";
import { Monitor, Event, PairListValue } from "../../internal/monitor";
import {
    CLIENTERROR_API,
    GET_API,
    HTTP_API,
    ICMP_API,
    INFORMATIONAL_API,
    OFF_API,
    PLUGIN_API,
    REDIRECTION_API,
    SERVERERROR_API,
    SUCCESSFUL_API,
    TCP_API
} from "../../server";

/** EditorState contains two seperate (!=) instances of `Draft`, one for the current values and one for the original. */
export type EditorState = { draft: Draft, original: Draft };

/** Perform a deep clone of the provided `Monitor` and cast it to `Draft`, updating any missing values. */
export function reset(value: Monitor | null, state: MetaState): Draft {
    const defaults = {
        name: null,
        kind: PLUGIN_API,
        active: false,
        interval: 1800,
        timeout: 10,
        description: null,
        remoteAddress: null,
        remotePort: null,
        pluginName: state.plugins[0] || null,
        pluginArgs: null,
        httpRange: SUCCESSFUL_API,
        httpMethod: GET_API,
        httpRequestHeaders: null,
        httpRequestBody: null,
        httpExpiredCertMod: OFF_API,
        httpCaptureHeaders: false,
        httpCaptureBody: false,
        icmpSize: 56,
        icmpWait: 100,
        icmpCount: 3,
        icmpTtl: 64,
        icmpProtocol: ICMP_API,
        events: null
    };

    if (value == null) return defaults;

    const draft = { ...value } as Draft;
    for (const [key, value] of Object.entries(draft)) {
        //@ts-expect-error Ignore type for assignment.
        if (value === null) draft[key] = defaults[key];
    }

    return draft;
}

/** Return an `EditorState` from the provided `Draft`, where both sides of state contain separate (!=) values */
export function split(value: Draft): EditorState {
    const clone = (n: Draft): Draft => {
        return {
            ...n,
            pluginArgs: n.pluginArgs ? [...n.pluginArgs] : null,
            httpRequestHeaders: n.httpRequestHeaders
                ? n.httpRequestHeaders.map(header => ({ ...header }))
                : null,
        };
    };

    const draft = clone(value), original = clone(value);
    if (draft.pluginArgs != null && draft.pluginArgs == original.pluginArgs)
        throw new Error("plugin arguments must not be equal after split");
    if (draft.httpRequestHeaders != null && draft.httpRequestHeaders == original.httpRequestHeaders)
        throw new Error("http request headers must not be equal after split");

    return { draft, original };
}

/** Similar to `Monitor`, but some fields may be null because they aren't filled in yet. */
export interface Draft {
    name: string | null,
    kind: string,
    active: boolean,
    interval: number | null,
    timeout: number | null,
    description: string | null,
    remoteAddress: string | null,
    remotePort: number | null,
    pluginName: string | null,
    pluginArgs: string[] | null,
    httpRange: string,
    httpMethod: string | null,
    httpRequestHeaders: PairListValue | null,
    httpRequestBody: string | null
    httpExpiredCertMod: string | null,
    httpCaptureHeaders: boolean,
    httpCaptureBody: boolean,
    icmpSize: number | null,
    icmpWait: number | null,
    icmpCount: number | null,
    icmpTtl: number | null,
    icmpProtocol: string,
    events: Event[] | null
}

export function isValidMonitor(draft: Draft): boolean {
    if (!isValidName(draft.name) || !isValidState(draft.active) || !isValidInterval(draft.interval)
        || !isValidTimeout(draft.timeout) || !isValidKind(draft.kind)) return false;

    if (draft.events != null) {
        for (const n of draft.events) {
            if (!isValidEvent(n)) return false;
        }
    }

    switch (draft.kind) {
        case HTTP_API: return isValidHTTP(draft)
        case ICMP_API: return isValidICMP(draft)
        case TCP_API: return isValidTCP(draft)
        case PLUGIN_API: return isValidPlugin(draft)
        default: throw new Error("unrecognized probe")
    }
}

function isValidHTTP(draft: Draft): boolean {
    return isValidRemoteAddress(draft.remoteAddress) && isValidHeaderRange(draft.httpRange);
}

function isValidICMP(draft: Draft): boolean {
    return isValidRemoteAddress(draft.remoteAddress) && isValidNonZeroNumber(draft.icmpSize)
        && isValidNonZeroNumber(draft.icmpWait) && isValidNonZeroNumber(draft.icmpCount) && isValidNonZeroNumber(draft.icmpTtl);
}

function isValidTCP(draft: Draft): boolean {
    return isValidRemoteAddress(draft.remoteAddress) && isValidRemotePort(draft.remotePort)
}

function isValidPlugin(draft: Draft): boolean {
    if (!draft.pluginName) return false;

    if (draft.pluginArgs && draft.pluginArgs.length > 0) {
        for (const n of draft.pluginArgs) if (n.trim() == "") return false;
    }

    return true;
}

function isValidHeaderRange(range: string | null): boolean {
    if (!range || ![INFORMATIONAL_API, SUCCESSFUL_API, REDIRECTION_API, CLIENTERROR_API, SERVERERROR_API].includes(range)) return false;
    return true;
}

export function isValidNonZeroNumber(value: number | null): boolean {
    return value != null && value > 0;
}

export function isValidName(name: string | null): boolean {
    return name != null && name.trim() != "";
}

export function isValidKind(kind: string | null): boolean {
    return kind != null && [HTTP_API, ICMP_API, TCP_API, PLUGIN_API].includes(kind)
}

export function isValidState(state: boolean): boolean {
    return typeof state === 'boolean';
}

export function isValidInterval(interval: number | null): boolean {
    return interval != null && interval >= 0;
}

export function isValidTimeout(timeout: number | null): boolean {
    return timeout != null && timeout >= 0
}

export function isValidRemoteAddress(remote: string | null): boolean {
    if (!remote || remote.trim() == "") return false;
    return true;
}

export function isValidRemotePort(port: number | null): boolean {
    return port != null && port >= 0 && port <= 65535;
}

export function isValidEvent(event: Event): boolean {
    if (event.pluginName == null || event.pluginName.trim() == "") return false;

    if (event.pluginArgs && event.pluginArgs.length > 0) {
        for (const n of event.pluginArgs) if (n.trim() == "") return false;
    }

    return true;
}

export function sanitize(draft: Draft): Monitor {
    const monitor = { ...draft } as Monitor;
    switch (monitor.kind) {
        case HTTP_API:
            monitor.icmpSize = null;
            monitor.icmpCount = null;
            monitor.icmpProtocol = null;
            monitor.icmpWait = null;
            monitor.icmpTtl = null;
            monitor.pluginName = null;
            monitor.pluginArgs = null;
            break;
        case TCP_API:
            monitor.httpRequestHeaders = null;
            monitor.httpRequestBody = null;
            monitor.httpExpiredCertMod = null;
            monitor.httpCaptureHeaders = null;
            monitor.httpCaptureBody = null;
            monitor.httpMethod = null;
            monitor.httpRange = null;
            monitor.icmpSize = null;
            monitor.icmpCount = null;
            monitor.icmpProtocol = null;
            monitor.icmpWait = null;
            monitor.icmpTtl = null;
            monitor.pluginName = null;
            monitor.pluginArgs = null;
            break;
        case ICMP_API:
            monitor.remotePort = null;
            monitor.httpRequestHeaders = null;
            monitor.httpRequestBody = null;
            monitor.httpExpiredCertMod = null;
            monitor.httpCaptureHeaders = null;
            monitor.httpCaptureBody = null;
            monitor.httpMethod = null;
            monitor.httpRange = null;
            monitor.pluginName = null;
            break;
        case PLUGIN_API:
            monitor.remoteAddress = null;
            monitor.remotePort = null;
            monitor.httpRequestHeaders = null;
            monitor.httpRequestBody = null;
            monitor.httpExpiredCertMod = null;
            monitor.httpCaptureHeaders = null;
            monitor.httpCaptureBody = null;
            monitor.httpMethod = null;
            monitor.httpRange = null;
            monitor.icmpSize = null;
            monitor.icmpCount = null;
            monitor.icmpProtocol = null;
            monitor.icmpWait = null;
            monitor.icmpTtl = null;
            break;
    }

    return monitor;
}
