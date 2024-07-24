import "./List.css";
import InfoIcon from "../../Icon/InfoIcon/InfoIcon";

interface ListProps {
    title: string;
    data: Map<string, string> | Array<string>
}

export default function ListComponent(props: ListProps) {
    const { title, data } = props;
    return (
        <div className="zenin__list_component">
            <div className="zenin__list_intro">
                <span className="zenin__list_intro_title">{title}</span>
                <div className="zenin__list_intro_help_button">
                    <InfoIcon />
                </div>
            </div>
            <div className="zenin__list_body">
                {Array.isArray(data) ?
                    data.map((text, index) =>
                        <div key={index} className="zenin__list_body_pair">
                            <span className="zenin__list_body_value">{text}</span>
                        </div>)
                    :
                    Array.from(data).map(([key, value], index) => <div key={index} className="zenin__list_body_pair">
                        <span className="zenin__list_body_key">{key}</span>
                        <span className="zenin__list_body_value">{value}</span>
                    </div>)}
            </div>
        </div>
    )
}
