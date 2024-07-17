import { useLocation } from 'react-router-dom';
//import { useDefaultAccountService } from '../../internal/account/service';
import { useLayoutContext } from '../../internal/layout';
//import { useAccountContext } from '../../internal/account';

import Button from '../Button/Button';
import MenuIcon from '../Icon/MenuIcon/MenuIcon';
//import LogoutIcon from '../Icon/LogoutIcon/LogoutIcon';
import SearchIcon from '../Icon/SearchIcon/SearchIcon';
import DashboardMenuComponent from './DashboardMenu';
import LogMenuComponent from './LogMenu';

import './Menu.css';

export default function MenuComponent() {
    const layout = useLayoutContext();
    //const account = {
    //    context: useAccountContext(),
    //    service: useDefaultAccountService()
    //}
    const location = useLocation();

    const handleMenuToggle = () => {
        layout.dispatch({ type: 'navigate', navigating: !layout.state.navigating });
    }

    //const handleLogout = () => {
    //    account.service.clear();
    //    account.context.dispatch({ type: 'logout' });
    //}

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
                <div className="zenin__menu_spacer"></div>
                <Button onClick={() => { }} tooltip={{ text: "Search" }}>
                    <span className="zenin__h_center zenin__menu_search"><SearchIcon /></span>
                </Button>
            </div >
        </div >
    )
}
