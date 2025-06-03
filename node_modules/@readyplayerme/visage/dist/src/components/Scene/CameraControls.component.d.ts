import { FC } from 'react';
import { Vector3 } from 'three';
type CameraControlsProps = {
    fullBody?: boolean;
    headScale?: number;
    cameraTarget?: number;
    cameraInitialDistance?: number;
    /**
     * Handles camera movement on the Z-axis.
     */
    cameraZoomTarget?: Vector3;
    controlsMinDistance?: number;
    controlsMaxDistance?: number;
    /**
     * Enables camera moving on Y-axis while zooming in-out.
     */
    updateCameraTargetOnZoom?: boolean;
};
export declare const CameraControls: FC<CameraControlsProps>;
export {};
