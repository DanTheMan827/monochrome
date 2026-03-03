//js/downloads.js
import {
    buildTrackFilename,
    sanitizeForFilename,
    RATE_LIMIT_ERROR_MESSAGE,
    getTrackArtists,
    getTrackTitle,
    formatTemplate,
    SVG_CLOSE,
    getCoverBlob,
    getExtensionFromBlob,
    escapeHtml,
} from './utils.ts';
import { lyricsSettings, bulkDownloadSettings, losslessContainerSettings, playlistSettings } from './storage.ts';
import { addMetadataToAudio } from './metadata.ts';
import { DashDownloader } from './dash-downloader.ts';
import { generateM3U, generateM3U8, generateCUE, generateNFO, generateJSON } from './playlist-generator.ts';
import { encodeToMp3 } from './mp3-encoder.ts';
import { ffmpeg } from './ffmpeg.ts';

interface DownloadAPI {
    getTrackMetadata(id: string | number): Promise<TrackData>;
    getTrack(id: string | number, quality: string): Promise<{ originalTrackUrl?: string; info: { manifest: string } }>;
    extractStreamUrlFromManifest(manifest: string): string | null;
    getCoverUrl(coverId: string | undefined, size?: string): string;
    getAlbum(id: string | number): Promise<{ album: TrackAlbum; tracks: TrackData[] }>;
    downloadTrack(id: string | number, quality: string, filename: string, options: {
        signal: AbortSignal;
        track: TrackData;
        onProgress: (progress: DownloadProgress) => void;
    }): Promise<void>;
}

interface LyricsManager {
    fetchLyrics(trackId: string | number, track: TrackData): Promise<unknown>;
    generateLRCContent(lyricsData: unknown, track: TrackData): string | null;
    downloadLRC(lyricsData: unknown, track: TrackData): void;
}

interface DownloadProgress {
    stage?: string;
    receivedBytes: number;
    totalBytes?: number;
}

interface DiscLayoutContext {
    separateByDisc: boolean;
    resolveDiscNumber: (index: number) => number;
}

type PlaylistPathResolver = ((track: TrackData, filename: string, index: number) => string) | null;

interface DownloadMetadata {
    title?: string;
    artist?: string | TrackArtist;
    id?: string | number;
    uuid?: string;
    releaseDate?: string;
    numberOfTracks?: number;
    cover?: string;
    [key: string]: unknown;
}

const downloadTasks = new Map<string | number, { taskEl: HTMLElement; abortController: AbortController }>();
const bulkDownloadTasks = new Map<HTMLElement, { abortController: AbortController }>();
const ongoingDownloads = new Set<string>();
let downloadNotificationContainer: HTMLElement | null = null;

async function loadClientZip() {
    try {
        const module = await import('https://cdn.jsdelivr.net/npm/client-zip@2.4.5/+esm');
        return module;
    } catch (error: unknown) {
        console.error('Failed to load client-zip:', error);
        throw new Error('Failed to load ZIP library');
    }
}

