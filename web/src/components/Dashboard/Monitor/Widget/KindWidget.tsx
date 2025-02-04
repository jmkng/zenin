import { HTTP_UI, ICMP_UI, TCP_UI, PLUGIN_UI } from "@/internal/monitor";
import { HTTP_API, ICMP_API, TCP_API, PLUGIN_API } from "@/internal/server";

import "./KindWidget.css";

interface KindWidgetProps {
    kind: string;
}

export default function KindWidget(props: KindWidgetProps) {
    const { kind } = props;

    let text;
    switch (kind) {
        case HTTP_API:
            text = HTTP_UI;
            break;
        case ICMP_API:
            text = ICMP_UI;
            break;
        case TCP_API:
            text = TCP_UI;
            break;
        case PLUGIN_API:
            text = PLUGIN_UI;
            break;
        default:
            text = "";
            break;
    }

    return <div className="zenin__widget zenin__h_center zenin__kind_widget">
        {text}
    </div >
}
