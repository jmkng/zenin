import { useAccountContext } from '../../internal/account';
import * as monitor from "../../internal/monitor";
import { ACTIVE_UI, INACTIVE_UI, isMonitor, useMonitorContext } from '../../internal/monitor';
import { useDefaultMonitorService } from '../../internal/monitor/service';
import { DataPacket } from '../../server';

import Editor from '../../components/Editor/Editor';
import Info from '../../components/Info/Info';
import Menu from '../../components/Menu/Menu';
import Monitor from '../../components/Monitor/Monitor';
import Settings from '../../components/Settings/Settings';
import Shortcut from '../../components/Shortcut/Shortcut';

import './Dashboard.css';

export default function Dashboard() {
    const monitor = {
        context: useMonitorContext(),
        service: useDefaultMonitorService()
    }
    const account = useAccountContext();
    const sorted = [...monitor.context.state.monitors.values()].filter(n =>
        monitor.context.state.filter === ACTIVE_UI
            ? n.active
            : monitor.context.state.filter === INACTIVE_UI ? !n.active : true
    ).sort((a, b) => a.name > b.name ? 1 : -1);
    const split = monitor.context.state.split.pane != null;

    const handleAdd = async (value: monitor.Monitor) => {
        const token = account.state.authenticated!.token.raw;
        const extract = await monitor.service.addMonitor(token, value);
        if (!extract.ok()) return;
        const body: DataPacket<number> = await extract.json();
        if (!body.data || typeof body.data !== 'number') {
            throw new Error("expected server to respond with id of new monitor")
        }
        const measurements = null;
        const full: monitor.Monitor = { ...value, id: body.data, measurements: measurements }
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

    // Determine what goes in the activity window.
    const activity = split
        ? <div className={"zenin__dashboard_activity"}>
            {monitor.context.state.split.isEditorPane()
                ? <Editor
                    state={monitor.context.state.split.pane}
                    onClose={() => monitor.context.dispatch({ type: 'pane', pane: { type: 'editor', monitor: null } })}
                    onChange={n => (n.id != null && isMonitor(n)) ? handleUpdate(n) : handleAdd(n)}
                    onDelete={n => monitor.context.dispatch({ type: 'delete', monitors: [n] })} />
                : null}
            {monitor.context.state.split.isViewPane() ? <Info state={monitor.context.state.split.pane} /> : null}
            {monitor.context.state.split.isSettingsPane() ? <Settings /> : null}
        </div>
        : null;

    return <div className={["zenin__dashboard", split ? 'split' : ''].join(' ')}>
        <div className="zenin__dashboard_side">
            <Shortcut />
        </div>
        <div className="zenin__dashboard_main">
            <div className="zenin__dashboard_main_top">
                <Menu />
            </div>
            <div className="zenin__dashboard_main_bottom">
                <div className="zenin__dashboard_monitors">
                    {sorted.map((n, i) => <Monitor key={i} monitor={n} service={monitor.service} />)}
                </div>
                {activity}
            </div>
        </div>
    </div>
}