import { FC } from 'react';
export interface FloorReflectionProps {
    resolution?: number;
    mixBlur?: number;
    mixStrength?: number;
    metalness?: number;
    blur?: [number, number] | number;
    mirror?: number;
    minDepthThreshold?: number;
    maxDepthThreshold?: number;
    depthScale?: number;
    depthToBlurRatioBias?: number;
    distortion?: number;
    mixContrast?: number;
    reflectorOffset?: number;
    roughness?: number;
    /**
     * The color should match the canvas background color to provide a seamless transition from background to the reflective plane.
     */
    color: string;
}
export declare const FloorReflection: FC<FloorReflectionProps>;
