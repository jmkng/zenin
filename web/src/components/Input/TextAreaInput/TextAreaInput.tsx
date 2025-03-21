import { ChangeEvent } from "react";

import "./TextAreaInput.css";

interface TextAreaProps {
    name: string;
    value: string | null;
    label?: string | React.ReactNode;
    subtext?: string | React.ReactNode;
    placeholder?: string;

    onChange: (value: string | null) => void;
}

export default function TextAreaInput(props: TextAreaProps) {
    const {
        name,
        value = props.value,
        onChange,
        label,
        subtext,
        placeholder
    } = props;

    return <div className="text_area_input input_container h_f-col">
        {label ?
            <label
                className="text_area_input_label input_label"
                htmlFor={name}
            >
                {label}
            </label>
            : null}

        {subtext ?
            <p className="text_area_input_subtext input_subtext">
                {subtext}
            </p>
            : null}

        <textarea
            className="text_area_input_box input"
            onChange={((event: ChangeEvent<HTMLTextAreaElement>) => event.target.value == "" ? onChange(null) : onChange(event.target.value))}
            name={name}
            placeholder={placeholder}
            id={name}
            value={value == null ? "" : value}
        />
    </div>
}
