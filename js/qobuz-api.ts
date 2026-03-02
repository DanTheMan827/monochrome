// js/qobuz-api.js
// Qobuz API integration for Monochrome Music

const QOBUZ_API_BASE = 'https://qobuz.squid.wtf/api';

interface QobuzRawImage {
    large?: string;
    medium?: string;
    small?: string;
}

interface QobuzRawArtist {
    id?: string | number;
    name?: string | { display?: string };
    image?: QobuzRawImage;
    picture?: string;
    images?: {
        portrait?: { hash?: string; format?: string };
    };
    [key: string]: unknown;
}

interface QobuzRawAlbum {
    id?: string | number;
    title?: string;
    artist?: QobuzRawArtist;
    artists?: QobuzRawArtist[];
    tracks_count?: number;
    release_date_original?: string;
    release_date?: string;
    image?: QobuzRawImage;
    parental_warning?: boolean;
    album_type?: string;
    tracks?: { items?: QobuzRawTrack[] };
    [key: string]: unknown;
}

interface QobuzRawTrack {
    id?: string | number;
    title?: string;
    duration?: number;
    performer?: QobuzRawArtist;
    artist?: QobuzRawArtist;
    artists?: QobuzRawArtist[];
    album?: QobuzRawAlbum;
    streaming_quality?: string;
    parental_warning?: boolean;
    track_number?: number;
    media_number?: number;
    isrc?: string;
    [key: string]: unknown;
}

interface QobuzReleaseGroup {
    type?: string;
    items?: QobuzRawAlbum[];
}

interface QobuzResponseData {
    tracks?: { items?: QobuzRawTrack[]; limit?: number; offset?: number; total?: number };
    albums?: { items?: QobuzRawAlbum[]; limit?: number; offset?: number; total?: number };
    artists?: { items?: QobuzRawArtist[]; limit?: number; offset?: number; total?: number };
    artist?: QobuzRawArtist;
    releases?: QobuzReleaseGroup[];
    top_tracks?: QobuzRawTrack[];
    url?: string;
    [key: string]: unknown;
}

interface QobuzApiResponse {
    success?: boolean;
    data?: QobuzResponseData;
}

interface QobuzTransformedArtist {
    id: string;
    name: string;
    picture: string | null;
    provider: string;
    originalId: string | number | null | undefined;
}

interface QobuzTransformedAlbum {
    id: string;
    title: string | undefined;
    artist: QobuzTransformedArtist | null;
    artists: QobuzTransformedArtist[];
    numberOfTracks: number;
    releaseDate: string | undefined;
    cover: string | undefined;
    explicit: boolean;
    type: string;
    provider: string;
    originalId: string | number | undefined;
}

interface QobuzTransformedTrack {
    id: string;
    title: string | undefined;
    duration: number | undefined;
    artist: QobuzTransformedArtist | null;
    artists: QobuzTransformedArtist[];
    album: QobuzTransformedAlbum | null;
    audioQuality: string;
    explicit: boolean;
    trackNumber: number | undefined;
    volumeNumber: number;
    isrc: string | undefined;
    provider: string;
    originalId: string | number | undefined;
}

interface QobuzPaginatedResult<T> {
    items: T[];
    limit: number;
    offset: number;
    totalNumberOfItems: number;
}

interface QobuzFetchOptions {
    signal?: AbortSignal;
}

interface QobuzSearchOptions {
    offset?: number;
    limit?: number;
}

interface QobuzAlbumResult {
    album: QobuzTransformedAlbum;
    tracks: QobuzTransformedTrack[];
}

interface QobuzArtistResult extends QobuzTransformedArtist {
    albums: QobuzTransformedAlbum[];
    eps: QobuzTransformedAlbum[];
    tracks: QobuzTransformedTrack[];
}

interface QobuzSearchResult {
    tracks: QobuzPaginatedResult<QobuzTransformedTrack>;
    albums: QobuzPaginatedResult<QobuzTransformedAlbum>;
    artists: QobuzPaginatedResult<QobuzTransformedArtist>;
}

export class QobuzAPI {
    baseUrl: string;

    constructor() {
        this.baseUrl = QOBUZ_API_BASE;
    }

    async fetchWithRetry(endpoint: string, options: QobuzFetchOptions = {}): Promise<QobuzApiResponse> {
        const url = `${this.baseUrl}${endpoint}`;

        try {
            const response = await fetch(url, { signal: options.signal });

            if (!response.ok) {
                throw new Error(`Request failed with status ${response.status}`);
            }

            const data = (await response.json()) as QobuzApiResponse;
            return data;
        } catch (error: unknown) {
            if (error instanceof Error && error.name === 'AbortError') throw error;
            console.error('Qobuz API request failed:', error);
            throw error;
        }
    }

