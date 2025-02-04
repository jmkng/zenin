import { useEffect, useRef, useState } from 'react';
import { useAccountContext } from '../../../../../internal/account';
import { Measurement } from '../../../../../internal/measurement';
import { useDefaultMeasurementService } from '../../../../../internal/measurement/service';
import { useDefaultMonitorService, useMonitorContext } from '../../../../../internal/monitor';
import { OriginState, ViewPane } from '../../../../../internal/monitor/split';
import { DataPacket } from '../../../../../internal/server';

import Button from '../../../Button/Button';
import ClockIcon from '../../../Icon/ClockIcon';
import FirstIcon from '../../../Icon/FirstIcon';
import LastIcon from '../../../Icon/LastIcon';
import NextIcon from '../../../Icon/NextIcon';
import PreviousIcon from '../../../Icon/PreviousIcon';
import TrashIcon from '../../../Icon/TrashIcon';
import CheckboxInput from '../../../Input/CheckboxInput/CheckboxInput';
import Dialog from '../../Dialog/Dialog';
import Property from '../Property/Property';
import Row from './Row/Row';
import TableDialogContent from './TableDialogContext';

import './Table.css';


interface TableProps {
    state: ViewPane
}

export default function Table(props: TableProps) {
    const { state } = props;
    const monitor = {
        context: useMonitorContext(),
        service: useDefaultMonitorService()
    }
    const measurement = {
        service: useDefaultMeasurementService()
    }
    const account = useAccountContext();
    const measurements = (state.monitor.measurements || []).toReversed();
    const pages = Math.ceil(measurements.length / PAGESIZE);
    const [page, setPage] = useState(1);

    const [checked, setChecked] = useState<number[]>([]);
    const [allChecked, setAllChecked] = useState(false);

    const visible = measurements.slice((page - 1) * PAGESIZE, page * PAGESIZE);
    const propertyContainerRef = useRef<HTMLDivElement>(null);
    const id = measurements.map(n => n.id!);
    const backDisabled = page === 1;
    const forwardDisabled = page === pages;

    useEffect(() => {
        setChecked([]);
        setAllChecked(false);
    }, [state.monitor])

    useEffect(() => {
        if (state.selected && propertyContainerRef.current) {
            propertyContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        setPage(state.selected
            ? measurements.reduce((acc, _, i, a) => acc === -1 && i % 7 === 0 && a.slice(i, i + 7).includes(state.selected!) ? Math.floor(i / 7) + 1 : acc, -1)
            : 1);
    }, [state.selected])

    const handleMasterCheck = () => {
        if (allChecked) {
            setChecked([]);
            setAllChecked(false);
        } else {
            setChecked(id);
            setAllChecked(true);
        }
    };

    const handleRowCheck = (id: number) => {
        if (checked.includes(id)) {
            setChecked(checked.filter(n => n !== id));
        } else {
            setChecked([...checked, id]);
        }
    };

    const handleDateChange = async (value: OriginState) => {
        if (value == "HEAD") {
            // Attach to monitor HEAD.
            const head = monitor.context.state.monitors.get(state.monitor.id);
            if (!head) return;
            monitor.context.dispatch({
                type: 'pane',
                pane: { type: 'view', target: { monitor: head, measurement: null, disableToggle: true, origin: "HEAD" } },
            });
            return;
        }

        // Detach from HEAD, make duplicate monitor with fixed measurement set, freeze state.
        const measurements = await monitor.service.getMeasurement(account.state.token!.raw,
            state.monitor.id, value);
        if (!measurements.ok()) return;

        const packet: DataPacket<Measurement[]> = await measurements.json();

        const mon = { ...state.monitor, measurements: [...packet.data || []].toReversed() };
        monitor.context.dispatch({
            type: 'pane',
            pane: { type: 'view', target: { monitor: mon, measurement: null, disableToggle: true, origin: value } },
        });
    }

    const handleDelete = async () => {
        const extract = await measurement.service.deleteMeasurement(account.state.token!.raw, checked);
        if (!extract.ok()) return;

        monitor.context.dispatch({ type: 'measurement', monitor: state.monitor.id, id: checked })
        setChecked([]);
        setAllChecked(false);
    }

    const handleRowClick = (id: number) => {
        const measurement = measurements.find(n => n.id === id) || null;
        monitor.context.dispatch({ type: 'detail', measurement })
    }

    return <div className="zenin__table_component">
        <div className="zenin__table_header">
            <span className="zenin__table_measurement_count">
                {measurements.length} {measurements.length == 1 ? "measurement" : "measurements"}
            </span>

            <div className="zenin__table_controls_container">
                <Button 
                    onClick={handleDelete} 
                    disabled={checked.length == 0} 
                    border={true} 
                    icon={<TrashIcon />} 
                />

                <Dialog dialog={{content: <TableDialogContent onDateChange={handleDateChange}/>}}>
                    <Button border={true} icon={<ClockIcon />} >
                        {state.origin == "HEAD" ? "Recent" : state.origin.toString()}
                    </Button>
                </Dialog>
            </div>
        </div>
        <div className="zenin__table_container">
            <table>
                <colgroup>
                    <col span={1} />
                    <col span={1} />
                    <col width="100%" span={1} />
                    <col span={1} />
                </colgroup>
                <thead className='zenin__table_head'>
                    <tr>
                        <th>
                            <CheckboxInput checked={allChecked} name={`zenin__table_master`} onChange={handleMasterCheck} />
                        </th>
                        <th>ID</th>
                        <th>Time</th>
                        <th>State</th>
                    </tr>
                </thead>
                <tbody className='zenin__table_body'>
                    {visible.map((n, index) =>
                        <Row
                            key={index}
                            measurement={n}
                            highlight={state.selected != null && n.id === state.selected.id}
                            checked={checked}
                            onCheck={handleRowCheck}
                            onClick={handleRowClick}
                        />
                    )}
                </tbody>
            </table>
        </div>
        <div className="zenin__table_footer">
            <div className="zenin__table_footer_right">
                <Button onClick={() => setPage(1)} border={true} disabled={backDisabled}>
                    <FirstIcon />
                </Button>
                <Button onClick={() => setPage(prev => (prev === 1 ? prev : prev - 1))} border={true} disabled={backDisabled}>
                    <PreviousIcon />
                </Button>
                <Button border={true} disabled={true}>
                    {page}/{pages}
                </Button>
                <Button onClick={() => setPage(prev => (prev === pages ? prev : prev + 1))} border={true} disabled={forwardDisabled}>
                    <NextIcon />
                </Button>
                <Button onClick={() => setPage(pages)} border={true} disabled={forwardDisabled}>
                    <LastIcon />
                </Button>
            </div>
        </div>
        {state.selected ?
            <div className="zenin__info_property_container" ref={propertyContainerRef}>
                <Property measurement={state.selected} />
            </div>
            : null}
    </div >
}

const PAGESIZE = 7;
