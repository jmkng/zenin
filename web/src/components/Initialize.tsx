import { useAccountContext } from '@/internal/account';
import { useDefaultAccountService } from '@/internal/account/service';
import { ReactNode, useEffect } from 'react';

interface InitializeProps {
    children?: ReactNode
}

export default function Initialize(props: InitializeProps) {
    const { children } = props;
    const account = {
        service: useDefaultAccountService(),
        context: useAccountContext()
    }

    useEffect(() => {
        if (account.context.state.initialized) return;
        const token = account.service.readLSToken();
        if (token) account.context.dispatch({ type: 'login', token });
        else account.context.dispatch({ type: 'logout' });
    }, [account.context, account.service])

    return account.context.state.initialized ? children : null
}
