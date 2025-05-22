import { FC, CSSProperties } from 'react';
import { BaseModelProps, CameraProps, EnvironmentProps } from 'src/types';
import { CaptureType } from 'src/components/Capture/Capture.component';
export interface ExhibitProps extends CameraProps, EnvironmentProps, Omit<BaseModelProps, 'setModelFallback'> {
    /**
     * Arbitrary binary data (base64 string | Blob) of a `.glb` file or path (URL) to a `.glb` resource.
     */
    modelSrc: string | Blob;
    /**
     * Size of the rendered GLB model.
     */
    scale?: number;
    /**
     * Pass styling to canvas.
     */
    style?: CSSProperties;
    /**
     * Custom style classes for canvas.
     */
    className?: string;
    /**
     * Enables soft shadows.
     */
    shadows?: boolean;
    /**
     * Enables floating idle animation.
     */
    float?: boolean;
    /**
     * Enables model to fit to available canvas dimensions.
     */
    fit?: boolean;
    /**
     * Return base64 image after making screenshot of the canvas.
     */
    capture?: CaptureType;
    /**
     * Enables snap-back to center after rotating model.
     */
    snap?: boolean;
    /**
     * Disables vertical rotation.
     */
    lockVertical?: boolean;
    /**
     * Disables horizontal rotation.
     */
    lockHorizontal?: boolean;
    /**
     * Enables idle horizontal rotation
     */
    horizontalRotation?: boolean;
    horizontalRotationStep?: number;
    verticalRotationStep?: number;
    children?: any;
    disableInitialLight?: boolean;
    disableEnvironment?: boolean;
}
/**
 * Interactive presentation of any GLTF (.glb) asset.
 */
export declare const Exhibit: FC<ExhibitProps>;
