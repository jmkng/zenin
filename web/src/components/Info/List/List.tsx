import "./List.css";
import InfoIcon from "../../Icon/InfoIcon/InfoIcon";

type ListItem = KeyValueItem | StringItem;

type KeyValueItem = { key: string; value: string };

type StringItem = string;

interface ListProps {
    title: string;
    data: ListItem[]
}

export default function ListComponent(props: ListProps) {
    const { title, data } = props;

    return (
        <div className="zenin__list_component">
            <div className="zenin__list_intro">
                <span className="zenin__list_intro_title">{title}</span>

                <div className="zenin__list_intro_help_button">
                    <InfoIcon />
                </div>
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
        </div>
    )
}

function Pair({ item }: { item: KeyValueItem }) {
    return (
        <div className="zenin__list_item_container zenin__list_pair_item_container">
            <span className="zenin__list_map_item_key">{item.key}</span>
            <span className="zenin__list_map_item_value">{item.value}</span>
        </div>
    )
}

function Single({ item }: { item: string }) {
    return (
        <div className="zenin__list_item_container zenin__list_single_item_container">
            <span className="zenin__list_array_item">{item}</span>
        </div>
    )
}

function isKeyValueItem(item: ListItem): item is KeyValueItem {
    return typeof item === "object"
        && 'key' in item && 'value' in item;
}
