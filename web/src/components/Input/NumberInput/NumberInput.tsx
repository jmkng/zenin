import { ChangeEvent } from "react";

import "./NumberInput.css";

interface NumberProps {
    name: string;
    value: number | null;
    label?: string | React.ReactNode;
    subtext?: string | React.ReactNode;
    
    onChange: (value: number | null) => void;
}

export default function NumberInput(props: NumberProps) {
    const { name, value, onChange, label, subtext } = props;

    return <div className="number_input input_container h_f-col">
        {label ? (
            <label className="number_input_label input_label" htmlFor={name}>
                {label}
            </label>
        )
            : null
        }
        {subtext ?
            <p className="number_input_subtext input_subtext">
                {subtext}
            </p>
            : null
        }
        <input
            className="number_input_box input"
            type="number"
            onChange={(event: ChangeEvent<HTMLInputElement>) => event.target.value == "" ? onChange(null) : onChange(Number(event.target.value))}
            name={name}
            id={name}
            value={value == null ? "" : value}
        />
    </div>
}
