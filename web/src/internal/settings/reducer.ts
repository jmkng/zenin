import { ColorPreference } from ".";

export interface SettingsState {
    delimiters: string[],
    /** The name of the active theme.
     * May be a custom theme, or the name of a color preference. */
    active: ColorPreference | string | null,
    themes: string[],
}

export const settingsDefault: SettingsState = {
    delimiters: [],
    active: null,
    themes: []
}

type ResetAction = { type: 'reset', delimiters: string[], active: string | null };

type ResetThemesAction = { type: 'resetThemes', themes: string[] };

type ResetActiveAction = { type: 'resetActive', active: ColorPreference | string | null };

export type SettingsAction =
    | ResetAction
    | ResetThemesAction
    | ResetActiveAction

const settingsReducer = (state: SettingsState, action: SettingsAction): SettingsState => {
    switch (action.type) {
        case "reset": 
            return { ...state, delimiters: action.delimiters, active: action.active };
        case "resetThemes": 
            return { ...state, themes: action.themes.sort() };
        case "resetActive":
            return { ...state, active: action.active };
    }
}

export { settingsReducer };
