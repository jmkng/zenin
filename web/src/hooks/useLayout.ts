import { LayoutContext, LayoutDispatchContext } from "@/internal/layout/context";
import { useContext } from "react";

export const useLayoutContext = () => {
    const state = useContext(LayoutContext);
    const dispatch = useContext(LayoutDispatchContext);
    if (!state || !dispatch) throw new Error("layout context must be used within provider");
    return { state, dispatch }
}