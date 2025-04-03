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

    return <div className="list_component" ref={listRef}>
        <div className={["list_intro", data.length == 0 ? "empty" : ""].join(" ")}>
            <span className="list_intro_title">{title}</span>
        </div>

        <div className="list_body">
            {data.map((value, index) =>
                <div
                    className={["list_row", isKeyValueItem(value) ? "pair" : "single"].join(" ")}
                    key={index}
                >
                    {isKeyValueItem(value) ? <Pair item={value} /> : <Single item={value} />}
                </div>)}
        </div>
    </div >
}

function Pair({ item }: { item: KeyValueItem }) {
    return <div className="list_item_container list_pair_item_container">
        <span className="list_map_item_key">{item.key}</span>
        <span className="list_map_item_value">{item.value}</span>
    </div>
}

function Single({ item }: { item: string }) {
    return <div className="list_item_container list_single_item_container">
        <span className="list_array_item">{item}</span>
    </div>
}

function isKeyValueItem(item: ListItem): item is KeyValueItem {
    return typeof item === "object" && "key" in item && "value" in item;
}
