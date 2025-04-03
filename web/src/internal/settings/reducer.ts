export interface SettingsState {
    delimiters: string[],
    active: string | null,
    themes: string[],
}

export const settingsDefault: SettingsState = {
    delimiters: [],
    active: null,
    themes: []
}

/** Reset the state. */
type ResetAction = { type: "reset", state: SettingsState };

/** Update the active theme. */
type ChangeActiveThemeAction = { type: "active", active: string | null };

export type SettingsAction =
    | ResetAction
    | ChangeActiveThemeAction

const resetAction = (_: SettingsState, action: ResetAction) => {
    return action.state;
}

const changeActiveThemeAction = (state: SettingsState, action: ChangeActiveThemeAction) => {
    return { ...state, active: action.active };
}
    
const settingsReducer = (state: SettingsState, action: SettingsAction): SettingsState => {
    switch (action.type) {
        case "reset": return resetAction(state, action)
        case "active": return changeActiveThemeAction(state, action)
    }
}

export { settingsReducer };
