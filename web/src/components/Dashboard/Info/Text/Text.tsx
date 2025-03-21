import "./Text.css";

interface TextProps {
    title: string,
    text: string
}

export default function Text(props: TextProps) {
    const { title, text } = props;

    return <div className="text_component">
        <div className="text_title">{title}</div>
        <div className="text_content">
            <div className="text_scroller">{text}</div>
        </div>
    </div>
}
