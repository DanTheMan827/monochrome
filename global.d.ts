/* eslint-disable @typescript-eslint/no-explicit-any */

// ──────────────────────────────────────────────────
// Global type declarations for Monochrome
// ──────────────────────────────────────────────────

// Firebase dynamic imports (loaded from CDN)
declare module 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js' {
    export function initializeApp(config: Record<string, string>): FirebaseApp;
    interface FirebaseApp {
        name: string;
    }
}

declare module 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js' {
    export function getAuth(app?: any): FirebaseAuth;
    export class GoogleAuthProvider {
        constructor();
    }
    export function signInWithPopup(auth: FirebaseAuth, provider: GoogleAuthProvider): Promise<FirebaseUserCredential>;
    export function signInWithRedirect(auth: FirebaseAuth, provider: GoogleAuthProvider): Promise<void>;
    export function getRedirectResult(auth: FirebaseAuth): Promise<FirebaseUserCredential | null>;
    export function signInWithEmailAndPassword(
        auth: FirebaseAuth,
        email: string,
        password: string
    ): Promise<FirebaseUserCredential>;
    export function createUserWithEmailAndPassword(
        auth: FirebaseAuth,
        email: string,
        password: string
    ): Promise<FirebaseUserCredential>;
    export function sendPasswordResetEmail(auth: FirebaseAuth, email: string): Promise<void>;
    export function onAuthStateChanged(
        auth: FirebaseAuth,
        callback: (user: FirebaseUser | null) => void,
        error?: (error: Error) => void
    ): () => void;
    export function signOut(auth: FirebaseAuth): Promise<void>;
    export function updateProfile(
        user: FirebaseUser,
        profile: { displayName?: string; photoURL?: string }
    ): Promise<void>;
    interface FirebaseAuth {
        currentUser: FirebaseUser | null;
    }
    interface FirebaseUser {
        uid: string;
        email: string | null;
        displayName: string | null;
        photoURL: string | null;
        getIdToken(): Promise<string>;
    }
    interface FirebaseUserCredential {
        user: FirebaseUser;
    }
}

declare module 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js' {
    export function getDatabase(app?: any): FirebaseDatabase;
    export function ref(db: FirebaseDatabase, path: string): FirebaseDatabaseRef;
    export function set(ref: FirebaseDatabaseRef, value: any): Promise<void>;
    export function get(ref: FirebaseDatabaseRef): Promise<FirebaseDataSnapshot>;
    export function onValue(ref: FirebaseDatabaseRef, callback: (snapshot: FirebaseDataSnapshot) => void): () => void;
    export function push(ref: FirebaseDatabaseRef): FirebaseDatabaseRef;
    export function child(ref: FirebaseDatabaseRef, path: string): FirebaseDatabaseRef;
    export function update(ref: FirebaseDatabaseRef, value: Record<string, any>): Promise<void>;
    export function remove(ref: FirebaseDatabaseRef): Promise<void>;
    interface FirebaseDatabase {
        app: any;
    }
    interface FirebaseDatabaseRef {
        key: string | null;
    }
    interface FirebaseDataSnapshot {
        val(): any;
        exists(): boolean;
        forEach(callback: (child: FirebaseDataSnapshot) => boolean | void): void;
        key: string | null;
    }
}

// CDN dynamic imports
declare module 'https://cdn.jsdelivr.net/npm/client-zip@2.4.5/+esm' {
    interface ZipInput {
        name: string;
        input: Blob | ReadableStream | ArrayBuffer | string;
    }
    export function downloadZip(
        files: Iterable<ZipInput> | AsyncIterable<ZipInput>
    ): Response;
}

// Butterchurn & presets
declare module 'butterchurn' {
    interface ButterchurnVisualizer {
        connectAudio(node: AudioNode): void;
        loadPreset(preset: Record<string, unknown>, blendTime: number): void;
        render(): void;
        setRendererSize(width: number, height: number): void;
    }
    export default class Visualizer {
        static createVisualizer(
            audioContext: AudioContext,
            canvas: HTMLCanvasElement,
            options: { width: number; height: number }
        ): ButterchurnVisualizer;
    }
}

