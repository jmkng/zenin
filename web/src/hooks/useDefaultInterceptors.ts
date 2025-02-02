import { useNavigate } from "react-router-dom";
import { useAccountContext } from "../internal/account";
import { useDefaultAccountService } from "../internal/account/service";
import { Interceptor, Extract } from "../server";

export const useDefaultInterceptors = () => {
    const account = {
        service: useDefaultAccountService(),
        context: useAccountContext()
    }
    const navigate = useNavigate();
    const redirect = (extract: Extract) => {
        if (extract.unauthorized()) {
            account.service.clearLSToken();                         // 1. Clear old token.
            account.context.dispatch({ type: 'logout' })            // 2. Update the state.
            navigate("/login")                                      // 3. Redirect.
        }
    }
    const logger = (extract: Extract) => {
        if (!extract.ok()) {
            console.error(`interceptor received failed extract: status=${extract.response.status}`);
        }
    }
    return [redirect, logger] as Interceptor[];
}
