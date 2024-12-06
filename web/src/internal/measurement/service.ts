import { useRef } from "react";
import { AuthenticatedRequest } from "../../server/request";
import { DELETE_API, Service } from "../../server";
import { useDefaultInterceptors } from "../../hooks/useDefaultInterceptors";

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

export const useDefaultMeasurementService = () => {
    const interceptors = useDefaultInterceptors();
    const ref = useRef<MeasurementService | null>(null);
    if (ref.current === null) {
        const service = new MeasurementService().interceptor(...interceptors);
        ref.current = service;
    }
    return ref.current;
}

export { MeasurementService }
