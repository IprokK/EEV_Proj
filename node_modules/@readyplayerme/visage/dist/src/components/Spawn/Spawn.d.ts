import { FC } from 'react';
import { Group } from 'three';
interface SpawnProps {
    avatar: Group;
    onSpawnFinish?: () => void;
}
export declare const Spawn: FC<SpawnProps>;
export {};
