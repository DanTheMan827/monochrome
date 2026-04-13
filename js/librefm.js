// @ts-check
import { libreFmSettings, lastFMStorage } from './storage.js';

/**
 * Handles Libre.fm authentication, now-playing updates, and track scrobbling
 * via the Libre.fm API (Last.fm-compatible protocol).
 */
export class LibreFmScrobbler {
    /**
     * Creates a new LibreFmScrobbler instance and restores any persisted
     * session from localStorage.
     */
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

    /**
     * Restores a previously saved Libre.fm session from localStorage, populating
     * {@link sessionKey} and {@link username} if a valid session exists.
     */
    loadSession() {
        try {
            const session = localStorage.getItem('librefm-session');
            if (session) {
                const data = JSON.parse(session);
                this.sessionKey = data.key;
                this.username = data.name;
            }
        } catch {
            console.error('Failed to load Libre.fm session');
        }
    }

    /**
     * Persists a Libre.fm session to localStorage and updates the in-memory state.
     *
     * @param {string} sessionKey - The Libre.fm session key returned by the API.
     * @param {string} username - The authenticated Libre.fm username.
     */
    saveSession(sessionKey, username) {
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

    /**
     * Removes the stored Libre.fm session from localStorage and clears the
     * in-memory session state.
     */
    clearSession() {
        this.sessionKey = null;
        this.username = null;
        localStorage.removeItem('librefm-session');
    }

    /**
     * Returns whether the user is currently authenticated with Libre.fm and
     * scrobbling is enabled.
     *
     * @returns {boolean} `true` when a valid session key exists and Libre.fm is enabled.
     */
    isAuthenticated() {
        return !!this.sessionKey && libreFmSettings.isEnabled();
    }

    /**
     * Extracts the primary artist name from a track object, stripping any
     * featured/collaborating artists so only the main artist is scrobbled.
     *
     * @param {object|null} track - The track object to extract artist info from.
     * @returns {string} The primary artist name, or `'Unknown Artist'` as a fallback.
     */
    _getScrobbleArtist(track) {
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

    /**
     * Generates an MD5-based API signature for a set of request parameters
     * as required by the Libre.fm API.
     *
     * @async
     * @param {object} params - The request parameters to sign (excluding `format` and `callback`).
     * @returns {Promise<string>} The hex-encoded MD5 signature string.
     * @throws {Error} If the MD5 library cannot be loaded.
     */
    async generateSignature(params) {
        const filteredParams = { ...params };
        delete filteredParams.format;
        delete filteredParams.callback;

        const sortedKeys = Object.keys(filteredParams).sort();
        const signatureString = sortedKeys.map((key) => `${key}${filteredParams[key]}`).join('') + this.API_SECRET;

        try {
            const { default: md5 } = await import('./md5.js');
            return md5(signatureString);
        } catch {
            console.error('MD5 library not available');
            throw new Error('MD5 library required for Libre.fm');
        }
    }

    /**
     * Sends a signed POST request to the Libre.fm API and returns the parsed
     * JSON response.
     *
     * @async
     * @param {string} method - The API method name (e.g. `'track.scrobble'`).
     * @param {object} [params={}] - Additional parameters to include in the request.
     * @param {boolean} [requiresAuth=false] - Whether to attach the session key.
     * @returns {Promise<object>} The parsed API response data.
     * @throws {Error} If the API returns an error or the network request fails.
     */
    async makeRequest(method, params = {}, requiresAuth = false) {
        const requestParams = /** @type {{ method: any, api_key: string, sk?: string }} */ ({
            method,
            api_key: this.API_KEY,
            ...params,
        });

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

            const data = await response.json();

            if (data.error) {
                throw new Error(data.message || 'Libre.fm API error');
            }

            return data;
        } catch (error) {
            console.error('Libre.fm API request failed:', error);
            throw error;
        }
    }

    /**
     * Requests a one-time authentication token from Libre.fm, stores it
     * locally, and returns the authorization URL the user must visit.
     *
     * @async
     * @returns {Promise<{token: string, url: string}>} An object containing the
     *   temporary token and the Libre.fm authorization URL.
     * @throws {Error} If the token request fails.
     */
    async getAuthUrl() {
        try {
            // First, get a token from Libre.fm
            const data = await this.makeRequest('auth.getToken');
            const token = data.token;

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

    /**
     * Exchanges an authorized token for a persistent Libre.fm session key and
     * saves the session locally.
     *
     * @async
     * @param {string} token - The temporary token previously obtained from {@link getAuthUrl}.
     * @returns {Promise<{success: boolean, username: string}>} Result object with the
     *   authenticated username on success.
     * @throws {Error} If the session exchange fails or no session is returned.
     */
    async completeAuthentication(token) {
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

    /**
     * Notifies Libre.fm of the currently playing track and schedules a scrobble
     * once the configured playback threshold is reached.
     *
     * @async
     * @param {object} track - The track currently being played.
     * @returns {Promise<void>}
     */
    async updateNowPlaying(track) {
        if (!this.isAuthenticated()) return;

        this.currentTrack = track;
        // Only reset hasScrobbled if we're not currently in the middle of scrobbling
        // to prevent race conditions that could cause double scrobbles
        if (!this.isScrobbling) {
            this.hasScrobbled = false;
        }
        this.clearScrobbleTimer();

        try {
            const scrobbleTitle = track.cleanTitle || track.title;
            const params = {
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

            console.log('[Libre.fm] Now playing updated:', scrobbleTitle);

            const scrobblePercentage = lastFMStorage.getScrobblePercentage() / 100;
            this.scrobbleThreshold = Math.min(track.duration * scrobblePercentage, 240);
            this.scheduleScrobble(this.scrobbleThreshold * 1000);
        } catch (error) {
            console.error('[Libre.fm] Failed to update now playing:', error);
        }
    }

    /**
     * Schedules a scrobble of the current track after the given delay,
     * cancelling any previously scheduled scrobble timer first.
     *
     * @param {number} delay - Delay in milliseconds before scrobbling.
     */
    scheduleScrobble(delay) {
        this.clearScrobbleTimer();

        this.scrobbleTimer = setTimeout(async () => {
            await this.scrobbleCurrentTrack();
        }, delay);
    }

    /**
     * Cancels any pending scrobble timer and clears the internal timer reference.
     */
    clearScrobbleTimer() {
        if (this.scrobbleTimer) {
            clearTimeout(this.scrobbleTimer);
            this.scrobbleTimer = null;
        }
    }

    /**
     * Submits the current track as a scrobble to Libre.fm. Does nothing if the
     * track has already been scrobbled, no track is loaded, or the user is not
     * authenticated.
     *
     * @async
     * @returns {Promise<void>}
     */
    async scrobbleCurrentTrack() {
        if (!this.isAuthenticated() || !this.currentTrack || this.hasScrobbled) return;

        this.isScrobbling = true;

        try {
            const timestamp = Math.floor(Date.now() / 1000);
            const scrobbleTitle = this.currentTrack.cleanTitle || this.currentTrack.title;

            const params = {
                artist: this._getScrobbleArtist(this.currentTrack),
                track: scrobbleTitle,
                timestamp: timestamp,
            };

            if (this.currentTrack.album?.title) {
                params.album = this.currentTrack.album.title;
            }

            if (this.currentTrack.duration) {
                params.duration = Math.floor(this.currentTrack.duration);
            }

            if (this.currentTrack.trackNumber) {
                params.trackNumber = this.currentTrack.trackNumber;
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

    /**
     * Marks a track as "loved" on the authenticated Libre.fm account.
     *
     * @async
     * @param {object} track - The track to love. Must have `title` and artist info.
     * @returns {Promise<void>}
     */
    async loveTrack(track) {
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

    /**
     * Called whenever the active track changes; updates the now-playing status
     * on Libre.fm if the user is authenticated.
     *
     * @async
     * @param {object} track - The newly playing track.
     * @returns {Promise<void>}
     */
    async onTrackChange(track) {
        if (!this.isAuthenticated()) return;
        await this.updateNowPlaying(track);
    }

    /**
     * Called when playback stops. Cancels any pending scrobble timer to prevent
     * scrobbling tracks that were not played long enough.
     */
    onPlaybackStop() {
        this.clearScrobbleTimer();
    }

    /**
     * Clears the stored session, cancels any pending scrobble timer, and resets
     * the current track reference. Effectively logs the user out of Libre.fm.
     */
    disconnect() {
        this.clearSession();
        this.clearScrobbleTimer();
        this.currentTrack = null;
    }
}
