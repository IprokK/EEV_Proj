import { BaseTransport } from '@amplitude/analytics-core';
import { Payload, Response, Transport } from '@amplitude/analytics-types';
export declare class FetchTransport extends BaseTransport implements Transport {
    send(serverUrl: string, payload: Payload): Promise<Response | null>;
}
//# sourceMappingURL=fetch.d.ts.map