import { libreFmSettings, lastFMStorage } from './storage.ts';

interface LibreFmSession {
    key: string;
    name: string;
}

interface LibreFmApiResponse {
    error?: number;
    message?: string;
    token?: string;
    session?: LibreFmSession;
}

export class LibreFmScrobbler {
    private API_KEY: string;
    private API_SECRET: string;
    private API_URL: string;
    private sessionKey: string | null;
    private username: string | null;
    private currentTrack: TrackData | null;
    private scrobbleTimer: ReturnType<typeof setTimeout> | null;
    private scrobbleThreshold: number;
    private hasScrobbled: boolean;
    private isScrobbling: boolean;

    constructor() {
        this.API_KEY = 'monochrome_music_app';
        this.API_SECRET = 'monochrome_music_secret_2024';
        this.API_URL = 'https://libre.fm/2.0/';

        this.sessionKey = null;
        this.username = null;
        this.currentTrack = null;
        this.scrobbleTimer = null;
        this.scrobbleThreshold = 0;
        this.hasScrobbled = false;
        this.isScrobbling = false;

        this.loadSession();
    }

    loadSession(): void {
        try {
            const session = localStorage.getItem('librefm-session');
            if (session) {
                const data = JSON.parse(session) as LibreFmSession;
                this.sessionKey = data.key;
                this.username = data.name;
            }
        } catch {
            console.error('Failed to load Libre.fm session');
        }
    }

    saveSession(sessionKey: string, username: string): void {
        this.sessionKey = sessionKey;
        this.username = username;
        localStorage.setItem(
            'librefm-session',
            JSON.stringify({
                key: sessionKey,
                name: username,
            })
        );
    }

    clearSession(): void {
        this.sessionKey = null;
        this.username = null;
        localStorage.removeItem('librefm-session');
    }

    isAuthenticated(): boolean {
        return !!this.sessionKey && libreFmSettings.isEnabled();
    }

    _getScrobbleArtist(track: TrackData | null): string {
        if (!track) return 'Unknown Artist';

        let artistName = 'Unknown Artist';

        if (track.artist?.name) {
            artistName = track.artist.name;
        } else if (typeof track.artist === 'string') {
            artistName = track.artist;
        } else if (track.artists && track.artists.length > 0) {
            const first = track.artists[0];
            artistName = typeof first === 'string' ? first : first.name || 'Unknown Artist';
        }

        if (typeof artistName !== 'string') return 'Unknown Artist';

        artistName = artistName
            .split(/\s*[&]\s*|\s+feat\.?\s+|\s+ft\.?\s+|\s+featuring\s+|\s+with\s+|\s+x\s+/i)[0]
            .trim();

        return artistName || 'Unknown Artist';
    }

    async generateSignature(params: Record<string, string>): Promise<string> {
        const filteredParams = { ...params };
        delete filteredParams.format;
        delete filteredParams.callback;

        const sortedKeys = Object.keys(filteredParams).sort();
        const signatureString = sortedKeys.map((key) => `${key}${filteredParams[key]}`).join('') + this.API_SECRET;

        try {
            const { default: md5 } = await import('./md5.ts');
            return md5(signatureString);
        } catch {
            console.error('MD5 library not available');
            throw new Error('MD5 library required for Libre.fm');
        }
    }

