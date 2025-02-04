import Button from "../Button/Button";

import "./DeleteDialogContent.css";

interface DeleteDialogContentProps {
    onConfirm: () => void;
}

export default function DeleteDialogContent(props: DeleteDialogContentProps) {
    const { onConfirm } = props;

    return <div className="zenin__dialog_confirm_content">
        <div className="zenin__dialog_confirm_content_top">
            <div>Deleting a monitor will also delete the measurements associated with that monitor.</div>
            <div>This action cannot be undone.</div>
        </div>
        <div className="zenin__dialog_confirm_content_bottom zenin__h_ml-auto">
            <Button onClick={onConfirm} kind="primary">
                <span>Delete</span>
            </Button>
        </div>
    </div>
}
