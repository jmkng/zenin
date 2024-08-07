import { Navigate, Outlet } from 'react-router-dom';
import { useAccountContext } from '../../internal/account';

export default function Guard() {
    const account = useAccountContext();
    const initialized = account.state.initialized;
    const guard: boolean = !initialized || (initialized && (account.state.authenticated != null));
    return guard ? <Outlet /> : <Navigate to="/login" />
}
