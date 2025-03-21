import { useContext } from "react";
import SettingsProvider, { SettingsContext, SettingsDispatchContext } from "./context";

/** The expected localstorage key name. */
export const LS_THEME_KEY = "color-preference"; // *** If the value of LS_THEME_KEY changes, update index.html too! ***

// Flags that indicate user color preference.
export const PREFER_DARK = "prefer-dark";
export const PREFER_LIGHT = "prefer-light";

// Flags that indicate environment color preference.
// Lower priority than PREFER_* flags.
export const OS_DARK = "os-dark";
export const OS_LIGHT = "os-light";

// Default theme names.
export const DEFAULT_DARK = "Default Dark";
export const DEFAULT_LIGHT = "Default Light";
export type ColorPreference = typeof DEFAULT_DARK | typeof DEFAULT_LIGHT;

export function isColorPreference(value: string): value is ColorPreference {
    return value == DEFAULT_DARK || value == DEFAULT_LIGHT;
}

/** Return the current user color preference. */
export const userColorPreference = (): ColorPreference | null => {
    const value = localStorage.getItem(LS_THEME_KEY);
    if (value == PREFER_DARK) return DEFAULT_DARK;
    if (value == PREFER_LIGHT) return DEFAULT_LIGHT;
    return null;
}

export interface Settings {
    delimiters: string[],
    theme: string | null
}

export const useSettingsContext = () => {
    const state = useContext(SettingsContext);
    const dispatch = useContext(SettingsDispatchContext);
    if (!state || !dispatch) throw new Error('settings context must be used within provider');
    return { state, dispatch }
}

export type { SettingsState } from "./reducer";
export { useDefaultSettingsService } from "./service";
export { SettingsProvider };
