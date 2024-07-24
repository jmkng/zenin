import { ACTIVE_UI, INACTIVE_UI, isMonitor, Monitor, useMonitorContext } from '../../internal/monitor'
import { useDefaultMonitorService } from '../../internal/monitor/service';
import { useAccountContext } from '../../internal/account';
import { DataPacket } from '../../server';

import MonitorComponent from '../../components/Monitor/Monitor';
import EditorComponent from '../../components/Editor/Editor';
import InfoComponent from '../../components/Info/Info';

import './Dashboard.css'

export default function Dashboard() {
    const monitor = {
        context: useMonitorContext(),
        service: useDefaultMonitorService()
    }
    const account = useAccountContext();
    const sorted = getVisible(monitor.context.state.monitors, monitor.context.state.filter).sort((a, b) => a.name > b.name ? 1 : -1);
    const split = monitor.context.state.split.isEditing() || monitor.context.state.split.isViewing();

    const handleAdd = async (value: Monitor) => {
        const token = account.state.authenticated!.token.raw;
        const extract = await monitor.service.add(token, value);
        if (!extract.ok()) return;
        const body: DataPacket<{ id: number }> = await extract.json();
        const measurements = null;
        const full: Monitor = { ...value, id: body.data.id, measurements: measurements }
        monitor.context.dispatch({ type: 'overwrite', monitor: full })
    }

    const handleUpdate = async (value: Monitor) => {
        if (!value.id) {
            throw new Error("monitor is missing id in dashboard update");
        }
        const token = account.state.authenticated!.token.raw;
        const extract = await monitor.service.update(token, value.id, value);
        if (!extract.ok()) return;
        monitor.context.dispatch({ type: 'overwrite', monitor: value })
    }

    return (
        <div className={["zenin__dashboard", split ? 'split' : ''].join(' ')}>
            <div className="zenin__dashboard_monitors">
                {sorted.map((n, i) =>
                    <MonitorComponent key={i} monitor={n} service={monitor.service} />)}
            </div>

            {split ?
                <div className={"zenin__dashboard_activity"}>
                    {monitor.context.state.split.isEditing() ?
                        <EditorComponent
                            state={monitor.context.state.split.pane}
                            onClose={() => monitor.context.dispatch({ type: 'edit', monitor: null })}
                            onChange={value => isMonitor(value) ? handleUpdate(value) : handleAdd(value)}
                            onDelete={value => monitor.context.dispatch({ type: 'delete', monitors: [value] })} />
                        : null}

                    {monitor.context.state.split.isViewing() ?
                        <InfoComponent
                            state={monitor.context.state.split.pane} />
                        : null}
                </div>
                : null}
        </div>
    )
}

const getVisible = (monitors: Map<number, Monitor>, filter: string): Monitor[] => {
    let filtered = [...monitors.values()];
    if (filter == ACTIVE_UI) filtered = filtered.filter(n => n.active)
    else if (filter == INACTIVE_UI) filtered = filtered.filter(n => !n.active)
    return filtered;
}