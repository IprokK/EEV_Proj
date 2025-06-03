import { FC } from 'react';
import { BaseModelProps } from 'src/types';
export interface RotatingModelProps extends BaseModelProps {
    modelSrc: string | Blob;
    scale?: number;
    lockHorizontal?: boolean;
    lockVertical?: boolean;
    horizontalRotationStep?: number;
    verticalRotationStep?: number;
}
export declare const RotatingModel: FC<RotatingModelProps>;
