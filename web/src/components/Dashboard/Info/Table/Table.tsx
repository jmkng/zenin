import { useAccountContext } from "@/hooks/useAccount";
import { useMeasurementService } from "@/hooks/useMeasurement";
import { useMonitor } from "@/hooks/useMonitor";
import { Measurement } from "@/internal/measurement";
import { OriginState, ViewPane } from "@/internal/monitor/split";
import { DataPacket } from "@/internal/server";
import { useEffect, useRef, useState } from "react";

import Button from "../../../Button/Button";
import ClockIcon from "../../../Icon/ClockIcon";
import FirstIcon from "../../../Icon/FirstIcon";
import LastIcon from "../../../Icon/LastIcon";
import NextIcon from "../../../Icon/NextIcon";
import PreviousIcon from "../../../Icon/PreviousIcon";
import TrashIcon from "../../../Icon/TrashIcon";
import CheckboxInput from "../../../Input/CheckboxInput/CheckboxInput";
import Dialog from "../../Dialog/Dialog";
import Property from "../Property/Property";
import Row from "./Row/Row";
import TableDialogContent from "./TableDialogContext";

import "./Table.css";

interface TableProps {
    state: ViewPane
}

export default function Table(props: TableProps) {
    const { state } = props;

    const { service: monitorService, context: monitorContext } = useMonitor();
    const measurementService = useMeasurementService();
    const accountContext = useAccountContext();

    const measurements = (state.monitor.measurements || []).toReversed();
    const pages = Math.ceil(measurements.length / PAGESIZE);
    const [page, setPage] = useState(1);
    const [checked, setChecked] = useState<number[]>([]);
    const [allChecked, setAllChecked] = useState(false);

    const visible = measurements.slice((page - 1) * PAGESIZE, page * PAGESIZE);
    const propertyContainerRef = useRef<HTMLDivElement>(null);
    const id = measurements.map(n => n.id!);
    const backDisabled = pages <= 1 || page === 1;
    const forwardDisabled = pages <= 1 || (pages > 1 && page === pages);
    const hasTableFooterMargin = !backDisabled || !forwardDisabled || pages > 1

    useEffect(() => {
        setChecked([]);
        setAllChecked(false);
    }, [state.monitor])

    useEffect(() => {
        if (state.selected && propertyContainerRef.current) {
            propertyContainerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        setPage(state.selected
            ? measurements.reduce((acc, _, i, a) => acc === -1 && i % 7 === 0 && a.slice(i, i + 7).includes(state.selected!) ? Math.floor(i / 7) + 1 : acc, -1)
            : 1);
    }, [state.selected]);

    function checkAll() {
        if (allChecked) {
            setChecked([]);
            setAllChecked(false);
        } else {
            setChecked(id);
            setAllChecked(true);
        }
    };

    function checkRow(id: number) {
        if (checked.includes(id)) setChecked(checked.filter(n => n !== id));
        else setChecked([...checked, id]);
    };

    async function changeDateRange(value: OriginState) {
        if (value == "HEAD") {
            // Attach to monitor HEAD.
            const head = monitorContext.state.monitors.get(state.monitor.id);
            if (!head) return;
            monitorContext.dispatch({
                type: "pane",
                pane: { type: "view", target: { monitor: head, measurement: null, disableToggle: true, origin: "HEAD" } },
            });
            return;
        }

        // Detach from HEAD, make duplicate monitor with fixed measurement set, freeze state.
        const token = accountContext.state.token!;
        const measurements = await monitorService.getMeasurement(token.raw, state.monitor.id, value);
        if (!measurements.ok()) return;

        const packet: DataPacket<{ measurements: Measurement[] }> = await measurements.json();

        const monitor = { ...state.monitor, measurements: [...packet.data.measurements].toReversed() };
        monitorContext.dispatch({
            type: "pane",
            pane: { type: "view", target: { monitor, measurement: null, disableToggle: true, origin: value } },
        });
    }

    async function deleteMeasurement() {
        const token = accountContext.state.token!;
        const extract = await measurementService.deleteMeasurement(token.raw, checked);
        if (!extract.ok()) return;
        monitorContext.dispatch({ type: "measurement", monitor: state.monitor.id, id: checked })
        // If a measurement's properties are being displayed and that measurement is deleted,
        // stop showing them.
        if (state.selected && checked.includes(state.selected.id)) {
            const target = { monitor: state.monitor, measurement: null, disableToggle: true };
            const pane = { type: "view" as const, target }
            monitorContext.dispatch({ type: "pane", pane })
        }
        const newPages = Math.ceil((measurements.length - checked.length) / PAGESIZE);
        setChecked([]);
        setAllChecked(false);
        setPage(prev => Math.min(prev, newPages) || 1);
    }

    function viewMeasurement(id: number) {
        const measurement = measurements.find(n => n.id === id) || null;
        const target = { monitor: state.monitor, measurement, disableToggle: true };
        const pane = { type: "view" as const, target }
        monitorContext.dispatch({ type: "pane", pane })
    }

    return <div className="table_component">
        <div className="table_header">
            <span className="table_measurement_count">
                {measurements.length} {measurements.length == 1 ? "measurement" : "measurements"}
            </span>

            <div className="table_controls_container">
                <Button
                    onClick={deleteMeasurement}
                    disabled={checked.length == 0}
                    border={true}
                    icon={<TrashIcon />}
                />

                <Dialog dialog={{ content: <TableDialogContent onDateChange={changeDateRange} /> }}>
                    <Button border={true} icon={<ClockIcon />} >
                        {state.origin == "HEAD" ? "Most Recent" : state.origin.toString()}
                    </Button>
                </Dialog>
            </div>
        </div>
        <div className="table_container">
            <table>
                <colgroup>
                    <col span={1} />
                    <col span={1} />
                    <col width="100%" span={1} />
                    <col span={1} />
                </colgroup>
                <thead className="table_head">
                    <tr>
                        <th>
                            <CheckboxInput checked={allChecked} name={`table_master`} onChange={checkAll} />
                        </th>
                        <th>ID</th>
                        <th>Time</th>
                        <th>State</th>
                    </tr>
                </thead>
                <tbody className="table_body">
                    {visible.map((n, index) =>
                        <Row
                            key={index}
                            measurement={n}
                            highlight={state.selected != null && n.id === state.selected.id}
                            checked={checked}
                            onCheck={checkRow}
                            onClick={viewMeasurement}
                        />
                    )}
                </tbody>
            </table>
        </div>
        <div className={["table_footer", hasTableFooterMargin ? "margin" : ""].join(" ")}>
            <div className="table_footer_right">
                {!backDisabled
                    ? <>
                        <Button border={true} onClick={() => setPage(1)}>
                            <FirstIcon />
                        </Button>
                        <Button border={true} onClick={() => setPage(prev => (prev === 1 ? prev : prev - 1))}>
                            <PreviousIcon />
                        </Button>
                    </>
                    : null}
                {pages > 1
                    ? <div className="table_footer_page_count footer_control_set">
                        {page}/{pages}
                    </div>
                    : null}
                {!forwardDisabled
                    ? <>
                        <Button border={true} onClick={() => setPage(prev => (prev === pages ? prev : prev + 1))}>
                            <NextIcon />
                        </Button>
                        <Button border={true} onClick={() => setPage(pages)}>
                            <LastIcon />
                        </Button>
                    </>
                    : null}
            </div>
        </div>
        {state.selected ?
            <div className="info_property_container" ref={propertyContainerRef}>
                <Property measurement={state.selected} />
            </div>
            : null}
    </div>
}

const PAGESIZE = 7;