    // Search tracks
    async searchTracks(query: string, options: QobuzSearchOptions = {}): Promise<QobuzPaginatedResult<QobuzTransformedTrack>> {
        try {
            const offset = options.offset || 0;
            const limit = options.limit || 10;
            const data = await this.fetchWithRetry(
                `/get-music?q=${encodeURIComponent(query)}&offset=${offset}&limit=${limit}`
            );

            if (!data.success || !data.data) {
                return { items: [], limit: 0, offset: 0, totalNumberOfItems: 0 };
            }

            const tracks = (data.data.tracks?.items || []).map((track: QobuzRawTrack) => this.transformTrack(track));

            return {
                items: tracks,
                limit: data.data.tracks?.limit || tracks.length,
                offset: data.data.tracks?.offset || 0,
                totalNumberOfItems: data.data.tracks?.total || tracks.length,
            };
        } catch (error: unknown) {
            if (error instanceof Error && error.name === 'AbortError') throw error;
            console.error('Qobuz track search failed:', error);
            return { items: [], limit: 0, offset: 0, totalNumberOfItems: 0 };
        }
    }

    // Search albums
    async searchAlbums(query: string, options: QobuzSearchOptions = {}): Promise<QobuzPaginatedResult<QobuzTransformedAlbum>> {
        try {
            const offset = options.offset || 0;
            const limit = options.limit || 10;
            const data = await this.fetchWithRetry(
                `/get-music?q=${encodeURIComponent(query)}&offset=${offset}&limit=${limit}`
            );

            if (!data.success || !data.data) {
                return { items: [], limit: 0, offset: 0, totalNumberOfItems: 0 };
            }

            const albums = (data.data.albums?.items || []).map((album: QobuzRawAlbum) => this.transformAlbum(album));

            return {
                items: albums,
                limit: data.data.albums?.limit || albums.length,
                offset: data.data.albums?.offset || 0,
                totalNumberOfItems: data.data.albums?.total || albums.length,
            };
        } catch (error: unknown) {
            if (error instanceof Error && error.name === 'AbortError') throw error;
            console.error('Qobuz album search failed:', error);
            return { items: [], limit: 0, offset: 0, totalNumberOfItems: 0 };
        }
    }

    // Search artists
    async searchArtists(query: string, options: QobuzSearchOptions = {}): Promise<QobuzPaginatedResult<QobuzTransformedArtist>> {
        try {
            const offset = options.offset || 0;
            const limit = options.limit || 10;
            const data = await this.fetchWithRetry(
                `/get-music?q=${encodeURIComponent(query)}&offset=${offset}&limit=${limit}`
            );

            if (!data.success || !data.data) {
                return { items: [], limit: 0, offset: 0, totalNumberOfItems: 0 };
            }

            const artists = (data.data.artists?.items || []).map((artist: QobuzRawArtist) => this.transformArtist(artist));

            return {
                items: artists,
                limit: data.data.artists?.limit || artists.length,
                offset: data.data.artists?.offset || 0,
                totalNumberOfItems: data.data.artists?.total || artists.length,
            };
        } catch (error: unknown) {
            if (error instanceof Error && error.name === 'AbortError') throw error;
            console.error('Qobuz artist search failed:', error);
            return { items: [], limit: 0, offset: 0, totalNumberOfItems: 0 };
        }
    }

    // Get track details
    async getTrack(_id: string): Promise<never> {
        // Qobuz doesn't have a direct track endpoint
        // Track metadata comes from search/album endpoints
        // For playback, use getStreamUrl directly
        throw new Error('Qobuz getTrack not implemented - use getStreamUrl for playback');
    }

    // Get album details
    async getAlbum(id: string): Promise<QobuzAlbumResult> {
        try {
            const data = await this.fetchWithRetry(`/get-album?album_id=${encodeURIComponent(id)}`);

            if (!data.success || !data.data) {
                throw new Error('Album not found');
            }

            const album = this.transformAlbum(data.data as QobuzRawAlbum);
            const tracks = (data.data.tracks?.items || []).map((track: QobuzRawTrack) => this.transformTrack(track, data.data as QobuzRawAlbum));

            return { album, tracks };
        } catch (error: unknown) {
            console.error('Qobuz getAlbum failed:', error);
            throw error;
        }
    }

