import { FilterKind, Monitor } from ".";
import { Measurement } from "../measurement";
import { AccountsPane, EditorPane, OriginState, SettingsPane, SplitState, ViewPane } from "./split";

export interface MonitorState {
    monitors: Map<number, Monitor>,
    selected: Monitor[],
    deleting: Monitor[],
    split: SplitState,
    filter: FilterKind,
    plugins: string[],
}

// SplitState is owned by the monitor reducer so that it can be modified as monitors are deleted, etc.
// If the split is related to a monitor that was just deleted, it should close.

export const monitorDefault: MonitorState = {
    monitors: new Map(),
    selected: [],
    deleting: [],
    split: new SplitState(null),
    filter: "NAME_ASC",
    plugins: []
}

// The batch size is used to populate the inventory. (Router.tsx)
// Chunk size should generally be the difference between max measurements and batch size.
const inventoryMaxMeasurements = 40;
export const inventoryBatchSize = 35;
const inventoryChunkSize = Math.max(1, inventoryMaxMeasurements - inventoryBatchSize);

interface MonitorResetData {
    monitors: Monitor[],
    selected: Monitor[],
    deleting: Monitor[],
    split: SplitState,
    filter: FilterKind,
    plugins: string[]
}

/** Reset the state. */
type ResetAction = { type: "reset", state: MonitorResetData };

/** Queue monitors for deletion. */
type QueueDeleteMonitorAction = { type: "queue", monitors: Monitor[] };

/** Delete monitors. */
type DeleteMonitorAction = { type: "delete", monitors: number[] };

/** Toggle the active state of monitors. */
type ToggleMonitorAction = { type: "toggle", monitors: number[], time: string, active: boolean };

/** Overwrite a monitor. */
type UpdateMonitorAction = { type: "update", monitor: Monitor };

/** Add a measurement. */
type PollAction = { type: "poll", measurement: Measurement };

/** Change the dashboard filter. */
type FilterAction = { type: "filter", filter: FilterKind };

export const ALL_SELECT = "ALL";
export const NONE_SELECT = "NONE";

type SelectKind = Monitor | typeof ALL_SELECT | typeof NONE_SELECT;

/** Select monitors. */
type SelectAction = { type: "select", monitor: SelectKind };

/** Add a new measurement to a monitor. */
type AddMeasurementAction = { type: "measurement", id: number[], monitor: number };

export type PaneKind = ViewPaneAction | EditorPaneAction | DraftPaneAction | SettingsPaneAction | AccountsPaneAction;

type PaneAction = {
    type: "pane",
    pane: PaneKind
}

/** View monitor details. */
type ViewPaneAction = {
    type: "view",
    target: {
        monitor: Monitor,
        measurement: Measurement | null,
        origin?: OriginState,
        disableToggle?: boolean
    } | null
};

/** Edit a monitor. */
type EditorPaneAction = {
    type: "editor",
    monitor: Monitor | null
};

/** Draft a new monitor. */
type DraftPaneAction = {
    type: "draft",
}

/** View settings. */
type SettingsPaneAction = {
    type: "settings"
};

/** View accounts. */
type AccountsPaneAction = {
    type: "accounts"
}

/** Log out. */
type LogoutAction = { type: "logout" }

export type MonitorDispatch = (action: MonitorAction) => void;

export type MonitorAction =
    | ResetAction
    | QueueDeleteMonitorAction
    | DeleteMonitorAction
    | ToggleMonitorAction
    | UpdateMonitorAction
    | PollAction
    | FilterAction
    | SelectAction
    | AddMeasurementAction
    | PaneAction
    | LogoutAction

const resetAction = (_: MonitorState, action: ResetAction): MonitorState => {
    const monitors = new Map<number, Monitor>();
    for (const monitor of action.state.monitors) {
        const duplicate: Monitor = { ...monitor };
        // By default, measurement information has the newest at the front.
        // Reverse array here so new measurements can be pushed to the back, since that is most common operation.
        if (monitor.measurements) duplicate.measurements = [...monitor.measurements].reverse();
        monitors.set(duplicate.id, duplicate);
    }
    return { ...action.state, monitors }
}    

const queueMonitorDeleteAction = (state: MonitorState, action: QueueDeleteMonitorAction): MonitorState => {
    const deleting = action.monitors;
    return { ...state, deleting }
}

const deleteMonitorAction = (state: MonitorState, action: DeleteMonitorAction): MonitorState => {
    const monitors = new Map(state.monitors);
    for (const n of action.monitors) monitors.delete(n);

    const selected: Monitor[] = [];
    const deleting: Monitor[] = [];
    const split: SplitState = state.split.overlaps(action.monitors)
        ? new SplitState(null)
        : state.split;
    return { ...state, monitors, selected, deleting, split }
}

const toggleMonitorAction = (state: MonitorState, action: ToggleMonitorAction): MonitorState => {
    const monitors = new Map(state.monitors);
    for (const n of action.monitors) {
        const found = monitors.get(n);
        if (!found) {
            console.error(`failed to update active state, monitor not in inventory: id=${n}`);
            continue;
        }
        found.active = action.active;
        found.updatedAt = action.time;
    }
    return { ...state, monitors, selected: [], deleting: [] };
}

