import { useAccountContext } from "../../internal/account";
import { Monitor, useDefaultMonitorService, useMonitorContext } from "../../internal/monitor";
import { DataPacket } from "../../server";

import Button from "../Button/Button";
import DatabaseIcon from "../Icon/DatabaseIcon";
import EditIcon from "../Icon/EditIcon";
import InfoIcon from "../Icon/InfoIcon";
import TrashIcon from "../Icon/TrashIcon";

interface MonitorDialogContentProps {
    monitor: Monitor
}

export default function MonitorDialogContent(props: MonitorDialogContentProps) {
    const monitor = {
        data: props.monitor,
        context: useMonitorContext(),
        service: useDefaultMonitorService()
    }
    const account = useAccountContext()

    const handleView = () => {
        monitor.context.dispatch({
            type: 'pane',
            pane: { type: 'view', target: { monitor: monitor.data, measurement: null } }
        })
    }

    const handleToggle = async () => {
        const active = !monitor.data.active;
        const monitors = [monitor.data.id!];
        const token = account.state.authenticated!.token.raw;
        const extract = await monitor.service.toggleMonitor(token, monitors, active);
        if (!extract.ok()) return;
        const body: DataPacket<{ time: string }> = await extract.json();
        monitor.context.dispatch({ type: 'toggle', monitors, active, time: body.data.time });
    }


    return <div className="zenin__monitor_dialog_content zenin__dialog_content">
        <div className="zenin__dialog_section">
            <Button
                icon={<InfoIcon />}
                onClick={handleView}
            >
                Info
            </Button>
            <Button
                icon={<DatabaseIcon />}
                onClick={handleToggle}
            >
                Poll
            </Button>
            <Button
                icon={<EditIcon />}
                onClick={() => monitor.context.dispatch({ type: 'pane', pane: { type: 'editor', monitor: monitor.data } })}
            >
                Edit
            </Button>
        </div>
        <div className="zenin__dialog_section">
            <Button
                kind="destructive"
                icon={<TrashIcon />}
                onClick={() => monitor.context.dispatch({ type: 'delete', monitors: [monitor.data] })}
            >
                Delete
            </Button>
        </div>
    </div>
}
