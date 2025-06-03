export declare const environmentPresets: {
    hub: string;
    sunset: string;
    dawn: string;
    night: string;
    warehouse: string;
    forest: string;
    apartment: string;
    studio: string;
    city: string;
    park: string;
    lobby: string;
    soft: string;
};
export type EnvironmentPresets = keyof typeof environmentPresets;
export declare const getPresetEnvironmentMap: (preset: EnvironmentPresets) => string;
export declare const environmentModels: {
    spaceStation: string;
    platformDark: string;
    platformGreen: string;
    platformBlue: string;
};
export type EnvironmentModels = keyof typeof environmentModels;
