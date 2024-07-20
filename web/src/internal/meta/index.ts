import { useContext } from "react";
import { MetaContext, MetaDispatchContext } from "./context";

export interface Meta {
    isClaimed: boolean;
}

export const useMetaContext = () => {
    const state = useContext(MetaContext);
    const dispatch = useContext(MetaDispatchContext);
    if (!state || !dispatch) throw new Error('meta context must be used within provider');
    return { state, dispatch }
}