function toPositiveInt(value: unknown): number | null {
    const parsed = parseInt(String(value), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getExplicitTrackDiscNumber(track: TrackData): number | null {
    const candidates = [
        track?.volumeNumber,
        track?.discNumber,
        (track as Record<string, unknown>)?.mediaNumber,
        (track as Record<string, unknown>)?.media_number,
        (track as Record<string, unknown>)?.volume,
        (track as Record<string, unknown>)?.disc,
        ((track as Record<string, unknown>)?.volume as Record<string, unknown>)?.number,
        ((track as Record<string, unknown>)?.disc as Record<string, unknown>)?.number,
        ((track as Record<string, unknown>)?.media as Record<string, unknown>)?.number,
        (track as Record<string, unknown>)?.disc,
        (track as Record<string, unknown>)?.disc_no,
        (track as Record<string, unknown>)?.discNo,
        (track as Record<string, unknown>)?.disc_number,
        (track?.mediaMetadata as Record<string, unknown>)?.discNumber,
    ];

    for (const candidate of candidates) {
        const parsed = toPositiveInt(candidate);
        if (parsed) return parsed;
    }
    return null;
}

async function createDiscLayoutContext(tracks: TrackData[], api: DownloadAPI): Promise<DiscLayoutContext> {
    if (!playlistSettings.shouldSeparateDiscsInZip()) {
        return { separateByDisc: false, resolveDiscNumber: () => 1 };
    }

    const explicitDiscNumbers = tracks.map((track: TrackData) => getExplicitTrackDiscNumber(track));
    const explicitDistinct = new Set(explicitDiscNumbers.filter(Boolean));

    if (explicitDistinct.size > 1) {
        return {
            separateByDisc: true,
            resolveDiscNumber: (index: number) => explicitDiscNumbers[index] || 1,
        };
    }

    // Some providers omit disc fields in album payload but include them in full track metadata.
    const hydratedDiscNumbers = await Promise.all(
        tracks.map(async (track: TrackData, index: number) => {
            if (explicitDiscNumbers[index]) return explicitDiscNumbers[index];
            try {
                const fullTrack = await api.getTrackMetadata(track.id);
                return getExplicitTrackDiscNumber(fullTrack);
            } catch {
                return null;
            }
        })
    );

    const hydratedDistinct = new Set(hydratedDiscNumbers.filter(Boolean));
    if (hydratedDistinct.size > 1) {
        return {
            separateByDisc: true,
            resolveDiscNumber: (index: number) => hydratedDiscNumbers[index] || explicitDiscNumbers[index] || 1,
        };
    }

    return { separateByDisc: false, resolveDiscNumber: () => 1 };
}

function getDiscFolderName(discNumber: number): string {
    return `Disc ${discNumber}`;
}

function buildZipTrackPath(rootFolder: string, filename: string, separateByDisc: boolean, discNumber: number = 1): string {
    if (!separateByDisc) return `${rootFolder}/${filename}`;
    return `${rootFolder}/${getDiscFolderName(discNumber)}/${filename}`;
}

function getPlaylistAudioExtension(quality: string): string {
    return quality === 'LOW' || quality === 'HIGH' ? 'm4a' : 'flac';
}

function createDownloadNotification() {
    if (!downloadNotificationContainer) {
        downloadNotificationContainer = document.createElement('div');
        downloadNotificationContainer.id = 'download-notifications';
        document.body.appendChild(downloadNotificationContainer);
    }
    return downloadNotificationContainer;
}

export function showNotification(message: string): void {
    const container = createDownloadNotification();

    const notifEl = document.createElement('div');
    notifEl.className = 'download-task';

    const innerDiv = document.createElement('div');
    innerDiv.style.display = 'flex';
    innerDiv.style.alignItems = 'start';
    innerDiv.textContent = message;
    notifEl.appendChild(innerDiv);

    container.appendChild(notifEl);

    // Auto remove
    setTimeout(() => {
        notifEl.style.animation = 'slide-out 0.3s ease forwards';
        setTimeout(() => notifEl.remove(), 300);
    }, 1500);
}

export function addDownloadTask(trackId: string | number, track: TrackData, filename: string, api: DownloadAPI, abortController: AbortController) {
    const container = createDownloadNotification();

    const taskEl = document.createElement('div');
    taskEl.className = 'download-task';
    taskEl.dataset.trackId = String(trackId);
    const trackTitle = getTrackTitle(track);
    const trackArtists = getTrackArtists(track);
    taskEl.innerHTML = `
        <div style="display: flex; align-items: start; gap: 0.75rem;">
            <img src="${api.getCoverUrl(track.album?.cover)}"
                 style="width: 40px; height: 40px; border-radius: 4px; flex-shrink: 0;">
            <div style="flex: 1; min-width: 0;">
                <div style="font-weight: 500; font-size: 0.9rem; margin-bottom: 0.25rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${trackTitle}</div>
                <div style="font-size: 0.8rem; color: var(--muted-foreground); margin-bottom: 0.5rem;">${trackArtists}</div>
                <div class="download-progress-bar" style="height: 4px; background: var(--secondary); border-radius: 2px; overflow: hidden;">
                    <div class="download-progress-fill" style="width: 0%; height: 100%; background: var(--highlight); transition: width 0.2s;"></div>
                </div>
                <div class="download-status" style="font-size: 0.75rem; color: var(--muted-foreground); margin-top: 0.25rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Starting...</div>
            </div>
            <button class="download-cancel" style="background: transparent; border: none; color: var(--muted-foreground); cursor: pointer; padding: 4px; border-radius: 4px; transition: all 0.2s;">
                ${SVG_CLOSE}
            </button>
        </div>
    `;

    container.appendChild(taskEl);

    downloadTasks.set(trackId, { taskEl, abortController });

    taskEl.querySelector('.download-cancel')!.addEventListener('click', () => {
        abortController.abort();
        removeDownloadTask(trackId);
    });

    return { taskEl, abortController };
}

export function updateDownloadProgress(trackId: string | number, progress: DownloadProgress): void {
    const task = downloadTasks.get(trackId);
    if (!task) return;

    const { taskEl } = task;
    const progressFill = taskEl.querySelector('.download-progress-fill') as HTMLElement;
    const statusEl = taskEl.querySelector('.download-status') as HTMLElement;

    if (progress.stage === 'downloading') {
        const percent = progress.totalBytes ? Math.round((progress.receivedBytes / progress.totalBytes) * 100) : 0;

        progressFill.style.width = `${percent}%`;

        const receivedMB = (progress.receivedBytes / (1024 * 1024)).toFixed(1);
        const totalMB = progress.totalBytes ? (progress.totalBytes / (1024 * 1024)).toFixed(1) : '?';

        statusEl.textContent = `Downloading: ${receivedMB}MB / ${totalMB}MB (${percent}%)`;
    }
}

export function completeDownloadTask(trackId: string | number, success: boolean = true, message: string | null = null): void {
    const task = downloadTasks.get(trackId);
    if (!task) return;

    const { taskEl } = task;
    const progressFill = taskEl.querySelector('.download-progress-fill') as HTMLElement;
    const statusEl = taskEl.querySelector('.download-status') as HTMLElement;
    const cancelBtn = taskEl.querySelector('.download-cancel') as HTMLElement;

    if (success) {
        progressFill.style.width = '100%';
        progressFill.style.background = '#10b981';
        statusEl.textContent = '✓ Downloaded';
        statusEl.style.color = '#10b981';
        cancelBtn.remove();

        setTimeout(() => removeDownloadTask(trackId), 3000);
    } else {
        progressFill.style.background = '#ef4444';
        statusEl.textContent = message || '✗ Download failed';
        statusEl.style.color = '#ef4444';
        cancelBtn.innerHTML = `
            ${SVG_CLOSE}
        `;
        cancelBtn.onclick = () => removeDownloadTask(trackId);

        setTimeout(() => removeDownloadTask(trackId), 5000);
    }
}

function removeDownloadTask(trackId: string | number): void {
    const task = downloadTasks.get(trackId);
    if (!task) return;

    const { taskEl } = task;
    taskEl.style.animation = 'slide-out 0.3s ease forwards';

    setTimeout(() => {
        taskEl.remove();
        downloadTasks.delete(trackId);

        if (downloadNotificationContainer && downloadNotificationContainer.children.length === 0) {
            downloadNotificationContainer.remove();
            downloadNotificationContainer = null;
        }
    }, 300);
}

function removeBulkDownloadTask(notifEl: HTMLElement): void {
    const task = bulkDownloadTasks.get(notifEl);
    if (!task) return;

    notifEl.style.animation = 'slide-out 0.3s ease forwards';

    setTimeout(() => {
        notifEl.remove();
        bulkDownloadTasks.delete(notifEl);

        if (downloadNotificationContainer && downloadNotificationContainer.children.length === 0) {
            downloadNotificationContainer.remove();
            downloadNotificationContainer = null;
        }
    }, 300);
}

async function downloadTrackBlob(track: TrackData, quality: string, api: DownloadAPI, lyricsManager: LyricsManager | null = null, signal: AbortSignal | null = null): Promise<{ blob: Blob; extension: string }> {
    let enrichedTrack: TrackData = {
        ...track,
        artist: track.artist || (track.artists && track.artists.length > 0 ? track.artists[0] : undefined),
    };

    // MP3_320 is not a native TIDAL quality, we download LOSSLESS and convert
    const downloadQuality = quality === 'MP3_320' ? 'LOSSLESS' : quality;

    try {
        const fullTrack = await api.getTrackMetadata(track.id);
        if (fullTrack) {
            enrichedTrack = {
                ...fullTrack,
                ...enrichedTrack,
                artist: enrichedTrack.artist || fullTrack.artist,
                album: {
                    ...(fullTrack.album || {} as TrackAlbum),
                    ...(enrichedTrack.album || {} as TrackAlbum),
                } as TrackAlbum,
                // Preserve explicit disc fields from either source
                discNumber: (enrichedTrack as Record<string, unknown>).discNumber ?? (fullTrack as Record<string, unknown>).discNumber,
                volumeNumber: enrichedTrack.volumeNumber ?? fullTrack.volumeNumber,
            } as TrackData;
        }
    } catch {
        // Non-fatal: continue with best available track payload
    }

    if (enrichedTrack.album && (!enrichedTrack.album.title || !enrichedTrack.album.artist) && enrichedTrack.album.id) {
        try {
            const albumData = await api.getAlbum(enrichedTrack.album.id);
            if (albumData.album) {
                enrichedTrack.album = {
                    ...enrichedTrack.album,
                    ...albumData.album,
                };
            }
        } catch (error: unknown) {
            console.warn('Failed to fetch album data for metadata:', error);
        }
    }

    const lookup = await api.getTrack(track.id, downloadQuality);
    let streamUrl;

    if (lookup.originalTrackUrl) {
        streamUrl = lookup.originalTrackUrl;
    } else {
        streamUrl = api.extractStreamUrlFromManifest(lookup.info.manifest);
        if (!streamUrl) {
            throw new Error('Could not resolve stream URL');
        }
    }

    // Handle DASH streams (blob URLs)
    let blob;
    if (streamUrl.startsWith('blob:')) {
        try {
            const downloader = new DashDownloader();
            blob = await downloader.downloadDashStream(streamUrl, { signal: signal ?? undefined });
        } catch (dashError) {
            console.error('DASH download failed:', dashError);
            // Fallback
            if (downloadQuality !== 'LOSSLESS') {
                console.warn('Falling back to LOSSLESS (16-bit) download.');
                return downloadTrackBlob(track, 'LOSSLESS', api, lyricsManager, signal);
            }
            throw dashError;
        }
    } else {
        const response = await fetch(streamUrl, { signal });
        if (!response.ok) {
            throw new Error(`Failed to fetch track: ${response.status}`);
        }
        blob = await response.blob();
    }

    // Convert to MP3 320kbps if requested
    if (quality === 'MP3_320') {
        blob = await encodeToMp3(blob, () => undefined, signal);
    }

    if (quality.endsWith('LOSSLESS')) {
        try {
            switch (losslessContainerSettings.getContainer()) {
                case 'flac':
                    if ((await getExtensionFromBlob(blob)) != 'flac') {
                        blob = await ffmpeg(
                            blob,
                            { args: ['-c:a', 'copy'] },
                            'output.flac',
                            'audio/flac',
                            () => undefined,
                            signal
                        );
                    }
                    break;
                case 'alac':
                    blob = await ffmpeg(
                        blob,
                        { args: ['-c:a', 'alac'] },
                        'output.m4a',
                        'audio/mp4',
                        () => undefined,
                        signal
                    );
                    break;
                default:
                    break;
            }
        } catch (error: unknown) {
            if ((error as Error)?.name === 'AbortError') {
                throw error;
            }

            console.error('Lossless container conversion failed:', error);
        }
    }

    // Detect actual format from blob signature BEFORE adding metadata
    const extension = await getExtensionFromBlob(blob);

    // Add metadata to the blob
    blob = await addMetadataToAudio(blob, enrichedTrack, api, quality);

    return { blob, extension };
}

function triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function bulkDownloadSequentially(tracks: TrackData[], api: DownloadAPI, quality: string, lyricsManager: LyricsManager | null, notification: HTMLElement): Promise<void> {
    const { abortController } = bulkDownloadTasks.get(notification)!;
    const signal = abortController.signal;

    for (let i = 0; i < tracks.length; i++) {
        if (signal.aborted) break;
        const track = tracks[i];
        const trackTitle = getTrackTitle(track);

        updateBulkDownloadProgress(notification, i, tracks.length, trackTitle);

        try {
            const { blob, extension } = await downloadTrackBlob(track, quality, api, null, signal);
            const filename = buildTrackFilename(track, quality, extension);
            triggerDownload(blob, filename);

            if (lyricsManager && lyricsSettings.shouldDownloadLyrics()) {
                try {
                    const lyricsData = await lyricsManager.fetchLyrics(track.id, track);
                    if (lyricsData) {
                        const lrcContent = lyricsManager.generateLRCContent(lyricsData, track);
                        if (lrcContent) {
                            const lrcFilename = filename.replace(/\.[^.]+$/, '.lrc');
                            const lrcBlob = new Blob([lrcContent], { type: 'text/plain' });
                            triggerDownload(lrcBlob, lrcFilename);
                        }
                    }
                } catch {
                    // Silent fail for lyrics
                }
            }
        } catch (err: unknown) {
            if ((err as Error).name === 'AbortError') throw err;
            console.error(`Failed to download track ${trackTitle}:`, err);
        }
    }
}

async function bulkDownloadToZipStream(
    tracks: TrackData[],
    folderName: string,
    api: DownloadAPI,
    quality: string,
    lyricsManager: LyricsManager | null,
    notification: HTMLElement,
    fileHandle: FileSystemFileHandle,
    coverBlob: Blob | null = null,
    type: string = 'playlist',
    metadata: DownloadMetadata | null = null
): Promise<void> {
    const { abortController } = bulkDownloadTasks.get(notification)!;
    const signal = abortController.signal;
    const { downloadZip } = await loadClientZip();

    const writable = await fileHandle.createWritable();

    async function* yieldFiles() {
        // Add cover if available
        if (coverBlob) {
            yield { name: `${folderName}/cover.jpg`, lastModified: new Date(), input: coverBlob };
        }

        // Generate playlist files first
        const useRelativePaths = playlistSettings.shouldUseRelativePaths();
        const playlistAudioExtension = getPlaylistAudioExtension(quality);
        const discLayout = await createDiscLayoutContext(tracks, api);
        const separateByDisc = discLayout.separateByDisc;
        const playlistPathResolver = separateByDisc
            ? (_track: TrackData, filename: string, index: number) => `${getDiscFolderName(discLayout.resolveDiscNumber(index))}/${filename}`
            : null;

        if (playlistSettings.shouldGenerateM3U()) {
            const m3uContent = generateM3U(
                metadata || { title: folderName },
                tracks,
                useRelativePaths,
                playlistPathResolver,
                playlistAudioExtension
            );
            yield {
                name: `${folderName}/${sanitizeForFilename(folderName)}.m3u`,
                lastModified: new Date(),
                input: m3uContent,
            };
        }

        if (playlistSettings.shouldGenerateM3U8()) {
            const m3u8Content = generateM3U8(
                metadata || { title: folderName },
                tracks,
                useRelativePaths,
                playlistPathResolver,
                playlistAudioExtension
            );
            yield {
                name: `${folderName}/${sanitizeForFilename(folderName)}.m3u8`,
                lastModified: new Date(),
                input: m3u8Content,
            };
        }

        if (playlistSettings.shouldGenerateNFO()) {
            const nfoContent = generateNFO(metadata || { title: folderName }, tracks, type);
            yield {
                name: `${folderName}/${sanitizeForFilename(folderName)}.nfo`,
                lastModified: new Date(),
                input: nfoContent,
            };
        }

        if (playlistSettings.shouldGenerateJSON()) {
            const jsonContent = generateJSON(metadata || { title: folderName }, tracks, type);
            yield {
                name: `${folderName}/${sanitizeForFilename(folderName)}.json`,
                lastModified: new Date(),
                input: jsonContent,
            };
        }

        // For albums, generate CUE file
        if (type === 'album' && playlistSettings.shouldGenerateCUE()) {
            const audioFilename = `${sanitizeForFilename(folderName)}.flac`; // Assume FLAC for CUE
            const cueContent = generateCUE(metadata!, tracks, audioFilename);
            yield {
                name: `${folderName}/${sanitizeForFilename(folderName)}.cue`,
                lastModified: new Date(),
                input: cueContent,
            };
        }

        // Download tracks
        for (let i = 0; i < tracks.length; i++) {
            if (signal.aborted) break;
            const track = tracks[i];
            const trackTitle = getTrackTitle(track);

            updateBulkDownloadProgress(notification, i, tracks.length, trackTitle);

            try {
                const { blob, extension } = await downloadTrackBlob(track, quality, api, null, signal);
                const filename = buildTrackFilename(track, quality, extension);
                const discNumber = discLayout.resolveDiscNumber(i);
                yield {
                    name: buildZipTrackPath(folderName, filename, separateByDisc, discNumber),
                    lastModified: new Date(),
                    input: blob,
                };

                if (lyricsManager && lyricsSettings.shouldDownloadLyrics()) {
                    try {
                        const lyricsData = await lyricsManager.fetchLyrics(track.id, track);
                        if (lyricsData) {
                            const lrcContent = lyricsManager.generateLRCContent(lyricsData, track);
                            if (lrcContent) {
                                const lrcFilename = filename.replace(/\.[^.]+$/, '.lrc');
                                yield {
                                    name: buildZipTrackPath(folderName, lrcFilename, separateByDisc, discNumber),
                                    lastModified: new Date(),
                                    input: lrcContent,
                                };
                            }
                        }
                    } catch {
                        /* ignore */
                    }
                }
            } catch (err: unknown) {
                if ((err as Error).name === 'AbortError') throw err;
                console.error(`Failed to download track ${trackTitle}:`, err);
            }
        }
    }

    try {
        const response = downloadZip(yieldFiles());
        await response.body!.pipeTo(writable);
    } catch (error: unknown) {
        if ((error as Error).name === 'AbortError') return;
        throw error;
    }
}

// Generate ZIP as blob for browsers without File System Access API (iOS, etc.)
async function bulkDownloadToZipBlob(
    tracks: TrackData[],
    folderName: string,
    api: DownloadAPI,
    quality: string,
    lyricsManager: LyricsManager | null,
    notification: HTMLElement,
    coverBlob: Blob | null = null,
    type: string = 'playlist',
    metadata: DownloadMetadata | null = null
): Promise<void> {
    const { abortController } = bulkDownloadTasks.get(notification)!;
    const signal = abortController.signal;
    const { downloadZip } = await loadClientZip();

    async function* yieldFiles() {
        // Add cover if available
        if (coverBlob) {
            yield { name: `${folderName}/cover.jpg`, lastModified: new Date(), input: coverBlob };
        }

        // Generate playlist files first
        const useRelativePaths = playlistSettings.shouldUseRelativePaths();
        const playlistAudioExtension = getPlaylistAudioExtension(quality);
        const discLayout = await createDiscLayoutContext(tracks, api);
        const separateByDisc = discLayout.separateByDisc;
        const playlistPathResolver = separateByDisc
            ? (_track: TrackData, filename: string, index: number) => `${getDiscFolderName(discLayout.resolveDiscNumber(index))}/${filename}`
            : null;

        if (playlistSettings.shouldGenerateM3U()) {
            const m3uContent = generateM3U(
                metadata || { title: folderName },
                tracks,
                useRelativePaths,
                playlistPathResolver,
                playlistAudioExtension
            );
            yield {
                name: `${folderName}/${sanitizeForFilename(folderName)}.m3u`,
                lastModified: new Date(),
                input: m3uContent,
            };
        }

        if (playlistSettings.shouldGenerateM3U8()) {
            const m3u8Content = generateM3U8(
                metadata || { title: folderName },
                tracks,
                useRelativePaths,
                playlistPathResolver,
                playlistAudioExtension
            );
            yield {
                name: `${folderName}/${sanitizeForFilename(folderName)}.m3u8`,
                lastModified: new Date(),
                input: m3u8Content,
            };
        }

        if (playlistSettings.shouldGenerateNFO()) {
            const nfoContent = generateNFO(metadata || { title: folderName }, tracks, type);
            yield {
                name: `${folderName}/${sanitizeForFilename(folderName)}.nfo`,
                lastModified: new Date(),
                input: nfoContent,
            };
        }

        if (playlistSettings.shouldGenerateJSON()) {
            const jsonContent = generateJSON(metadata || { title: folderName }, tracks, type);
            yield {
                name: `${folderName}/${sanitizeForFilename(folderName)}.json`,
                lastModified: new Date(),
                input: jsonContent,
            };
        }

        // For albums, generate CUE file
        if (type === 'album' && playlistSettings.shouldGenerateCUE()) {
            const audioFilename = `${sanitizeForFilename(folderName)}.flac`; // Assume FLAC for CUE
            const cueContent = generateCUE(metadata!, tracks, audioFilename);
            yield {
                name: `${folderName}/${sanitizeForFilename(folderName)}.cue`,
                lastModified: new Date(),
                input: cueContent,
            };
        }

        // Download tracks
        for (let i = 0; i < tracks.length; i++) {
            if (signal.aborted) break;
            const track = tracks[i];
            const trackTitle = getTrackTitle(track);

            updateBulkDownloadProgress(notification, i, tracks.length, trackTitle);

            try {
                const { blob, extension } = await downloadTrackBlob(track, quality, api, null, signal);
                const filename = buildTrackFilename(track, quality, extension);
                const discNumber = discLayout.resolveDiscNumber(i);
                yield {
                    name: buildZipTrackPath(folderName, filename, separateByDisc, discNumber),
                    lastModified: new Date(),
                    input: blob,
                };

                if (lyricsManager && lyricsSettings.shouldDownloadLyrics()) {
                    try {
                        const lyricsData = await lyricsManager.fetchLyrics(track.id, track);
                        if (lyricsData) {
                            const lrcContent = lyricsManager.generateLRCContent(lyricsData, track);
                            if (lrcContent) {
                                const lrcFilename = filename.replace(/\.[^.]+$/, '.lrc');
                                yield {
                                    name: buildZipTrackPath(folderName, lrcFilename, separateByDisc, discNumber),
                                    lastModified: new Date(),
                                    input: lrcContent,
                                };
                            }
                        }
                    } catch {
                        /* ignore */
                    }
                }
            } catch (err: unknown) {
                if ((err as Error).name === 'AbortError') throw err;
                console.error(`Failed to download track ${trackTitle}:`, err);
            }
        }
    }

    try {
        const response = downloadZip(yieldFiles());
        const blob = await response.blob();
        triggerDownload(blob, `${folderName}.zip`);
    } catch (error: unknown) {
        if ((error as Error).name === 'AbortError') return;
        throw error;
    }
}

async function bulkDownloadToZipNeutralino(
    tracks: TrackData[],
    folderName: string,
    api: DownloadAPI,
    quality: string,
    lyricsManager: LyricsManager | null,
    notification: HTMLElement,
    coverBlob: Blob | null = null,
    type: string = 'playlist',
    metadata: DownloadMetadata | null = null
): Promise<void> {
    const { abortController } = bulkDownloadTasks.get(notification)!;
    const signal = abortController.signal;
    const { downloadZip } = await loadClientZip();

    // Re-use logic for generating file entries
    async function* yieldFiles() {
        // Add cover if available
        if (coverBlob) {
            yield { name: `${folderName}/cover.jpg`, lastModified: new Date(), input: coverBlob };
        }

        // Generate playlist files first
        const useRelativePaths = playlistSettings.shouldUseRelativePaths();
        const playlistAudioExtension = getPlaylistAudioExtension(quality);
        const discLayout = await createDiscLayoutContext(tracks, api);
        const separateByDisc = discLayout.separateByDisc;
        const playlistPathResolver = separateByDisc
            ? (_track: TrackData, filename: string, index: number) => `${getDiscFolderName(discLayout.resolveDiscNumber(index))}/${filename}`
            : null;

        if (playlistSettings.shouldGenerateM3U()) {
            const m3uContent = generateM3U(
                metadata || { title: folderName },
                tracks,
                useRelativePaths,
                playlistPathResolver,
                playlistAudioExtension
            );
            yield {
                name: `${folderName}/${sanitizeForFilename(folderName)}.m3u`,
                lastModified: new Date(),
                input: m3uContent,
            };
        }

        if (playlistSettings.shouldGenerateM3U8()) {
            const m3u8Content = generateM3U8(
                metadata || { title: folderName },
                tracks,
                useRelativePaths,
                playlistPathResolver,
                playlistAudioExtension
            );
            yield {
                name: `${folderName}/${sanitizeForFilename(folderName)}.m3u8`,
                lastModified: new Date(),
                input: m3u8Content,
            };
        }

        if (playlistSettings.shouldGenerateNFO()) {
            const nfoContent = generateNFO(metadata || { title: folderName }, tracks, type);
            yield {
                name: `${folderName}/${sanitizeForFilename(folderName)}.nfo`,
                lastModified: new Date(),
                input: nfoContent,
            };
        }

        if (playlistSettings.shouldGenerateJSON()) {
            const jsonContent = generateJSON(metadata || { title: folderName }, tracks, type);
            yield {
                name: `${folderName}/${sanitizeForFilename(folderName)}.json`,
                lastModified: new Date(),
                input: jsonContent,
            };
        }

        // For albums, generate CUE file
        if (type === 'album' && playlistSettings.shouldGenerateCUE()) {
            const audioFilename = `${sanitizeForFilename(folderName)}.flac`; // Assume FLAC for CUE
            const cueContent = generateCUE(metadata!, tracks, audioFilename);
            yield {
                name: `${folderName}/${sanitizeForFilename(folderName)}.cue`,
                lastModified: new Date(),
                input: cueContent,
            };
        }

        // Download tracks
        for (let i = 0; i < tracks.length; i++) {
            if (signal.aborted) break;
            const track = tracks[i];
            const trackTitle = getTrackTitle(track);

            updateBulkDownloadProgress(notification, i, tracks.length, trackTitle);

            try {
                const { blob, extension } = await downloadTrackBlob(track, quality, api, null, signal);
                const filename = buildTrackFilename(track, quality, extension);
                const discNumber = discLayout.resolveDiscNumber(i);
                yield {
                    name: buildZipTrackPath(folderName, filename, separateByDisc, discNumber),
                    lastModified: new Date(),
                    input: blob,
                };

                if (lyricsManager && lyricsSettings.shouldDownloadLyrics()) {
                    try {
                        const lyricsData = await lyricsManager.fetchLyrics(track.id, track);
                        if (lyricsData) {
                            const lrcContent = lyricsManager.generateLRCContent(lyricsData, track);
                            if (lrcContent) {
                                const lrcFilename = filename.replace(/\.[^.]+$/, '.lrc');
                                yield {
                                    name: buildZipTrackPath(folderName, lrcFilename, separateByDisc, discNumber),
                                    lastModified: new Date(),
                                    input: lrcContent,
                                };
                            }
                        }
                    } catch {
                        /* ignore */
                    }
                }
            } catch (err: unknown) {
                if ((err as Error).name === 'AbortError') throw err;
                console.error(`Failed to download track ${trackTitle}:`, err);
            }
        }
    }

    try {
        // Load the bridge explicitly to ensure we go through the parent shell
        const bridge = await import('./desktop/neutralino-bridge.ts');

        // Native Save Dialog via Bridge
        const savePath = await bridge.os.showSaveDialog(`Select save location for ${folderName}.zip`, {
            defaultPath: `${folderName}.zip`,
            filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
        }) as string | null;

        if (!savePath) {
            // Cancelled
            removeBulkDownloadTask(notification);
            return;
        }

        const response = downloadZip(yieldFiles());

        // Initialize file (empty) to ensure it exists
        // We use writeBinaryFile with an empty buffer to create/overwrite
        await bridge.filesystem.writeBinaryFile(savePath, new ArrayBuffer(0));

        // Stream the response body
        if (!response.body) throw new Error('ZIP response body is null');

        const reader = response.body.getReader();
        let receivedLength = 0;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // 'value' is a Uint8Array. Neutralino filesystem expects ArrayBuffer.
            // value.buffer might contain the whole backing store, so we should be careful to slice if offset is non-zero
            // but usually read() returns fresh chunks.
            // However, neutralino bridge's appendBinaryFile takes ArrayBuffer.
            const chunk = value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);

            await bridge.filesystem.appendBinaryFile(savePath, chunk);
            receivedLength += value.length;

            // Optional: Update granular progress if we want, but we typically update per-track in yieldFiles
        }

        console.log(`[ZIP] Download complete. Total size: ${receivedLength} bytes.`);

        completeBulkDownload(notification, true);
    } catch (error: unknown) {
        if ((error as Error).name === 'AbortError') return;
        throw error;
    }
}

