import { FC, Ref } from 'react';
import { Group } from 'three';
import { BaseModelProps } from 'src/types';
import { Emotion } from '../../Avatar/Avatar.component';
export interface PoseModelProps extends BaseModelProps {
    modelSrc: string | Blob;
    poseSrc: string | Blob;
    modelRef?: Ref<Group>;
    scale?: number;
    emotion?: Emotion;
}
export declare const PoseModel: FC<PoseModelProps>;
