import Button from "../Button/Button";

import "./DeleteMonitor.css";

interface DeleteMonitorProps {
    onDelete: () => void;
}

export default function DeleteMonitor(props: DeleteMonitorProps) {
    const { onDelete } = props;

    return (
        <div className="zenin__confirm_modal">
            <div className="zenin__confirm_modal_top">
                <div>Deleting a monitor will also delete the measurements associated with that monitor.</div>
                <div>This action cannot be undone.</div>
            </div>
            <div className="zenin__confirm_modal_bottom zenin__h_right">
                <Button onClick={() => onDelete()} kind="primary">
                    <span>Delete</span>
                </Button>
            </div>
        </div>
    )
}