async function startBulkDownload(
    tracks: TrackData[],
    defaultName: string,
    api: DownloadAPI,
    quality: string,
    lyricsManager: LyricsManager | null,
    type: string,
    name: string,
    coverBlob: Blob | null = null,
    metadata: DownloadMetadata | null = null
): Promise<void> {
    const notification = createBulkDownloadNotification(type, name, tracks.length);

    try {
        const isNeutralino = window.NL_MODE === true;
        const hasFileSystemAccess =
            'showSaveFilePicker' in window && 'createWritable' in FileSystemFileHandle.prototype;
        const forceIndividual = bulkDownloadSettings.shouldForceIndividual();
        const useZip = hasFileSystemAccess && !forceIndividual;
        const useZipBlob = !hasFileSystemAccess && !forceIndividual;

        if (isNeutralino) {
            // Neutralino Native Logic
            await bulkDownloadToZipNeutralino(
                tracks,
                defaultName,
                api,
                quality,
                lyricsManager,
                notification,
                coverBlob,
                type,
                metadata
            );
        } else if (useZip) {
            // File System Access API available - use streaming
            try {
                const fileHandle = await window.showSaveFilePicker!({
                    suggestedName: `${defaultName}.zip`,
                    types: [{ description: 'ZIP Archive', accept: { 'application/zip': ['.zip'] } }],
                });
                await bulkDownloadToZipStream(
                    tracks,
                    defaultName,
                    api,
                    quality,
                    lyricsManager,
                    notification,
                    fileHandle,
                    coverBlob,
                    type,
                    metadata
                );
                completeBulkDownload(notification, true);
            } catch (err: unknown) {
                if ((err as Error).name === 'AbortError') {
                    removeBulkDownloadTask(notification);
                    return;
                }
                throw err;
            }
        } else if (useZipBlob) {
            // No File System Access API (iOS, etc.) - use blob-based ZIP
            await bulkDownloadToZipBlob(
                tracks,
                defaultName,
                api,
                quality,
                lyricsManager,
                notification,
                coverBlob,
                type,
                metadata
            );
            completeBulkDownload(notification, true);
        } else {
            // Fallback or Forced: Individual sequential downloads
            await bulkDownloadSequentially(tracks, api, quality, lyricsManager, notification);
            completeBulkDownload(notification, true);
        }
    } catch (error: unknown) {
        console.error('Bulk download failed:', error);
        completeBulkDownload(notification, false, (error as Error).message);
    }
}

