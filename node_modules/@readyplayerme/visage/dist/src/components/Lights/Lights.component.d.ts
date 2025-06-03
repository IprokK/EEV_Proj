import { FC } from 'react';
import { LightingProps } from 'src/types';
import { Vector3 } from 'three';
export declare const LIGHT_CONFIG: Readonly<{
    fillLightAngle: number;
    backLightAngle: number;
    keyLightAngle: number;
    silhouetteLightAngle: number;
    keyLightPosition: Vector3;
    liftLightPosition: Vector3;
    dirLightPosition: Vector3;
    silhouetteLightPosition: Vector3;
    defaultProps: Required<LightingProps>;
}>;
declare const Lights: FC<LightingProps>;
export default Lights;
