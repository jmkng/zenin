import { useMemo, useState } from "react";
import { useAccountContext } from "../../internal/account";
import { isArrayEqual, useMonitorContext } from "../../internal/monitor";
import { useSettingsContext } from "../../internal/settings";
import { Settings as SettingsType } from "../../internal/settings/reducer";
import { useDefaultSettingsService } from "../../internal/settings/service";

import Button from "../Button/Button";
import BookIcon from "../Icon/BookIcon";
import BugIcon from "../Icon/BugIcon";
import PairListInput from "../Input/PairListInput/PairListInput";
import SelectInput from "../Input/SelectInput/SelectInput";

import "./Settings.css";

const AUTO = "zenin__theme_auto";
const LIGHT = "zenin__theme_light";
const DARK = "zenin__theme_dark";
const KEY = "zenin__theme";

export default function Settings() {
    const monitor = { context: useMonitorContext() };
    const settings = { context: useSettingsContext(), service: useDefaultSettingsService() };
    const account = { context: useAccountContext() };

    const [theme, setTheme] = useState(localStorage.getItem(KEY) || AUTO);
    const [editor, setEditor] = useState<SettingsType>(settings.context.state);

    // NOTE: May need to convert `settings.context.state` to a common type if the reducer state type
    // deviates from the domain type.
    const hasValidDelimiters = useMemo(() => isValidDelimiters(editor.delimiters), [editor.delimiters])
    const hasValidEditor = useMemo(() => !isSettingsEqual(editor, settings.context.state) && hasValidDelimiters, [editor, settings.context.state])

    const handleSubmit = async () => {
        // Update local storage.
        handleThemeChange(theme);

        const token = account.context.state.authenticated!.token.raw;

        // Save settings to repository.
        const extract = await settings.service.updateSettings(token, editor);
        if (!extract.ok()) return;

        // Update context.
        settings.context.dispatch({ type: 'reset', delimiters: editor.delimiters });
    }

    const handleThemeChange = (value: string) => {
        const root = document.documentElement;
        root.classList.add("static");
        root.classList.remove(DARK)
        root.classList.remove(LIGHT)
        root.classList.remove(AUTO)
        root.classList.add(value);
        setTheme(value)

        if (value == AUTO) localStorage.removeItem(KEY)
        else localStorage.setItem(KEY, value);
        window.requestAnimationFrame(() => root.classList.remove("static"));
    }

    return <div className="zenin__settings">
        <div className="zenin__detail_body">
            <div className="zenin__detail_spaced">
                <SelectInput
                    label="Theme"
                    name={"zenin__settings_theme"}
                    value={theme}
                    options={[
                        { text: "Auto", value: AUTO },
                        { text: "Light", value: LIGHT },
                        { text: "Dark", value: DARK }
                    ]}
                    onChange={value => setTheme(value)}
                />
            </div>
            <div>
                <PairListInput
                    label="Template Delimiters"
                    name="zenin__detail_monitor_http_request_headers"
                    allowMultipleRows={false}
                    value={[{ key: editor.delimiters[0], value: editor.delimiters[1] }]}
                    onChange={delimiters =>
                        setEditor(prev => ({ ...prev, delimiters: [delimiters[0].key, delimiters[0].value] }))}
                />
                {!hasValidDelimiters
                    ? <span className="zenin__detail_validation zenin__h_error">Delimiters are required. They must not contain whitespace.</span>
                    : null}
            </div>
            <div className="zenin__settings_about zenin__h_margin_top">
                <Button background={true} icon={<BookIcon />} kind={"primary"}>
                    <a href="#">User Guide</a>
                </Button>
                <Button background={true} icon={<BugIcon />}>
                    <a href="#">Report Issue</a>
                </Button>
            </div>
        </div>

        <div className="zenin__detail_controls">
            <Button kind="primary" onClick={handleSubmit} disabled={!hasValidEditor}>
                <span>Save</span>
            </Button>

            <Button
                border={true}
                onClick={() => monitor.context.dispatch({ type: 'pane', pane: { type: 'editor', monitor: null } })}
            >
                <span>Close</span>
            </Button>
        </div>
    </div>
}

function isValidDelimiters(delimiters: string[]): boolean {
    // Delimiter strings must not contain whitespace.
    // I'm not sure how text/template would handle them, but seems reasonable.
    const regex = /\s/;
    const d0 = delimiters[0]
    const d1 = delimiters[1]
    if (delimiters.length == 2 && d0.trim() != "" && !regex.test(d0) && d1.trim() != "" && !regex.test(d1)) return true;
    return false
}

const isSettingsEqual = (s1: SettingsType, s2: SettingsType) => {
    if (isArrayEqual(s1.delimiters, s2.delimiters)) return true;
    return false
}
