import { isMeasurement } from '@/internal/measurement';
import { FEED, handleConnect, handleDisconnect } from '@/internal/server';
import { useEffect } from 'react';
import { useAccountContext } from './useAccount';
import { useMonitorContext } from './useMonitor';

export function useFeedSocket() {
    const accountContext = useAccountContext();
    const monitorContext = useMonitorContext();

    const dispatch = (data: unknown) => {
        if (isMeasurement(data)) monitorContext.dispatch({ type: 'poll', measurement: data })
    }

    useEffect(() => {
        if (!accountContext.state.token) return;
    
        const onMessage = (event: MessageEvent) => dispatch(JSON.parse(event.data));
        handleConnect(onMessage);
    
        return () => {
            handleDisconnect();
        };
    }, [accountContext.state.token]);

    const send = (message: string) => {
        if (FEED) FEED.send(message);
    };

    return { send };
}