export async function downloadTracks(tracks: TrackData[], api: DownloadAPI, quality: string, lyricsManager: LyricsManager | null = null): Promise<void> {
    const folderName = `Queue - ${new Date().toISOString().slice(0, 10)}`;
    await startBulkDownload(tracks, folderName, api, quality, lyricsManager, 'queue', 'Queue', null, {
        title: 'Queue',
    });
}

export async function downloadAlbumAsZip(album: TrackAlbum, tracks: TrackData[], api: DownloadAPI, quality: string, lyricsManager: LyricsManager | null = null): Promise<void> {
    const releaseDateStr =
        album.releaseDate || (tracks[0]?.streamStartDate ? tracks[0].streamStartDate.split('T')[0] : '');
    const releaseDate = releaseDateStr ? new Date(releaseDateStr) : null;
    const year = releaseDate && !isNaN(releaseDate.getTime()) ? releaseDate.getFullYear() : '';

    const folderName = formatTemplate(localStorage.getItem('zip-folder-template') || '{albumTitle} - {albumArtist}', {
        albumTitle: album.title,
        albumArtist: album.artist?.name,
        year: String(year),
    });

    const coverBlob = await getCoverBlob(api, album.cover || ((album as Record<string, unknown>).album as TrackAlbum)?.cover || (album as Record<string, unknown>).coverId as string | undefined);
    await startBulkDownload(tracks, folderName, api, quality, lyricsManager, 'album', album.title, coverBlob, album);
}

