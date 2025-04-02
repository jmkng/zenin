import { useAccount } from '@/hooks/useAccount';
import { Navigate, Outlet } from 'react-router-dom';

export default function Private() {
    const { context } = useAccount();
    const shouldAllow: boolean = context.state.token !== null;

    return shouldAllow
        ? <Outlet />
        : <Navigate to="/login" />
}
