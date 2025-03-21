import { ACTIVE_UI, INACTIVE_UI } from "@/internal/monitor";

import EyeIcon from "../../../Icon/EyeIcon";

import "./ActiveWidget.css";

interface ActiveWidgetProps {
    active: boolean;
    onClick: () => void;
}

export default function ActiveWidget(props: ActiveWidgetProps) {
    const { active, onClick } = props;
    const attr = active ? ACTIVE_UI : INACTIVE_UI;

    return <div className="widget active_widget" onClick={onClick} data-active={attr}>
        <EyeIcon hide={active} />
    </div>
}
