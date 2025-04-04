import { DEAD_UI, WARN_UI } from "@/internal/monitor";
import { DEAD_API, WARN_API } from "@/internal/server";
import { PluginInputProps } from "../PluginInput";

import Button from "../../Button/Button";
import PluginInput from "../PluginInput";
import SelectInput from "../SelectInput/SelectInput";

import "./EventInput.css";

interface ThresholdProps {
    threshold: { value: string | null, onChange: (value: string | null) => void },
    
    onDelete: () => void
}

type EventInputProps = ThresholdProps & PluginInputProps;

export default function EventInput(props: EventInputProps) {
    const { plugin, args, threshold, onDelete } = props;

    return <div className="event_input input_container">
        <PluginInput
            plugin={{
                name: "event_input_plugin",
                subtext: (<span>Choose a <a href="#">plugin</a> to perform the <a href="#">event</a>.</span>),
                value: plugin.value,
                onChange: plugin.onChange
            }}
            args={{
                name: "event_input_args",
                subtext: "Arguments passed to the plugin.",
                value: args.value,
                onChange: args.onChange
            }}
        />

        <div className="event_input_threshold_container">
            <SelectInput
                label="Threshold"
                name="event_input_threshold"
                value={threshold.value || "NONE"}
                options={[
                    { value: WARN_API, text: WARN_UI },
                    { value: DEAD_API, text: DEAD_UI },
                    { value: "NONE", text: "None" }, // No threshold, converted to null.
                ]}
                subtext={<span>Define an event activation <a href="#">threshold</a>.</span>} /* TODO: Add documentation link. */
                onChange={value => threshold.onChange(value == "NONE" ? null : value)}
            />
            {<span className="event_input_threshold_description">
                {threshold.value == null ? "The event will run for every measurement."
                    : threshold.value == WARN_API ? "The event will run for measurements with a warn or dead state."
                        : "The event will run for measurements with a dead state."}
            </span>}

        </div>

        <div className="event_input_controls">
            <Button border={true} kind="destructive" onClick={onDelete}>Delete</Button>
        </div>
    </div >
}
