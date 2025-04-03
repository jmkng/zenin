import { MouseEvent } from "react";

import { useMonitorContext } from "@/hooks/useMonitor";
import { formatUTCDate, MINIMAL_FORMAT } from "@/internal/layout/graphics";
import { Measurement } from "@/internal/measurement";
import { Monitor as MonitorKind } from "@/internal/monitor";
import { PaneKind } from "@/internal/monitor/reducer";

import Button from "../../Button/Button";
import VMenuIcon from "../../Icon/VMenuIcon";
import Dialog from "../Dialog/Dialog";
import InactiveWidget from "./InactiveWidget/InactiveWidget";
import MonitorDialogContent from "./MonitorDialogContent";
import Timeline from "./Timeline/Timeline";

import "./Monitor.css";

interface MonitorProps {
    monitor: MonitorKind;

    onToggle: (active: boolean, id: number[]) => void;
    onPoll: (id: number) => void;
}

export default function Monitor(props: MonitorProps) {
    const { monitor, onToggle, onPoll } = props;
    const monitorContext = useMonitorContext();
    const reversed = monitor.measurements.toReversed();
    const classes = ["monitor", monitorContext.state.selected.includes(monitor) ? "selected" : ""];

    function select() {
        monitorContext.dispatch({ type: "select", monitor: monitor })
    }

    function openInfoPane(event: MouseEvent<HTMLDivElement>) {
        event.stopPropagation();
        const target = { monitor, measurement: null };
        const pane: PaneKind = { type: "view", target };
        monitorContext.dispatch({ type: "pane", pane });
    }

    const openInfoPaneWithMeasurement = (measurement: Measurement) => {
        const target = { monitor, measurement, disableToggle: true };
        const pane: PaneKind = { type: "view", target };
        monitorContext.dispatch({ type: "pane", pane });
    }

    return <div className={classes.join(" ")}>
        <div className="monitor_top" onClick={select}>
            <div className="monitor_top_upper">
                <div className="monitor_top_controls">
                    <div className="monitor_name" onClick={openInfoPane}>
                        {monitor.name}
                    </div>
                </div>
                <div className="monitor_menu_container h_ml-auto">
                    {!monitor.active
                        ? <div className="monitor_inactive_widget">
                            <InactiveWidget active={monitor.active} />
                        </div>
                        : null}
                    <div onClick={e => e.stopPropagation()}>
                        <Dialog dialog={{ content: <MonitorDialogContent monitor={monitor} onToggle={onToggle} onPoll={onPoll} /> }}>
                            <div className="monitor_dialog_button_container">
                                <Button hover={false} icon={<VMenuIcon />}>
                                </Button>
                            </div>
                        </Dialog>
                    </div>
                </div>
            </div>
            <div className="monitor_top_lower">
                <div className="monitor_timestamp">
                    {reversed[0] ? formatUTCDate(reversed[0].createdAt, MINIMAL_FORMAT) : null}
                </div>
            </div>
        </div>

        <div className="monitor_bottom">
            <Timeline measurements={reversed} onSlotClick={openInfoPaneWithMeasurement} />
        </div>
    </div>
}
