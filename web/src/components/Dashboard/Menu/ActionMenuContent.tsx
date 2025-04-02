import { useAccountContext } from "@/hooks/useAccount";
import { useMonitorContext } from "@/hooks/useMonitor";
import { clearLSToken } from "@/internal/account";
import { useNavigate } from "react-router-dom";

import Button from "../../Button/Button";
import AccountIcon from "../../Icon/AccountIcon";
import AddIcon from "../../Icon/AddIcon";
import SettingsIcon from "../../Icon/SettingsIcon";

import "./ActionMenuContent.css";

export default function ActionMenuContent() {
    const accountContext = useAccountContext();
    const monitorContext = useMonitorContext();
    const navigate = useNavigate();

    const handleLogout = () => {
        clearLSToken();
        accountContext.dispatch({ type: 'logout' });
        monitorContext.dispatch({ type: 'logout' });
        navigate("/login");
    }

    const handleAccountPane = () => {
        monitorContext.dispatch({ type: 'pane', pane: { type: 'accounts' } });
    }

    return <div className="action_menu_dialog_content dialog_content">
        <div className="action_menu_dialog_section dialog_section">
            <div className="action_menu_dialog_name">
                {accountContext.state.token?.payload.username}
            </div>
        </div>
        <div className="action_menu_dialog_section dialog_section">
            {accountContext.state.token?.payload.root
                ? <Button onClick={handleAccountPane} icon={<AccountIcon />}>
                    Manage Accounts
                </Button>
                : <Button onClick={handleAccountPane} icon={<AccountIcon />}>
                    Edit Account
                </Button>}
            <Button
                onClick={() => monitorContext.dispatch({ type: 'pane', pane: { type: 'settings' } })}
                icon={<SettingsIcon />}
            >
                Settings
            </Button>
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
