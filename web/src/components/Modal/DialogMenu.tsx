import "./DialogMenu.css";

export interface DialogGroup {
    items: DialogItem[];
}

export interface DialogItem {
    text: string;
    icon?: React.ReactNode;
    disabled?: boolean;
    destructive?: boolean;
    onClick: (event: React.MouseEvent) => void;
}

interface DialogMenuProps {
    content: DialogGroup[] | DialogItem[];
    onItemClick?: () => void;
}

export default function DialogMenuComponent(props: DialogMenuProps) {
    const { content, onItemClick } = props;

    return <div className="zenin__dialog_menu zenin__dialog">
        <ul className="zenin__dialog_menu_list">
            {content.every(isDialogGroup)
                ? content.map((group, index) => <div key={index} className="zenin__dialog_menu_group">
                    {group.items.map((item, index) => renderItem(index, item, onItemClick))}
                    {index < content.length - 1
                        ? <div className="zenin__dialog_menu_group_border" />
                        : null}
                </div>)
                : content.map((item, index) => renderItem(index, item, onItemClick))}
        </ul>
    </div >
}

function isDialogGroup(obj: DialogGroup | DialogItem): obj is DialogGroup {
    return obj && Array.isArray((obj as DialogGroup).items);
}

function renderItem(index: number, item: DialogItem, onItemClick?: () => void) {
    return <li
        className={[
            "zenin__dialog_menu_item",
            item.disabled ? 'disabled' : '',
            item.destructive ? 'destructive' : '',
        ].join(' ')}
        key={index}
        onClick={event => {
            if (onItemClick) onItemClick();
            item.onClick(event);
        }}
    >
        {item.icon && <span className="zenin__dialog_menu_icon_container zenin__h_center">{item.icon}</span>}
        <span>{item.text}</span>
    </li>
}
