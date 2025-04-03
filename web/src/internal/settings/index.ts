import SettingsProvider from "./context";

// Default theme names.
export const DEFAULT_DARK = "Default Dark";
export const DEFAULT_LIGHT = "Default Light";

export const THEME_ATTR = "data-theme";
export const THEME_BLOCK_ID = "theme-link";

export interface Settings {
    delimiters: string[],
    theme: string | null
}

export type { SettingsState } from "./reducer";
export { SettingsProvider };

