import { useEffect, useMemo, useState } from 'react';
import { Measurement } from '../../../internal/monitor';

import CheckboxInput from '../../Input/CheckboxInput/CheckboxInput';
import Button from '../../Button/Button';
import ClockIcon from '../../Icon/ClockIcon/ClockIcon';
import UpDownIcon from '../../Icon/UpDownIcon/UpDownIcon';
import PreviousIcon from '../../Icon/PreviousIcon/PreviousIcon';
import NextIcon from '../../Icon/NextIcon/NextIcon';
import LastIcon from '../../Icon/LastIcon/LastIcon';
import FirstIcon from '../../Icon/FirstIcon/FirstIcon';
import Row from './Row/Row';

import './Table.css';

interface TableProps {
    measurements: Measurement[]
}

export default function TableComponent(props: TableProps) {
    const { measurements } = props;
    const pages = Math.ceil(measurements.length / PAGESIZE);
    const [page, setPage] = useState(1);
    const visible = useMemo(() => measurements.slice((page - 1) * PAGESIZE, page * PAGESIZE), [page, measurements]);
    const id = useMemo(() => [...measurements].map(n => n.id!), [measurements]);
    const [expanded, setExpanded] = useState(true);
    const [checkedRowIDs, setCheckedRowIDs] = useState<number[]>([]);
    const [allChecked, setAllChecked] = useState(false);
    const backDisabled = useMemo(() => page == 1, [page]);
    const forwardDisabled = useMemo(() => page == pages, [page]);

    useEffect(() => {
        if (checkedRowIDs !== id) setAllChecked(false)
    }, [checkedRowIDs, id])

    useEffect(() => {
        setAllChecked(false);
        setCheckedRowIDs([]);
    }, [measurements, page])

    const handleCheck = (id: number) => {
        if (checkedRowIDs.includes(id)) setCheckedRowIDs(checkedRowIDs.filter(n => n !== id))
        else setCheckedRowIDs([...checkedRowIDs, id])
    }

    const handleExpandToggle = () => {
        setExpanded(prev => !prev);
    }

    const handlePageNext = () => {
        setPage(prev => prev == pages ? prev : (prev + 1));
    }

    const handlePagePrevious = () => {
        setPage(prev => prev == 1 ? prev : (prev - 1))
    }

    const handlePageLast = () => {
        setPage(pages);
    }

    const handlePageFirst = () => {
        setPage(1);
    }

    const handleMasterCheck = () => {
        if (allChecked) {
            setCheckedRowIDs([])
            setAllChecked(false)
        }
        else {
            setCheckedRowIDs(id);
            setAllChecked(true)
        }
    }

    return (
        <div className="zenin__table_component">
            <div className="zenin__table_header">
                <span className="zenin__table_measurement_count">{measurements.length} measurements</span>
                <div className="zenin__table_collapse_container">
                    <Button onClick={handleExpandToggle} border={true} icon={<UpDownIcon />}>
                        <span>{expanded ? 'Hide' : 'Show'}</span>
                    </Button>
                </div>
                <div className="zenin__table_recent_container">
                    <Button border={true} icon={<ClockIcon />}>
                        <span className='zenin__table_recent_button_text'>
                            Recent
                        </span>
                    </Button>
                </div>
            </div>
            {expanded ?
                <>
                    <div className="zenin__table_container">
                        <table>
                            <colgroup>
                                <col span={1} />
                                <col width="100%" span={1} />
                                <col span={1} />
                            </colgroup>
                            <thead className='zenin__table_head'>
                                <tr>
                                    <th>
                                        <CheckboxInput onChange={handleMasterCheck} checked={allChecked} name={`zenin__table_master`} />
                                    </th>
                                    <th>Time</th>
                                    <th>State</th>
                                </tr>
                            </thead>
                            <tbody className='zenin__table_body'>
                                {visible.map((n, index) =>
                                    <Row key={index} row={n} onCheck={handleCheck} checked={checkedRowIDs} />
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="zenin__table_footer">
                        <Button onClick={handlePageFirst} border={true} disabled={backDisabled}>
                            <FirstIcon />
                        </Button>
                        <Button onClick={handlePagePrevious} border={true} disabled={backDisabled}>
                            <PreviousIcon />
                        </Button>
                        <Button border={true} disabled={true}>
                            {page}/{pages}
                        </Button>
                        <Button onClick={handlePageNext} border={true} disabled={forwardDisabled}>
                            <NextIcon />
                        </Button>
                        <Button onClick={handlePageLast} border={true} disabled={forwardDisabled}>
                            <LastIcon />
                        </Button>
                    </div>
                </>
                : null}
        </div>
    );
}

const PAGESIZE = 10;
