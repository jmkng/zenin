import { useAccountContext } from '../../internal/account';
import * as monitor from "../../internal/monitor";
import { isMonitor, useMonitorContext } from '../../internal/monitor';
import { useDefaultMonitorService } from '../../internal/monitor/service';
import { DataPacket } from '../../server';

import Editor from '../../components/Editor/Editor';
import Info from '../../components/Info/Info';
import DefaultMenu from '../../components/Menu/DefaultMenu';
import SelectMenu from '../../components/Menu/SelectMenu';
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
    const sorted = [...monitor.context.state.monitors.values()].sort((a, b) => {
        switch (monitor.context.state.filter) {
            case "NAME_ASC": return a.name > b.name ? 1 : -1;
            case "NAME_DESC": return a.name > b.name ? -1 : 1;
            case "UPDATED_NEW": return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
            case "UPDATED_OLD": return Date.parse(a.updatedAt) - Date.parse(b.updatedAt);
        }
    })
    const split = monitor.context.state.split.pane != null;

    const handleAdd = async (value: monitor.Monitor) => {
        const token = account.state.authenticated!.token.raw;
        const extract = await monitor.service.addMonitor(token, value);
        if (!extract.ok()) return;

        const body: DataPacket<{ id: number, time: string }> = await extract.json();
        if (!body.data) {
            throw new Error("expected server to respond with `id` and `time` fields for new monitor")
        }
        value.createdAt = body.data.time;
        value.updatedAt = body.data.time;
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
        const body: DataPacket<{ time: string }> = await extract.json();
        if (!body.data) {
            throw new Error("expected server to respond with `time` field for updated monitor");
        }
        value.updatedAt = body.data.time;
        monitor.context.dispatch({ type: 'overwrite', monitor: value })
    }

    const activity = split
        ? <div className={"zenin__dashboard_activity"}>
            {monitor.context.state.split.isEditorPane()
                ? <Editor
                    state={monitor.context.state.split.pane}
                    onChange={n => (n.id != null && isMonitor(n)) ? handleUpdate(n) : handleAdd(n)}
                />
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
                <div className={["zenin__dashboard_select_menu", monitor.context.state.selected.length > 0 ? 'selection' : ''].join(' ')}>
                    <SelectMenu />
                </div>
                <DefaultMenu />
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