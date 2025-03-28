import { useMemo } from "react";

import { useMonitorContext } from "@/internal/monitor";
import ArrayInput from "./ArrayInput/ArrayInput";
import SelectInput from "./SelectInput/SelectInput";

interface CommonFields {
    subtext?: string | React.ReactNode
}

export interface PluginInputProps {
    plugin: { value: string | null, onChange: (value: string | null) => void, name?: string } & CommonFields,
    args: { value: string[] | null, onChange: (value: string[] | null) => void, name?: string } & CommonFields
}

export default function PluginInput(props: PluginInputProps) {
    const { plugin, args } = props;
    const monitor = { context: useMonitorContext() };

    const hasValidArguments = useMemo(() =>
        (args.value == null || args.value.length == 0)
        || (args.value && args.value.length > 0 && args.value.every(n => n.trim() != "")), [args.value]);

    const options = useMemo(() => Array.from(new Set([...monitor.context.state.plugins, plugin.value || ""]))
        .map(n => ({ text: n, value: n }))
        .filter(n => n.text.trim() != ""), [monitor.context.state.plugins]);

    const selection = useMemo(() => plugin.value || monitor.context.state.plugins[0], 
    [plugin.value, monitor.context.state.plugins]);

    return <div className="plugin_spec">
        <div className="plugin_spec_control">
            <SelectInput
                name={plugin.name || "plugin_input_name"}
                label={<span className={selection ? "" : "h_c-dead-a"}>Plugin</span>}
                subtext={plugin.subtext}
                value={selection}
                onChange={value => plugin.onChange ? plugin.onChange(value) : {}}
                placeholder="No plugins found"
                options={options}
            />
            {!selection ?
                <span className="detail_validation h_c-dead-a">Plugin selection is required.</span>
                :
                null}
        </div>

        <div className="plugin_spec_control">
            <ArrayInput
                name={args.name || "plugin_input_arguments"}
                label={<span className={hasValidArguments ? "" : "h_c-dead-a"}>Arguments</span>}
                value={args.value ?? []}
                onChange={value => args.onChange(value.length == 0 ? null : value)}
            />
            {!hasValidArguments ?
                <span className="detail_validation h_c-dead-a">Plugin arguments must not be empty.</span>
                :
                null}
        </div>
    </div>
}
