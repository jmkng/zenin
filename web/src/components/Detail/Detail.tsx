import { useEffect, useMemo, useState } from "react";
import * as sapi from "../../server";
import * as im from "../../internal/monitor";

import TextInput from "../Input/TextInput/TextInput";
import ArrayInput from "../Input/ArrayInput/ArrayInput";
import Button from "../Button/Button";
import NumberInput from "../Icon/NumberInput/NumberInput";
import SelectInput from "../Input/SelectInput/SelectInput";
import TrashIcon from "../Icon/TrashIcon/TrashIcon";
import TextAreaInput from "../Input/TextAreaInput/TextAreaInput";

import "./Detail.css";

interface DetailProps {
    monitor: im.Monitor | null

    onChange: (target: im.Monitor) => void;
    onClose: () => void;
    onDelete: (monitor: im.Monitor) => void;
}

interface DetailState {
    draft: im.Draft,
    original: im.Draft
}

const defaultDraft: im.Draft = {
    name: null,
    kind: sapi.HTTP_API,
    active: false,
    interval: 300,
    timeout: 10,
    description: null,
    remoteAddress: null,
    remotePort: null,
    scriptCommand: null,
    scriptArgs: [],
    httpRange: sapi.SUCCESSFUL_API,
    httpMethod: sapi.GET_API,
    httpRequestHeaders: null,
    httpRequestBody: null,
    httpExpiredCertMod: sapi.OFF_API,
    icmpSize: 56
}

