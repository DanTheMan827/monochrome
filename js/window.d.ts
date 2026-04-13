/**
 * Global Window interface augmentations.
 *
 * This file is a plain script-context declaration file (no imports/exports),
 * so every top-level declaration here merges directly into the global scope.
 * The `interface Window` block below merges with the built-in `Window` type.
 */

/** Butterchurn preset pack shape (loaded via script tag from /lib/butterchurnPresets.min.js). */
interface ButterchurnPresets {
    /** Returns a map of preset name → preset data object. */
    getPresets(): Record<string, object>;
}

/**
 * Minimal Kuroshiro instance shape.
 * The real type is declared inside the CDN bundle; we only care about `init` and `convert`.
 */
interface KuroshiroInstance {
    init(analyzer: object): Promise<void>;
    convert(text: string, options?: object): Promise<string>;
}

/** Constructor / CDN-export shape for Kuroshiro. */
interface KuroshiroConstructor {
    new (): KuroshiroInstance;
    /** CDN builds wrap the class in a `.default` property. */
    default?: KuroshiroConstructor;
}

/** Constructor / CDN-export shape for KuromojiAnalyzer. */
interface KuromojiAnalyzerConstructor {
    new (options?: { dictPath?: string }): object;
    /** CDN builds wrap the class in a `.default` property. */
    default?: KuromojiAnalyzerConstructor;
}

/** Plausible analytics stub injected into the page at runtime. */
interface PlausibleStub {
    (eventName: string, options?: object): void;
    /** Queued calls before the real script loads. */
    q?: IArguments[];
    /** Init options object. */
    o?: object;
    /** Finalise the stub once the real Plausible script has loaded. */
    init?(): void;
}

/** Shape of the `window.monochrome` debug object (only present in DEV builds). */
interface MonochromeDebugObject {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    [key: string]: Function | object;
}

/** Minimal VanillaTilt API (the full library is loaded via script tag). */
interface VanillaTiltStatic {
    init(
        el: HTMLElement | HTMLElement[],
        options?: {
            max?: number;
            speed?: number;
            glare?: boolean;
            'max-glare'?: number;
            [key: string]: unknown;
        }
    ): void;
}

/** Per-element VanillaTilt instance attached by `VanillaTilt.init()`. */
interface VanillaTiltInstance {
    destroy(): void;
}

/** Augment HTMLElement to include the vanillaTilt instance property set by VanillaTilt.init(). */
interface HTMLElement {
    vanillaTilt?: VanillaTiltInstance;
}

/** A single local-file track entry produced by `readTrackMetadata`. */
interface LocalTrackMetadata {
    /** Synthetic id assigned during the folder scan (`local-<index>-<filename>`). */
    id: string;
    title?: string;
    artist?: { name?: string };
    album?: { title?: string };
    duration?: number;
    /** Absolute or object-URL path to the local file. */
    url?: string;
    [key: string]: unknown;
}

interface Window {
    // ── TIDAL / monochrome ──────────────────────────────────────────────────

    /** When `true`, all API traffic goes directly to TIDAL (no proxy instances). */
    allTidal?: boolean;

    /** Dev-only debug object exposing top-level app singletons. */
    monochrome?: MonochromeDebugObject;

    /** The active `MultiScrobbler` instance, set after initialisation. */
    monochromeScrobbler?: import('./multi-scrobbler.js').MultiScrobbler;

    // ── Local-files cache ────────────────────────────────────────────────────

    /** In-memory cache of tracks read from the local media folder. */
    localFilesCache?: LocalTrackMetadata[];

    /** `true` while a local-media-folder scan is in progress. */
    localFilesScanInProgress?: boolean;

    /**
     * Re-scans the local media folder (or does a cheap single-file update).
     * Assigned in app.js after the first scan is wired up.
     */
    refreshLocalMediaFolder?: (blob?: Blob | null, filename?: string | null) => Promise<void>;

    // ── Render queue ─────────────────────────────────────────────────────────

    /** Async callback that re-renders the current queue view.  Set by ui-interactions.js. */
    renderQueueFunction?: () => Promise<void>;

    // ── Third-party libraries loaded via <script> tag ────────────────────────

    /** VanillaTilt tilt-effect library. */
    VanillaTilt?: VanillaTiltStatic;

    /** Butterchurn (Milkdrop) preset pack. */
    butterchurnPresets?: ButterchurnPresets;

    /**
     * Kuroshiro romanisation library loaded on demand from CDN.
     * CDN builds may wrap the class in a `.default` property.
     */
    Kuroshiro?: KuroshiroConstructor;

    /**
     * Kuromoji analyser constructor loaded on demand from CDN.
     * CDN builds may wrap the class in a `.default` property.
     */
    KuromojiAnalyzer?: KuromojiAnalyzerConstructor;

    // ── Vendor-prefixed Web APIs ──────────────────────────────────────────────

    /** Safari / older WebKit vendor-prefixed `AudioContext`. */
    webkitAudioContext?: typeof AudioContext;

    /** Safari / older WebKit vendor-prefixed `OfflineAudioContext`. */
    webkitOfflineAudioContext?: typeof OfflineAudioContext;

    // ── Plausible analytics ───────────────────────────────────────────────────

    /** Plausible analytics stub (self-hosted). */
    plausible?: PlausibleStub;

    // ── Auth-gate / back-end feature flags (injected by vite-plugin-auth-gate) ─

    /** `true` when the auth-gate feature is active. */
    __AUTH_GATE__?: boolean;

    /** PocketBase instance URL. */
    __POCKETBASE_URL__?: string;

    /** Appwrite project ID. */
    __APPWRITE_PROJECT_ID__?: string;

    /** Appwrite endpoint URL. */
    __APPWRITE_ENDPOINT__?: string;

    // ── XHR / Fetch interceptor saved references (lyrics.js) ─────────────────

    /** Original `XMLHttpRequest.prototype.open` saved by the lyrics CDN interceptor. */
    _originalXHROpen?: typeof XMLHttpRequest.prototype.open;

    /** Original `window.fetch` saved by the lyrics CDN interceptor. */
    _originalFetch?: typeof fetch;

    // ── Neutralino ────────────────────────────────────────────────────────────

    /** Neutralino.js run-mode string (only present in desktop/Neutralino builds). */
    NL_MODE?: string;
}

/** Injected by Vite at build time; the short git commit hash. */
declare const __COMMIT_HASH__: string | undefined;

/** Navigator augmentation for iOS PWA detection. */
interface Navigator {
    /** `true` when running as an installed PWA on iOS Safari. */
    standalone?: boolean;
}
