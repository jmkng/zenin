import { FilterKind, Monitor } from ".";
import { Measurement } from "../measurement";
import { EditorPane, OriginState, SettingsPane, SplitState, ViewPane } from "./split";

export interface MonitorState {
    monitors: Map<number, Monitor>,
    filter: FilterKind,
    selected: Monitor[],
    split: SplitState,
    deleting: Monitor[],
}

export const monitorDefault: MonitorState = {
    monitors: new Map(),
    filter: "All",
    selected: [],
    split: new SplitState(null),
    deleting: [],
}

const inventoryMaxMeasurements = 40;
const inventoryChunkSize = 5;

type RemoveAction = { 
    type: 'remove', 
    monitors: number[] 
};

type ToggleAction = { 
    type: 'toggle', 
    monitors: number[], 
    active: boolean 
};

type DraftAction = { 
    type: 'draft' 
};

type FilterAction = { 
    type: 'filter', 
    filter: string 
};

type DeleteAction = { 
    type: 'delete', 
    monitors: Monitor[] 
};

type SelectAction = { 
    type: 'select', 
    monitor: Monitor 
};

type OverwriteAction = { 
    type: 'overwrite', 
    monitor: Monitor 
};

type PollAction = { 
    type: 'poll', 
    measurement: Measurement 
};

type ResetAction = { 
    type: 'reset', 
    monitors: Monitor[] 
};

type PaneAction = {
    type: 'pane',
    pane: ViewPaneAction | EditorPaneAction | SettingsPaneAction
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

type DetailAction = { type: 'detail', measurement: Measurement | null };

export type MonitorDispatch = (action: MonitorAction) => void;

export type MonitorAction =
    | RemoveAction
    | ToggleAction
    | DraftAction
    | FilterAction
    | DeleteAction
    | SelectAction
    | OverwriteAction
    | PollAction
    | ResetAction
    | PaneAction
    | DetailAction

const removeAction = (state: MonitorState, action: RemoveAction) => {
    const monitors = new Map(state.monitors);
    for (const n of action.monitors) monitors.delete(n);
    
    const selected: Monitor[] = [];
    const deleting: Monitor[] = [];
    const split = state.split.overlaps(action.monitors) 
        ? null 
        : state.split;
    return { ...state, monitors, selected, deleting, split } as MonitorState
}

const toggleAction = (state: MonitorState, action: ToggleAction) => {
    const monitors = new Map(state.monitors);
    for (const n of action.monitors) {
        const found = monitors.get(n);
        if (!found) {
            console.error(`failed to update active state, monitor not in inventory: id=${n}`);
            continue;
        }
        found.active = action.active;
    }
    return { ...state, monitors, selected: [], deleting: [] };
}

const draftAction = (state: MonitorState) => {
    const editor = new EditorPane(null);
    const split = new SplitState(editor);
    return { ...state, split }
}

const filterAction = (state: MonitorState, action: FilterAction) => {
    const filter = action.filter as FilterKind;
    return { ...state, filter }
}

const deleteAction = (state: MonitorState, action: DeleteAction) => {
    const deleting = action.monitors;
    return { ...state, deleting }
}

const selectAction = (state: MonitorState, action: SelectAction) => {
    const selected = state.selected.includes(action.monitor)
        ? state.selected.filter(n => n != action.monitor)
        : [...state.selected, action.monitor];
    return { ...state, selected }
}

const overwriteAction = (state: MonitorState, action: OverwriteAction) => {
    const monitors = new Map(state.monitors);
    const target = monitors.get(action.monitor.id);
    if (target) action.monitor.measurements = target.measurements; // Recycle the measurement information.
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
        case "view":
            return viewPaneAction(state, action.pane);
        case "editor":
            return editorPaneAction(state, action.pane);
        case "settings":
            return settingsPaneAction(state);
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

const detailAction = (state: MonitorState, action: DetailAction) => {
    if (state.split.isViewPane()) {
        const view = new ViewPane(state.split.pane.monitor, action.measurement)
        return {...state, split: new SplitState(view) }
    }
    return state;
}

export const monitorReducer = (state: MonitorState, action: MonitorAction): MonitorState => {
    switch (action.type) {
        case "remove": return removeAction(state, action);
        case "toggle": return toggleAction(state, action);
        case "overwrite": return overwriteAction(state, action);
        case "poll": return pollAction(state, action);
        case "reset": return resetAction(state, action);
        case "draft": return draftAction(state);
        case "filter": return filterAction(state, action);
        case "delete": return deleteAction(state, action);
        case "select": return selectAction(state, action);
        case "pane": return paneAction(state, action);
        case "detail": return detailAction(state, action);
    }
}