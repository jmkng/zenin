import { createContext, ReactNode, useReducer, } from 'react';
import { MetaAction, metaDefault, metaReducer, MetaState } from './reducer';

export const MetaContext = createContext<MetaState | null>(null);
export const MetaDispatchContext = createContext<((action: MetaAction) => void) | null>(null);

interface MetaProviderProps {
    children?: ReactNode;
}

const MetaProvider = (props: MetaProviderProps) => {
    const { children } = props;
    const [state, dispatch] = useReducer(metaReducer, metaDefault);

    return (
        <MetaContext.Provider value={state}>
            <MetaDispatchContext.Provider value={dispatch}>
                {children}
            </MetaDispatchContext.Provider>
        </MetaContext.Provider>
    )
}

export default MetaProvider;
