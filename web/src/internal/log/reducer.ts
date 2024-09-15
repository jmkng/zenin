import { Line } from "../../components/LineReader/Line";

export interface LogState {
    lines: Line[]
    urgent: Line[]
    connected: boolean
}

export const logDefault: LogState = { connected: true, lines: [], urgent: [] }

const logChunkSize = 50;
const logMaxLines = 200;

type PushAction = { type: "push", line: Line };
type ClearAction = { type: "clear" };
type ToggleAction = { type: "toggle", connected: boolean };
type SilenceAction = { type: "silence" };

export type LogDispatch = (action: LogAction) => void;

export type LogAction =
    | PushAction
    | ClearAction
    | ToggleAction
    | SilenceAction

const pushAction = (state: LogState, action: PushAction): LogState => {
    let lines = [...state.lines, action.line];
    if (lines.length >= logMaxLines) {
        const before = lines.length;
        lines = lines.slice(logChunkSize);
        console.log(`trimming log: chunk=${logChunkSize}, before=${before}, after=${lines.length}`);
    }
    const urgent = [...state.urgent, ...lines.filter(n => n.notify())];
    return { ...state, lines, urgent };
}

const clearAction = (state: LogState): LogState => {
    const lines: Line[] = [];
    const urgent: Line[] = [];
    return { ...state, lines, urgent };
}

const toggleAction = (state: LogState, action: ToggleAction): LogState => {
    const connected = action.connected;
    return { ...state, connected };
}

const silenceAction = (state: LogState,): LogState => {
    const urgent: Line[] = [];
    return { ...state, urgent };
}

const logReducer = (state: LogState, action: LogAction): LogState => {
    switch (action.type) {
        case "push": return pushAction(state, action);
        case "clear": return clearAction(state);
        case "toggle": return toggleAction(state, action);
        case "silence": return silenceAction(state);
    }
}

export { logReducer };
