//js/lastfm.js
import { lastFMStorage } from './storage.ts';

interface LastFMResponse {
    error?: number;
    message?: string;
    token?: string;
    session?: {
        key: string;
        name: string;
    };
}

export class LastFMScrobbler {
    DEFAULT_API_KEY: string;
    DEFAULT_API_SECRET: string;
    API_URL: string;
    API_KEY: string;
    API_SECRET: string;
    sessionKey: string | null;
    username: string | null;
    currentTrack: TrackData | null;
    scrobbleTimer: ReturnType<typeof setTimeout> | null;
    scrobbleThreshold: number;
    hasScrobbled: boolean;
    isScrobbling: boolean;

    constructor() {
        this.DEFAULT_API_KEY = '85214f5abbc730e78770f27784b9bdf7';
        this.DEFAULT_API_SECRET = '2c2c37fd86739191860db810dd063292';
        this.API_URL = 'https://ws.audioscrobbler.com/2.0/';
        this.API_KEY = this.DEFAULT_API_KEY;
        this.API_SECRET = this.DEFAULT_API_SECRET;

        this.sessionKey = null;
        this.username = null;
        this.currentTrack = null;
        this.scrobbleTimer = null;
        this.scrobbleThreshold = 0;
        this.hasScrobbled = false;
        this.isScrobbling = false;

        this.loadCredentials();
        this.loadSession();
    }

    loadCredentials(): void {
        if (lastFMStorage.useCustomCredentials()) {
            this.API_KEY = lastFMStorage.getCustomApiKey() || this.DEFAULT_API_KEY;
            this.API_SECRET = lastFMStorage.getCustomApiSecret() || this.DEFAULT_API_SECRET;
        } else {
            this.API_KEY = this.DEFAULT_API_KEY;
            this.API_SECRET = this.DEFAULT_API_SECRET;
        }
    }

    reloadCredentials(): void {
        this.loadCredentials();
    }

    loadSession(): void {
        try {
            const session: string | null = localStorage.getItem('lastfm-session');
            if (session) {
                const data: { key: string; name: string } = JSON.parse(session);
                this.sessionKey = data.key;
                this.username = data.name;
            }
        } catch {
            console.error('Failed to load Last.fm session');
        }
    }

    saveSession(sessionKey: string, username: string): void {
        this.sessionKey = sessionKey;
        this.username = username;
        localStorage.setItem(
            'lastfm-session',
            JSON.stringify({
                key: sessionKey,
                name: username,
            })
        );
    }

    clearSession(): void {
        this.sessionKey = null;
        this.username = null;
        localStorage.removeItem('lastfm-session');
    }

    isAuthenticated(): boolean {
        return !!this.sessionKey && lastFMStorage.isEnabled();
    }

    _getScrobbleArtist(track: TrackData | null): string {
        if (!track) return 'Unknown Artist';

        // Get the primary artist name
        let artistName: string = 'Unknown Artist';

        if (track.artist?.name) {
            artistName = track.artist.name;
        } else if (typeof track.artist === 'string') {
            artistName = track.artist;
        } else if (track.artists && track.artists.length > 0) {
            // Only use the FIRST artist (main artist)
            const first: TrackArtist = track.artists[0];
            artistName = typeof first === 'string' ? first : first.name || 'Unknown Artist';
        }

        if (typeof artistName !== 'string') return 'Unknown Artist';

        // Strip featured artists: split on &, feat., ft., featuring, with, etc.
        // Only keep the part BEFORE these indicators
        artistName = artistName
            .split(/\s*[&]\s*|\s+feat\.?\s+|\s+ft\.?\s+|\s+featuring\s+|\s+with\s+|\s+x\s+/i)[0]
            .trim();

        return artistName || 'Unknown Artist';
    }

    async generateSignature(params: Record<string, string | number>): Promise<string> {
        const filteredParams: Record<string, string | number> = { ...params };
        delete filteredParams.format;
        delete filteredParams.callback;

        const sortedKeys: string[] = Object.keys(filteredParams).sort();

        const signatureString: string = sortedKeys.map((key: string) => `${key}${filteredParams[key]}`).join('') + this.API_SECRET;

        console.log('Signature string:', signatureString);

        try {
            const { default: md5 } = await import('./md5.ts');
            return md5(signatureString);
        } catch (e: unknown) {
            console.error('MD5 library not available', e);
            throw new Error('MD5 library required for Last.fm');
        }
    }

