import { AuthenticatedRequest } from "../server/request";
import { DELETE_API, Service } from "../server";

class MeasurementService extends Service {
    constructor() { super(); }

    async getCertificate(token: string, id: number) {
        const address = `/measurement/${id}/certificates`
        const request = new AuthenticatedRequest(token, address);
        return await this.extract(request);
    }

    async deleteMeasurement(token: string, id: number[]) {
        const joined = id.join(',');
        const address = `/measurement?id=${joined}`;
        const request = new AuthenticatedRequest(token, address).method(DELETE_API)
        return await this.extract(request);
    }
}

export { MeasurementService }
