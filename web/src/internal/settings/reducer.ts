import { ColorPreference, readColorPreference } from ".";

export interface SettingsState {
    
    delimiters: string[],
    /** The name of the active theme in the repository. */
    active: string | null,
    themes: string[],

    /** Any color preference stored in browser local storage. */
    colorPreference: ColorPreference | null,
}

export const settingsDefault: SettingsState = {
    delimiters: [],
    active: null,
    colorPreference: readColorPreference(),
    themes: []
}

type ResetAction = { type: 'reset', delimiters: string[], active: string | null };

type ResetThemesAction = { type: 'resetThemes', themes: string[] };

type ResetColorPreference = { type: 'resetColorPreference', colorPreference: ColorPreference | null };

export type SettingsAction =
    | ResetAction
    | ResetThemesAction
    | ResetColorPreference

const resetAction = (state: SettingsState, action: ResetAction) => {
    return { ...state, delimiters: action.delimiters, active: action.active };
}

const resetThemesAction = (state: SettingsState, action: ResetThemesAction) => {
    return { ...state, themes: action.themes.sort() };
}

const resetColorPreference = (state: SettingsState, action: ResetColorPreference) => {
    return { ...state, colorPreference: action.colorPreference };
}

const settingsReducer = (state: SettingsState, action: SettingsAction): SettingsState => {
    switch (action.type) {
        case "reset": return resetAction(state, action);
        case "resetThemes": return resetThemesAction(state, action);
        case "resetColorPreference": return resetColorPreference(state, action)
    }
}

export { settingsReducer };
