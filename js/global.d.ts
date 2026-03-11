declare module '*?url' {
    const content: string;
    export default content;
}

interface ButterchurnPresetData {
    [key: string]: unknown;
}

interface ButterchurnPresetsModule {
    getPresets(): Record<string, ButterchurnPresetData>;
}

interface ButterchurnVisualizer {
    connectAudio(sourceNode: AudioNode): void;
    loadPreset(preset: ButterchurnPresetData, blendDuration: number): void;
    render(): void;
    setRendererSize(width: number, height: number): void;
}

interface Window {
    monochromePlayer: any;
    butterchurnPresets?: ButterchurnPresetsModule;
}
