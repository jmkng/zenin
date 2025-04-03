import { useAccountContext } from "@/hooks/useAccount";
import { useMonitorContext } from "@/hooks/useMonitor";
import { useNotify } from "@/hooks/useNotify";
import { useSettings } from "@/hooks/useSettings";
import { formatTheme } from "@/internal/layout/graphics";
import { isArrayEqual } from "@/internal/monitor";
import { isErrorPacket } from "@/internal/server";
import { DEFAULT_DARK, DEFAULT_LIGHT, SettingsState, THEME_ATTR, THEME_BLOCK_ID } from "@/internal/settings";
import { useEffect, useMemo, useRef, useState } from "react";
    
import Button from "../../Button/Button";
import PairListInput from "../../Input/PairListInput/PairListInput";
import SelectInput from "../../Input/SelectInput/SelectInput";

import "./Settings.css";

export default function Settings() {
    const monitorContext = useMonitorContext();
    const { service: settingsService, context: settingsContext } = useSettings();
    const accountContext = useAccountContext();
    const notify = useNotify();
    const errorsContainerRef = useRef<HTMLDivElement>(null);

    // The options displayed in the theme select input are all of the themes available on the server,
    // plus a few default options for managing the built-in theme.
    const options = [DEFAULT_DARK, DEFAULT_LIGHT, ...settingsContext.state.themes];

    const [editor, setEditor] = useState<SettingsState>({...settingsContext.state });
    const [errors, setErrors] = useState<string[]>([]);

    const hasValidDelimiters = useMemo(() => isValidDelimiters(editor.delimiters), [editor.delimiters])
    const canSave = useMemo(() => 
        !isSettingsEqual(editor, settingsContext.state) 
        && hasValidDelimiters,
    [editor, settingsContext.state])

    useEffect(() => {
        if (errors.length > 0) errorsContainerRef.current?.scrollIntoView({behavior: "smooth", block: "start"});
    }, [errors]);
    
    async function save() {
        const delimiters = editor.delimiters;
        let active = editor.active;

        const extract = await settingsService.updateSettings(accountContext.state.token!.raw, { delimiters, theme: active });
        if (!extract.ok()) {
            const body = await extract.json();
            if (isErrorPacket(body)) setErrors(body.errors);
            return
        };

        const ok = await tryLoadTheme(active);
        
        const themes = settingsContext.state.themes;
        settingsContext.dispatch({ type: "reset", state: { delimiters, active, themes } });
        if (ok) setErrors([]);
        notify("Settings saved.");
    }

    async function tryLoadTheme(name: string | null): Promise<boolean> {
        const root = document.documentElement;

        if (name) root.setAttribute(THEME_ATTR, formatTheme(name));
        else root.removeAttribute(THEME_ATTR);
        
        if (isDefaultTheme(name)) {
            cleanStyleSheets();
            return true;
        } 
        
        const extract = await settingsService.getActiveTheme(true);
        if (!extract.ok()) {
            if (extract.status() == 404) {
                setErrors(["Theme file was not found, reverted to default theme."])
            } else {
                const body = await extract.json();
                if (isErrorPacket(body)) setErrors(body.errors);
            }
            cleanStyleSheets();
            return false
        };
        
        const css = await extract.response.text();
        const styleSheet = new CSSStyleSheet();
        await styleSheet.replace(css);
        cleanStyleSheets();
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, styleSheet]

        return true;
    }

    async function reloadTheme(name: string | null) {
        const ok = tryLoadTheme(name);
        if (!ok) return;
        setErrors([]);
    }

    function cleanStyleSheets() {
        const ss = document.getElementById(THEME_BLOCK_ID)
        if (ss) ss.parentNode?.removeChild(ss);
        document.adoptedStyleSheets = [];
    }
    
    return <div className="settings">
        <div className="detail_body">
            <h1 className="h_m-0">Settings</h1>
            
            <div className="h_mt-c">
                <SelectInput
                    label="Theme"
                    name={"settings_theme"}
                    value={editor.active || NULL_THEME}
                    options={[ {text: "Auto", value: NULL_THEME}, ...options.map(n => ({text: n, value: n})) ]}
                    onChange={value => setEditor(prev => ({...prev, active: value == NULL_THEME ? null : value }))}
                />
                <div className="settings_reload_theme">
                    <Button 
                        border={true} 
                        disabled={isDefaultTheme(settingsContext.state.active)}
                        onClick={() => reloadTheme(settingsContext.state.active)}
                    >Reload Theme</Button>
                </div>
            </div>

            <div className="h_mt-c">
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

            <div className="settings_message_container" ref={errorsContainerRef}>
                {errors.map((n, index) => <div key={index} className="settings_message error h_mt-c">{n}</div>)}
            </div>
        </div>

        <div className="detail_controls">
            <Button kind="primary" onClick={save} disabled={!canSave}>
                <span>Save</span>
            </Button>

            <div className="h_ml-auto">
                <Button
                    border={true}
                    onClick={() => monitorContext.dispatch({ type: 'pane', pane: { type: 'editor', monitor: null } })}
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

const isDefaultTheme = (name: string | null) => name == null || name == DEFAULT_DARK || name == DEFAULT_LIGHT;

// Value representing a null theme for <SelectInput>.
const NULL_THEME = "__NULL_THEME_VALUE"