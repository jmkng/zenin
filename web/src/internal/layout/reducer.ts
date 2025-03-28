export interface LayoutState {
    loading: boolean,
}

export const layoutDefault: LayoutState = {
    loading: true
}

/** Enable or disable the loading screen. */
type LoadAction = { type: 'load', loading: boolean };

export type LayoutAction =
    | LoadAction

const loadAction = (state: LayoutState, action: LoadAction): LayoutState => {
    const loading = action.loading;
    return { ...state, loading };
}

export const layoutReducer = (state: LayoutState, action: LayoutAction): LayoutState => {
    switch (action.type) {
        case "load": return loadAction(state, action);
    }
}
