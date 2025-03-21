import "./IDWidget.css";

interface IDWidgetProps {
    id: number;
}

export default function IDWidget(props: IDWidgetProps) {
    const { id } = props;

    return <div className="widget id_widget">{id}</div>
}
