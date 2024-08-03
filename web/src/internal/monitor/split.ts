import { Monitor } from ".";
import { Measurement } from "../measurement";
import { OriginState } from "./origin";

export class ViewState {
    constructor(
        /** The monitor being viewed. */
        public monitor: Monitor,
        /** A measurement within that monitor that has been selected. */
        public selected: Measurement | null,
        /** Tracks the query that resulted in this state.
         * `Head` means we are tracking the most recent data for a monitor,
         * `Detached` means we are looking at historical data. */
        public origin: OriginState = "HEAD"
    ) {}
}

export class EditorState {
    constructor(
        /** The monitor being modified. Null represents `drafting` a new monitor. */
        public monitor: Monitor | null
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
            return id.includes(this.pane.monitor.id!);
        } else if (this.isEditing()) {
            return this.pane.monitor !== null && id.includes(this.pane.monitor.id);
        }
        return false;
    }

    /** Return true if the provided monitor is equal to the monitor in this state. */
    equals(monitor: Monitor): boolean {
        if (this.isViewing()) {
            return monitor == this.pane.monitor
        } else if (this.isEditing()) {
            return this.pane.monitor !== null && monitor == this.pane.monitor
        }
        return false;
    }
}