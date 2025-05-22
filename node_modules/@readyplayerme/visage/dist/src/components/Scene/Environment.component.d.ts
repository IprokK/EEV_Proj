import { FC } from 'react';
import { EnvironmentPresets } from 'src/services/Environment.service';
export interface EnvironmentProps {
    environment: string | EnvironmentPresets;
    enablePostProcessing?: boolean | undefined;
}
export declare const Environment: FC<EnvironmentProps>;
