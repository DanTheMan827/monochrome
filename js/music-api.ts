// js/music-api.js
// Unified API wrapper that supports both Tidal and Qobuz

import { LosslessAPI } from './api.ts';
import { QobuzAPI } from './qobuz-api.ts';
import { musicProviderSettings } from './storage.ts';

interface SearchOptions {
    provider?: string;
    offset?: number;
    limit?: number;
    [key: string]: unknown;
}

type MusicProvider = 'tidal' | 'qobuz';

export class MusicAPI {
    tidalAPI: LosslessAPI;
    qobuzAPI: QobuzAPI;
    private _settings: typeof import('./storage.ts').apiSettings;

    constructor(settings: typeof import('./storage.ts').apiSettings) {
        this.tidalAPI = new LosslessAPI(settings);
        this.qobuzAPI = new QobuzAPI();
        this._settings = settings;
    }

    getCurrentProvider(): string {
        return musicProviderSettings.getProvider();
    }

    // Get the appropriate API based on provider
    getAPI(provider: string | null = null): LosslessAPI | QobuzAPI {
        const p = provider || this.getCurrentProvider();
        return p === 'qobuz' ? this.qobuzAPI : this.tidalAPI;
    }

    // Search methods
    async searchTracks(query: string, options: SearchOptions = {}): Promise<{ items: TrackData[]; limit: number; offset: number; totalNumberOfItems: number }> {
        const provider = options.provider || this.getCurrentProvider();
        return this.getAPI(provider).searchTracks(query, options);
    }

    async searchArtists(query: string, options: SearchOptions = {}): Promise<{ items: ArtistData[]; limit: number; offset: number; totalNumberOfItems: number }> {
        const provider = options.provider || this.getCurrentProvider();
        return this.getAPI(provider).searchArtists(query, options);
    }

    async searchAlbums(query: string, options: SearchOptions = {}): Promise<{ items: TrackAlbum[]; limit: number; offset: number; totalNumberOfItems: number }> {
        const provider = options.provider || this.getCurrentProvider();
        return this.getAPI(provider).searchAlbums(query, options);
    }

    async searchPlaylists(query: string, options: SearchOptions = {}): Promise<{ items: PlaylistData[]; limit: number; offset: number; totalNumberOfItems: number }> {
        const provider = options.provider || this.getCurrentProvider();
        if (provider === 'qobuz') {
            // Qobuz doesn't support playlist search, return empty
            return { items: [], limit: 0, offset: 0, totalNumberOfItems: 0 };
        }
        return this.tidalAPI.searchPlaylists(query, options as Record<string, unknown>);
    }

    // Get methods
    async getTrack(id: string | number, quality: string, provider: string | null = null): Promise<{ originalTrackUrl?: string; info: { manifest: string } }> {
        const p = provider || this.getProviderFromId(id) || this.getCurrentProvider();
        const cleanId = String(this.stripProviderPrefix(id));
        if (p === 'qobuz') return this.qobuzAPI.getTrack(cleanId);
        return this.tidalAPI.getTrack(cleanId, quality);
    }

    async getTrackMetadata(id: string | number, provider: string | null = null): Promise<TrackData> {
        const p = provider || this.getProviderFromId(id) || this.getCurrentProvider();
        const cleanId = String(this.stripProviderPrefix(id));
        if (p === 'qobuz') return this.qobuzAPI.getTrack(cleanId);
        return this.tidalAPI.getTrackMetadata(cleanId);
    }

    async getAlbum(id: string | number, provider: string | null = null): Promise<{ album: TrackAlbum; tracks: TrackData[] }> {
        const p = provider || this.getProviderFromId(id) || this.getCurrentProvider();
        const api = this.getAPI(p);
        const cleanId = String(this.stripProviderPrefix(id));
        return api.getAlbum(cleanId) as Promise<{ album: TrackAlbum; tracks: TrackData[] }>;
    }

    async getArtist(id: string | number, provider: string | null = null): Promise<unknown> {
        const p = provider || this.getProviderFromId(id) || this.getCurrentProvider();
        const api = this.getAPI(p);
        const cleanId = String(this.stripProviderPrefix(id));
        return api.getArtist(cleanId);
    }

    async getArtistBiography(id: string | number, provider: string | null = null): Promise<{ text: string; source: string } | null> {
        const p = provider || this.getProviderFromId(id) || this.getCurrentProvider();
        if (p !== 'tidal') return null; // Biography only supported for Tidal

        const cleanId = String(this.stripProviderPrefix(id));
        if (typeof this.tidalAPI.getArtistBiography === 'function') {
            return this.tidalAPI.getArtistBiography(cleanId);
        }
        return null;
    }

