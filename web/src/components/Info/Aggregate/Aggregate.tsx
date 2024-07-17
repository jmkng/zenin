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
    const listData = new Map()
    listData.set("Uptime", `${uptime}`);
    if (dead > 0) listData.set("Incidents", dead);
    if (warn > 0) listData.set("Warnings", warn);

    return (
        <div className="zenin__aggregate_component">
            <ListComponent
                title="Aggregate"
                help="Statistics aggregated from the measurements displayed in the measurement table."
                data={listData}
            />
        </div>
    )
}
