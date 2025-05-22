import { FC, ReactNode } from 'react';
import { BaseModelProps } from 'src/types';
export interface BoundsModelContainerProps extends BaseModelProps {
    modelSrc: string | Blob;
    children?: ReactNode | ReactNode[];
    fit?: boolean;
}
export declare const BoundsModelContainer: FC<BoundsModelContainerProps>;
