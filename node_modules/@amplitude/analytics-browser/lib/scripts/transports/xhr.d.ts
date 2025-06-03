import { BaseTransport } from '@amplitude/analytics-core';
import { Payload, Response, Transport } from '@amplitude/analytics-types';
export declare class XHRTransport extends BaseTransport implements Transport {
    private state;
    send(serverUrl: string, payload: Payload): Promise<Response | null>;
}
//# sourceMappingURL=xhr.d.ts.map