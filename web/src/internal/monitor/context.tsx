import { createContext, ReactNode, useReducer, } from 'react';
import { MonitorAction, MonitorState, monitorReducer, monitorDefault } from './reducer';

export const MonitorContext = createContext<MonitorState | null>(null);
export const MonitorDispatchContext = createContext<((action: MonitorAction) => void) | null>(null);

interface MonitorProviderProps {
    children?: ReactNode;
}

const MonitorProvider = (props: MonitorProviderProps) => {
    const { children } = props;
    const [state, dispatch] = useReducer(monitorReducer, monitorDefault);

    return <MonitorContext.Provider value={state}>
        <MonitorDispatchContext.Provider value={dispatch}>
            {children}
        </MonitorDispatchContext.Provider>
    </MonitorContext.Provider>
}

export default MonitorProvider;
