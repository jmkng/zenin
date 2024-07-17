import SelectIcon from '../../Icon/SelectIcon/SelectIcon';

import './SelectInput.css';

interface SelectProps {
    name: string
    label?: string | React.ReactNode;
    value: string;
    subtext?: string | React.ReactNode
    options: SelectGroup[] | SelectOption[]

    onChange: (value: string) => void
}

interface SelectGroup {
    label: string,
    options: SelectOption[]
}

interface SelectOption {
    text: string;
    value?: string;
}

export default function SelectInput(props: SelectProps) {
    const { name, options, onChange, value, subtext, label } = props;
    return (
        <div
            className={["zenin__select", "zenin__input_container", "zenin__h_stack_vertical"].join(' ')}
        >
            {label ?
                <label
                    className="zenin__text_input_label zenin__input_label"
                    htmlFor={name}>
                    {label}
                </label>
                : null}

            {subtext ?
                <p className="zenin__select_input_subtext zenin__input_subtext">
                    {subtext}
                </p>
                : null}

            <div className="zenin__select_input_controls_container">
                <select
                    className="zenin__input zenin__select_input_box"
                    name={name}
                    id={name}
                    value={value}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
                >
                    {options.every(isGroup) ?
                        options.map((n, i) =>
                            <optgroup key={i} label={n.label}>
                                {n.options.map((m, o) => <option key={o} value={m.value}>{m.text}</option>)}
                            </optgroup>
                        )
                        :
                        options.map((n, i) => <option key={i} value={n.value}>{n.text}</option>)
                    }
                </select>

                <div className="zenin__select_input_icon_container">
                    <SelectIcon />
                </div>
            </div >
        </div >
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isGroup(obj: any): obj is SelectGroup {
    return obj && typeof obj.label === 'string' && Array.isArray(obj.options) && obj.options.every(isOption);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isOption(obj: any): obj is SelectOption {
    return obj && typeof obj.text === 'string' && typeof obj.value === 'string';
}
