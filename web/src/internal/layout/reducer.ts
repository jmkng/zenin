export interface LayoutState {
    shortcut: boolean,
    loading: boolean,
}

export const layoutDefault: LayoutState = {
    shortcut: false, // document.body.clientWidth > 700
    loading: true
}

// type ShortcutAction = { type: 'shortcut', shortcut: boolean };

/** Enable or disable the loading screen. */
type LoadAction = { type: 'load', loading: boolean };

export type LayoutAction =
    // | ShortcutAction
    | LoadAction

// const shortcutAction = (state: LayoutState, action: ShortcutAction): LayoutState => {
//     const shortcut = action.shortcut;
//     return { ...state, shortcut };
// }

const loadAction = (state: LayoutState, action: LoadAction): LayoutState => {
    const loading = action.loading;
    return { ...state, loading };
}

export const layoutReducer = (state: LayoutState, action: LayoutAction): LayoutState => {
    switch (action.type) {
        // case "shortcut": return shortcutAction(state, action);
        case "load": return loadAction(state, action);
    }
}
