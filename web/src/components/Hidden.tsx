import { useAccount } from "@/hooks/useAccount";
import { Navigate, Outlet } from "react-router-dom";

interface HiddenProps {
    redirectPath: string
}

/** Hide children from authenticated users. */
export default function Hidden(props: HiddenProps) {
    const { redirectPath } = props;
    
    const { context } = useAccount();
    const shouldHide: boolean = context.state.token !== null;
    
    return shouldHide 
        ? <Navigate to={redirectPath} /> 
        : <Outlet />
}