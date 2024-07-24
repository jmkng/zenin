import { formatDate } from "../../../internal/layout/graphics";
import { Measurement } from "../../../internal/monitor"
import { DEAD_API } from "../../../server";
import ListComponent from "../List/List";

import "./Summary.css";

interface SummaryProps {
    measurements: Measurement[]
}

export default function SummaryComponent(props: SummaryProps) {
    const { measurements } = props;

    const empty = measurements.length == 0;
    const state = !empty ? measurements[0].state : "N/A"
    const cname = !empty ? "zenin__state" : "";
    const listData = new Map()
        .set("State", <span className={cname} data-state={!empty ? state : null}>{state}</span>)
    const dead = measurements.find(n => n.state == DEAD_API);
    if (dead) listData.set("Last Incident", formatDate(dead.recordedAt!))

    return (
        <div className="zenin__summary_component">
            <ListComponent title="Summary" data={listData} />
        </div>
    )
}
