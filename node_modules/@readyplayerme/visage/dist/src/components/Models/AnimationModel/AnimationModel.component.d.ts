import { FC } from 'react';
import { BaseModelProps } from 'src/types';
import { Emotion } from 'src/components/Avatar/Avatar.component';
export interface AnimationModelProps extends BaseModelProps {
    modelSrc: string | Blob;
    animationSrc: string | Blob;
    rotation?: number;
    scale?: number;
    idleRotation?: boolean;
    headMovement?: boolean;
    emotion?: Emotion;
}
export declare const AnimationModel: FC<AnimationModelProps>;
