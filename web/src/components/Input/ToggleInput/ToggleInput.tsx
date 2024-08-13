import React from 'react';
import "./ToggleInput.css";

interface ToggleProps {
    name: string;
    value: boolean;
    label?: string | React.ReactNode;

    onChange: (checked: boolean) => void;
}

export default function ToggleInput(props: ToggleProps) {
    const { name, label, value, onChange } = props;

    return (
        <div className="zenin__toggle_input">
            {label ? (
                <label
                    className="zenin__toggle_input_label zenin__input_label"
                    htmlFor={name}
                >
                    {label}
                </label>
            ) : null}
            <div className="zenin__toggle_input_slider_wrapper">
                <input
                    type="checkbox"
                    id={name}
                    checked={value}
                    onChange={() => onChange(!value)}
                />
                <span
                    className="zenin__toggle_input_slider"
                    onClick={() => onChange(!value)}
                />
            </div>
        </div>
    );
}
