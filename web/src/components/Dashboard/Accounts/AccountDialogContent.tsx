import Button from "../../Button/Button"
import TrashIcon from "../..//Icon/TrashIcon"
import EditIcon from "../../Icon/EditIcon"

interface AccountDialogContentProps {
    allowDelete: boolean,

    onDelete: () => void
    onEdit: () => void
}

export default function AccountDialogContent(props: AccountDialogContentProps) {
    const { allowDelete, onDelete, onEdit } = props;

    return <div className="account_dialog_content dialog_content">
        <div className="dialog_section">
            <Button icon={<EditIcon />} onClick={onEdit}>
                Edit
            </Button>
            {allowDelete
                ? <Button kind="destructive" icon={<TrashIcon />} onClick={onDelete}>
                    Delete
                </Button>
                : null}
        </div>
    </div>
}
