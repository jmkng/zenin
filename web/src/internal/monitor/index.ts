import { useContext } from "react";
import * as sapi from "../../server"
import { MonitorContext, MonitorDispatchContext } from "./context";

export const
    HTTP_UI = 'HTTP',
    ICMP_UI = 'ICMP',
    TCP_UI = 'TCP',
    PING_UI = 'Ping',
    PLUGIN_UI = 'Plugin',
    ACTIVE_UI = 'Active',
    INACTIVE_UI = 'Inactive',
    OK_UI = 'Ok',
    WARN_UI = 'Warn',
    DEAD_UI = 'Dead',
    OFF_UI = 'Off'
    ;

export type FilterKind = "All" | typeof ACTIVE_UI | typeof INACTIVE_UI

export interface Monitor {
    id: number | null,
    name: string,
    kind: string,
    active: boolean,
    interval: number,
    timeout: number,
    description: string | null,
    remoteAddress: string | null,
    remotePort: number | null,
    pluginName: string | null,
    pluginArgs: string | null,
    httpRange: string | null,
    httpMethod: string | null,
    httpRequestHeaders: string | null,
    httpRequestBody: string | null
    httpExpiredCertMod: string | null,
    icmpSize: number | null
    measurements: Measurement[] | null
}

// eslint-disable-next-line
export function isMonitor(obj: any): obj is Monitor {
    return obj &&
        Object.hasOwn(obj, 'name') && typeof obj.name === 'string' &&
        Object.hasOwn(obj, 'kind') && typeof obj.kind === 'string' &&
        Object.hasOwn(obj, 'active') && typeof obj.active == 'boolean' &&
        Object.hasOwn(obj, 'interval') && typeof obj.interval === 'number' &&
        Object.hasOwn(obj, 'timeout') && typeof obj.timeout === 'number'
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
    pluginArgs: string | null,
    httpRange: string,
    httpMethod: string | null,
    httpRequestHeaders: string | null,
    httpRequestBody: string | null
    httpExpiredCertMod: string | null,
    icmpSize: number | null
}

export function monitorEquals(a: Monitor, b: Monitor): boolean {
    return a.name == b.name
        && a.kind == b.kind
        && a.active == b.active
        && a.interval == b.interval
        && a.timeout == b.timeout
        && a.description == b.description
        && a.remoteAddress == b.remoteAddress
        && a.remotePort == b.remotePort
        && a.pluginName == b.pluginName
        && a.pluginArgs == b.pluginArgs
        && a.httpRange == b.httpRange
        && a.httpMethod == b.httpMethod
        && a.httpRequestHeaders == b.httpRequestHeaders
        && a.httpRequestBody == b.httpRequestBody
        && a.httpExpiredCertMod == b.httpExpiredCertMod
        && a.icmpSize == b.icmpSize
}

export interface Measurement {
    id: number | null,
    monitorId: number | null,
    recordedAt: string,
    duration: number,
    state: string
    stateHint: string | null,
    httpStatusCode: number | null,
    httpResponseHeaders: string | null,
    httpResponseBody: string | null,
    icmpPacketsIn: number | null,
    icmpPacketsOut: number | null,
    icmpMinRtt: number | null,
    icmpAvgRtt: number | null,
    icmpMaxRtt: number | null,
    pluginExitCode: string | null,
    pluginStdout: string | null,
    pluginStderr: string | null,
}

// eslint-disable-next-line
export function isMeasurement(obj: any): obj is Measurement {
    return typeof obj == 'object' &&
        Object.hasOwn(obj, 'recordedAt') && typeof obj.recordedAt == 'string' &&
        Object.hasOwn(obj, 'duration') && typeof obj.duration == 'number' &&
        Object.hasOwn(obj, 'state') && typeof obj.state === 'string'
}

export function isValidMonitor(draft: Draft): boolean {
    if (!isValidName(draft.name)
        || !isValidState(draft.active)
        || !isValidInterval(draft.interval)
        || !isValidTimeout(draft.timeout)
        || !isValidKind(draft.kind)) return false;

    switch (draft.kind) {
        case sapi.HTTP_API: return isValidHTTP(draft)
        case sapi.PING_API, sapi.ICMP_API: return isValidICMP(draft)
        case sapi.TCP_API: return isValidTCP(draft)
        case sapi.PLUGIN_API: return isValidPlugin(draft)
        default: throw new Error("unrecognized probe")
    }
}

function isValidHTTP(draft: Draft): boolean {
    return isValidRemoteAddress(draft.remoteAddress) && isValidHeaderRange(draft.httpRange)
        && isValidJSON(draft.httpRequestHeaders) && isValidJSON(draft.httpRequestBody);
}

function isValidICMP(draft: Draft): boolean {
    return isValidRemoteAddress(draft.remoteAddress) && isValidIcmpSize(draft.icmpSize);
}

function isValidTCP(draft: Draft): boolean {
    return isValidRemoteAddress(draft.remoteAddress) && isValidRemotePort(draft.remotePort)
}

function isValidPlugin(draft: Draft): boolean {
    if (!draft.pluginName) return false;
    return true;
}

export function isValidName(name: string | null): boolean {
    return name != null && name.trim() != "";
}

export function isValidKind(kind: string | null): boolean {
    return kind != null && [sapi.HTTP_API, sapi.ICMP_API, sapi.TCP_API, sapi.PING_API, sapi.PLUGIN_API].includes(kind)
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

export function isValidHeaderRange(range: string | null): boolean {
    const set = [
        sapi.INFORMATIONAL_API,
        sapi.SUCCESSFUL_API,
        sapi.REDIRECTION_API,
        sapi.CLIENTERROR_API,
        sapi.SERVERERROR_API
    ];
    if (!range || !set.includes(range)) return false;
    return true;
}

/** Return true if the provided string is valid JSON. **/
export function isValidJSON(body: string | null): boolean {
    if (body == null) return true;
    try {
        JSON.parse(body);
        return true;
    } catch {
        return false;
    }
}

/** Return true if the provided string is a valid JSON array.
    Any other type is considered invalid. **/
export function isValidJSONArray(body: string | null): boolean {
    if (body == null) return true;
    try {
        const result = JSON.parse(body);
        if (Array.isArray(result)) return true;
        return false;
    } catch {
        return false;
    }
};

export function isValidPluginName(name: string | null): boolean {
    return name != null && name.trim() != "";
}

export function isValidIcmpSize(size: number | null): boolean {
    return size != null && size > 0;
}

export function kindAPItoUI(value: string) {
    switch (value) {
        case sapi.HTTP_API: return HTTP_UI
        case sapi.ICMP_API: return ICMP_UI
        case sapi.TCP_API: return TCP_UI
        case sapi.PING_API: return PING_UI
        case sapi.PLUGIN_API: return PLUGIN_UI
        default: return ""
    }
}

export const useMonitorContext = () => {
    const state = useContext(MonitorContext);
    const dispatch = useContext(MonitorDispatchContext);
    if (!state || !dispatch) throw new Error('monitor context must be used within provider');
    return { state, dispatch }
}

