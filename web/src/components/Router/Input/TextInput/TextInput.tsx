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
    const {
        name,
        value = props.value,
        onChange,
        type,
        label,
        subtext,
        placeholder
    } = props;

    return <div className="zenin__text_input zenin__input_container zenin__h_stack_vertical">
        {label ?
            <label
                className="zenin__text_input_label zenin__input_label"
                htmlFor={name}
            >
                {label}
            </label>
            : null}

        {subtext ?
            <p className="zenin__text_input_subtext zenin__input_subtext">
                {subtext}
            </p>
            : null}

        <input
            className="zenin__text_input_box zenin__input"
            type={type || "text"}
            onChange={((event: ChangeEvent<HTMLInputElement>) => event.target.value == "" ? onChange(null) : onChange(event.target.value))}
            name={name}
            placeholder={placeholder}
            id={name}
            value={value == null ? "" : value}
        />
    </div>
}