export default function DetailComponent(props: DetailProps) {
    const {
        monitor: subject,
        onChange,
        onClose,
        onDelete
    } = props;
    const [id, reset] = useMemo(() => subject ? resetToDraft(subject) : [null, defaultDraft], [subject])
    const [editor, setEditor] = useState<DetailState>({ draft: reset, original: reset })

    const canSubmit = useMemo(() =>
        !im.monitorEquals(editor.draft as im.Monitor, editor.original as im.Monitor)
        && im.isValidMonitor(editor.draft), [editor])

    const hasValidName = useMemo(() => im.isValidName(editor.draft.name), [editor.draft.name])
    const hasValidInterval = useMemo(() => im.isValidInterval(editor.draft.interval), [editor.draft.interval])
    const hasValidTimeout = useMemo(() => im.isValidTimeout(editor.draft.timeout), [editor.draft.timeout])
    const hasValidRemoteAddress = useMemo(() => im.isValidRemoteAddress(editor.draft.remoteAddress), [editor.draft.remoteAddress])
    const hasValidRemotePort = useMemo(() => im.isValidRemotePort(editor.draft.remotePort), [editor.draft.remotePort]);
    const hasValidHttpBody = useMemo(() => im.isValidJson(editor.draft.httpRequestBody), [editor.draft.httpRequestBody]);
    const hasValidHttpHeaders = useMemo(() => im.isValidJson(editor.draft.httpRequestHeaders), [editor.draft.httpRequestHeaders]);
    const hasValidScriptCommand = useMemo(() => im.isValidScriptCommand(editor.draft.scriptCommand), [editor.draft.scriptCommand])
    const hasValidIcmpSize = useMemo(() => im.isValidIcmpSize(editor.draft.icmpSize), [editor.draft.icmpSize]);

    useEffect(() => {
        setEditor(prev => ({ ...prev, draft: reset, original: reset }))
    }, [reset])

    useEffect(() => {
        if (!subject) return;
        const active = subject.active;
        setEditor(prev => ({ ...prev, draft: { ...prev.draft, active }, original: { ...prev.original, active } }))
    }, [subject, subject?.active])

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
                        onChange={(name: string | null) =>
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
                        onChange={(description: string | null) =>
                            setEditor(prev => ({ ...prev, draft: { ...prev.draft, description } }))}
                    />
                </div>

                <div className="zenin__detail_spaced">
                    <SelectInput
                        name="zenin__detail_monitor_active"
                        value={editor.draft.active.toString()}
                        subtext="Controls the polling state of the monitor."
                        options={[
                            { value: "true", text: im.ACTIVE_UI },
                            { value: "false", text: im.INACTIVE_UI }
                        ]}
                        onChange={(value: string) =>
                            setEditor(prev => ({ ...prev, draft: { ...prev.draft, active: value === 'true' } }))
                        }
                    />
                </div>

                <div className="zenin__detail_spaced">
                    <NumberInput
                        label={<span className={hasValidInterval ? "" : "zenin__h_error"}>Interval</span>}
                        name="zenin__detail_monitor_interval"
                        value={editor.draft.interval}
                        subtext="The time between each measurement when the monitor is active."
                        onChange={(interval: number | null) =>
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
                        subtext="The time to wait before declaring the measurement dead."
                        onChange={(timeout: number | null) =>
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
                            {
                                label: 'Standard', options: [
                                    { value: sapi.HTTP_API, text: im.HTTP_UI },
                                    { value: sapi.TCP_API, text: im.TCP_UI },
                                    { value: sapi.ICMP_API, text: im.ICMP_UI },
                                    { value: sapi.PING_API, text: im.PING_UI },
                                ]
                            },
                            {
                                label: 'Custom', options: [
                                    { value: sapi.SCRIPT_API, text: im.SCRIPT_UI }
                                ]
                            }
                        ]}
                        subtext={<span>Specify the <a href="#">probe</a> type.</span>} /* TODO: Add documentation link. */
                        onChange={(value: string) =>
                            setEditor(prev => ({ ...prev, draft: { ...prev.draft, kind: value } }))}
                    />
                </div>

                {editor.draft.kind == sapi.HTTP_API || editor.draft.kind == sapi.ICMP_API || editor.draft.kind == sapi.TCP_API || editor.draft.kind == sapi.PING_API ?
                    <div className="zenin__detail_spaced zenin__detail_remote_address_container">
                        <TextInput
                            label={<span className={hasValidRemoteAddress ? "" : "zenin__h_error"}>Remote Address</span>}
                            name="zenin__detail_monitor_remote_address"
                            value={editor.draft.remoteAddress}
                            subtext="The address of the remote server." /* TODO: Provide instructions on valid format, should it include "http", etc.. */
                            onChange={(remoteAddress: string | null) =>
                                setEditor(prev => ({ ...prev, draft: { ...prev.draft, remoteAddress } }))}
                        ></TextInput>
                        {!hasValidRemoteAddress ?
                            <span className="zenin__detail_validation zenin__h_error">Must specify remote address</span>
                            :
                            null}
                    </div>
                    :
                    null}

                {editor.draft.kind == sapi.TCP_API ?
                    <div className="zenin__detail_spaced zenin__detail_remote_port_container">
                        <NumberInput
                            label={<span className={hasValidRemotePort ? "" : "zenin__h_error"}>Remote Port</span>}
                            name="zenin__detail_monitor_remote_port"
                            value={editor.draft.remotePort}
                            subtext="The port number on the remote server."
                            onChange={(remotePort: number | null) =>
                                setEditor(prev => ({ ...prev, draft: { ...prev.draft, remotePort } }))}
                        />
                        {!hasValidRemotePort ?
                            <span className="zenin__detail_validation zenin__h_error">Must specify remote port</span>
                            :
                            null}
                    </div>
                    : null}

                {editor.draft.kind == sapi.HTTP_API ?
                    <div>
                        <div className="zenin__detail_spaced">
                            <TextAreaInput
                                label={<span className={hasValidHttpHeaders ? "" : "zenin__h_error"}>Request Headers</span>}
                                name="zenin__detail_monitor_http_headers"
                                value={editor.draft.httpRequestHeaders}
                                subtext="Headers to send with the HTTP request."
                                onChange={(httpRequestHeaders: string | null) =>
                                    setEditor(prev => ({ ...prev, draft: { ...prev.draft, httpRequestHeaders: httpRequestHeaders } }))}
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
                                onChange={(httpRequestBody: string | null) =>
                                    setEditor(prev => ({ ...prev, draft: { ...prev.draft, httpRequestBody: httpRequestBody } }))}
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
                                    { text: sapi.GET_API },
                                    { text: sapi.HEAD_API },
                                    { text: sapi.POST_API },
                                    { text: sapi.PUT_API },
                                    { text: sapi.PATCH_API },
                                    { text: sapi.DELETE_API },
                                    { text: sapi.OPTIONS_API },
                                ]}
                                subtext={<span>Set the HTTP <a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods">method</a> used to make the request.</span>}
                                value={editor.draft.httpMethod!}
                                onChange={(httpMethod: string) =>
                                    setEditor(prev => ({ ...prev, draft: { ...prev.draft, httpMethod } }))}
                            />
                        </div>

                        <div className="zenin__detail_spaced">
                            <SelectInput
                                label="Header Range"
                                name="zenin__detail_monitor_range"
                                options={[
                                    { text: sapi.INFORMATIONAL_API },
                                    { text: sapi.SUCCESSFUL_API },
                                    { text: sapi.REDIRECTION_API },
                                    { text: sapi.CLIENTERROR_API },
                                    { text: sapi.SERVERERROR_API },
                                ]}
                                subtext={<span>Specify the range of <a href="https://datatracker.ietf.org/doc/html/rfc2616#section-10">status codes</a> that will indicate a successful probe.</span>}
                                value={editor.draft.httpRange}
                                onChange={(httpRange: string) =>
                                    setEditor(prev => ({ ...prev, draft: { ...prev.draft, httpRange } }))}
                            />
                        </div>

                        <div className="zenin__detail_spaced">
                            <SelectInput
                                label="Expired Certificate Modifier"
                                name="zenin__detail_monitor_expired_cert_mod"
                                options={[
                                    { text: im.OFF_UI },
                                    { value: sapi.WARN_API, text: im.WARN_UI },
                                    { value: sapi.DEAD_API, text: im.DEAD_UI },
                                ]}
                                subtext="Modify the probe result when an expired certificate is found."
                                value={editor.draft.httpExpiredCertMod || im.OFF_UI}
                                onChange={(value: string) =>
                                    setEditor(prev => ({ ...prev, draft: { ...prev.draft, httpExpiredCertMod: value == im.OFF_UI ? null : value } }))}
                            />
                        </div>
                    </div>
                    :
                    null}

                {editor.draft.kind == sapi.ICMP_API || editor.draft.kind == sapi.PING_API ?
                    <div className="zenin__detail_spaced zenin__detail_icmp_container">
                        <NumberInput
                            label={<span className={hasValidIcmpSize ? "" : "zenin__h_error"}>Packet Size</span>}
                            name="zenin__detail_monitor_icmp_size"
                            value={editor.draft.icmpSize}
                            subtext="The packet size in bytes."
                            onChange={(icmpSize: number | null) =>
                                setEditor(prev => ({ ...prev, draft: { ...prev.draft, icmpSize } }))}
                        />
                        {!hasValidIcmpSize ?
                            <span className="zenin__detail_validation zenin__h_error">Packet size must be greater than 0</span>
                            :
                            null}
                    </div>
                    : null}

                {editor.draft.kind == sapi.SCRIPT_API ?
                    <div className="zenin__detail_script_container">
                        <div className="zenin__detail_spaced">
                            <ArrayInput
                                name="zenin__detail_monitor_script_args"
                                value={[...editor.draft.scriptArgs, ""]}
                                label={<span>Arguments</span>}
                                onChange={(index: number, value: string | null) =>
                                    setEditor(prev => ({
                                        ...prev,
                                        draft: {
                                            ...prev.draft,
                                            scriptArgs: value != null ? prev.draft.scriptArgs.toSpliced(index, 1, value)
                                                : prev.draft.scriptArgs.toSpliced(index, 1)
                                        }
                                    }))
                                }
                            />
                        </div>
                        <div className="zenin__detail_spaced">
                            <TextInput
                                name="zenin__detail_monitor_script_command"
                                label={<span className={hasValidScriptCommand ? "" : "zenin__h_error"}>Command</span>}
                                value={editor.draft.scriptCommand}
                                onChange={(value: string | null) => { setEditor(prev => ({ ...prev, draft: { ...prev.draft, scriptCommand: value } })) }}
                            />
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

                {subject ?
                    <div onClick={(event) => event.stopPropagation()} className="zenin__detail_delete_button">
                        <Button
                            kind="destructive"
                            onClick={() => onDelete(subject)}
                        >
                            <TrashIcon />
                        </Button>
                    </div>
                    : null}
            </div>
        </div >
    )
}

