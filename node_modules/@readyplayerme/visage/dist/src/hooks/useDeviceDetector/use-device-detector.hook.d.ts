import { TierResult as GpuTierResult } from 'detect-gpu';
type TierPresets = {
    [key: number]: Record<string, any>;
};
type NetworkTierResult = {
    downloadSpeed: number;
    tier: number;
};
type DeviceDetectorServiceProps = {
    gpuTierResult: GpuTierResult;
    networkTierResult: NetworkTierResult;
    tierPresets?: TierPresets;
};
declare class DeviceDetectorService {
    private tierPresets;
    private gpuTierResult;
    private networkTierResult;
    constructor(props: DeviceDetectorServiceProps);
    get result(): {
        gpu: GpuTierResult;
        network: NetworkTierResult;
    };
    toQueryString(): string;
}
export type DeviceDetectorHookProps = {
    tierPresets?: TierPresets;
};
export declare function useDeviceDetector(options?: DeviceDetectorHookProps): DeviceDetectorService | undefined;
export {};
