import { useMonitorContext } from "../../internal/monitor";
import { ViewState } from "../../internal/monitor/split";

import Button from "../Button/Button";
import ExpandComponent from "./Expand/Expand";
import SummaryComponent from "./Summary/Summary";
import TableComponent from "./Table/Table";

import "./Info.css";

interface InfoProps {
    state: ViewState
}

export default function InfoComponent(props: InfoProps) {
    const { state } = props;
    const monitor = { context: useMonitorContext() }

    return (
        <div className="zenin__info_component">
            <div className="zenin__info_component_body">
                <h1 className="zenin__info_name">{state.monitor.name}</h1>
                {state.monitor.description ?
                    <ExpandComponent title={"Description"} text={state.monitor.description} />
                    : null}

                <div className="zenin__info_summary_container zenin__h_space_top">
                    <SummaryComponent state={state} />
                </div>
                <div className="zenin__info_table_container zenin__h_space_top">
                    <TableComponent state={state} />
                </div>
            </div>

            <div className="zenin__detail_controls">
                <Button
                    kind="primary"
                    onClick={() => monitor.context.dispatch({ type: 'edit', monitor: state.monitor })}>
                    <span>Edit</span>
                </Button>
                <Button
                    border={true}
                    onClick={() => monitor.context.dispatch({ type: 'view', target: null })}>
                    <span>Close</span>
                </Button>
            </div>
        </div >
    )
}
