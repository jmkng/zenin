import EyeIcon from "../../../Icon/EyeIcon";

import "./InactiveWidget.css";

interface InactiveWidgetProps {
    active: boolean;
}

export default function InactiveWidget(props: InactiveWidgetProps) {
    const { active } = props;

    return <div className="widget inactive_widget" data-active={active}>
        <EyeIcon hide={active} />
    </div>
}
