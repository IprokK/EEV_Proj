import { AnimationClip, NumberKeyframeTrack } from 'three';
/**
 * Animation Pointer Extension
 *
 * Draft Specification: https://github.com/ux3d/glTF/tree/extensions/KHR_animation_pointer/extensions/2.0/Khronos/KHR_animation_pointer
 */
declare class GLTFAnimationPointerExtension {
    constructor(parser: any);
    setAnimationPointerResolver(animationPointerResolver: any): this;
    _patchPropertyBindingFindNode(): void;
    loadAnimationTargetFromChannel(animationChannel: any): any;
    loadAnimationTargetFromChannelWithAnimationPointer(animationChannel: any): any;
    createAnimationTracksWithAnimationPointer(node: any, inputAccessor: any, outputAccessor: any, sampler: any, target: any): NumberKeyframeTrack[] | null;
    _tryResolveTargetId(path: any, type: any): number;
    /**
     * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#animations
     * @param {number} animationIndex
     * @return {Promise<AnimationClip>}
     */
    loadAnimation(animationIndex: any): Promise<AnimationClip>;
}
export { GLTFAnimationPointerExtension };
