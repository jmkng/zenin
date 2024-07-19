import TextInput from "../TextInput/TextInput";
import "./ArrayInput.css";

interface ArrayProps {
    name: string;
    value: string[] | null;
    label?: string | React.ReactNode;
    subtext?: string | React.ReactNode;
    placeholder?: string;

    onChange: (index: number, value: string | null) => void;
}

export default function ArrayInput(props: ArrayProps) {
    const {
        name,
        value = props.value,
        label,
        subtext,
        onChange,
    } = props;

    return (
        <div className="zenin__array_input zenin__input_container zenin__h_stack_vertical">
            {label ?
                <label
                    className="zenin__array_input_label zenin__input_label"
                    htmlFor={name}
                >
                    {label}
                </label>
                : null}

            {subtext ?
                <p className="zenin__array_input_subtext zenin__input_subtext">
                    {subtext}
                </p>
                : null}

            {
                value && value.length > 0 ?
                    value.map((n, i) => <div className="zenin__detail_spaced" key={i}>
                        <TextInput
                            name={`zenin__array_input_argument_${i}`}
                            value={n}
                            onChange={(value: string | null) => onChange(i, value)}
                        />
                    </div>)
                    : <p>empty</p>
            }
        </div>
    )
}
