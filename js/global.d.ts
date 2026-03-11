declare module '*?url' {
    const content: string;
    export default content;
}

interface ButterchurnVisualizer {
    connectAudio(sourceNode: AudioNode): void;
    loadPreset(preset: unknown, blendTime: number): void;
    render(): void;
    setRendererSize(width: number, height: number): void;
}

interface ButterchurnPresetsModule {
    getPresets(): Record<string, unknown>;
}

declare module 'butterchurn' {
    const butterchurn: {
        createVisualizer(
            audioContext: AudioContext,
            canvas: HTMLCanvasElement,
            options: {
                width: number;
                height: number;
                pixelRatio?: number;
                textureRatio?: number;
            }
        ): ButterchurnVisualizer;
    };
    export default butterchurn;
}

interface Window {
    butterchurnPresets?: ButterchurnPresetsModule;
}
