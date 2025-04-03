import { ChangeEvent } from "react";

import "./TextInput.css";

interface TextProps {
    name: string;
    value: string | null;
    label?: string | React.ReactNode;
    type?: "text" | "password";
    subtext?: string | React.ReactNode;
    placeholder?: string;

    onChange: (value: string | null) => void;
}

export default function TextInput(props: TextProps) {
    const { name, value = props.value, onChange, type, label, subtext, placeholder } = props;

    return <div className="text_input input_container h_f-col">
        {label ?
            <label
                className="text_input_label input_label"
                htmlFor={name}
            >
                {label}
            </label>
            : null}

        {subtext ?
            <p className="text_input_subtext input_subtext">
                {subtext}
            </p>
            : null}

        <input
            className="text_input_box input"
            type={type || "text"}
            onChange={((event: ChangeEvent<HTMLInputElement>) => event.target.value == "" ? onChange(null) : onChange(event.target.value))}
            name={name}
            placeholder={placeholder}
            id={name}
            value={value == null ? "" : value}
        />
    </div>
}
