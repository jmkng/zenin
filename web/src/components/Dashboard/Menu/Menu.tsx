import { useDefaultMonitorService, useMonitorContext } from '@/internal/monitor';

import Button from '../../Button/Button';
import AddIcon from '../../Icon/AddIcon';
import DoubleChevronIcon from '../../Icon/DoubleChevron';
import SortIcon from '../../Icon/SortIcon';
import Dialog from '../Dialog/Dialog';
import ActionMenuContent from './ActionMenuContent';
import SortDialogContent from './SortDialogContent';

import './Menu.css';

export default function Menu() {
    //const layout = useLayoutContext();
    const monitor = {
        context: useMonitorContext(),
        service: useDefaultMonitorService()
    }

    //const handleMenuToggle = () => {
    //    layout.dispatch({ type: 'shortcut', shortcut: !layout.state.shortcut });
    //}

    const handleAdd = () => {
        const pane = { type: 'editor' as const, monitor: null }
        monitor.context.dispatch({type: 'pane', pane })
    }

    return <div className='default_menu menu'>
        <div className='menu_left'>
            {/*<div className="menu_toggle_container">
                <Button onClick={handleMenuToggle}>
                    <span className="h_f-row-center">
                        <MenuIcon />
                    </span>
                </Button>
            </div>
            <div className="menu_spacer first"></div>*/}

            <div className="menu_left_contextual">
                <div className="dashboard_menu">
                    <div className="menu_margin_right">
                        <Button tooltip="Create Monitor" icon={<AddIcon />} onClick={handleAdd}>
                        </Button>
                    </div>
                    <div className="menu_margin_right">
                        <Dialog
                            dialog={{
                                content: <SortDialogContent
                                    filter={monitor.context.state.filter}
                                    onFilterChange={filter => monitor.context.dispatch({ type: 'filter', filter })}
                                />
                            }}
                        >
                            <Button tooltip="Sort Dashboard" icon={<SortIcon />} />
                        </Dialog>
                    </div>
                </div>
            </div>
        </div>

        <div className='menu_right'>
            <Dialog dialog={{ content: <ActionMenuContent /> }}>
                <Button hover={false} icon={<DoubleChevronIcon />} />
            </Dialog>
        </div>
    </div>
}
