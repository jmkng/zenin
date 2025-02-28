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

    return <div className="zenin__account_dialog_content zenin__dialog_content">
        <div className="zenin__dialog_section">
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
