import { useMonitorService } from '@/hooks/useMonitorService';
import { monitor } from '@/internal';
import { formatUTCDate, MINIMAL_FORMAT } from '@/internal/layout/graphics';
import { Measurement } from '@/internal/measurement';
import { useMonitorContext } from '@/internal/monitor';

import Button from '../../Button/Button';
import VMenuIcon from '../../Icon/VMenuIcon';
import Dialog from '../Dialog/Dialog';
import InactiveWidget from './InactiveWidget/InactiveWidget';
import MonitorDialogContent from './MonitorDialogContent';
import Timeline from './Timeline/Timeline';

import './Monitor.css';

interface MonitorProps {
    monitor: monitor.Monitor;
    
    onToggle: (active: boolean, id: number[]) => void;
    onPoll: (id: number) => void;
}

export default function Monitor(props: MonitorProps) {
    const { onToggle, onPoll } = props;
    const monitor = {
        data: props.monitor,
        context: useMonitorContext(),
        service: useMonitorService()
    }
    const reversed = monitor.data.measurements.toReversed();
    const classes = ['monitor', monitor.context.state.selected.includes(monitor.data) ? 'selected' : ''];

    const handleSelect = () => {
        monitor.context.dispatch({ type: 'select', monitor: monitor.data })
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
                <div className="monitor_top_controls">
                    <div className="monitor_name" onClick={e => {e.stopPropagation(); handleView()}}>
                        {monitor.data.name}
                    </div>
                </div>
                <div className="monitor_menu_container h_ml-auto">
                    {!monitor.data.active
                        ? <div className="monitor_inactive_widget">
                            <InactiveWidget active={monitor.data.active} />
                        </div>
                        : null}
                        <div onClick={e => e.stopPropagation()}>
                            <Dialog 
                                dialog={{content: 
                                    <MonitorDialogContent monitor={monitor.data} onToggle={onToggle} onPoll={onPoll} />
                                }}>
                                    <div className="monitor_dialog_button_container">
                                        <Button hover={false} icon={<VMenuIcon />}>
                                        </Button>
                                    </div>
                            </Dialog>
                        </div>
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
