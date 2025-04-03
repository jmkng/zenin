import { useEffect } from "react";

import { useAccountContext } from "@/hooks/useAccount";
import { useDataFetch } from "@/hooks/useDataFetch";
import { useFeedSocket } from "@/hooks/useFeedSocket";
import { useLayoutContext } from "@/hooks/useLayout";
import { useMonitor } from "@/hooks/useMonitor";
import { useNotify } from "@/hooks/useNotify";
import { useSortedMonitors } from "@/hooks/useSortedMonitors";
import { monitor } from "@/internal";
import { DataPacket, isErrorPacket, Timestamp } from "@/internal/server";

import Button from "../Button/Button";
import Accounts from "./Accounts/Accounts";
import DeleteDialogContent from "./DeleteDialogContent";
import DialogModal from "./Dialog/DialogModal";
import Editor from "./Editor/Editor";
import Info from "./Info/Info";
import Menu from "./Menu/Menu";
import SelectMenu from "./Menu/SelectMenu";
import Monitor from "./Monitor/Monitor";
import Settings from "./Settings/Settings";

import "./Dashboard.css";

export default function Dashboard() {
    const { service: monitorService, context: monitorContext } = useMonitor();
    const accountContext = useAccountContext();
    const layoutContext = useLayoutContext();
    
    const fetch = useDataFetch();
    const notify = useNotify();
    // @ts-ignore
    const _socket = useFeedSocket();

    const sorted = useSortedMonitors();
    const isSplit = monitorContext.state.split.pane != null;

    useEffect(() => {
        (async () => {
            await fetch();
            const loading = false;
            layoutContext.dispatch({ type: "load", loading });
        })();
    }, []);

    async function deleteMonitors(monitors: monitor.Monitor[]) {
        const id = monitors.map(n => n.id!);
        const token = accountContext.state.token!.raw;
        const extract = await monitorService.deleteMonitor(token, id);
        if (!extract.ok()) {
            const body = await extract.json();
            if (isErrorPacket(body)) notify(false, ...body.errors);
            return;
        }

        monitorContext.dispatch({ type: "delete", monitors: id });
        const length = id.length;
        const message = length > 1 ? `Deleted ${length} monitors.` : "Monitor deleted.";
        notify(true, message);
    }

    function startDraft() {
        const pane = { type: "draft" as const };
        monitorContext.dispatch({ type: "pane", pane });
    }

    async function toggleMonitors(active: boolean, id: number[]) {
        const token = accountContext.state.token!.raw;
        const extract = await monitorService.toggleMonitor(token, id, active);
        if (!extract.ok()) {
            const body = await extract.json();
            if (isErrorPacket(body)) notify(false, ...body.errors);
            return;
        }

        const body: DataPacket<Timestamp> = await extract.json();
        monitorContext.dispatch({ type: "toggle", monitors: id, active, time: body.data.time });
        notify(true, `Monitor${id.length > 1 ? "s" : ""} ${active ? "started" : "stopped"}.`);
    }

    async function pollMonitor(id: number) {
        const token = accountContext.state.token!.raw;
        const extract = await monitorService.pollMonitor(token, id);
        if (!extract.ok()) {
            const body = await extract.json();
            if (isErrorPacket(body)) notify(false, ...body.errors);
            return;
        }
        notify(true, "Monitor poll queued.");
    }

    return <div className={["dashboard", isSplit ? "split" : ""].join(" ")}>
        <div className="dashboard_main">
            <div className="dashboard_main_top">
                <div className={["dashboard_select_menu", monitorContext.state.selected.length > 0 ? "selection" : ""].join(" ")}>
                    <SelectMenu onToggle={toggleMonitors} />
                </div>
                <Menu />
            </div>

            <div className="dashboard_main_bottom">
                {sorted.length > 0
                    ? <div className="dashboard_monitors">
                        {sorted.map((n, i) => <Monitor key={i} monitor={n} onToggle={toggleMonitors} onPoll={pollMonitor} />)}
                    </div>
                    : <div className="dashboard_empty">
                        <span className="dashboard_empty_message">No monitors have been created.</span>
                        <Button kind="primary" border={true} onClick={startDraft}>
                            <span className="h_f-row-center menu_add">
                                Create Monitor
                            </span>
                        </Button>
                    </div>}

                {isSplit
                    ? <div className={"dashboard_activity"}>
                        {monitorContext.state.split.isEditorPane()
                            ? <Editor state={monitorContext.state.split.pane}
                            />
                            : null}
                        {monitorContext.state.split.isViewPane()
                            ? <Info state={monitorContext.state.split.pane} />
                            : null}
                        {monitorContext.state.split.isSettingsPane()
                            ? <Settings />
                            : null}
                        {monitorContext.state.split.isAccountsPane()
                            ? <Accounts />
                            : null}
                    </div>
                    : null}
            </div>
        </div>

        <DialogModal
            title="Confirm"
            visible={monitorContext.state.deleting.length > 0}
            onCancel={() => monitorContext.dispatch({ type: "queue", monitors: [] })}
            content={<DeleteDialogContent
                queue={monitorContext.state.deleting}
                onConfirm={() => deleteMonitors(monitorContext.state.deleting)}
            />}
        />
    </div>
}