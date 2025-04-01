import { useLayoutContext } from "@/internal/layout";
import { useEffect } from "react";

import Button from "../Button/Button";
import AddIcon from "../Icon/AddIcon";

import "./Notifications.css";

const TIME_DELAY_MS = 5000;

export default function Notifications() {
    const layout = useLayoutContext();
    
    useEffect(() => {
        for (const n of layout.state.notifications) {
            if (n.autoDismiss) startTimer(n.id);
        }
    }, [layout.state.notifications]);

    const startTimer = (id: number) => {
        setTimeout(() => dismiss(id), TIME_DELAY_MS);
    };

    const dismiss = (id: number) => {
        layout.dispatch({ type: 'dismiss', id });
    };

    return <div className="notifications" role="region" aria-live="polite" aria-label="Notifications">
        {layout.state.notifications.map(n => 
            <div key={n.id} tabIndex={0} className="notification">
                <div className="notification_message">
                    {n.message}
                </div>
            
                <div className="notification_controls">
                    <Button 
                        ariaLabel="Dismiss Notification"
                        onClick={() => dismiss(n.id)} 
                        icon={<span aria-hidden="true" className="dialog_close_icon"><AddIcon /></span>}
                    >
                    </Button>
                </div>
            
                {n.autoDismiss
                    ? <div className="notification_progress_container">
                        <div className="notification_progress" style={{ animationDuration: `${TIME_DELAY_MS+150}ms` }} />
                    </div>
                    : null}
            </div>
        )}
    </div>
}
