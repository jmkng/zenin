import { readLSToken, useAccountContext } from '@/internal/account';
import { ReactNode, useEffect } from 'react';

interface InitializeProps {
    children?: ReactNode
}

export default function Initialize(props: InitializeProps) {
    const { children } = props;
    const account = { 
        context: useAccountContext(),
    };

    useEffect(() => {
        if (account.context.state.initialized) return;
        const token = readLSToken();
        
        if (token) account.context.dispatch({ type: 'login', token });
        else account.context.dispatch({ type: 'logout' });
    }, [account.context])

    return account.context.state.initialized ? children : null
}
