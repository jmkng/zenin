import { useAccountContext } from "@/internal/account";
import { isArrayEqual, useMonitorContext } from "@/internal/monitor";
import { SettingsState, useDefaultSettingsService, useSettingsContext } from "@/internal/settings";
import { useMemo, useState } from "react";

import Button from "../../Button/Button";
import PairListInput from "../../Input/PairListInput/PairListInput";
import SelectInput from "../../Input/SelectInput/SelectInput";

import "./Settings.css";

const AUTO = "zenin__theme_auto";
const LIGHT = "zenin__theme_light";
const DARK = "zenin__theme_dark";
const KEY = "zenin__theme";

interface EditorState {
    settings: SettingsState
    theme: string
}

export default function Settings() {
    const monitor = { context: useMonitorContext() };
    const settings = {
        context: useSettingsContext(),
        service: useDefaultSettingsService()
    };
    const account = { context: useAccountContext() };
    const theme = localStorage.getItem(KEY) || AUTO;

    const [editor, setEditor] = useState<EditorState>({ settings: settings.context.state, theme });

    const hasValidDelimiters = useMemo(() => isValidDelimiters(editor.settings.delimiters), [editor.settings.delimiters])
    const canSave = useMemo(() =>
        !isSettingsEqual(editor, { settings: settings.context.state, theme })
        && hasValidDelimiters, [editor, settings.context.state])

    const handleSubmit = async () => {
        // Update local storage.
        handleThemeSave(editor.theme);

        const token = account.context.state.token!.raw;

        // Save settings to repository.
        const extract = await settings.service.updateSettings(token, editor.settings);
        if (!extract.ok()) return;

        // Update context.
        settings.context.dispatch({ type: 'reset', delimiters: editor.settings.delimiters });
    }

    const handleThemeSave = (value: string) => {
        const root = document.documentElement;
        root.classList.add("static");
        root.classList.remove(DARK)
        root.classList.remove(LIGHT)
        root.classList.remove(AUTO)
        root.classList.add(value);

        if (value == AUTO) localStorage.removeItem(KEY)
        else localStorage.setItem(KEY, value);
        window.requestAnimationFrame(() => root.classList.remove("static"));
    }

    return <div className="zenin__settings">
        <div className="zenin__detail_body">
            <div className="zenin__h_mb-c">
                <SelectInput
                    label="Theme"
                    name={"zenin__settings_theme"}
                    value={editor.theme}
                    options={[
                        { text: "Auto", value: AUTO },
                        { text: "Light", value: LIGHT },
                        { text: "Dark", value: DARK }
                    ]}
                    onChange={theme => setEditor(prev => ({ ...prev, theme }))}
                />
            </div>
            <div>
                <PairListInput
                    label="Template Delimiters"
                    name="zenin__detail_monitor_http_request_headers"
                    allowMultipleRows={false}
                    value={[{ key: editor.settings.delimiters[0], value: editor.settings.delimiters[1] }]}
                    onChange={delimiters =>
                        setEditor(prev => ({
                            ...prev,
                            settings: {
                                ...prev.settings, delimiters: [delimiters[0].key, delimiters[0].value]
                            }
                        }))}
                />
                {!hasValidDelimiters
                    ? <span className="zenin__detail_validation zenin__h_c-dead-a">Delimiters are required. They must not contain whitespace.</span>
                    : null}
            </div>
            <div className="zenin__settings_about zenin__h_mt-c">
                <a href="#">
                    User Guide
                </a>
                <a href="#">
                    Report Issue
                </a>
            </div>
        </div>

        <div className="zenin__detail_controls">
            <Button kind="primary" onClick={handleSubmit} disabled={!canSave}>
                <span>Save</span>
            </Button>

            <div className="zenin__h_ml-auto">
                <Button
                    border={true}
                    onClick={() => monitor.context.dispatch({ type: 'pane', pane: { type: 'editor', monitor: null } })}
                >
                    <span>Close</span>
                </Button>
            </div>
        </div>
    </div >
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

const isSettingsEqual = (s1: EditorState, s2: EditorState) => {
    if (isArrayEqual(s1.settings.delimiters, s2.settings.delimiters) && s1.theme == s2.theme) return true;
    return false
}
