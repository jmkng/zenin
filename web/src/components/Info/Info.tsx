import { useMonitorContext } from "../../internal/monitor"
import { ViewState } from "../../internal/monitor/reducer";

import Button from "../Button/Button";
import TableComponent from "./Table/Table";
import ExpandComponent from "./Expand/Expand";
import SummaryComponent from "./Summary/Summary";

import "./Info.css"

interface InfoProps {
    state: ViewState
}

export default function InfoComponent(props: InfoProps) {
    const { state } = props;
    const monitor = {
        context: useMonitorContext()
    }
    const reversed = (state.target.measurements || []).toReversed();

    return (
        <div className="zenin__info_component">
            <div className="zenin__info_component_body">
                <h1 className="zenin__info_name">{state.target.name}</h1>
                {state.target.description ?
                    <ExpandComponent title={"Description"} text={state.target.description} />
                    : null}

                <div className="zenin__info_summary_container zenin__h_space_top">
                    <SummaryComponent measurements={reversed} />
                </div>
                <div className="zenin__info_table_container zenin__h_space_top">
                    <TableComponent measurements={reversed} selected={state.subTarget} />
                </div>
            </div>

            <div className="zenin__detail_controls">
                <Button
                    kind="primary"
                    onClick={() => monitor.context.dispatch({ type: 'edit', monitor: state.target })}>
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
