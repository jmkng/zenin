import { useMemo, useState } from "react";

import { useAccountContext } from "@/internal/account";
import { isArrayEqual, useMonitorContext } from "@/internal/monitor";
import {
    ColorPreference,
    DEFAULT_DARK_THEME_NAME,
    DEFAULT_LIGHT_THEME_NAME,
    isColorPreference,
    LS_THEME_KEY,
    PREFER_DARK_CLASS,
    PREFER_LIGHT_CLASS,
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
    const options = [DEFAULT_DARK_THEME_NAME, DEFAULT_LIGHT_THEME_NAME, ...settings.context.state.themes];

    const [editor, setEditor] = useState<SettingsState>({...settings.context.state });

    console.log(editor);

    const hasValidDelimiters = useMemo(() => isValidDelimiters(editor.delimiters), [editor.delimiters])
    const canSave = useMemo(() => 
        !isSettingsEqual(editor, settings.context.state) 
        && hasValidDelimiters,
    [editor, settings.context.state])


    const handleSave = async () => {
        handleBrowserUpdate(editor.colorPreference);
        settings.context.dispatch({ type: 'resetColorPreference', colorPreference: editor.colorPreference });

        const token = account.context.state.token!.raw;
        const extract = await settings.service.updateSettings(token, { delimiters: editor.delimiters, theme: editor.active });
        if (!extract.ok()) return;
        
        settings.context.dispatch({ type: 'reset', ...{ delimiters: editor.delimiters, active: editor.active } });
    }

    const handleBrowserUpdate = (value: ColorPreference | null) => {
        const root = document.documentElement;

        // Temporarily disable transitions while the theme changes.
        root.classList.add("static");

        root.classList.remove(PREFER_DARK_CLASS)
        root.classList.remove(PREFER_LIGHT_CLASS)
        localStorage.removeItem(LS_THEME_KEY);
        if (value == DEFAULT_DARK_THEME_NAME) {
            root.classList.add(PREFER_DARK_CLASS)
            localStorage.setItem(LS_THEME_KEY, PREFER_DARK_CLASS)
        }
        else if (value == DEFAULT_LIGHT_THEME_NAME) {
            root.classList.add(PREFER_LIGHT_CLASS)
            localStorage.setItem(LS_THEME_KEY, PREFER_LIGHT_CLASS)
        }

        window.requestAnimationFrame(() => root.classList.remove("static"));
    }

    const handleThemeSelectionUpdate = (value: string) => {
        if (isColorPreference(value)) {
            setEditor(prev => ({ ...prev, colorPreference: value, active: null }));
            return;
        }
        setEditor(prev => ({...prev, active: value, colorPreference: null}));
    }
    
    return <div className="zenin__settings">
        <div className="zenin__detail_body">
            <div className="zenin__h_mb-c">
                <SelectInput
                    label="Theme"
                    name={"zenin__settings_theme"}
                    value={editor.active || editor.colorPreference || NULL_THEME}
                    options={[ {text: "Auto", value: NULL_THEME}, ...options.map(n => ({text: n, value: n})) ]}
                    onChange={handleThemeSelectionUpdate}
                />
            </div>
            <div>
                <PairListInput
                    label="Template Delimiters"
                    name="zenin__settings_template_delimiters"
                    allowMultipleRows={false}
                    value={[{ key: editor.delimiters[0], value: editor.delimiters[1] }]}
                    onChange={delimiters => 
                        setEditor(prev => ({ ...prev, delimiters: [delimiters[0].key, delimiters[0].value] }))
                    }
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
            <Button kind="primary" onClick={handleSave} disabled={!canSave}>
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

const isSettingsEqual = (s1: SettingsState, s2: SettingsState) => {
    if (!isArrayEqual(s1.delimiters, s2.delimiters)) return false;
    if (s1.active != s2.active) return false;
    if (s1.colorPreference != s2.colorPreference) return false;
    
    return true;
}

// Value representing a null theme for <SelectInput>.
const NULL_THEME = "__NULL_THEME_VALUE"