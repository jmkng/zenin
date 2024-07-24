import {FilterKind,Measurement, Monitor } from ".";

export class ViewState {
    constructor(
        /** The monitor being viewed. */
        public target: Monitor,
        /** A measurement within that monitor that has been selected. */
        public subTarget: Measurement | null
    ) {}
}

export class EditorState {
    constructor(
        /** The monitor being modified. Null represents `drafting` a new monitor. */
        public target: Monitor | null
    ) {}
}

export class SplitState {
    constructor(
        /** We can either be viewing a monitor in detail, 
         * editing a monitor, 
         * or neither. */
        public pane: ViewState | EditorState | null
    ) {}

    isViewing(): this is { pane: ViewState } {
        return this.pane instanceof ViewState;
    }

    isEditing(): this is { pane: EditorState } {
        return this.pane instanceof EditorState;
    }

    /** Return true if any of the provided IDs match the id of the monitor in this state. */
    overlaps(id: number[]): boolean {
        if (this.isViewing()) {
            return id.includes(this.pane.target.id!);
        } else if (this.isEditing()) {
            return this.pane.target !== null && id.includes(this.pane.target.id);
        }
        return false;
    }

    /** Return true if the provided monitor is equal to the monitor in this state. */
    equals(monitor: Monitor): boolean {
        if (this.isViewing()) {
            return monitor == this.pane.target
        } else if (this.isEditing()) {
            return this.pane.target !== null && monitor == this.pane.target
        }
        return false;
    }
}

export interface MonitorState {
    monitors: Map<number, Monitor>,
    filter: FilterKind,
    bulk: Monitor[],
    split: SplitState,
    deleting: Monitor[],
}

export const monitorDefault: MonitorState = {
    monitors: new Map(),
    filter: "All",
    bulk: [],
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

type EditAction = { 
    type: 'edit', 
    monitor: Monitor | null 
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

type ViewAction = { 
    type: 'view', 
    target: { 
        monitor: Monitor, 
        measurement: Measurement | null,
        disableToggle?: boolean
    } | null
};

type DetailAction = { type: 'detail', measurement: Measurement | null };

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
    | DetailAction

const removeAction = (state: MonitorState, action: RemoveAction) => {
    const monitors = new Map(state.monitors);
    for (const n of action.monitors) monitors.delete(n);
    
    const bulk: Monitor[] = [];
    const deleting: Monitor[] = [];
    const split = state.split.overlaps(action.monitors) 
        ? null 
        : state.split;
    return { ...state, monitors, bulk, deleting, split } as MonitorState
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
    const bulk: Monitor[] = [];
    const deleting: Monitor[] = [];
    return { ...state, monitors, bulk, deleting };
}

const draftAction = (state: MonitorState) => {
    const editor = new EditorState(null);
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

const editAction = (state: MonitorState, action: EditAction) => {
    let split: SplitState;
    if (!action.monitor || state.split.isEditing() && state.split.pane.target == action.monitor) 
            split = new SplitState(null)
    else split = new SplitState(new EditorState(action.monitor))
    return { ...state, split }
}

const selectAction = (state: MonitorState, action: SelectAction) => {
    const bulk = state.bulk.includes(action.monitor)
        ? state.bulk.filter(n => n != action.monitor)
        : [...state.bulk, action.monitor];
    return { ...state, bulk }
}

const overwriteAction = (state: MonitorState, action: OverwriteAction) => {
    const monitors = new Map(state.monitors);
    const target = monitors.get(action.monitor.id);
    if (target) action.monitor.measurements = target.measurements; // Recycle the measurement information.
    monitors.set(action.monitor.id, action.monitor);
    const split = new SplitState(new EditorState(action.monitor))
    return { ...state, monitors, split }
}

const pollAction = (state: MonitorState, action: PollAction) => {
    const monitors = new Map(state.monitors);
    const monitor = monitors.get(action.measurement.monitorId);
    if (!monitor) {
        console.error(`failed to add measurement to monitor, monitor not in inventory: id=${action.measurement.monitorId}`);
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

const viewAction = (state: MonitorState, action: ViewAction) => {
    if (
        !action.target 
        || (state.split.equals(action.target.monitor) && !action.target.disableToggle)
    ) return { ...state, split: new SplitState(null) };

    const view = new ViewState(action.target.monitor, action.target.measurement);
    const split = new SplitState(view)
    return { ...state, split }
}

const detailAction = (state: MonitorState, action: DetailAction) => {
    if (state.split.isViewing()) {
        const view = new ViewState(state.split.pane.target, action.measurement)
        return {...state, split: new SplitState(view) }
    }
    return state;
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
        case "detail": return detailAction(state, action);
    }
}

export { monitorReducer };