    // Get artist details
    async getArtist(id: string): Promise<QobuzArtistResult> {
        try {
            const artistData = await this.fetchWithRetry(`/get-artist?artist_id=${encodeURIComponent(id)}`);

            if (!artistData.success || !artistData.data) {
                throw new Error('Artist not found');
            }

            // Qobuz get-artist returns { artist: {...} } nested structure
            const artistInfo = (artistData.data.artist || artistData.data) as QobuzRawArtist;
            if (!artistInfo) {
                throw new Error('Artist info not found in response');
            }
            const artist = this.transformArtist(artistInfo);

            // Get albums from the releases section
            let albums: QobuzTransformedAlbum[] = [];
            let eps: QobuzTransformedAlbum[] = [];
            if (Array.isArray(artistData.data.releases)) {
                // Find album releases
                const albumReleases = (artistData.data.releases as QobuzReleaseGroup[]).find((r: QobuzReleaseGroup) => r.type === 'album');
                if (albumReleases?.items) {
                    albums = albumReleases.items.map((album: QobuzRawAlbum) => this.transformAlbum(album));
                }
                // Find EP/single releases
                const epReleases = (artistData.data.releases as QobuzReleaseGroup[]).find((r: QobuzReleaseGroup) => r.type === 'epSingle');
                if (epReleases?.items) {
                    eps = epReleases.items.map((album: QobuzRawAlbum) => this.transformAlbum(album));
                }
            }

            // Get top tracks
            let tracks: QobuzTransformedTrack[] = [];
            if (Array.isArray(artistData.data.top_tracks)) {
                tracks = (artistData.data.top_tracks as QobuzRawTrack[]).map((track: QobuzRawTrack) => this.transformTrack(track));
            }

            return { ...artist, albums, eps, tracks };
        } catch (error: unknown) {
            console.error('Qobuz getArtist failed:', error);
            throw error;
        }
    }

    // Transform Qobuz track to Tidal-like format
    transformTrack(track: QobuzRawTrack, albumData: QobuzRawAlbum | null = null): QobuzTransformedTrack {
        // Qobuz uses 'performer' for the main artist, not 'artist'
        const mainArtist = track.performer || track.artist;
        const artistsList = track.artists || (mainArtist ? [mainArtist] : []);

        return {
            id: `q:${track.id}`,
            title: track.title,
            duration: track.duration,
            artist: mainArtist ? this.transformArtist(mainArtist) : null,
            artists: artistsList.map((a: QobuzRawArtist) => this.transformArtist(a)),
            album: albumData ? this.transformAlbum(albumData) : track.album ? this.transformAlbum(track.album) : null,
            audioQuality: this.mapQuality(track.streaming_quality),
            explicit: track.parental_warning || false,
            trackNumber: track.track_number,
            volumeNumber: track.media_number || 1,
            isrc: track.isrc,
            provider: 'qobuz',
            originalId: track.id,
        };
    }

    // Transform Qobuz album to Tidal-like format
    transformAlbum(album: QobuzRawAlbum): QobuzTransformedAlbum {
        // Qobuz albums have artist (single) or artists (array)
        const mainArtist = album.artist || album.artists?.[0];
        return {
            id: `q:${album.id}`,
            title: album.title,
            artist: mainArtist ? this.transformArtist(mainArtist) : null,
            artists: album.artists
                ? album.artists.map((a: QobuzRawArtist) => this.transformArtist(a))
                : mainArtist
                  ? [this.transformArtist(mainArtist)]
                  : [],
            numberOfTracks: album.tracks_count || 0,
            releaseDate: album.release_date_original || album.release_date,
            cover: album.image?.large || album.image?.medium || album.image?.small,
            explicit: album.parental_warning || false,
            type: album.album_type === 'ep' ? 'EP' : album.album_type === 'single' ? 'SINGLE' : 'ALBUM',
            provider: 'qobuz',
            originalId: album.id,
        };
    }

    // Transform Qobuz artist to Tidal-like format
    transformArtist(artist: QobuzRawArtist | null): QobuzTransformedArtist {
        if (!artist) {
            return {
                id: 'q:unknown',
                name: 'Unknown Artist',
                picture: null,
                provider: 'qobuz',
                originalId: null,
            };
        }
        // Handle different name structures: string or { display: string }
        const name = typeof artist.name === 'string' ? artist.name : artist.name?.display || 'Unknown Artist';
        // Handle different image structures: image object or picture string or images.portrait
        const picture =
            artist.image?.large ||
            artist.image?.medium ||
            artist.image?.small ||
            artist.picture ||
            (artist.images?.portrait
                ? `https://static.qobuz.com/images/artists/covers/large/${artist.images.portrait.hash}.${artist.images.portrait.format}`
                : null);
        return {
            id: `q:${artist.id}`,
            name: name,
            picture: picture,
            provider: 'qobuz',
            originalId: artist.id,
        };
    }

    // Map Qobuz quality to Tidal quality format
    mapQuality(qobuzQuality: string | undefined): string {
        const qualityMap: Record<string, string> = {
            MP3: 'HIGH',
            FLAC: 'LOSSLESS',
            HiRes: 'HI_RES_LOSSLESS',
        };
        return (qobuzQuality && qualityMap[qobuzQuality]) || 'LOSSLESS';
    }

