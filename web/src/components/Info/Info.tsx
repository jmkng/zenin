import { useMonitorContext } from "../../internal/monitor"
import { ViewState } from "../../internal/monitor/reducer";

import Button from "../Button/Button";
import TableComponent from "./Table/Table";
import ExpandComponent from "./Expand/Expand";
import SummaryComponent from "./Summary/Summary";

import "./Info.css"

interface InfoProps {
    state: ViewState
}

export default function InfoComponent(props: InfoProps) {
    const { state } = props;
    const monitor = {
        context: useMonitorContext()
    }
    const reversed = (state.target.measurements || [])
        .toReversed();

    return (
        <div className="zenin__info_component">
            <div className="zenin__info_component_body">
                <h1 className="zenin__info_name">{state.target.name}</h1>

                <ExpandComponent title={"Description"} text={"wassup homie Lorem   dolor sit amet, consectetur adipiscing elit. Cras ac metus lectus. Morbi commodo, est sed fermentum imperdiet, magna risus interdum ex, sed pellentesque augue eros vitae lectus. Etiam a nisi facilisis sapien gravida aliquet. Maecenas ullamcorper, est sed dictum vulputate, felis justo elementum nulla, vitae laoreet nisi lectus ut odio. Duis elementum odio et felis maximus, nec luctus ligula vulputate. Cras porta vestibulum tortor ut facilisis. Ut sed egestas est. In hac habitasse platea dictumst. Sed ut egestas magna. Ut lobortis ipsum sed tempor euismod. Fusce odio dui, feugiat rhoncus dolor sed, suscipit volutpat dui. Morbi venenatis vitae ante et pharetra. Curabitur pretium viverra orci vel egestas. Phasellus dapibus, justo suscipit egestas tristique, purus ipsum condimentum mauris, ut tristique diam odio sit amet tortor. ut tristique diam odio sit amet tortor. ut tristique diam odio sit amet tortor. ut tristique diam odio sit amet tortor. ut tristique diam odio sit amet tortor. ut tristique diam odio sit amet tortor. ut tristique diam odio sit amet tortor. ut tristique diam odio sit amet tortor. ut tristique diam odio sit amet tortor. ut tristique diam odio sit amet tortor. ut tristique diam odio sit amet tortor. ut tristique diam odio sit amet tortor. ut tristique diam odio sit amet tortor. ut tristique diam odio sit amet tortor. ut tristique diam odio sit amet tortor. ut tristique diam odio sit amet tortor."} />
                <div className="zenin__info_summary_container">
                    <SummaryComponent measurements={reversed} />
                </div>
                <div className="zenin__info_table_container">
                    <TableComponent measurements={reversed} selected={state.subTarget} />
                </div>
            </div>

            <div className="zenin__detail_controls">
                <Button
                    kind="primary"
                    onClick={() => monitor.context.dispatch({ type: 'edit', monitor: state.target })}>
                    <span>Edit</span>
                </Button>
                <Button
                    border={true}
                    onClick={() => monitor.context.dispatch({ type: 'view', target: null })}>
                    <span>Close</span>
                </Button>
            </div>
        </div >
    )
}
