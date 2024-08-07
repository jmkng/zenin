import { useAccountContext } from '../../internal/account';
import * as monitor from "../../internal/monitor";
import { ACTIVE_UI, INACTIVE_UI, isMonitor, useMonitorContext } from '../../internal/monitor';
import { useDefaultMonitorService } from '../../internal/monitor/service';
import { DataPacket } from '../../server';

import Editor from '../../components/Editor/Editor';
import Info from '../../components/Info/Info';
import Monitor from '../../components/Monitor/Monitor';

import './Dashboard.css';

export default function Dashboard() {
    const monitor = {
        context: useMonitorContext(),
        service: useDefaultMonitorService()
    }
    const account = useAccountContext();
    let sorted = [...monitor.context.state.monitors.values()];
    if (monitor.context.state.filter == ACTIVE_UI) sorted = sorted.filter(n => n.active)
    else if (monitor.context.state.filter == INACTIVE_UI) sorted = sorted.filter(n => !n.active)
    sorted.sort((a, b) => a.name > b.name ? 1 : -1);
    const split = monitor.context.state.split.isEditing() || monitor.context.state.split.isViewing();

    const handleAdd = async (value: monitor.Monitor) => {
        const token = account.state.authenticated!.token.raw;
        const extract = await monitor.service.addMonitor(token, value);
        if (!extract.ok()) return;
        const body: DataPacket<{ id: number }> = await extract.json();
        const measurements = null;
        const full: monitor.Monitor = { ...value, id: body.data.id, measurements: measurements }
        monitor.context.dispatch({ type: 'overwrite', monitor: full })
    }

    const handleUpdate = async (value: monitor.Monitor) => {
        if (!value.id) {
            throw new Error("monitor is missing id in dashboard update");
        }
        const token = account.state.authenticated!.token.raw;
        const extract = await monitor.service.updateMonitor(token, value.id, value);
        if (!extract.ok()) return;
        monitor.context.dispatch({ type: 'overwrite', monitor: value })
    }

    return (
        <div className={["zenin__dashboard", split ? 'split' : ''].join(' ')}>
            <div className="zenin__dashboard_monitors">
                {sorted.map((n, i) =>
                    <Monitor key={i} monitor={n} service={monitor.service} />)}
            </div>

            {split ?
                <div className={"zenin__dashboard_activity"}>
                    {monitor.context.state.split.isEditing() ?
                        <Editor
                            state={monitor.context.state.split.pane}
                            onClose={() => monitor.context.dispatch({ type: 'edit', monitor: null })}
                            onChange={value => isMonitor(value) ? handleUpdate(value) : handleAdd(value)}
                            onDelete={value => monitor.context.dispatch({ type: 'delete', monitors: [value] })} />
                        : null}

                    {monitor.context.state.split.isViewing() ?
                        <Info
                            state={monitor.context.state.split.pane} />
                        : null}
                </div>
                : null}
        </div>
    )
}