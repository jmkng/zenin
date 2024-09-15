import { useAccountContext } from "../../internal/account";
import { useMonitorContext } from "../../internal/monitor";
import { useDefaultMonitorService } from "../../internal/monitor/service";
import { DataPacket } from "../../server";

import Button from "../Button/Button";
import PauseIcon from "../Icon/PauseIcon";
import PlayIcon from "../Icon/PlayIcon";
import TrashIcon from "../Icon/TrashIcon";

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

    return <div className="zenin__menu_monitor_bulk_container">
        <div className="zenin__menu_margin">
            <Button
                disabled={!monitor.context.state.selected.some(n => !n.active)}
                tooltip={{ text: "Resume Selected" }} onClick={() => handleToggle(true)}
            >
                <PlayIcon />
            </Button>
        </div>
        <div className="zenin__menu_margin">
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
}