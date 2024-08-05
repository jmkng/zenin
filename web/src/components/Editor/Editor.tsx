import { useEffect, useMemo, useState } from "react";
import { useMetaContext } from "../../internal/meta";
import {
    ACTIVE_UI, HTTP_UI, ICMP_UI, INACTIVE_UI,
    Monitor, monitorEquals,
    PING_UI, PLUGIN_UI, TCP_UI,
} from "../../internal/monitor";
import { EditorState } from "../../internal/monitor/split";
import {
    CLIENTERROR_API, DELETE_API, GET_API, HEAD_API, HTTP_API, ICMP_API,
    INFORMATIONAL_API, OFF_API, OPTIONS_API, PATCH_API, PING_API, PLUGIN_API,
    POST_API, PUT_API, REDIRECTION_API, SERVERERROR_API, SUCCESSFUL_API, TCP_API
} from "../../server";

import Button from "../Button/Button";
import NumberInput from "../Icon/NumberInput/NumberInput";
import TrashIcon from "../Icon/TrashIcon/TrashIcon";
import SelectInput from "../Input/SelectInput/SelectInput";
import TextAreaInput from "../Input/TextAreaInput/TextAreaInput";
import TextInput from "../Input/TextInput/TextInput";
import ToggleInput from "../Input/ToggleInput/ToggleInput";

import "./Editor.css";

interface EditorProps {
    state: EditorState

    onChange: (target: Monitor) => void;
    onClose: () => void;
    onDelete: (monitor: Monitor) => void;
}

const defaultDraft: Draft = {
    name: null,
    kind: HTTP_API,
    active: false,
    interval: 300,
    timeout: 10,
    description: null,
    remoteAddress: null,
    remotePort: null,
    pluginName: null,
    pluginArgs: null,
    httpRange: SUCCESSFUL_API,
    httpMethod: GET_API,
    httpRequestHeaders: null,
    httpRequestBody: null,
    httpExpiredCertMod: OFF_API,
    httpCaptureHeaders: false,
    httpCaptureBody: false,
    icmpSize: 56
}

