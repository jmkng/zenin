import { Monitor, useMonitorContext } from "../../internal/monitor";
import { useState } from 'react';
import { MonitorService } from '../../internal/monitor/service';
import { useAccountContext } from '../../internal/account';

import SeriesComponent from './Series';
import Button from '../Button/Button';
import PauseIcon from '../Icon/PauseIcon/PauseIcon';
import PlayIcon from '../Icon/PlayIcon/PlayIcon';
import VMenuIcon from '../Icon/VMenuIcon/VMenuIcon';
import ModalComponent from '../Modal/Modal';
import TrashIcon from '../Icon/TrashIcon/TrashIcon';
import InfoIcon from '../Icon/InfoIcon/InfoIcon';
import EditIcon from '../Icon/EditIcon/EditIcon';
import ActiveWidget from './Widget/ActiveWidget';
import IDWidget from './Widget/IDWidget';
import DatabaseIcon from '../Icon/DatabaseIcon/DatabaseIcon';

import './Monitor.css';

interface MonitorProps {
    monitor: Monitor;
    service: MonitorService;
}

export default function MonitorComponent(props: MonitorProps) {
    const monitor = {
        data: props.monitor,
        context: useMonitorContext(),
        service: props.service
    }
    const account = useAccountContext();
    const [menuModalIsOpen, setMenuModalIsOpen] = useState<boolean>(false);
    const content = [
        {
            items: [
                { text: "Info", onClick: () => handleView(), icon: <InfoIcon /> },
                { text: "Poll", onClick: () => handlePoll(), icon: <DatabaseIcon /> },
                {
                    text: monitor.data.active ? "Pause" : "Resume",
                    onClick: () => handleToggle(),
                    icon: monitor.data.active ? <PauseIcon /> : <PlayIcon />
                },
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
    ];

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
                    <span
                        className="zenin__monitor_name zenin__h_left"
                        onClick={event => {
                            event.stopPropagation();
                            handleView();
                        }}
                    >
                        {monitor.data.name}
                    </span>
                    <Button
                        style={menuModalIsOpen ? { background: "var(--off-b)" } : {}}
                        onClick={event => { event.stopPropagation(); setMenuModalIsOpen(!menuModalIsOpen) }}
                    >
                        <VMenuIcon />
                        <ModalComponent
                            visible={menuModalIsOpen}
                            onCancel={() => setMenuModalIsOpen(false)}
                            kind={{ flag: 'attached', content }}
                        />
                    </Button>
                </div>
                <div
                    className="zenin__monitor_top_lower"
                    onClick={event => {
                        event.stopPropagation();
                        handleSelect();
                    }}>
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
            <div className="zenin__monitor_middle" onClick={handleSelect}>
            </div>
            <div className='zenin__monitor_bottom'>
                <SeriesComponent
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
