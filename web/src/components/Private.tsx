import { useAccount } from "@/hooks/useAccount";
import { Navigate, Outlet } from "react-router-dom";

interface PrivateProps {
    redirectPath: string;
}

/** Redirect unauthenticated users away from children. */
export default function Private(props: PrivateProps) {
    const { redirectPath } = props;

    const { context } = useAccount();
    const shouldAllow: boolean = context.state.token !== null;

    return shouldAllow
        ? <Outlet />
        : <Navigate to={redirectPath} />;
}
