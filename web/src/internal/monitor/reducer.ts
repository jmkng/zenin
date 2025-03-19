import { FilterKind, Monitor } from ".";
import { Measurement } from "../measurement";
import { AccountsPane, EditorPane, OriginState, SettingsPane, SplitState, ViewPane } from "./split";

export interface MonitorState {
    monitors: Map<number, Monitor>,
    filter: FilterKind,
    selected: Monitor[],
    split: SplitState,
    deleting: Monitor[],
    plugins: string[],
}

export const monitorDefault: MonitorState = {
    monitors: new Map(),
    filter: "NAME_ASC",
    selected: [],
    split: new SplitState(null),
    deleting: [],
    plugins: []
}

const inventoryMaxMeasurements = 40;
const inventoryChunkSize = 5;

type ResetAction = {
    type: 'reset',
    monitors: Monitor[]
};

type RemoveMonitorAction = {
    type: 'remove',
    monitors: number[]
};

type ToggleMonitorAction = {
    type: 'toggle',
    monitors: number[],
    active: boolean,
    time: string
};

type DeleteMonitorAction = {
    type: 'delete',
    monitors: Monitor[]
};

type OverwriteMonitorAction = {
    type: 'overwrite',
    monitor: Monitor
};

type DraftAction = {
    type: 'draft'
};

type FilterAction = {
    type: 'filter',
    filter: FilterKind
};

type SelectKind = Monitor | "ALL" | "NONE";

type SelectAction = {
    type: 'select',
    monitor: SelectKind
};

type PollAction = {
    type: 'poll',
    measurement: Measurement
};

type DetailAction = {
    type: 'detail',
    measurement: Measurement | null
};

type PaneAction = {
    type: 'pane',
    pane: ViewPaneAction | EditorPaneAction | SettingsPaneAction | AccountsPaneAction
}

type ViewPaneAction = {
    type: 'view',
    target: {
        monitor: Monitor,
        measurement: Measurement | null,
        origin?: OriginState,
        disableToggle?: boolean
    } | null
};

type EditorPaneAction = {
    type: 'editor',
    monitor: Monitor | null
};

type SettingsPaneAction = {
    type: 'settings'
};

type AccountsPaneAction = {
    type: 'accounts'
}

type AddMeasurementAction = {
    type: 'measurement',
    id: number[],
    monitor: number
};

type ResetPluginAction = {
    type: 'resetPlugins'
    plugins: string[]
}

type LogoutAction = {
    type: 'logout'
}

export type MonitorDispatch = (action: MonitorAction) => void;

export type MonitorAction =
    | RemoveMonitorAction
    | ToggleMonitorAction
    | DraftAction
    | FilterAction
    | DeleteMonitorAction
    | SelectAction
    | OverwriteMonitorAction
    | PollAction
    | ResetAction
    | PaneAction
    | DetailAction
    | AddMeasurementAction
    | ResetPluginAction
    | LogoutAction

const removeMonitorAction = (state: MonitorState, action: RemoveMonitorAction) => {
    const monitors = new Map(state.monitors);
    for (const n of action.monitors) monitors.delete(n);

    const selected: Monitor[] = [];
    const deleting: Monitor[] = [];
    const split = state.split.overlaps(action.monitors)
        ? null
        : state.split;
    return { ...state, monitors, selected, deleting, split } as MonitorState
}

