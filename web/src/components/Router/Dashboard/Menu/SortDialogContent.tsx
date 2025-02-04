import { FilterKind, NAME_ASC_UI, NAME_DESC_UI, UPDATED_NEW_UI, UPDATED_OLD_UI } from "../../../../internal/monitor";

import Button from "../../Button/Button";
import CheckIcon from "../../Icon/CheckIcon";

interface SortDialogContentProps {
    filter: FilterKind

    onFilterChange: (filter: FilterKind) => void
}

export default function SortDialogContent(props: SortDialogContentProps) {
    const { filter, onFilterChange } = props;

    return <div className="zenin__sort_dialog_content zenin__dialog_content">
        <div className="zenin__sort_dialog_section zenin__dialog_section">
            <Button
                disabled={filter == 'NAME_ASC'}
                onClick={() => onFilterChange('NAME_ASC')}
                icon={filter === 'NAME_ASC' ? <CheckIcon /> : null}
            >
                {NAME_ASC_UI}
            </Button>
            <Button
                disabled={filter == 'NAME_DESC'}
                onClick={() => onFilterChange('NAME_DESC')}
                icon={filter === 'NAME_DESC' ? <CheckIcon /> : null}
            >
                {NAME_DESC_UI}
            </Button>
        </div>
        <div className="zenin__sort_dialog_section zenin__dialog_section">
            <Button
                disabled={filter == 'UPDATED_NEW'}
                onClick={() => onFilterChange('UPDATED_NEW')}
                icon={filter === 'UPDATED_NEW' ? <CheckIcon /> : null}
            >
                {UPDATED_NEW_UI}
            </Button>
            <Button
                disabled={filter == 'UPDATED_OLD'}
                onClick={() => onFilterChange('UPDATED_OLD')}
                icon={filter === 'UPDATED_OLD' ? <CheckIcon /> : null}
            >
                {UPDATED_OLD_UI}
            </Button>
        </div>
    </div>
}
