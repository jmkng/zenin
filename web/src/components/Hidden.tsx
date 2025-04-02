import { useAccount } from '@/hooks/useAccount';
import { Navigate, Outlet } from 'react-router-dom';

export default function Hidden() {
    const { context } = useAccount();
    const shouldHide: boolean = context.state.token !== null;
    
    return shouldHide 
        ? <Navigate to="/" /> 
        : <Outlet />
}