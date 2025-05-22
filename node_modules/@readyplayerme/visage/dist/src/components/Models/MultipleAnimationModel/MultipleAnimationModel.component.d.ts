import { FC } from 'react';
import { AnimationAction } from 'three';
import { AnimationsT, BaseModelProps } from 'src/types';
import { Emotion } from 'src/components/Avatar/Avatar.component';
export interface MultipleAnimationModelProps extends BaseModelProps {
    modelSrc: string | Blob;
    animations: AnimationsT;
    activeAnimation: string;
    scale?: number;
    emotion?: Emotion;
    onAnimationEnd?: (action: AnimationAction) => void;
}
export declare const MultipleAnimationModel: FC<MultipleAnimationModelProps>;