declare module 'butterchurn-presets' {
    const presets: Record<string, Record<string, unknown>>;
    export default presets;
}

// dashjs
declare module 'dashjs' {
    export interface MediaPlayerClass {
        create(): MediaPlayerClass;
        initialize(element: HTMLMediaElement, url: string, autoplay: boolean): void;
        updateSettings(settings: Record<string, unknown>): void;
        attachSource(url: string): void;
        on(event: string, callback: (...args: any[]) => void): void;
        off(event: string, callback: (...args: any[]) => void): void;
        reset(): void;
        destroy(): void;
        getQualityFor(type: string): number;
        setQualityFor(type: string, quality: number): void;
        getBitrateInfoListFor(type: string): any[];
        isReady(): boolean;
        isPaused(): boolean;
        play(): void;
        pause(): void;
        seek(time: number): void;
        time(): number;
        duration(): number;
    }
    export function MediaPlayer(): MediaPlayerClass;
}

// Neutralino API
declare namespace Neutralino {
    namespace events {
        function on(event: string, handler: (ev: { detail: string }) => void): void;
        function off(event: string, handler: (ev: { detail: string }) => void): void;
        function broadcast(event: string, data?: unknown): Promise<void>;
    }
    namespace extensions {
        function dispatch(extensionId: string, event: string, data?: unknown): Promise<void>;
    }
    namespace filesystem {
        interface DirectoryEntry {
            entry: string;
            type: string;
        }
        interface FileStats {
            size: number;
            isFile: boolean;
            isDirectory: boolean;
        }
        function readDirectory(path: string): Promise<DirectoryEntry[]>;
        function readBinaryFile(path: string): Promise<ArrayBuffer>;
        function getStats(path: string): Promise<FileStats>;
    }
    namespace os {
        function showFolderDialog(title: string): Promise<string>;
        function open(url: string): Promise<void>;
    }
    // eslint-disable-next-line @typescript-eslint/no-shadow
    namespace window {
        function setTitle(title: string): Promise<void>;
    }
    function init(): void;
}

// Webkit Audio extensions
interface WebkitAudioContext extends AudioContext {}
interface WebkitOfflineAudioContext extends OfflineAudioContext {}

// Global Window extensions
interface Window {
    __IS_IOS__: boolean;
    __AUTH_GATE__?: boolean;
    __AUTH_PROVIDERS__?: { google?: boolean; password?: boolean };
    __FIREBASE_CONFIG__?: Record<string, string>;
    __POCKETBASE_URL__?: string;
    monochromePlayer?: any;
    renderQueueFunction?: () => void;
    Kuroshiro?: new () => {
        init(analyzer: unknown): Promise<void>;
        convert(text: string, options: { to: string; mode: string }): Promise<string>;
    };
    KuromojiAnalyzer?: new (options: { dictPath: string }) => unknown;
    Lenis?: new (options?: Record<string, unknown>) => {
        raf(time: number): void;
        destroy(): void;
    };
    butterchurnPresets?: Record<string, Record<string, unknown>>;
    _originalXHROpen?: typeof XMLHttpRequest.prototype.open;
    _originalFetch?: typeof globalThis.fetch;
    localFilesCache?: any[];
    NL_MODE?: boolean;
    plausible?: (...args: unknown[]) => void;
    Neutralino?: typeof Neutralino;
    webkitAudioContext?: typeof AudioContext;
    webkitOfflineAudioContext?: typeof OfflineAudioContext;
    setTitle?: (title: string) => Promise<void>;
    showDirectoryPicker?: (options?: Record<string, unknown>) => Promise<any>;
    showSaveFilePicker?: (options?: Record<string, unknown>) => Promise<any>;
}

// ──────────────────────────────────────────────────
// Common application types
// ──────────────────────────────────────────────────

interface TrackArtist {
    id: string | number;
    name: string;
    type?: string;
    picture?: string;
    [key: string]: unknown;
}

