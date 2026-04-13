import { modernSettings } from './ModernSettings.js';
import { SVG_ATMOS } from './icons.js';
import { qualityBadgeSettings, coverArtSizeSettings, trackDateSettings } from './storage.js';
import type { TidalMediaMetadata } from './HiFi.js';
import type { Artist, TrackAlbum as ContainerTrackAlbum, ReplayGain } from './container-classes.js';

export const QUALITY = 'HI_RES_LOSSLESS';

export const REPEAT_MODE = {
    OFF: 0,
    ALL: 1,
    ONE: 2,
};

export const AUDIO_QUALITIES = {
    DOLBY_ATMOS: 'DOLBY_ATMOS',
    HI_RES_LOSSLESS: 'HI_RES_LOSSLESS',
    LOSSLESS: 'LOSSLESS',
    HIGH: 'HIGH',
    LOW: 'LOW',
};

export const QUALITY_PRIORITY: string[] = ['DOLBY_ATMOS', 'HI_RES_LOSSLESS', 'LOSSLESS', 'HIGH', 'LOW'];

export const QUALITY_TOKENS: Record<string, string[]> = {
    DOLBY_ATMOS: ['DOLBY_ATMOS', 'ATMOS'],
    HI_RES_LOSSLESS: [
        'HI_RES_LOSSLESS',
        'HIRES_LOSSLESS',
        'HIRESLOSSLESS',
        'HIFI_PLUS',
        'HI_RES_FLAC',
        'HI_RES',
        'HIRES',
        'MASTER',
        'MASTER_QUALITY',
        'MQA',
    ],
    LOSSLESS: ['LOSSLESS', 'HIFI'],
    HIGH: ['HIGH', 'HIGH_QUALITY'],
    LOW: ['LOW', 'LOW_QUALITY'],
};

export const RATE_LIMIT_ERROR_MESSAGE = 'Too Many Requests. Please wait a moment and try again.';

// ─── Shared track shape ───────────────────────────────────────────────────────

/**
 * Loose artist reference that works across providers.
 * Derived from {@link Artist} in container-classes with:
 *  - `id` widened to `string | number` (non-TIDAL providers may use string IDs)
 *  - `picture` made nullable (TIDAL API returns `null` when no image is set)
 *  - all fields made optional for partial/synthetic objects
 */
export type TrackArtist = Partial<Omit<Artist, 'id' | 'picture'>> & {
    id?: string | number;
    picture?: string | null;
};

/**
 * Loose album reference that works across providers.
 * Extends the core fields of {@link ContainerTrackAlbum} (id, title, cover,
 * vibrantColor, videoCover) with extra fields drawn from the full {@link Album} /
 * {@link EnrichedAlbum} subclasses and provider-specific extras.
 */
export type TrackAlbum = Partial<ContainerTrackAlbum> & {
    /** Alternative cover ID field used by some providers. */
    coverId?: string;
    /** Alternative cover URL field used by some providers. */
    image?: string;
    /** Primary artist reference. */
    artist?: TrackArtist;
    /** All credited artists. */
    artists?: TrackArtist[];
    /** ISO-8601 release date. */
    releaseDate?: string;
    /** Total number of discs in the album. */
    totalDiscs?: number;
    /** Number of tracks on this disc. */
    numberOfTracksOnDisc?: number;
    /** Total number of tracks in the album. */
    numberOfTracks?: number;
    /** Media metadata (quality tags). */
    mediaMetadata?: Partial<TidalMediaMetadata> & { discNumber?: number };
};

export interface TrackerInfo {
    sheetId?: string;
}

/**
 * A loose track shape compatible with both TIDAL tracks ({@link import('./HiFi.js').TidalTrack}) and
 * local/tracker tracks. All fields are optional so that partial objects can be used safely.
 */
