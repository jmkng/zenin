import UpDownIcon from '../../Icon/UpDownIcon';

import './SelectInput.css';

interface SelectProps {
    name: string
    value: string;
    options: SelectGroup[] | SelectOption[]
    label?: string | React.ReactNode;
    subtext?: string | React.ReactNode
    placeholder?: string

    onChange: (value: string) => void
}

interface SelectGroup {
    label: string,
    options: SelectOption[]
}

interface SelectOption {
    text: string;
    value: string;
}

export default function SelectInput(props: SelectProps) {
    const { name, value, options, label, subtext, placeholder, onChange } = props;

    const list = options.length == 0
        ? <option value="" selected disabled>{placeholder || "Empty"}</option>
        : options.every(isGroup)
            ? options.map((n, i) =>
                <optgroup key={i} label={n.label}>
                    {n.options.map((m, o) => <option key={o} value={m.value}>{m.text}</option>)}
                </optgroup>)
            : options.map((n, i) => <option key={i} value={n.value}>{n.text}</option>)

    return <div className={["zenin__select", "zenin__input_container", "zenin__h_f-col"].join(' ')}>
        {label
            ? <label
                className="zenin__text_input_label zenin__input_label"
                htmlFor={name}
            >
                {label}
            </label>
            : null}

        {subtext
            ? <p className="zenin__select_input_subtext zenin__input_subtext">
                {subtext}
            </p>
            : null}

        <div className="zenin__select_input_controls_container">
            <select
                className="zenin__input zenin__select_input_box"
                name={name}
                id={name}
                disabled={options.length == 0 ? true : false}
                value={value || undefined}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
            >
                {list}
            </select>
            <div className="zenin__select_input_icon_container">
                <UpDownIcon />
            </div>
        </div>
    </div>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isGroup(obj: any): obj is SelectGroup {
    return obj && typeof obj.label === 'string' && Array.isArray(obj.options) && obj.options.every(isOption);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isOption(obj: any): obj is SelectOption {
    return obj && typeof obj.text === 'string' && typeof obj.value === 'string';
}
