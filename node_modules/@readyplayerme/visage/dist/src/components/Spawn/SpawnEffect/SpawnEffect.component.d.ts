import { FC } from 'react';
interface SpawnEffectProps {
    onLoadedEffectFinish: () => void;
    onLoadedEffect: {
        src: string;
        animationSrc?: string;
        loop?: number;
    };
}
export declare const SpawnEffect: FC<SpawnEffectProps>;
export {};
