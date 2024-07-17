import { useContext } from "react";
import { LayoutContext, LayoutDispatchContext } from "./context";

export const useLayoutContext = () => {
    const state = useContext(LayoutContext);
    const dispatch = useContext(LayoutDispatchContext);
    if (!state || !dispatch) throw new Error('layout context must be used within provider');
    return { state, dispatch }
}
