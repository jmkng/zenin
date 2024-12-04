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

    return <div className="zenin__text_area_input zenin__input_container zenin__h_stack_vertical">
        {label ?
            <label
                className="zenin__text_area_input_label zenin__input_label"
                htmlFor={name}
            >
                {label}
            </label>
            : null}

        {subtext ?
            <p className="zenin__text_area_input_subtext zenin__input_subtext">
                {subtext}
            </p>
            : null}

        <textarea
            className="zenin__text_area_input_box zenin__input"
            onChange={((event: ChangeEvent<HTMLTextAreaElement>) => event.target.value == "" ? onChange(null) : onChange(event.target.value))}
            name={name}
            placeholder={placeholder}
            id={name}
            value={value == null ? "" : value}
        />
    </div>
}
