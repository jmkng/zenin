import { useContext } from "react";
import { MonitorContext, MonitorDispatchContext } from "./context";
import { Measurement } from "../measurement";
import { MonitorState } from "./reducer";
import { useDefaultMonitorService } from "./service";

export const
    HTTP_UI = 'HTTP',
    ICMP_UI = 'ICMP',
    TCP_UI = 'TCP',
    PLUGIN_UI = 'Plugin',
    OK_UI = 'Ok',
    WARN_UI = 'Warn',
    DEAD_UI = 'Dead',
    OFF_UI = 'Off',
    ACTIVE_UI = 'Active',
    INACTIVE_UI = 'Inactive',
    NAME_ASC_UI = 'Name (A-Z)',
    NAME_DESC_UI = 'Name (Z-A)',
    UPDATED_NEW_UI = 'Updated (New)',
    UPDATED_OLD_UI = 'Updated (Old)'
    ;

export type FilterKind =
    | "NAME_ASC"
    | "NAME_DESC"
    | "UPDATED_OLD"
    | "UPDATED_NEW"
    ;

export interface PairValue { key: string; value: string; }

export type PairListValue = PairValue[];

export interface Monitor {
    id: number,
    createdAt: string,
    updatedAt: string,
    name: string,
    kind: string,
    active: boolean,
    interval: number,
    timeout: number,
    description: string | null,
    remoteAddress: string | null,
    remotePort: number | null,
    pluginName: string | null,
    pluginArgs: string[] | null,
    httpRange: string | null,
    httpMethod: string | null,
    httpRequestHeaders: PairListValue | null,
    httpRequestBody: string | null
    httpExpiredCertMod: string | null,
    httpCaptureHeaders: boolean | null,
    httpCaptureBody: boolean | null,
    icmpSize: number | null,
    icmpWait: number | null,
    icmpCount: number | null,
    icmpTtl: number | null,
    icmpProtocol: string | null,
    icmpLossThreshold: number | null,
    measurements: Measurement[] | null
    events: Event[] | null
}

export interface Event {
    pluginName: string,
    pluginArgs: string[] | null,
    threshold: string | null
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

export function isArrayEqual(a1: any[] | null, a2: any[] | null): boolean {
    if (a1 == null && a2 == null) return true;
    if (a1 != null && a2 != null && a1.length == a2.length && a1.every((n, i) => n == a2[i])) return true;

    return false;
}

export function isMonitorEqual(a: Monitor, b: Monitor): boolean {
    const pleq = (a1: PairListValue | null, a2: PairListValue | null): boolean => {
        if (a1 == null && a2 == null) return true;
        if (a1 != null && a2 != null && a1.length == a2.length
            && a1.every((n, i) => n.key == a2[i].key && n.value == a2[i].value)) return true;

        return false;
    }
    const eveq = (a1: Event[] | null, a2: Event[] | null): boolean => {
        if (a1 == null && a2 == null) return true;

        if (a1 != null && a2 != null && a1.length === a2.length
            && a1.every((n, i) => n.pluginName === a2[i].pluginName && n.threshold === a2[i].threshold
                && ((n.pluginArgs == null && a2[i].pluginArgs == null) 
                    || (n.pluginArgs && a2[i].pluginArgs
                    && n.pluginArgs.length == a2[i].pluginArgs.length
                    && n.pluginArgs.every((a, ai) => a == a2[i].pluginArgs![ai]))
                ))) return true;

        return false;
    }

    return a.name == b.name
        && a.kind == b.kind
        && a.active == b.active
        && a.interval == b.interval
        && a.timeout == b.timeout
        && a.description == b.description
        && a.remoteAddress == b.remoteAddress
        && a.remotePort == b.remotePort
        && a.pluginName == b.pluginName
        && isArrayEqual(a.pluginArgs, b.pluginArgs)
        && a.httpRange == b.httpRange
        && a.httpMethod == b.httpMethod
        && pleq(a.httpRequestHeaders, b.httpRequestHeaders)
        && a.httpRequestBody == b.httpRequestBody
        && a.httpExpiredCertMod == b.httpExpiredCertMod
        && a.httpCaptureHeaders == b.httpCaptureHeaders
        && a.httpCaptureBody == b.httpCaptureBody
        && a.icmpSize == b.icmpSize
        && a.icmpWait == b.icmpWait
        && a.icmpCount == b.icmpCount
        && a.icmpTtl == b.icmpTtl
        && a.icmpProtocol == b.icmpProtocol
        && a.icmpLossThreshold == b.icmpLossThreshold
        && eveq(a.events, b.events)
}

export const useMonitorContext = () => {
    const state = useContext(MonitorContext);
    const dispatch = useContext(MonitorDispatchContext);
    if (!state || !dispatch) throw new Error('monitor context must be used within provider');
    return { state, dispatch }
}

export type { MonitorState };
export { useDefaultMonitorService };