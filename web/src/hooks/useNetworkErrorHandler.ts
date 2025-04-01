import { useLayoutContext } from "@/internal/layout";

export const useNetworkErrorHandler = () => {
    const layout = useLayoutContext();

    const messages = ["Network request failed. The server may be unreachable. Check server logs for details."];
    const action = (_: unknown): string => {
        layout.dispatch({ type: "send", messages, autoDismiss: false });
        return messages[0];
    }

    return action;
}