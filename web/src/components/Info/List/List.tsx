import { useRef, useState } from "react";
import "./List.css";
import InfoIcon from "../../Icon/InfoIcon/InfoIcon";

interface ListProps {
    title: string;
    help: string;
    data: Map<string, string>
}

export default function ListComponent(props: ListProps) {
    const { title, help, data } = props;
    const [viewingHelp, setViewingHelp] = useState<boolean>(false);
    const timer = useRef<number | null>();

    const handleViewHelpToggle = () => [
        setViewingHelp(prev => !prev)
    ]

    const handleMouseOut = () => {
        const id = setTimeout(() => setViewingHelp(false), 3000)
        timer.current = id;
    }

    const handleMouseEnter = () => {
        const id = timer.current;
        if (!id) return;
        clearTimeout(id);
        timer.current = null;
    }

    const intro = <div className="zenin__list_intro">
        <span className="zenin__list_intro_title">{title}</span>
        <div className="zenin__list_intro_help_button" onClick={handleViewHelpToggle} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseOut}>
            <InfoIcon />
        </div>
    </div >

    return (
        <div className="zenin__list_component">
            {intro}
            {viewingHelp ?
                <div className="zenin__list_intro_help">
                    {help}
                </div>
                :
                <div className="zenin__list_body">
                    {Array.from(data).map(([key, value], index) => <div key={index} className="zenin__list_body_pair">
                        <span className="zenin__list_body_key">{key}</span>
                        <span className="zenin__list_body_value">{value}</span>
                    </div>)}
                </div>
            }
        </div>
    )
}
