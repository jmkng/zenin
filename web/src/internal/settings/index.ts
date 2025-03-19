import { useContext } from "react";
import SettingsProvider, { SettingsContext, SettingsDispatchContext } from "./context";

/** The expected localstorage key name. */
export const LS_THEME_KEY = "zenin__theme"; // *** If the value of LS_THEME_KEY changes, update index.html too! ***

// Class names to set on the root element depending on user preference.
export const PREFER_DARK_CLASS = "prefer-dark"
export const PREFER_LIGHT_CLASS = "prefer-light"

// Default theme names.
export type ColorPreference = "Zenin Dark" | "Zenin Light";
export const DEFAULT_DARK_THEME_NAME: ColorPreference = "Zenin Dark";
export const DEFAULT_LIGHT_THEME_NAME: ColorPreference = "Zenin Light";

export function isColorPreference(value: string): value is ColorPreference {
    return value === DEFAULT_DARK_THEME_NAME || value === DEFAULT_LIGHT_THEME_NAME;
}

export function readColorPreference(): ColorPreference | null {
    const value = localStorage.getItem(LS_THEME_KEY);
    if (value == PREFER_DARK_CLASS) return DEFAULT_DARK_THEME_NAME;
    if (value == PREFER_LIGHT_CLASS) return DEFAULT_LIGHT_THEME_NAME;
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