export interface TrackLike {
    id?: string | number;
    title?: string;
    version?: string | null;
    artist?: TrackArtist;
    artists?: TrackArtist[];
    album?: TrackAlbum;
    trackNumber?: number;
    duration?: number;
    streamStartDate?: string;
    explicit?: boolean;
    explicitLyrics?: boolean;
    allowStreaming?: boolean;
    streamReady?: boolean;
    isLocal?: boolean;
    isTracker?: boolean;
    trackerInfo?: TrackerInfo;
    audioQuality?: string;
    volumeNumber?: number;
    discNumber?: number;
    mediaNumber?: number;
    media_number?: number;
    volume?: number | { number?: number };
    disc?: number | string | { number?: number };
    disc_no?: number;
    discNo?: number;
    disc_number?: number;
    mediaMetadata?: Partial<TidalMediaMetadata> & { discNumber?: number };
    bpm?: number | string | null;
    /** Replay-gain data: either a raw dB value (TIDAL simple) or a full {@link ReplayGain} object. */
    replayGain?: number | Partial<ReplayGain>;
    cover?: string;
    coverId?: string;
    image?: string;
    audioModes?: string[];
    mixes?: Record<string, string>;
    type?: string;
    /** Whether the track is unavailable for playback (e.g. tracker tracks with no direct URL). */
    unavailable?: boolean;
    /** UUID identifier used by playlist/library items in IndexedDB. */
    uuid?: string | number;
}

