import { useNavigate } from "react-router-dom";
import { ROOT_ACCOUNT_UI, useAccountContext } from "@/internal/account";
import { useDefaultAccountService } from "@/internal/account/service";
import { useMonitorContext } from "@/internal/monitor";

import Button from "../../Button/Button";
import AccountIcon from "../../Icon/AccountIcon";
import AddIcon from "../../Icon/AddIcon";
import SettingsIcon from "../../Icon/SettingsIcon";

import "./ActionMenuContent.css";

export default function ActionMenuContent() {
    const account = {
        context: useAccountContext(),
        service: useDefaultAccountService()
    }
    const monitor = { context: useMonitorContext() };
    const navigate = useNavigate();

    const handleLogout = () => {
        account.service.clearLSToken();
        account.context.dispatch({ type: 'logout' });
        navigate("/login");
    }

    return <div className="zenin__action_menu_dialog_content zenin__dialog_content">
        <div className="zenin__action_menu_dialog_section zenin__dialog_section">
            <div className="zenin__action_menu_dialog_name">
                {account.context.state.token?.payload.sub}
            </div>
            {account.context.state.token?.payload.root 
                ? <div className="zenin__action_menu_dialog_rank">
                    {ROOT_ACCOUNT_UI}
                </div>
                : null}
        </div>
        <div className="zenin__action_menu_dialog_section zenin__dialog_section">
            {account.context.state.token?.payload.root
                ? <Button
                    onClick={() => monitor.context.dispatch({ type: 'pane', pane: { type: 'accounts' } })}
                    icon={<AccountIcon />}
                >
                    Manage Accounts
                </Button>
                : null}
            <Button
                onClick={() => monitor.context.dispatch({ type: 'pane', pane: { type: 'settings' } })}
                icon={<SettingsIcon />}
            >
                Settings
            </Button>
            <Button
                onClick={handleLogout}
                kind="destructive"
                icon={<span className="zenin__action_menu_log_out_icon">
                    <AddIcon />
                </span>}
            >
                Log Out
            </Button>
        </div>
    </div>
}
