import { useMemo } from 'react';
import { formatDate } from '../../../../internal/layout/graphics';
import { Measurement } from '../../../../internal/monitor';

import CheckboxInput from '../../../Input/CheckboxInput/CheckboxInput';

import './Row.css'

interface RowProps {
    row: Measurement,
    checked: number[]
    onCheck: (id: number) => void;
}

export default function Row(props: RowProps) {
    const { row, onCheck, checked } = props;
    const isChecked = useMemo(() => {
        if (checked.includes(row.id!)) return true;
        return false;
    }, [checked, row])

    const handleCheck = () => {
        onCheck(row.id!);
    }

    return (
        <tr className='zenin__row_component'>
            <td>
                <CheckboxInput onChange={handleCheck} checked={isChecked} name={`zenin__row_${row.id}`} />
            </td>
            <td>
                {formatDate(row.recordedAt)}
            </td>
            <td>
                <span className="zenin__state" data-state={row.state}>{row.state}</span>
            </td>
        </tr>
    )

}
