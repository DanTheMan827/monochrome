declare module '*?url' {
    const content: string;
    export default content;
}

declare module '*?blob-url' {
    const urlPromise: () => Promise<string>;
    export default urlPromise;
}

declare module '*?svg&size=22' {
    const content: string;
    export default content;
}

declare module '*?svg&size=*' {
    const content: string;
    export default content;
}

declare module 'virtual:pwa-register' {
    export function registerSW(options?: {
        immediate?: boolean;
        onNeedRefresh?: () => void;
        onOfflineReady?: () => void;
        onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
        onRegisterError?: (error: Error) => void;
    }): (reloadPage?: boolean) => void;
}

declare module '*?svg&icon' {
    const resize: (size: number, attrs?: Record<string, string>) => string;
    export default resize;
}

declare module '*?svg&icon&class=heart-icon' {
    const resize: (size: number, attrs?: Record<string, string>) => string;
    export default resize;
}

declare module '*?svg&icon&class=heart-icon+filled' {
    const resize: (size: number, attrs?: Record<string, string>) => string;
    export default resize;
}

declare module 'https://cdn.jsdelivr.net/npm/client-zip@2.4.5/+esm' {
    /** Creates a ZIP stream from an async iterable of file entries. */
    export function downloadZip(files: AsyncIterable<object>): Response;
}

type WithRequiredKeys<T> = {
    [K in keyof T]-?: T[K] | undefined;
};

/** Injected by Vite at build time; the short git commit hash. */
const __COMMIT_HASH__: string | undefined;

/** Injected by Neutralino at runtime; indicates if the app is running in Neutralino mode. */
const NL_MODE: boolean;
