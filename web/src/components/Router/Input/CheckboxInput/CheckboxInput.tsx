import './CheckboxInput.css';

interface CheckboxProps {
    name: string;
    checked: boolean;
    onChange: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export default function CheckboxInput(props: CheckboxProps) {
    const { name, checked, onChange } = props;

    return (
        <button
            name={name}
            className={["zenin__checkbox_input zenin__input_container", checked ? 'checked' : ''].join(' ')}
            onClick={e => onChange(e)}
            role='checkbox'
        />
    );
}
