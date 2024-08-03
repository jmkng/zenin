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