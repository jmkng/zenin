import { useCallback, useState } from "react";
import { useMonitorContext } from "../../internal/monitor";

import Button from "../Button/Button";
import BookIcon from "../Icon/BookIcon";
import BugIcon from "../Icon/BugIcon";
import SelectInput from "../Input/SelectInput/SelectInput";

import "./Settings.css";

const AUTO = "zenin__theme_auto";
const LIGHT = "zenin__theme_light";
const DARK = "zenin__theme_dark";
const KEY = "zenin__theme";

export default function Settings() {
    const [theme, setTheme] = useState(localStorage.getItem(KEY) || AUTO);
    const monitor = {
        context: useMonitorContext(),
    }

    const handleSubmit = useCallback(() => {
        handleThemeChange(theme);
    }, [theme])

    const handleThemeChange = (value: string) => {
        const root = document.documentElement;
        root.classList.add("layout-static");
        root.classList.remove(DARK)
        root.classList.remove(LIGHT)
        root.classList.remove(AUTO)
        root.classList.add(value);
        setTheme(value)
        if (value == AUTO) localStorage.removeItem(KEY)
        else localStorage.setItem(KEY, value);
        window.requestAnimationFrame(() => root.classList.remove("layout-static"));
    }

    return <div className="zenin__settings">
        <div className="zenin__detail_body">
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
            <div className="zenin__settings_about zenin__h_margin_top">
                <span className="zenin__settings_version">0.1.0</span>
                {/* TODO: links */}
                <a href="#" className="zenin__settings_link">
                    <BookIcon />
                    User Guide
                </a>
                <a href="#" className="zenin__settings_link">
                    <BugIcon />
                    Report Issue
                </a>
            </div>
        </div>

        <div className="zenin__detail_controls">
            <Button kind="primary" onClick={handleSubmit}>
                <span>Save</span>
            </Button>

            <Button
                border={true}
                onClick={() => monitor.context.dispatch({ type: 'pane', pane: { type: 'editor', monitor: null } })}
            >
                <span>Close</span>
            </Button>
        </div>
    </div >
}