import { FC } from 'react';
import { MeshProps } from '@react-three/fiber/dist/declarations/src/three-types';
export type Background = {
    src?: string;
    color?: string;
} & MeshProps;
export declare const Box: FC<Background>;
