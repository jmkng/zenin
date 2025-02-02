import { useNavigate } from 'react-router-dom';
import { useAccountContext } from '../../internal/account';
import { useDefaultAccountService } from '../../internal/account/service';
//import { useLayoutContext } from '../../internal/layout';
import { FilterKind, NAME_ASC_UI, NAME_DESC_UI, UPDATED_NEW_UI, UPDATED_OLD_UI, useMonitorContext } from '../../internal/monitor';
import { useDefaultMonitorService } from '../../internal/monitor/service';

import Button from '../Button/Button';
import AccountIcon from '../Icon/AccountIcon';
import AddIcon from '../Icon/AddIcon';
import LogoutIcon from '../Icon/LogoutIcon';
//import MenuIcon from '../Icon/MenuIcon';
import Dialog from '../Dialog/Dialog';
import SettingsIcon from '../Icon/SettingsIcon';
import SortIcon from '../Icon/SortIcon';
import SortDialogContent from './SortDialogContent';

import './Menu.css';

export default function Menu() {
    //const layout = useLayoutContext();
    const monitor = {
        context: useMonitorContext(),
        service: useDefaultMonitorService()
    }
    const account = {
        context: useAccountContext(),
        service: useDefaultAccountService()
    }
    const navigate = useNavigate();
    const authenticated = account.context.state.authenticated != null;
    const root = account.context.state.authenticated?.token.payload.root || false;

    //const handleMenuToggle = () => {
    //    layout.dispatch({ type: 'shortcut', shortcut: !layout.state.shortcut });
    //}

    const handleAdd = () => {
        monitor.context.dispatch({ type: 'draft' });
    }

    const handleLogout = () => {
        account.service.clearLSToken();
        account.context.dispatch({ type: 'logout' });
        navigate("/login");
    }

    return <div className='zenin__default_menu zenin__menu'>
        <div className='zenin__menu_left'>
            {/*<div className="zenin__menu_toggle_container">
                <Button onClick={handleMenuToggle}>
                    <span className="zenin__h_center">
                        <MenuIcon />
                    </span>
                </Button>
            </div>
            <div className="zenin__menu_spacer first"></div>*/}

            <div className="zenin__menu_left_contextual">
                <div className="zenin__dashboard_menu">
                    <div className="zenin__menu_margin_right">
                        <Button tooltip="Add Monitor" icon={<AddIcon />} onClick={handleAdd}>
                        </Button>
                    </div>
                    <div className="zenin__menu_margin_right">
                        <Dialog
                            dialog={{ 
                                content: <SortDialogContent 
                                    filter={monitor.context.state.filter} 
                                    onFilterChange={filter => monitor.context.dispatch({ type: 'filter', filter })}
                                />}}
                        >
                            <Button tooltip="Sort Dashboard" icon={<SortIcon/>} />
                        </Dialog>
                    </div>
                    <span className="zenin__filter_indicator">{getFilterLabel(monitor.context.state.filter)}</span>
                </div>
            </div>
        </div>

        <div className='zenin__menu_right'>
            <div className="zenin__menu_margin_right">
                <Button icon={<SettingsIcon />}
                    onClick={() => monitor.context.dispatch({ type: 'pane', pane: { type: 'settings' } })}
                >
                </Button>
            </div>
            {root
                ? <div className="zenin__menu_margin_right">
                    <Button icon={<AccountIcon />} onClick={() => { }}>
                    </Button>
                </div>
                : null}

            {authenticated
                ? <Button icon={<LogoutIcon />} onClick={handleLogout}>
                </Button>
                : null}

        </div>
    </div >
}

function getFilterLabel(filter: FilterKind): string {
    switch (filter) {
        case 'NAME_ASC':
            return NAME_ASC_UI
        case 'NAME_DESC':
            return NAME_DESC_UI
        case 'UPDATED_NEW':
            return UPDATED_NEW_UI
        case 'UPDATED_OLD':
            return UPDATED_OLD_UI
    }
}