    async makeRequest(method: string, params: Record<string, string | number> = {}, requiresAuth: boolean = false): Promise<LastFMResponse> {
        const requestParams: Record<string, string | number> = {
            method,
            api_key: this.API_KEY,
            ...params,
        };

        if (requiresAuth && this.sessionKey) {
            requestParams.sk = this.sessionKey;
        }

        const signature: string = await this.generateSignature(requestParams);

        const formData: URLSearchParams = new URLSearchParams();
        for (const [key, value] of Object.entries(requestParams)) {
            formData.set(key, String(value));
        }
        formData.set('api_sig', signature);
        formData.set('format', 'json');

        try {
            const response: Response = await fetch(this.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData,
            });

            const data: LastFMResponse = await response.json();

            if (data.error) {
                throw new Error(data.message || 'Last.fm API error');
            }

            return data;
        } catch (error: unknown) {
            console.error('Last.fm API request failed:', error);
            throw error;
        }
    }

    async getAuthUrl(): Promise<{ token: string; url: string }> {
        try {
            const data: LastFMResponse = await this.makeRequest('auth.getToken');
            const token: string = data.token as string;

            return {
                token,
                url: `https://www.last.fm/api/auth/?api_key=${this.API_KEY}&token=${token}`,
            };
        } catch (error: unknown) {
            console.error('Failed to get auth URL:', error);
            throw error;
        }
    }

    async completeAuthentication(token: string): Promise<{ success: boolean; username: string }> {
        try {
            const data = await this.makeRequest('auth.getSession', { token });

            if (data.session) {
                this.saveSession(data.session.key, data.session.name);
                return {
                    success: true,
                    username: data.session.name,
                };
            }

            throw new Error('No session returned');
        } catch (error: unknown) {
            console.error('Authentication failed:', error);
            throw error;
        }
    }

    async authenticateWithCredentials(username: string, password: string): Promise<{ success: boolean; username: string }> {
        try {
            const params: Record<string, string> = {
                username: username,
                password: password,
                api_key: this.API_KEY,
                method: 'auth.getMobileSession',
            };

            const signature: string = await this.generateSignature(params);

            const formData: URLSearchParams = new URLSearchParams({
                username: username,
                password: password,
                api_key: this.API_KEY,
                method: 'auth.getMobileSession',
                api_sig: signature,
                format: 'json',
            });

            const response: Response = await fetch(this.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData,
            });

            const data: LastFMResponse = await response.json();

            if (data.error) {
                throw new Error(data.message || 'Last.fm authentication error');
            }

            if (data.session) {
                this.saveSession(data.session.key, data.session.name);
                return {
                    success: true,
                    username: data.session.name,
                };
            }

            throw new Error('No session returned');
        } catch (error: unknown) {
            console.error('Mobile authentication failed:', error);
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
            const scrobbleTitle: string = (track.cleanTitle as string | undefined) || track.title;
            const params: Record<string, string | number> = {
                artist: this._getScrobbleArtist(track),
                track: scrobbleTitle,
            };

            if (track.album?.title) {
                params.album = track.album.title;
            }

            if (track.duration) {
                params.duration = Math.floor(track.duration);
            }

            if (track.trackNumber) {
                params.trackNumber = track.trackNumber;
            }

            await this.makeRequest('track.updateNowPlaying', params, true);

            console.log('Now playing updated:', scrobbleTitle);

            const scrobblePercentage: number = lastFMStorage.getScrobblePercentage() / 100;
            this.scrobbleThreshold = Math.min(track.duration * scrobblePercentage, 240);
            this.scheduleScrobble(this.scrobbleThreshold * 1000);
        } catch (error: unknown) {
            console.error('Failed to update now playing:', error);
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

        const track: TrackData = this.currentTrack;
        this.isScrobbling = true;

        try {
            const timestamp: number = Math.floor(Date.now() / 1000);
            const scrobbleTitle: string = (track.cleanTitle as string | undefined) || track.title;

            const params: Record<string, string | number> = {
                artist: this._getScrobbleArtist(track),
                track: scrobbleTitle,
                timestamp: timestamp,
            };

            if (track.album?.title) {
                params.album = track.album.title;
            }

            if (track.duration) {
                params.duration = Math.floor(track.duration);
            }

            if (track.trackNumber) {
                params.trackNumber = track.trackNumber;
            }

            await this.makeRequest('track.scrobble', params, true);

            this.hasScrobbled = true;
            console.log('Scrobbled:', (track.cleanTitle as string | undefined) || track.title);
        } catch (error: unknown) {
            console.error('Failed to scrobble:', error);
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
            console.log('Loved track on Last.fm:', track.title);
        } catch (error: unknown) {
            console.error('Failed to love track on Last.fm:', error);
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
