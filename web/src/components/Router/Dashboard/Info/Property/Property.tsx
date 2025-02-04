import { formatMilliseconds } from "../../../../../internal/layout/graphics";
import { Measurement } from "../../../../../internal/measurement";
import { HTTP_API } from "../../../../../server";

import Text from "../Text/Text";
import List from "../List/List";
import Chain from "./Chain";

export interface PropertyProps {
    measurement: Measurement
}

export default function Property(props: PropertyProps) {
    const { measurement } = props;

    const pairs: Map<string, string> = new Map()
    pairs.set("Duration", formatMilliseconds(measurement.duration))
    if (measurement.httpStatusCode != null) pairs.set("Status Code", measurement.httpStatusCode.toString())
    if (measurement.icmpPacketsOut != null) pairs.set("Packets Out", measurement.icmpPacketsOut.toString())
    if (measurement.icmpPacketsIn != null) pairs.set("Packets In", measurement.icmpPacketsIn.toString())
    if (measurement.icmpMinRtt != null) pairs.set("Min Round Trip", formatMilliseconds(measurement.icmpMinRtt))
    if (measurement.icmpAvgRtt != null) pairs.set("Average Round Trip", formatMilliseconds(measurement.icmpAvgRtt))
    if (measurement.icmpMaxRtt != null) pairs.set("Max Round Trip", formatMilliseconds(measurement.icmpMaxRtt))
    if (measurement.pluginExitCode != null) pairs.set("Exit Code", measurement.pluginExitCode.toString())

    return <div className="zenin__property_component zenin__h_margin_top">
        <List
            title="Properties"
            data={Array.from(pairs, ([key, value]) => ({ key, value: value }))} />

        {measurement.httpResponseHeaders ?
            <div className="zenin__property_response_headers zenin__h_margin_top">
                <List title="Response Headers" data={measurement.httpResponseHeaders} />
            </div>
            : null}
        {measurement.httpResponseBody ?
            <div className="zenin__property_response_body zenin__h_margin_top">
                <Text title="Response Body" text={measurement.httpResponseBody} />
            </div>
            : null}
        {measurement.pluginStdout ?
            <div className="zenin__property_stdout zenin__h_margin_top">
                <Text title="Standard Output" text={measurement.pluginStdout} />
            </div>
            : null}
        {measurement.pluginStderr ?
            <div className="zenin__property_stderr zenin__h_margin_top">
                <Text title="Standard Error" text={measurement.pluginStderr} />
            </div>
            : null}
        {measurement.stateHint && measurement.stateHint.length > 0 ?
            <div className="zenin__property_hints zenin__h_margin_top">
                <List title="Hints" data={measurement.stateHint} />
            </div>
            : null}

        {/****** lazy load ******/}

        {measurement.kind == HTTP_API ?
            <div className="zenin__property_http_addon zenin__h_margin_top">
                <Chain measurement={measurement} />
            </div>
            : null}
    </div>
}
