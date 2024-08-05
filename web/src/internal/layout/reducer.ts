export interface LayoutState {
    navigating: boolean,
    loading: boolean,
}

export const layoutDefault: LayoutState = {
    navigating: false,
    loading: true
}

type NavigateAction = { type: 'navigate', navigating: boolean };
type LoadAction = { type: 'load', loading: boolean };

export type LayoutAction =
    | NavigateAction
    | LoadAction

const navigateAction = (state: LayoutState, action: NavigateAction): LayoutState => {
    const navigating = action.navigating;
    return { ...state, navigating };
}

const loadAction = (state: LayoutState, action: LoadAction): LayoutState => {
    const loading = action.loading;
    return { ...state, loading };
}

export const layoutReducer = (state: LayoutState, action: LayoutAction): LayoutState => {
    switch (action.type) {
        case "navigate": return navigateAction(state, action);
        case "load": return loadAction(state, action);
    }
}
