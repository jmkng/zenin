import { useMemo } from "react";
import { useMetaContext } from "../../../internal/meta";

import ArrayInput from "../ArrayInput/ArrayInput";
import SelectInput from "../SelectInput/SelectInput";

import "./PluginInput.css";

interface CommonFields {
    subtext?: string | React.ReactNode
}

interface PluginSpecProps {
    plugin: { value: string | null, onChange: (value: string | null) => void } & CommonFields,
    args: { value: string[] | null, onChange: (value: string[] | null) => void } & CommonFields
}

export default function PluginInput(props: PluginSpecProps) {
    const { plugin, args } = props;
    const meta = {
        context: useMetaContext()
    };

    const options = useMemo(() =>
        Array.from(new Set([...meta.context.state.plugins, plugin.value || ""]))
            .map(n => ({ text: n })).filter(n => n.text.trim() != ""), [meta.context.state.plugins]);

    return <div className="zenin__plugin_spec">
        <div className="zenin__plugin_spec_control">
            <SelectInput
                name="zenin__plugin_input_name"
                label="Plugin"
                subtext={plugin.subtext}
                value={plugin.value || meta.context.state.plugins[0]}
                onChange={value => plugin.onChange ? plugin.onChange(value) : {}}
                placeholder="No plugins found"
                options={options}
            />
        </div>
        <div className="zenin__plugin_spec_control">
            <ArrayInput
                name="zenin__plugin_input_arguments"
                label="Arguments"
                value={args.value ?? []}
                onChange={value => args.onChange(value)}
            />
        </div>
    </div>
}
