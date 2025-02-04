import { useMemo } from 'react';
import { formatDate } from '@/internal/layout/graphics';
import { Measurement } from '@/internal/measurement';

import CheckboxInput from '../../../../Input/CheckboxInput/CheckboxInput';

import './Row.css';

interface RowProps {
    measurement: Measurement,
    highlight: boolean;
    checked: number[]
    onCheck: (id: number) => void;
    onClick: (id: number) => void;
}

export default function Row(props: RowProps) {
    const { measurement, highlight, checked, onCheck, onClick } = props;
    const isChecked = useMemo(() => {
        if (checked.includes(measurement.id!)) return true;
        return false;
    }, [checked, measurement])

    return <tr onClick={() => onClick(measurement.id!)}
        className={['zenin__row_component', highlight ? 'highlight' : ''].join(' ')}>
        <td onClick={event => event.stopPropagation()}>
            <CheckboxInput onChange={() => onCheck(measurement.id)}
                checked={isChecked} name={`zenin__row_${measurement.id}`} />
        </td>
        <td><span className="zenin__id">{measurement.id}</span></td>
        <td>{formatDate(measurement.createdAt)}</td>
        <td>
            <span className="zenin__state" data-state={measurement.state}>{measurement.state}</span>
        </td>
    </tr >
}
