import { FC } from 'react';
import { BaseModelProps } from 'src/types';
import { Emotion } from '../../Avatar/Avatar.component';
export interface HalfBodyModelProps extends BaseModelProps {
    modelSrc: string | Blob;
    rotation?: number;
    scale?: number;
    idleRotation?: boolean;
    emotion?: Emotion;
    headMovement?: boolean;
}
export declare const HalfBodyModel: FC<HalfBodyModelProps>;