const overwriteMonitorAction = (state: MonitorState, action: UpdateMonitorAction): MonitorState => {
    const monitors = new Map(state.monitors);
    const target = monitors.get(action.monitor.id);

    // Recycle the measurement information.
    if (target) action.monitor.measurements = target.measurements;

    monitors.set(action.monitor.id, action.monitor);
    const split: SplitState = new SplitState(new EditorPane(action.monitor))
    return { ...state, monitors, split }
}

const pollAction = (state: MonitorState, action: PollAction): MonitorState => {
    const monitors = new Map(state.monitors);
    const monitor = monitors.get(action.measurement.monitorId);
    if (!monitor) {
        console.error(`failed to add measurement to monitor, monitor not in inventory: id=${action.measurement.monitorId}`);
        return state;
    }
    monitor.measurements = [...(monitor.measurements || [])]
    if (monitor.measurements.length >= inventoryMaxMeasurements) {
        const before = monitor.measurements.length;
        monitor.measurements = monitor.measurements.slice(inventoryChunkSize);
        console.log(`trimming measurements: monitor(id)=${monitor.id}, chunk=${inventoryChunkSize}, before=${before}, after=${monitor.measurements.length}`)
    }
    if (!monitor.measurements.some(n => n.id == action.measurement.id)) monitor.measurements.push(action.measurement);
    return { ...state, monitors }
}

const filterAction = (state: MonitorState, action: FilterAction): MonitorState => {
    const filter = action.filter;
    return { ...state, filter }
}

const selectAction = (state: MonitorState, action: SelectAction): MonitorState => {
    if (action.monitor == "ALL") {
        return { ...state, selected: [...state.monitors.values()] }
    }
    if (action.monitor == "NONE") {
        return { ...state, selected: [] }
    }
    const selected = state.selected.includes(action.monitor)
        ? state.selected.filter(n => n != action.monitor)
        : [...state.selected, action.monitor];
    return { ...state, selected }
}

const addMeasurementAction = (state: MonitorState, action: AddMeasurementAction): MonitorState => {
    const monitor = state.monitors.get(action.monitor);
    if (!monitor) return state;

    if (monitor.measurements) monitor.measurements = monitor.measurements.filter(n => !action.id.includes(n.id))
    return state;
}

const paneAction = (state: MonitorState, action: PaneAction): MonitorState => {
    switch (action.pane.type) {
        case "view": return viewPaneAction(state, action.pane);
        case "editor": return editorPaneAction(state, action.pane);
        case "draft": return draftPaneAction(state, action.pane);
        case "settings": return settingsPaneAction(state);
        case "accounts": return accountsPaneAction(state);
    }
}

const resetPaneAction = (state: MonitorState): MonitorState => {
    return { ...state, split: new SplitState(null) };
}

const viewPaneAction = (state: MonitorState, action: ViewPaneAction): MonitorState => {
    if (!action.target) return resetPaneAction(state);
    if (!action.target.disableToggle && state.split.isViewPane() && state.split.equals(action.target.monitor)) return resetPaneAction(state);
    
    const view = new ViewPane(action.target.monitor, action.target.measurement, action.target!.origin);
    const split: SplitState = new SplitState(view)
    return { ...state, split }
}

const editorPaneAction = (state: MonitorState, action: EditorPaneAction): MonitorState => {
    if (!action.monitor) return resetPaneAction(state);
    if (state.split.isEditorPane() && state.split.pane.monitor == action.monitor) return resetPaneAction(state);

    const split = new SplitState(new EditorPane(action.monitor))
    return { ...state, split }
}

const draftPaneAction = (state: MonitorState, _: DraftPaneAction): MonitorState => {
    const split: SplitState = new SplitState(new EditorPane(null))
    return { ...state, split }
}

const settingsPaneAction = (state: MonitorState) => {
    if (state.split.pane != null && state.split.isSettingsPane()) return resetPaneAction(state);
    
    const split = new SplitState(new SettingsPane())
    return { ...state, split }
}

const accountsPaneAction = (state: MonitorState) => {
    if (state.split.pane != null && state.split.isAccountsPane()) return resetPaneAction(state);

    const split = new SplitState(new AccountsPane())
    return { ...state, split }
}

const logoutAction = () => {
    return { ...monitorDefault };
}

export const monitorReducer = (state: MonitorState, action: MonitorAction): MonitorState => {
    switch (action.type) {
        case "reset": return resetAction(state, action);
        case "queue": return queueMonitorDeleteAction(state, action);
        case "delete": return deleteMonitorAction(state, action);
        case "toggle": return toggleMonitorAction(state, action);
        case "update": return overwriteMonitorAction(state, action);
        case "poll": return pollAction(state, action);
        case "filter": return filterAction(state, action);
        case "select": return selectAction(state, action);
        case "measurement": return addMeasurementAction(state, action);
        case "pane": return paneAction(state, action);
        case "logout": return logoutAction();
    }
}
