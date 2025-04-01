import { Navigate, Outlet } from 'react-router-dom';
import { useAccountContext } from '@/internal/account';

export default function Hidden() {
    const account = { 
        context: useAccountContext(),
    }
    const hide: boolean = account.context.state.initialized && (account.context.state.token !== null);
    return hide ? <Navigate to="/" /> : <Outlet />
}