    async getArtistSocials(artistName: string): Promise<unknown[]> {
        return this.tidalAPI.getArtistSocials(artistName);
    }

    async getPlaylist(id: string | number, _provider: string | null = null): Promise<unknown> {
        // Playlists are always Tidal for now
        return this.tidalAPI.getPlaylist(id);
    }

    async getMix(id: string | number, _provider: string | null = null): Promise<unknown> {
        // Mixes are always Tidal for now
        return this.tidalAPI.getMix(id);
    }

    async getTrackRecommendations(id: string | number): Promise<unknown[]> {
        const p = this.getProviderFromId(id) || this.getCurrentProvider();
        const cleanId = String(this.stripProviderPrefix(id));
        if (p !== 'qobuz' && typeof this.tidalAPI.getTrackRecommendations === 'function') {
            return this.tidalAPI.getTrackRecommendations(cleanId);
        }
        return [];
    }

    // Stream methods
    async getStreamUrl(id: string | number, quality: string, provider: string | null = null): Promise<string> {
        const p = provider || this.getProviderFromId(id) || this.getCurrentProvider();
        const api = this.getAPI(p);
        const cleanId = String(this.stripProviderPrefix(id));
        return api.getStreamUrl(cleanId, quality);
    }

    // Cover/artwork methods
    getCoverUrl(id: string | number | undefined, size: string = '320'): string {
        if (!id) return '';
        if (typeof id === 'string' && id.startsWith('blob:')) {
            return id;
        }
        if (typeof id === 'string' && id.startsWith('q:')) {
            return this.qobuzAPI.getCoverUrl(id.slice(2), size);
        }
        return this.tidalAPI.getCoverUrl(String(id), size);
    }

    getVideoCoverUrl(videoCoverId: string | number | null, fallbackCoverId: string | number, size: string = '1280'): string {
        if (videoCoverId) {
            const videoUrl = this.tidalAPI.getVideoCoverUrl(String(videoCoverId), size);
            if (videoUrl) return videoUrl;
        }
        return this.getCoverUrl(fallbackCoverId, size);
    }

    getArtistPictureUrl(id: string | number, size: string = '320'): string {
        if (typeof id === 'string' && id.startsWith('q:')) {
            return this.qobuzAPI.getArtistPictureUrl(id.slice(2), size);
        }
        return this.tidalAPI.getArtistPictureUrl(String(id), size);
    }

    extractStreamUrlFromManifest(manifest: string): string | null {
        return this.tidalAPI.extractStreamUrlFromManifest(manifest);
    }

    // Helper methods
    getProviderFromId(id: string | number): MusicProvider | null {
        if (typeof id === 'string') {
            if (id.startsWith('q:')) return 'qobuz';
            if (id.startsWith('t:')) return 'tidal';
        }
        return null;
    }

    stripProviderPrefix(id: string | number): string | number {
        if (typeof id === 'string') {
            if (id.startsWith('q:') || id.startsWith('t:')) {
                return id.slice(2);
            }
        }
        return id;
    }

    // Download methods
    async downloadTrack(id: string | number, quality: string, filename: string, options: Record<string, unknown> = {}): Promise<void> {
        const provider = this.getProviderFromId(id) || this.getCurrentProvider();
        const cleanId = String(this.stripProviderPrefix(id));
        return this.tidalAPI.downloadTrack(cleanId, quality, filename, options);
    }

    // Similar/recommendation methods
    async getSimilarArtists(artistId: string | number): Promise<unknown[]> {
        const provider = this.getProviderFromId(artistId) || this.getCurrentProvider();
        const api = this.getAPI(provider);
        const cleanId = String(this.stripProviderPrefix(artistId));
        return api.getSimilarArtists(cleanId);
    }

    async getSimilarAlbums(albumId: string | number): Promise<unknown[]> {
        const provider = this.getProviderFromId(albumId) || this.getCurrentProvider();
        const api = this.getAPI(provider);
        const cleanId = String(this.stripProviderPrefix(albumId));
        return api.getSimilarAlbums(cleanId);
    }

    async getRecommendedTracksForPlaylist(tracks: TrackData[], limit: number = 20, options: Record<string, unknown> = {}): Promise<unknown[]> {
        // Use Tidal for recommendations
        return this.tidalAPI.getRecommendedTracksForPlaylist(tracks, limit, options);
    }

    // Cache methods
    async clearCache(): Promise<void> {
        await this.tidalAPI.clearCache();
        // Qobuz doesn't have cache yet
    }

    getCacheStats(): Record<string, unknown> {
        return this.tidalAPI.getCacheStats();
    }

    // Settings accessor for compatibility
    get settings(): typeof import('./storage.ts').apiSettings {
        return this._settings;
    }
}
