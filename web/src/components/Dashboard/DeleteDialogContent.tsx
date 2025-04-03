import Button from "../Button/Button";

import { Monitor } from "@/internal/monitor";

import "./DeleteDialogContent.css";

interface DeleteDialogContentProps {
    queue: Monitor[],
    
    onConfirm: () => void;
}

export default function DeleteDialogContent(props: DeleteDialogContentProps) {
    const { queue, onConfirm } = props;

    return <div className="dialog_confirm_content">
        <div className="dialog_confirm_content_top">
            <div>{queue.length == 1
                ? <span>Are you sure you want to delete {queue[0].name}?</span>
                : <span>Are you sure you want to delete <b className="h_c-fg">{queue.length}</b> monitors?</span>} Deleting a monitor will also delete the measurements associated with that monitor.</div>
            <div>This action cannot be undone.</div>
        </div>
        <div className="dialog_confirm_content_bottom">
            <Button onClick={onConfirm} kind="primary">
                <span>Delete</span>
            </Button>
        </div>
    </div>
}
