import { SendNotificationOptions } from "@/internal/layout/reducer";
import { useLayoutContext } from "./useLayout";

export const useNotify = () => {
    const context = useLayoutContext();
    const action = (messages: string | string[], options?: SendNotificationOptions) => {
        const asArray = Array.isArray(messages) ? messages : [messages];
        context.dispatch({ type: "send", messages: asArray, options });
    };

    return action;
}