import { formatMilliseconds } from "../../../internal/layout/graphics";
import { Measurement } from "../../../internal/monitor";
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

    // if (m.httpResponseHeaders != null) pairs.set("Response Headers", m.httpResponseHeaders)

    ////////////////// TODO: Limit field width, display in modal when clicked  
    // if (m.httpResponseHeaders) pairs.set("Response Headers", m.httpResponseHeaders.toString())
    // if (m.httpResponseBody) pairs.set("Response Body", m.httpResponseBody.toString())
    // if (m.pluginStdout) pairs.set("Status Code", m.pluginStdout.toString())
    // if (m.pluginStderr) pairs.set("Status Code", m.pluginStderr.toString())
    //////////////////      

    return (
        <div className="zenin__property_component">
            <ListComponent
                title={`Properties #${measurement.id}`}
                data={Array.from(pairs, ([key, value]) => ({ key, value: value }))} />

            {measurement.stateHint ?
                <div className="zenin__property_hints">
                    <ListComponent title="Hints" data={measurement.stateHint} />
                </div>
                : null}
        </div>
    )
}
