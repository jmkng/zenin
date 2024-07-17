import { createContext, ReactNode, useReducer } from 'react';
import { LayoutState, LayoutAction, layoutReducer, layoutDefault } from './reducer';

export const LayoutContext = createContext<LayoutState | null>(null);
export const LayoutDispatchContext = createContext<((action: LayoutAction) => void) | null>(null);

interface LayoutProviderProps {
    children?: ReactNode;
}

const LayoutProvider = (props: LayoutProviderProps) => {
    const { children } = props;
    const [state, dispatch] = useReducer(layoutReducer, layoutDefault);

    return (
        <LayoutContext.Provider value={state}>
            <LayoutDispatchContext.Provider value={dispatch}>
                {children}
            </LayoutDispatchContext.Provider>
        </LayoutContext.Provider>
    )
}

export default LayoutProvider;
