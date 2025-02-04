import { PairListValue } from "../../../../internal/monitor";
import Button from "../../Button/Button";
import AddIcon from "../../Icon/AddIcon";
import TextInput from "../TextInput/TextInput";

import "./PairListInput.css";

interface PairListInputProps {
    name: string
    label?: string | React.ReactNode;
    value: PairListValue;
    allowMultipleRows?: boolean;
    onChange: (value: PairListValue) => void;
}

export default function PairListInput(props: PairListInputProps) {
    const { name, label, value, allowMultipleRows = true, onChange } = props;

    const handleUpdate = (index: number, kind: "key" | "value", updated: string) => {
        const state = [...value];
        const array = state[index];
        if (kind == "key") array.key = updated;
        else array.value = updated;
        onChange(state);
    };

    const handleDelete = (index: number) => {
        if (!allowMultipleRows) return;
        const state = value.filter((_, i) => i !== index);
        onChange(state);
    };

    return <div className="zenin__pair_list_input zenin__input_container">
        {label
            ? <label
                className="zenin__pair_list_input_label zenin__input_label"
                htmlFor={name}
            >
                {label}
            </label>
            : null}

        {value.map(({ key, value }, index) => <div className="zenin__pair_list_row" key={index}>
            <div className="zenin__pair_list_key_input">
                <TextInput
                    name={name}
                    value={key}
                    onChange={value => handleUpdate(index, "key", value ?? "")}
                />
            </div>
            <div className="zenin__pair_list_value_input">
                <TextInput
                    name={name}
                    value={value}
                    onChange={value => handleUpdate(index, "value", value ?? "")}
                />
            </div>
            {allowMultipleRows
                ? <div className="zenin__pair_list_input_delete">
                    <Button
                        onClick={() => handleDelete(index)}
                        border={true}
                        kind="destructive"
                    >
                        <span className="zenin__pair_list_input_delete_icon">
                            <AddIcon />
                        </span>
                    </Button>
                </div>
                : null}
        </div>
        )}

        {allowMultipleRows
            ? <Button
                disabled={false}
                border={true}
                onClick={() => onChange([...value, { key: "", value: "" }])}
            >
                Add Row
            </Button>
            : null}
    </div>
}

