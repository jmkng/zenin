import { PairListValue } from "../monitor"

export interface Measurement {
    id: number,
    createdAt: string,
    updatedAt: string,
    monitorId: number,
    duration: number,
    state: string
    stateHint: string[] | null,
    kind: string,
    httpStatusCode: number | null,
    httpResponseHeaders: PairListValue | null,
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
    return typeof obj == "object" &&
        Object.hasOwn(obj, "duration") && typeof obj.duration == "number" &&
        Object.hasOwn(obj, "state") && typeof obj.state === "string"
}

export interface Certificate {
    id: number,
    measurementId: number,
    version: number,
    serialNumber: string,
    publicKeyAlgorithm: string,
    issuerCommonName: string,
    subjectCommonName: string,
    notBefore: string,
    notAfter: string
}