    async makeRequest(method: string, params: Record<string, string> = {}, requiresAuth: boolean = false): Promise<LibreFmApiResponse> {
        const requestParams: Record<string, string> = {
            method,
            api_key: this.API_KEY,
            ...params,
        };

        if (requiresAuth && this.sessionKey) {
            requestParams.sk = this.sessionKey;
        }

        const signature = await this.generateSignature(requestParams);

        const formData = new URLSearchParams({
            ...requestParams,
            api_sig: signature,
            format: 'json',
        });

        try {
            const response = await fetch(this.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData,
            });

            const data = (await response.json()) as LibreFmApiResponse;

            if (data.error) {
                throw new Error(data.message || 'Libre.fm API error');
            }

            return data;
        } catch (error) {
            console.error('Libre.fm API request failed:', error);
            throw error;
        }
    }

    async getAuthUrl(): Promise<{ token: string; url: string }> {
        try {
            // First, get a token from Libre.fm
            const data = await this.makeRequest('auth.getToken');
            const token = data.token;
            if (!token) throw new Error('No authentication token returned from Libre.fm API');

            localStorage.setItem('librefm-pending-token', token);

            return {
                token,
                url: `https://libre.fm/api/auth/?api_key=${this.API_KEY}&token=${token}`,
            };
        } catch (error) {
            console.error('Failed to get auth URL:', error);
            throw error;
        }
    }

    async completeAuthentication(token: string): Promise<{ success: boolean; username: string }> {
        try {
            const data = await this.makeRequest('auth.getSession', { token });

            if (data.session) {
                this.saveSession(data.session.key, data.session.name);
                localStorage.removeItem('librefm-pending-token');
                return {
                    success: true,
                    username: data.session.name,
                };
            }

            throw new Error('No session returned');
        } catch (error) {
            console.error('Authentication failed:', error);
            throw error;
        }
    }

    async updateNowPlaying(track: TrackData): Promise<void> {
        if (!this.isAuthenticated()) return;

        this.currentTrack = track;
        // Only reset hasScrobbled if we're not currently in the middle of scrobbling
        // to prevent race conditions that could cause double scrobbles
        if (!this.isScrobbling) {
            this.hasScrobbled = false;
        }
        this.clearScrobbleTimer();

        try {
            const scrobbleTitle = (track.cleanTitle as string | undefined) || track.title;
            const params: Record<string, string> = {
                artist: this._getScrobbleArtist(track),
                track: scrobbleTitle,
            };

            if (track.album?.title) {
                params.album = track.album.title;
            }

            if (track.duration) {
                params.duration = String(Math.floor(track.duration));
            }

            if (track.trackNumber) {
                params.trackNumber = String(track.trackNumber);
            }

            await this.makeRequest('track.updateNowPlaying', params, true);

            console.log('[Libre.fm] Now playing updated:', scrobbleTitle);

            const scrobblePercentage = lastFMStorage.getScrobblePercentage() / 100;
            this.scrobbleThreshold = Math.min(track.duration * scrobblePercentage, 240);
            this.scheduleScrobble(this.scrobbleThreshold * 1000);
        } catch (error) {
            console.error('[Libre.fm] Failed to update now playing:', error);
        }
    }

    scheduleScrobble(delay: number): void {
        this.clearScrobbleTimer();

        this.scrobbleTimer = setTimeout(() => {
            this.scrobbleCurrentTrack();
        }, delay);
    }

    clearScrobbleTimer(): void {
        if (this.scrobbleTimer) {
            clearTimeout(this.scrobbleTimer);
            this.scrobbleTimer = null;
        }
    }

    async scrobbleCurrentTrack(): Promise<void> {
        if (!this.isAuthenticated() || !this.currentTrack || this.hasScrobbled) return;

        this.isScrobbling = true;

        try {
            const timestamp = Math.floor(Date.now() / 1000);
            const scrobbleTitle = (this.currentTrack.cleanTitle as string | undefined) || this.currentTrack.title;

            const params: Record<string, string> = {
                artist: this._getScrobbleArtist(this.currentTrack),
                track: scrobbleTitle,
                timestamp: String(timestamp),
            };

            if (this.currentTrack.album?.title) {
                params.album = this.currentTrack.album.title;
            }

            if (this.currentTrack.duration) {
                params.duration = String(Math.floor(this.currentTrack.duration));
            }

            if (this.currentTrack.trackNumber) {
                params.trackNumber = String(this.currentTrack.trackNumber);
            }

            await this.makeRequest('track.scrobble', params, true);

            this.hasScrobbled = true;
            console.log('[Libre.fm] Scrobbled:', this.currentTrack.cleanTitle || this.currentTrack.title);
        } catch (error) {
            console.error('[Libre.fm] Failed to scrobble:', error);
        } finally {
            this.isScrobbling = false;
        }
    }

    async loveTrack(track: TrackData): Promise<void> {
        if (!this.isAuthenticated()) return;

        try {
            const params = {
                artist: this._getScrobbleArtist(track),
                track: track.title,
            };

            await this.makeRequest('track.love', params, true);
            console.log('[Libre.fm] Loved track:', track.title);
        } catch (error) {
            console.error('[Libre.fm] Failed to love track:', error);
        }
    }

    onTrackChange(track: TrackData): void {
        if (!this.isAuthenticated()) return;
        this.updateNowPlaying(track);
    }

    onPlaybackStop(): void {
        this.clearScrobbleTimer();
    }

    disconnect(): void {
        this.clearSession();
        this.clearScrobbleTimer();
        this.currentTrack = null;
    }
}
