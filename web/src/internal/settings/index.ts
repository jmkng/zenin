import { useContext } from "react";
import SettingsProvider, { SettingsContext, SettingsDispatchContext } from "./context";

export interface Settings {
    delimiters: string[]
}

export const useSettingsContext = () => {
    const state = useContext(SettingsContext);
    const dispatch = useContext(SettingsDispatchContext);
    if (!state || !dispatch) throw new Error('settings context must be used within provider');
    return { state, dispatch }
}

export type { SettingsState } from "./reducer";
export { useDefaultSettingsService } from "./service";
export { SettingsProvider };