export async function downloadPlaylistAsZip(playlist: PlaylistData, tracks: TrackData[], api: DownloadAPI, quality: string, lyricsManager: LyricsManager | null = null): Promise<void> {
    const folderName = formatTemplate(localStorage.getItem('zip-folder-template') || '{albumTitle} - {albumArtist}', {
        albumTitle: playlist.title,
        albumArtist: 'Playlist',
        year: String(new Date().getFullYear()),
    });

    const representativeTrack = tracks.find((t) => t.album?.cover);
    const coverBlob = await getCoverBlob(api, representativeTrack?.album?.cover);
    await startBulkDownload(
        tracks,
        folderName,
        api,
        quality,
        lyricsManager,
        'playlist',
        playlist.title || '',
        coverBlob,
        playlist
    );
}

export async function downloadDiscography(artist: ArtistData, selectedReleases: TrackAlbum[], api: DownloadAPI, quality: string, lyricsManager: LyricsManager | null = null): Promise<void> {
    const rootFolder = `${sanitizeForFilename(artist.name)} discography`;
    const notification = createBulkDownloadNotification('discography', artist.name, selectedReleases.length);
    const { abortController } = bulkDownloadTasks.get(notification)!;
    const signal = abortController.signal;

    const hasFileSystemAccess = 'showSaveFilePicker' in window && 'createWritable' in FileSystemFileHandle.prototype;
    const useZip = hasFileSystemAccess && !bulkDownloadSettings.shouldForceIndividual();
    const useZipBlob = !hasFileSystemAccess && !bulkDownloadSettings.shouldForceIndividual();

    async function* yieldDiscography() {
        for (let albumIndex = 0; albumIndex < selectedReleases.length; albumIndex++) {
            if (signal.aborted) break;
            const album = selectedReleases[albumIndex];
            updateBulkDownloadProgress(notification, albumIndex, selectedReleases.length, album.title);

            try {
                const { album: fullAlbum, tracks } = await api.getAlbum(album.id);
                const coverBlob = await getCoverBlob(api, fullAlbum.cover || album.cover);
                const releaseDateStr =
                    fullAlbum.releaseDate ||
                    (tracks[0]?.streamStartDate ? tracks[0].streamStartDate.split('T')[0] : '');
                const releaseDate = releaseDateStr ? new Date(releaseDateStr) : null;
                const year = releaseDate && !isNaN(releaseDate.getTime()) ? releaseDate.getFullYear() : '';

                const albumFolder = formatTemplate(
                    localStorage.getItem('zip-folder-template') || '{albumTitle} - {albumArtist}',
                    {
                        albumTitle: fullAlbum.title,
                        albumArtist: fullAlbum.artist?.name,
                        year: String(year),
                    }
                );

                const fullFolderPath = `${rootFolder}/${albumFolder}`;
                if (coverBlob)
                    yield { name: `${fullFolderPath}/cover.jpg`, lastModified: new Date(), input: coverBlob };

                // Generate playlist files for each album
                const useRelativePaths = playlistSettings.shouldUseRelativePaths();
                const playlistAudioExtension = getPlaylistAudioExtension(quality);
                const discLayout = await createDiscLayoutContext(tracks, api);
                const separateByDisc = discLayout.separateByDisc;
                const playlistPathResolver = separateByDisc
                    ? (_track: TrackData, filename: string, index: number) =>
                          `${getDiscFolderName(discLayout.resolveDiscNumber(index))}/${filename}`
                    : null;

                if (playlistSettings.shouldGenerateM3U()) {
                    const m3uContent = generateM3U(
                        fullAlbum,
                        tracks,
                        useRelativePaths,
                        playlistPathResolver,
                        playlistAudioExtension
                    );
                    yield {
                        name: `${fullFolderPath}/${sanitizeForFilename(fullAlbum.title)}.m3u`,
                        lastModified: new Date(),
                        input: m3uContent,
                    };
                }

                if (playlistSettings.shouldGenerateM3U8()) {
                    const m3u8Content = generateM3U8(
                        fullAlbum,
                        tracks,
                        useRelativePaths,
                        playlistPathResolver,
                        playlistAudioExtension
                    );
                    yield {
                        name: `${fullFolderPath}/${sanitizeForFilename(fullAlbum.title)}.m3u8`,
                        lastModified: new Date(),
                        input: m3u8Content,
                    };
                }

                if (playlistSettings.shouldGenerateNFO()) {
                    const nfoContent = generateNFO(fullAlbum, tracks, 'album');
                    yield {
                        name: `${fullFolderPath}/${sanitizeForFilename(fullAlbum.title)}.nfo`,
                        lastModified: new Date(),
                        input: nfoContent,
                    };
                }

                if (playlistSettings.shouldGenerateJSON()) {
                    const jsonContent = generateJSON(fullAlbum, tracks, 'album');
                    yield {
                        name: `${fullFolderPath}/${sanitizeForFilename(fullAlbum.title)}.json`,
                        lastModified: new Date(),
                        input: jsonContent,
                    };
                }

                if (playlistSettings.shouldGenerateCUE()) {
                    const audioFilename = `${sanitizeForFilename(fullAlbum.title)}.flac`;
                    const cueContent = generateCUE(fullAlbum, tracks, audioFilename);
                    yield {
                        name: `${fullFolderPath}/${sanitizeForFilename(fullAlbum.title)}.cue`,
                        lastModified: new Date(),
                        input: cueContent,
                    };
                }

                for (let i = 0; i < tracks.length; i++) {
                    const track = tracks[i];
                    if (signal.aborted) break;
                    try {
                        const { blob, extension } = await downloadTrackBlob(track, quality, api, null, signal);
                        const filename = buildTrackFilename(track, quality, extension);
                        const discNumber = discLayout.resolveDiscNumber(i);
                        yield {
                            name: buildZipTrackPath(fullFolderPath, filename, separateByDisc, discNumber),
                            lastModified: new Date(),
                            input: blob,
                        };

                        if (lyricsManager && lyricsSettings.shouldDownloadLyrics()) {
                            try {
                                const lyricsData = await lyricsManager.fetchLyrics(track.id, track);
                                if (lyricsData) {
                                    const lrcContent = lyricsManager.generateLRCContent(lyricsData, track);
                                    if (lrcContent) {
                                        const lrcFilename = filename.replace(/\.[^.]+$/, '.lrc');
                                        yield {
                                            name: buildZipTrackPath(
                                                fullFolderPath,
                                                lrcFilename,
                                                separateByDisc,
                                                discNumber
                                            ),
                                            lastModified: new Date(),
                                            input: lrcContent,
                                        };
                                    }
                                }
                            } catch {
                                /* ignore */
                            }
                        }
                    } catch (err: unknown) {
                        if ((err as Error).name === 'AbortError') throw err;
                        console.error(`Failed to download track ${track.title}:`, err);
                    }
                }
            } catch (error: unknown) {
                if ((error as Error).name === 'AbortError') throw error;
                console.error(`Failed to download album ${album.title}:`, error);
            }
        }
    }

    try {
        if (useZip) {
            // File System Access API available - use streaming
            const fileHandle = await window.showSaveFilePicker!({
                suggestedName: `${rootFolder}.zip`,
                types: [{ description: 'ZIP Archive', accept: { 'application/zip': ['.zip'] } }],
            });
            const writable = await fileHandle.createWritable();
            const { downloadZip } = await loadClientZip();

            const response = downloadZip(yieldDiscography());
            await response.body!.pipeTo(writable);
            completeBulkDownload(notification, true);
        } else if (useZipBlob) {
            // No File System Access API (iOS, etc.) - use blob-based ZIP
            const { downloadZip } = await loadClientZip();
            const response = downloadZip(yieldDiscography());
            const blob = await response.blob();
            triggerDownload(blob, `${rootFolder}.zip`);
            completeBulkDownload(notification, true);
        } else {
            // Sequential individual downloads for discography
            for (let albumIndex = 0; albumIndex < selectedReleases.length; albumIndex++) {
                if (signal.aborted) break;
                const album = selectedReleases[albumIndex];
                updateBulkDownloadProgress(notification, albumIndex, selectedReleases.length, album.title);
                const { tracks } = await api.getAlbum(album.id);
                await bulkDownloadSequentially(tracks, api, quality, lyricsManager, notification);
            }
            completeBulkDownload(notification, true);
        }
    } catch (error: unknown) {
        if ((error as Error).name === 'AbortError') {
            removeBulkDownloadTask(notification);
            return;
        }
        completeBulkDownload(notification, false, (error as Error).message);
    }
}

