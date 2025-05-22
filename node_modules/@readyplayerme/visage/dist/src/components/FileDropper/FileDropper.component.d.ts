import { FC, ReactNode } from 'react';
interface DropContainerProps {
    children?: ReactNode | ReactNode[];
    placeholder?: string;
}
/**
 * This component is only for using in Storybook for showcasing drag'n'drop functionality.
 */
export declare const FileDropper: FC<DropContainerProps>;
export {};
