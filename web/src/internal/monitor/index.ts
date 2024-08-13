import * as sapi from "../../server"
import { useContext } from "react";
import { MonitorContext, MonitorDispatchContext } from "./context";
import { Measurement } from "../measurement";

export const
    HTTP_UI = 'HTTP',
    ICMP_UI = 'ICMP',
    TCP_UI = 'TCP',
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
    id: number,
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
    httpCaptureHeaders: boolean | null,
    httpCaptureBody: boolean | null,
    icmpSize: number | null,
    icmpWait: number | null,
    icmpCount: number | null,
    icmpTtl: number | null,
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
        && a.httpCaptureHeaders == b.httpCaptureHeaders
        && a.httpCaptureBody == b.httpCaptureBody
        && a.icmpSize == b.icmpSize
        && a.icmpWait == b.icmpWait
        && a.icmpCount == b.icmpCount
        && a.icmpTtl == b.icmpTtl
}

export function kindAPItoUI(value: string) {
    switch (value) {
        case sapi.HTTP_API: return HTTP_UI
        case sapi.ICMP_API: return ICMP_UI
        case sapi.TCP_API: return TCP_UI
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

