import './RadioInput.css'

interface RadioProps {
    name: string;
    options: RadioOptions[]
}

interface RadioOptions {
    text: string;
    onSelect?: () => void;
    defaultChecked?: boolean;
}

export default function RadioInput(props: RadioProps) {
    const { name, options } = props;

    return (
        <div className='zenin__radio_input zenin__input_container'>
            {options.map((n, index) =>
                <div key={index} className='zenin__radio_list_container'>
                    <input
                        className="zenin__radio_input_element"
                        type="radio"
                        name={name}
                        onClick={n.onSelect}
                        defaultChecked={n.defaultChecked}
                        id={`${name}_${index}`}
                    />
                    <label className="zenin__radio_input_label" htmlFor={`${name}_${index}`}>
                        {n.text}
                    </label>
                </div>
            )}
        </div>
    )
}
