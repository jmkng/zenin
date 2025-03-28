import { formatMS } from "@/internal/layout/graphics";
import { Measurement } from "@/internal/measurement";
import { HTTP_API } from "@/internal/server";

import Text from "../Text/Text";
import List from "../List/List";
import Chain from "./Chain";

export interface PropertyProps {
    measurement: Measurement
}

export default function Property(props: PropertyProps) {
    const { measurement } = props;

    const pairs: Map<string, string> = new Map()
    pairs.set("Duration", formatMS(measurement.duration))
    if (measurement.httpStatusCode != null) pairs.set("Status Code", measurement.httpStatusCode.toString())
    if (measurement.icmpPacketsOut != null) pairs.set("Packets Out", measurement.icmpPacketsOut.toString())
    if (measurement.icmpPacketsIn != null) pairs.set("Packets In", measurement.icmpPacketsIn.toString())

    const min = measurement.icmpMinRtt;
    const avg = measurement.icmpAvgRtt;
    const max = measurement.icmpMaxRtt
    if (min && avg && max) 
        pairs.set("Round Trip (Min/Avg/Max)", `${formatMS(min)}/${formatMS(avg)}/${formatMS(max)} (ms)`)
    if (measurement.pluginExitCode != null) pairs.set("Exit Code", measurement.pluginExitCode.toString())

    return <div className="property_component h_mt-c">
        <List
            title="Properties"
            data={Array.from(pairs, ([key, value]) => ({ key, value: value }))} />

        {measurement.httpResponseHeaders ?
            <div className="property_response_headers h_mt-c">
                <List title="Response Headers" data={measurement.httpResponseHeaders} />
            </div>
            : null}
        {measurement.httpResponseBody ?
            <div className="property_response_body h_mt-c">
                <Text title="Response Body" text={measurement.httpResponseBody} />
            </div>
            : null}
        {measurement.pluginStdout ?
            <div className="property_stdout h_mt-c">
                <Text title="Standard Output" text={measurement.pluginStdout} />
            </div>
            : null}
        {measurement.pluginStderr ?
            <div className="property_stderr h_mt-c">
                <Text title="Standard Error" text={measurement.pluginStderr} />
            </div>
            : null}
        {measurement.stateHint && measurement.stateHint.length > 0 ?
            <div className="property_hints h_mt-c">
                <List title="Hints" data={measurement.stateHint} />
            </div>
            : null}

        {/****** lazy load ******/}

        {measurement.kind == HTTP_API ?
            <div className="property_http_addon h_mt-c">
                <Chain measurement={measurement} />
            </div>
            : null}
    </div>
}
