import { formatUTCDate, formatMS } from "@/internal/layout/graphics";
import { ViewPane } from "@/internal/monitor/split";
import { DEAD_API, OK_API, WARN_API } from "@/internal/server";

import List from "./List/List";

interface StatisticsProps {
    state: ViewPane
}

export default function Statistics(props: StatisticsProps) {
    const { state } = props;

    const measurements = (state.monitor.measurements || []);
    const measurementsReversed = measurements.toReversed();
    const empty = measurements.length == 0;

    // Pairs contains the data stored in the list.
    const pairs: Map<string, any> = new Map()

    // The state of the most recent measurement is considered the current state of the monitor.
    const currentState = !empty ? measurementsReversed[0].state : "N/A"
    pairs.set("State", <span className={!empty ? "state" : ""} data-state={!empty ? currentState : null}>{currentState}</span>)

    // The last incident is the most recent measurement with a dead state in the measurement set.
    const lastIncident = measurementsReversed.find(n => n.state == DEAD_API);
    if (lastIncident) pairs.set("Last Incident", formatUTCDate(lastIncident.createdAt!))

    // The uptime percentage for the measurement set.
    const uptime = measurements.length > 0
        ? `${Math.floor((measurements.filter(n => n.state == OK_API).length / measurements.length) * 100)}%`
        : "N/A";
    pairs.set("Uptime", `${uptime}`);

    // The average poll duration in milliseconds for the measurement set.
    const avgDur = measurements.length > 0
        ? formatMS(measurements.reduce((acc, value) => acc + value.duration, 0) / measurements.length)
        : "N/A";
    pairs.set("Average Poll Duration", avgDur)

    // The amount of measurements with a dead state in the measurement set.
    const totalDead = measurements.filter(n => n.state == DEAD_API).length;
    if (totalDead > 0) pairs.set("Total Dead", totalDead.toString());

    // The amount of measurements with a warn state in the measurement set.
    const totalWarn = measurements.filter(n => n.state == WARN_API).length;
    if (totalWarn > 0) pairs.set("Total Warn", totalWarn.toString());

    return <div className="summary_component">
        <List
            title="Statistics"
            data={Array.from(pairs, ([key, value]) => ({ key, value: value }))}
        />
    </div>
}
