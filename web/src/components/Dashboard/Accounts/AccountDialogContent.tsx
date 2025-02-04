import { Account, useAccountContext } from "@/internal/account"

import Button from "../../Button/Button"
import TrashIcon from "../..//Icon/TrashIcon"

interface AccountDialogContentProps {
    account: Account
}

export default function AccountDialogContent(props: AccountDialogContentProps) {
    const account = useAccountContext()

    return <div className="zenin__account_dialog_content zenin__dialog_content">
        {/* <div className="zenin__dialog_section">
        </div> */}
        <div className="zenin__dialog_section">
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
