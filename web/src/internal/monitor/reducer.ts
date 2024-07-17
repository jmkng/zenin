import { ACTIVE_UI, FilterKind, INACTIVE_UI, Measurement, Monitor } from ".";

export interface MonitorState {
    monitors: Map<number, Monitor>,
    filter: FilterKind,
    visible: Monitor[],
    selected: Monitor[],
    deleting: Monitor[],
    viewing: Monitor | null,
    editing: Monitor | null,
    drafting: boolean,
}

export const monitorDefault: MonitorState = {
    monitors: new Map(),
    filter: "All",
    visible: [],
    selected: [],
    deleting: [],
    viewing: null,
    editing: null,
    drafting: false,
}

const inventoryMaxMeasurements = 40;
const inventoryChunkSize = 5;

type RemoveAction = { type: 'remove', monitors: number[] };
type ToggleAction = { type: 'toggle', monitors: number[], active: boolean };
type DraftAction = { type: 'draft' };
type FilterAction = { type: 'filter', filter: string };
type DeleteAction = { type: 'delete', monitors: Monitor[] };
type EditAction = { type: 'edit', monitor: Monitor | null };
type SelectAction = { type: 'select', monitor: Monitor };
type OverwriteAction = { type: 'overwrite', monitor: Monitor };
type PollAction = { type: 'poll', measurement: Measurement };
type ResetAction = { type: 'reset', monitors: Monitor[] };
type ViewAction = { type: 'view', monitor: Monitor | null };

export type MonitorDispatch = (action: MonitorAction) => void;

export type MonitorAction =
    | RemoveAction
    | ToggleAction
    | DraftAction
    | FilterAction
    | DeleteAction
    | EditAction
    | SelectAction
    | OverwriteAction
    | PollAction
    | ResetAction
    | ViewAction

const removeAction = (state: MonitorState, action: RemoveAction) => {
    const monitors = new Map(state.monitors);
    for (const n of action.monitors) monitors.delete(n);
    const visible = getVisible(monitors, state.filter);
    const editing = state.editing?.id && action.monitors.includes(state.editing.id) ? null : state.editing;
    const viewing = state.viewing?.id && action.monitors.includes(state.viewing.id) ? null : state.viewing;
    const drafting = state.drafting;
    const selected: Monitor[] = [];
    const deleting: Monitor[] = [];
    return { ...state, monitors, visible, viewing, editing, drafting, selected, deleting }
}

const toggleAction = (state: MonitorState, action: ToggleAction) => {
    const monitors = new Map(state.monitors);
    for (const n of action.monitors) {
        const found = monitors.get(n);
        if (!found) {
            console.error(`failed to update active state, monitor not in state: id=${n}`);
            continue;
        }
        found.active = action.active;
    }
    const visible = getVisible(monitors, state.filter);
    const selected: Monitor[] = [];
    const deleting: Monitor[] = [];
    return { ...state, monitors, visible, selected, deleting };
}

const draftAction = (state: MonitorState) => {
    const drafting = true;
    const focused = null;
    const viewing = null;
    return { ...state, drafting, viewing, focused }
}

const filterAction = (state: MonitorState, action: FilterAction) => {
    const filter = action.filter as FilterKind;
    const visible = getVisible(state.monitors, action.filter);
    return { ...state, filter, visible }
}

const deleteAction = (state: MonitorState, action: DeleteAction) => {
    const deleting = action.monitors;
    return { ...state, deleting }
}

const editAction = (state: MonitorState, action: EditAction) => {
    const drafting = false;
    const viewing = null;
    const editing = state.editing == action.monitor ? null : action.monitor;
    return { ...state, drafting, viewing, editing }
}

const selectAction = (state: MonitorState, action: SelectAction) => {
    const selected = state.selected.includes(action.monitor)
        ? state.selected.filter(n => n != action.monitor)
        : [...state.selected, action.monitor];
    return { ...state, selected }
}

const overwriteAction = (state: MonitorState, action: OverwriteAction) => {
    const monitor = action.monitor;
    if (!monitor.id) {
        throw new Error("monitor is missing id in overwrite action");
    }
    const monitors = new Map(state.monitors);
    const target = monitors.get(monitor.id);
    if (target) monitor.measurements = target.measurements; // Recycle the measurement information.
    monitors.set(monitor.id, monitor);
    const editing = monitor;
    const viewing = null;
    const drafting = false;
    const visible = getVisible(monitors, state.filter);
    return { ...state, monitors, editing, viewing, drafting, visible }
}

const pollAction = (state: MonitorState, action: PollAction) => {
    const monitors = new Map(state.monitors);
    if (!action.measurement.monitorId) {
        throw new Error("measurement is missing monitor id in poll action");
    }
    const monitor = monitors.get(action.measurement.monitorId);
    if (!monitor) {
        console.error(`failed to add measurement to monitor, monitor not in state: id=${action.measurement.monitorId}`);
        return state;
    }
    if (monitor.measurements == null) monitor.measurements = [];
    if (monitor.measurements.length >= inventoryMaxMeasurements) {
        const before = monitor.measurements.length;
        monitor.measurements = monitor.measurements.slice(inventoryChunkSize);
        console.log(`trimming measurements: id=${monitor.id}, chunk=${inventoryChunkSize}, before=${before}, after=${monitor.measurements.length}`)
    }
    if (!monitor.measurements.some(n => n.id == action.measurement.id)) monitor.measurements.push(action.measurement);
    return { ...state, monitors }
}

const resetAction = (state: MonitorState, action: ResetAction) => {
    const monitors = getMapped(action.monitors);
    const visible = [...monitors.values()];
    return { ...state, monitors, visible }
}

const viewAction = (state: MonitorState, action: ViewAction) => {
    const drafting = false;
    const viewing = state.viewing == action.monitor ? null : action.monitor;
    const editing = null;
    return { ...state, drafting, viewing, editing }
}

const monitorReducer = (state: MonitorState, action: MonitorAction): MonitorState => {
    switch (action.type) {
        case "remove": return removeAction(state, action);
        case "toggle": return toggleAction(state, action);
        case "overwrite": return overwriteAction(state, action);
        case "poll": return pollAction(state, action);
        case "reset": return resetAction(state, action);
        case "draft": return draftAction(state);
        case "filter": return filterAction(state, action);
        case "delete": return deleteAction(state, action);
        case "edit": return editAction(state, action);
        case "select": return selectAction(state, action);
        case "view": return viewAction(state, action);
    }
}

const getVisible = (monitors: Map<number, Monitor>, filter: string): Monitor[] => {
    let filtered = [...monitors.values()];
    if (filter == ACTIVE_UI) filtered = filtered.filter(n => n.active)
    else if (filter == INACTIVE_UI) filtered = filtered.filter(n => !n.active)
    return filtered;
}

const getMapped = (monitors: Monitor[]): Map<number, Monitor> => {
    const map = new Map<number, Monitor>();
    for (const monitor of monitors) {
        const duplicate: Monitor = { ...monitor };
        if (!duplicate.id) {
            throw new Error(`monitor is missing id in \`getMapped\``);
        }
        // By default, measurement information has the newest at the front.
        // Reverse array here so new measurements can be pushed to the back, since that is most common operation.
        if (monitor.measurements) duplicate.measurements = [...monitor.measurements].reverse();
        map.set(duplicate.id, duplicate);
    }
    return map;
}

export { monitorReducer };
