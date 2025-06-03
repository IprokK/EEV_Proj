import { FC, Ref } from 'react';
import { Group } from 'three';
import { BaseModelProps } from 'src/types';
interface ModelProps extends BaseModelProps {
    scene: Group;
    modelRef?: Ref<Group>;
    scale?: number;
    onSpawnAnimationFinish?: () => void;
    lockHorizontal?: boolean;
    lockVertical?: boolean;
    horizontalRotationStep?: number;
    verticalRotationStep?: number;
}
export declare const CenteredModel: FC<ModelProps>;
export {};
