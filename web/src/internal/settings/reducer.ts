export interface SettingsState {
    delimiters: string[]
}

export interface Settings {
    delimiters: string[]
}

export const settingsDefault: SettingsState = {
    delimiters: []
}

type ResetAction = { type: 'reset', delimiters: string[] };

export type SettingsAction =
    | ResetAction

const resetAction = (state: SettingsState, action: ResetAction) => {
    return { ...state, delimiters: action.delimiters };
}

const settingsReducer = (state: SettingsState, action: SettingsAction): SettingsState => {
    switch (action.type) {
        case "reset": return resetAction(state, action);
    }
}

export { settingsReducer };