function createBulkDownloadNotification(type: string, name: string, _totalItems: number): HTMLElement {
    const container = createDownloadNotification();

    const notifEl = document.createElement('div');
    notifEl.className = 'download-task bulk-download';
    notifEl.dataset.bulkType = type;
    notifEl.dataset.bulkName = name;

    const typeLabel =
        type === 'album'
            ? 'Album'
            : type === 'playlist'
              ? 'Playlist'
              : type === 'liked'
                ? 'Liked Tracks'
                : type === 'queue'
                  ? 'Queue'
                  : 'Discography';

    notifEl.innerHTML = `
        <div style="display: flex; align-items: start; gap: 0.75rem;">
            <div style="flex: 1; min-width: 0;">
                <div style="font-weight: 600; font-size: 0.95rem; margin-bottom: 0.25rem;">
                    Downloading ${typeLabel}
                </div>
                <div style="font-size: 0.85rem; color: var(--muted-foreground); margin-bottom: 0.5rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(name)}</div>
                <div class="download-progress-bar" style="height: 4px; background: var(--secondary); border-radius: 2px; overflow: hidden;">
                    <div class="download-progress-fill" style="width: 0%; height: 100%; background: var(--highlight); transition: width 0.2s;"></div>
                </div>
                <div class="download-status" style="font-size: 0.75rem; color: var(--muted-foreground); margin-top: 0.25rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Starting...</div>
            </div>
            <button class="download-cancel" style="background: transparent; border: none; color: var(--muted-foreground); cursor: pointer; padding: 4px; border-radius: 4px; transition: all 0.2s;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>
    `;

    container.appendChild(notifEl);

    const abortController = new AbortController();
    bulkDownloadTasks.set(notifEl, { abortController });

    notifEl.querySelector('.download-cancel')!.addEventListener('click', () => {
        abortController.abort();
        removeBulkDownloadTask(notifEl);
    });

    return notifEl;
}

