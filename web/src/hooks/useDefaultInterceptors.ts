import { clearLSToken } from "@/internal/account";
import { Extract, Interceptor } from "@/internal/server";
import { useNavigate } from "react-router-dom";
import { useAccountContext } from "./useAccount";

export const useDefaultInterceptors = () => {
    const context = useAccountContext();
    const navigate = useNavigate();

    const redirect = (extract: Extract) => {
        if (extract.unauthorized()) {
            clearLSToken();                         // 1. Clear old token.
            context.dispatch({ type: "logout" })    // 2. Update the state.
            navigate("/login")                      // 3. Redirect.
        }
    }
    const logger = (extract: Extract) => {
        if (!extract.ok()) {
            console.error(`interceptor received failed extract: status=${extract.response.status}`);
        }
    }
    
    return [redirect, logger] as Interceptor[];
}
