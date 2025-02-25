import Button from "../../Button/Button"
import TrashIcon from "../..//Icon/TrashIcon"
import EditIcon from "../../Icon/EditIcon"

interface AccountDialogContentProps {
    onEdit: () => void
}

export default function AccountDialogContent(props: AccountDialogContentProps) {
    const { onEdit } = props;
    
    return <div className="zenin__account_dialog_content zenin__dialog_content">
        {/* <div className="zenin__dialog_section">
        </div> */}
        <div className="zenin__dialog_section">
            <Button
                icon={<EditIcon />}
                onClick={onEdit}
            >
                Edit
            </Button>
            <Button
                kind="destructive"
                icon={<TrashIcon />}
                onClick={() => {}} // TODO
            >
                Delete
            </Button>
        </div>
    </div>
}
