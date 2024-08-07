import { useAccountContext } from '../../internal/account';
import * as monitor from "../../internal/monitor";
import { useMonitorContext } from "../../internal/monitor";
import { MonitorService } from '../../internal/monitor/service';

import Button from '../Button/Button';
import DatabaseIcon from '../Icon/DatabaseIcon/DatabaseIcon';
import EditIcon from '../Icon/EditIcon/EditIcon';
import InfoIcon from '../Icon/InfoIcon/InfoIcon';
import PauseIcon from '../Icon/PauseIcon/PauseIcon';
import PlayIcon from '../Icon/PlayIcon/PlayIcon';
import TrashIcon from '../Icon/TrashIcon/TrashIcon';
import VMenuIcon from '../Icon/VMenuIcon/VMenuIcon';
import Series from './Series';
import ActiveWidget from './Widget/ActiveWidget';
import IDWidget from './Widget/IDWidget';

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

    const handlePoll = async () => {
        const token = account.state.authenticated!.token.raw;
        await monitor.service.pollMonitor(token, monitor.data.id!);
    }

    const handleSelect = () => {
        monitor.context.dispatch({ type: 'select', monitor: monitor.data })
    }

    const handleView = () => {
        monitor.context.dispatch({
            type: 'view',
            target: { monitor: monitor.data, measurement: null }
        })
    }

    const handleToggle = async () => {
        const active = !monitor.data.active;
        const monitors = [monitor.data.id!];
        const token = account.state.authenticated!.token.raw;
        const extract = await monitor.service.toggleMonitor(token, monitors, active);
        if (!extract.ok()) return;
        monitor.context.dispatch({ type: 'toggle', monitors, active });
    }

    return (
        <div
            className={
                ['zenin__monitor',
                    monitor.context.state.selected.includes(monitor.data) ? 'selected' : ''
                ].join(' ')
            } >
            <div className="zenin__monitor_top" onClick={handleSelect}>
                <div className="zenin__monitor_top_upper">
                    <div onClick={event => event.stopPropagation()}>
                        <span className="zenin__monitor_name zenin__h_left" onClick={() => handleView()}>
                            {monitor.data.name}
                        </span>
                    </div>
                    <Button
                        icon={<VMenuIcon />}
                        onClick={event => event.stopPropagation()}
                        dialog={[
                            {
                                items: [
                                    { text: "Info", onClick: () => handleView(), icon: <InfoIcon /> },
                                    { text: "Poll", onClick: () => handlePoll(), icon: <DatabaseIcon /> },
                                    { text: monitor.data.active ? "Pause" : "Resume", onClick: () => handleToggle(), icon: monitor.data.active ? <PauseIcon /> : <PlayIcon /> },
                                ]
                            },
                            {
                                items: [
                                    {
                                        text: "Edit",
                                        onClick: () => monitor.context.dispatch({ type: 'edit', monitor: monitor.data }), icon: <EditIcon />
                                    },
                                    {
                                        text: "Delete",
                                        onClick: () => monitor.context.dispatch({ type: 'delete', monitors: [monitor.data] }), icon: <TrashIcon />, destructive: true
                                    },
                                ]
                            }
                        ]} />
                </div>
                <div onClick={event => event.stopPropagation()}>
                    <div
                        className="zenin__monitor_top_lower"
                        onClick={() => handleSelect()}
                    >
                        <span onClick={event => event.stopPropagation()}>
                            <IDWidget id={monitor.data.id!} />
                        </span>
                        {!monitor.data.active ?
                            <span onClick={event => event.stopPropagation()}>
                                <ActiveWidget active={monitor.data.active} onClick={handleToggle} />
                            </span>
                            : null}
                    </div>
                </div>
            </div>
            <div className="zenin__monitor_middle" onClick={handleSelect}>
            </div>
            <div className='zenin__monitor_bottom'>
                <Series
                    measurements={monitor.data.measurements?.toReversed() || []}
                    onSlotClick={measurement => monitor.context.dispatch({
                        type: 'view',
                        target: { monitor: monitor.data, measurement, disableToggle: true }
                    })}
                />
            </div>
        </div >
    )
}
