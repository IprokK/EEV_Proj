import { AnimationClip, AnimationMixer, Object3D } from 'three';
import { AnimationsT } from '../types';
export declare const loadAnimationClips: (source: Blob | string) => Promise<AnimationClip[]>;
export declare const playAssetIdleAnimation: (root: Object3D, animations: Array<AnimationClip>) => Array<AnimationMixer> | null;
export declare const updateAssetAnimations: (mixers: Array<AnimationMixer> | null, delta: number) => boolean;
export declare const disposeAssetAnimations: (mixers: Array<AnimationMixer> | null, root: Object3D) => boolean;
export declare const useAnimations: (animations: AnimationsT) => Record<string, AnimationClip>;
export declare const getAnimation: (name: string) => string;
