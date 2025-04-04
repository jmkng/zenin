import "./SliderInput.css";

interface SliderProps {
    name: string;
    value: number;
    subtext?: string;
    min?: number;
    max?: number;
    step?: number;
    label?: string | React.ReactNode;

    onChange: (value: number) => void;
}

export default function SliderInput(props: SliderProps) {
    const { name, value, subtext, min, max, step, label, onChange } = props;

    return <div className="slider_input input_container">
        {label ?
            <label
                className="slider_input_label input_label"
                htmlFor={name}
            >
                {label}
            </label>
            : null}

        <div className="slider_input_controls">
            <input
                className="slider_input_box"
                type="range"
                min={min || 0}
                max={max || 100}
                step={step}
                onChange={(event => onChange(Number(event.target.value)))}
                name={name}
                id={name}
                value={value}
            />
        </div>

        {subtext
            ? <span className="slider_input_subtext">{subtext}</span>
            : null}
    </div>
}