/** Data object accepted by {@link formatTemplate} and {@link formatPathTemplate}. */
export interface TemplateData {
    discNumber?: number;
    trackNumber?: number;
    artist?: string;
    title?: string;
    album?: string;
    albumArtist?: string;
    albumTitle?: string;
    year?: string | number;
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

export const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
        return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${m}:${String(s).padStart(2, '0')}`;
};

export const getTrackYearDisplay = (track: TrackLike): string => {
    const useAlbumYear = trackDateSettings.useAlbumYear();
    const releaseDate = useAlbumYear
        ? track?.album?.releaseDate || track?.streamStartDate
        : track?.streamStartDate || track?.album?.releaseDate;
    if (!releaseDate) return '';
    const date = new Date(releaseDate);
    return isNaN(date.getTime()) ? '' : ` • ${date.getFullYear()}`;
};

export const createPlaceholder = (text: string, isLoading = false): string => {
    return `<div class="placeholder-text ${isLoading ? 'loading' : ''}">${text}</div>`;
};

export const trackDataStore = new WeakMap<object, TrackLike>();

export const sanitizeForFilename = (value: string | null | undefined): string => {
    if (!value) return 'Unknown';
    return value
        .replace(/[\\/:*?"<>|]/g, '_')
        .replace(/\s+/g, ' ')
        .trim();
};

/**
 * Sanitizes a single path component (no slashes allowed in the output).
 * Invalid filesystem characters are replaced with underscores.
 */
export const sanitizeForPathComponent = (value: string | null | undefined): string => {
    if (!value) return 'Unknown';
    return value
        .replace(/[\\/:*?"<>|]/g, '_')
        .replace(/\s+/g, ' ')
        .trim();
};

/**
 * Like {@link formatTemplate} but allows `/` in the template for nested
 * directory structures.  Each path component has invalid characters replaced,
 * the path is normalised to forward-slash separators, and empty components,
 * `.`, and `..` segments are stripped.
 */
export const formatPathTemplate = (template: string, data: TemplateData): string => {
    const result = replaceTokens(template, {
        discNumber: String(Number(data.discNumber || 1)),
        trackNumber: data.trackNumber ? String(data.trackNumber).padStart(2, '0') : '00',
        artist: sanitizeForPathComponent(data.artist || 'Unknown Artist'),
        title: sanitizeForPathComponent(data.title || 'Unknown Title'),
        album: sanitizeForPathComponent(data.album || 'Unknown Album'),
        albumArtist: sanitizeForPathComponent(data.albumArtist || 'Unknown Artist'),
        albumTitle: sanitizeForPathComponent(data.albumTitle || 'Unknown Album'),
        year: sanitizeForPathComponent(String(data.year || 'Unknown')),
    });

    // Normalise separators, collapse duplicates, strip . and ..
    return result
        .replace(/\\/g, '/')
        .split('/')
        .map((p) => p.trim())
        .filter((p) => p !== '' && p !== '.' && p !== '..')
        .join('/');
};

// ─── Audio format detection ───────────────────────────────────────────────────

/**
 * Detects audio format from DataView of first bytes.
 * @param view - DataView of first 12 bytes of audio file
 * @param mimeType - MIME type from blob
 * @returns Format: 'flac', 'mp4', 'mp3', 'ogg', 'wav', 'ts', 'm3u8', or null
 */
export const detectAudioFormat = (view: DataView, mimeType = ''): string | null => {
    // Check for FLAC signature: "fLaC" (0x66 0x4C 0x61 0x43)
    if (
        view.byteLength >= 4 &&
        view.getUint8(0) === 0x66 && // f
        view.getUint8(1) === 0x4c && // L
        view.getUint8(2) === 0x61 && // a
        view.getUint8(3) === 0x43 // C
    ) {
        return 'flac';
    }

    // Check for OGG signature: "OggS" (0x4F 0x67 0x67 0x53)
    if (
        view.byteLength >= 4 &&
        view.getUint8(0) === 0x4f && // O
        view.getUint8(1) === 0x67 && // g
        view.getUint8(2) === 0x67 && // g
        view.getUint8(3) === 0x53 // S
    ) {
        return 'ogg';
    }

    // Check for MP4/M4A signature: "ftyp" at offset 4
    if (
        view.byteLength >= 8 &&
        view.getUint8(4) === 0x66 && // f
        view.getUint8(5) === 0x74 && // t
        view.getUint8(6) === 0x79 && // y
        view.getUint8(7) === 0x70 // p
    ) {
        return 'mp4';
    }

    // Check for MP3 signature: ID3 tag or MPEG frame sync
    if (
        view.byteLength >= 3 &&
        view.getUint8(0) === 0x49 && // I
        view.getUint8(1) === 0x44 && // D
        view.getUint8(2) === 0x33 // 3
    ) {
        return 'mp3';
    }

    // Detect RIFF/WAVE by "RIFF" at offset 0 and "WAVE" at offset 8 (only in dev mode)
    if (
        import.meta.env.DEV &&
        view.byteLength >= 12 &&
        view.getUint8(0) === 0x52 && // R
        view.getUint8(1) === 0x49 && // I
        view.getUint8(2) === 0x46 && // F
        view.getUint8(3) === 0x46 && // F
        view.getUint8(8) === 0x57 && // W
        view.getUint8(9) === 0x41 && // A
        view.getUint8(10) === 0x56 && // V
        view.getUint8(11) === 0x45 // E
    ) {
        return 'wav';
    }

    // Check for MPEG frame sync (0xFF 0xFB or 0xFF 0xFA)
    if (view.byteLength >= 2 && view.getUint8(0) === 0xff && (view.getUint8(1) & 0xe0) === 0xe0) {
        return 'mp3';
    }

    if (
        view.byteLength >= 7 &&
        view.getUint8(0) === 0x23 &&
        view.getUint8(1) === 0x45 &&
        view.getUint8(2) === 0x58 &&
        view.getUint8(3) === 0x54 &&
        view.getUint8(4) === 0x4d &&
        view.getUint8(5) === 0x33 &&
        view.getUint8(6) === 0x55
    ) {
        return 'm3u8';
    }

    if (view.byteLength >= 188 && view.getUint8(0) === 0x47 && view.getUint8(188) === 0x47) {
        return 'ts';
    }

    // Fallback to MIME type
    if (mimeType === 'audio/flac') return 'flac';
    if (mimeType === 'audio/ogg') return 'ogg';
    if (mimeType === 'audio/mp4' || mimeType === 'audio/x-m4a') return 'mp4';
    if (mimeType === 'audio/mp3' || mimeType === 'audio/mpeg') return 'mp3';

    return null;
};

/**
 * Detects actual audio format from blob signature.
 * @param blob - Audio blob to analyze
 * @returns Extension: 'flac', 'm4a', 'mp3', or fallback based on mime
 */
export const getExtensionFromBlob = async (blob: Blob): Promise<string> => {
    const buffer = await blob.slice(0, 12).arrayBuffer();
    const view = new DataView(buffer);

    const format = detectAudioFormat(view, blob.type);

    if (format === 'mp4') {
        if (blob.type.includes('video')) return 'mp4';
        return 'm4a';
    }
    if (format) return format;

    if (blob.type.includes('video')) return 'mp4';
    if (blob.type === 'audio/flac') return 'flac';
    if (blob.type === 'audio/ogg') return 'ogg';
    if (blob.type === 'audio/mp4' || blob.type === 'audio/x-m4a') return 'mp4';
    if (blob.type === 'audio/mp3' || blob.type === 'audio/mpeg') return 'mp3';

    return 'flac';
};

export const getExtensionForQuality = (quality: string): string => {
    switch (quality) {
        case 'LOW':
        case 'HIGH':
        case 'DOLBY_ATMOS':
            return 'm4a';
        default:
            return 'flac';
    }
};

export const buildTrackFilename = (track: TrackLike, quality: string, extension: string | null = null): string => {
    const template = modernSettings.filenameTemplate;
    const ext = extension || getExtensionForQuality(quality);

    const artistName = track.artist?.name || track.artists?.[0]?.name || 'Unknown Artist';

    const data: TemplateData = {
        discNumber: getTrackDiscNumber(track) ?? undefined,
        trackNumber: track.trackNumber,
        artist: artistName,
        title: getTrackTitle(track),
        album: track.album?.title,
    };

    return formatTemplate(template, data) + '.' + ext;
};

// ─── Quality helpers ──────────────────────────────────────────────────────────

const sanitizeToken = (value: string): string => {
    if (!value) return '';
    return value
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_');
};

export const normalizeQualityToken = (value: string | null | undefined): string | null => {
    if (!value) return null;

    const token = sanitizeToken(value);

    for (const [quality, aliases] of Object.entries(QUALITY_TOKENS)) {
        if (aliases.includes(token)) {
            return quality;
        }
    }
    return null;
};

export const createQualityBadgeHTML = (track: TrackLike): string => {
    if (!qualityBadgeSettings.isEnabled()) return '';

    const quality = deriveTrackQuality(track);
    if (quality === 'DOLBY_ATMOS') {
        return `<span class="quality-badge quality-atmos" title="Dolby Atmos">${SVG_ATMOS(20)}</span>`;
    } else if (quality === 'HI_RES_LOSSLESS') {
        return '<span class="quality-badge quality-hires" title="Hi-Res Lossless">HD</span>';
    }
    return '';
};

export const deriveQualityFromTags = (rawTags: unknown): string | null => {
    if (!Array.isArray(rawTags)) return null;

    const candidates: string[] = [];
    for (const tag of rawTags) {
        if (typeof tag !== 'string') continue;
        const normalized = normalizeQualityToken(tag);
        if (normalized && !candidates.includes(normalized)) {
            candidates.push(normalized);
        }
    }

    return pickBestQuality(candidates);
};

export const pickBestQuality = (candidates: (string | null | undefined)[]): string | null => {
    let best: string | null = null;
    let bestRank = Infinity;

    for (const candidate of candidates) {
        if (!candidate) continue;
        const rank = QUALITY_PRIORITY.indexOf(candidate);
        const currentRank = rank === -1 ? Infinity : rank;

        if (currentRank < bestRank) {
            best = candidate;
            bestRank = currentRank;
        }
    }

    return best;
};

export const deriveTrackQuality = (track: TrackLike | null | undefined): string | null => {
    if (!track) return null;

    const candidates = [
        deriveQualityFromTags(track.mediaMetadata?.tags),
        deriveQualityFromTags(track.album?.mediaMetadata?.tags),
        normalizeQualityToken(track.audioQuality),
    ];

    return pickBestQuality(candidates);
};

// ─── Misc utilities ───────────────────────────────────────────────────────────

export const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export const hasExplicitContent = (
    item: { explicit?: boolean; explicitLyrics?: boolean } | null | undefined
): boolean => {
    return item?.explicit === true || item?.explicitLyrics === true;
};

export const isTrackUnavailable = (track: TrackLike | null | undefined): boolean => {
    if (!track) return true;
    if (track.isLocal) return false;
    // AllowStreaming false or StreamReady false usually mean unavailable
    // title === 'Unavailable' is also a strong indicator from the user's example
    return track.allowStreaming === false || track.streamReady === false || track.title === 'Unavailable';
};

export const debounce = <R, T extends (...args: unknown[]) => R>(
    func: T,
    wait: number
): ((...args: Parameters<T>) => void) => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    return function executedFunction(...args: Parameters<T>) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

export const escapeHtml = (unsafe: string): string => {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

export const decodeHtml = (html: string | null | undefined): string | null => {
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent;
};

export const getTrackTitle = (track: TrackLike | null | undefined, { fallback = 'Unknown Title' } = {}): string => {
    if (!track?.title) return fallback;
    return track?.version ? `${track.title} (${track.version})` : track.title;
};

export const getTrackArtists = (track: TrackLike = {}, { fallback = 'Unknown Artist' } = {}): string => {
    if (track?.artists?.length) {
        return track.artists.map((artist) => artist?.name).join(', ');
    }

    return fallback;
};

export const getTrackArtistsHTML = (track: TrackLike = {}, { fallback = 'Unknown Artist' } = {}): string => {
    if (track?.artists?.length) {
        return track.artists
            .map((artist) => {
                const escapedName = escapeHtml(artist.name || 'Unknown Artist');
                const escapedId = escapeHtml(String(artist.id || ''));
                // Check if this is a tracker/unreleased track
                const isTracker = track.isTracker || (track.id && String(track.id).startsWith('tracker-'));
                if (isTracker && track.trackerInfo?.sheetId) {
                    const escapedSheetId = escapeHtml(track.trackerInfo.sheetId);
                    // For tracker tracks, link to the tracker artist page
                    return `<span class="artist-link tracker-artist-link" data-tracker-sheet-id="${escapedSheetId}">${escapedName}</span>`;
                }
                // For normal tracks, use the artist ID
                return `<span class="artist-link" data-artist-id="${escapedId}">${escapedName}</span>`;
            })
            .join(', ');
    }

    return fallback;
};

export const formatTemplate = (template: string, data: TemplateData): string =>
    replaceTokens(template, {
        discNumber: String(Number(data.discNumber || 1)),
        trackNumber: data.trackNumber ? String(data.trackNumber).padStart(2, '0') : '00',
        artist: sanitizeForFilename(data.artist || 'Unknown Artist'),
        title: sanitizeForFilename(data.title || 'Unknown Title'),
        album: sanitizeForFilename(data.album || 'Unknown Album'),
        albumArtist: sanitizeForFilename(data.albumArtist || 'Unknown Artist'),
        albumTitle: sanitizeForFilename(data.albumTitle || 'Unknown Album'),
        year: String(data.year || 'Unknown'),
    });

export const calculateTotalDuration = (tracks: { duration?: number }[]): number => {
    if (!Array.isArray(tracks) || tracks.length === 0) return 0;
    return tracks.reduce((total, track) => total + (track.duration || 0), 0);
};

export const formatDuration = (seconds: number | null | undefined): string => {
    if (!seconds || isNaN(seconds)) return '0 min';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
        return `${hours} hr ${minutes} min`;
    }
    return `${minutes} min`;
};

// ─── Cover art ────────────────────────────────────────────────────────────────

const coverCache = new Map<string, Blob>();

function resizeImageBlob(blob: Blob, size: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(blob);
        img.onload = () => {
            URL.revokeObjectURL(url);
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Failed to get canvas context'));
                return;
            }
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, size, size);
            canvas.toBlob(
                (resizedBlob) => {
                    if (resizedBlob) resolve(resizedBlob);
                    else reject(new Error('Canvas toBlob failed'));
                },
                blob.type || 'image/jpeg',
                0.9
            );
        };
        img.onerror = (e) => {
            URL.revokeObjectURL(url);
            reject(e instanceof Error ? e : new Error('Image load failed'));
        };
        img.src = url;
    });
}

/**
 * Fetches and caches cover art as a Blob.
 * @param api - API instance with getCoverUrl method
 * @param coverId - ID of the cover art to fetch
 * @returns Cover art blob or null if not available
 */
export async function getCoverBlob(
    api: { getCoverUrl(id: string, size: string): string },
    coverId: string
): Promise<Blob | null> {
    if (!coverId) return null;

    let sizeStr = coverArtSizeSettings.getSize();

    if (sizeStr.includes('x')) {
        sizeStr = sizeStr.split('x')[0];
    }

    let requestedSize = parseInt(sizeStr, 10);
    if (isNaN(requestedSize) || requestedSize <= 0) requestedSize = 1280;

    const cacheKey = `${coverId}-${requestedSize}`;
    if (coverCache.has(cacheKey)) return coverCache.get(cacheKey) || null;

    // Tidal seems to only support these soooo
    const supportedSizes = [80, 160, 320, 640, 1280];
    let fetchSize = 1280;

    const bestSize = supportedSizes.find((s) => s >= requestedSize);
    if (bestSize) {
        fetchSize = bestSize;
    }

    const fetchWithProxy = async (url: string): Promise<Blob | null> => {
        try {
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);
            if (response.ok) return await response.blob();
        } catch (e) {
            console.warn('Proxy fetch failed:', e);
        }
        return null;
    };

    let blob: Blob | null = null;
    try {
        const url = api.getCoverUrl(coverId, fetchSize.toString());
        // Try direct fetch first
        const response = await fetch(url);
        if (response.ok) {
            blob = await response.blob();
        } else {
            // If direct fetch fails (e.g. 404 from SW due to CORS), try proxy
            blob = await fetchWithProxy(url);
        }
    } catch {
        // Network error (CORS rejection not handled by SW), try proxy
        const url = api.getCoverUrl(coverId, fetchSize.toString());
        blob = await fetchWithProxy(url);
    }

    if (blob) {
        if (fetchSize !== requestedSize) {
            try {
                blob = await resizeImageBlob(blob, requestedSize);
            } catch (e) {
                console.warn('Failed to resize cover art, using original size:', e);
            }
        }
        coverCache.set(cacheKey, blob);
        return blob;
    }
    return null;
}

// ─── Menu positioning ─────────────────────────────────────────────────────────

/**
 * Positions a menu element relative to a point or an anchor rectangle,
 * ensuring it stays within the viewport and becomes scrollable if too tall.
 * @param menu - The menu element to position
 * @param x - X coordinate (clientX)
 * @param y - Y coordinate (clientY)
 * @param anchorRect - Optional anchor element rectangle
 */
export function positionMenu(menu: HTMLElement, x: number, y: number, anchorRect: DOMRect | null = null): void {
    // Temporarily show to measure dimensions
    menu.style.visibility = 'hidden';
    menu.style.display = 'block';
    menu.style.maxHeight = '';
    menu.style.overflowY = '';

    const menuWidth = menu.offsetWidth;
    const menuHeight = menu.offsetHeight;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let left = x;
    let top = y;

    if (anchorRect) {
        // Adjust horizontal position if it overflows right
        if (left + menuWidth > windowWidth - 10) {
            left = Math.max(10, anchorRect.right - menuWidth);
        }
        // Adjust vertical position if it overflows bottom
        if (top + menuHeight > windowHeight - 10) {
            top = Math.max(10, anchorRect.top - menuHeight - 5);
        }
    } else {
        // Adjust horizontal position if it overflows right
        if (left + menuWidth > windowWidth - 10) {
            left = Math.max(10, windowWidth - menuWidth - 10);
        }
        // Adjust vertical position if it overflows bottom
        if (top + menuHeight > windowHeight - 10) {
            top = Math.max(10, y - menuHeight);
        }
    }

    // Final checks to ensure it's not off-screen at the top or left
    if (left < 10) left = 10;
    if (top < 10) top = 10;

    // If it's still too tall for the viewport, make it scrollable
    // We measure again because max-height might be needed
    const currentMenuHeight = menu.offsetHeight;
    if (top + currentMenuHeight > windowHeight - 10) {
        menu.style.maxHeight = `${windowHeight - top - 10}px`;
        menu.style.overflowY = 'auto';
    }

    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;
    menu.style.visibility = 'visible';
}

export const getShareUrl = (path: string): string => {
    const baseUrl = NL_MODE ? 'https://monochrome.tf' : window.location.origin;
    const safePath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${safePath}`;
};

