import { useLayoutContext } from '../../internal/layout';
import { NAME_ASC_UI, NAME_DESC_UI, UPDATED_NEW_UI, UPDATED_OLD_UI, useMonitorContext } from '../../internal/monitor';
import { useDefaultMonitorService } from '../../internal/monitor/service';

import Button from '../Button/Button';
import AddIcon from '../Icon/AddIcon';
import MenuIcon from '../Icon/MenuIcon';
import SettingsIcon from '../Icon/SettingsIcon';
import SortIcon from '../Icon/SortIcon';

import './DefaultMenu.css';

export default function DefaultMenu() {
    const layout = useLayoutContext();
    const monitor = {
        context: useMonitorContext(),
        service: useDefaultMonitorService()
    }

    let indicator;
    switch (monitor.context.state.filter) {
        case 'NAME_ASC':
            indicator = NAME_ASC_UI
            break;
        case 'NAME_DESC':
            indicator = NAME_DESC_UI
            break;
        case 'UPDATED_NEW':
            indicator = UPDATED_NEW_UI
            break;
        case 'UPDATED_OLD':
            indicator = UPDATED_OLD_UI
            break;
    }

    const handleMenuToggle = () => {
        layout.dispatch({ type: 'shortcut', shortcut: !layout.state.shortcut });
    }

    const handleAdd = () => {
        monitor.context.dispatch({ type: 'draft' });
    }

    return <div className='zenin__menu'>
        <div className='zenin__menu_left'>
            <div className="zenin__menu_toggle_container">
                <Button onClick={handleMenuToggle}>
                    <span className="zenin__h_center">
                        <MenuIcon />
                    </span>
                </Button>
            </div>
            <div className="zenin__menu_spacer first"></div>

            <div className="zenin__menu_left_contextual">
                <div className="zenin__dashboard_menu">
                    <div className="zenin__menu_margin">
                        <Button onClick={handleAdd} tooltip={{ text: "Add Monitor" }}>
                            <span className="zenin__h_center zenin__menu_add">
                                <AddIcon />
                            </span>
                        </Button>
                    </div>
                    <div className="zenin__menu_margin">
                        <Button
                            tooltip={{ text: "Sort Dashboard" }}
                            dialog={{
                                content: [
                                    {
                                        items: [
                                            { text: NAME_ASC_UI, onClick: () => monitor.context.dispatch({ type: 'filter', filter: 'NAME_ASC' }), active: monitor.context.state.filter == 'NAME_ASC' },
                                            { text: NAME_DESC_UI, onClick: () => monitor.context.dispatch({ type: 'filter', filter: 'NAME_DESC' }), active: monitor.context.state.filter == 'NAME_DESC' },
                                        ]
                                    },
                                    {
                                        items: [
                                            { text: UPDATED_NEW_UI, onClick: () => monitor.context.dispatch({ type: 'filter', filter: 'UPDATED_NEW' }), active: monitor.context.state.filter == 'UPDATED_NEW' },
                                            { text: UPDATED_OLD_UI, onClick: () => monitor.context.dispatch({ type: 'filter', filter: 'UPDATED_OLD' }), active: monitor.context.state.filter == 'UPDATED_OLD' },
                                        ]
                                    }
                                ],
                                side: "bottom"
                            }}
                        >
                            <span className="zenin__h_center zenin__menu_add">
                                <SortIcon />
                            </span>
                        </Button>
                    </div>
                    <span className="zenin__filter_indicator">{indicator}</span>
                </div>
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