function sanitizeToMonitor(draft: im.Draft): im.Monitor {
    const monitor = { ...draft } as im.Monitor;
    switch (monitor.kind) {
        case sapi.HTTP_API:
            sanitizeHTTP(monitor);
            break;
        case sapi.TCP_API:
            sanitizeTCP(monitor);
            break;
        case sapi.PING_API:
        case sapi.ICMP_API:
            sanitizeICMP(monitor);
            break;
        case sapi.SCRIPT_API:
            sanitizeScript(monitor);
            break;
    }
    return monitor;
}

function sanitizeHTTP(monitor: im.Monitor) {
    monitor.icmpSize = null;
    monitor.scriptCommand = null;
}

function sanitizeTCP(strategy: im.Monitor) {
    strategy.httpRequestHeaders = null;
    strategy.httpRequestBody = null;
    strategy.httpExpiredCertMod = null;
    strategy.httpMethod = null;
    strategy.httpRange = null;
    strategy.icmpSize = null;
    strategy.scriptCommand = null;
}

function sanitizeICMP(strategy: im.Monitor) {
    strategy.remotePort = null;
    strategy.httpRequestHeaders = null;
    strategy.httpRequestBody = null;
    strategy.httpExpiredCertMod = null;
    strategy.httpMethod = null;
    strategy.httpRange = null;
    strategy.scriptCommand = null;
}

function sanitizeScript(strategy: im.Monitor) {
    strategy.remoteAddress = null;
    strategy.remotePort = null;
    strategy.httpRequestHeaders = null;
    strategy.httpRequestBody = null;
    strategy.httpExpiredCertMod = null;
    strategy.httpMethod = null;
    strategy.httpRange = null;
    strategy.icmpSize = null;
}

function resetToDraft(value: im.Monitor): [number | null, im.Draft] {
    const [id, draft] = [value.id, { ...value } as im.Draft];
    for (const [key, value] of Object.entries(draft)) {
        if (value === null) {
            //@ts-expect-error Ignore type for assignment.
            draft[key] = defaultDraft[key];
        }
    }
    return [id, draft];
}
