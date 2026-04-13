// @ts-check
// js/music-api.js

import { LosslessAPI } from './api.js';
import { PodcastsAPI } from './podcasts-api.js';
import { musicProviderSettings } from './storage.js';

/**
 * MusicAPI - Singleton class that provides a unified interface for accessing music streaming services.
 *
 * Supports multiple providers (primarily Tidal) and includes functionality for searching,
 * retrieving metadata, streaming, and managing playlists, artists, albums, tracks, and podcasts.
 *
 * @class MusicAPI
 * @classdesc Manages API interactions with music providers and provides caching mechanisms
 * for cover artwork and video metadata.
 *
 * @example
 * // Initialize the MusicAPI
 * await MusicAPI.initialize(settings);
 *
 * // Get the singleton instance
 * const api = MusicAPI.instance;
 *
 * // Search for tracks
 * const results = await api.search('query');
 *
 * // Get a specific track
 * const track = await api.getTrack('track-id');
 *
 * // Get stream URL
 * const streamUrl = await api.getStreamUrl('track-id', 'HIGH');
 *
 * @property {LosslessAPI} tidalAPI - The Tidal API instance
 * @property {PodcastsAPI} podcastsAPI - The Podcasts API instance
 * @property {Object} _settings - Configuration settings
 * @property {Map} videoArtworkCache - Cache for video artwork data
 *
 * @throws {Error} Throws if instance is accessed before initialization
 * @throws {Error} Throws if initialize is called more than once
 */
export class MusicAPI {
    static #instance = null;
    /**
     * @type {MusicAPI}
     */
    static get instance() {
        if (!MusicAPI.#instance) {
            throw new Error('MusicAPI not initialized. Call MusicAPI.initialize(settings) first.');
        }
        return MusicAPI.#instance;
    }

    /**
     * Creates a new MusicAPI instance with the given provider settings.
     *
     * @param {Object} settings - Configuration settings for the music provider.
     */
    constructor(settings) {
        this.tidalAPI = new LosslessAPI(settings);
        this.podcastsAPI = new PodcastsAPI();
        this._settings = settings;
        this.videoArtworkCache = new Map();
    }

