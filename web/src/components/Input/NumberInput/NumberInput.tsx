import { ChangeEvent } from "react";

import "./NumberInput.css";

interface NumberProps {
    name: string;
    value: number | null;
    onChange: (value: number | null) => void;

    label?: string | React.ReactNode;
    subtext?: string | React.ReactNode;
}

export default function NumberInput(props: NumberProps) {
    const { name, value, onChange, label, subtext } = props;
    return (
        <div className="zenin__number_input zenin__input_container zenin__h_f-col">
            {label ? (
                <label className="zenin__number_input_label zenin__input_label" htmlFor={name}>
                    {label}
                </label>
            )
                : null
            }
            {subtext ?
                <p className="zenin__number_input_subtext zenin__input_subtext">
                    {subtext}
                </p>
                : null
            }
            <input
                className="zenin__number_input_box zenin__input"
                type="number"
                onChange={(event: ChangeEvent<HTMLInputElement>) => event.target.value == "" ? onChange(null) : onChange(Number(event.target.value))}
                name={name}
                id={name}
                value={value == null ? "" : value}
            />
        </div>
    );
}
