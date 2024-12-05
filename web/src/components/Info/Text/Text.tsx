import "./Text.css";

interface TextProps {
    title: string,
    text: string
}

export default function Text(props: TextProps) {
    const { title, text } = props;

    return <div className="zenin__text_component">
        <div className="zenin__text_title">{title}</div>
        <div className="zenin__text_content">
            <div className="zenin__text_scroller">{text}</div>
        </div>
    </div>
}
