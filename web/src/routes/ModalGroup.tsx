import { useAccountContext } from "../internal/account";
import { Monitor, useMonitorContext } from "../internal/monitor";
import { useDefaultMonitorService } from "../internal/monitor/service";

import DialogModal from "../components/Modal/DialogModal";
import DeleteMonitor from "../components/Modal/DeleteMonitor";

export default function ModalGroup() {
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

    return <DialogModal
        title="Confirm"
        visible={monitor.state.deleting.length > 0}
        onCancel={() => monitor.dispatch({ type: 'delete', monitors: [] })}
        content={<DeleteMonitor onDelete={() => handleRemove(monitor.state.deleting)} />} 
    />
}
