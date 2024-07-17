import { useAccountContext } from "../../../internal/account";
import ModalComponent from "../Modal";
import { Monitor, useMonitorContext } from "../../../internal/monitor";
import { useDefaultMonitorService } from "../../../internal/monitor/service";
import ConfirmModal from "../ConfirmModal";

export default function Bundle() {
    const account = useAccountContext();
    const monitor = useMonitorContext();
    const service = useDefaultMonitorService();

    const handleRemove = async (monitors: Monitor[]) => {
        const id = monitors.map(n => n.id!);
        const token = account.state.authenticated!.token.raw;
        const extract = await service.delete(token, id);
        if (!extract.ok()) return;
        monitor.dispatch({ type: 'remove', monitors: id });
    }

    return (
        <div className="zenin__bundle_component">
            <ModalComponent
                visible={monitor.state.deleting.length > 0}
                kind={{
                    flag: "floating",
                    title: "Confirm",
                    content: <ConfirmModal onDelete={() => handleRemove(monitor.state.deleting)} />
                }}
                onCancel={() => monitor.dispatch({ type: 'delete', monitors: [] })}
            />
        </div>
    )
}
