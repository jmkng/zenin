import EyeIcon from "../../../Icon/EyeIcon";

import "./InactiveWidget.css";

interface InactiveWidgetProps {
    active: boolean;
    onClick: () => void;
}

export default function InactiveWidget(props: InactiveWidgetProps) {
    const { active, onClick } = props;

    return <div className="widget inactive_widget" onClick={onClick} data-active={active}>
        <EyeIcon hide={active} />
    </div>
}
