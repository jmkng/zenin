import { useMonitorContext } from "@/hooks/useMonitor";

import Button from "../../Button/Button";
import DeselectIcon from "../../Icon/DeselectIcon";
import PauseIcon from "../../Icon/PauseIcon";
import PlayIcon from "../../Icon/PlayIcon";
import SelectIcon from "../../Icon/SelectIcon";
import TrashIcon from "../../Icon/TrashIcon";

import "./SelectMenu.css";

interface SelectProps {
    onToggle: (active: boolean, id: number[]) => void;
}

export default function SelectMenu(props: SelectProps) {
    const { onToggle } = props;

    const monitorContext= useMonitorContext();

    return <div className="select_menu menu">
        <div className="menu_left">
            <div className="menu_margin_right">
                <Button
                    tooltip="Select All"
                    onClick={() => monitorContext.dispatch({ 'type': 'select', monitor: "ALL" })}
                    icon={<SelectIcon />}
                />
            </div>
            <div className="menu_margin_right">
                <Button
                    tooltip = "Clear Selection"
                    onClick={() => monitorContext.dispatch({ type: 'select', monitor: 'NONE' })}
                    icon={<DeselectIcon />}
                />
            </div>
            {monitorContext.state.selected.length > 0
                ? <span className="select_menu_count">{monitorContext.state.selected.length} Selected</span>
                : null}
        </div>

        <div className="menu_right">
            <div className="menu_margin_right">
                <Button
                    tooltip="Resume Selected"
                    disabled={!monitorContext.state.selected.some(n => !n.active)}
                    icon={<PlayIcon />}
                    onClick={() => onToggle(true, monitorContext.state.selected.map(n => n.id))}
                    />
            </div>
            <div className="menu_margin_right">
                <Button
                    tooltip="Pause Selected"
                    disabled={!monitorContext.state.selected.some(n => n.active)}
                    icon={<PauseIcon />}
                    onClick={() => onToggle(false, monitorContext.state.selected.map(n => n.id))}
                />
            </div>
            <div onClick={(event) => event.stopPropagation()}>
                <Button
                    tooltip="Delete Selected"
                    icon={<TrashIcon />}
                    onClick={() =>  monitorContext.dispatch({ type: 'queue', monitors: monitorContext.state.selected })}
                />
            </div>
        </div>
    </div>
}