function updateBulkDownloadProgress(notifEl: HTMLElement, current: number, total: number, currentItem: string): void {
    const progressFill = notifEl.querySelector('.download-progress-fill') as HTMLElement;
    const statusEl = notifEl.querySelector('.download-status') as HTMLElement;

    const percent = total > 0 ? Math.round((current / total) * 100) : 0;
    progressFill.style.width = `${percent}%`;
    statusEl.textContent = `${current}/${total} - ${currentItem}`;
}

function completeBulkDownload(notifEl: HTMLElement, success: boolean = true, message: string | null = null): void {
    const progressFill = notifEl.querySelector('.download-progress-fill') as HTMLElement;
    const statusEl = notifEl.querySelector('.download-status') as HTMLElement;

    if (success) {
        progressFill.style.width = '100%';
        progressFill.style.background = '#10b981';
        statusEl.textContent = '✓ Download complete';
        statusEl.style.color = '#10b981';

        setTimeout(() => {
            notifEl.style.animation = 'slide-out 0.3s ease forwards';
            setTimeout(() => notifEl.remove(), 300);
        }, 3000);
    } else {
        progressFill.style.background = '#ef4444';
        statusEl.textContent = message || '✗ Download failed';
        statusEl.style.color = '#ef4444';

        setTimeout(() => {
            notifEl.style.animation = 'slide-out 0.3s ease forwards';
            setTimeout(() => notifEl.remove(), 300);
        }, 5000);
    }
}

