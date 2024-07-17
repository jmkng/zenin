import { Monitor, useMonitorContext } from "../../internal/monitor"
import { useMemo } from "react";

import Button from "../Button/Button";
import TableComponent from "./Table/Table";
import DescriptionComponent from "./Description/Description";

import "./Info.css"
import SummaryComponent from "./Summary/Summary";
import AggregateComponent from "./Aggregate/Aggregate";

interface InfoProps {
    monitor: Monitor
}

export default function InfoComponent(props: InfoProps) {
    const monitor = {
        data: props.monitor,
        context: useMonitorContext()
    }
    const reversed = useMemo(() => monitor.data.measurements?.toReversed() || [], [monitor.data.measurements]);


    const handleEdit = () => {
        monitor.context.dispatch({ type: 'edit', monitor: monitor.data })
    }

    const handleClose = () => {
        monitor.context.dispatch({ type: 'view', monitor: null })
    }

    return (
        <div className="zenin__info_component">
            <div className="zenin__info_component_body">
                <h1 className="zenin__info_name">
                    {monitor.data.name}
                </h1>
                <div className="zenin__info_description_container">
                    <DescriptionComponent description={monitor.data.description} />
                </div>
                <div className="zenin__info_summary_container">
                    <SummaryComponent measurements={reversed} />
                </div>
                <div className="zenin__info_table_container">
                    <TableComponent measurements={reversed} />
                </div>
                <div className="zenin__info_aggregate_container">
                    <AggregateComponent measurements={reversed} />
                </div>
            </div>

            <div className="zenin__detail_controls">
                <Button kind="primary" onClick={handleEdit}>
                    <span>Edit</span>
                </Button>
                <Button border={true} onClick={handleClose}>
                    <span>Close</span>
                </Button>
            </div>
        </div >
    )
}
