import { useLayoutContext } from "./useLayout";

export const useNetworkErrorHandler = () => {
    const context = useLayoutContext();

    const messages = ["Network request failed. The server may be unreachable. Check server logs for details."];
    const action = (_: unknown): string => {
        context.dispatch({ type: "send", messages, autoDismiss: false });
        return messages[0];
    }

    return action;
}