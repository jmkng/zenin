import { useMetaContext } from "../../internal/meta";
import { useEffect, useMemo, useState } from "react";
import { ACTIVE_UI, HTTP_UI, ICMP_UI, INACTIVE_UI, Monitor, monitorEquals, Event, PLUGIN_UI, TCP_UI, useMonitorContext, } from "../../internal/monitor";
import { EditorPane } from "../../internal/monitor/split";
import {
    CLIENTERROR_API,
    DELETE_API,
    GET_API,
    HEAD_API,
    HTTP_API,
    ICMP_API,
    INFORMATIONAL_API,
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
} from "../../server";
import {
    EditorState,
    isValidInterval,
    isValidMonitor,
    isValidName,
    isValidNonZeroNumber,
    isValidRemoteAddress,
    isValidRemotePort,
    isValidTimeout,
    reset,
    sanitize,
    split
} from ".";

import Button from "../Button/Button";
import NumberInput from "../Input/NumberInput/NumberInput";
import PluginInput from "../Input/PluginInput/PluginInput";
import SelectInput from "../Input/SelectInput/SelectInput";
import TextAreaInput from "../Input/TextAreaInput/TextAreaInput";
import TextInput from "../Input/TextInput/TextInput";
import PairListInput from "../Input/PairListInput/PairListInput";
import ToggleInput from "../Input/ToggleInput/ToggleInput";
import EventInput from "../Input/EventInput/EventInput";

import "./Editor.css";

interface EditorProps {
    state: EditorPane
    onChange: (target: Monitor) => void;
}

