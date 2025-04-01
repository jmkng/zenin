import { useLayoutContext } from "@/internal/layout";

export const useNotify = () => {
    const layout = useLayoutContext();
    const action = (autoDismiss: boolean, ...messages: string[]) => {
        layout.dispatch({ type: "send", messages, autoDismiss });
    };

    return action;
}