import { Emotion } from 'src/components/Avatar/Avatar.component';
export declare const ignoreArgTypesOnExamples: Record<string, {
    table: {
        disable: boolean;
    };
}>;
export declare const modelPresets: {
    one: string;
    two: string;
    three: string;
    five: string;
    six: string;
    seven: string;
};
export declare const animationPresets: {
    one: string;
    two: string;
    three: string;
};
type FacialExpressionT = 'idle' | 'angry' | 'smile' | 'sad';
export declare const emotions: Record<FacialExpressionT, Emotion>;
export {};
