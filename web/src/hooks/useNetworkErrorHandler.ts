import { SendNotificationOptions } from "@/internal/layout/reducer";
import { useLayoutContext } from "./useLayout";

export const useNetworkErrorHandler = () => {
    const context = useLayoutContext();

    const messages = ["Network request failed. The server may be unreachable. Check server logs for details."];
    const options: SendNotificationOptions = { autoDismiss: false, sendOnce: true };
    const action = (_: unknown): string => {
        context.dispatch({ type: "send", messages, options });
        return messages[0];
    }

    return action;
}