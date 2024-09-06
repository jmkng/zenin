import { useLocation } from 'react-router-dom';
import { useAccountContext } from '../../internal/account';
import { useLayoutContext } from '../../internal/layout';
import { ACTIVE_UI, FilterKind, INACTIVE_UI, useMonitorContext } from '../../internal/monitor';
import { useDefaultMonitorService } from '../../internal/monitor/service';

import Button from '../Button/Button';
import MenuIcon from '../Icon/MenuIcon/MenuIcon';
import SettingsIcon from '../Icon/SettingsIcon/SettingsIcon';

import AddIcon from '../Icon/AddIcon/AddIcon';
import PauseIcon from '../Icon/PauseIcon/PauseIcon';
import PlayIcon from '../Icon/PlayIcon/PlayIcon';
import TrashIcon from '../Icon/TrashIcon/TrashIcon';
import SelectInput from '../Input/SelectInput/SelectInput';

import './Menu.css';

export default function Menu() {
    const layout = useLayoutContext();
    const monitor = {
        context: useMonitorContext(),
        service: useDefaultMonitorService()
    }
    const account = useAccountContext();
    const location = useLocation();

    const handleMenuToggle = () => {
        layout.dispatch({ type: 'shortcut', shortcut: !layout.state.shortcut });
    }

    const handleAdd = () => {
        monitor.context.dispatch({ type: 'draft' });
    }

    const handleToggle = async (active: boolean) => {
        const monitors = [...monitor.context.state.selected.map(n => n.id!)];
        const token = account.state.authenticated!.token.raw;
        const extract = await monitor.service.toggleMonitor(token, monitors, active);
        if (!extract.ok()) return;
        monitor.context.dispatch({ type: 'toggle', monitors, active });
    }

    const handleDelete = () => {
        const monitors = monitor.context.state.selected;
        monitor.context.dispatch({ type: 'delete', monitors });
    }

    const handleFilterChange = (value: FilterKind) => {
        if (!["All", ACTIVE_UI, INACTIVE_UI].includes(value)) {
            throw new Error(`failed to update monitor filter, unexpected value: ${value}`);
        }
        monitor.context.dispatch({ type: 'filter', filter: value });
    }

    return <div className='zenin__menu'>
        <div className='zenin__menu_left'>
            <div className="zenin__menu_toggle_container">
                <Button onClick={handleMenuToggle} tooltip={{ text: "Toggle Shortcuts" }}>
                    <span className="zenin__h_center">
                        <MenuIcon />
                    </span>
                </Button>
            </div>

            <div className="zenin__menu_spacer first"></div>
            <div className="zenin__menu_left_contextual">
                {location.pathname == "/"
                    ? <div className="zenin__dashboard_menu">
                        <div className="zenin__menu_margin">
                            <Button onClick={handleAdd} tooltip={{ text: "Add Monitor" }}>
                                <span className="zenin__h_center zenin__menu_add">
                                    <AddIcon />
                                </span>
                            </Button>
                        </div>
                        <div className="zenin__menu_margin zenin__menu_monitor_filter_container">
                            <SelectInput
                                name={'zenin__menu_state_filter'}
                                options={[{ text: 'All' }, { text: ACTIVE_UI }, { text: INACTIVE_UI }]}
                                value={monitor.context.state.filter}
                                onChange={(value: string) => handleFilterChange(value as FilterKind)}
                            />
                        </div>
                        {monitor.context.state.selected.length > 0
                            ? <div className="zenin__menu_monitor_bulk_container">
                                <div className="zenin__menu_margin">
                                    <Button
                                        disabled={!monitor.context.state.selected.some(n => !n.active)}
                                        tooltip={{ text: "Resume Selected" }} onClick={() => handleToggle(true)}
                                    >
                                        <PlayIcon />
                                    </Button>
                                </div>
                                <div className="zenin__menu_margin">
                                    <Button
                                        disabled={!monitor.context.state.selected.some(n => n.active)}
                                        tooltip={{ text: "Pause Selected" }} onClick={() => handleToggle(false)}
                                    >
                                        <PauseIcon />
                                    </Button>
                                </div>
                                <div onClick={(event) => event.stopPropagation()}>
                                    <Button tooltip={{ text: "Delete Selected" }} onClick={() => handleDelete()}>
                                        <TrashIcon />
                                    </Button>
                                </div>
                            </div>
                            : null}
                    </div>
                    : null}
            </div>
        </div>

        <div className='zenin__menu_right'>
            <Button onClick={() => monitor.context.dispatch({ type: 'pane', pane: { type: 'settings' } })} tooltip={{ text: "Toggle Settings" }}>
                <span className="zenin__h_center">
                    <SettingsIcon />
                </span>
            </Button>
        </div>
    </div>
}