const toggleMonitorAction = (state: MonitorState, action: ToggleMonitorAction) => {
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

const draftAction = (state: MonitorState) => {
    const editor = new EditorPane(null);
    const split = new SplitState(editor);
    return { ...state, split }
}

const filterAction = (state: MonitorState, action: FilterAction) => {
    const filter = action.filter;
    return { ...state, filter }
}

const deleteMonitorAction = (state: MonitorState, action: DeleteMonitorAction) => {
    const deleting = action.monitors;
    return { ...state, deleting }
}

const selectAction = (state: MonitorState, action: SelectAction) => {
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

const overwriteMonitorAction = (state: MonitorState, action: OverwriteMonitorAction) => {
    const monitors = new Map(state.monitors);
    const target = monitors.get(action.monitor.id);

    // Recycle the measurement information.
    if (target) action.monitor.measurements = target.measurements;

    monitors.set(action.monitor.id, action.monitor);
    const split = new SplitState(new EditorPane(action.monitor))
    return { ...state, monitors, split }
}

const pollAction = (state: MonitorState, action: PollAction) => {
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
        console.log(`trimming measurements: id=${monitor.id}, chunk=${inventoryChunkSize}, before=${before}, after=${monitor.measurements.length}`)
    }
    if (!monitor.measurements.some(n => n.id == action.measurement.id)) monitor.measurements.push(action.measurement);
    return { ...state, monitors }
}


const resetAction = (state: MonitorState, action: ResetAction) => {
    const monitors = new Map<number, Monitor>();
    for (const monitor of action.monitors) {
        const duplicate: Monitor = { ...monitor };
        // By default, measurement information has the newest at the front.
        // Reverse array here so new measurements can be pushed to the back, since that is most common operation.
        if (monitor.measurements) duplicate.measurements = [...monitor.measurements].reverse();
        monitors.set(duplicate.id, duplicate);
    }

    return { ...state, monitors }
}

const paneAction = (state: MonitorState, action: PaneAction) => {
    switch (action.pane.type) {
        case "view": return viewPaneAction(state, action.pane);
        case "editor": return editorPaneAction(state, action.pane);
        case "settings": return settingsPaneAction(state);
        case "accounts": return accountsPaneAction(state);
    }
}

const viewPaneAction = (state: MonitorState, action: ViewPaneAction) => {
    if (!action.target || (state.split.equals(action.target.monitor) && !action.target.disableToggle))
        return { ...state, split: new SplitState(null) };

    const view = new ViewPane(action.target.monitor, action.target.measurement, action.target.origin);
    const split = new SplitState(view)
    return { ...state, split }
}

const editorPaneAction = (state: MonitorState, action: EditorPaneAction) => {
    let split: SplitState;
    if (!action.monitor || state.split.isEditorPane() && state.split.pane.monitor == action.monitor)
        split = new SplitState(null)
    else split = new SplitState(new EditorPane(action.monitor))
    return { ...state, split }
}

const settingsPaneAction = (state: MonitorState) => {
    let split: SplitState;
    if (state.split.pane != null && state.split.isSettingsPane()) split = new SplitState(null);
    else split = new SplitState(new SettingsPane())
    return { ...state, split }
}

const accountsPaneAction = (state: MonitorState) => {
    let split: SplitState;
    if (state.split.pane != null && state.split.isAccountsPane()) split = new SplitState(null);
    else split = new SplitState(new AccountsPane())
    return { ...state, split }
}

const detailAction = (state: MonitorState, action: DetailAction) => {
    if (state.split.isViewPane()) {
        const view = new ViewPane(state.split.pane.monitor, action.measurement)
        return { ...state, split: new SplitState(view) }
    }
    return state;
}

const addMeasurementAction = (state: MonitorState, action: AddMeasurementAction) => {
    const monitor = state.monitors.get(action.monitor);
    if (!monitor) return state;

    if (monitor.measurements) monitor.measurements = monitor.measurements.filter(n => !action.id.includes(n.id))
    return state;
}

const resetPluginAction = (state: MonitorState, action: ResetPluginAction) => {
    return { ...state, plugins: action.plugins.sort() };
}

const logoutAction = () => {
    return { ...monitorDefault };
}

export const monitorReducer = (state: MonitorState, action: MonitorAction): MonitorState => {
    switch (action.type) {
        case "remove": return removeMonitorAction(state, action);
        case "toggle": return toggleMonitorAction(state, action);
        case "overwrite": return overwriteMonitorAction(state, action);
        case "poll": return pollAction(state, action);
        case "reset": return resetAction(state, action);
        case "draft": return draftAction(state);
        case "filter": return filterAction(state, action);
        case "delete": return deleteMonitorAction(state, action);
        case "select": return selectAction(state, action);
        case "pane": return paneAction(state, action);
        case "detail": return detailAction(state, action);
        case "measurement": return addMeasurementAction(state, action);
        case "resetPlugins": return resetPluginAction(state, action);
        case "logout": return logoutAction();
    }
}
