import { formatMilliseconds } from "../../../internal/layout/graphics";
import { Measurement } from "../../../internal/monitor"
import { DEAD_API, OK_API, WARN_API } from "../../../server";
import ListComponent from "../List/List";

import "./Aggregate.css";

interface AggregateProps {
    measurements: Measurement[]
}

export default function AggregateComponent(props: AggregateProps) {
    const { measurements } = props;

    const dead = measurements.filter(n => n.state == DEAD_API).length;
    const warn = measurements.filter(n => n.state == WARN_API).length;
    const uptime = measurements.length > 0
        ? `${Math.floor((measurements.filter(n => n.state == OK_API).length / measurements.length) * 100)}%`
        : "N/A";
    const avgDur = measurements.length > 0
        ? formatMilliseconds(measurements.reduce((acc, value) => acc + value.duration, 0) / measurements.length)
        : "N/A";

    const pairs: Map<string, string> = new Map()
    pairs.set("Uptime", `${uptime}`);
    pairs.set("Average Duration", avgDur)
    if (dead > 0) pairs.set("Dead", dead.toString());
    if (warn > 0) pairs.set("Warn", warn.toString());

    return (
        <div className="zenin__aggregate_component">
            <ListComponent
                title="Aggregate"
                data={Array.from(pairs, ([key, value]) => ({ key, value: value }))}
            />
        </div>
    )
}
