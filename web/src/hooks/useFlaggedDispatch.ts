import { isMeasurement } from "../internal/measurement";
import { useMonitorContext } from "../internal/monitor";

export const useFeedDispatch = () => {
    const monitor = useMonitorContext();

    const action = (data: unknown) => {
        if (isMeasurement(data)) monitor.dispatch({ type: 'poll', measurement: data })
    }

    return action;
}
