import { formatDate } from "../../../internal/layout/graphics";
import { ViewPane } from "../../../internal/monitor/split";
import { DEAD_API } from "../../../server";

import List from "../List/List";

import "./Summary.css";

interface SummaryProps {
    state: ViewPane,
}

export default function Summary(props: SummaryProps) {
    const { state } = props;
    const reversed = (state.monitor.measurements || []).toReversed();

    const empty = reversed.length == 0;
    const stateVal = !empty ? reversed[0].state : "N/A"
    const cname = !empty ? "zenin__state" : "";
    const pairs: Map<string, string> = new Map()
        .set("State", <span className={cname} data-state={!empty ? stateVal : null}>{stateVal}</span>)
    const dead = reversed.find(n => n.state == DEAD_API);
    if (dead) pairs.set("Last Incident", formatDate(dead.createdAt!))

    return (
        <div className="zenin__summary_component">
            <List title="Summary" data={Array.from(pairs, ([key, value]) => ({ key, value: value }))} />
        </div>
    )
}
