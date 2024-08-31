import { kindAPItoUI } from "../../../internal/monitor";

import "./KindWidget.css";

interface KindWidgetProps {
    kind: string;
}

export default function KindWidget(props: KindWidgetProps) {
    const { kind } = props;

    const text = kindAPItoUI(kind);

    return (
        <div className="zenin__widget zenin__h_center zenin__kind_widget">
            {text}
        </div >
    )
}