interface TrackAlbum {
    id: string | number;
    title: string;
    cover: string;
    releaseDate?: string;
    vibrantColor?: string;
    artist?: TrackArtist;
    numberOfTracks?: number;
    mediaMetadata?: { tags?: string[] };
    duration?: number;
    url?: string;
    explicit?: boolean;
    numberOfVolumes?: number;
    type?: string;
    [key: string]: unknown;
}

interface TrackData {
    id: string | number;
    title: string;
    duration: number;
    explicit?: boolean;
    artist?: TrackArtist;
    artists?: TrackArtist[];
    album?: TrackAlbum;
    version?: string;
    trackNumber?: number;
    volumeNumber?: number;
    copyright?: string;
    isrc?: string;
    streamStartDate?: string;
    audioQuality?: string;
    audioUrl?: string;
    remoteUrl?: string;
    mediaMetadata?: { tags?: string[] };
    isLocal?: boolean;
    isTracker?: boolean;
    trackerInfo?: TrackerInfo;
    mixes?: Record<string, { id: string }>;
    isUnavailable?: boolean;
    allowStreaming?: boolean;
    streamReady?: boolean;
    url?: string;
    replayGain?: number;
    peak?: number;
    quality?: string;
    editable?: boolean;
    dateAdded?: string | number;
    description?: string;
    popularity?: number;
    bpm?: number;
    cover?: string;
    [key: string]: unknown;
}

interface TrackerInfo {
    id?: string;
    source?: string;
    url?: string;
    cover?: string;
    artist?: string;
    title?: string;
    duration?: number;
    streamUrl?: string;
    [key: string]: unknown;
}

interface PlaylistData {
    id: string | number;
    title?: string;
    name?: string;
    description?: string;
    cover?: string;
    image?: string;
    tracks?: TrackData[];
    items?: TrackData[];
    numberOfTracks?: number;
    duration?: number;
    creator?: { id: string | number; name?: string };
    created?: string;
    lastUpdated?: string;
    type?: string;
    url?: string;
    uuid?: string;
    squareImage?: string;
    isLocal?: boolean;
    isEditable?: boolean;
    [key: string]: unknown;
}

interface ArtistData {
    id: string | number;
    name: string;
    picture?: string;
    url?: string;
    popularity?: number;
    artistTypes?: string[];
    mixes?: Record<string, { id: string }>;
    bio?: { text?: string; summary?: string };
    albums?: TrackAlbum[];
    topTracks?: TrackData[];
    singles?: TrackAlbum[];
    compilations?: TrackAlbum[];
    [key: string]: unknown;
}

interface SearchResults {
    tracks?: { items: TrackData[]; totalNumberOfItems?: number };
    albums?: { items: TrackAlbum[]; totalNumberOfItems?: number };
    artists?: { items: ArtistData[]; totalNumberOfItems?: number };
    playlists?: { items: PlaylistData[]; totalNumberOfItems?: number };
    topHit?: { value?: TrackData | TrackAlbum | ArtistData; type?: string };
}

interface MixData {
    id: string;
    title?: string;
    subTitle?: string;
    rows?: { modules?: MixModule[] }[];
    [key: string]: unknown;
}

interface MixModule {
    type?: string;
    title?: string;
    pagedList?: {
        items?: Record<string, unknown>[];
    };
    [key: string]: unknown;
}

interface QueueState {
    queue: TrackData[];
    currentIndex: number;
    currentTime?: number;
    shuffleActive?: boolean;
    repeatMode?: number;
}

interface ScrobbleData {
    artist: string;
    track: string;
    album?: string;
    duration?: number;
    timestamp?: number;
}

// Cloudflare Pages function context
interface CFContext {
    request: Request;
    params: Record<string, string>;
    env: {
        ASSETS: { fetch(request: Request): Promise<Response> };
        [key: string]: unknown;
    };
}

// PWA register module
declare module 'virtual:pwa-register' {
    export function registerSW(options?: {
        onNeedRefresh?: () => void;
        onOfflineReady?: () => void;
    }): (reloadPage?: boolean) => Promise<void>;
}
