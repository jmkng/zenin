import { useRef } from "react";
import { useDefaultInterceptors } from "../../hooks/useDefaultInterceptors";
import { POST_API, Service } from "../server";
import { AuthenticatedRequest } from "../server/request";
import { Settings } from ".";

class SettingsService extends Service {
    constructor() { super(); }

    async getSettings(token: string) {
        const address = '/settings';
        const request = new AuthenticatedRequest(token, address);
        return await this.extract(request);
    }

    async updateSettings(token: string, settings: Settings) {
        const address = '/settings';
        const body = JSON.stringify(settings);
        const request = new AuthenticatedRequest(token, address).method(POST_API).body(body);
        return await this.extract(request);
    }
}

export const useDefaultSettingsService = () => {
    const interceptors = useDefaultInterceptors();

    const ref = useRef<SettingsService | null>(null);
    if (ref.current === null) {
        const service = new SettingsService().interceptor(...interceptors);
        ref.current = service;
    }
    return ref.current;
}

export { SettingsService };