export default function Editor(props: EditorProps) {
    const { state, onChange } = props;
    const meta = { context: useMetaContext() };
    const monitor = { context: useMonitorContext() }

    const base = useMemo(() => reset(state.monitor, meta.context.state), [state.monitor]);
    const [editor, setEditor] = useState<EditorState>(split(base))

    useEffect(() => setEditor(prev => ({ ...prev, ...split(base) })), [base])

    useEffect(() => {
        if (!state.monitor) return;
        const active = state.monitor.active;
        setEditor(prev => ({ ...prev, draft: { ...prev.draft, active }, original: { ...prev.original, active } }))
    }, [state.monitor])

    const canSubmit = useMemo(() => !monitorEquals(editor.draft as Monitor, editor.original as Monitor) && isValidMonitor(editor.draft), [editor])
    const hasValidName = useMemo(() => isValidName(editor.draft.name), [editor.draft.name])
    const hasValidInterval = useMemo(() => isValidInterval(editor.draft.interval), [editor.draft.interval])
    const hasValidTimeout = useMemo(() => isValidTimeout(editor.draft.timeout), [editor.draft.timeout])
    const hasValidRemoteAddress = useMemo(() => isValidRemoteAddress(editor.draft.remoteAddress), [editor.draft.remoteAddress])
    const hasValidRemotePort = useMemo(() => isValidRemotePort(editor.draft.remotePort), [editor.draft.remotePort]);
    const hasValidIcmpSize = useMemo(() => isValidNonZeroNumber(editor.draft.icmpSize), [editor.draft.icmpSize]);
    const hasValidIcmpWait = useMemo(() => isValidNonZeroNumber(editor.draft.icmpWait), [editor.draft.icmpWait]);
    const hasValidIcmpCount = useMemo(() => isValidNonZeroNumber(editor.draft.icmpCount), [editor.draft.icmpCount]);
    const hasValidIcmpTtl = useMemo(() => isValidNonZeroNumber(editor.draft.icmpTtl), [editor.draft.icmpTtl]);

    type eventFields = 'pluginName' | 'pluginArgs' | 'threshold';

    const updateEvent = (index: number, field: eventFields, value: any) => {
        setEditor(prev => ({
            ...prev,
            draft: {
                ...prev.draft,
                events: prev.draft.events!.map((n, i) => i === index ? { ...n, [field]: value } : n)
            }
        }));
    };

    const deleteEvent = (index: number) => {
        setEditor(prev => ({
            ...prev,
            draft: {
                ...prev.draft,
                events: prev.draft.events!.filter((_, i) => i !== index)
            }
        }));
    };

    return <div className="zenin__detail_component">
        <div className="zenin__detail_body">
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
                        { value: PLUGIN_API, text: PLUGIN_UI },
                        { value: HTTP_API, text: HTTP_UI },
                        { value: TCP_API, text: TCP_UI },
                        { value: ICMP_API, text: ICMP_UI },
                    ]}
                    subtext={<span>Set the <a href="#">probe</a> type.</span>} /* TODO: Add documentation link. */
                    onChange={kind => setEditor(prev => ({
                        ...prev, draft: {
                            ...prev.draft, kind,
                            pluginName: kind == PLUGIN_API ? prev.draft.pluginName || meta.context.state.plugins[0] : null
                        }
                    }))}
                />
            </div>

            {editor.draft.kind == HTTP_API || editor.draft.kind == ICMP_API || editor.draft.kind == TCP_API ?
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
                        <PairListInput
                            label="Request Headers"
                            name="zenin__detail_monitor_http_request_headers"
                            value={editor.draft.httpRequestHeaders ?? [{ key: "", value: "" }]}
                            onChange={httpRequestHeaders => setEditor(prev => ({ ...prev, draft: { ...prev.draft, httpRequestHeaders } }))}
                        />
                    </div>

                    <div className="zenin__detail_spaced">
                        <TextAreaInput
                            label="Request Body"
                            name="zenin__detail_monitor_http_body"
                            value={editor.draft.httpRequestBody}
                            subtext="A body to send with the HTTP request."
                            onChange={httpRequestBody =>
                                setEditor(prev => ({ ...prev, draft: { ...prev.draft, httpRequestBody } }))}
                        />
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
                            onChange={httpMethod => setEditor(prev => ({ ...prev, draft: { ...prev.draft, httpMethod } }))}
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
                            subtext={<span>Set the range of <a href="https://datatracker.ietf.org/doc/html/rfc2616#section-10">status codes</a> that will indicate a successful probe.</span>}
                            value={editor.draft.httpRange}
                            onChange={httpRange => setEditor(prev => ({ ...prev, draft: { ...prev.draft, httpRange } }))}
                        />
                    </div>

                    <div className="zenin__detail_spaced">
                        <ToggleInput
                            name={"zenin__detail_capture_header"}
                            label="Capture Response Headers"
                            value={editor.draft.httpCaptureHeaders}
                            onChange={httpCaptureHeaders => setEditor(prev => ({ ...prev, draft: { ...prev.draft, httpCaptureHeaders } }))}
                        />
                    </div>
                    <div className="zenin__detail_spaced">
                        <ToggleInput
                            name={"zenin__detail_capture_body"}
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
                    <div className="zenin__detail_spaced">
                        <ToggleInput
                            name={"zenin__detail_"}
                            label="Use UDP Protocol"
                            offSubtext={<span className="zenin__h_advice">This monitor will use ICMP protocol. Requires root.</span>}
                            value={editor.draft.icmpProtocol == UDP_API}
                            onChange={value =>
                                setEditor(prev => ({
                                    ...prev,
                                    draft: { ...prev.draft, icmpProtocol: value ? UDP_API : ICMP_API }
                                }))}
                        />
                    </div>

                    <div className="zenin__detail_spaced">
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

                    <div className="zenin__detail_spaced">
                        <NumberInput
                            label={<span className={hasValidIcmpWait ? "" : "zenin__h_error"}>Packet Wait</span>}
                            name="zenin__detail_monitor_icmp_wait"
                            value={editor.draft.icmpWait}
                            subtext="The milliseconds to wait between each outgoing packet."
                            onChange={icmpWait => setEditor(prev => ({ ...prev, draft: { ...prev.draft, icmpWait } }))}
                        />
                        {!hasValidIcmpWait ?
                            <span className="zenin__detail_validation zenin__h_error">Packet wait must be greater than 0</span>
                            :
                            null}
                    </div>

                    <div className="zenin__detail_spaced">
                        <NumberInput
                            label={<span className={hasValidIcmpCount ? "" : "zenin__h_error"}>Packet Count</span>}
                            name="zenin__detail_monitor_icmp_count"
                            value={editor.draft.icmpCount}
                            subtext="The total packets to send."
                            onChange={icmpCount => setEditor(prev => ({ ...prev, draft: { ...prev.draft, icmpCount } }))}
                        />
                        {!hasValidIcmpCount ?
                            <span className="zenin__detail_validation zenin__h_error">Packet count must be greater than 0</span>
                            :
                            null}
                    </div>

                    <div className="zenin__detail_spaced">
                        <NumberInput
                            label={<span className={hasValidIcmpTtl ? "" : "zenin__h_error"}>Packet TTL</span>}
                            name="zenin__detail_monitor_icmp_ttl"
                            value={editor.draft.icmpTtl}
                            subtext="The TTL for each outgoing packet."
                            onChange={icmpTtl => setEditor(prev => ({ ...prev, draft: { ...prev.draft, icmpTtl } }))}
                        />
                        {!hasValidIcmpTtl ?
                            <span className="zenin__detail_validation zenin__h_error">Packet TTL must be greater than 0</span>
                            :
                            null}
                    </div>
                </>
                : null}

            {editor.draft.kind == PLUGIN_API
                ? <div className="zenin__detail_spaced">
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

            {editor.draft.events && editor.draft.events.length > 0
                ? <div className="zenin__detail_events">
                    <span className="zenin__input_label">Events</span>
                    {editor.draft.events.map((event, index) => <div key={index} className="zenin__detail_event_container">
                        <div className="zenin__detail_event">
                            <EventInput
                                plugin={{
                                    value: event.pluginName,
                                    onChange: value => updateEvent(index, 'pluginName', value)
                                }}
                                args={{
                                    value: event.pluginArgs,
                                    onChange: value => updateEvent(index, 'pluginArgs', value)
                                }}
                                threshold={{
                                    value: event.threshold,
                                    onChange: value => updateEvent(index, 'threshold', value)
                                }}
                                onDelete={() => deleteEvent(index)}
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
                                pluginName: (meta.context.state.plugins[0] || null),
                                pluginArgs: null, threshold: null
                            } as Event
                        ]
                    }
                }))}
            >
                <span>Add Event</span>
            </Button>
        </div>

        <div className="zenin__detail_controls">
            <Button
                kind="primary"
                disabled={!canSubmit}
                onClick={() => onChange(sanitize(editor.draft))}
            >
                <span>Save</span>
            </Button>

            <Button
                border={true}
                onClick={() => monitor.context.dispatch({ type: 'pane', pane: { type: 'editor', monitor: null } })}
            >
                <span>Close</span>
            </Button>
        </div>
    </div>
}
