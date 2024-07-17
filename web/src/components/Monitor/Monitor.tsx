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
import StateWidget from './Widget/StateWidget';
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
                { text: "Edit", onClick: () => handleEdit(), icon: <EditIcon /> },
                { text: "Delete", onClick: () => handleDelete(), icon: <TrashIcon />, destructive: true },
            ]
        }
    ];

    const handlePoll = async () => {
        const token = account.state.authenticated!.token.raw;
        await monitor.service.poll(token, monitor.data.id!);
    }

    const handleSelect = () => {
        monitor.context.dispatch({ type: 'select', monitor: monitor.data })
    }

    const handleEdit = () => {
        monitor.context.dispatch({ type: 'edit', monitor: monitor.data })
    }

    const handleView = () => {
        monitor.context.dispatch({ type: 'view', monitor: monitor.data })
    }

    const handleDelete = () => {
        monitor.context.dispatch({ type: 'delete', monitors: [monitor.data] })
    }

    const handleToggle = async () => {
        const active = !monitor.data.active;
        const monitors = [monitor.data.id!];
        const token = account.state.authenticated!.token.raw;
        const extract = await monitor.service.toggle(token, monitors, active);
        if (!extract.ok()) return;
        monitor.context.dispatch({ type: 'toggle', monitors, active });
    }

    return (
        <div
            className={
                ['zenin__monitor', monitor.context.state.selected.includes(monitor.data)
                    ? 'selected'
                    : ''].join(' ')
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
                        style={menuModalIsOpen ? { background: "var(--off-b)" } : {}} // Maintain background when modal is open.
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
                    <span onClick={event => event.stopPropagation()}>
                        <ActiveWidget active={monitor.data.active} onClick={handleToggle} />
                    </span>
                    {monitor.data.measurements && monitor.data.measurements.length > 0 ?
                        <span onClick={event => event.stopPropagation()}>
                            <StateWidget state={monitor.data.measurements![monitor.data.measurements.length - 1].state} />
                        </span>
                        : null}
                </div>
            </div>
            <div className="zenin__monitor_middle" onClick={handleSelect}>
            </div>
            <div className='zenin__monitor_bottom'>
                <SeriesComponent measurements={monitor.data.measurements?.toReversed() || []} />
            </div>
        </div >
    )
}
