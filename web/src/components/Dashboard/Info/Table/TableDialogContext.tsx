import { OriginState, DetachedState } from "@/internal/monitor/split";

import Button from "../../../Button/Button";

interface TableDialogContentProps {
    onDateChange: (state: OriginState) => void;
}

export default function TableDialogContent(props: TableDialogContentProps) {
    const { onDateChange } = props;

    return <div className="zenin__table_dialog_content zenin__dialog_content">
        <div className="zenin__dialog_section">
            <Button onClick={() => onDateChange("HEAD")}>
                Most Recent
            </Button>
            <Button onClick={() => onDateChange(new DetachedState("DAY"))}>
                Past Day
            </Button>
            <Button onClick={() => onDateChange(new DetachedState("WEEK"))}>
                Past Week
            </Button>
            <Button onClick={() => onDateChange(new DetachedState("MONTH"))}>
                Past Month
            </Button>
            <Button onClick={() => onDateChange(new DetachedState("YEAR"))}>
                Past Year
            </Button>
        </div>
    </div>
}
