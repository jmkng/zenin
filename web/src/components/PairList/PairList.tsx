import { PairListValue } from "../../internal/monitor";

import "./PairList.css";

interface PairListProps {
    value: PairListValue
    label?: string
}

export default function PairList(props: PairListProps) {
    const { value, label } = props;

    return <div className="zenin__pair_list">
        {label
            ? <label className="zenin__pair_list_input_label zenin__input_label">
                {label}
            </label>
            : null}

        {value.map(({ key, value }, index) => <div className="zenin__pair_list_row" key={index}>
            <div className="zenin__pair_list_key">
                {key}
            </div>
            <div className="zenin__pair_list_value">
                {value}
            </div>
        </div>
        )}
    </div>
}