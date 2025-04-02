import { clearLSToken } from "@/internal/account";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAccountContext } from "./useAccount";
import { useLayoutContext } from "./useLayout";
import { useMonitorContext } from "./useMonitor";

export function useLogout() {
    const navigate = useNavigate();
    const accountContext = useAccountContext();
    const monitorContext = useMonitorContext();
    const layoutContext = useLayoutContext();
    
    const loggingOutRef = useRef(false);

    useEffect(() => {
        if (loggingOutRef.current && layoutContext.state.loading) {
            navigate("/login");
        }
    }, [layoutContext.state.loading]);

    return () => {
        loggingOutRef.current = true;
        clearLSToken();
        accountContext.dispatch({ type: "logout" });
        monitorContext.dispatch({ type: "logout" });
        layoutContext.dispatch({ type: "load", loading: true });
    };
}