import { useNavigate } from "react-router-dom";
import { useAccountContext } from "@/internal/account";
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
        monitor.context.dispatch({ type: 'logout' });
        navigate("/login");
    }

    const handleAccountPane = () => {
        monitor.context.dispatch({ type: 'pane', pane: { type: 'accounts' } });
    }

    return <div className="action_menu_dialog_content dialog_content">
        <div className="action_menu_dialog_section dialog_section">
            <div className="action_menu_dialog_name">
                {account.context.state.token?.payload.username}
            </div>
            <div className="action_menu_dialog_id">
                {account.context.state.token?.payload.sub}
            </div>
        </div>
        <div className="action_menu_dialog_section dialog_section">
            {account.context.state.token?.payload.root
                ? <Button onClick={handleAccountPane} icon={<AccountIcon />}>
                    Manage Accounts
                </Button>
                : <Button onClick={handleAccountPane} icon={<AccountIcon />}>
                    Edit Account
                </Button>}
            <Button
                onClick={() => monitor.context.dispatch({ type: 'pane', pane: { type: 'settings' } })}
                icon={<SettingsIcon />}
            >
                Settings
            </Button>
        </div>
        <div className="action_menu_dialog_section dialog_section">
            <Button
                onClick={handleLogout}
                kind="destructive"
                icon={<span className="action_menu_log_out_icon">
                    <AddIcon />
                </span>}
            >
                Log Out
            </Button>
        </div>
    </div>
}
