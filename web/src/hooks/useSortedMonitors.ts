import { useMemo } from "react";
import { useMonitorContext } from "./useMonitor";

export const useSortedMonitors = () => {
    const context = useMonitorContext();
    
    return useMemo(() => {
        return [...context.state.monitors.values()]
            .sort((a, b) => {
                switch (context.state.filter) {
                    case "NAME_ASC": 
                        return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1;
                    case "NAME_DESC": 
                        return a.name.toLowerCase() > b.name.toLowerCase() ? -1 : 1;
                    case "UPDATED_NEW": 
                        return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
                    case "UPDATED_OLD": 
                        return Date.parse(a.updatedAt) - Date.parse(b.updatedAt);
                    default:
                        return 0;
                }
        });
    }, [context.state.monitors, context.state.filter]);
};