// ─── Artist helpers ───────────────────────────────────────────────────────────

/**
 * Builds a full artist array by combining the track's listed artists
 * with any featured artists parsed from the title (feat./with).
 */
export function getFullArtistArray(track: TrackLike): string[] {
    const knownArtists: string[] =
        Array.isArray(track.artists) && track.artists.length > 0
            ? track.artists.map((a) => (typeof a === 'string' ? a : a.name) || '').filter(Boolean)
            : track.artist?.name
              ? [track.artist.name]
              : [];

    // Parse featured artists from title, e.g. "Song (feat. A, B & C)" or "(with X & Y)"
    // Note: splitting on '&' may incorrectly fragment compound artist names like "Simon & Garfunkel".
    const featPattern = /\(\s*(?:feat\.?|ft\.?|with)\s+(.+?)\s*\)/gi;
    const allFeatArtists = [...(track.title?.matchAll(featPattern) ?? [])].flatMap((m) =>
        m[1]
            .split(/\s*[,&]\s*/)
            .map((s) => s.trim())
            .filter(Boolean)
    );
    if (allFeatArtists.length > 0) {
        const knownLower = new Set(knownArtists.map((n) => n.toLowerCase()));
        for (const feat of allFeatArtists) {
            if (!knownLower.has(feat.toLowerCase())) {
                knownArtists.push(feat);
                knownLower.add(feat.toLowerCase());
            }
        }
    }

    return knownArtists;
}

