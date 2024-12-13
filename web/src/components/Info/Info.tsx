import { useMonitorContext } from "../../internal/monitor";
import { ViewPane } from "../../internal/monitor/split";

import Button from "../Button/Button";
import Text from "./Text/Text";
import Statistics from "./Statistics/Statistics";
import Table from "./Table/Table";
import List from "./List/List";

import "./Info.css";

interface InfoProps {
    state: ViewPane
}

export default function Info(props: InfoProps) {
    const { state } = props;
    const monitor = { context: useMonitorContext() }

    return <div className="zenin__info_component">
        <div className="zenin__detail_body">
            <h1 className="zenin__info_name">{state.monitor.name}</h1>
            {state.monitor.description ? <Text title={"Description"} text={state.monitor.description} /> : null}
            <div className="zenin__info_statistics_container zenin__h_margin_top">
                <Statistics state={state} />
            </div>
            {state.monitor.events && state.monitor.events.length > 0 ?
                <div className="zenin__h_margin_top zenin__info_event_container">
                    <span>Events</span>
                    {state.monitor.events?.map((event, index) =>
                        <div className="zenin__info_event_list" key={index}>
                            <List
                                title={<div className="zenin__info_event_title">
                                    <span className="zenin__info_event_name">{event.pluginName}</span>
                                    {event.threshold ? <span className="zenin__info_event_threshold zenin__state" data-state={event.threshold}>{event.threshold}</span> : null}
                                </div>}
                                data={event.pluginArgs || []}
                            />
                        </div>)}
                </div>
                : null}
            <div className="zenin__info_table_container zenin__h_margin_top">
                <Table state={state} />
            </div>
        </div>

        <div className="zenin__detail_controls">
            <Button
                kind="primary"
                onClick={() => monitor.context.dispatch({ type: 'pane', pane: { type: 'editor', monitor: state.monitor } })}
            >
                <span>Edit</span>
            </Button>
            <Button
                border={true}
                onClick={() => monitor.context.dispatch({ type: 'pane', pane: { type: 'view', target: null } })}
            >
                <span>Close</span>
            </Button>
            <div className="zenin__detail_controls_delete">
                <Button
                    border={true}
                    onClick={() => monitor.context.dispatch({ type: 'delete', monitors: [state.monitor!] })}
                    kind="destructive"
                >
                    Delete
                </Button>
            </div>
        </div>
    </div>
}
