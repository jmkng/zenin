export interface NotificationOptions {
    autoDismiss: boolean
}

type Notification = { id: number, message: string, options: NotificationOptions };

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

export interface SendNotificationOptions {
    autoDismiss?: boolean
    sendOnce?: boolean
}

/** Send a notification. */
type SendNotificationAction = { type: "send", messages: string[], options?: SendNotificationOptions };

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
    const autoDismiss: boolean = action.options?.autoDismiss ?? true;
    const sendOnce: boolean = action.options?.sendOnce ?? false;

    const unique = new Set(state.notifications.map(n => n.message));
    
    const options: NotificationOptions = { autoDismiss };
    const mapped: Notification[] = action.messages
        .filter(n => !(sendOnce && unique.has(n)))
        .map(n => ({ id: (Date.now() + Math.random()), message: n, options }));

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