/**
 * Builds a full artist string by combining the track's listed artists
 * with any featured artists parsed from the title (feat./with).
 */
export function getFullArtistString(track: TrackLike): string | null {
    const knownArtists = getFullArtistArray(track);

    return knownArtists.join('; ') || null;
}

// ─── Blob / image helpers ─────────────────────────────────────────────────────

export function fetchBlob(url: string): Promise<Blob> {
    return fetch(url).then((d) => d.blob());
}

export async function fetchBlobURL(url: string): Promise<string> {
    return URL.createObjectURL(await fetchBlob(url));
}

export function getMimeType(data: Uint8Array | number[]): string {
    if (data.length >= 2 && data[0] === 0xff && data[1] === 0xd8) return 'image/jpeg';
    if (data.length >= 8 && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47)
        return 'image/png';
    return 'image/jpeg';
}

/**
 * Retrieves the cover ID or image URL for a track.
 * @param track - The track object
 * @returns The cover ID or image URL, or null if none is available
 */
export function getTrackCoverId(track: TrackLike): string | null {
    return (
        track.album?.cover ||
        track.cover ||
        track.image ||
        track.album?.coverId ||
        track.coverId ||
        track.album?.image ||
        null
    );
}

// ─── Number helpers ───────────────────────────────────────────────────────────

