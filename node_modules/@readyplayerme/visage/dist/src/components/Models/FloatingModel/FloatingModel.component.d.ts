import { FC } from 'react';
import { BaseModelProps } from 'src/types';
export interface FloatingModelProps extends BaseModelProps {
    modelSrc: string | Blob;
    scale?: number;
}
export declare const FloatingModel: FC<FloatingModelProps>;
