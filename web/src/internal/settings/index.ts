import { useContext } from "react";
import { SettingsContext, SettingsDispatchContext } from "./context";
import { SettingsState } from "./reducer";
import { useDefaultSettingsService } from "./service";

export const useSettingsContext = () => {
    const state = useContext(SettingsContext);
    const dispatch = useContext(SettingsDispatchContext);
    if (!state || !dispatch) throw new Error('settings context must be used within provider');
    return { state, dispatch }
}

export type { SettingsState };
export { useDefaultSettingsService };