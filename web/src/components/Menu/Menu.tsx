import { useLocation } from 'react-router-dom';
import { useLayoutContext } from '../../internal/layout';
import { useMonitorContext } from '../../internal/monitor';

import Button from '../Button/Button';
import MenuIcon from '../Icon/MenuIcon/MenuIcon';
import SettingsIcon from '../Icon/SettingsIcon/SettingsIcon';
import DashboardMenu from './DashboardMenu';

import './Menu.css';

export default function Menu() {
    const layout = useLayoutContext();
    const monitor = useMonitorContext();
    const location = useLocation();

    const handleMenuToggle = () => {
        layout.dispatch({ type: 'shortcut', shortcut: !layout.state.shortcut });
    }

    return <div className='zenin__menu'>
        <div className='zenin__menu_left'>
            <Button onClick={handleMenuToggle} tooltip={{ text: "Toggle Shortcuts" }}>
                <span className="zenin__h_center zenin__menu_toggle">
                    <MenuIcon />
                </span>
            </Button>

            <div className="zenin__menu_spacer first"></div>
            <div className="zenin__menu_left_contextual">
                {location.pathname == "/" ? <DashboardMenu /> : null}
            </div>
        </div>

        <div className='zenin__menu_right'>
            <Button onClick={() => monitor.dispatch({ type: 'pane', pane: { type: 'settings' } })} tooltip={{ text: "Toggle Settings" }}>
                <span className="zenin__h_center zenin__menu_toggle">
                    <SettingsIcon />
                </span>
            </Button>
        </div>
    </div>
}
