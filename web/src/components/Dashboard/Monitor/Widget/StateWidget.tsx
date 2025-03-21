import { DEAD_API, OK_API, WARN_API } from "@/internal/server";

import NoIcon from "../../../Icon/NoIcon";
import WarnIcon from "../../../Icon/WarnIcon";
import YesIcon from "../../../Icon/YesIcon";

import "./StateWidget.css";

interface StateWidgetProps {
    state: string;
}

export default function StateWidget(props: StateWidgetProps) {
    const { state } = props;

    const icon =
        state === OK_API
            ? <YesIcon />
            : state === WARN_API
                ? <WarnIcon />
                : state === DEAD_API
                    ? <NoIcon />
                    : null

    return <div
            className="widget h_f-row-center state_widget"
            data-state={state}
        >
            {icon}
    </div >
}
