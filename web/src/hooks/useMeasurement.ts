import { MeasurementService } from "@/internal/measurement/service";
import { useNetworkErrorHandler } from "./useNetworkErrorHandler";
import { useDefaultInterceptors } from "./useDefaultInterceptors";

export const useMeasurementService = (): MeasurementService => {
    const onNetworkError = useNetworkErrorHandler();
    return useDefaultMeasurementService().onNetworkError(onNetworkError);
}

export const useDefaultMeasurementService = (): MeasurementService => {
    const interceptors = useDefaultInterceptors();
    return new MeasurementService().interceptor(...interceptors);
}