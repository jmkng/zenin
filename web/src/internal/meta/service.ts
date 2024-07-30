import { useRef } from "react";
import { useDefaultInterceptors } from "../../hooks/useDefaultInterceptors";
import { Service } from "../../server";
import { AuthenticatedRequest, Request } from "../../server/request";

class MetaService extends Service {
    constructor() { super(); }

    async getSummary() {
        const address = '/meta';
        const request = new Request(address);
        return await this.extract(request);
    }

    async getPlugins(token: string) {
        const address = '/meta/plugins';
        const request = new AuthenticatedRequest(token, address);
        return await this.extract(request);
    }
}

export const useDefaultMetaService = () => {
    const interceptors = useDefaultInterceptors();
    const ref = useRef<MetaService | null>(null);
    if (ref.current === null) {
        const service = new MetaService().interceptor(...interceptors);
        ref.current = service;
    }
    return ref.current;
}

export { MetaService };
