import { createContext, ReactNode, useReducer } from 'react';
import { LogAction, logDefault, logReducer, LogState } from './reducer';

export const LogContext = createContext<LogState | null>(null);
export const LogDispatchContext = createContext<((action: LogAction) => void) | null>(null);

interface LogProviderProps {
    children?: ReactNode;
}

const LogProvider = (props: LogProviderProps) => {
    const { children } = props;
    const [state, dispatch] = useReducer(logReducer, logDefault);

    return (
        <LogContext.Provider value={state}>
            <LogDispatchContext.Provider value={dispatch}>
                {children}
            </LogDispatchContext.Provider>
        </LogContext.Provider>
    )
}


export default LogProvider;
