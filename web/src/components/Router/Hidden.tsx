import { Navigate, Outlet } from 'react-router-dom';
import { useAccountContext } from '@/internal/account';
import { useDefaultAccountService } from '@/internal/account/service';

export default function Hidden() {
    const account = {
        context: useAccountContext(),
        service: useDefaultAccountService()
    }
    const hide: boolean = account.service.isAuthenticated(account.context.state);
    return hide ? <Navigate to="/" /> : <Outlet />
}