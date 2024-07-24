import { useEffect, useRef, useState } from 'react';
import { Measurement, useMonitorContext } from '../../../internal/monitor';

import CheckboxInput from '../../Input/CheckboxInput/CheckboxInput';
import AggregateComponent from '../Aggregate/Aggregate';
import PropertyComponent from '../Property/Property';
import Button from '../../Button/Button';
import ClockIcon from '../../Icon/ClockIcon/ClockIcon';
import PreviousIcon from '../../Icon/PreviousIcon/PreviousIcon';
import NextIcon from '../../Icon/NextIcon/NextIcon';
import LastIcon from '../../Icon/LastIcon/LastIcon';
import FirstIcon from '../../Icon/FirstIcon/FirstIcon';
import Row from './Row/Row';

import './Table.css';

interface TableProps {
    measurements: Measurement[]
    selected: Measurement | null
}

export default function TableComponent(props: TableProps) {
    const { measurements, selected } = props;
    const monitor = {
        context: useMonitorContext()
    }
    const pages = Math.ceil(measurements.length / PAGESIZE);
    const [page, setPage] = useState(1);
    const [checkedRowIDs, setCheckedRowIDs] = useState<number[]>([]);
    const [allChecked, setAllChecked] = useState(false);

    const propertyContainerRef = useRef<HTMLDivElement>(null);
    const visible = measurements.slice((page - 1) * PAGESIZE, page * PAGESIZE);
    const id = measurements.map(n => n.id!);
    const backDisabled = page === 1;
    const forwardDisabled = page === pages;

    useEffect(() => {
        setAllChecked(false);
    }, [measurements, page]);

    useEffect(() => {
        setCheckedRowIDs([]);
    }, [page])

    useEffect(() => {
        if (selected && propertyContainerRef.current) {
            propertyContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [selected])

    const handleRowCheck = (id: number) => {
        if (checkedRowIDs.includes(id)) {
            setCheckedRowIDs(checkedRowIDs.filter(n => n !== id));
        } else {
            setCheckedRowIDs([...checkedRowIDs, id]);
        }
    };

    const handleRowClick = (id: number) => {
        const found = measurements.find(n => n.id === id);
        monitor.context.dispatch({ type: 'detail', measurement: found || null })
    };

    const handleMasterCheck = () => {
        if (allChecked) {
            setCheckedRowIDs([]);
            setAllChecked(false);
        } else {
            setCheckedRowIDs(id);
            setAllChecked(true);
        }
    };

    return <div className="zenin__table_component">
        <div className="zenin__table_header">
            <span className="zenin__table_measurement_count">{measurements.length} measurements</span>
            <div className="zenin__table_recent_container">
                <Button border={true} icon={<ClockIcon />}>
                    <span className='zenin__table_recent_button_text'>Recent</span>
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
                            highlight={selected != null && n.id === selected.id}
                            checked={checkedRowIDs}
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

        <div className="zenin__info_aggregate_container">
            <AggregateComponent measurements={measurements} />
        </div>

        {selected ?
            <div className="zenin__info_property_container" ref={propertyContainerRef}>
                <PropertyComponent measurement={selected} />
            </div>
            : null}
    </div >
}

const PAGESIZE = 10;