import { Line } from "../components/LineReader/Line";
import ObjectLine from "../components/LineReader/ObjectLine";
import StringLine from "../components/LineReader/StringLine";
import { useLogContext } from "../internal/log";
import { Measurement, isMeasurement, useMonitorContext } from "../internal/monitor";
import { MonitorDispatch } from "../internal/monitor/reducer";
import { DEAD_API } from "../server";

export const useFlaggedDispatch = () => {
    const log = useLogContext();
    const monitor = useMonitorContext();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const action = (data: any) => {
        let line: Line
        if (typeof data == 'string') {
            line = message(data);
        } else if (isMeasurement(data)) {
            line = measurement(data, monitor.dispatch)
        } else {
            throw new Error(`flagged dispatch received unexpected message: ${JSON.stringify(data)}`);
        }
        log.dispatch({ type: 'push', line })
    }

    return action;
}

const measurement = (measurement: Measurement, dispatch: MonitorDispatch) => {
    const notify = measurement.state == DEAD_API ? true : false
    const object = {
        id: measurement.id,
        state: measurement.state,
        duration: measurement.duration,
    };
    const line = new ObjectLine({ object, message: "measurement", notify, remote: true })
    dispatch({ type: 'poll', measurement })
    return line;
}

const message = (message: string) => {
    return new StringLine({ message, remote: true })
}
