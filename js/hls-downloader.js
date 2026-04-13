// @ts-check
import { SegmentedDownloadProgress } from './progressEvents';

/**
 * Downloads an HLS stream by fetching the master/media playlist and concatenating all segments.
 */
export class HlsDownloader {
    /**
     * Creates a new HlsDownloader instance.
     */
    constructor() {}

    /**
     * Downloads a complete HLS stream and returns its segments as a single Blob.
     * Automatically selects the highest-bandwidth variant from a master playlist.
     * @async
     * @param {string} masterUrl - URL of the HLS master or media playlist
     * @param {{ onProgress?: (p: SegmentedDownloadProgress) => void, signal?: AbortSignal }} [options={}] - Download options
     * @returns {Promise<Blob>} A Blob containing the concatenated segment data
     * @throws {Error} If no segments are found or a segment fetch fails
     */
    async downloadHlsStream(masterUrl, options = {}) {
        const { onProgress, signal } = options;

        const response = await fetch(masterUrl, { signal });
        const masterText = await response.text();

        const variantUrl = this.getBestVariantUrl(masterUrl, masterText);

        const mediaResponse = await fetch(variantUrl, { signal });
        const mediaText = await mediaResponse.text();

        const segments = this.parseMediaPlaylist(variantUrl, mediaText);
        if (segments.length === 0) {
            throw new Error('No segments found in HLS playlist');
        }

        const chunks = [];
        let downloadedBytes = 0;
        const totalSegments = segments.length;

        for (let i = 0; i < totalSegments; i++) {
            if (signal?.aborted) throw new Error('AbortError');

            onProgress?.(new SegmentedDownloadProgress(downloadedBytes, undefined, i, totalSegments));

            const segmentUrl = segments[i];
            const segmentResponse = await fetch(segmentUrl, { signal });

            if (!segmentResponse.ok) {
                throw new Error(`Failed to fetch segment ${i}: ${segmentResponse.status}`);
            }

            const chunk = await segmentResponse.arrayBuffer();
            chunks.push(chunk);
            downloadedBytes += chunk.byteLength;

            onProgress?.(new SegmentedDownloadProgress(downloadedBytes, undefined, i + 1, totalSegments));
        }

        const mimeType = segments[0].endsWith('.m4s') || segments[0].includes('mp4') ? 'video/mp4' : 'video/mp2t';
        return new Blob(chunks, { type: mimeType });
    }

    /**
     * Selects the highest-bandwidth variant URL from an HLS master playlist.
     * Returns `masterUrl` unchanged when the text is a media playlist (no `#EXT-X-STREAM-INF`).
     * @param {string} masterUrl - Absolute URL of the master playlist
     * @param {string} masterText - Text content of the master playlist
     * @returns {string} Absolute URL of the best variant playlist
     */
    getBestVariantUrl(masterUrl, masterText) {
        if (!masterText.includes('#EXT-X-STREAM-INF')) {
            return masterUrl;
        }

        const lines = masterText.split('\n');
        /** @type {Array<{bandwidth: number, resolution: string, url: string}>} */
        const variants = [];
        /** @type {{bandwidth: number, resolution: string, url?: string} | null} */
        let currentVariant = null;

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('#EXT-X-STREAM-INF:')) {
                const bandwidthMatch = trimmed.match(/BANDWIDTH=(\d+)/);
                const resolutionMatch = trimmed.match(/RESOLUTION=(\d+x\d+)/);
                currentVariant = {
                    bandwidth: bandwidthMatch ? parseInt(bandwidthMatch[1], 10) : 0,
                    resolution: resolutionMatch ? resolutionMatch[1] : 'unknown',
                };
            } else if (trimmed && !trimmed.startsWith('#')) {
                if (currentVariant) {
                    currentVariant.url = this.resolveUrl(masterUrl, trimmed);
                    variants.push(/** @type {{bandwidth: number, resolution: string, url: string}} */ (currentVariant));
                    currentVariant = null;
                }
            }
        }

        if (variants.length === 0) return masterUrl;

        variants.sort((a, b) => b.bandwidth - a.bandwidth);
        return variants[0].url;
    }

    /**
     * Parses a media playlist and returns the absolute URL of every segment.
     * @param {string} mediaUrl - Absolute URL of the media playlist (used as the base for relative URIs)
     * @param {string} mediaText - Text content of the media playlist
     * @returns {string[]} Ordered array of absolute segment URLs
     */
    parseMediaPlaylist(mediaUrl, mediaText) {
        const lines = mediaText.split('\n');
        const segments = [];

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                segments.push(this.resolveUrl(mediaUrl, trimmed));
            }
        }

        return segments;
    }

    /**
     * Resolves a potentially relative URL against a base URL.
     * Returns the input unchanged when resolution fails.
     * @param {string} baseUrl - Absolute base URL
     * @param {string} relativeUrl - URL to resolve (may be absolute or relative)
     * @returns {string} Resolved absolute URL
     */
    resolveUrl(baseUrl, relativeUrl) {
        try {
            return new URL(relativeUrl, baseUrl).href;
        } catch {
            return relativeUrl;
        }
    }
}
