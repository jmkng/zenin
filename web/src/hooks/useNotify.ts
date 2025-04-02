import { useLayoutContext } from "./useLayout";

export const useNotify = () => {
    const context = useLayoutContext();
    const action = (autoDismiss: boolean, ...messages: string[]) => {
        context.dispatch({ type: "send", messages, autoDismiss });
    };

    return action;
}