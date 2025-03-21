import { useEffect, useMemo, useState } from "react";
import {
    ACTIVE_UI,
    Event,
    HTTP_UI,
    ICMP_UI,
    INACTIVE_UI,
    isMonitorEqual,
    Monitor,
    PairListValue,
    PLUGIN_UI,
    TCP_UI,
    useMonitorContext
} from "@/internal/monitor";
import { EditorPane } from "@/internal/monitor/split";
import {
    CLIENTERROR_API,
    DELETE_API,
    GET_API,
    HEAD_API,
    HTTP_API,
    ICMP_API,
    INFORMATIONAL_API,
    OFF_API,
    OPTIONS_API,
    PATCH_API,
    PLUGIN_API,
    POST_API,
    PUT_API,
    REDIRECTION_API,
    SERVERERROR_API,
    SUCCESSFUL_API,
    TCP_API,
    UDP_API
} from "@/internal/server";

import Button from "../../Button/Button";
import EventInput from "../../Input/EventInput/EventInput";
import NumberInput from "../../Input/NumberInput/NumberInput";
import PairListInput from "../../Input/PairListInput/PairListInput";
import PluginInput from "../../Input/PluginInput";
import SelectInput from "../../Input/SelectInput/SelectInput";
import SliderInput from "../../Input/SliderInput/SliderInput";
import TextAreaInput from "../../Input/TextAreaInput/TextAreaInput";
import TextInput from "../../Input/TextInput/TextInput";
import ToggleInput from "../../Input/ToggleInput/ToggleInput";

import "./Editor.css";

interface EditorProps {
    state: EditorPane
    onChange: (target: Monitor) => void;
}

