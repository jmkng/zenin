import Button from "@/components/Button/Button";
import { ROOT_ACCOUNT_UI, useAccountContext } from "@/internal/account";
import { formatDate } from "@/internal/layout/graphics";
import { useMonitorContext } from "@/internal/monitor";

import VMenuIcon from "@/components/Icon/VMenuIcon";
import Dialog from "../Dialog/Dialog";
import AccountDialogContent from "./AccountDialogContent";

import "./Accounts.css";

export default function Accounts() {
    const account = { 
        context: useAccountContext(),
    }
    const monitor = {
        context: useMonitorContext(),
    }
    const list = account.context.state.accounts;

    return <div className="zenin__accounts">
        <div className="zenin__detail_body">
            {list.map((n, i) => <div key={i} className="zenin__account">
                <div className="zenin__account_top">
                    <div className="zenin__account_top_left">
                        <div className="zenin__account_name">
                            {n.username}
                        </div>
                        
                    </div>
                    <div className="zenin__account_top_right">
                        {n.root 
                            ? <div className="zenin__account_rank">
                                {ROOT_ACCOUNT_UI}
                            </div>
                            : null}
                        <Dialog dialog={{content: <AccountDialogContent account={n} />}}>
                            <Button hover={false} icon={<VMenuIcon />}>
                            </Button>
                        </Dialog>
                    </div>
                </div>
                <small className="zenin__account_updated_timestamp zenin__h_mt-c">
                    {formatDate(n.updatedAt)}
                </small>
            </div>)}
        </div>
        <div className="zenin__detail_controls">
            <Button border={true} onClick={() => monitor.context.dispatch({ type: 'pane', pane: { type: 'accounts' }})}>
                Close
            </Button>
        </div>
    </div>
}