export default function EditorComponent(props: EditorProps) {
    const {
        state,
        onChange,
        onClose,
        onDelete
    } = props;
    const meta = {
        context: useMetaContext()
    };
    const [id, reset] = useMemo(() => state.monitor ? resetToDraft(state.monitor) : [null, defaultDraft], [state.monitor])
    const [editor, setEditor] = useState<{
        draft: Draft,
        original: Draft
    }>({ draft: reset, original: reset })

    const canSubmit = useMemo(() =>
        !monitorEquals(editor.draft as Monitor, editor.original as Monitor)
        && isValidMonitor(editor.draft), [editor])

    const hasValidName = useMemo(() => isValidName(editor.draft.name), [editor.draft.name])
    const hasValidInterval = useMemo(() => isValidInterval(editor.draft.interval), [editor.draft.interval])
    const hasValidTimeout = useMemo(() => isValidTimeout(editor.draft.timeout), [editor.draft.timeout])
    const hasValidRemoteAddress = useMemo(() => isValidRemoteAddress(editor.draft.remoteAddress), [editor.draft.remoteAddress])
    const hasValidRemotePort = useMemo(() => isValidRemotePort(editor.draft.remotePort), [editor.draft.remotePort]);
    const hasValidHttpBody = useMemo(() => isValidJSON(editor.draft.httpRequestBody), [editor.draft.httpRequestBody]);
    const hasValidHttpHeaders = useMemo(() => isValidJSON(editor.draft.httpRequestHeaders), [editor.draft.httpRequestHeaders]);
    const hasValidPluginArguments = useMemo(() => isValidJSONArray(editor.draft.pluginArgs), [editor.draft.pluginArgs]);
    const hasValidIcmpSize = useMemo(() => isValidIcmpSize(editor.draft.icmpSize), [editor.draft.icmpSize]);

    useEffect(() => {
        setEditor(prev => ({ ...prev, draft: reset, original: reset }))
    }, [reset])

    useEffect(() => {
        if (!state.monitor) return;
        const active = state.monitor.active;
        setEditor(prev => ({ ...prev, draft: { ...prev.draft, active }, original: { ...prev.original, active } }))
    }, [state.monitor])

    const handleSubmit = () => {
        const monitor = sanitizeToMonitor(editor.draft);
        if (id) onChange(monitor);
        else onChange(monitor);
    };

    return (
        <div className="zenin__detail_component">
            <div className="zenin__detail_editor_body">
                <div className="zenin__detail_spaced">
                    <TextInput
                        label={<span className={hasValidName ? "" : "zenin__h_error"}>Name</span>}
                        name="zenin__detail_monitor_name"
                        value={editor.draft.name}
                        subtext="The monitor display name."
                        onChange={name =>
                            setEditor(prev => ({ ...prev, draft: { ...prev.draft, name } }))}
                    ></TextInput>
                    {!hasValidName ?
                        <span className="zenin__detail_validation zenin__h_error">Must specify monitor name</span>
                        :
                        null}
                </div>

                <div className="zenin__detail_spaced">
                    <TextAreaInput
                        label="Description"
                        name="zenin__detail_monitor_description"
                        value={editor.draft.description}
                        subtext="The monitor description."
                        onChange={description =>
                            setEditor(prev => ({ ...prev, draft: { ...prev.draft, description } }))}
                    />
                </div>

                <div className="zenin__detail_spaced">
                    <SelectInput
                        name="zenin__detail_monitor_active"
                        value={editor.draft.active.toString()}
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

                <div className="zenin__detail_spaced">
                    <NumberInput
                        label={<span className={hasValidInterval ? "" : "zenin__h_error"}>Interval</span>}
                        name="zenin__detail_monitor_interval"
                        value={editor.draft.interval}
                        subtext="The seconds between each measurement when the monitor is active."
                        onChange={interval =>
                            setEditor(prev => ({ ...prev, draft: { ...prev.draft, interval } }))}
                    />
                    {!hasValidInterval ?
                        <span className="zenin__detail_validation zenin__h_error">Must specify valid, positive interval</span>
                        :
                        null}
                </div>

                <div className="zenin__detail_spaced">
                    <NumberInput
                        label={<span className={hasValidTimeout ? "" : "zenin__h_error"}>Timeout</span>}
                        name="zenin__detail_monitor_timeout"
                        value={editor.draft.timeout}
                        subtext="The seconds to wait before declaring the measurement dead."
                        onChange={timeout =>
                            setEditor(prev => ({ ...prev, draft: { ...prev.draft, timeout } }))}
                    />
                    {!hasValidTimeout ?
                        <span className="zenin__detail_validation zenin__h_error">Must specify valid, positive timeout</span>
                        :
                        null}
                </div>

                <div className="zenin__detail_spaced zenin__detail_kind_container">
                    <SelectInput
                        label="Kind"
                        name="zenin__detail_monitor_kind"
                        value={editor.draft.kind}
                        options={[
                            { value: HTTP_API, text: HTTP_UI },
                            { value: TCP_API, text: TCP_UI },
                            { value: ICMP_API, text: ICMP_UI },
                            { value: PING_API, text: PING_UI },
                            { value: PLUGIN_API, text: PLUGIN_UI }
                        ]}
                        subtext={<span>Specify the <a href="#">probe</a> type.</span>} /* TODO: Add documentation link. */
                        onChange={value =>
                            setEditor(prev => ({ ...prev, draft: { ...prev.draft, kind: value } }))}
                    />
                </div>

                {editor.draft.kind == HTTP_API || editor.draft.kind == ICMP_API || editor.draft.kind == TCP_API || editor.draft.kind == PING_API ?
                    <div className="zenin__detail_spaced zenin__detail_remote_address_container">
                        <TextInput
                            label={<span className={hasValidRemoteAddress ? "" : "zenin__h_error"}>Remote Address</span>}
                            name="zenin__detail_monitor_remote_address"
                            value={editor.draft.remoteAddress}
                            subtext="The address of the remote server." /* TODO: Provide instructions on valid format, should it include "http", etc.. */
                            onChange={remoteAddress =>
                                setEditor(prev => ({ ...prev, draft: { ...prev.draft, remoteAddress } }))}
                        ></TextInput>
                        {!hasValidRemoteAddress ?
                            <span className="zenin__detail_validation zenin__h_error">Must specify remote address</span>
                            :
                            null}
                    </div>
                    :
                    null}

                {editor.draft.kind == TCP_API ?
                    <div className="zenin__detail_spaced zenin__detail_remote_port_container">
                        <NumberInput
                            label={<span className={hasValidRemotePort ? "" : "zenin__h_error"}>Remote Port</span>}
                            name="zenin__detail_monitor_remote_port"
                            value={editor.draft.remotePort}
                            subtext="The port number on the remote server."
                            onChange={remotePort =>
                                setEditor(prev => ({ ...prev, draft: { ...prev.draft, remotePort } }))}
                        />
                        {!hasValidRemotePort ?
                            <span className="zenin__detail_validation zenin__h_error">Must specify remote port</span>
                            :
                            null}
                    </div>
                    : null}

                {editor.draft.kind == HTTP_API ?
                    <div>
                        <div className="zenin__detail_spaced">
                            <TextAreaInput
                                label={<span className={hasValidHttpHeaders ? "" : "zenin__h_error"}>Request Headers</span>}
                                name="zenin__detail_monitor_http_headers"
                                value={editor.draft.httpRequestHeaders}
                                subtext="Headers to send with the HTTP request."
                                onChange={httpRequestHeaders =>
                                    setEditor(prev => ({ ...prev, draft: { ...prev.draft, httpRequestHeaders } }))}
                            />
                            {!hasValidHttpHeaders ?
                                <span className="zenin__detail_validation zenin__h_error">Request headers must be valid JSON</span>
                                :
                                null}
                        </div>

                        <div className="zenin__detail_spaced">
                            <TextAreaInput
                                label={<span className={hasValidHttpBody ? "" : "zenin__h_error"}>Request Body</span>}
                                name="zenin__detail_monitor_http_body"
                                value={editor.draft.httpRequestBody}
                                subtext="A body to send with the HTTP request."
                                onChange={httpRequestBody =>
                                    setEditor(prev => ({ ...prev, draft: { ...prev.draft, httpRequestBody } }))}
                            />
                            {!hasValidHttpBody ?
                                <span className="zenin__detail_validation zenin__h_error">Request body must be valid JSON</span>
                                :
                                null}
                        </div>

                        <div className="zenin__detail_spaced">
                            <SelectInput
                                label="Method"
                                name="zenin__detail_monitor_method"
                                options={[
                                    { text: GET_API },
                                    { text: HEAD_API },
                                    { text: POST_API },
                                    { text: PUT_API },
                                    { text: PATCH_API },
                                    { text: DELETE_API },
                                    { text: OPTIONS_API },
                                ]}
                                subtext={<span>Set the HTTP <a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods">method</a> used to make the request.</span>}
                                value={editor.draft.httpMethod!}
                                onChange={httpMethod =>
                                    setEditor(prev => ({ ...prev, draft: { ...prev.draft, httpMethod } }))}
                            />
                        </div>

                        <div className="zenin__detail_spaced">
                            <SelectInput
                                label="Header Range"
                                name="zenin__detail_monitor_range"
                                options={[
                                    { text: INFORMATIONAL_API },
                                    { text: SUCCESSFUL_API },
                                    { text: REDIRECTION_API },
                                    { text: CLIENTERROR_API },
                                    { text: SERVERERROR_API },
                                ]}
                                subtext={<span>Specify the range of <a href="https://datatracker.ietf.org/doc/html/rfc2616#section-10">status codes</a> that will indicate a successful probe.</span>}
                                value={editor.draft.httpRange}
                                onChange={httpRange =>
                                    setEditor(prev => ({ ...prev, draft: { ...prev.draft, httpRange } }))}
                            />
                        </div>

                        <div className="zenin__detail_spaced">
                            <ToggleInput
                                name={"zenin__detail_capture_header"}
                                label="Capture Response Headers"
                                value={editor.draft.httpCaptureHeaders}
                                onChange={httpCaptureHeaders =>
                                    setEditor(prev => ({ ...prev, draft: { ...prev.draft, httpCaptureHeaders } }))}
                            />
                        </div>
                        <div className="zenin__detail_spaced">
                            <ToggleInput
                                name={"zenin__detail_capture_body"}
                                label="Capture Response Body"
                                value={editor.draft.httpCaptureBody}
                                onChange={httpCaptureBody =>
                                    setEditor(prev => ({ ...prev, draft: { ...prev.draft, httpCaptureBody } }))}
                            />
                        </div>
                    </div>
                    :
                    null}

                {editor.draft.kind == ICMP_API || editor.draft.kind == PING_API ?
                    <div className="zenin__detail_spaced zenin__detail_icmp_container">
                        <NumberInput
                            label={<span className={hasValidIcmpSize ? "" : "zenin__h_error"}>Packet Size</span>}
                            name="zenin__detail_monitor_icmp_size"
                            value={editor.draft.icmpSize}
                            subtext="The packet size in bytes."
                            onChange={icmpSize => setEditor(prev => ({ ...prev, draft: { ...prev.draft, icmpSize } }))}
                        />
                        {!hasValidIcmpSize ?
                            <span className="zenin__detail_validation zenin__h_error">Packet size must be greater than 0</span>
                            :
                            null}
                    </div>
                    : null}

                {editor.draft.kind == PLUGIN_API ?
                    <div className="zenin__detail_plugin_container">
                        <div className="zenin__detail_spaced">

                        </div>
                        <div className="zenin__detail_spaced">
                            <SelectInput
                                label="Name"
                                name="zenin__detail_monitor_method"
                                subtext={<span>Choose the <a href="#">plugin</a> used to perform the poll.</span>}
                                value={editor.draft.pluginName!}
                                onChange={pluginName => setEditor(prev => ({ ...prev, draft: { ...prev.draft, pluginName } }))}
                                options={Array.from(
                                    new Set([...meta.context.state.plugins, editor.draft.pluginName!]))
                                    .map(n => ({ text: n }))
                                }
                            />
                        </div>
                        <div className="zenin__detail_spaced">
                            <TextAreaInput
                                label={<span className={hasValidPluginArguments ? "" : "zenin__h_error"}>Arguments</span>}
                                name="zenin__detail_monitor_http_headers"
                                placeholder={"[\"-c\", \"100\"]"}
                                value={editor.draft.pluginArgs}
                                subtext="Arguments passed to the plugin."
                                onChange={pluginArgs =>
                                    setEditor(prev => ({ ...prev, draft: { ...prev.draft, pluginArgs } }))}
                            />
                            {!hasValidPluginArguments ?
                                <span className="zenin__detail_validation zenin__h_error">Request headers must be a valid JSON array</span>
                                :
                                null}
                        </div>
                    </div>
                    :
                    null}
            </div>

            <div className="zenin__detail_controls">
                <Button kind="primary" disabled={!canSubmit} onClick={() => { handleSubmit() }}>
                    <span>Save</span>
                </Button>

                <Button border={true} onClick={onClose}>
                    <span>Cancel</span>
                </Button>

                {state.monitor ?
                    <div className="zenin__detail_delete_button" onClick={event => event.stopPropagation()}>
                        <Button kind="destructive" onClick={() => onDelete(state.monitor!)}>
                            <TrashIcon />
                        </Button>
                    </div>
                    : null}
            </div>
        </div >
    )
}

function sanitizeToMonitor(draft: Draft): Monitor {
    const monitor = { ...draft } as Monitor;
    switch (monitor.kind) {
        case HTTP_API:
            sanitizeHTTP(monitor);
            break;
        case TCP_API:
            sanitizeTCP(monitor);
            break;
        case ICMP_API:
            sanitizeICMP(monitor);
            break;
        case PLUGIN_API:
            sanitizePlugin(monitor);
            break;
    }
    return monitor;
}

function sanitizeHTTP(monitor: Monitor) {
    monitor.icmpSize = null;
    monitor.pluginName = null;
}

function sanitizeTCP(strategy: Monitor) {
    strategy.httpRequestHeaders = null;
    strategy.httpRequestBody = null;
    strategy.httpExpiredCertMod = null;
    strategy.httpCaptureHeaders = null;
    strategy.httpCaptureBody = null;
    strategy.httpMethod = null;
    strategy.httpRange = null;
    strategy.icmpSize = null;
    strategy.pluginName = null;
}

function sanitizeICMP(strategy: Monitor) {
    strategy.remotePort = null;
    strategy.httpRequestHeaders = null;
    strategy.httpRequestBody = null;
    strategy.httpExpiredCertMod = null;
    strategy.httpCaptureHeaders = null;
    strategy.httpCaptureBody = null;
    strategy.httpMethod = null;
    strategy.httpRange = null;
    strategy.pluginName = null;
}

function sanitizePlugin(strategy: Monitor) {
    strategy.remoteAddress = null;
    strategy.remotePort = null;
    strategy.httpRequestHeaders = null;
    strategy.httpRequestBody = null;
    strategy.httpExpiredCertMod = null;
    strategy.httpCaptureHeaders = null;
    strategy.httpCaptureBody = null;
    strategy.httpMethod = null;
    strategy.httpRange = null;
    strategy.icmpSize = null;
}

/** Reset a `Monitor` to `Draft`, setting useful defaults to make editing easier. */
function resetToDraft(value: Monitor): [number | null, Draft] {
    const draft: Draft = { ...defaultDraft, ...(value as Draft) };
    return [value.id, draft];
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
    pluginArgs: string | null,
    httpRange: string,
    httpMethod: string | null,
    httpRequestHeaders: string | null,
    httpRequestBody: string | null
    httpExpiredCertMod: string | null,
    httpCaptureHeaders: boolean,
    httpCaptureBody: boolean,
    icmpSize: number | null
}

function isValidMonitor(draft: Draft): boolean {
    if (!isValidName(draft.name)
        || !isValidState(draft.active)
        || !isValidInterval(draft.interval)
        || !isValidTimeout(draft.timeout)
        || !isValidKind(draft.kind)) return false;

    switch (draft.kind) {
        case HTTP_API: return isValidHTTP(draft)
        case ICMP_API: return isValidICMP(draft)
        case TCP_API: return isValidTCP(draft)
        case PLUGIN_API: return isValidPlugin(draft)
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

function isValidHeaderRange(range: string | null): boolean {
    const set = [
        INFORMATIONAL_API,
        SUCCESSFUL_API,
        REDIRECTION_API,
        CLIENTERROR_API,
        SERVERERROR_API
    ];
    if (!range || !set.includes(range)) return false;
    return true;
}

/** Return true if the provided string is valid JSON. **/
function isValidJSON(body: string | null): boolean {
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
function isValidJSONArray(body: string | null): boolean {
    if (body == null) return true;
    try {
        const result = JSON.parse(body);
        if (Array.isArray(result)) return true;
        return false;
    } catch {
        return false;
    }
}

function isValidIcmpSize(size: number | null): boolean {
    return size != null && size > 0;
}

function isValidName(name: string | null): boolean {
    return name != null && name.trim() != "";
}

function isValidKind(kind: string | null): boolean {
    return kind != null && [HTTP_API, ICMP_API, TCP_API, PING_API, PLUGIN_API].includes(kind)
}

function isValidState(state: boolean): boolean {
    return typeof state === 'boolean';
}

function isValidInterval(interval: number | null): boolean {
    return interval != null && interval >= 0;
}

function isValidTimeout(timeout: number | null): boolean {
    return timeout != null && timeout >= 0
}

function isValidRemoteAddress(remote: string | null): boolean {
    if (!remote || remote.trim() == "") return false;
    return true;
}

function isValidRemotePort(port: number | null): boolean {
    return port != null && port >= 0 && port <= 65535;
}