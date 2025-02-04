import { monitor } from '@/internal';
import { useAccountContext } from '@/internal/account';
import { Measurement } from '@/internal/measurement';
import { useMonitorContext } from '@/internal/monitor';
import { MonitorService } from '@/internal/monitor/service';
import { DataPacket } from '@/internal/server';

import Button from '../../Button/Button';
import VMenuIcon from '../../Icon/VMenuIcon';
import Dialog from '../Dialog/Dialog';
import MonitorDialogContent from './MonitorDialogContent';
import MonitorTimeline from './MonitorTimeline';
import ActiveWidget from './Widget/ActiveWidget';
import IDWidget from './Widget/IDWidget';
import KindWidget from './Widget/KindWidget';

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
    const measurements = monitor.data.measurements?.toReversed() || [];
    const classes = ['zenin__monitor', monitor.context.state.selected.includes(monitor.data) ? 'selected' : ''];

    const handleSelect = () => {
        monitor.context.dispatch({ type: 'select', monitor: monitor.data })
    }

    const handleToggle = async () => {
        const active = !monitor.data.active;
        const monitors = [monitor.data.id!];
        const token = account.state.token!.raw;
        const extract = await monitor.service.toggleMonitor(token, monitors, active);
        if (!extract.ok()) return;

        const body: DataPacket<{ time: string }> = await extract.json();
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
        <div className="zenin__monitor_top" onClick={handleSelect}>
            <div className="zenin__monitor_top_upper">
                <div onClick={event => event.stopPropagation()}>
                    <span className="zenin__monitor_name zenin__h_left" onClick={handleView}>
                        {monitor.data.name}
                    </span>
                </div>

                <div className="zenin__monitor_menu_container" onClick={e => e.stopPropagation()}>
                    <Dialog dialog={{content: <MonitorDialogContent monitor={monitor.data} />}}>
                        <Button hover={false} icon={<VMenuIcon />}>
                        </Button>
                    </Dialog>
                </div>
            </div>
            <div className="zenin__monitor_top_lower" onClick={e =>{
                    e.stopPropagation();
                    handleSelect();
                }}>
                <span onClick={event => event.stopPropagation()}>
                    <IDWidget id={monitor.data.id!} />
                </span>

                <KindWidget kind={monitor.data.kind} />
                {!monitor.data.active
                    ? <div onClick={event => event.stopPropagation()}>
                        <ActiveWidget active={monitor.data.active} onClick={handleToggle} />
                    </div>
                    : null}
            </div>
        </div>

        <div className="zenin__monitor_middle" onClick={handleSelect}>
        </div>

        <div className='zenin__monitor_bottom'>
            <MonitorTimeline measurements={measurements} onSlotClick={handleTimelineSlotClick} />
        </div>
    </div>
}
