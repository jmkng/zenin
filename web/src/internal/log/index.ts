import { useContext } from "react";
import { LogContext, LogDispatchContext } from "./context";

export const useLogContext = () => {
    const state = useContext(LogContext);
    const dispatch = useContext(LogDispatchContext);
    if (!state || !dispatch) throw new Error('log context must be used within provider');
    return { state, dispatch }
}
