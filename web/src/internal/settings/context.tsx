import { createContext, ReactNode, useReducer, } from "react";
import { SettingsAction, settingsDefault, settingsReducer, SettingsState } from "./reducer";

export const SettingsContext = createContext<SettingsState | null>(null);
export const SettingsDispatchContext = createContext<((action: SettingsAction) => void) | null>(null);

interface SettingsProviderProps {
    children?: ReactNode;
}

const SettingsProvider = (props: SettingsProviderProps) => {
    const { children } = props;
    const [state, dispatch] = useReducer(settingsReducer, settingsDefault);

    return (
        <SettingsContext.Provider value={state}>
            <SettingsDispatchContext.Provider value={dispatch}>
                {children}
            </SettingsDispatchContext.Provider>
        </SettingsContext.Provider>
    )
}

export default SettingsProvider;
