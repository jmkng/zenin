import { ACTIVE_UI, FilterKind, INACTIVE_UI, useMonitorContext } from "../../internal/monitor";
import { useAccountContext } from "../../internal/account";
import { useDefaultMonitorService } from "../../internal/monitor/service";

import SelectInput from "../Input/SelectInput/SelectInput";
import Button from "../Button/Button";
import PlayIcon from "../Icon/PlayIcon/PlayIcon";
import PauseIcon from "../Icon/PauseIcon/PauseIcon";
import TrashIcon from "../Icon/TrashIcon/TrashIcon";
import AddIcon from "../Icon/AddIcon/AddIcon";

import "./DashboardMenu.css";

export default function DashboardMenuComponent() {
    const monitor = {
        context: useMonitorContext(),
        service: useDefaultMonitorService()
    }
    const account = useAccountContext();

    function handleFilterChange(value: FilterKind) {
        if (!["All", ACTIVE_UI, INACTIVE_UI].includes(value)) {
            throw new Error(`failed to update monitor filter, unexpected value: ${value}`);
        }
        monitor.context.dispatch({ type: 'filter', filter: value });
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

    return (
        <div className="zenin__dashboard_menu">
            <div className="zenin__menu_margin">
                <Button
                    onClick={handleAdd}
                    tooltip={{ text: "Add Monitor" }}
                >
                    <span className="zenin__h_center zenin__menu_add">
                        <AddIcon />
                    </span>
                </Button>
            </div >
            <div className="zenin__menu_margin zenin__menu_monitor_filter_container">
                <SelectInput
                    name={'zenin__menu_state_filter'}
                    options={[{ text: 'All' }, { text: ACTIVE_UI }, { text: INACTIVE_UI }]}
                    value={monitor.context.state.filter}
                    onChange={(value: string) => handleFilterChange(value as FilterKind)}
                />
            </div>
            {
                monitor.context.state.selected.length > 0
                    ?
                    <div className="zenin__menu_monitor_bulk_container">
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
                    : null
            }
        </div >
    )
}