/**
 * Converts a value to a positive integer.
 * @param value - The value to convert to a positive integer.
 * @returns The parsed positive integer, or null if the value is not a finite positive number.
 */
export function toPositiveInt(value: unknown): number | null {
    const parsed = parseInt(typeof value === 'string' || typeof value === 'number' ? String(value) : '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Extracts the disc number from a track object by checking multiple possible property names.
 * @param track - The track object to extract the disc number from.
 * @returns The disc number as a positive integer, or null if no valid disc number is found.
 */
export function getTrackDiscNumber(track: TrackLike): number | null {
    const disc = track?.disc;
    const volume = track?.volume;
    const candidates: unknown[] = [
        track?.volumeNumber,
        track?.discNumber,
        track?.mediaNumber,
        track?.media_number,
        typeof volume === 'object' && volume !== null ? volume.number : volume,
        typeof disc === 'object' && disc !== null ? disc.number : disc,
        track?.disc_no,
        track?.discNo,
        track?.disc_number,
        track?.mediaMetadata?.discNumber,
    ];

    for (const candidate of candidates) {
        const parsed = toPositiveInt(candidate);
        if (parsed) return parsed;
    }
    return null;
}

// ─── Control flow helpers ─────────────────────────────────────────────────────

/**
 * Executes a function with a fallback error handler.
 * Works with both synchronous and asynchronous callbacks.
 *
 * If the callback returns a Promise, the result will also be a Promise.
 *
 * @template T
 * @param fn Function to execute
 * @param onError Error handler
 * @returns Result of fn or onError
 */
export function tryCatch<T>(fn: () => T | Promise<T>, onError: (error: unknown) => T | Promise<T>): T | Promise<T> {
    try {
        const result = fn();

        if (result instanceof Promise) {
            return result.catch(onError);
        }

        return result;
    } catch (err) {
        return onError(err);
    }
}

// ─── Template helpers ─────────────────────────────────────────────────────────

/**
 * Replace `{token}` placeholders in a template string.
 *
 * Replacement values are inserted verbatim and are NOT reprocessed,
 * preventing cascading replacements if values contain token patterns.
 *
 * @param template The input string containing tokens like `{tokenName}`
 * @param tokens An object of tokens to replace and the replacement values.
 * @returns The string with valid tokens replaced
 */
export function replaceTokens(template: string, tokens: Record<string, string>): string {
    return template.replace(/{([^{}]+)}/g, (match, key: string) => {
        return key in tokens ? tokens[key] : match;
    });
}

export function createModal({
    title,
    content,
    className = '',
    onClose = undefined,
}: {
    title: string;
    content: string | HTMLElement;
    className?: string;
    onClose?: (() => void) | undefined;
}) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.style.zIndex = '10000';

    modal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-content ${className}" style="display: flex; flex-direction: column;">
            <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border); padding-bottom: 1rem;">
                <h3 style="margin: 0;">${title}</h3>
                <button class="btn-close" style="background: none; border: none; font-size: 2rem; cursor: pointer; color: var(--foreground); padding: 0.2rem 0.5rem; line-height: 1;">&times;</button>
            </div>
            <div class="modal-body" style="max-height: 70vh; overflow-y: auto; padding-right: 0.5rem;"></div>
        </div>
    `;

    const body = modal.querySelector('.modal-body');
    if (typeof content === 'string') {
        body.innerHTML = content;
    } else if (content instanceof HTMLElement) {
        body.appendChild(content);
    }

    document.body.appendChild(modal);

    const close = () => {
        modal.remove();
        if (onClose) onClose();
    };

    const overlayEl = modal.querySelector('.modal-overlay');
    const closeBtn = modal.querySelector('.btn-close');
    if (overlayEl) /** @type {HTMLElement} */ (overlayEl as HTMLElement).onclick = close;
    if (closeBtn) /** @type {HTMLElement} */ (closeBtn as HTMLElement).onclick = close;

    return { modal, close };
}
