import { isMonitor, Monitor, useMonitorContext } from '../../internal/monitor'
import { useMemo } from 'react';
import { useDefaultMonitorService } from '../../internal/monitor/service';
import { useAccountContext } from '../../internal/account';
import { DataPacket } from '../../server';

import MonitorComponent from '../../components/Monitor/Monitor';
import DetailComponent from '../../components/Detail/Detail';
import InfoComponent from '../../components/Info/Info';

import './Dashboard.css'

export default function Dashboard() {
    const monitor = {
        context: useMonitorContext(),
        service: useDefaultMonitorService()
    }
    const account = useAccountContext();
    const sorted = monitor.context.state.visible.sort((a, b) => a.name > b.name ? 1 : -1);
    const split: boolean = useMemo(() =>
        monitor.context.state.editing != null
        || monitor.context.state.drafting
        || monitor.context.state.viewing != null,
        [monitor.context.state.editing, monitor.context.state.drafting, monitor.context.state.viewing]);

    const handleAdd = async (value: Monitor) => {
        const token = account.state.authenticated!.token.raw;
        const extract = await monitor.service.add(token, value);
        if (!extract.ok()) return;
        const body: DataPacket<{ id: number }> = await extract.json();
        const measurements = null;
        const full: Monitor = { ...value, id: body.data.id, measurements: measurements }
        monitor.context.dispatch({ type: 'overwrite', monitor: full })
    }

    const handleClose = () => {
        monitor.context.dispatch({ type: 'edit', monitor: null })
    }

    const handleDelete = (value: Monitor) => {
        monitor.context.dispatch({ type: 'delete', monitors: [value] })
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

    const editor = <DetailComponent
        monitor={monitor.context.state.editing}
        onClose={handleClose}
        onChange={value => isMonitor(value) ? handleUpdate(value) : handleAdd(value)}
        onDelete={handleDelete}
    />

    const info = <InfoComponent monitor={monitor.context.state.viewing!} />

    return (
        <div className={["zenin__dashboard", split ? 'split' : ''].join(' ')}>
            <div className="zenin__dashboard_monitors">
                {sorted.map((n, i) => <MonitorComponent key={i} monitor={n} service={monitor.service} />)}
            </div>

            {split ?
                <div className={"zenin__dashboard_activity"}>
                    {monitor.context.state.editing || monitor.context.state.drafting ? editor : null}
                    {monitor.context.state.viewing ? info : null}
                </div>
                : null}
        </div>
    )
}
