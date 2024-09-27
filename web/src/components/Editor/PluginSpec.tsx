import { useMemo } from "react";
import { useMetaContext } from "../../internal/meta";

import SelectInput from "../Input/SelectInput/SelectInput"
import TextAreaInput from "../Input/TextAreaInput/TextAreaInput"

import "./PluginSpec.css";

interface ControlFields {
    value: string | null
    name: string,
    label?: string | React.ReactNode,
    subtext?: string | React.ReactNode,

    onChange: (value: string | null) => void
}

interface PluginSpecProps {
    plugin: ControlFields,
    args: {
        placeholder?: string,
    } & ControlFields
}

export default function PluginSpec(props: PluginSpecProps) {
    const { plugin, args } = props;
    const meta = {
        context: useMetaContext()
    };

    const options = useMemo(() => Array.from(new Set([...meta.context.state.plugins, plugin.value || ""]))
        .map(n => ({ text: n })).filter(n => n.text.trim() != ""), [meta.context.state.plugins]);

    return <div className="zenin__plugin_spec">
        <div className="zenin__plugin_spec_control">
            <SelectInput
                label={plugin.label}
                name={plugin.name}
                subtext={plugin.subtext}
                value={plugin.value || meta.context.state.plugins[0]}
                onChange={value => plugin.onChange ? plugin.onChange(value) : {}}
                placeholder="No plugins found"
                options={options}
            />
        </div>
        <div className="zenin__plugin_spec_control">
            <TextAreaInput
                label={args.label}
                name={args.name}
                placeholder={args.placeholder}
                value={args.value}
                subtext={args.subtext}
                onChange={value => args.onChange ? args.onChange(value) : {}}
            />
        </div>
    </div>
}
