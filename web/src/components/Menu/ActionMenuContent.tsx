import { useNavigate } from "react-router-dom";
import { useAccountContext } from "../../internal/account";
import { useDefaultAccountService } from "../../internal/account/service";
import { useMonitorContext } from "../../internal/monitor";

import Button from "../Button/Button";
import AccountIcon from "../Icon/AccountIcon";
import AddIcon from "../Icon/AddIcon";
import SettingsIcon from "../Icon/SettingsIcon";

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
    
    return <div className="zenin__action_menu_dialog_content">
        <div className="zenin__action_menu_dialog_section">
            <div className="zenin__action_menu_dialog_name">
                {account.context.state.authenticated?.token.payload.sub}
            </div>
            <div className="zenin__action_menu_dialog_rank">
                {account.context.state.authenticated?.token.payload.root
                    ? "Root User"
                    : "Standard User"}
            </div>
        </div>
        <div className="zenin__action_menu_dialog_section">
            <Button 
                onClick={() => {}} // TODO
                icon={<AccountIcon/>}
            >
                Manage Accounts
            </Button>
            <Button
                onClick={() => monitor.context.dispatch({ type: 'pane', pane: { type: 'settings' } })}
                icon={<SettingsIcon/>}
            >
                Settings
            </Button>
        </div>
        <div className="zenin__action_menu_dialog_section">
            <Button 
                onClick={handleLogout}
                kind="destructive"
                icon={<span className="zenin__action_menu_log_out_icon">
                    <AddIcon/>
                </span>}
            >
                Log Out
            </Button>
        </div>
    </div>
}