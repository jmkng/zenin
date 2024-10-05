import Button from "../../Button/Button";
import AddIcon from "../../Icon/AddIcon";
import TextInput from "../TextInput/TextInput";

import "./ArrayInput.css";

interface ArrayInputProps {
    name: string
    value: string[]
    label?: string | React.ReactNode;
    onChange: (value: string[]) => void
}

export default function ArrayInput(props: ArrayInputProps) {
    const { name, value, label, onChange } = props;

    const handleInputChange = (index: number, updated: string) => {
        const state = [...value];
        state[index] = updated;
        onChange(state);
    };

    const handleDelete = (index: number) => {
        const newValue = value.filter((_, i) => i !== index);
        onChange(newValue);
    };

    return <div className="zenin__array_input zenin__input_container">
        {label
            ? <label
                className="zenin__array_input_label zenin__input_label"
                htmlFor={name}
            >
                {label}
            </label>
            : null}
        {value.map((value, index) => <div className="zenin__array_input_row" key={index}>
            <TextInput
                name={name}
                value={value}
                onChange={value => handleInputChange(index, value ?? "")}
            />
            <div onDragOver={e => e.preventDefault()} className="zenin__array_input_delete">
                <Button
                    onClick={() => handleDelete(index)}
                    border={true}
                    kind="destructive"
                >
                    <span className="zenin__array_input_delete_icon">
                        <AddIcon />
                    </span>
                </Button>
            </div>
        </div>
        )}
        <Button
            disabled={value[value.length - 1].trim() == ""}
            border={true}
            onClick={() => onChange([...value, ''])}
        >
            Add Row
        </Button>
    </div>
}