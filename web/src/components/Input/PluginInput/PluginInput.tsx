import { useMemo } from "react";
import { useMetaContext } from "../../../internal/meta";

import ArrayInput from "../ArrayInput/ArrayInput";
import SelectInput from "../SelectInput/SelectInput";

import "./PluginInput.css";

interface CommonFields {
    subtext?: string | React.ReactNode
}

export interface PluginInputProps {
    plugin: { value: string | null, onChange: (value: string | null) => void, name?: string } & CommonFields,
    args: { value: string[] | null, onChange: (value: string[] | null) => void, name?: string } & CommonFields
}

export default function PluginInput(props: PluginInputProps) {
    const { plugin, args } = props;
    const meta = {
        context: useMetaContext()
    };

    const hasValidArguments = useMemo(() =>
        (args.value == null || args.value.length == 0)
        || (args.value && args.value.length > 0 && args.value.every(n => n.trim() != "")), [args.value]);

    const options = useMemo(() => Array.from(new Set([...meta.context.state.plugins, plugin.value || ""]))
        .map(n => ({ text: n }))
        .filter(n => n.text.trim() != ""), [meta.context.state.plugins]);

    const selection = useMemo(() => plugin.value || meta.context.state.plugins[0], [plugin.value, meta.context.state.plugins])

    return <div className="zenin__plugin_spec">
        <div className="zenin__plugin_spec_control">
            <SelectInput
                name={plugin.name || "zenin__plugin_input_name"}
                label={<span className={selection ? "" : "zenin__h_error"}>Plugin</span>}
                subtext={plugin.subtext}
                value={selection}
                onChange={value => plugin.onChange ? plugin.onChange(value) : {}}
                placeholder="No plugins found"
                options={options}
            />
            {!selection ?
                <span className="zenin__detail_validation zenin__h_error">Plugin selection is required</span>
                :
                null}
        </div>

        <div className="zenin__plugin_spec_control">
            <ArrayInput
                name={args.name || "zenin__plugin_input_arguments"}
                label={<span className={hasValidArguments ? "" : "zenin__h_error"}>Arguments</span>}
                value={args.value ?? []}
                onChange={value => args.onChange(value.length == 0 ? null : value)}
            />
            {!hasValidArguments ?
                <span className="zenin__detail_validation zenin__h_error">Plugin arguments must not be empty</span>
                :
                null}
        </div>
    </div>
}
