import { useAccountContext } from "../../internal/account";
import { useMonitorContext } from "../../internal/monitor";
import { useDefaultMonitorService } from "../../internal/monitor/service";
import { DataPacket } from "../../server";

import Button from "../Button/Button";
import AddIcon from "../Icon/AddIcon";
import PauseIcon from "../Icon/PauseIcon";
import PlayIcon from "../Icon/PlayIcon";
import TrashIcon from "../Icon/TrashIcon";
import YesIcon from "../Icon/YesIcon";

import "./SelectMenu.css";

export default function SelectMenu() {
    const monitor = {
        context: useMonitorContext(),
        service: useDefaultMonitorService()
    }
    const account = useAccountContext();

    const handleToggle = async (active: boolean) => {
        const monitors = [...monitor.context.state.selected.map(n => n.id!)];
        const token = account.state.authenticated!.token.raw;
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
                    tooltip={{ text: "Select All" }}
                    onClick={() => monitor.context.dispatch({ 'type': 'select', monitor: "ALL" })}
                >
                    <YesIcon />
                </Button>
            </div>
            <div className="zenin__menu_margin_right">
                <Button
                    tooltip={{ text: "Clear Selection" }}
                    onClick={() => monitor.context.dispatch({ type: 'select', monitor: 'NONE' })}
                >
                    <div className="zenin__deselect_all_control">
                        <AddIcon />
                    </div>
                </Button>
            </div>
            {monitor.context.state.selected.length > 0
                ? <span className="zenin__select_menu_count">{monitor.context.state.selected.length} Selected</span>
                : null}
        </div>

        <div className="zenin__menu_right">
            <div className="zenin__menu_margin_right">
                <Button
                    disabled={!monitor.context.state.selected.some(n => !n.active)}
                    tooltip={{ text: "Resume Selected" }} onClick={() => handleToggle(true)}
                >
                    <PlayIcon />
                </Button>
            </div>
            <div className="zenin__menu_margin_right">
                <Button
                    disabled={!monitor.context.state.selected.some(n => n.active)}
                    tooltip={{ text: "Pause Selected" }} onClick={() => handleToggle(false)}
                >
                    <PauseIcon />
                </Button>
            </div>
            <div onClick={(event) => event.stopPropagation()}>
                <Button tooltip={{ text: "Delete Selected" }} onClick={() => handleDelete()}>
                    <TrashIcon />
                </Button>
            </div>
        </div>
    </div>
}
