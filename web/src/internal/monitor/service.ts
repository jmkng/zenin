import { Monitor } from ".";
import { DELETE_API, GET_API, PATCH_API, POST_API, PUT_API, Service } from "../server";
import { AuthenticatedRequest } from "../server/request";
import { DetachedState } from "./split";

class MonitorService extends Service {
    constructor() { super(); }

    async getMonitor(token: string, measurement: number, plugins: boolean) {
        let address = `/monitor`;
    
        const params = [];
        if (measurement > 0) params.push(`measurements=${measurement}`);
        if (plugins) params.push(`plugins=${plugins}`);
        if (params.length > 0) {
            address += `?${params.join('&')}`;
        }
        
        const request = new AuthenticatedRequest(token, address);
        return await this.extract(request);
    }

    async deleteMonitor(token: string, id: number[]) {
        const joined = id.join(',');
        const address = `/monitor?id=${joined}`;
        const request = new AuthenticatedRequest(token, address).method(DELETE_API)
        return await this.extract(request);
    }

    async pollMonitor(token: string, id: number) {
        const address = `/monitor/${id}/poll`;
        const request = new AuthenticatedRequest(token, address).method(GET_API)
        return await this.extract(request);
    }

    async toggleMonitor(token: string, id: number[], active: boolean) {
        const joined = id.join(',');
        const address = `/monitor?id=${joined}&active=${active}`;
        const request = new AuthenticatedRequest(token, address).method(PATCH_API)
        return await this.extract(request);
    }

    async updateMonitor(token: string, id: number, monitor: Monitor) {
        monitor.measurements = [];
        const body = JSON.stringify(monitor);
        const address = `/monitor/${id}`;
        const request = new AuthenticatedRequest(token, address).method(PUT_API).body(body)
        return await this.extract(request);
    }

    async createMonitor(token: string, value: Monitor) {
        const body = JSON.stringify(value)
        const address = `/monitor`;
        const request = new AuthenticatedRequest(token, address).method(POST_API).body(body)
        return await this.extract(request);
    }

    async getMeasurement(token: string, id: number, after?: DetachedState) {
        let address = `/monitor/${id}/measurements`
        if (after) address += `?after=${after.toAfterDate()}`
        const request = new AuthenticatedRequest(token, address).method(GET_API)
        return await this.extract(request);
    }

    async getPlugins(token: string) {
        const address = '/monitor/plugins';
        const request = new AuthenticatedRequest(token, address);
        return await this.extract(request);
    }
}

export { MonitorService };

