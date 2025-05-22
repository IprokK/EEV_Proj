import { FC } from 'react';
import { Group } from 'three';
interface SpawnAnimationProps {
    avatar: Group;
    onLoadedAnimationFinish?: () => void;
    onLoadedAnimation: {
        src: string;
        loop?: number;
    };
}
export declare const SpawnAnimation: FC<SpawnAnimationProps>;
export {};
