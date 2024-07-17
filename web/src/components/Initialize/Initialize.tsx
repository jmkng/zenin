import { useAccountContext } from '../../internal/account';
import { ReactNode, useEffect } from 'react';
import { useDefaultAccountService } from '../../internal/account/service';

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
        const token = account.service.read();
        if (token) account.context.dispatch({ type: 'login', token });
        else account.context.dispatch({ type: 'logout' });
    }, [account])

    return (
        <>
            {account.context.state.initialized ? children : null}
        </>
    )
}
