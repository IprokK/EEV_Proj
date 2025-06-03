import { FC } from 'react';
import { BaseModelProps } from 'src/types';
import { EnvironmentModels } from 'src/services/Environment.service';
export interface EnvironmentModelProps extends BaseModelProps {
    environment: string | EnvironmentModels;
    scale?: number;
}
export declare const EnvironmentModel: FC<EnvironmentModelProps>;
