import { useLocation } from 'react-router-dom';
import { useLayoutContext } from '../../internal/layout';

import Button from '../Button/Button';
import MenuIcon from '../Icon/MenuIcon/MenuIcon';
import DashboardMenuComponent from './DashboardMenu';
import LogMenuComponent from './LogMenu';

import './Menu.css';

export default function MenuComponent() {
    const layout = useLayoutContext();
    const location = useLocation();

    const handleMenuToggle = () => {
        layout.dispatch({ type: 'navigate', navigating: !layout.state.navigating });
    }

    return (
        <div className='zenin__menu'>
            <div className='zenin__menu_left'>
                <Button onClick={handleMenuToggle} tooltip={{ text: "Toggle Navigation Bar" }}>
                    <span className="zenin__h_center zenin__menu_toggle"><MenuIcon /></span>
                </Button>

                <div className="zenin__menu_spacer first"></div>
                <div className="zenin__menu_left_contextual">
                    {location.pathname == "/" ? <DashboardMenuComponent /> : null}
                    {location.pathname == "/log" ? <LogMenuComponent /> : null}
                </div>
            </div>

            <div className='zenin__menu_right'>
            </div >
        </div >
    )
}
