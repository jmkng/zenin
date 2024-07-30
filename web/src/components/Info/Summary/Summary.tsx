import { formatDate } from "../../../internal/layout/graphics";
import { ViewState } from "../../../internal/monitor/reducer";
import { DEAD_API } from "../../../server";

import ListComponent from "../List/List";

import "./Summary.css";

interface SummaryProps {
    state: ViewState,
}

export default function SummaryComponent(props: SummaryProps) {
    const { state } = props;
    const reversed = (state.monitor.measurements || []).toReversed();

    const empty = reversed.length == 0;
    const stateVal = !empty ? reversed[0].state : "N/A"
    const cname = !empty ? "zenin__state" : "";
    const pairs: Map<string, string> = new Map()
        .set("State", <span className={cname} data-state={!empty ? stateVal : null}>{stateVal}</span>)
    const dead = reversed.find(n => n.state == DEAD_API);
    if (dead) pairs.set("Last Incident", formatDate(dead.recordedAt!))

    return (
        <div className="zenin__summary_component">
            <ListComponent title="Summary" data={Array.from(pairs, ([key, value]) => ({ key, value: value }))} />
        </div>
    )
}