export default function Editor(props: EditorProps) {
    const { state, onChange } = props;
    const monitor = {
        context: useMonitorContext(),
    }

    const base = useMemo(() => reset(state.monitor, monitor.context.state.plugins), [state.monitor]);
    const [editor, setEditor] = useState<EditorState>(split(base))
    const [isViewingEvents, setIsViewingEvents] = useState<boolean>(false);

    useEffect(() => setEditor(prev => ({ ...prev, ...split(base) })), [base])

    useEffect(() => {
        if (!state.monitor) return;
        const active = state.monitor.active;
        setEditor(prev => ({ ...prev, draft: { ...prev.draft, active }, original: { ...prev.original, active } }))
    }, [state.monitor])

    const hasValidName = useMemo(() => isValidName(editor.draft.name), [editor.draft.name])
    const hasValidInterval = useMemo(() => isValidNonZeroWholeNumber(editor.draft.interval), [editor.draft.interval])
    const hasValidTimeout = useMemo(() => isValidTimeout(editor.draft.timeout), [editor.draft.timeout])
    const hasValidRemoteAddress = useMemo(() => isValidRemoteAddress(editor.draft.remoteAddress), [editor.draft.remoteAddress])
    const hasValidRemotePort = useMemo(() => isValidRemotePort(editor.draft.remotePort), [editor.draft.remotePort]);
    const hasValidIcmpSize = useMemo(() => isValidNonZeroWholeNumber(editor.draft.icmpSize), [editor.draft.icmpSize]);
    const hasValidIcmpWait = useMemo(() => isValidNonZeroWholeNumber(editor.draft.icmpWait), [editor.draft.icmpWait]);
    const hasValidIcmpCount = useMemo(() => isValidNonZeroWholeNumber(editor.draft.icmpCount), [editor.draft.icmpCount]);
    const hasValidIcmpTtl = useMemo(() => isValidNonZeroWholeNumber(editor.draft.icmpTtl), [editor.draft.icmpTtl]);
    const canSave = useMemo(() => !isMonitorEqual(editor.draft as Monitor, editor.original as Monitor) && isValidMonitor(editor.draft), [editor])

    // Check if the ICMP probe values might cause the operation to exceed the timeout.
    const hasValidIcmpTime = useMemo(() => {
        const { icmpCount, icmpWait, timeout, kind } = editor.draft;
        if (!icmpCount || !icmpWait || !timeout || kind != ICMP_API)
            return true;
        // Compare the minimum time required to dispatch the packets to the timeout.
        return icmpCount * icmpWait / 1000 < timeout;
    }, [editor.draft.icmpWait, editor.draft.icmpCount, editor.draft.timeout, editor.draft.kind]);

    type eventFields = 'pluginName' | 'pluginArgs' | 'threshold';

    const handleUpdateEvent = (index: number, field: eventFields, value: any) => {
        setEditor(prev => ({
            ...prev,
            draft: {
                ...prev.draft,
                events: prev.draft.events!.map((n, i) => i === index ? { ...n, [field]: value } : n)
            }
        }));
    };

    const handleDeleteEvent = (index: number) => {
        setEditor(prev => {
            const events = prev.draft.events!.filter((_, i) => i !== index);
            return { ...prev, draft: { ...prev.draft, events: events.length == 0 ? null : events } }
        })
    };

    const monitorTab = <>
        <div className="h_mb-c">
            <TextInput
                label={<span className={hasValidName ? "" : "h_c-dead-a"}>Name</span>}
                name="detail_monitor_name"
                value={editor.draft.name}
                subtext="The monitor display name."
                onChange={name =>
                    setEditor(prev => ({ ...prev, draft: { ...prev.draft, name } }))}
            ></TextInput>
            {!hasValidName ?
                <span className="detail_validation h_c-dead-a">Name is required.</span>
                :
                null}
        </div>

        <div className="h_mb-c">
            <TextAreaInput
                label="Description"
                name="detail_monitor_description"
                value={editor.draft.description}
                subtext="The monitor description."
                onChange={description =>
                    setEditor(prev => ({ ...prev, draft: { ...prev.draft, description } }))}
            />
        </div>

        <div className="h_mb-c">
            <SelectInput
                name="detail_monitor_active"
                value={editor.draft.active.toString()}
                label="State"
                subtext="Controls the polling state of the monitor."
                options={[
                    { value: "true", text: ACTIVE_UI },
                    { value: "false", text: INACTIVE_UI }
                ]}
                onChange={value =>
                    setEditor(prev => ({ ...prev, draft: { ...prev.draft, active: value === 'true' } }))
                }
            />
        </div>

        <div className="h_mb-c">
            <NumberInput
                label={<span className={hasValidInterval ? "" : "h_c-dead-a"}>Interval</span>}
                name="detail_monitor_interval"
                value={editor.draft.interval}
                subtext="The seconds between each measurement when the monitor is active."
                onChange={interval =>
                    setEditor(prev => ({ ...prev, draft: { ...prev.draft, interval } }))}
            />
            {!hasValidInterval ?
                <span className="detail_validation h_c-dead-a">Requires an integer greater than zero.</span>
                :
                null}
        </div>

        <div className="h_mb-c">
            <NumberInput
                label={<span className={!hasValidTimeout ? "h_c-dead-a" : !hasValidIcmpTime ? "h_c-warn" : ""}>Timeout</span>}
                name="detail_monitor_timeout"
                value={editor.draft.timeout}
                subtext="The seconds that the probe has to complete before timing out."
                onChange={timeout =>
                    setEditor(prev => ({ ...prev, draft: { ...prev.draft, timeout } }))}
            />
            {!hasValidTimeout
                ? <span className="detail_validation h_c-dead-a">Requires a positive integer.</span>
                : !hasValidIcmpTime
                    ? <span className="detail_validation h_c-warn">Timeout may be insufficient to complete probe.</span>
                    : null}
        </div>

        <div className="h_mb-c detail_kind_container">
            <SelectInput
                label="Kind"
                name="detail_monitor_kind"
                value={editor.draft.kind}
                options={[
                    { value: PLUGIN_API, text: PLUGIN_UI },
                    { value: HTTP_API, text: HTTP_UI },
                    { value: TCP_API, text: TCP_UI },
                    { value: ICMP_API, text: ICMP_UI },
                ]}
                subtext={<span>Set the <a href="#">probe</a> type.</span>} /* TODO: Add documentation link. */
                onChange={kind => setEditor(prev => ({
                    ...prev, draft: {
                        ...prev.draft, kind,
                        pluginName: kind == PLUGIN_API ? prev.draft.pluginName || monitor.context.state.plugins[0] : null
                    }
                }))}
            />
        </div>

        {editor.draft.kind == HTTP_API || editor.draft.kind == ICMP_API || editor.draft.kind == TCP_API ?
            <div className="h_mb-c detail_remote_address_container">
                <TextInput
                    label={<span className={hasValidRemoteAddress ? "" : "h_c-dead-a"}>Remote Address</span>}
                    name="detail_monitor_remote_address"
                    value={editor.draft.remoteAddress}
                    subtext="The address of the remote server." /* TODO: Provide instructions on valid format, should it include "http", etc.. */
                    onChange={remoteAddress =>
                        setEditor(prev => ({ ...prev, draft: { ...prev.draft, remoteAddress } }))}
                ></TextInput>
                {!hasValidRemoteAddress ?
                    <span className="detail_validation h_c-dead-a">Remote address is required.</span>
                    :
                    null}
            </div>
            :
            null}

        {editor.draft.kind == TCP_API ?
            <div className="h_mb-c detail_remote_port_container">
                <NumberInput
                    label={<span className={hasValidRemotePort ? "" : "h_c-dead-a"}>Remote Port</span>}
                    name="detail_monitor_remote_port"
                    value={editor.draft.remotePort}
                    subtext="The port number on the remote server."
                    onChange={remotePort =>
                        setEditor(prev => ({ ...prev, draft: { ...prev.draft, remotePort } }))}
                />
                {!hasValidRemotePort ?
                    <span className="detail_validation h_c-dead-a">Requires an integer between 0 and 65535, inclusive.</span>
                    :
                    null}
            </div>
            : null}

        {editor.draft.kind == HTTP_API ?
            <div>
                <div className="h_mb-c">
                    <PairListInput
                        label="Request Headers"
                        name="detail_monitor_http_request_headers"
                        value={editor.draft.httpRequestHeaders ?? [{ key: "", value: "" }]}
                        onChange={httpRequestHeaders => setEditor(prev => ({ ...prev, draft: { ...prev.draft, httpRequestHeaders } }))}
                    />
                </div>

                <div className="h_mb-c">
                    <TextAreaInput
                        label="Request Body"
                        name="detail_monitor_http_body"
                        value={editor.draft.httpRequestBody}
                        subtext="A body to send with the HTTP request."
                        onChange={httpRequestBody =>
                            setEditor(prev => ({ ...prev, draft: { ...prev.draft, httpRequestBody } }))}
                    />
                </div>

                <div className="h_mb-c">
                    <SelectInput
                        label="Method"
                        name="detail_monitor_method"
                        options={[
                            { text: GET_API, value: GET_API },
                            { text: HEAD_API, value: HEAD_API },
                            { text: POST_API, value: POST_API },
                            { text: PUT_API, value: PUT_API },
                            { text: PATCH_API, value: PATCH_API },
                            { text: DELETE_API, value: DELETE_API },
                            { text: OPTIONS_API, value: OPTIONS_API },
                        ]}
                        subtext={<span>Set the HTTP <a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods">method</a> used to make the request.</span>}
                        value={editor.draft.httpMethod!}
                        onChange={httpMethod => setEditor(prev => ({ ...prev, draft: { ...prev.draft, httpMethod } }))}
                    />
                </div>

                <div className="h_mb-c">
                    <SelectInput
                        label="Header Range"
                        name="detail_monitor_range"
                        options={[
                            { text: INFORMATIONAL_API, value: INFORMATIONAL_API },
                            { text: SUCCESSFUL_API, value: SUCCESSFUL_API },
                            { text: REDIRECTION_API, value: REDIRECTION_API },
                            { text: CLIENTERROR_API, value: CLIENTERROR_API },
                            { text: SERVERERROR_API, value: SERVERERROR_API },
                        ]}
                        subtext={<span>Set the range of <a href="https://datatracker.ietf.org/doc/html/rfc2616#section-10">status codes</a> that will indicate a successful probe.</span>}
                        value={editor.draft.httpRange}
                        onChange={httpRange => setEditor(prev => ({ ...prev, draft: { ...prev.draft, httpRange } }))}
                    />
                </div>

                <div className="h_mb-c">
                    <ToggleInput
                        name={"detail_capture_header"}
                        label="Capture Response Headers"
                        value={editor.draft.httpCaptureHeaders}
                        onChange={httpCaptureHeaders => setEditor(prev => ({ ...prev, draft: { ...prev.draft, httpCaptureHeaders } }))}
                    />
                </div>
                <div className="h_mb-c">
                    <ToggleInput
                        name={"detail_capture_body"}
                        label="Capture Response Body"
                        value={editor.draft.httpCaptureBody}
                        onChange={httpCaptureBody => setEditor(prev => ({ ...prev, draft: { ...prev.draft, httpCaptureBody } }))}
                    />
                </div>
            </div>
            :
            null}

        {editor.draft.kind == ICMP_API ?
            <>
                <div className="h_mb-c">
                    <ToggleInput
                        name={"detail_"}
                        label="Use UDP Protocol"
                        offSubtext={<div className="detail_stacked_hint">
                            <div>The probe will use ICMP protocol.</div>
                            <div className="h_c-warn">Requires root on Unix systems.</div>
                        </div>}
                        onSubtext={<div className="detail_stacked_hint">
                            <div>The probe will use UDP protocol.</div>
                            <div className="h_c-warn">Unsupported on Windows systems.</div>
                        </div>}
                        value={editor.draft.icmpProtocol == UDP_API}
                        onChange={value =>
                            setEditor(prev => ({
                                ...prev,
                                draft: { ...prev.draft, icmpProtocol: value ? UDP_API : ICMP_API }
                            }))}
                    />
                </div>

                <div className="h_mb-c">
                    <NumberInput
                        label={<span className={hasValidIcmpSize ? "" : "h_c-dead-a"}>Packet Size</span>}
                        name="detail_monitor_icmp_size"
                        value={editor.draft.icmpSize}
                        subtext="The packet size in bytes."
                        onChange={icmpSize => setEditor(prev => ({ ...prev, draft: { ...prev.draft, icmpSize } }))}
                    />
                    {!hasValidIcmpSize ?
                        <span className="detail_validation h_c-dead-a">Packet size must be greater than zero.</span>
                        :
                        null}
                </div>

                <div className="h_mb-c">
                    <NumberInput
                        label={<span className={!hasValidIcmpWait ? "h_c-dead-a" : !hasValidIcmpTime ? "h_c-warn" : ""}>Packet Wait</span>}
                        name="detail_monitor_icmp_wait"
                        value={editor.draft.icmpWait}
                        subtext="The milliseconds to wait between each outgoing packet."
                        onChange={icmpWait => setEditor(prev => ({ ...prev, draft: { ...prev.draft, icmpWait } }))}
                    />
                    {!hasValidIcmpWait ?
                        <span className="detail_validation h_c-dead-a">Packet wait must be greater than zero.</span>
                        :
                        null}
                </div>

                <div className="h_mb-c">
                    <NumberInput
                        label={<span className={!hasValidIcmpCount ? "h_c-dead-a" : !hasValidIcmpTime ? "h_c-warn" : ""}>Packet Count</span>}
                        name="detail_monitor_icmp_count"
                        value={editor.draft.icmpCount}
                        subtext="The total packets to send."
                        onChange={icmpCount => setEditor(prev => ({ ...prev, draft: { ...prev.draft, icmpCount } }))}
                    />
                    {!hasValidIcmpCount ?
                        <span className="detail_validation h_c-dead-a">Packet count must be greater than zero.</span>
                        :
                        null}
                </div>

                <div className="h_mb-c">
                    <NumberInput
                        label={<span className={hasValidIcmpTtl ? "" : "h_c-dead-a"}>Packet TTL</span>}
                        name="detail_monitor_icmp_ttl"
                        value={editor.draft.icmpTtl}
                        subtext="The TTL for each outgoing packet."
                        onChange={icmpTtl => setEditor(prev => ({ ...prev, draft: { ...prev.draft, icmpTtl } }))}
                    />
                    {!hasValidIcmpTtl ?
                        <span className="detail_validation h_c-dead-a">Packet TTL must be greater than zero.</span>
                        :
                        null}
                </div>

                <div className="h_mb-c">
                    <SliderInput
                        label={"Allowable Packet Loss"}
                        name={"detail_monitor_icmp_loss_threshold"}
                        value={editor.draft.icmpLossThreshold || 0}
                        max={99}
                        subtext={`${editor.draft.icmpLossThreshold || 0}%`}
                        onChange={icmpLossThreshold =>
                            setEditor(prev => ({
                                ...prev, draft: {
                                    ...prev.draft,
                                    icmpLossThreshold: icmpLossThreshold == 0 ? null : icmpLossThreshold
                                }
                            }))
                        }
                    />
                </div>
            </>
            : null}

        {editor.draft.kind == PLUGIN_API
            ? <div className="h_mb-c">
                <PluginInput
                    plugin={{
                        subtext: (<span>Choose a <a href="#">plugin</a> to probe the monitor.</span>),
                        value: editor.draft.pluginName,
                        onChange: pluginName => setEditor(prev => ({ ...prev, draft: { ...prev.draft, pluginName } }))
                    }}
                    args={{
                        subtext: "Arguments passed to the plugin.",
                        value: editor.draft.pluginArgs,
                        onChange: pluginArgs => setEditor(prev => ({ ...prev, draft: { ...prev.draft, pluginArgs } }))
                    }}
                />
            </div>
            : null}
    </>

    const eventTab = <>
        {editor.draft.events && editor.draft.events.length > 0
            ? <div className="detail_events">
                {editor.draft.events.map((event, index) => <div key={index} className="detail_event_container">
                    <div className="detail_event">
                        <EventInput
                            plugin={{
                                value: event.pluginName,
                                onChange: value => handleUpdateEvent(index, 'pluginName', value)
                            }}
                            args={{
                                value: event.pluginArgs,
                                onChange: value => handleUpdateEvent(index, 'pluginArgs', value)
                            }}
                            threshold={{
                                value: event.threshold,
                                onChange: value => handleUpdateEvent(index, 'threshold', value)
                            }}
                            onDelete={() => handleDeleteEvent(index)}
                        />
                    </div>
                </div>)}
            </div>
            : null}

        <Button
            border={true}
            onClick={() => setEditor(prev => ({
                ...prev,
                draft: {
                    ...prev.draft,
                    events: [
                        ...(prev.draft.events || []),
                        {
                            pluginName: (monitor.context.state.plugins[0] || null),
                            pluginArgs: null, threshold: null
                        } as Event
                    ]
                }
            }))}
        >
            <span>Add Event</span>
        </Button>
    </>

    return <div className="detail_component">
        <div className="detail_body">
            <h1 className="h_m-0 h_mb-c">{editor.original.name}</h1>
            {isViewingEvents ? eventTab : monitorTab}
        </div>

        <div className="detail_controls">
            <Button
                kind="primary"
                disabled={!canSave}
                onClick={() => onChange(sanitize(editor.draft))}
            >
                <span>Save</span>
            </Button>
            {isViewingEvents
                ? <Button
                    border={true}
                    onClick={() => {
                        isViewingEvents
                            ? setIsViewingEvents(false)
                            : monitor.context.dispatch({ type: 'pane', pane: { type: 'editor', monitor: null } })
                    }}
                >
                    Back
                </Button>
                : <Button border={true} onClick={() => setIsViewingEvents(true)}>
                    Events
                </Button>}
            <div className="h_ml-auto">
                <Button
                    border={true}
                    onClick={() => monitor.context.dispatch({ type: 'pane', pane: { type: 'editor', monitor: null } })}
                >
                    Close
                </Button>
            </div>
        </div>
    </div >
}

/** EditorState contains two separate (!=) instances of `Draft`, 
    * one for the current values and one for the original. */
type EditorState = { draft: Draft, original: Draft };

/** Perform a deep clone of the provided `Monitor` and cast it to `Draft`, updating any missing values. */
function reset(value: Monitor | null, plugins: string[]): Draft {
    const defaults = {
        name: null,
        kind: PLUGIN_API,
        active: false,
        interval: 1800,
        timeout: 10,
        description: null,
        remoteAddress: null,
        remotePort: null,
        pluginName: plugins[0] || null,
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
        icmpLossThreshold: 0,
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
function split(value: Draft): EditorState {
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
interface Draft {
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
    icmpLossThreshold: number | null,
    events: Event[] | null
}

function isValidMonitor(draft: Draft): boolean {
    if (
        !isValidName(draft.name)
        || !isValidState(draft.active)
        || !isValidInterval(draft.interval)
        || !isValidTimeout(draft.timeout)
        || !isValidKind(draft.kind)
    ) return false;

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
    return isValidRemoteAddress(draft.remoteAddress) && isValidNonZeroWholeNumber(draft.icmpSize)
        && isValidNonZeroWholeNumber(draft.icmpWait) && isValidNonZeroWholeNumber(draft.icmpCount) && isValidNonZeroWholeNumber(draft.icmpTtl);
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

function isValidNonZeroWholeNumber(value: number | null): boolean {
    return value != null && Number.isInteger(value) && value > 0;
}

function isValidName(name: string | null): boolean {
    return name != null && name.trim() != "";
}

function isValidKind(kind: string | null): boolean {
    return kind != null && [HTTP_API, ICMP_API, TCP_API, PLUGIN_API].includes(kind)
}

function isValidState(state: boolean): boolean {
    return typeof state === 'boolean';
}

function isValidInterval(interval: number | null): boolean {
    return isValidNonZeroWholeNumber(interval);
}

function isValidTimeout(timeout: number | null): boolean {
    return timeout != null && Number.isInteger(timeout) && timeout >= 0
}

function isValidRemoteAddress(remote: string | null): boolean {
    if (!remote || remote.trim() == "") return false;
    return true;
}

function isValidRemotePort(port: number | null): boolean {
    return port != null && Number.isInteger(port) && port >= 0 && port <= 65535;
}

function isValidEvent(event: Event): boolean {
    if (event.pluginName == null || event.pluginName.trim() == "") return false;

    if (event.pluginArgs && event.pluginArgs.length > 0) {
        for (const n of event.pluginArgs) if (n.trim() == "") return false;
    }

    return true;
}

function sanitize(draft: Draft): Monitor {
    const monitor = { ...draft } as Monitor;
    switch (monitor.kind) {
        case HTTP_API:
            monitor.icmpSize = null;
            monitor.icmpCount = null;
            monitor.icmpProtocol = null;
            monitor.icmpWait = null;
            monitor.icmpTtl = null;
            monitor.icmpLossThreshold = null;
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
            monitor.icmpLossThreshold = null;
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
            monitor.icmpLossThreshold = null;
            break;
    }

    return monitor;
}