export async function downloadTrackWithMetadata(track: TrackData | null, quality: string, api: DownloadAPI, lyricsManager: LyricsManager | null = null, abortController: AbortController | null = null): Promise<void> {
    if (!track) {
        alert('No track is currently playing');
        return;
    }

    const downloadKey = `track-${track.id}`;
    if (ongoingDownloads.has(downloadKey)) {
        showNotification('This track is already being downloaded');
        return;
    }

    let enrichedTrack: TrackData = {
        ...track,
        artist: track.artist || (track.artists && track.artists.length > 0 ? track.artists[0] : undefined),
    };

    try {
        const fullTrack = await api.getTrackMetadata(track.id);
        if (fullTrack) {
            enrichedTrack = {
                ...fullTrack,
                ...enrichedTrack,
                artist: enrichedTrack.artist || fullTrack.artist,
                album: {
                    ...(fullTrack.album || {} as TrackAlbum),
                    ...(enrichedTrack.album || {} as TrackAlbum),
                } as TrackAlbum,
                discNumber: (enrichedTrack as Record<string, unknown>).discNumber ?? (fullTrack as Record<string, unknown>).discNumber,
                volumeNumber: enrichedTrack.volumeNumber ?? fullTrack.volumeNumber,
            } as TrackData;
        }
    } catch {
        // Continue with available track payload
    }

    if (enrichedTrack.album && (!enrichedTrack.album.title || !enrichedTrack.album.artist) && enrichedTrack.album.id) {
        try {
            const albumData = await api.getAlbum(enrichedTrack.album.id);
            if (albumData.album) {
                enrichedTrack.album = {
                    ...enrichedTrack.album,
                    ...albumData.album,
                };
            }
        } catch (error: unknown) {
            console.warn('Failed to fetch album data for metadata:', error);
        }
    }

    const filename = buildTrackFilename(enrichedTrack, quality);

    const controller = abortController || new AbortController();
    ongoingDownloads.add(downloadKey);

    try {
        addDownloadTask(track.id, enrichedTrack, filename, api, controller);

        await api.downloadTrack(track.id, quality, filename, {
            signal: controller.signal,
            track: enrichedTrack,
            onProgress: (progress: DownloadProgress) => {
                updateDownloadProgress(track.id, progress);
            },
        });

        completeDownloadTask(track.id, true);

        if (lyricsManager && lyricsSettings.shouldDownloadLyrics()) {
            try {
                const lyricsData = await lyricsManager.fetchLyrics(track.id, track);
                if (lyricsData) {
                    lyricsManager.downloadLRC(lyricsData, track);
                }
            } catch {
                console.log('Could not download lyrics for track');
            }
        }
    } catch (error: unknown) {
        if ((error as Error).name !== 'AbortError') {
            const errorMsg =
                (error as Error).message === RATE_LIMIT_ERROR_MESSAGE ? (error as Error).message : 'Download failed. Please try again.';
            completeDownloadTask(track.id, false, errorMsg);
        }
    } finally {
        ongoingDownloads.delete(downloadKey);
    }
}

export async function downloadLikedTracks(tracks: TrackData[], api: DownloadAPI, quality: string, lyricsManager: LyricsManager | null = null): Promise<void> {
    const folderName = `Liked Tracks - ${new Date().toISOString().slice(0, 10)}`;
    await startBulkDownload(tracks, folderName, api, quality, lyricsManager, 'liked', 'Liked Tracks');
}
