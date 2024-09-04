import { Monitor } from ".";
import { Measurement } from "../measurement";

export class SplitState {
    constructor(
        /** The active pane. */
        public pane: ViewPane | EditorPane | SettingsPane | null
    ) {}

    isViewPane(): this is { pane: ViewPane } {
        return this.pane instanceof ViewPane;
    }

    isEditorPane(): this is { pane: EditorPane } {
        return this.pane instanceof EditorPane;
    }

    isSettingsPane(): this is { pane : SettingsPane } {
        return this.pane instanceof SettingsPane;
    }

    /** Return true if any of the provided IDs match the id of the monitor in this state. */
    overlaps(id: number[]): boolean {
        if (this.isViewPane()) {
            return id.includes(this.pane.monitor.id!);
        } else if (this.isEditorPane()) {
            return this.pane.monitor !== null && id.includes(this.pane.monitor.id);
        }
        return false;
    }

    /** Return true if the provided monitor is equal to the monitor in this state. */
    equals(monitor: Monitor): boolean {
        if (this.isViewPane()) {
            return monitor == this.pane.monitor
        } else if (this.isEditorPane()) {
            return this.pane.monitor !== null && monitor == this.pane.monitor
        }
        return false;
    }
}

export class ViewPane {
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

export class EditorPane {
    constructor(
        /** The monitor being modified. Null represents `drafting` a new monitor. */
        public monitor: Monitor | null
    ) {}
}

export class SettingsPane {
    constructor() {}
}

export type OriginState = HeadState | DetachedState;

export type HeadState = "HEAD";

export class DetachedState {
    constructor(
        public date: "DAY" | "WEEK" | "MONTH" | "YEAR"
    ) { }

    toString() {
        switch (this.date) {
            case "DAY": return "Past Day";
            case "WEEK": return "Past Week";
            case "MONTH": return "Past Month";
            case "YEAR": return "Past Year"
        }
    }

    toAfterDate() {
        const today = new Date();
        const target = new Date(today);
        switch (this.date) {
            case "DAY":
                target.setDate(today.getDate() - 1);
                break;
            case "WEEK":
                target.setDate(today.getDate() - 7);
                break;
            case "MONTH":
                target.setMonth(today.getMonth() - 1);
                break;
            case "YEAR":
                target.setFullYear(today.getFullYear() - 1);
                break;
            default:
                throw new Error("invalid measurement date value");
        }
        const month = target.getMonth() + 1;
        const day = target.getDate();
        const year = target.getFullYear();
        return `${month}/${day}/${year}`;
    }
}