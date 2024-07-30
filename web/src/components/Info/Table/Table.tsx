import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAccountContext } from '../../../internal/account';
import { Measurement } from '../../../internal/measurement';
import { useMonitorContext } from '../../../internal/monitor';
import { ViewState } from '../../../internal/monitor/reducer';
import { useDefaultMonitorService } from '../../../internal/monitor/service';
import { DataPacket } from '../../../server';

import Button from '../../Button/Button';
import ClockIcon from '../../Icon/ClockIcon/ClockIcon';
import FirstIcon from '../../Icon/FirstIcon/FirstIcon';
import LastIcon from '../../Icon/LastIcon/LastIcon';
import NextIcon from '../../Icon/NextIcon/NextIcon';
import PreviousIcon from '../../Icon/PreviousIcon/PreviousIcon';
import CheckboxInput from '../../Input/CheckboxInput/CheckboxInput';
import ModalComponent from '../../Modal/Modal';
import AggregateComponent from '../Aggregate/Aggregate';
import PropertyComponent from '../Property/Property';
import Row from './Row/Row';

import './Table.css';

interface TableProps {
    state: ViewState
}

export default function TableComponent(props: TableProps) {
    const { state } = props;
    const monitor = {
        context: useMonitorContext(),
        service: useDefaultMonitorService()
    }
    const account = useAccountContext();
    const measurements = (state.monitor.measurements || []).toReversed();
    const pages = Math.ceil(measurements.length / PAGESIZE);
    const [page, setPage] = useState(1);
    const [checked, setChecked] = useState<number[]>([]);
    const [allChecked, setAllChecked] = useState(false);
    const [dateModalIsVisible, setDateModalIsVisible] = useState(false);

    const propertyContainerRef = useRef<HTMLDivElement>(null);
    const visible = measurements.slice((page - 1) * PAGESIZE, page * PAGESIZE);
    const id = measurements.map(n => n.id!);
    const backDisabled = page === 1;
    const forwardDisabled = page === pages;

    useLayoutEffect(() => {
        setChecked([]);
        setAllChecked(false);
        setPage(1);
    }, [state.monitor])

    useEffect(() => {
        if (state.selected && propertyContainerRef.current) {
            propertyContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [state.selected])

    const handleRowCheck = (id: number) => {
        if (checked.includes(id)) {
            setChecked(checked.filter(n => n !== id));
        } else {
            setChecked([...checked, id]);
        }
    };

    const handleDateChange = async (value: MeasurementDate) => {
        if (value.isRecent()) {
            // Attach to monitor HEAD.
            const head = monitor.context.state.monitors.get(state.monitor.id);
            if (!head) return;
            monitor.context.dispatch({
                type: 'view',
                target: { monitor: head, measurement: null, disableToggle: true }
            });
            return;
        }

        // Detach from HEAD, make duplicate monitor with fixed measurement set, freeze state.
        const measurements = await monitor.service.measurements(account.state.authenticated!.token.raw,
            state.monitor.id, value);
        if (!measurements.ok()) return;

        const packet: DataPacket<Measurement[]> = await measurements.json();

        const mon = { ...state.monitor, measurements: [...packet.data || []].toReversed() };
        monitor.context.dispatch({
            type: 'view',
            target: { monitor: mon, measurement: null, disableToggle: true }
        })
    }

    const handleRowClick = (id: number) => {
        const measurement = measurements.find(n => n.id === id) || null;
        monitor.context.dispatch({ type: 'detail', measurement })
    };

    const handleMasterCheck = () => {
        if (allChecked) {
            setChecked([]);
            setAllChecked(false);
        } else {
            setChecked(id);
            setAllChecked(true);
        }
    };

    return <div className="zenin__table_component">
        <div className="zenin__table_header">
            <span className="zenin__table_measurement_count">{measurements.length} measurements</span>
            <div className="zenin__table_recent_container">
                <Button
                    style={dateModalIsVisible ? { background: "var(--off-b)" } : {}} // Maintain background when modal is open.
                    border={true}
                    icon={<ClockIcon />}
                    onClick={event => { event.stopPropagation(); setDateModalIsVisible(!dateModalIsVisible) }}
                >
                    <span className='zenin__table_recent_button_text'>Date</span>
                    <ModalComponent
                        visible={dateModalIsVisible}
                        onCancel={() => setDateModalIsVisible(false)}
                        kind={{
                            flag: 'attached',
                            content: [
                                { text: "Recent", onClick: () => handleDateChange(new MeasurementDate("RECENT")) },
                                { text: "Past Day", onClick: () => handleDateChange(new MeasurementDate("DAY")) },
                                { text: "Past Week", onClick: () => handleDateChange(new MeasurementDate("WEEK")) },
                                { text: "Past Month", onClick: () => handleDateChange(new MeasurementDate("MONTH")) },
                                { text: "Past Year", onClick: () => handleDateChange(new MeasurementDate("YEAR")) },
                            ]
                        }}
                    />
                </Button>
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
                            <CheckboxInput
                                checked={allChecked}
                                name={`zenin__table_master`}
                                onChange={handleMasterCheck} />
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

        <div className="zenin__info_aggregate_container zenin__h_space_top">
            <AggregateComponent measurements={measurements} />
        </div>

        {state.selected ?
            <div className="zenin__info_property_container" ref={propertyContainerRef}>
                <PropertyComponent measurement={state.selected} />
            </div>
            : null}
    </div >
}

const PAGESIZE = 10;

export class MeasurementDate {
    constructor(
        public date: "RECENT" | "DAY" | "WEEK" | "MONTH" | "YEAR"
    ) { }

    toString() {
        switch (this.date) {
            case "RECENT": return "Recent";
            case "DAY": return "Past Day";
            case "WEEK": return "Past Week";
            case "MONTH": return "Past Month";
            case "YEAR": return "Past Year"
        }
    }

    toAfterDate() {
        const today = new Date();
        const target = new Date(today);

        switch (this.date) {
            case "DAY":
                target.setDate(today.getDate() - 1);
                break;
            case "WEEK":
                target.setDate(today.getDate() - 7);
                break;
            case "MONTH":
                target.setMonth(today.getMonth() - 1);
                break;
            case "YEAR":
                target.setFullYear(today.getFullYear() - 1);
                break;
            default:
                throw new Error("invalid measurement date value");
        }

        const month = target.getMonth() + 1;
        const day = target.getDate();
        const year = target.getFullYear();

        return `${month}/${day}/${year}`;
    }

    isRecent(): this is { date: "RECENT" } {
        return this.date == "RECENT";
    }
}