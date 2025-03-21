import { useMemo, useState } from "react";

import { useAccountContext } from "@/internal/account";
import { isArrayEqual, useMonitorContext } from "@/internal/monitor";
import {
    DEFAULT_DARK,
    DEFAULT_LIGHT,
    isColorPreference,
    LS_THEME_KEY,
    PREFER_DARK,
    PREFER_LIGHT,
    SettingsState,
    useDefaultSettingsService,
    useSettingsContext
} from "@/internal/settings";
    
import Button from "../../Button/Button";
import PairListInput from "../../Input/PairListInput/PairListInput";
import SelectInput from "../../Input/SelectInput/SelectInput";

import "./Settings.css";

export default function Settings() {
    const monitor = { context: useMonitorContext() };
    const settings = { context: useSettingsContext(), service: useDefaultSettingsService() };
    const account = { context: useAccountContext() };

    // The options displayed in the theme select input are all of the themes available on the server,
    // plus a few default options for managing the built-in theme.
    const options = [DEFAULT_DARK, DEFAULT_LIGHT, ...settings.context.state.themes];

    const [editor, setEditor] = useState<SettingsState>({...settings.context.state });

    const hasValidDelimiters = useMemo(() => isValidDelimiters(editor.delimiters), [editor.delimiters])
    const canSave = useMemo(() => 
        !isSettingsEqual(editor, settings.context.state) 
        && hasValidDelimiters,
    [editor, settings.context.state])


    const handleSave = async () => {
        handleBrowserUpdate(editor.active);
        let theme = editor.active;
        if (theme != null && isColorPreference(theme)) {
            settings.context.dispatch({ type: 'resetActive', active: theme })
            theme = null;
        }

        const token = account.context.state.token!.raw;
        const extract = await settings.service.updateSettings(token, { delimiters: editor.delimiters, theme });
        if (!extract.ok()) return;
        
        settings.context.dispatch({ type: 'reset', ...{ delimiters: editor.delimiters, active: editor.active } });
    }

    const handleBrowserUpdate = (value: string | null) => {
        const root = document.documentElement;

        // Temporarily disable transitions while the theme changes.
        root.classList.add("static");
        root.classList.remove(PREFER_DARK)
        root.classList.remove(PREFER_LIGHT)
        localStorage.removeItem(LS_THEME_KEY);
        if (value == DEFAULT_DARK) {
            root.classList.add(PREFER_DARK)
            localStorage.setItem(LS_THEME_KEY, PREFER_DARK)
        }
        else if (value == DEFAULT_LIGHT) {
            root.classList.add(PREFER_LIGHT)
            localStorage.setItem(LS_THEME_KEY, PREFER_LIGHT)
        }

        window.requestAnimationFrame(() => root.classList.remove("static"));
    }
    
    return <div className="settings">
        <div className="detail_body">
            <div className="h_mb-c">
                <SelectInput
                    label="Theme"
                    name={"settings_theme"}
                    value={editor.active || NULL_THEME}
                    options={[ {text: "Auto", value: NULL_THEME}, ...options.map(n => ({text: n, value: n})) ]}
                    onChange={value => setEditor(prev => ({...prev, active: value == NULL_THEME ? null : value }))}
                />
            </div>
            <div>
                <PairListInput
                    label="Template Delimiters"
                    name="settings_template_delimiters"
                    allowMultipleRows={false}
                    value={[{ key: editor.delimiters[0], value: editor.delimiters[1] }]}
                    onChange={delimiters => 
                        setEditor(prev => ({ ...prev, delimiters: [delimiters[0].key, delimiters[0].value] }))
                    }
                />
                {!hasValidDelimiters
                    ? <span className="detail_validation h_c-dead-a">Delimiters are required. They must not contain whitespace.</span>
                    : null}
            </div>
            <div className="settings_about h_mt-c">
                <a href="#">
                    User Guide
                </a>
                <a href="#">
                    Report Issue
                </a>
            </div>
        </div>

        <div className="detail_controls">
            <Button kind="primary" onClick={handleSave} disabled={!canSave}>
                <span>Save</span>
            </Button>

            <div className="h_ml-auto">
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

const isSettingsEqual = (s1: SettingsState, s2: SettingsState) => {
    if (!isArrayEqual(s1.delimiters, s2.delimiters)) return false;
    if (s1.active != s2.active) return false;
    
    return true;
}

// Value representing a null theme for <SelectInput>.
const NULL_THEME = "__NULL_THEME_VALUE"