    // Get cover URL
    getCoverUrl(coverId: string | null | undefined, size: string = '320'): string {
        if (!coverId) {
            return `https://picsum.photos/seed/${Math.random()}/${size}`;
        }

        // Qobuz cover URLs are usually full URLs
        if (typeof coverId === 'string' && coverId.startsWith('http')) {
            return coverId;
        }

        return coverId;
    }

    // Get artist picture URL
    getArtistPictureUrl(pictureUrl: string | null | undefined, size: string = '320'): string {
        if (!pictureUrl) {
            return `https://picsum.photos/seed/${Math.random()}/${size}`;
        }

        // Qobuz picture URLs are usually full URLs
        if (typeof pictureUrl === 'string' && pictureUrl.startsWith('http')) {
            return pictureUrl;
        }

        return pictureUrl;
    }

    // Get stream URL for a track
    async getStreamUrl(trackId: string, quality: string = '27'): Promise<string> {
        try {
            const cleanId = trackId.replace(/^q:/, '');
            // Map Tidal quality format to Qobuz quality values
            // Qobuz: 27=MP3 320kbps, 7=FLAC lossless, 6=HiRes 96/24, 5=HiRes 192/24
            const qualityMap: Record<string, string> = {
                LOW: '27',
                HIGH: '27',
                LOSSLESS: '7',
                HI_RES: '6',
                HI_RES_LOSSLESS: '5',
            };
            const qobuzQuality = qualityMap[quality] || quality || '27';
            const data = await this.fetchWithRetry(
                `/download-music?track_id=${encodeURIComponent(cleanId)}&quality=${qobuzQuality}`
            );

            if (!data.success || !data.data?.url) {
                throw new Error('Stream URL not available');
            }

            return data.data.url;
        } catch (error) {
            console.error('Qobuz getStreamUrl failed:', error);
            throw error;
        }
    }

    // Similar/recommendation methods
    async getSimilarArtists(artistId: string): Promise<QobuzTransformedArtist[]> {
        // Qobuz doesn't have a direct similar artists endpoint in this simplified API
        return [];
    }

    async getSimilarAlbums(albumId: string): Promise<QobuzTransformedAlbum[]> {
        // Qobuz doesn't have a direct similar albums endpoint in this simplified API
        return [];
    }

    // Unified search - search all types at once
    async search(query: string, options: QobuzSearchOptions = {}): Promise<QobuzSearchResult> {
        const offset = options.offset || 0;
        const limit = options.limit || 10;

        try {
            const data = await this.fetchWithRetry(
                `/get-music?q=${encodeURIComponent(query)}&offset=${offset}&limit=${limit}`
            );

            if (!data.success || !data.data) {
                return {
                    tracks: { items: [], limit: 0, offset: 0, totalNumberOfItems: 0 },
                    albums: { items: [], limit: 0, offset: 0, totalNumberOfItems: 0 },
                    artists: { items: [], limit: 0, offset: 0, totalNumberOfItems: 0 },
                };
            }

            const tracks = (data.data.tracks?.items || []).map((track: QobuzRawTrack) => this.transformTrack(track));
            const albums = (data.data.albums?.items || []).map((album: QobuzRawAlbum) => this.transformAlbum(album));
            const artists = (data.data.artists?.items || []).map((artist: QobuzRawArtist) => this.transformArtist(artist));

            return {
                tracks: {
                    items: tracks,
                    limit: data.data.tracks?.limit || tracks.length,
                    offset: data.data.tracks?.offset || 0,
                    totalNumberOfItems: data.data.tracks?.total || tracks.length,
                },
                albums: {
                    items: albums,
                    limit: data.data.albums?.limit || albums.length,
                    offset: data.data.albums?.offset || 0,
                    totalNumberOfItems: data.data.albums?.total || albums.length,
                },
                artists: {
                    items: artists,
                    limit: data.data.artists?.limit || artists.length,
                    offset: data.data.artists?.offset || 0,
                    totalNumberOfItems: data.data.artists?.total || artists.length,
                },
            };
        } catch (error: unknown) {
            if (error instanceof Error && error.name === 'AbortError') throw error;
            console.error('Qobuz search failed:', error);
            return {
                tracks: { items: [], limit: 0, offset: 0, totalNumberOfItems: 0 },
                albums: { items: [], limit: 0, offset: 0, totalNumberOfItems: 0 },
                artists: { items: [], limit: 0, offset: 0, totalNumberOfItems: 0 },
            };
        }
    }

    // Get next page helper
    getNextPage(currentOffset: number, limit: number, total: number): number | null {
        const nextOffset = currentOffset + limit;
        return nextOffset < total ? nextOffset : null;
    }

    // Get previous page helper
    getPreviousPage(currentOffset: number, limit: number): number | null {
        const prevOffset = currentOffset - limit;
        return prevOffset >= 0 ? prevOffset : null;
    }
}

export const qobuzAPI = new QobuzAPI();
