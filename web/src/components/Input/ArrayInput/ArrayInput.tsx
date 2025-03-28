import Button from "../../Button/Button";
import AddIcon from "../../Icon/AddIcon";
import TextInput from "../TextInput/TextInput";

import "./ArrayInput.css";

interface ArrayInputProps {
    name: string
    label?: string | React.ReactNode;
    value: string[]
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
        const state = value.filter((_, i) => i !== index);
        onChange(state);
    };

    return <div className="array_input input_container">
        {label
            ? <label
                className="array_input_label input_label"
                htmlFor={name}
            >
                {label}
            </label>
            : null}

        {value.map((value, index) => <div className="array_input_row" key={index}>
            <TextInput
                name={name}
                value={value}
                onChange={value => handleInputChange(index, value ?? "")}
            />
            <div onDragOver={e => e.preventDefault()} className="array_input_delete">
                <Button
                    onClick={() => handleDelete(index)}
                    border={true}
                    kind="destructive"
                >
                    <span className="array_input_delete_icon">
                        <AddIcon />
                    </span>
                </Button>
            </div>
        </div>
        )}

        <Button
            disabled={false}
            border={true}
            onClick={() => onChange([...value, ''])}
        >
            Add Row
        </Button>
    </div>
}
