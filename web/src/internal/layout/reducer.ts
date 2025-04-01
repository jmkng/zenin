type Notification = { id: number, message: string, autoDismiss: boolean };

export interface LayoutState {
    loading: boolean,
    notifications: Notification[],
}

export const layoutDefault: LayoutState = {
    loading: true,
    notifications: [],
}

/** Enable or disable the loading screen. */
type LoadAction = { type: "load", loading: boolean };

/** Send a notification. */
type SendNotificationAction = { type: "send", messages: string[], autoDismiss: boolean };

/** Dismiss a notification. */
type DismissNotification = { type: "dismiss", id: number };

export type LayoutAction =
    | LoadAction
    | SendNotificationAction
    | DismissNotification

const loadAction = (state: LayoutState, action: LoadAction): LayoutState => {
    const loading = action.loading;
    return { ...state, loading };
}

const sendNotificationAction = (state: LayoutState, action: SendNotificationAction): LayoutState => {
    const mapped: Notification[] = action.messages
        .map(n => ({ id: (Date.now() + Math.random()), message: n, autoDismiss: action.autoDismiss }));

    const notifications = [...state.notifications, ...mapped];
    return { ...state, notifications };
}

const dismissNotificationAction = (state: LayoutState, action: DismissNotification): LayoutState => {
    const notifications = state.notifications.filter(n => n.id != action.id);
    return { ...state, notifications };
}

export const layoutReducer = (state: LayoutState, action: LayoutAction): LayoutState => {
    switch (action.type) {
        case "load": return loadAction(state, action);
        case "send": return sendNotificationAction(state, action);
        case "dismiss": return dismissNotificationAction(state, action);
    }
}
