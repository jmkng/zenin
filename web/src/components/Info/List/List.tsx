import { ReactNode, useRef } from "react";

import "./List.css";

type ListItem = KeyValueItem | StringItem;

type KeyValueItem = { key: string; value: string | ReactNode };

type StringItem = string;

interface ListProps {
    title: string | ReactNode;
    data: ListItem[]
}

export default function List(props: ListProps) {
    const { title, data } = props;

    const listRef = useRef<HTMLDivElement>(null);

    return <div className="zenin__list_component" ref={listRef}>
        <div className={["zenin__list_intro", data.length == 0 ? 'empty' : ''].join(' ')}>
            <span className="zenin__list_intro_title">{title}</span>
        </div>

        <div className="zenin__list_body">
            {data.map((value, index) =>
                <div
                    className={["zenin__list_row", isKeyValueItem(value) ? "pair" : "single"].join(" ")}
                    key={index}
                >
                    {isKeyValueItem(value) ? <Pair item={value} /> : <Single item={value} />}
                </div>)}
        </div>
    </div >
}

function Pair({ item }: { item: KeyValueItem }) {
    return <div className="zenin__list_item_container zenin__list_pair_item_container">
        <span className="zenin__list_map_item_key">{item.key}</span>
        <span className="zenin__list_map_item_value">{item.value}</span>
    </div>
}

function Single({ item }: { item: string }) {
    return <div className="zenin__list_item_container zenin__list_single_item_container">
        <span className="zenin__list_array_item">{item}</span>
    </div>
}

function isKeyValueItem(item: ListItem): item is KeyValueItem {
    return typeof item === "object" && 'key' in item && 'value' in item;
}
