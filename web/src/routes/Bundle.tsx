import { useAccountContext } from "../internal/account";
import { Monitor, useMonitorContext } from "../internal/monitor";
import { useDefaultMonitorService } from "../internal/monitor/service";
import DeleteMonitor from "../components/Modal/DeleteMonitor";
import ModalComponent from "../components/Modal/Modal";

export default function Bundle() {
    const account = useAccountContext();
    const monitor = useMonitorContext();
    const service = useDefaultMonitorService();

    const handleRemove = async (monitors: Monitor[]) => {
        const id = monitors.map(n => n.id!);
        const token = account.state.authenticated!.token.raw;
        const extract = await service.deleteMonitor(token, id);
        if (!extract.ok()) return;
        monitor.dispatch({ type: 'remove', monitors: id });
    }

    return <>
        <ModalComponent
            visible={monitor.state.deleting.length > 0}
            kind={{
                flag: "floating",
                title: "Confirm",
                content: <DeleteMonitor onDelete={() => handleRemove(monitor.state.deleting)} />
            }}
            onCancel={() => monitor.dispatch({ type: 'delete', monitors: [] })}
        />
    </>
}