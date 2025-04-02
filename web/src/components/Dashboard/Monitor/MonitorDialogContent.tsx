import { useMonitorContext } from "@/hooks/useMonitor"
import { Monitor } from "@/internal/monitor"

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
    const { monitor, onToggle, onPoll } = props;
    const monitorContext = useMonitorContext();

    const handleView = () => {
        monitorContext.dispatch({
            type: 'pane',
            pane: { type: 'view', target: { monitor, measurement: null } }
        })
    }

    return <div className="monitor_dialog_content dialog_content">
        <div className="dialog_section">
            <Button icon={<InfoIcon />} onClick={handleView}>
                Info
            </Button>
            <Button
                onClick={() => onToggle(!monitor.active, [monitor.id])}
                icon={monitor.active ? <PauseIcon /> : <PlayIcon />}
            >
                {monitor.active ? "Pause" : "Resume"}
            </Button>
            <Button
                icon={<DatabaseIcon />}
                onClick={() => onPoll(monitor.id)}
            >
                Poll
            </Button>
            <Button
                icon={<EditIcon />}
                onClick={() => monitorContext.dispatch({ type: 'pane', pane: { type: 'editor', monitor } })}
            >
                Edit
            </Button>
        </div>
        <div className="dialog_section">
            <Button
                kind="destructive"
                icon={<TrashIcon />}
                onClick={() => monitorContext.dispatch({ type: 'queue', monitors: [monitor] })}
            >
                Delete
            </Button>
        </div>
    </div>
}
