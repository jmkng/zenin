import { useMonitorContext } from "@/hooks/useMonitor";
import { ViewPane } from "@/internal/monitor/split";

import Button from "../../Button/Button";
import List from "./List/List";
import Statistics from "./Statistics";
import Table from "./Table/Table";
import Text from "./Text/Text";

import "./Info.css";

interface InfoProps {
    state: ViewPane
}

export default function Info(props: InfoProps) {
    const { state } = props;

    const monitorContext = useMonitorContext();

    return <div className="info_component">
        <div className="detail_body">
            <h1 className="h_m-0 h_mb-c">{state.monitor.name}</h1>
            {state.monitor.description ? <Text title={"Description"} text={state.monitor.description} /> : null}
            <div className="info_statistics_container h_mt-c">
                <Statistics state={state} />
            </div>
            {state.monitor.events && state.monitor.events.length > 0 ?
                <div className="h_mt-c info_event_container">
                    <span>Events</span>
                    {state.monitor.events?.map((event, index) =>
                        <div className="info_event_list" key={index}>
                            <List
                                title={<div className="info_event_title">
                                    <span className="info_event_name">{event.pluginName}</span>
                                    {event.threshold 
                                        ? event.threshold == "DEAD" 
                                            ? "On dead states" 
                                            : "On warn or dead states" 
                                        : null}
                                </div>}
                                data={event.pluginArgs}
                            />
                        </div>)}
                </div>
                : null}
            <div className="info_table_container h_mt-c">
                <Table state={state} />
            </div>
        </div>

        <div className="detail_controls">
            <Button
                kind="primary"
                onClick={() => monitorContext.dispatch({ type: "pane", pane: { type: "editor", monitor: state.monitor } })}
            >
                <span>Edit</span>
            </Button>
            <Button
                border={true}
                onClick={() => monitorContext.dispatch({ type: "queue", monitors: [state.monitor] })}
                kind="destructive"
            >
                Delete
            </Button>
            <div className="detail_controls_delete">
                <Button
                    border={true}
                    onClick={() => monitorContext.dispatch({ type: "pane", pane: { type: "view", target: null } })}
                >
                    <span>Close</span>
                </Button>
            </div>
        </div>
    </div>
}
