import { isMeasurement } from "../internal/measurement";
import { useMonitorContext } from "../internal/monitor";

export const useFlaggedDispatch = () => {
    const monitor = useMonitorContext();

    const action = (data: any) => {
        if (isMeasurement(data)) monitor.dispatch({ type: 'poll', measurement: data })
    }

    return action;
}
