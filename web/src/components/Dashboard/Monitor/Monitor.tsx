import { monitor } from '@/internal';
import { useAccountContext } from '@/internal/account';
import { formatUTCDate, MINIMAL_FORMAT } from '@/internal/layout/graphics';
import { Measurement } from '@/internal/measurement';
import { useMonitorContext } from '@/internal/monitor';
import { MonitorService } from '@/internal/monitor/service';
import { DataPacket, Timestamp } from '@/internal/server';

import Button from '../../Button/Button';
import VMenuIcon from '../../Icon/VMenuIcon';
import Dialog from '../Dialog/Dialog';
import InactiveWidget from './InactiveWidget/InactiveWidget';
import MonitorDialogContent from './MonitorDialogContent';
import Timeline from './Timeline/Timeline';

import './Monitor.css';

interface MonitorProps {
    monitor: monitor.Monitor;
    service: MonitorService;
}

export default function Monitor(props: MonitorProps) {
    const monitor = {
        data: props.monitor,
        context: useMonitorContext(),
        service: props.service
    }
    const account = useAccountContext();
    const reversed = monitor.data.measurements.toReversed();
    const classes = ['monitor', monitor.context.state.selected.includes(monitor.data) ? 'selected' : ''];

    const handleSelect = () => {
        monitor.context.dispatch({ type: 'select', monitor: monitor.data })
    }

    const handleToggle = async () => {
        const active = !monitor.data.active;
        const monitors = [monitor.data.id!];
        const token = account.state.token!.raw;
        const extract = await monitor.service.toggleMonitor(token, monitors, active);
        if (!extract.ok()) return;

        const body: DataPacket<Timestamp> = await extract.json();
        monitor.context.dispatch({ type: 'toggle', monitors, active, time: body.data.time });
    }

    const handleView = () => {
        const measurement = null;
        const target = { monitor: monitor.data, measurement };
        monitor.context.dispatch({ type: 'pane', pane: { type: 'view', target } });
    }

    const handleTimelineSlotClick = (measurement: Measurement) => {
        const target = { monitor: monitor.data, measurement, disableToggle: true };
        monitor.context.dispatch({ type: 'pane', pane: { type: 'view', target } });
    }

    return <div className={classes.join(' ')}>
        <div className="monitor_top" onClick={handleSelect}>
            <div className="monitor_top_upper">
                <div className="monitor_top_controls" onClick={event => event.stopPropagation()}>
                    <div className="monitor_name" onClick={handleView}>
                        {monitor.data.name}
                    </div>
                </div>
                <div className="monitor_menu_container h_ml-auto" onClick={e => e.stopPropagation()}>
                    {!monitor.data.active
                        ? <div onClick={event => event.stopPropagation()} className="monitor_inactive_widget">
                            <InactiveWidget active={monitor.data.active} onClick={handleToggle} />
                        </div>
                        : null}
                    <Dialog 
                        dialog={{content: <MonitorDialogContent monitor={monitor.data} />}}>
                        <div className="monitor_dialog_button_container">
                            <Button hover={false} icon={<VMenuIcon />}>
                            </Button>
                        </div>
                    </Dialog>
                </div>
            </div>
            <div className="monitor_top_lower">
                <div className="monitor_timestamp">
                    {reversed[0] ? formatUTCDate(reversed[0].createdAt, MINIMAL_FORMAT) : null}
                </div> 
            </div>
        </div>

        <div className='monitor_bottom'>
            <Timeline measurements={reversed} onSlotClick={handleTimelineSlotClick} />
        </div>
    </div>
}
