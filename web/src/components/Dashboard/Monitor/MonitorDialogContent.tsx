import { Monitor, useMonitorContext } from "@/internal/monitor"
import { useDefaultMonitorService } from "@/hooks/useMonitorService"

import Button from "../../Button/Button"
import DatabaseIcon from "../../Icon/DatabaseIcon"
import EditIcon from "../../Icon/EditIcon"
import InfoIcon from "../../Icon/InfoIcon"
import PauseIcon from "../../Icon/PauseIcon"
import PlayIcon from "../../Icon/PlayIcon"
import TrashIcon from "../../Icon/TrashIcon"

interface MonitorDialogContentProps {
    monitor: Monitor

    onToggle: (active: boolean, id: number[]) => void;
    onPoll: (id: number) => void;
}

export default function MonitorDialogContent(props: MonitorDialogContentProps) {
    const { onToggle, onPoll } = props;
    const monitor = {
        data: props.monitor,
        context: useMonitorContext(),
        service: useDefaultMonitorService()
    }

    const handleView = () => {
        monitor.context.dispatch({
            type: 'pane',
            pane: { type: 'view', target: { monitor: monitor.data, measurement: null } }
        })
    }

    return <div className="monitor_dialog_content dialog_content">
        <div className="dialog_section">
            <Button
                icon={<InfoIcon />}
                onClick={handleView}
            >
                Info
            </Button>
            <Button
                onClick={() => onToggle(!monitor.data.active, [monitor.data.id])}
                icon={monitor.data.active ? <PauseIcon /> : <PlayIcon />}
            >
                {monitor.data.active ? "Pause" : "Resume"}
            </Button>
            <Button
                icon={<DatabaseIcon />}
                onClick={() => onPoll(monitor.data.id)}
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
        <div className="dialog_section">
            <Button
                kind="destructive"
                icon={<TrashIcon />}
                onClick={() => monitor.context.dispatch({ type: 'queue', monitors: [monitor.data] })}
            >
                Delete
            </Button>
        </div>
    </div>
}
