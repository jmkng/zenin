type Notification = { message: string };

export interface LayoutState {
    loading: boolean,
    notifications: Notification[],
}

export const layoutDefault: LayoutState = {
    loading: true,
    notifications: [],
}

/** Enable or disable the loading screen. */
type LoadAction = { type: 'load', loading: boolean };

type SendNotificationAction = { type: 'send', message: string };

type DismissNotification = { type: "dismiss", index: number };

export type LayoutAction =
    | LoadAction
    | SendNotificationAction
    | DismissNotification

const loadAction = (state: LayoutState, action: LoadAction): LayoutState => {
    const loading = action.loading;
    return { ...state, loading };
}

const sendNotificationAction = (state: LayoutState, action: SendNotificationAction) => {
    const n: Notification = { message: action.message };
    const notifications = [...state.notifications, n];
    return { ...state, notifications };
}

const dismissNotificationAction = (state: LayoutState, action: DismissNotification) => {
    const notifications = state.notifications.filter((_, i) => i != action.index);
    return { ...state, notifications };
}

export const layoutReducer = (state: LayoutState, action: LayoutAction): LayoutState => {
    switch (action.type) {
        case "load": return loadAction(state, action);
        case "send": return sendNotificationAction(state, action);
        case "dismiss": return dismissNotificationAction(state, action);
    }
}
