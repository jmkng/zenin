import { monitor } from '@/internal';
import { useAccountContext } from '@/internal/account';
import { Measurement } from '@/internal/measurement';
import { isMonitor, useMonitorContext } from '@/internal/monitor';
import { useDefaultMonitorService } from '@/internal/monitor/service';
import { CreatedTimestamp, DataPacket, Timestamp } from '@/internal/server';

import Button from '../Button/Button';
import Accounts from './Accounts/Accounts';
import DeleteDialogContent from './DeleteDialogContent';
import DialogModal from './Dialog/DialogModal';
import Editor from './Editor/Editor';
import Info from './Info/Info';
import Menu from './Menu/Menu';
import SelectMenu from './Menu/SelectMenu';
import Monitor from './Monitor/Monitor';
import Settings from './Settings/Settings';

import './Dashboard.css';

export default function Dashboard() {
    const monitor = {
        context: useMonitorContext(),
        service: useDefaultMonitorService()
    }
    const account = useAccountContext();
    const sorted = [...monitor.context.state.monitors.values()].sort((a, b) => {
        switch (monitor.context.state.filter) {
            case "NAME_ASC":
                return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1;
            case "NAME_DESC":
                return a.name.toLowerCase() > b.name.toLowerCase() ? -1 : 1;
            case "UPDATED_NEW":
                return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
            case "UPDATED_OLD":
                return Date.parse(a.updatedAt) - Date.parse(b.updatedAt);
        }
    })
    const isSplit = monitor.context.state.split.pane != null;

    const handleAdd = async (value: monitor.Monitor) => {
        const token = account.state.token!.raw;
        const extract = await monitor.service.addMonitor(token, value);
        if (!extract.ok()) return;

        const body: DataPacket<CreatedTimestamp> = await extract.json();
        value.createdAt = body.data.time;
        value.updatedAt = body.data.time;
        const measurements: Measurement[] = [];
        const full: monitor.Monitor = { ...value, id: body.data.id, measurements }
        monitor.context.dispatch({ type: 'update', monitor: full })
    }

    const handleUpdate = async (value: monitor.Monitor) => {
        if (!value.id) {
            throw new Error("monitor is missing id in dashboard update");
        }
        const token = account.state.token!.raw;
        const extract = await monitor.service.updateMonitor(token, value.id, value);
        if (!extract.ok()) return;
        const body: DataPacket<Timestamp> = await extract.json();
        value.updatedAt = body.data.time;
        monitor.context.dispatch({ type: 'update', monitor: value })
    }

    const handleRemove = async (monitors: monitor.Monitor[]) => {
        const id = monitors.map(n => n.id!);
        const token = account.state.token!.raw;
        const extract = await monitor.service.deleteMonitor(token, id);
        if (!extract.ok()) return;
        monitor.context.dispatch({ type: 'delete', monitors: id });
    }

    const handleDraft = () => {
        const pane = { type: 'editor' as const, monitor: null }
        monitor.context.dispatch({type: 'pane', pane })
    }

    return <div className={["dashboard", isSplit ? 'split' : ''].join(' ')}>
        <div className="dashboard_main">
            <div className="dashboard_main_top">
                <div className={["dashboard_select_menu", monitor.context.state.selected.length > 0 ? 'selection' : ''].join(' ')}>
                    <SelectMenu />
                </div>
                <Menu />
            </div>

            <div className="dashboard_main_bottom">
                {sorted.length > 0
                    ? <div className="dashboard_monitors">
                        {sorted.map((n, i) => <Monitor key={i} monitor={n} service={monitor.service} />)}
                    </div>
                    : <div className="dashboard_empty">
                        <span className="dashboard_empty_message">No monitors have been created.</span>
                        <Button kind="primary" border={true} onClick={handleDraft}>
                            <span className="h_f-row-center menu_add">
                                Create Monitor
                            </span>
                        </Button>
                    </div>}

                {isSplit
                    ? <div className={"dashboard_activity"}>
                        {monitor.context.state.split.isEditorPane()
                            ? <Editor
                                state={monitor.context.state.split.pane}
                                onChange={n => (n.id != null && isMonitor(n)) ? handleUpdate(n) : handleAdd(n)}
                            />
                            : null}
                        {monitor.context.state.split.isViewPane()
                            ? <Info state={monitor.context.state.split.pane} />
                            : null}
                        {monitor.context.state.split.isSettingsPane()
                            ? <Settings />
                            : null}
                        {monitor.context.state.split.isAccountsPane()
                            ? <Accounts />
                            : null}
                    </div>
                    : null}
            </div>
        </div>

        <DialogModal
            title="Confirm"
            visible={monitor.context.state.deleting.length > 0}
            onCancel={() => monitor.context.dispatch({ type: 'queue', monitors: [] })}
            content={<DeleteDialogContent
                queue={monitor.context.state.deleting}
                onConfirm={() => handleRemove(monitor.context.state.deleting)}
            />}
        />
    </div>
}
