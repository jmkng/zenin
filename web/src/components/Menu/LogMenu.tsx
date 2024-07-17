import { useLogContext } from "../../internal/log";

import Button from "../Button/Button";
import EmptyIcon from "../Icon/EmptyIcon/EmptyIcon";
import PlugInIcon from "../Icon/PlugInIcon/PlugInIcon";
import UnplugIcon from "../Icon/UnplugIcon/UnplugIcon";

import "./LogMenu.css";

export default function LogMenuComponent() {
    const log = useLogContext();

    const handleFeedToggle = (connected: boolean) => {
        log.dispatch({ type: 'toggle', connected });
    }

    const handleClear = () => {
        log.dispatch({ type: 'clear' })
    }

    return (
        <div className="zenin__log_menu">
            <Button
                tooltip={{ text: log.state.connected ? 'Disconnect' : 'Connect' }}
                onClick={() => log.state.connected ? handleFeedToggle(false) : handleFeedToggle(true)}
            >
                {log.state.connected ? <UnplugIcon /> : <PlugInIcon />}
            </Button>
            <Button tooltip={{ text: "Clear Logs" }} disabled={log.state.lines.length == 0} onClick={handleClear}>
                <EmptyIcon />
            </Button>
        </div >
    );
}
