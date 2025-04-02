import { useMonitorContext } from '@/hooks/useMonitor';

import Button from '../../Button/Button';
import AddIcon from '../../Icon/AddIcon';
import DoubleChevronIcon from '../../Icon/DoubleChevron';
import SortIcon from '../../Icon/SortIcon';
import Dialog from '../Dialog/Dialog';
import ActionMenuContent from './ActionMenuContent';
import SortDialogContent from './SortDialogContent';

import './Menu.css';

export default function Menu() {
    const monitorContext = useMonitorContext();

    const draft = () => {
        const pane = { type: 'draft' as const }
        monitorContext.dispatch({type: 'pane', pane })
    }

    return <div className='default_menu menu'>
        <div className='menu_left'>
            <div className="menu_left_contextual">
                <div className="dashboard_menu">
                    <div className="menu_margin_right menu_button_container">
                        <Button tooltip="Create Monitor" icon={<AddIcon />} onClick={draft}>
                        </Button>
                    </div>
                    <div className="menu_margin_right">
                        <Dialog
                            dialog={{
                                content: <SortDialogContent
                                    filter={monitorContext.state.filter}
                                    onFilterChange={filter => monitorContext.dispatch({ type: 'filter', filter })}
                                />
                            }}
                        >
                            <div className="menu_button_container">
                                <Button tooltip="Sort Dashboard" icon={<SortIcon />} />
                            </div>
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
