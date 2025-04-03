import { useAccount } from "@/hooks/useAccount";
import { useLayoutContext } from "@/hooks/useLayout";
import { useSettings } from "@/hooks/useSettings";
import { readLSToken } from "@/internal/account";
import { formatTheme, hideLoadingScreen, showLoadingScreen } from "@/internal/layout/graphics";
import { DataPacket } from "@/internal/server";
import { ReactNode, useEffect, useState } from "react";

interface InitializeProps {
    children?: ReactNode
}

export default function Initialize(props: InitializeProps) {
    const { children } = props;
    
    const { context: accountContext } = useAccount();
    const { service: settingsService } = useSettings();
    const layoutContext = useLayoutContext();

    // Block children until token check is complete.
    const [initialized, setInitialized] = useState(false);

    // Fetch theme information as early as possible.
    useEffect(() => {
        (async () => {
            const extract = await settingsService.getActiveTheme(false, true)
            if (extract.ok()) {
                const packet: DataPacket<{ name: string, contents: string | null}> = await extract.json();
                if (packet.data.name) document.documentElement.setAttribute("data-theme", formatTheme(packet.data.name));
            };
        })()
    }, [])

    // Load cached authentication token.
    useEffect(() => {
        const token = readLSToken();
        
        if (token) accountContext.dispatch({ type: "login", token });
        else accountContext.dispatch({ type: "logout" });

        setInitialized(true);
    }, [])

    // Sync loading screen with state.
    useEffect(() => {
        if (layoutContext.state.loading) showLoadingScreen();
        else hideLoadingScreen();
    }, [layoutContext.state.loading])

    if (!initialized) return null;
    return children;
}
