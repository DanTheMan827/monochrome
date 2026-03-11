declare module '*?url' {
    const content: string;
    export default content;
}

interface KeyboardShortcut {
    key?: string | null;
    shift?: boolean;
    ctrl?: boolean;
    alt?: boolean;
    description?: string;
}

interface JspfPlaylist {
    title?: string;
    annotation?: string;
    image?: string;
    creator?: string;
    extension?: Record<string, { creator?: string }>;
}

interface JspfParseResult {
    tracks: Record<string, unknown>[];
    missingTracks: Record<string, unknown>[];
    jspfData?: { playlist?: JspfPlaylist };
}

declare module 'virtual:pwa-register' {
    export type { RegisterSWOptions } from 'vite-plugin-pwa/types';
    export function registerSW(
        options?: import('vite-plugin-pwa/types').RegisterSWOptions
    ): (reloadPage?: boolean) => Promise<void>;
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

interface PlausibleFunction {
    (eventName: string, options?: { props: Record<string, unknown> }): void;
    q?: IArguments[];
    init?: (options?: Record<string, unknown>) => void;
    o?: Record<string, unknown>;
}

interface NeutralinoOS {
    showFolderDialog(title: string): Promise<string | null>;
}

interface NeutralinoFilesystem {
    readDirectory(path: string): Promise<{ entry: string; type: string }[]>;
    readBinaryFile(path: string): Promise<ArrayBuffer>;
    getStats(path: string): Promise<{ mtime: number }>;
}

interface NeutralinoAPI {
    os: NeutralinoOS;
    filesystem: NeutralinoFilesystem;
}

interface Window {
    monochromePlayer: any;
    butterchurnPresets?: ButterchurnPresetsModule;
    __IS_IOS__?: boolean;
    __AUTH_GATE__?: boolean;
    NL_MODE?: boolean;
    Neutralino?: NeutralinoAPI;
    localFilesCache?: Record<string, unknown>[];
    showDirectoryPicker?: (options?: {
        id?: string;
        mode?: FileSystemPermissionMode;
        startIn?: FileSystemHandle | string;
    }) => Promise<FileSystemDirectoryHandle>;
}
