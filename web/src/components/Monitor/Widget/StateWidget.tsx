import { DEAD_API, OK_API, WARN_API } from "../../../server";

import YesIcon from "../../Icon/YesIcon/YesIcon";
import WarnIcon from "../../Icon/WarnIcon/WarnIcon";
import NoIcon from "../../Icon/NoIcon/NoIcon";

import "./StateWidget.css";

interface StateWidgetProps {
    state: string;
}

export default function StateWidget(props: StateWidgetProps) {
    const { state } = props;

    const icon = state === OK_API ? <YesIcon /> : state === WARN_API ? <WarnIcon /> : state === DEAD_API ? <NoIcon /> : null

    return (
        <div className="zenin__widget zenin__h_center zenin__state_widget" data-state={state}>
            {icon}
        </div >
    )
}
