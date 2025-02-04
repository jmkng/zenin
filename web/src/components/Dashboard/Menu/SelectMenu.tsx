import { useAccountContext } from "@/internal/account";
import { useDefaultMonitorService, useMonitorContext } from "@/internal/monitor";
import { DataPacket } from "@/internal/server";

import Button from "../../Button/Button";
import DeselectIcon from "../../Icon/DeselectIcon";
import PauseIcon from "../../Icon/PauseIcon";
import PlayIcon from "../../Icon/PlayIcon";
import SelectIcon from "../../Icon/SelectIcon";
import TrashIcon from "../../Icon/TrashIcon";

import "./SelectMenu.css";

export default function SelectMenu() {
    const monitor = {
        context: useMonitorContext(),
        service: useDefaultMonitorService()
    }
    const account = useAccountContext();

    const handleToggle = async (active: boolean) => {
        const monitors = [...monitor.context.state.selected.map(n => n.id!)];
        const token = account.state.token!.raw;
        const extract = await monitor.service.toggleMonitor(token, monitors, active);
        if (!extract.ok()) return;

        const body: DataPacket<{ time: string }> = await extract.json();
        monitor.context.dispatch({ type: 'toggle', monitors, active, time: body.data.time });
    }

    const handleDelete = () => {
        const monitors = monitor.context.state.selected;
        monitor.context.dispatch({ type: 'delete', monitors });
    }

    return <div className="zenin__select_menu zenin__menu">
        <div className="zenin__menu_left">
            <div className="zenin__menu_margin_right">
                <Button
                    tooltip="Select All"
                    onClick={() => monitor.context.dispatch({ 'type': 'select', monitor: "ALL" })}
                    icon={<SelectIcon />}
                />
            </div>
            <div className="zenin__menu_margin_right">
                <Button
                    tooltip = "Clear Selection"
                    onClick={() => monitor.context.dispatch({ type: 'select', monitor: 'NONE' })}
                    icon={<DeselectIcon />}
                />
            </div>
            {monitor.context.state.selected.length > 0
                ? <span className="zenin__select_menu_count">{monitor.context.state.selected.length} Selected</span>
                : null}
        </div>

        <div className="zenin__menu_right">
            <div className="zenin__menu_margin_right">
                <Button
                    tooltip="Resume Selected"
                    disabled={!monitor.context.state.selected.some(n => !n.active)}
                    icon={<PlayIcon />}
                    onClick={() => handleToggle(true)}
                    />
            </div>
            <div className="zenin__menu_margin_right">
                <Button
                    tooltip="Pause Selected"
                    disabled={!monitor.context.state.selected.some(n => n.active)}
                    icon={<PauseIcon />}
                    onClick={() => handleToggle(false)}
                />
            </div>
            <div onClick={(event) => event.stopPropagation()}>
                <Button
                    tooltip="Delete Selected"
                    icon={<TrashIcon />}
                    onClick={handleDelete}
                />
            </div>
        </div>
    </div>
}
