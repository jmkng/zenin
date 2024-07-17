import { FEED_WS_ENDPOINT } from ".";

export let FEED: WebSocket | null = null;

export const handleConnect = ((callback: (event: MessageEvent) => void) => {
    FEED = new WebSocket(FEED_WS_ENDPOINT);
    FEED.onmessage = callback;
})

export const handleDisconnect = (() => {
    if (FEED) FEED.close();
    FEED = null;
})
