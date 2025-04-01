import { useContext } from "react";
import SettingsProvider, { SettingsContext, SettingsDispatchContext } from "./context";

// Default theme names.
export const DEFAULT_DARK = "Default Dark";
export const DEFAULT_LIGHT = "Default Light";

export const THEME_ATTR = "data-theme";
export const THEME_BLOCK_ID = "theme-link";

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
export { SettingsProvider };