    /**
     * Initializes the MusicAPI singleton with the provided settings.
     *
     * @async
     * @param {Object} settings - Configuration settings for the music provider.
     * @returns {Promise<MusicAPI>} The newly created MusicAPI singleton instance.
     * @throws {Error} Throws if MusicAPI has already been initialized.
     */
    static async initialize(settings) {
        if (MusicAPI.#instance) {
            throw new Error('MusicAPI is already initialized');
        }

        const api = new MusicAPI(settings);
        return (MusicAPI.#instance = api);
    }

    /**
     * Returns the currently configured music provider identifier.
     *
     * @returns {string} The active provider name (e.g. `'tidal'`).
     */
    getCurrentProvider() {
        return musicProviderSettings.getProvider();
    }

    // Get the appropriate API based on provider
    /**
     * Returns the underlying provider API instance for the active provider.
     *
     * @returns {LosslessAPI} The active provider API instance.
     */
    getAPI() {
        return this.tidalAPI;
    }

    // Search methods
    /**
     * Performs a unified search across tracks, videos, artists, albums, and playlists.
     *
     * @async
     * @param {string} query - The search query string.
     * @param {Object} [options={}] - Optional search parameters passed to the provider.
     * @returns {Promise<Object>} An object containing `tracks`, `videos`, `artists`, `albums`, and `playlists` result sets.
     */
    async search(query, options = {}) {
        const api = this.getAPI();
        if (typeof api.search === 'function') {
            return api.search(query, options);
        }

        // Fallback for providers that don't implement unified search
        const [tracksResult, videosResult, artistsResult, albumsResult, playlistsResult] = await Promise.all([
            api.searchTracks(query, options),
            api.searchVideos ? api.searchVideos(query, options) : Promise.resolve({ items: [] }),
            api.searchArtists(query, options),
            api.searchAlbums(query, options),
            api.searchPlaylists ? api.searchPlaylists(query, options) : Promise.resolve({ items: [] }),
        ]);

        return {
            tracks: tracksResult,
            videos: videosResult,
            artists: artistsResult,
            albums: albumsResult,
            playlists: playlistsResult,
        };
    }

    /**
     * Searches for tracks matching the given query.
     *
     * @async
     * @param {string} query - The search query string.
     * @param {Object} [options={}] - Optional search parameters passed to the provider.
     * @returns {Promise<Object>} A paginated result set of matching tracks.
     */
    async searchTracks(query, options = {}) {
        return this.getAPI().searchTracks(query, options);
    }

    /**
     * Searches for artists matching the given query.
     *
     * @async
     * @param {string} query - The search query string.
     * @param {Object} [options={}] - Optional search parameters passed to the provider.
     * @returns {Promise<Object>} A paginated result set of matching artists.
     */
    async searchArtists(query, options = {}) {
        return this.getAPI().searchArtists(query, options);
    }

    /**
     * Searches for albums matching the given query.
     *
     * @async
     * @param {string} query - The search query string.
     * @param {Object} [options={}] - Optional search parameters passed to the provider.
     * @returns {Promise<Object>} A paginated result set of matching albums.
     */
    async searchAlbums(query, options = {}) {
        return this.getAPI().searchAlbums(query, options);
    }

    /**
     * Searches for playlists matching the given query using the Tidal API.
     *
     * @async
     * @param {string} query - The search query string.
     * @param {Object} [options={}] - Optional search parameters passed to the provider.
     * @returns {Promise<Object>} A paginated result set of matching playlists.
     */
    async searchPlaylists(query, options = {}) {
        return this.tidalAPI.searchPlaylists(query, options);
    }

    /**
     * Searches for videos matching the given query using the Tidal API.
     *
     * @async
     * @param {string} query - The search query string.
     * @param {Object} [options={}] - Optional search parameters passed to the provider.
     * @returns {Promise<Object>} A paginated result set of matching videos.
     */
    async searchVideos(query, options = {}) {
        return this.tidalAPI.searchVideos(query, options);
    }

    /**
     * Searches for podcasts matching the given query.
     *
     * @async
     * @param {string} query - The search query string.
     * @param {Object} [options={}] - Optional search parameters passed to the podcasts provider.
     * @returns {Promise<Object>} A paginated result set of matching podcasts.
     */
    async searchPodcasts(query, options = {}) {
        return this.podcastsAPI.searchPodcasts(query, options);
    }

    /**
     * Retrieves a podcast by its identifier.
     *
     * @async
     * @param {string} id - The podcast identifier.
     * @param {Object} [options={}] - Optional parameters passed to the podcasts provider.
     * @returns {Promise<Object>} The podcast metadata object.
     */
    async getPodcast(id, options = {}) {
        return this.podcastsAPI.getPodcastById(id, options);
    }

    /**
     * Retrieves episodes for a podcast by its identifier.
     *
     * @async
     * @param {string} id - The podcast identifier.
     * @param {Object} [options={}] - Optional parameters passed to the podcasts provider.
     * @returns {Promise<Object>} A paginated result set of podcast episodes.
     */
    async getPodcastEpisodes(id, options = {}) {
        return this.podcastsAPI.getPodcastEpisodes(id, options);
    }

    /**
     * Retrieves a list of trending podcasts.
     *
     * @async
     * @param {Object} [options={}] - Optional parameters passed to the podcasts provider.
     * @returns {Promise<Object>} A result set of trending podcasts.
     */
    async getTrendingPodcasts(options = {}) {
        return this.podcastsAPI.getTrendingPodcasts(options);
    }

    // Get methods
    /**
     * Retrieves a track by its identifier, optionally at a specific quality.
     *
     * @async
     * @param {string} id - The track identifier (may include a provider prefix).
     * @param {string} [quality] - The desired playback quality (e.g. `'HIGH'`, `'LOSSLESS'`).
     * @returns {Promise<Object>} The track object from the provider.
     */
    async getTrack(id, quality) {
        const api = this.getAPI();
        const cleanId = this.stripProviderPrefix(id);
        return api.getTrack(cleanId, quality);
    }

    /**
     * Retrieves metadata for a track by its identifier.
     *
     * @async
     * @param {string} id - The track identifier (may include a provider prefix).
     * @returns {Promise<Object>} The track metadata object.
     */
    async getTrackMetadata(id) {
        const api = this.getAPI();
        const cleanId = this.stripProviderPrefix(id);
        return api.getTrackMetadata(cleanId);
    }

    /**
     * Retrieves an album by its identifier.
     *
     * @async
     * @param {string} id - The album identifier (may include a provider prefix).
     * @returns {Promise<Object>} The album object from the provider.
     */
    async getAlbum(id) {
        const api = this.getAPI();
        const cleanId = this.stripProviderPrefix(id);
        return api.getAlbum(cleanId);
    }

    /**
     * Retrieves an artist by their identifier.
     *
     * @async
     * @param {string} id - The artist identifier (may include a provider prefix).
     * @returns {Promise<Object>} The artist object from the provider.
     */
    async getArtist(id) {
        const api = this.getAPI();
        const cleanId = this.stripProviderPrefix(id);
        return api.getArtist(cleanId);
    }

    /**
     * Retrieves the biography text for an artist by their identifier.
     *
     * @async
     * @param {string} id - The artist identifier (may include a provider prefix).
     * @returns {Promise<{ text: string; source: string }|null>} The biography object, or `null` if unsupported or unavailable.
     */
    async getArtistBiography(id) {
        const api = this.getAPI();
        const cleanId = this.stripProviderPrefix(id);
        if (typeof api.getArtistBiography === 'function') {
            return api.getArtistBiography(cleanId);
        }
        return null;
    }

    /**
     * Retrieves a video by its identifier.
     *
     * @async
     * @param {string} id - The video identifier (may include a provider prefix).
     * @returns {Promise<Object>} The video object from the provider.
     */
    async getVideo(id) {
        const api = this.getAPI();
        const cleanId = this.stripProviderPrefix(id);
        return api.getVideo(cleanId);
    }

    /**
     * Retrieves the stream URL for a video by its identifier.
     *
     * @async
     * @param {string} id - The video identifier (may include a provider prefix).
     * @returns {Promise<string|undefined>} The video stream URL, or `undefined` if unsupported.
     */
    async getVideoStreamUrl(id) {
        const api = this.getAPI();
        const cleanId = this.stripProviderPrefix(id);
        if (typeof api.getVideoStreamUrl === 'function') {
            return api.getVideoStreamUrl(cleanId);
        }
    }

    /**
     * Retrieves social media links and profiles for an artist by name.
     *
     * @async
     * @param {string} artistName - The artist's display name.
     * @returns {Promise<Object>} An object containing the artist's social media links.
     */
    async getArtistSocials(artistName) {
        return this.tidalAPI.getArtistSocials(artistName);
    }

    /**
     * Retrieves a playlist by its identifier using the Tidal API.
     *
     * @async
     * @param {string} id - The playlist identifier.
     * @param {string|null} [_provider=null] - Reserved for future provider selection; currently unused.
     * @returns {Promise<Object>} The playlist object from Tidal.
     */
    async getPlaylist(id, _provider = null) {
        // Playlists are always Tidal for now
        return this.tidalAPI.getPlaylist(id);
    }

    /**
     * Retrieves a Tidal mix by its identifier.
     *
     * @async
     * @param {string} id - The mix identifier.
     * @returns {Promise<Object>} The mix object from Tidal.
     */
    async getMix(id) {
        // Mixes are always Tidal for now
        return this.tidalAPI.getMix(id);
    }

    /**
     * Retrieves track recommendations based on a given track identifier.
     *
     * @async
     * @param {string} id - The track identifier (may include a provider prefix).
     * @returns {Promise<Array>} An array of recommended track objects, or an empty array if unsupported.
     */
    async getTrackRecommendations(id) {
        const api = this.getAPI();
        const cleanId = this.stripProviderPrefix(id);
        if (typeof api.getTrackRecommendations === 'function') {
            return api.getTrackRecommendations(cleanId);
        }
        return [];
    }

    // Stream methods
    /**
     * Retrieves the stream URL for a track at the specified quality.
     *
     * @async
     * @param {string} id - The track identifier (may include a provider prefix).
     * @param {string} quality - The desired stream quality (e.g. `'HIGH'`, `'LOSSLESS'`).
     * @returns {Promise<{ url: string; rgInfo: Object|null }>} The resolved stream URL and optional ReplayGain metadata.
     */
    async getStreamUrl(id, quality) {
        const api = this.getAPI();
        const cleanId = this.stripProviderPrefix(id);
        return api.getStreamUrl(cleanId, quality);
    }

    // Cover/artwork methods
    /**
     * Returns the cover art URL for a given cover image identifier.
     *
     * @param {string} id - The cover image identifier or a blob URL.
     * @param {string} [size='320'] - The desired image size in pixels (e.g. `'320'`, `'640'`).
     * @returns {string} The cover art URL.
     */
    getCoverUrl(id, size = '320') {
        if (typeof id === 'string' && id.startsWith('blob:')) {
            return id;
        }
        return this.tidalAPI.getCoverUrl(this.stripProviderPrefix(id), size);
    }

    getCoverSrcset(id) {
        if (typeof id === 'string' && id.startsWith('blob:')) {
            return '';
        }
        return this.tidalAPI.getCoverSrcset(this.stripProviderPrefix(id));
    }

    /**
     * Returns the cover art URL for a video given its image identifier.
     *
     * @param {string|null} imageId - The video cover image identifier or a blob URL.
     * @param {string} [size='1280'] - The desired image size in pixels.
     * @returns {string|null} The video cover URL, or `null` if no image ID is provided.
     */
    getVideoCoverUrl(imageId, size = '1280') {
        if (!imageId) {
            return null;
        }
        if (typeof imageId === 'string' && imageId.startsWith('blob:')) {
            return imageId;
        }
        return this.tidalAPI.getVideoCoverUrl(this.stripProviderPrefix(imageId), size);
    }

    /**
     * Fetches animated/video artwork for a given title and artist from the external artwork service.
     * Results are cached in `videoArtworkCache` to avoid redundant network requests.
     *
     * @async
     * @param {string} title - The track or video title.
     * @param {string} artist - The artist name.
     * @returns {Promise<{videoUrl: string|null, hlsUrl: string|null}|null>} An object with `videoUrl` and `hlsUrl`, or `null` on failure.
     */
    async getVideoArtwork(title, artist) {
        const cacheKey = `${title}-${artist}`.toLowerCase();
        if (this.videoArtworkCache.has(cacheKey)) {
            return this.videoArtworkCache.get(cacheKey);
        }

        try {
            /*
            Maintainer of artwork.boidu.dev has asked for his API to be removed for the time being due to spam
            */
            /*
            const url = `https://artwork.boidu.dev/?s=${encodeURIComponent(title)}&a=${encodeURIComponent(artist)}`;
            const response = await fetch(url);
            if (!response.ok) return null;
            const data = await response.json();
            const result = {
                videoUrl: data.videoUrl || null,
                hlsUrl: data.animated || null,
            };
            this.videoArtworkCache.set(cacheKey, result);
            return result;
            */
            throw new Error('Video artwork is disabled for now.');
        } catch (error) {
            console.warn('Failed to fetch video artwork:', error);
            return null;
        }
    }

    /**
     * Returns the artist picture URL for the given artist image identifier.
     *
     * @param {string} id - The artist image identifier (may include a provider prefix).
     * @param {string} [size='320'] - The desired image size in pixels.
     * @returns {string} The artist picture URL.
     */
    getArtistPictureUrl(id, size = '320') {
        return this.tidalAPI.getArtistPictureUrl(this.stripProviderPrefix(id), size);
    }

    getArtistPictureSrcset(id) {
        return this.tidalAPI.getArtistPictureSrcset(this.stripProviderPrefix(id));
    }

    /**
     * Extracts a direct stream URL from a provider manifest object.
     *
     * @param {Object} manifest - The stream manifest returned by the provider.
     * @returns {string} The extracted stream URL.
     */
    extractStreamUrlFromManifest(manifest) {
        return this.tidalAPI.extractStreamUrlFromManifest(manifest);
    }

    // Helper methods
    /**
     * Determines the music provider from a prefixed identifier string.
     *
     * @param {string} id - The identifier, possibly prefixed with a provider code (e.g. `'t:123'`).
     * @returns {string|null} The provider name (e.g. `'tidal'`), or `null` if no prefix is found.
     */
    getProviderFromId(id) {
        if (typeof id === 'string') {
            if (id.startsWith('t:')) return 'tidal';
        }
        return null;
    }

    /**
     * Strips a provider prefix (e.g. `'t:'` or `'q:'`) from an identifier string.
     *
     * @param {string|*} id - The identifier, possibly prefixed with a provider code.
     * @returns {string|*} The identifier with the provider prefix removed, or the original value if not a string or unprefixed.
     */
    stripProviderPrefix(id) {
        if (typeof id === 'string') {
            if (id.startsWith('q:') || id.startsWith('t:')) {
                return id.slice(2);
            }
        }
        return id;
    }

    // Download methods
    /**
     * Downloads a track to a file at the specified quality.
     *
     * @async
     * @param {string} id - The track identifier (may include a provider prefix).
     * @param {string} quality - The desired download quality (e.g. `'HIGH'`, `'LOSSLESS'`).
     * @param {string} filename - The destination filename for the downloaded track.
     * @param {Object} [options={}] - Optional parameters passed to the provider's download method.
     * @returns {Promise<Blob>} The downloaded content as a Blob.
     */
    async downloadTrack(id, quality, filename, options = {}) {
        const api = this.getAPI();
        const cleanId = this.stripProviderPrefix(id);
        return api.downloadTrack(cleanId, quality, filename, options);
    }

    // Similar/recommendation methods
    /**
     * Retrieves a list of artists similar to the given artist.
     *
     * @async
     * @param {string} artistId - The artist identifier (may include a provider prefix).
     * @returns {Promise<Array>} An array of similar artist objects.
     */
    async getSimilarArtists(artistId) {
        const api = this.getAPI();
        const cleanId = this.stripProviderPrefix(artistId);
        return api.getSimilarArtists(cleanId);
    }

    /**
     * Retrieves the top tracks for an artist using the Tidal API.
     *
     * @async
     * @param {string} artistId - The artist identifier.
     * @param {Object} [options={}] - Optional parameters passed to the provider.
     * @returns {Promise<Object>} A result set of the artist's top tracks.
     */
    async getArtistTopTracks(artistId, options = {}) {
        return this.tidalAPI.getArtistTopTracks(artistId, options);
    }

    /**
     * Retrieves albums similar to the given album.
     *
     * @async
     * @param {string} albumId - The album identifier (may include a provider prefix).
     * @returns {Promise<Array>} An array of similar album objects.
     */
    async getSimilarAlbums(albumId) {
        const api = this.getAPI();
        const cleanId = this.stripProviderPrefix(albumId);
        return api.getSimilarAlbums(cleanId);
    }

    /**
     * Retrieves track recommendations for a playlist based on its current tracks via the Tidal API.
     *
     * @async
     * @param {Array<Object>} tracks - The existing tracks in the playlist.
     * @param {number} [limit=20] - The maximum number of recommended tracks to return.
     * @param {Object} [options={}] - Optional parameters passed to the provider.
     * @returns {Promise<Array>} An array of recommended track objects.
     */
    async getRecommendedTracksForPlaylist(tracks, limit = 20, options = {}) {
        // Use Tidal for recommendations
        return this.tidalAPI.getRecommendedTracksForPlaylist(tracks, limit, options);
    }

    // Cache methods
    /**
     * Clears the provider API cache.
     *
     * @async
     * @returns {Promise<void>} Resolves when the cache has been cleared.
     */
    async clearCache() {
        await this.tidalAPI.clearCache();
    }

    /**
     * Returns cache statistics from the underlying Tidal API.
     *
     * @returns {Object} An object describing current cache usage and hit/miss metrics.
     */
    getCacheStats() {
        return this.tidalAPI.getCacheStats();
    }

    // Settings accessor for compatibility
    /**
     * Returns the configuration settings object used to initialise this instance.
     *
     * @returns {Object} The settings object passed to the constructor.
     */
    get settings() {
        return this._settings;
    }
}

/**
 * Default export-level MusicAPI instance created without settings.
 * Prefer using `MusicAPI.initialize()` and `MusicAPI.instance` in application code.
 *
 * @type {MusicAPI}
 */
export const musicAPI = new MusicAPI();
