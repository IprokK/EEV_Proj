import { FC } from 'react';
type CaptureSettingsType = {
    quality?: number;
    type?: string;
};
export type CaptureType = {
    trigger: boolean;
    callBack: (capture?: string) => void;
    settings?: CaptureSettingsType;
};
type CaptureProps = CaptureType;
declare const Capture: FC<CaptureProps>;
export default Capture;
