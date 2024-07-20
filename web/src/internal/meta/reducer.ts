export interface MetaState {
    plugins: string[]
}

export const metaDefault: MetaState = {
    plugins: []
}

type ResetAction = { type: 'reset', plugins: string[] };
type RemoveAction = { type: 'remove', name: string };
type AddAction = { type: 'add', name: string };

export type MetaAction =
    | ResetAction
    | RemoveAction
    | AddAction

const resetAction = (state: MetaState, action: ResetAction) => {
    return { ...state, plugins: action.plugins.sort() };
}

const removeAction = (state: MetaState, action: RemoveAction) => {
    return { ...state, plugins: state.plugins.filter(n => n != action.name) };
}

const addAction = (state: MetaState, action: AddAction) => {
    return { ...state, plugins: [...state.plugins, action.name].sort() };
}

const metaReducer = (state: MetaState, action: MetaAction): MetaState => {
    switch (action.type) {
        case "reset": return resetAction(state, action);
        case "remove": return removeAction(state, action);
        case "add": return addAction(state, action);
    }
}

export { metaReducer };
