import { useRef } from "react";
import { Monitor } from ".";
import { AuthenticatedRequest } from "../../server/request";
import { DELETE_API, GET_API, PATCH_API, POST_API, PUT_API, Service } from "../../server";
import { useDefaultInterceptors } from "../../hooks/useDefaultInterceptors";
import { DetachedState } from "./origin";

class MonitorService extends Service {
    constructor() { super(); }

    async getMonitor(token: string, measurement?: number) {
        let address = `/monitor`
        if (measurement) address += `?measurements=${measurement}`;
        const request = new AuthenticatedRequest(token, address);
        return await this.extract(request);
    }

    async deleteMonitor(token: string, id: number[]) {
        const joined = id.join(',');
        const address = `/monitor?id=${joined}`;
        const request = new AuthenticatedRequest(token, address)
            .method(DELETE_API)
        return await this.extract(request);
    }

    async pollMonitor(token: string, id: number) {
        const address = `/monitor/${id}/poll`;
        const request = new AuthenticatedRequest(token, address)
            .method(GET_API)
        return await this.extract(request);
    }

    async toggleMonitor(token: string, id: number[], active: boolean) {
        const joined = id.join(',');
        const address = `/monitor?id=${joined}&active=${active}`;
        const request = new AuthenticatedRequest(token, address)
            .method(PATCH_API)
        return await this.extract(request);
    }

    async updateMonitor(token: string, id: number, monitor: Monitor) {
        monitor.measurements = null;
        const body = JSON.stringify(monitor);
        const address = `/monitor/${id}`;
        const request = new AuthenticatedRequest(token, address)
            .method(PUT_API)
            .body(body)
        return await this.extract(request);
    }

    async addMonitor(token: string, value: Monitor) {
        const body = JSON.stringify(value)
        const address = `/monitor`;
        const request = new AuthenticatedRequest(token, address)
            .method(POST_API)
            .body(body)
        return await this.extract(request);
    }

    async getMeasurements(token: string, id: number, after?: DetachedState) {
        let address = `/monitor/${id}/measurement`
        if (after) address += `?after=${after.toAfterDate()}`
        const request = new AuthenticatedRequest(token, address)
            .method(GET_API)
        return await this.extract(request);
    }
}

export const useDefaultMonitorService = () => {
    const interceptors = useDefaultInterceptors();
    const ref = useRef<MonitorService | null>(null);
    if (ref.current === null) {
        const service = new MonitorService().interceptor(...interceptors);
        ref.current = service;
    }
    return ref.current;
}

export { MonitorService }
