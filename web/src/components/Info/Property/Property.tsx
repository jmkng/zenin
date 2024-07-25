import { formatMilliseconds } from "../../../internal/layout/graphics";
import { Measurement } from "../../../internal/monitor";
import ExpandComponent from "../Expand/Expand";
import ListComponent from "../List/List";

import "./Property.css";

export interface PropertyProps {
    measurement: Measurement
}

export default function PropertyComponent(props: PropertyProps) {
    const { measurement } = props;

    const m = measurement;
    const pairs: Map<string, string> = new Map()
    pairs.set("Duration", formatMilliseconds(m.duration))
    if (m.httpStatusCode != null) pairs.set("Status Code", m.httpStatusCode.toString())
    if (m.icmpPacketsOut != null) pairs.set("Packets Out", m.icmpPacketsOut.toString())
    if (m.icmpPacketsIn != null) pairs.set("Packets In", m.icmpPacketsIn.toString())
    if (m.icmpMinRtt != null) pairs.set("Min Round Trip", formatMilliseconds(m.icmpMinRtt))
    if (m.icmpAvgRtt != null) pairs.set("Average Round Trip", formatMilliseconds(m.icmpAvgRtt))
    if (m.icmpMaxRtt != null) pairs.set("Max Round Trip", formatMilliseconds(m.icmpMaxRtt))
    if (m.pluginExitCode != null) pairs.set("Exit Code", m.pluginExitCode.toString())

    return (
        <div className="zenin__property_component">
            <ListComponent
                title={`Properties #${measurement.id}`}
                data={Array.from(pairs, ([key, value]) => ({ key, value: value }))} />

            {measurement.httpResponseHeaders ?
                <div className="zenin__property_response_headers">
                    <ExpandComponent title={"Response Headers"} text={measurement.httpResponseHeaders} />
                </div>
                : null}

            {measurement.httpResponseBody ?
                <div className="zenin__property_response_body">
                    <ExpandComponent title={"Response Body"} text={measurement.httpResponseBody} />
                </div>
                : null}

            {measurement.pluginStdout ?
                <div className="zenin__property_stdout">
                    <ExpandComponent title={"Standard Output"} text={measurement.pluginStdout} />
                </div>
                : null}

            {measurement.pluginStderr ?
                <div className="zenin__property_stderr">
                    <ExpandComponent title={"Standard Output"} text={measurement.pluginStderr} />
                </div>
                : null}

            {measurement.stateHint ?
                <div className="zenin__property_hints">
                    <ListComponent title="Hints" data={measurement.stateHint} />
                </div>
                : null}
        </div>
    )
}
