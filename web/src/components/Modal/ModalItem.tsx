export interface ModalAttached {
    flag: "attached"
    content: ModalGroup[] | ModalItem[]
}

export interface ModalGroup {
    items: ModalItem[]
}

export function isAttached(obj: ModalAttached | ModalFloating): obj is ModalAttached {
    return obj && obj.flag == "attached"
}

export function isGroup(obj: ModalGroup | ModalItem): obj is ModalGroup {
    return obj && Array.isArray((obj as ModalGroup).items);
}

export interface ModalFloating {
    flag: "floating",
    title: string
    content: React.ReactNode
}

export function isFloating(obj: ModalAttached | ModalFloating): obj is ModalFloating {
    return obj && obj.flag == "floating"
}

export interface ModalItem {
    text: string;
    icon?: React.ReactNode
    disabled?: boolean
    destructive?: boolean
    onClick: (event: React.MouseEvent) => void;
}
