// @ts-check
//storage.js

import { SVG_RIGHT_ARROW } from './icons';

export const apiSettings = {
    STORAGE_KEY: 'monochrome-api-instances-v9',
    INSTANCES_URLS: [
        'https://tidal-uptime.jiffy-puffs-1j.workers.dev/',
        'https://tidal-uptime.props-76styles.workers.dev/',
    ],
    defaultInstances: { api: [], streaming: [] },
    userInstances: null,
    instancesLoaded: false,
    _loadPromise: null,

    /**
     * Loads user-defined instances from localStorage.
     * @returns {object} Loaded user instances object.
     */
    _loadUserInstances() {
        if (this.userInstances) return this.userInstances;
        try {
            const stored = localStorage.getItem('monochrome-user-api-instances-v1');
            this.userInstances = stored ? JSON.parse(stored) : { api: [], streaming: [] };
        } catch {
            this.userInstances = { api: [], streaming: [] };
        }
        return this.userInstances;
    },

    /**
     * Saves user-defined instances to localStorage.
     * @returns {void}
     */
    _saveUserInstances() {
        localStorage.setItem('monochrome-user-api-instances-v1', JSON.stringify(this.userInstances));
    },

    /**
     * Loads API instances from GitHub, using a 15-minute cache when available.
     * @async
     * @returns {Promise<object>} Loaded instances object with `api` and `streaming` arrays.
     */
    async loadInstancesFromGitHub() {
        if (this.instancesLoaded) {
            return this.defaultInstances;
        }

        if (this._loadPromise) {
            return this._loadPromise;
        }

        this._loadPromise = (async () => {
            const cachedData = localStorage.getItem(this.STORAGE_KEY);
            if (cachedData) {
                try {
                    const parsed = JSON.parse(cachedData);
                    const now = Date.now();
                    // Check if cached data is less than 15 minutes old
                    if (parsed.timestamp && now - parsed.timestamp < 15 * 60 * 1000) {
                        this.defaultInstances = parsed.data;
                        this.instancesLoaded = true;
                        this._loadPromise = null;
                        return this.defaultInstances;
                    }
                } catch (e) {
                    console.warn('Failed to parse cached instances:', e);
                }
            }

            let data = null;
            let fetchError = null;

            // Prefer first URL, only try others as fallback
            const urls = [...this.INSTANCES_URLS];

            for (const url of urls) {
                try {
                    const response = await fetch(url);
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    data = await response.json();
                    break; // Success, exit loop
                } catch (error) {
                    console.warn(`Failed to fetch from ${url}:`, error);
                    fetchError = error;
                }
            }

            if (!data) {
                console.error('Failed to load instances from all uptime APIs:', fetchError);
                this.defaultInstances = {
                    api: [
                        { url: 'https://hifi.geeked.wtf', version: '2.7' },
                        { url: 'https://eu-central.monochrome.tf', version: '2.7' },
                        { url: 'https://us-west.monochrome.tf', version: '2.7' },
                        { url: 'https://api.monochrome.tf', version: '2.5' },
                        { url: 'https://monochrome-api.samidy.com', version: '2.3' },
                        { url: 'https://maus.qqdl.site', version: '2.6' },
                        { url: 'https://vogel.qqdl.site', version: '2.6' },
                        { url: 'https://katze.qqdl.site', version: '2.6' },
                        { url: 'https://hund.qqdl.site', version: '2.6' },
                        { url: 'https://tidal.kinoplus.online', version: '2.2' },
                        { url: 'https://wolf.qqdl.site', version: '2.2' },
                    ],
                    streaming: [
                        { url: 'https://hifi.geeked.wtf', version: '2.7' },
                        { url: 'https://maus.qqdl.site', version: '2.6' },
                        { url: 'https://vogel.qqdl.site', version: '2.6' },
                        { url: 'https://katze.qqdl.site', version: '2.6' },
                        { url: 'https://hund.qqdl.site', version: '2.6' },
                        { url: 'https://wolf.qqdl.site', version: '2.6' },
                    ],
                };
                this.instancesLoaded = true;
                this._loadPromise = null;
                return this.defaultInstances;
            }

            let groupedInstances = { api: [], streaming: [] };

            const isBlockedInstance = (item) => {
                const url = typeof item === 'string' ? item : item.url;
                return url && /\.squid\.wtf/i.test(url);
            };

            if (data.api && Array.isArray(data.api)) {
                groupedInstances.api = data.api.filter((item) => !isBlockedInstance(item));
            }

            if (data.streaming && Array.isArray(data.streaming)) {
                groupedInstances.streaming = data.streaming.filter((item) => !isBlockedInstance(item));
            } else if (groupedInstances.api.length > 0) {
                groupedInstances.streaming = [...groupedInstances.api];
            }

            this.defaultInstances = groupedInstances;
            this.instancesLoaded = true;

            try {
                localStorage.setItem(
                    this.STORAGE_KEY,
                    JSON.stringify({
                        timestamp: Date.now(),
                        data: groupedInstances,
                    })
                );
            } catch (e) {
                console.warn('Failed to cache instances:', e);
            }

            this._loadPromise = null;
            return groupedInstances;
        })();

        return this._loadPromise;
    },

    /**
     * Returns a combined list of default and user-defined instances for the given type.
     * @async
     * @param {string} type - Instance type, e.g. `'api'` or `'streaming'`.
     * @param {boolean} _sortBySpeed - Reserved for future use.
     * @returns {Promise<Array>} Combined instance list.
     */
    async getInstances(type = 'api', _sortBySpeed = false) {
        let instancesObj;

        instancesObj = await this.loadInstancesFromGitHub();
        const userInst = this._loadUserInstances();

        const defaultUrls = instancesObj[type] || instancesObj.api || [];
        const userUrls = userInst[type] || [];

        const combined = [
            ...userUrls.map((u) => (typeof u === 'string' ? { url: u, isUser: true } : { ...u, isUser: true })),
            ...defaultUrls,
        ];

        if (combined.length === 0) return [];

        return combined;
    },

    /**
     * Adds a user-defined instance URL for the given type.
     * @param {string} type - Instance type, e.g. `'api'` or `'streaming'`.
     * @param {string} url - The instance URL to add.
     * @returns {boolean} True if the instance was added successfully, false if it already exists.
     */
    addUserInstance(type, url) {
        const userInst = this._loadUserInstances();
        if (!userInst[type]) userInst[type] = [];

        if (!userInst[type].some((u) => (typeof u === 'string' ? u === url : u.url === url))) {
            userInst[type].push({ url, isUser: true, version: 'custom' });
            this._saveUserInstances();
            return true;
        }
        return false;
    },

    /**
     * Removes a user-defined instance URL for the given type.
     * @param {string} type - Instance type, e.g. `'api'` or `'streaming'`.
     * @param {string} url - The instance URL to remove.
     * @returns {boolean} True if the instance was removed, false if it was not found.
     */
    removeUserInstance(type, url) {
        const userInst = this._loadUserInstances();
        if (!userInst[type]) return false;

        const initialLength = userInst[type].length;
        userInst[type] = userInst[type].filter((u) => (typeof u === 'string' ? u !== url : u.url !== url));

        if (userInst[type].length !== initialLength) {
            this._saveUserInstances();
            return true;
        }
        return false;
    },

    /**
     * Clears the instance cache and reloads instances from GitHub with priority sorting.
     * @async
     * @returns {Promise<Array>} Refreshed API instance list.
     */
    async refreshInstances() {
        this.instancesLoaded = false;
        this._loadPromise = null;
        localStorage.removeItem(this.STORAGE_KEY);

        const instances = await this.loadInstancesFromGitHub();

        const shuffle = (array) => {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        };

        const prioritySort = (array) => {
            const getUrl = (item) => (typeof item === 'string' ? item : item.url || '');
            const top = [];
            const middle = [];
            const bottom = [];
            for (const item of array) {
                const url = getUrl(item);
                if (url.includes('hifi.geeked.wtf')) top.push(item);
                else if (url.includes('.qqdl.site')) bottom.push(item);
                else middle.push(item);
            }
            return [...top, ...shuffle(middle), ...shuffle(bottom)];
        };

        if (instances.api && instances.api.length) {
            instances.api = prioritySort([...instances.api]);
        }

        if (instances.streaming && instances.streaming.length) {
            instances.streaming = prioritySort([...instances.streaming]);
        }

        this.saveInstances(instances);

        // Return API instances for the UI to render (default view)
        return this.getInstances('api');
    },
    /**
     * Saves instances to localStorage, optionally scoped to a specific type.
     * @param {object|Array} instances - Instances data to save.
     * @param {string} [type] - If provided, saves only instances of this type.
     * @returns {void}
     */
    saveInstances(instances, type) {
        if (type) {
            try {
                this._loadUserInstances();
                const userInst = instances.filter((i) => i.isUser);
                const defaultInst = instances.filter((i) => !i.isUser);

                this.userInstances[type] = userInst;
                this._saveUserInstances();

                const stored = localStorage.getItem(this.STORAGE_KEY);
                let fullObj = stored ? JSON.parse(stored) : { api: [], streaming: [] };

                if (fullObj && fullObj.data) {
                    fullObj.data[type] = defaultInst;
                } else {
                    if (!fullObj) fullObj = { api: [], streaming: [] };
                    fullObj[type] = defaultInst;
                }

                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(fullObj));
            } catch (e) {
                console.error('Failed to save instances:', e);
            }
        } else {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(instances));
        }
    },
};
export const recentActivityManager = {
    STORAGE_KEY: 'monochrome-recent-activity',
    LIMIT: 10,

    /**
     * Retrieves the stored recent activity data from localStorage.
     * @returns {object} Stored recent activity data with `artists`, `albums`, `playlists`, and `mixes` arrays.
     */
    _get() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            const parsed = data ? JSON.parse(data) : { artists: [], albums: [], playlists: [], mixes: [] };
            if (!parsed.playlists) parsed.playlists = [];
            if (!parsed.mixes) parsed.mixes = [];
            return parsed;
        } catch {
            return { artists: [], albums: [], playlists: [], mixes: [] };
        }
    },

    /**
     * Persists recent activity data to localStorage.
     * @param {object} data - Recent activity data to save.
     * @returns {void}
     */
    _save(data) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    },

    /**
     * Gets all recent activity data.
     * @returns {object} All recent activity data.
     */
    getRecents() {
        return this._get();
    },

    /**
     * Adds an item to the specified recent activity list, deduplicating and trimming to the limit.
     * @param {string} type - The activity list key, e.g. `'artists'`, `'albums'`.
     * @param {object} item - The item to add; must have an `id` property.
     * @returns {void}
     */
    _add(type, item) {
        const data = this._get();
        data[type] = data[type].filter((i) => i.id !== item.id);
        data[type].unshift(item);
        data[type] = data[type].slice(0, this.LIMIT);
        this._save(data);
    },

    /**
     * Clears all recent activity data.
     * @returns {void}
     */
    clear() {
        this._save({ artists: [], albums: [], playlists: [], mixes: [] });
    },

    /**
     * Adds an artist to the recent activity list.
     * @param {object} artist - The artist item to add.
     * @returns {void}
     */
    addArtist(artist) {
        this._add('artists', artist);
    },

    /**
     * Adds an album to the recent activity list.
     * @param {object} album - The album item to add.
     * @returns {void}
     */
    addAlbum(album) {
        this._add('albums', album);
    },

    /**
     * Adds a playlist to the recent activity list.
     * @param {object} playlist - The playlist item to add.
     * @returns {void}
     */
    addPlaylist(playlist) {
        this._add('playlists', playlist);
    },

    /**
     * Adds a mix to the recent activity list.
     * @param {object} mix - The mix item to add.
     * @returns {void}
     */
    addMix(mix) {
        this._add('mixes', mix);
    },
};

export const themeManager = {
    STORAGE_KEY: 'monochrome-theme',
    CUSTOM_THEME_KEY: 'monochrome-custom-theme',

    defaultThemes: {
        light: {},
        dark: {},
        monochrome: {},
        ocean: {},
        purple: {},
        forest: {},
        mocha: {},
        macchiato: {},
        frappe: {},
        latte: {},
    },

    /**
     * Gets the current theme name.
     * @returns {string} Current theme name.
     */
    getTheme() {
        try {
            return localStorage.getItem(this.STORAGE_KEY) || 'system';
        } catch {
            return 'system';
        }
    },

    /**
     * Sets and applies the active theme.
     * @param {string} theme - The theme name to activate.
     * @returns {void}
     */
    setTheme(theme) {
        localStorage.setItem(this.STORAGE_KEY, theme);

        if (theme === 'system') {
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.setAttribute('data-theme', isDark ? 'monochrome' : 'white');
        } else {
            document.documentElement.setAttribute('data-theme', theme);
        }

        if (theme !== 'custom') {
            const root = document.documentElement;
            ['background', 'foreground', 'primary', 'secondary', 'muted', 'border', 'highlight'].forEach((key) => {
                root.style.removeProperty(`--${key}`);
            });
        } else {
            const customTheme = this.getCustomTheme();
            if (customTheme) {
                this.applyCustomTheme(customTheme);
            }
        }

        window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme } }));
    },

    /**
     * Gets the saved custom theme colors.
     * @returns {object|null} Custom theme color map, or null if not set.
     */
    getCustomTheme() {
        try {
            const stored = localStorage.getItem(this.CUSTOM_THEME_KEY);
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    },

    /**
     * Saves and applies a custom theme color map.
     * @param {object} colors - Map of CSS variable names to color values.
     * @returns {void}
     */
    setCustomTheme(colors) {
        localStorage.setItem(this.CUSTOM_THEME_KEY, JSON.stringify(colors));
        this.applyCustomTheme(colors);
        this.setTheme('custom');
    },

    /**
     * Applies a custom theme color map to the document root CSS variables.
     * @param {object} colors - Map of CSS variable names to color values.
     * @returns {void}
     */
    applyCustomTheme(colors) {
        const root = document.documentElement;
        for (const [key, value] of Object.entries(colors)) {
            root.style.setProperty(`--${key}`, value);
        }
    },
};

/**
 * Encodes sensitive text using base64 with character-reversal obfuscation.
 * @param {string} text - The plain text to encode.
 * @returns {string} Obfuscated encoded string.
 */
function encodeSensitiveData(text) {
    if (!text) return '';
    const encoded = btoa(text.split('').reverse().join(''));
    return encoded;
}

/**
 * Decodes sensitive data that was encoded with {@link encodeSensitiveData}.
 * @param {string} encoded - The obfuscated encoded string.
 * @returns {string} Decoded plain text, or empty string on failure.
 */
function decodeSensitiveData(encoded) {
    if (!encoded) return '';
    try {
        return atob(encoded).split('').reverse().join('');
    } catch {
        return '';
    }
}

export const lastFMStorage = {
    STORAGE_KEY: 'lastfm-enabled',
    LOVE_ON_LIKE_KEY: 'lastfm-love-on-like',
    SCROBBLE_PERCENTAGE_KEY: 'lastfm-scrobble-percentage',
    CUSTOM_API_KEY: 'lastfm-custom-api-key',
    CUSTOM_API_SECRET: 'lastfm-custom-api-secret',
    USE_CUSTOM_CREDENTIALS_KEY: 'lastfm-use-custom-credentials',

    /**
     * Returns whether Last.fm scrobbling is enabled.
     * @returns {boolean}
     */
    isEnabled() {
        try {
            return localStorage.getItem(this.STORAGE_KEY) === 'true';
        } catch {
            return false;
        }
    },

    /**
     * Sets whether Last.fm scrobbling is enabled.
     * @param {boolean} enabled - True to enable, false to disable.
     * @returns {void}
     */
    setEnabled(enabled) {
        localStorage.setItem(this.STORAGE_KEY, enabled ? 'true' : 'false');
    },

    /**
     * Returns whether tracks should be loved on Last.fm when liked.
     * @returns {boolean}
     */
    shouldLoveOnLike() {
        try {
            return localStorage.getItem(this.LOVE_ON_LIKE_KEY) === 'true';
        } catch {
            return false;
        }
    },

    /**
     * Sets whether tracks should be loved on Last.fm when liked.
     * @param {boolean} enabled - True to enable love-on-like.
     * @returns {void}
     */
    setLoveOnLike(enabled) {
        localStorage.setItem(this.LOVE_ON_LIKE_KEY, enabled ? 'true' : 'false');
    },

    /**
     * Gets the scrobble percentage threshold.
     * @returns {number} Scrobble percentage (1–100).
     */
    getScrobblePercentage() {
        try {
            const value = localStorage.getItem(this.SCROBBLE_PERCENTAGE_KEY);
            return value ? parseInt(value, 10) : 75;
        } catch {
            return 75;
        }
    },

    /**
     * Sets the scrobble percentage threshold.
     * @param {number} percentage - Scrobble threshold (1–100).
     * @returns {void}
     */
    setScrobblePercentage(percentage) {
        const parsed = parseInt(String(percentage), 10);
        const validPercentage = Math.max(1, Math.min(100, isNaN(parsed) ? 75 : parsed));
        localStorage.setItem(this.SCROBBLE_PERCENTAGE_KEY, validPercentage.toString());
    },

    /**
     * Returns whether custom Last.fm API credentials are in use.
     * @returns {boolean}
     */
    useCustomCredentials() {
        try {
            return localStorage.getItem(this.USE_CUSTOM_CREDENTIALS_KEY) === 'true';
        } catch {
            return false;
        }
    },

    /**
     * Sets whether custom Last.fm API credentials should be used.
     * @param {boolean} enabled - True to use custom credentials.
     * @returns {void}
     */
    setUseCustomCredentials(enabled) {
        localStorage.setItem(this.USE_CUSTOM_CREDENTIALS_KEY, enabled ? 'true' : 'false');
    },

    /**
     * Gets the stored custom Last.fm API key.
     * @returns {string} Decoded API key, or empty string if not set.
     */
    getCustomApiKey() {
        try {
            const stored = localStorage.getItem(this.CUSTOM_API_KEY);
            return decodeSensitiveData(stored) || '';
        } catch {
            return '';
        }
    },

    /**
     * Saves the custom Last.fm API key in obfuscated form.
     * @param {string} key - The API key to store.
     * @returns {void}
     */
    setCustomApiKey(key) {
        localStorage.setItem(this.CUSTOM_API_KEY, encodeSensitiveData(key));
    },

    /**
     * Gets the stored custom Last.fm API secret.
     * @returns {string} Decoded API secret, or empty string if not set.
     */
    getCustomApiSecret() {
        try {
            const stored = localStorage.getItem(this.CUSTOM_API_SECRET);
            return decodeSensitiveData(stored) || '';
        } catch {
            return '';
        }
    },

    /**
     * Saves the custom Last.fm API secret in obfuscated form.
     * @param {string} secret - The API secret to store.
     * @returns {void}
     */
    setCustomApiSecret(secret) {
        localStorage.setItem(this.CUSTOM_API_SECRET, encodeSensitiveData(secret));
    },

    /**
     * Removes all stored custom Last.fm API credentials.
     * @returns {void}
     */
    clearCustomCredentials() {
        localStorage.removeItem(this.CUSTOM_API_KEY);
        localStorage.removeItem(this.CUSTOM_API_SECRET);
        localStorage.removeItem(this.USE_CUSTOM_CREDENTIALS_KEY);
    },
};

export const nowPlayingSettings = {
    STORAGE_KEY: 'now-playing-mode',

    /**
     * Gets the current now-playing display mode.
     * @returns {string} Current mode name.
     */
    getMode() {
        try {
            return localStorage.getItem(this.STORAGE_KEY) || 'cover';
        } catch {
            return 'cover';
        }
    },

    /**
     * Sets the now-playing display mode.
     * @param {string} mode - The mode name to set.
     * @returns {void}
     */
    setMode(mode) {
        localStorage.setItem(this.STORAGE_KEY, mode);
    },
};

export const gaplessPlaybackSettings = {
    STORAGE_KEY: 'gapless-playback-enabled',

    /**
     * Returns whether gapless playback is enabled.
     * @returns {boolean}
     */
    isEnabled() {
        try {
            const val = localStorage.getItem(this.STORAGE_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    /**
     * Sets whether gapless playback is enabled.
     * @param {boolean} enabled - True to enable gapless playback.
     * @returns {void}
     */
    setEnabled(enabled) {
        localStorage.setItem(this.STORAGE_KEY, enabled ? 'true' : 'false');
    },
};

export const fullscreenCoverClickSettings = {
    STORAGE_KEY: 'fullscreen-cover-click-action',

    /**
     * Gets the action performed when the fullscreen cover is clicked.
     * @returns {string} The click action name.
     */
    getAction() {
        try {
            return localStorage.getItem(this.STORAGE_KEY) || 'exit';
        } catch {
            return 'exit';
        }
    },

    /**
     * Sets the action performed when the fullscreen cover is clicked.
     * @param {string} action - The action name to set.
     * @returns {void}
     */
    setAction(action) {
        localStorage.setItem(this.STORAGE_KEY, action);
    },
};

export const lyricsSettings = {
    DOWNLOAD_WITH_TRACKS: 'lyrics-download-with-tracks',

    /**
     * Returns whether lyrics should be downloaded along with tracks.
     * @returns {boolean}
     */
    shouldDownloadLyrics() {
        try {
            return localStorage.getItem(this.DOWNLOAD_WITH_TRACKS) === 'true';
        } catch {
            return false;
        }
    },

    /**
     * Sets whether lyrics should be downloaded along with tracks.
     * @param {boolean} enabled - True to enable lyrics download.
     * @returns {void}
     */
    setDownloadLyrics(enabled) {
        localStorage.setItem(this.DOWNLOAD_WITH_TRACKS, enabled ? 'true' : 'false');
    },
};

export const backgroundSettings = {
    STORAGE_KEY: 'album-background-enabled',

    /**
     * Returns whether the album art background is enabled.
     * @returns {boolean}
     */
    isEnabled() {
        try {
            // Default to true if not set
            return localStorage.getItem(this.STORAGE_KEY) !== 'false';
        } catch {
            return true;
        }
    },

    /**
     * Sets whether the album art background is enabled.
     * @param {boolean} enabled - True to enable the background.
     * @returns {void}
     */
    setEnabled(enabled) {
        localStorage.setItem(this.STORAGE_KEY, enabled ? 'true' : 'false');
    },
};

export const dynamicColorSettings = {
    STORAGE_KEY: 'dynamic-color-enabled',

    /**
     * Returns whether dynamic color extraction is enabled.
     * @returns {boolean}
     */
    isEnabled() {
        try {
            // Default to true if not set
            return localStorage.getItem(this.STORAGE_KEY) !== 'false';
        } catch {
            return true;
        }
    },

    /**
     * Sets whether dynamic color extraction is enabled.
     * @param {boolean} enabled - True to enable dynamic color.
     * @returns {void}
     */
    setEnabled(enabled) {
        localStorage.setItem(this.STORAGE_KEY, enabled ? 'true' : 'false');
    },
};

export const fullscreenCoverNoRoundSettings = {
    STORAGE_KEY: 'fullscreen-cover-no-round',

    /**
     * Returns whether the fullscreen cover corners are shown without rounding.
     * @returns {boolean}
     */
    isEnabled() {
        try {
            return localStorage.getItem(this.STORAGE_KEY) !== 'false';
        } catch {
            return true;
        }
    },

    /**
     * Sets whether the fullscreen cover corners are shown without rounding.
     * @param {boolean} enabled - True to disable rounding.
     * @returns {void}
     */
    setEnabled(enabled) {
        localStorage.setItem(this.STORAGE_KEY, enabled ? 'true' : 'false');
    },
};

export const fullscreenCoverVanillaTiltSettings = {
    STORAGE_KEY: 'fullscreen-cover-vanilla-tilt',

    /**
     * Returns whether vanilla-tilt is enabled on the fullscreen cover.
     * @returns {boolean}
     */
    isEnabled() {
        try {
            return localStorage.getItem(this.STORAGE_KEY) !== 'false';
        } catch {
            return true;
        }
    },

    /**
     * Sets whether vanilla-tilt is enabled on the fullscreen cover.
     * @param {boolean} enabled - True to enable vanilla-tilt.
     * @returns {void}
     */
    setEnabled(enabled) {
        localStorage.setItem(this.STORAGE_KEY, enabled ? 'true' : 'false');
    },
};

export const fullscreenCoverTiltDistanceSettings = {
    STORAGE_KEY: 'fullscreen-cover-tilt-distance',

    /**
     * Gets the fullscreen cover tilt distance value.
     * @returns {number} Tilt distance value.
     */
    getValue() {
        try {
            const val = parseInt(localStorage.getItem(this.STORAGE_KEY));
            return val !== null && !isNaN(val) ? val : 10;
        } catch {
            return 10;
        }
    },

    /**
     * Sets the fullscreen cover tilt distance value.
     * @param {number} value - The tilt distance to store.
     * @returns {void}
     */
    setValue(value) {
        localStorage.setItem(this.STORAGE_KEY, String(value));
    },
};

export const fullscreenCoverTiltSpeedSettings = {
    STORAGE_KEY: 'fullscreen-cover-tilt-speed',

    /**
     * Gets the fullscreen cover tilt speed value.
     * @returns {number} Tilt speed value.
     */
    getValue() {
        try {
            const val = parseInt(localStorage.getItem(this.STORAGE_KEY));
            return val !== null && !isNaN(val) ? val : 240;
        } catch {
            return 240;
        }
    },

    /**
     * Sets the fullscreen cover tilt speed value.
     * @param {number} value - The tilt speed to store.
     * @returns {void}
     */
    setValue(value) {
        localStorage.setItem(this.STORAGE_KEY, String(value));
    },
};

export const cardSettings = {
    COMPACT_ARTIST_KEY: 'card-compact-artist',
    COMPACT_ALBUM_KEY: 'card-compact-album',

    /**
     * Returns whether artist cards use the compact layout.
     * @returns {boolean}
     */
    isCompactArtist() {
        try {
            const val = localStorage.getItem(this.COMPACT_ARTIST_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    /**
     * Sets whether artist cards use the compact layout.
     * @param {boolean} enabled - True to enable compact artist cards.
     * @returns {void}
     */
    setCompactArtist(enabled) {
        localStorage.setItem(this.COMPACT_ARTIST_KEY, enabled ? 'true' : 'false');
    },

    /**
     * Returns whether album cards use the compact layout.
     * @returns {boolean}
     */
    isCompactAlbum() {
        try {
            return localStorage.getItem(this.COMPACT_ALBUM_KEY) === 'true';
        } catch {
            return false;
        }
    },

    /**
     * Sets whether album cards use the compact layout.
     * @param {boolean} enabled - True to enable compact album cards.
     * @returns {void}
     */
    setCompactAlbum(enabled) {
        localStorage.setItem(this.COMPACT_ALBUM_KEY, enabled ? 'true' : 'false');
    },
};

export const replayGainSettings = {
    STORAGE_KEY_MODE: 'replay-gain-mode', // 'off', 'track', 'album'
    STORAGE_KEY_PREAMP: 'replay-gain-preamp',
    /**
     * Gets the ReplayGain mode.
     * @returns {string} Current mode, e.g. `'track'`, `'album'`, or `'off'`.
     */
    getMode() {
        return localStorage.getItem(this.STORAGE_KEY_MODE) || 'track';
    },
    /**
     * Sets the ReplayGain mode.
     * @param {string} mode - The mode to set, e.g. `'track'`, `'album'`, or `'off'`.
     * @returns {void}
     */
    setMode(mode) {
        localStorage.setItem(this.STORAGE_KEY_MODE, mode);
    },
    /**
     * Gets the ReplayGain preamp value in dB.
     * @returns {number} Preamp value in dB.
     */
    getPreamp() {
        const val = parseFloat(localStorage.getItem(this.STORAGE_KEY_PREAMP));
        return isNaN(val) ? 3 : val;
    },
    /**
     * Sets the ReplayGain preamp value.
     * @param {number} db - The preamp value in dB.
     * @returns {void}
     */
    setPreamp(db) {
        localStorage.setItem(this.STORAGE_KEY_PREAMP, String(db));
    },
};

export const downloadQualitySettings = {
    STORAGE_KEY: 'download-quality',
    /**
     * Gets the download quality setting.
     * @returns {string} Current download quality value.
     */
    getQuality() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY) || 'HI_RES_LOSSLESS';
            // Migrate legacy value to renamed format
            if (stored === 'MP3_320') {
                this.setQuality('FFMPEG_MP3_320');
                return 'FFMPEG_MP3_320';
            }

            // Migrate legacy atmos value
            if (stored === 'DOLBY_ATMOS') {
                this.setQuality('HI_RES_LOSSLESS');
                preferDolbyAtmosSettings.setEnabled(true);
                return 'HI_RES_LOSSLESS';
            }

            return stored;
        } catch {
            return 'HI_RES_LOSSLESS';
        }
    },
    /**
     * Sets the download quality setting.
     * @param {string} quality - The quality value to store.
     * @returns {void}
     */
    setQuality(quality) {
        localStorage.setItem(this.STORAGE_KEY, quality);
    },
};

export const preferDolbyAtmosSettings = {
    STORAGE_KEY: 'prefer-dolby-atmos',
    /**
     * Returns whether Dolby Atmos is preferred over standard lossless.
     * @returns {boolean}
     */
    isEnabled() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY) || 'false';
            return stored === 'true';
        } catch {
            return false;
        }
    },
    /**
     * Sets whether Dolby Atmos is preferred over standard lossless.
     * @param {boolean} enabled - True to prefer Dolby Atmos.
     * @returns {void}
     */
    setEnabled(enabled) {
        localStorage.setItem(this.STORAGE_KEY, enabled ? 'true' : 'false');
    },
};

export const losslessContainerSettings = {
    STORAGE_KEY: 'lossless-container',
    /**
     * Gets the preferred lossless container format.
     * @returns {string} Container format, e.g. `'flac'`.
     */
    getContainer() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY) || 'flac';
            return stored;
        } catch {
            return 'flac';
        }
    },
    /**
     * Sets the preferred lossless container format.
     * @param {string} container - The container format to store, e.g. `'flac'`.
     * @returns {void}
     */
    setContainer(container) {
        localStorage.setItem(this.STORAGE_KEY, container);
    },
};

export const coverArtSizeSettings = {
    STORAGE_KEY: 'cover-art-size',
    /**
     * Gets the preferred cover art size.
     * @returns {string} Cover art size value.
     */
    getSize() {
        try {
            return localStorage.getItem(this.STORAGE_KEY) || '1280';
        } catch {
            return '1280';
        }
    },
    /**
     * Sets the preferred cover art size.
     * @param {string} size - The size value to store.
     * @returns {void}
     */
    setSize(size) {
        localStorage.setItem(this.STORAGE_KEY, size);
    },
};

export const waveformSettings = {
    STORAGE_KEY: 'waveform-seekbar-enabled',

    /**
     * Returns whether the waveform seekbar is enabled.
     * @returns {boolean}
     */
    isEnabled() {
        try {
            return localStorage.getItem(this.STORAGE_KEY) === 'true';
        } catch {
            return false;
        }
    },

    /**
     * Sets whether the waveform seekbar is enabled.
     * @param {boolean} enabled - True to enable the waveform seekbar.
     * @returns {void}
     */
    setEnabled(enabled) {
        localStorage.setItem(this.STORAGE_KEY, enabled ? 'true' : 'false');
    },
};

export const qualityBadgeSettings = {
    STORAGE_KEY: 'show-quality-badges',

    /**
     * Returns whether quality badges are shown on tracks.
     * @returns {boolean}
     */
    isEnabled() {
        try {
            const val = localStorage.getItem(this.STORAGE_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    /**
     * Sets whether quality badges are shown on tracks.
     * @param {boolean} enabled - True to show quality badges.
     * @returns {void}
     */
    setEnabled(enabled) {
        localStorage.setItem(this.STORAGE_KEY, enabled ? 'true' : 'false');
    },
};

export const trackDateSettings = {
    STORAGE_KEY: 'use-album-release-year',

    /**
     * Returns whether the album release year is used as the track date.
     * @returns {boolean}
     */
    useAlbumYear() {
        try {
            const val = localStorage.getItem(this.STORAGE_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    /**
     * Sets whether the album release year should be used as the track date.
     * @param {boolean} enabled - True to use album year.
     * @returns {void}
     */
    setUseAlbumYear(enabled) {
        localStorage.setItem(this.STORAGE_KEY, enabled ? 'true' : 'false');
    },
};

export const playlistSettings = {
    M3U_KEY: 'playlist-generate-m3u',
    M3U8_KEY: 'playlist-generate-m3u8',
    CUE_KEY: 'playlist-generate-cue',
    NFO_KEY: 'playlist-generate-nfo',
    JSON_KEY: 'playlist-generate-json',
    RELATIVE_PATHS_KEY: 'playlist-relative-paths',
    SEPARATE_DISCS_KEY: 'playlist-separate-discs-in-zip',
    INCLUDE_COVER_KEY: 'playlist-include-cover',

    /**
     * Returns whether M3U playlist files should be generated on download.
     * @returns {boolean}
     */
    shouldGenerateM3U() {
        try {
            const val = localStorage.getItem(this.M3U_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    /**
     * Returns whether M3U8 playlist files should be generated on download.
     * @returns {boolean}
     */
    shouldGenerateM3U8() {
        try {
            return localStorage.getItem(this.M3U8_KEY) === 'true';
        } catch {
            return false;
        }
    },

    /**
     * Returns whether CUE sheet files should be generated on download.
     * @returns {boolean}
     */
    shouldGenerateCUE() {
        try {
            return localStorage.getItem(this.CUE_KEY) === 'true';
        } catch {
            return false;
        }
    },

    /**
     * Returns whether NFO metadata files should be generated on download.
     * @returns {boolean}
     */
    shouldGenerateNFO() {
        try {
            return localStorage.getItem(this.NFO_KEY) === 'true';
        } catch {
            return false;
        }
    },

    /**
     * Returns whether JSON metadata files should be generated on download.
     * @returns {boolean}
     */
    shouldGenerateJSON() {
        try {
            return localStorage.getItem(this.JSON_KEY) === 'true';
        } catch {
            return false;
        }
    },

    /**
     * Returns whether relative paths should be used in generated playlist files.
     * @returns {boolean}
     */
    shouldUseRelativePaths() {
        try {
            const val = localStorage.getItem(this.RELATIVE_PATHS_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    /**
     * Returns whether multi-disc albums should have their discs separated into subfolders in the zip.
     * @returns {boolean}
     */
    shouldSeparateDiscsInZip() {
        try {
            const val = localStorage.getItem(this.SEPARATE_DISCS_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    /**
     * Sets whether M3U playlist files should be generated on download.
     * @param {boolean} enabled - True to generate M3U files.
     * @returns {void}
     */
    setGenerateM3U(enabled) {
        localStorage.setItem(this.M3U_KEY, enabled ? 'true' : 'false');
    },

    /**
     * Sets whether M3U8 playlist files should be generated on download.
     * @param {boolean} enabled - True to generate M3U8 files.
     * @returns {void}
     */
    setGenerateM3U8(enabled) {
        localStorage.setItem(this.M3U8_KEY, enabled ? 'true' : 'false');
    },

    /**
     * Sets whether CUE sheet files should be generated on download.
     * @param {boolean} enabled - True to generate CUE files.
     * @returns {void}
     */
    setGenerateCUE(enabled) {
        localStorage.setItem(this.CUE_KEY, enabled ? 'true' : 'false');
    },

    /**
     * Sets whether NFO metadata files should be generated on download.
     * @param {boolean} enabled - True to generate NFO files.
     * @returns {void}
     */
    setGenerateNFO(enabled) {
        localStorage.setItem(this.NFO_KEY, enabled ? 'true' : 'false');
    },

    /**
     * Sets whether JSON metadata files should be generated on download.
     * @param {boolean} enabled - True to generate JSON files.
     * @returns {void}
     */
    setGenerateJSON(enabled) {
        localStorage.setItem(this.JSON_KEY, enabled ? 'true' : 'false');
    },

    /**
     * Sets whether relative paths should be used in generated playlist files.
     * @param {boolean} enabled - True to use relative paths.
     * @returns {void}
     */
    setUseRelativePaths(enabled) {
        localStorage.setItem(this.RELATIVE_PATHS_KEY, enabled ? 'true' : 'false');
    },

    /**
     * Sets whether multi-disc albums should have their discs separated into subfolders in the zip.
     * @param {boolean} enabled - True to separate discs in zip.
     * @returns {void}
     */
    setSeparateDiscsInZip(enabled) {
        localStorage.setItem(this.SEPARATE_DISCS_KEY, enabled ? 'true' : 'false');
    },

    /**
     * Returns whether cover art should be included in the download zip.
     * @returns {boolean}
     */
    shouldIncludeCover() {
        try {
            const val = localStorage.getItem(this.INCLUDE_COVER_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    /**
     * Sets whether cover art should be included in the download zip.
     * @param {boolean} enabled - True to include cover art.
     * @returns {void}
     */
    setIncludeCover(enabled) {
        localStorage.setItem(this.INCLUDE_COVER_KEY, enabled ? 'true' : 'false');
    },
};

export const visualizerSettings = {
    SENSITIVITY_KEY: 'visualizer-sensitivity',
    SMART_INTENSITY_KEY: 'visualizer-smart-intensity',
    ENABLED_KEY: 'visualizer-enabled',
    MODE_KEY: 'visualizer-mode', // 'solid' or 'blended'
    PRESET_KEY: 'visualizer-preset',
    BUTTERCHURN_CYCLE_KEY: 'butterchurn-cycle-duration',
    DIM_AMOUNT_KEY: 'visualizer-dim-amount',

    /**
     * Gets the active visualizer preset name.
     * @returns {string} Current preset name.
     */
    getPreset() {
        try {
            return localStorage.getItem(this.PRESET_KEY) || 'kawarp';
        } catch {
            return 'kawarp';
        }
    },

    /**
     * Sets the active visualizer preset name.
     * @param {string} preset - The preset name to store.
     * @returns {void}
     */
    setPreset(preset) {
        localStorage.setItem(this.PRESET_KEY, preset);
    },

    /**
     * Returns whether the visualizer is enabled.
     * @returns {boolean}
     */
    isEnabled() {
        try {
            const val = localStorage.getItem(this.ENABLED_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    /**
     * Sets whether the visualizer is enabled.
     * @param {boolean} enabled - True to enable the visualizer.
     * @returns {void}
     */
    setEnabled(enabled) {
        localStorage.setItem(this.ENABLED_KEY, String(enabled));
    },

    /**
     * Gets the visualizer color mode.
     * @returns {string} Current mode, e.g. `'solid'` or `'blended'`.
     */
    getMode() {
        try {
            return localStorage.getItem(this.MODE_KEY) || 'solid';
        } catch {
            return 'solid';
        }
    },

    /**
     * Sets the visualizer color mode.
     * @param {string} mode - The mode to set, e.g. `'solid'` or `'blended'`.
     * @returns {void}
     */
    setMode(mode) {
        localStorage.setItem(this.MODE_KEY, mode);
    },

    /**
     * Gets the visualizer sensitivity multiplier.
     * @returns {number} Sensitivity value.
     */
    getSensitivity() {
        try {
            const val = localStorage.getItem(this.SENSITIVITY_KEY);
            if (val === null) return 1.0;
            return parseFloat(val);
        } catch {
            return 1.0;
        }
    },

    /**
     * Sets the visualizer sensitivity multiplier.
     * @param {number} value - The sensitivity value to store.
     * @returns {void}
     */
    setSensitivity(value) {
        localStorage.setItem(this.SENSITIVITY_KEY, String(value));
    },

    /**
     * Returns whether smart intensity adjustment is enabled.
     * @returns {boolean}
     */
    isSmartIntensityEnabled() {
        try {
            const val = localStorage.getItem(this.SMART_INTENSITY_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    /**
     * Sets whether smart intensity adjustment is enabled.
     * @param {boolean} enabled - True to enable smart intensity.
     * @returns {void}
     */
    setSmartIntensity(enabled) {
        localStorage.setItem(this.SMART_INTENSITY_KEY, String(enabled));
    },

    /**
     * Gets the visualizer dim amount during playback.
     * @returns {number} Dim amount value.
     */
    getDimAmount() {
        try {
            const val = localStorage.getItem(this.DIM_AMOUNT_KEY);
            if (val === null) return 1.0;
            return parseFloat(val);
        } catch {
            return 1.0;
        }
    },

    /**
     * Sets the visualizer dim amount during playback.
     * @param {number} value - The dim amount to store.
     * @returns {void}
     */
    setDimAmount(value) {
        localStorage.setItem(this.DIM_AMOUNT_KEY, String(value));
    },

    /**
     * Gets the Butterchurn preset auto-cycle duration in seconds.
     * @returns {number} Cycle duration in seconds.
     */
    // Butterchurn preset cycle duration in seconds
    getButterchurnCycleDuration() {
        try {
            const val = localStorage.getItem(this.BUTTERCHURN_CYCLE_KEY);
            return val ? parseInt(val, 10) : 30;
        } catch {
            return 30;
        }
    },

    /**
     * Sets the Butterchurn preset auto-cycle duration.
     * @param {number} seconds - Duration in seconds between preset changes.
     * @returns {void}
     */
    setButterchurnCycleDuration(seconds) {
        localStorage.setItem(this.BUTTERCHURN_CYCLE_KEY, seconds.toString());
    },

    /**
     * Returns whether Butterchurn preset auto-cycling is enabled.
     * @returns {boolean}
     */
    // Butterchurn cycle enabled
    isButterchurnCycleEnabled() {
        try {
            return localStorage.getItem('butterchurn-cycle-enabled') !== 'false';
        } catch {
            return true;
        }
    },

    /**
     * Sets whether Butterchurn preset auto-cycling is enabled.
     * @param {boolean} enabled - True to enable auto-cycling.
     * @returns {void}
     */
    setButterchurnCycleEnabled(enabled) {
        localStorage.setItem('butterchurn-cycle-enabled', String(enabled));
    },

    /**
     * Returns whether Butterchurn should randomize preset order during cycling.
     * @returns {boolean}
     */
    // Butterchurn randomize preset
    isButterchurnRandomizeEnabled() {
        try {
            return localStorage.getItem('butterchurn-randomize-enabled') !== 'false';
        } catch {
            return true;
        }
    },

    /**
     * Sets whether Butterchurn should randomize preset order during cycling.
     * @param {boolean} enabled - True to randomize preset order.
     * @returns {void}
     */
    setButterchurnRandomizeEnabled(enabled) {
        localStorage.setItem('butterchurn-randomize-enabled', String(enabled));
    },
};

export const equalizerSettings = {
    ENABLED_KEY: 'equalizer-enabled',
    GAINS_KEY: 'equalizer-gains',
    BAND_TYPES_KEY: 'equalizer-band-types',
    BAND_QS_KEY: 'equalizer-band-qs',
    BAND_CHANNELS_KEY: 'equalizer-band-channels',
    PRESET_KEY: 'equalizer-preset',
    CUSTOM_PRESETS_KEY: 'equalizer-custom-presets',
    BAND_COUNT_KEY: 'equalizer-band-count',
    RANGE_MIN_KEY: 'equalizer-range-min',
    RANGE_MAX_KEY: 'equalizer-range-max',
    FREQ_MIN_KEY: 'equalizer-freq-min',
    FREQ_MAX_KEY: 'equalizer-freq-max',
    PREAMP_KEY: 'equalizer-preamp',
    CUSTOM_FREQUENCIES_KEY: 'equalizer-custom-frequencies',
    DEFAULT_BAND_COUNT: 16,
    MIN_BANDS: 3,
    MAX_BANDS: 32,
    DEFAULT_RANGE_MIN: -30,
    DEFAULT_RANGE_MAX: 30,
    ABSOLUTE_MIN: -60,
    ABSOLUTE_MAX: 60,
    DEFAULT_FREQ_MIN: 20,
    DEFAULT_FREQ_MAX: 20000,
    ABSOLUTE_FREQ_MIN: 10,
    ABSOLUTE_FREQ_MAX: 96000,
    DEFAULT_PREAMP: 0,
    PREAMP_MIN: -20,
    PREAMP_MAX: 20,

    /**
     * Returns whether the equalizer is enabled.
     * @returns {boolean}
     */
    isEnabled() {
        try {
            // Disabled by default
            return localStorage.getItem(this.ENABLED_KEY) === 'true';
        } catch {
            return false;
        }
    },

    /**
     * Sets whether the equalizer is enabled.
     * @param {boolean} enabled - True to enable the equalizer.
     * @returns {void}
     */
    setEnabled(enabled) {
        localStorage.setItem(this.ENABLED_KEY, enabled ? 'true' : 'false');
    },

    /**
     * Gets the current equalizer band count.
     * @returns {number} Number of EQ bands.
     */
    getBandCount() {
        try {
            const stored = localStorage.getItem(this.BAND_COUNT_KEY);
            if (stored) {
                const count = parseInt(stored, 10);
                if (!isNaN(count) && count >= this.MIN_BANDS && count <= this.MAX_BANDS) {
                    return count;
                }
            }
        } catch {
            /* ignore */
        }
        return this.DEFAULT_BAND_COUNT;
    },

    /**
     * Sets the equalizer band count.
     * @param {number} count - The number of EQ bands (clamped to MIN_BANDS–MAX_BANDS).
     * @returns {void}
     */
    setBandCount(count) {
        const parsedCount = parseInt(String(count), 10);
        const validCount = Math.max(
            this.MIN_BANDS,
            Math.min(this.MAX_BANDS, isNaN(parsedCount) ? this.DEFAULT_BAND_COUNT : parsedCount)
        );
        localStorage.setItem(this.BAND_COUNT_KEY, validCount.toString());
    },

    /**
     * Gets the minimum dB value for the EQ gain range.
     * @returns {number} Minimum range value in dB.
     */
    getRangeMin() {
        try {
            const stored = localStorage.getItem(this.RANGE_MIN_KEY);
            if (stored) {
                const val = parseInt(stored, 10);
                if (!isNaN(val) && val >= this.ABSOLUTE_MIN && val < 0) {
                    return val;
                }
            }
        } catch {
            /* ignore */
        }
        return this.DEFAULT_RANGE_MIN;
    },

    /**
     * Sets the minimum dB value for the EQ gain range.
     * @param {number} value - The minimum range value in dB.
     * @returns {boolean} True if the value was valid and saved.
     */
    setRangeMin(value) {
        const val = parseInt(String(value), 10);
        if (!isNaN(val) && val >= this.ABSOLUTE_MIN && val < 0) {
            localStorage.setItem(this.RANGE_MIN_KEY, val.toString());
            return true;
        }
        return false;
    },

    /**
     * Gets the maximum dB value for the EQ gain range.
     * @returns {number} Maximum range value in dB.
     */
    getRangeMax() {
        try {
            const stored = localStorage.getItem(this.RANGE_MAX_KEY);
            if (stored) {
                const val = parseInt(stored, 10);
                if (!isNaN(val) && val > 0 && val <= this.ABSOLUTE_MAX) {
                    return val;
                }
            }
        } catch {
            /* ignore */
        }
        return this.DEFAULT_RANGE_MAX;
    },

    /**
     * Sets the maximum dB value for the EQ gain range.
     * @param {number} value - The maximum range value in dB.
     * @returns {boolean} True if the value was valid and saved.
     */
    setRangeMax(value) {
        const val = parseInt(String(value), 10);
        if (!isNaN(val) && val > 0 && val <= this.ABSOLUTE_MAX) {
            localStorage.setItem(this.RANGE_MAX_KEY, val.toString());
            return true;
        }
        return false;
    },

    /**
     * Gets the EQ gain range as an object with min and max.
     * @returns {{ min: number, max: number }} Current gain range.
     */
    getRange() {
        return {
            min: this.getRangeMin(),
            max: this.getRangeMax(),
        };
    },

    /**
     * Sets both the min and max dB values for the EQ gain range.
     * @param {number} min - The minimum range value in dB.
     * @param {number} max - The maximum range value in dB.
     * @returns {boolean} True if both values were valid and saved.
     */
    setRange(min, max) {
        const validMin = this.setRangeMin(min);
        const validMax = this.setRangeMax(max);
        return validMin && validMax;
    },

    /**
     * Gets the minimum displayed frequency (Hz) for the EQ.
     * @returns {number} Minimum frequency in Hz.
     */
    getFreqMin() {
        try {
            const stored = localStorage.getItem(this.FREQ_MIN_KEY);
            if (stored) {
                const val = parseInt(stored, 10);
                if (!isNaN(val) && val >= this.ABSOLUTE_FREQ_MIN && val < this.ABSOLUTE_FREQ_MAX) {
                    return val;
                }
            }
        } catch {
            /* ignore */
        }
        return this.DEFAULT_FREQ_MIN;
    },

    /**
     * Sets the minimum displayed frequency (Hz) for the EQ.
     * @param {number} value - The minimum frequency in Hz.
     * @returns {boolean} True if the value was valid and saved.
     */
    setFreqMin(value) {
        const val = parseInt(String(value), 10);
        // Get effective max from storage without recursive call
        let effectiveMax = this.DEFAULT_FREQ_MAX;
        try {
            const storedMax = localStorage.getItem(this.FREQ_MAX_KEY);
            if (storedMax) {
                const parsedMax = parseInt(storedMax, 10);
                if (!isNaN(parsedMax) && parsedMax > this.ABSOLUTE_FREQ_MIN && parsedMax <= this.ABSOLUTE_FREQ_MAX) {
                    effectiveMax = parsedMax;
                }
            }
        } catch {
            /* ignore and use default max */
        }
        if (!isNaN(val) && val >= this.ABSOLUTE_FREQ_MIN && val < effectiveMax) {
            localStorage.setItem(this.FREQ_MIN_KEY, val.toString());
            return true;
        }
        return false;
    },

    /**
     * Gets the maximum displayed frequency (Hz) for the EQ.
     * @returns {number} Maximum frequency in Hz.
     */
    getFreqMax() {
        try {
            const storedMax = localStorage.getItem(this.FREQ_MAX_KEY);
            if (storedMax) {
                const maxVal = parseInt(storedMax, 10);
                if (!isNaN(maxVal) && maxVal > this.ABSOLUTE_FREQ_MIN && maxVal <= this.ABSOLUTE_FREQ_MAX) {
                    // Get stored min without recursive call
                    try {
                        const storedMin = localStorage.getItem(this.FREQ_MIN_KEY);
                        if (storedMin) {
                            const minVal = parseInt(storedMin, 10);
                            if (!isNaN(minVal) && maxVal <= minVal) {
                                return this.DEFAULT_FREQ_MAX;
                            }
                        }
                    } catch {
                        /* ignore */
                    }
                    return maxVal;
                }
            }
        } catch {
            /* ignore */
        }
        return this.DEFAULT_FREQ_MAX;
    },

    /**
     * Sets the maximum displayed frequency (Hz) for the EQ.
     * @param {number} value - The maximum frequency in Hz.
     * @returns {boolean} True if the value was valid and saved.
     */
    setFreqMax(value) {
        const maxVal = parseInt(String(value), 10);
        if (!isNaN(maxVal) && maxVal > this.ABSOLUTE_FREQ_MIN && maxVal <= this.ABSOLUTE_FREQ_MAX) {
            // Check against stored min without recursive call
            try {
                const storedMin = localStorage.getItem(this.FREQ_MIN_KEY);
                if (storedMin) {
                    const minVal = parseInt(storedMin, 10);
                    if (!isNaN(minVal) && maxVal <= minVal) {
                        return false;
                    }
                }
            } catch {
                /* ignore */
            }
            localStorage.setItem(this.FREQ_MAX_KEY, maxVal.toString());
            return true;
        }
        return false;
    },

    /**
     * Gets the EQ frequency range as an object with min and max.
     * @returns {{ min: number, max: number }} Current frequency range in Hz.
     */
    getFreqRange() {
        return {
            min: this.getFreqMin(),
            max: this.getFreqMax(),
        };
    },

    /**
     * Sets both the min and max frequencies (Hz) for the EQ display range.
     * @param {number} min - The minimum frequency in Hz.
     * @param {number} max - The maximum frequency in Hz.
     * @returns {boolean} True if both values were valid and saved.
     */
    setFreqRange(min, max) {
        const validMax = this.setFreqMax(max);
        const validMin = this.setFreqMin(min);
        return validMin && validMax;
    },

    /**
     * Gets the EQ preamp value in dB.
     * @returns {number} Preamp value in dB.
     */
    getPreamp() {
        try {
            const stored = localStorage.getItem(this.PREAMP_KEY);
            if (stored) {
                const val = parseFloat(stored);
                if (!isNaN(val) && val >= this.PREAMP_MIN && val <= this.PREAMP_MAX) {
                    return val;
                }
            }
        } catch {
            /* ignore */
        }
        return this.DEFAULT_PREAMP;
    },

    /**
     * Sets the EQ preamp value in dB.
     * @param {number} value - The preamp value in dB.
     * @returns {boolean} True if the value was valid and saved.
     */
    setPreamp(value) {
        const val = value;
        if (!isNaN(val) && val >= this.PREAMP_MIN && val <= this.PREAMP_MAX) {
            localStorage.setItem(this.PREAMP_KEY, val.toString());
            return true;
        }
        return false;
    },

    /**
     * Gets the EQ band gains, interpolating if the stored count differs from the requested count.
     * @param {number} bandCount - The target number of bands.
     * @returns {number[]} Array of gain values in dB.
     */
    getGains(bandCount) {
        const count = bandCount || this.getBandCount();
        try {
            const stored = localStorage.getItem(this.GAINS_KEY);
            if (stored) {
                const gains = JSON.parse(stored);
                if (Array.isArray(gains)) {
                    // If stored gains match current band count, return them
                    if (gains.length === count) {
                        return gains;
                    }
                    // If different band count, try to interpolate or return flat
                    if (gains.length > 0) {
                        return this.interpolateGains(gains, count);
                    }
                }
            }
        } catch {
            /* ignore */
        }
        // Return flat EQ (all zeros) by default
        return new Array(count).fill(0);
    },

    /**
     * Saves the EQ band gains array.
     * @param {number[]} gains - Array of gain values in dB.
     * @returns {void}
     */
    setGains(gains) {
        try {
            if (Array.isArray(gains) && gains.length >= this.MIN_BANDS && gains.length <= this.MAX_BANDS) {
                localStorage.setItem(this.GAINS_KEY, JSON.stringify(gains));
            }
        } catch (e) {
            console.warn('[EQ] Failed to save gains:', e);
        }
    },

    /**
     * Gets the custom center frequencies for EQ bands if they match the given band count.
     * @param {number} bandCount - The target number of bands.
     * @returns {number[]|null} Array of frequencies in Hz, or null if not set or mismatched.
     */
    getCustomFrequencies(bandCount) {
        const count = bandCount || this.getBandCount();
        try {
            const stored = localStorage.getItem(this.CUSTOM_FREQUENCIES_KEY);
            if (stored) {
                const freqs = JSON.parse(stored);
                if (Array.isArray(freqs) && freqs.length === count) {
                    return freqs;
                }
            }
        } catch {
            /* ignore */
        }
        return null;
    },

    /**
     * Saves custom center frequencies for EQ bands.
     * @param {number[]} frequencies - Array of frequencies in Hz.
     * @returns {void}
     */
    setCustomFrequencies(frequencies) {
        try {
            if (
                Array.isArray(frequencies) &&
                frequencies.length >= this.MIN_BANDS &&
                frequencies.length <= this.MAX_BANDS
            ) {
                localStorage.setItem(this.CUSTOM_FREQUENCIES_KEY, JSON.stringify(frequencies));
            }
        } catch (e) {
            console.warn('[EQ] Failed to save custom frequencies:', e);
        }
    },

    /**
     * Clears any stored custom EQ center frequencies.
     * @returns {void}
     */
    clearCustomFrequencies() {
        try {
            localStorage.removeItem(this.CUSTOM_FREQUENCIES_KEY);
        } catch {
            /* ignore */
        }
    },

    /**
     * Gets the EQ band filter types if they match the given band count.
     * @param {number} bandCount - The target number of bands.
     * @returns {string[]} Array of filter type strings (e.g. `'peaking'`).
     */
    getBandTypes(bandCount) {
        const count = bandCount || this.getBandCount();
        try {
            const stored = localStorage.getItem(this.BAND_TYPES_KEY);
            if (stored) {
                const types = JSON.parse(stored);
                if (Array.isArray(types) && types.length === count) {
                    return types;
                }
            }
        } catch {
            /* ignore */
        }
        return new Array(count).fill('peaking');
    },

    /**
     * Saves the EQ band filter types array.
     * @param {string[]} types - Array of filter type strings.
     * @returns {void}
     */
    setBandTypes(types) {
        try {
            if (Array.isArray(types) && types.length >= this.MIN_BANDS && types.length <= this.MAX_BANDS) {
                localStorage.setItem(this.BAND_TYPES_KEY, JSON.stringify(types));
            }
        } catch (e) {
            console.warn('[EQ] Failed to save band types:', e);
        }
    },

    /**
     * Gets the EQ band Q-factor values, interpolating if the stored count differs.
     * @param {number} bandCount - The target number of bands.
     * @returns {number[]|null} Array of Q values, or null if not stored.
     */
    getBandQs(bandCount) {
        const count = bandCount || this.getBandCount();
        try {
            const stored = localStorage.getItem(this.BAND_QS_KEY);
            if (stored) {
                const qs = JSON.parse(stored);
                if (Array.isArray(qs) && qs.length === count) {
                    return qs;
                }
                // Interpolate stored Qs to match requested band count instead of discarding
                if (Array.isArray(qs) && qs.length >= this.MIN_BANDS) {
                    return this.interpolateGains(qs, count);
                }
            }
        } catch {
            /* ignore */
        }
        return null;
    },

    /**
     * Saves the EQ band Q-factor values array.
     * @param {number[]} qs - Array of Q-factor values.
     * @returns {void}
     */
    setBandQs(qs) {
        try {
            if (Array.isArray(qs) && qs.length >= this.MIN_BANDS && qs.length <= this.MAX_BANDS) {
                localStorage.setItem(this.BAND_QS_KEY, JSON.stringify(qs));
            }
        } catch (e) {
            console.warn('[EQ] Failed to save band Qs:', e);
        }
    },

    getBandChannels(bandCount) {
        const count = bandCount || this.getBandCount();
        try {
            const stored = localStorage.getItem(this.BAND_CHANNELS_KEY);
            if (stored) {
                const channels = JSON.parse(stored);
                if (Array.isArray(channels) && channels.length === count) {
                    return channels;
                }
            }
        } catch {
            /* ignore */
        }
        return new Array(count).fill('stereo');
    },

    setBandChannels(channels) {
        try {
            if (Array.isArray(channels) && channels.length >= this.MIN_BANDS && channels.length <= this.MAX_BANDS) {
                localStorage.setItem(this.BAND_CHANNELS_KEY, JSON.stringify(channels));
            }
        } catch (e) {
            console.warn('[EQ] Failed to save band channels:', e);
        }
    },

    /**
     * Interpolates a gains array to match a target band count using linear interpolation.
     * @param {number[]} sourceGains - The source array of gain values.
     * @param {number} targetCount - The desired number of output bands.
     * @returns {number[]} Interpolated gains array of length targetCount.
     */
    interpolateGains(sourceGains, targetCount) {
        if (sourceGains.length === targetCount) {
            return [...sourceGains];
        }

        const result = [];
        for (let i = 0; i < targetCount; i++) {
            // Map target index to source index
            const sourceIndex = (i / (targetCount - 1)) * (sourceGains.length - 1);
            const indexLow = Math.floor(sourceIndex);
            const indexHigh = Math.min(Math.ceil(sourceIndex), sourceGains.length - 1);
            const fraction = sourceIndex - indexLow;

            // Linear interpolation
            const lowValue = sourceGains[indexLow] || 0;
            const highValue = sourceGains[indexHigh] || 0;
            const interpolated = lowValue + (highValue - lowValue) * fraction;
            result.push(Math.round(interpolated * 10) / 10);
        }
        return result;
    },

    /**
     * Gets the active equalizer preset name.
     * @returns {string} Current preset name.
     */
    getPreset() {
        try {
            return localStorage.getItem(this.PRESET_KEY) || 'flat';
        } catch {
            return 'flat';
        }
    },

    /**
     * Sets the active equalizer preset name.
     * @param {string} preset - The preset name to store.
     * @returns {void}
     */
    setPreset(preset) {
        localStorage.setItem(this.PRESET_KEY, preset);
    },

    /**
     * Gets all saved custom EQ presets.
     * @returns {Object} Map of preset IDs to preset objects.
     */
    // Custom Preset Methods
    getCustomPresets() {
        try {
            const stored = localStorage.getItem(this.CUSTOM_PRESETS_KEY);
            if (stored) {
                const presets = JSON.parse(stored);
                if (typeof presets === 'object' && presets !== null) {
                    return presets;
                }
            }
        } catch {
            /* ignore */
        }
        return {};
    },

    /**
     * Saves a new custom EQ preset with the given name and gains.
     * @param {string} name - The display name for the preset.
     * @param {number[]} gains - Array of gain values in dB.
     * @returns {string|false} The generated preset ID, or false on failure.
     */
    saveCustomPreset(name, gains) {
        try {
            if (!name || !Array.isArray(gains) || gains.length < this.MIN_BANDS || gains.length > this.MAX_BANDS) {
                console.warn('[EQ] Invalid preset data');
                return false;
            }

            // Sanitize name - remove special characters and limit length
            const sanitizedName = name
                .trim()
                .substring(0, 50)
                .replace(/[^\w\s-]/g, '');
            if (!sanitizedName) {
                console.warn('[EQ] Invalid preset name');
                return false;
            }

            const presets = this.getCustomPresets();
            const presetId = 'custom_' + Date.now();

            presets[presetId] = {
                name: sanitizedName,
                gains: gains.map((g) => Math.round(g * 10) / 10), // Round to 1 decimal place
                bandCount: gains.length,
                createdAt: Date.now(),
            };

            localStorage.setItem(this.CUSTOM_PRESETS_KEY, JSON.stringify(presets));
            return presetId;
        } catch (e) {
            console.warn('[EQ] Failed to save custom preset:', e);
            return false;
        }
    },

    /**
     * Deletes a custom EQ preset by its ID.
     * @param {string} presetId - The ID of the preset to delete.
     * @returns {boolean} True if deleted, false if not found.
     */
    deleteCustomPreset(presetId) {
        try {
            const presets = this.getCustomPresets();
            if (presets[presetId]) {
                delete presets[presetId];
                localStorage.setItem(this.CUSTOM_PRESETS_KEY, JSON.stringify(presets));
                return true;
            }
            return false;
        } catch (e) {
            console.warn('[EQ] Failed to delete custom preset:', e);
            return false;
        }
    },

    /**
     * Updates an existing custom EQ preset's name and/or gains.
     * @param {string} presetId - The ID of the preset to update.
     * @param {string} name - The new display name.
     * @param {number[]} gains - The new array of gain values in dB.
     * @returns {boolean} True if updated successfully, false if preset not found.
     */
    updateCustomPreset(presetId, name, gains) {
        try {
            const presets = this.getCustomPresets();
            if (!presets[presetId]) {
                return false;
            }

            if (name !== undefined) {
                const sanitizedName = name
                    .trim()
                    .substring(0, 50)
                    .replace(/[^\w\s-]/g, '');
                if (sanitizedName) {
                    presets[presetId].name = sanitizedName;
                }
            }

            if (Array.isArray(gains) && gains.length === this.DEFAULT_BAND_COUNT) {
                presets[presetId].gains = gains.map((g) => Math.round(g * 10) / 10);
                presets[presetId].updatedAt = Date.now();
            }

            localStorage.setItem(this.CUSTOM_PRESETS_KEY, JSON.stringify(presets));
            return true;
        } catch (e) {
            console.warn('[EQ] Failed to update custom preset:', e);
            return false;
        }
    },

    // ========================================
    // AutoEQ Profile Storage
    // ========================================
    AUTOEQ_PROFILES_KEY: 'autoeq-saved-profiles',
    AUTOEQ_ACTIVE_PROFILE_KEY: 'autoeq-active-profile',
    AUTOEQ_SAMPLE_RATE_KEY: 'autoeq-sample-rate',

    /**
     * Gets all saved AutoEQ headphone profiles.
     * @returns {Object} Map of profile IDs to profile objects.
     */
    getAutoEQProfiles() {
        try {
            const stored = localStorage.getItem(this.AUTOEQ_PROFILES_KEY);
            return stored ? JSON.parse(stored) : {};
        } catch {
            return {};
        }
    },

    /**
     * Saves an AutoEQ headphone profile, generating an ID if not provided.
     * @param {object} profile - The profile object to save.
     * @returns {string|false} The profile ID, or false on failure.
     */
    saveAutoEQProfile(profile) {
        try {
            const profiles = this.getAutoEQProfiles();
            const id = profile.id || 'autoeq_' + Date.now();
            const profileCopy = { ...profile, id };
            profiles[id] = profileCopy;
            localStorage.setItem(this.AUTOEQ_PROFILES_KEY, JSON.stringify(profiles));
            return id;
        } catch (e) {
            console.warn('[AutoEQ] Failed to save profile:', e);
            return false;
        }
    },

    /**
     * Deletes an AutoEQ headphone profile by its ID.
     * @param {string} profileId - The ID of the profile to delete.
     * @returns {boolean} True if deleted, false if not found.
     */
    deleteAutoEQProfile(profileId) {
        try {
            const profiles = this.getAutoEQProfiles();
            if (profiles[profileId]) {
                delete profiles[profileId];
                localStorage.setItem(this.AUTOEQ_PROFILES_KEY, JSON.stringify(profiles));
                if (this.getActiveAutoEQProfile() === profileId) {
                    localStorage.removeItem(this.AUTOEQ_ACTIVE_PROFILE_KEY);
                }
                return true;
            }
            return false;
        } catch (e) {
            console.warn('[AutoEQ] Failed to delete profile:', e);
            return false;
        }
    },

    /**
     * Gets the currently active AutoEQ profile ID.
     * @returns {string|null} Active profile ID, or null if none is set.
     */
    getActiveAutoEQProfile() {
        try {
            return localStorage.getItem(this.AUTOEQ_ACTIVE_PROFILE_KEY) || null;
        } catch {
            return null;
        }
    },

    /**
     * Sets the currently active AutoEQ profile ID.
     * @param {string|null} profileId - The profile ID to activate, or null to clear.
     * @returns {void}
     */
    setActiveAutoEQProfile(profileId) {
        if (profileId) {
            localStorage.setItem(this.AUTOEQ_ACTIVE_PROFILE_KEY, profileId);
        } else {
            localStorage.removeItem(this.AUTOEQ_ACTIVE_PROFILE_KEY);
        }
    },

    /**
     * Gets the AutoEQ sample rate.
     * @returns {number} Sample rate in Hz (44100, 48000, or 96000).
     */
    getSampleRate() {
        try {
            const stored = localStorage.getItem(this.AUTOEQ_SAMPLE_RATE_KEY);
            const val = parseInt(stored, 10);
            return [44100, 48000, 96000].includes(val) ? val : 48000;
        } catch {
            return 48000;
        }
    },

    /**
     * Sets the AutoEQ sample rate.
     * @param {number} rate - The sample rate in Hz.
     * @returns {void}
     */
    setSampleRate(rate) {
        localStorage.setItem(this.AUTOEQ_SAMPLE_RATE_KEY, rate.toString());
    },

    // ========================================
    // Last Selected Headphone Persistence
    // ========================================
    AUTOEQ_LAST_HEADPHONE_KEY: 'autoeq-last-headphone',

    /**
     * Save the last selected headphone entry + its measurement data
     * so it persists across page reloads without re-fetching from GitHub
     * @param {object} entry - {name, type, path, fileName}
     * @param {Array} measurementData - [{freq, gain}, ...]
     */
    setLastHeadphone(entry, measurementData) {
        try {
            localStorage.setItem(
                this.AUTOEQ_LAST_HEADPHONE_KEY,
                JSON.stringify({
                    entry,
                    measurementData,
                    savedAt: Date.now(),
                })
            );
        } catch (e) {
            console.warn('[AutoEQ] Failed to save last headphone:', e);
        }
    },

    /**
     * Retrieve the last selected headphone entry + cached measurement data
     * @returns {{entry: object, measurementData: Array}|null}
     */
    getLastHeadphone() {
        try {
            const stored = localStorage.getItem(this.AUTOEQ_LAST_HEADPHONE_KEY);
            if (!stored) return null;
            const parsed = JSON.parse(stored);
            if (parsed && parsed.entry && parsed.measurementData) return parsed;
            return null;
        } catch {
            return null;
        }
    },

    /**
     * Clears the last selected headphone entry and measurement cache.
     * @returns {void}
     */
    clearLastHeadphone() {
        localStorage.removeItem(this.AUTOEQ_LAST_HEADPHONE_KEY);
    },

    // --- Graphic EQ separate storage ---
    GEQ_ENABLED_KEY: 'graphic-eq-enabled',
    GEQ_GAINS_KEY: 'graphic-eq-gains',
    GEQ_PREAMP_KEY: 'graphic-eq-preamp',
    GEQ_BAND_COUNT_KEY: 'graphic-eq-band-count',
    GEQ_FREQ_RANGE_KEY: 'graphic-eq-freq-range',

    isGraphicEqEnabled() {
        try {
            return localStorage.getItem(this.GEQ_ENABLED_KEY) === 'true';
        } catch {
            return false;
        }
    },

    setGraphicEqEnabled(enabled) {
        try {
            localStorage.setItem(this.GEQ_ENABLED_KEY, String(!!enabled));
        } catch {
            /* ignore */
        }
    },

    getGraphicEqBandCount() {
        try {
            const val = localStorage.getItem(this.GEQ_BAND_COUNT_KEY);
            if (val !== null) {
                const num = parseInt(val, 10);
                if (num >= 3 && num <= 32) return num;
            }
        } catch {
            /* ignore */
        }
        return 16;
    },

    setGraphicEqBandCount(count) {
        const clamped = Math.max(3, Math.min(32, parseInt(count, 10) || 16));
        try {
            localStorage.setItem(this.GEQ_BAND_COUNT_KEY, String(clamped));
        } catch {
            /* ignore */
        }
    },

    getGraphicEqFreqRange() {
        try {
            const stored = localStorage.getItem(this.GEQ_FREQ_RANGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed && Number.isFinite(parsed.min) && Number.isFinite(parsed.max)) {
                    return parsed;
                }
            }
        } catch {
            /* ignore */
        }
        return { min: 25, max: 20000 };
    },

    setGraphicEqFreqRange(min, max) {
        const clampedMin = Math.max(10, Math.min(96000, parseInt(min, 10) || 25));
        const clampedMax = Math.max(10, Math.min(96000, parseInt(max, 10) || 20000));
        if (clampedMin >= clampedMax) return;
        try {
            localStorage.setItem(this.GEQ_FREQ_RANGE_KEY, JSON.stringify({ min: clampedMin, max: clampedMax }));
        } catch {
            /* ignore */
        }
    },

    getGraphicEqGains(bandCount) {
        try {
            const stored = localStorage.getItem(this.GEQ_GAINS_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                const expectedCount = bandCount || this.getGraphicEqBandCount();
                if (Array.isArray(parsed) && parsed.length === expectedCount) {
                    return parsed.map((v) => (Number.isFinite(v) ? v : 0));
                }
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return this.interpolateGains(parsed, expectedCount);
                }
            }
        } catch {
            /* ignore */
        }
        return new Array(bandCount || this.getGraphicEqBandCount()).fill(0);
    },

    setGraphicEqGains(gains) {
        if (!Array.isArray(gains)) return;
        const sanitized = gains.map((v) => (Number.isFinite(v) ? v : 0));
        try {
            localStorage.setItem(this.GEQ_GAINS_KEY, JSON.stringify(sanitized));
        } catch {
            /* ignore */
        }
    },

    getGraphicEqPreamp() {
        try {
            const val = localStorage.getItem(this.GEQ_PREAMP_KEY);
            if (val !== null) {
                const num = parseFloat(val);
                return Number.isFinite(num) ? num : 0;
            }
            return 0;
        } catch {
            return 0;
        }
    },

    setGraphicEqPreamp(db) {
        const clamped = Math.max(-20, Math.min(20, parseFloat(db) || 0));
        try {
            localStorage.setItem(this.GEQ_PREAMP_KEY, String(clamped));
        } catch {
            /* ignore */
        }
    },
};

export const monoAudioSettings = {
    STORAGE_KEY: 'mono-audio-enabled',

    /**
     * Returns whether mono audio mixing is enabled.
     * @returns {boolean}
     */
    isEnabled() {
        try {
            return localStorage.getItem(this.STORAGE_KEY) === 'true';
        } catch {
            return false;
        }
    },

    /**
     * Sets whether mono audio mixing is enabled.
     * @param {boolean} enabled - True to enable mono audio.
     * @returns {void}
     */
    setEnabled(enabled) {
        localStorage.setItem(this.STORAGE_KEY, enabled ? 'true' : 'false');
    },
};

export const binauralDspSettings = {
    STORAGE_KEY: 'binaural-dsp',

    _getAll() {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || {};
        } catch {
            return {};
        }
    },

    _setAll(obj) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(obj));
        } catch {
            // QuotaExceededError - storage full
        }
    },

    isEnabled() {
        return this._getAll().enabled === true;
    },

    setEnabled(enabled) {
        const all = this._getAll();
        all.enabled = !!enabled;
        this._setAll(all);
    },

    getCrossfeedEnabled() {
        const val = this._getAll().crossfeedEnabled;
        return val === undefined ? true : val;
    },

    setCrossfeedEnabled(enabled) {
        const all = this._getAll();
        all.crossfeedEnabled = !!enabled;
        this._setAll(all);
    },

    getCrossfeedLevel() {
        return this._getAll().crossfeedLevel || 'medium';
    },

    setCrossfeedLevel(level) {
        const all = this._getAll();
        all.crossfeedLevel = level;
        this._setAll(all);
    },

    getHrtfPreset() {
        return this._getAll().hrtfPreset || 'studio';
    },

    setHrtfPreset(preset) {
        const all = this._getAll();
        all.hrtfPreset = preset;
        this._setAll(all);
    },

    getWideningEnabled() {
        const val = this._getAll().wideningEnabled;
        return val === undefined ? true : val;
    },

    setWideningEnabled(enabled) {
        const all = this._getAll();
        all.wideningEnabled = !!enabled;
        this._setAll(all);
    },

    getWideningAmount() {
        const val = this._getAll().wideningAmount;
        return val === undefined ? 1.0 : val;
    },

    setWideningAmount(amount) {
        const all = this._getAll();
        const n = Number(amount);
        all.wideningAmount = Number.isFinite(n) ? Math.max(0, Math.min(2, n)) : 1.0;
        this._setAll(all);
    },

    getAutoEnableForSpatial() {
        const val = this._getAll().autoEnableForSpatial;
        return val === undefined ? true : val;
    },

    setAutoEnableForSpatial(enabled) {
        const all = this._getAll();
        all.autoEnableForSpatial = !!enabled;
        this._setAll(all);
    },
};

export const exponentialVolumeSettings = {
    STORAGE_KEY: 'exponential-volume-enabled',

    /**
     * Returns whether exponential volume scaling is enabled.
     * @returns {boolean}
     */
    isEnabled() {
        try {
            return localStorage.getItem(this.STORAGE_KEY) === 'true';
        } catch {
            return false;
        }
    },

    /**
     * Sets whether exponential volume scaling is enabled.
     * @param {boolean} enabled - True to enable exponential volume scaling.
     * @returns {void}
     */
    setEnabled(enabled) {
        localStorage.setItem(this.STORAGE_KEY, enabled ? 'true' : 'false');
    },

    /**
     * Applies the exponential curve to a linear volume value (0–1).
     * @param {number} linearVolume - Linear volume value between 0 and 1.
     * @returns {number} Curved volume value.
     */
    // Apply exponential curve to linear volume (0-1)
    // Uses a power curve: output = input^3 for more natural volume control
    applyCurve(linearVolume) {
        if (!this.isEnabled()) {
            return linearVolume;
        }
        // Exponential curve: cubed for much finer low-volume control
        // This creates a more dramatic difference that you'll actually notice
        return Math.pow(linearVolume, 3);
    },

    /**
     * Inverts the exponential curve, converting a perceived volume back to linear for UI display.
     * @param {number} perceivedVolume - Perceived (curved) volume value between 0 and 1.
     * @returns {number} Linear volume value.
     */
    // Convert from perceived volume back to linear for UI
    inverseCurve(perceivedVolume) {
        if (!this.isEnabled()) {
            return perceivedVolume;
        }
        return Math.cbrt(perceivedVolume);
    },
};

export const audioEffectsSettings = {
    SPEED_KEY: 'audio-effects-speed',
    PITCH_PRESERVE_KEY: 'audio-effects-pitch-preserve',

    /**
     * Gets the current playback speed.
     * @returns {number} Playback speed multiplier (0.01–100).
     */
    // Playback speed (0.01 to 100, default 1.0)
    getSpeed() {
        try {
            const val = parseFloat(localStorage.getItem(this.SPEED_KEY));
            return isNaN(val) ? 1.0 : Math.max(0.01, Math.min(100, val));
        } catch {
            return 1.0;
        }
    },

    /**
     * Sets the playback speed.
     * @param {number} speed - The speed multiplier to store (clamped to 0.01–100).
     * @returns {void}
     */
    setSpeed(speed) {
        const parsed = parseFloat(String(speed));
        const validSpeed = Math.max(0.01, Math.min(100, isNaN(parsed) ? 1.0 : parsed));
        localStorage.setItem(this.SPEED_KEY, validSpeed.toString());
    },

    /**
     * Resets the playback speed to 1.0 (normal).
     * @returns {number} The reset speed value (always 1.0).
     */
    resetSpeed() {
        this.setSpeed(1.0);
        return 1.0;
    },

    /**
     * Returns whether pitch preservation is enabled when changing playback speed.
     * @returns {boolean}
     */
    // Preserve pitch when changing speed (default true)
    isPreservePitchEnabled() {
        try {
            const val = localStorage.getItem(this.PITCH_PRESERVE_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    /**
     * Sets whether pitch preservation is enabled when changing playback speed.
     * @param {boolean} enabled - True to preserve pitch.
     * @returns {void}
     */
    setPreservePitch(enabled) {
        localStorage.setItem(this.PITCH_PRESERVE_KEY, enabled ? 'true' : 'false');
    },
};

export const settingsUiState = {
    ACTIVE_TAB_KEY: 'settings-active-tab',

    /**
     * Gets the currently active settings tab.
     * @returns {string} Active tab name.
     */
    getActiveTab() {
        try {
            return localStorage.getItem(this.ACTIVE_TAB_KEY) || 'appearance';
        } catch {
            return 'appearance';
        }
    },

    /**
     * Sets the currently active settings tab.
     * @param {string} tab - The tab name to persist.
     * @returns {void}
     */
    setActiveTab(tab) {
        localStorage.setItem(this.ACTIVE_TAB_KEY, tab);
    },
};

export const queueManager = {
    STORAGE_KEY: 'monochrome-queue',

    /**
     * Gets the persisted queue state.
     * @returns {object|null} Queue state object, or null if none is stored.
     */
    getQueue() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : null;
        } catch {
            return null;
        }
    },

    /**
     * Persists a minimal version of the queue state to localStorage.
     * @param {object} queueState - The full queue state object to save.
     * @returns {void}
     */
    saveQueue(queueState) {
        try {
            // Only save essential data to avoid quota limits
            const minimalState = {
                queue: queueState.queue,
                shuffledQueue: queueState.shuffledQueue,
                originalQueueBeforeShuffle: queueState.originalQueueBeforeShuffle,
                currentQueueIndex: queueState.currentQueueIndex,
                shuffleActive: queueState.shuffleActive,
                repeatMode: queueState.repeatMode,
            };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(minimalState));
        } catch (e) {
            console.warn('Failed to save queue to localStorage:', e);
        }
    },
};

export const sidebarSettings = {
    STORAGE_KEY: 'monochrome-sidebar-collapsed',

    /**
     * Returns whether the sidebar is collapsed.
     * @returns {boolean}
     */
    isCollapsed() {
        try {
            return localStorage.getItem(this.STORAGE_KEY) === 'true';
        } catch {
            return false;
        }
    },

    /**
     * Sets whether the sidebar is collapsed.
     * @param {boolean} collapsed - True to mark the sidebar as collapsed.
     * @returns {void}
     */
    setCollapsed(collapsed) {
        localStorage.setItem(this.STORAGE_KEY, collapsed ? 'true' : 'false');
    },

    /**
     * Restores the sidebar collapsed state from storage and applies it to the DOM.
     * @returns {void}
     */
    restoreState() {
        const isCollapsed = this.isCollapsed();
        if (isCollapsed) {
            document.body.classList.add('sidebar-collapsed');
            const toggleBtn = document.getElementById('sidebar-toggle');
            if (toggleBtn) {
                toggleBtn.innerHTML = SVG_RIGHT_ARROW(20);
            }
        }
    },
};

export const listenBrainzSettings = {
    ENABLED_KEY: 'listenbrainz-enabled',
    TOKEN_KEY: 'listenbrainz-token',
    CUSTOM_URL_KEY: 'listenbrainz-custom-url',
    LOVE_ON_LIKE_KEY: 'listenbrainz-love-on-like',

    /**
     * Returns whether ListenBrainz scrobbling is enabled.
     * @returns {boolean}
     */
    isEnabled() {
        try {
            return localStorage.getItem(this.ENABLED_KEY) === 'true';
        } catch {
            return false;
        }
    },

    /**
     * Sets whether ListenBrainz scrobbling is enabled.
     * @param {boolean} enabled - True to enable ListenBrainz.
     * @returns {void}
     */
    setEnabled(enabled) {
        localStorage.setItem(this.ENABLED_KEY, enabled ? 'true' : 'false');
    },

    /**
     * Gets the stored ListenBrainz user token.
     * @returns {string} User token, or empty string if not set.
     */
    getToken() {
        try {
            return localStorage.getItem(this.TOKEN_KEY) || '';
        } catch {
            return '';
        }
    },

    /**
     * Saves the ListenBrainz user token.
     * @param {string} token - The token to store.
     * @returns {void}
     */
    setToken(token) {
        localStorage.setItem(this.TOKEN_KEY, token);
    },

    /**
     * Gets the custom ListenBrainz server URL.
     * @returns {string} Custom URL, or empty string if not set.
     */
    getCustomUrl() {
        try {
            return localStorage.getItem(this.CUSTOM_URL_KEY) || '';
        } catch {
            return '';
        }
    },

    /**
     * Saves the custom ListenBrainz server URL.
     * @param {string} url - The server URL to store.
     * @returns {void}
     */
    setCustomUrl(url) {
        localStorage.setItem(this.CUSTOM_URL_KEY, url);
    },

    /**
     * Returns whether tracks should be loved on ListenBrainz when liked.
     * @returns {boolean}
     */
    shouldLoveOnLike() {
        try {
            return localStorage.getItem(this.LOVE_ON_LIKE_KEY) === 'true';
        } catch {
            return false;
        }
    },

    /**
     * Sets whether tracks should be loved on ListenBrainz when liked.
     * @param {boolean} enabled - True to enable love-on-like.
     * @returns {void}
     */
    setLoveOnLike(enabled) {
        localStorage.setItem(this.LOVE_ON_LIKE_KEY, enabled ? 'true' : 'false');
    },
};

export const malojaSettings = {
    ENABLED_KEY: 'maloja-enabled',
    TOKEN_KEY: 'maloja-token',
    CUSTOM_URL_KEY: 'maloja-custom-url',

    /**
     * Returns whether Maloja scrobbling is enabled.
     * @returns {boolean}
     */
    isEnabled() {
        try {
            return localStorage.getItem(this.ENABLED_KEY) === 'true';
        } catch {
            return false;
        }
    },

    /**
     * Sets whether Maloja scrobbling is enabled.
     * @param {boolean} enabled - True to enable Maloja.
     * @returns {void}
     */
    setEnabled(enabled) {
        localStorage.setItem(this.ENABLED_KEY, enabled ? 'true' : 'false');
    },

    /**
     * Gets the stored Maloja API token.
     * @returns {string} API token, or empty string if not set.
     */
    getToken() {
        try {
            return localStorage.getItem(this.TOKEN_KEY) || '';
        } catch {
            return '';
        }
    },

    /**
     * Saves the Maloja API token.
     * @param {string} token - The token to store.
     * @returns {void}
     */
    setToken(token) {
        localStorage.setItem(this.TOKEN_KEY, token);
    },

    /**
     * Gets the custom Maloja server URL.
     * @returns {string} Custom URL, or empty string if not set.
     */
    getCustomUrl() {
        try {
            return localStorage.getItem(this.CUSTOM_URL_KEY) || '';
        } catch {
            return '';
        }
    },

    /**
     * Saves the custom Maloja server URL.
     * @param {string} url - The server URL to store.
     * @returns {void}
     */
    setCustomUrl(url) {
        localStorage.setItem(this.CUSTOM_URL_KEY, url);
    },
};

export const libreFmSettings = {
    ENABLED_KEY: 'librefm-enabled',
    LOVE_ON_LIKE_KEY: 'librefm-love-on-like',

    /**
     * Returns whether Libre.fm scrobbling is enabled.
     * @returns {boolean}
     */
    isEnabled() {
        try {
            return localStorage.getItem(this.ENABLED_KEY) === 'true';
        } catch {
            return false;
        }
    },

    /**
     * Sets whether Libre.fm scrobbling is enabled.
     * @param {boolean} enabled - True to enable Libre.fm.
     * @returns {void}
     */
    setEnabled(enabled) {
        localStorage.setItem(this.ENABLED_KEY, enabled ? 'true' : 'false');
    },

    /**
     * Returns whether tracks should be loved on Libre.fm when liked.
     * @returns {boolean}
     */
    shouldLoveOnLike() {
        try {
            return localStorage.getItem(this.LOVE_ON_LIKE_KEY) === 'true';
        } catch {
            return false;
        }
    },

    /**
     * Sets whether tracks should be loved on Libre.fm when liked.
     * @param {boolean} enabled - True to enable love-on-like.
     * @returns {void}
     */
    setLoveOnLike(enabled) {
        localStorage.setItem(this.LOVE_ON_LIKE_KEY, enabled ? 'true' : 'false');
    },
};

export const homePageSettings = {
    SHOW_RECOMMENDED_SONGS_KEY: 'home-show-recommended-songs',
    SHOW_RECOMMENDED_ALBUMS_KEY: 'home-show-recommended-albums',
    SHOW_RECOMMENDED_ARTISTS_KEY: 'home-show-recommended-artists',
    SHOW_JUMP_BACK_IN_KEY: 'home-show-jump-back-in',

    /**
     * Returns whether recommended songs should be shown on the home page.
     * @returns {boolean}
     */
    shouldShowRecommendedSongs() {
        try {
            const val = localStorage.getItem(this.SHOW_RECOMMENDED_SONGS_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    /**
     * Sets whether recommended songs should be shown on the home page.
     * @param {boolean} enabled - True to show recommended songs.
     * @returns {void}
     */
    setShowRecommendedSongs(enabled) {
        localStorage.setItem(this.SHOW_RECOMMENDED_SONGS_KEY, enabled ? 'true' : 'false');
    },

    /**
     * Returns whether recommended albums should be shown on the home page.
     * @returns {boolean}
     */
    shouldShowRecommendedAlbums() {
        try {
            const val = localStorage.getItem(this.SHOW_RECOMMENDED_ALBUMS_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    /**
     * Sets whether recommended albums should be shown on the home page.
     * @param {boolean} enabled - True to show recommended albums.
     * @returns {void}
     */
    setShowRecommendedAlbums(enabled) {
        localStorage.setItem(this.SHOW_RECOMMENDED_ALBUMS_KEY, enabled ? 'true' : 'false');
    },

    /**
     * Returns whether recommended artists should be shown on the home page.
     * @returns {boolean}
     */
    shouldShowRecommendedArtists() {
        try {
            const val = localStorage.getItem(this.SHOW_RECOMMENDED_ARTISTS_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    /**
     * Sets whether recommended artists should be shown on the home page.
     * @param {boolean} enabled - True to show recommended artists.
     * @returns {void}
     */
    setShowRecommendedArtists(enabled) {
        localStorage.setItem(this.SHOW_RECOMMENDED_ARTISTS_KEY, enabled ? 'true' : 'false');
    },

    /**
     * Returns whether the "Jump Back In" section should be shown on the home page.
     * @returns {boolean}
     */
    shouldShowJumpBackIn() {
        try {
            const val = localStorage.getItem(this.SHOW_JUMP_BACK_IN_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    /**
     * Sets whether the "Jump Back In" section should be shown on the home page.
     * @param {boolean} enabled - True to show Jump Back In.
     * @returns {void}
     */
    setShowJumpBackIn(enabled) {
        localStorage.setItem(this.SHOW_JUMP_BACK_IN_KEY, enabled ? 'true' : 'false');
    },

    SHOW_EDITORS_PICKS_KEY: 'home-show-editors-picks',

    /**
     * Returns whether the Editor's Picks section should be shown on the home page.
     * @returns {boolean}
     */
    shouldShowEditorsPicks() {
        try {
            const val = localStorage.getItem(this.SHOW_EDITORS_PICKS_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    /**
     * Sets whether the Editor's Picks section should be shown on the home page.
     * @param {boolean} enabled - True to show Editor's Picks.
     * @returns {void}
     */
    setShowEditorsPicks(enabled) {
        localStorage.setItem(this.SHOW_EDITORS_PICKS_KEY, enabled ? 'true' : 'false');
    },

    SHUFFLE_EDITORS_PICKS_KEY: 'home-shuffle-editors-picks',

    /**
     * Returns whether Editor's Picks should be shuffled.
     * @returns {boolean}
     */
    shouldShuffleEditorsPicks() {
        try {
            const val = localStorage.getItem(this.SHUFFLE_EDITORS_PICKS_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    /**
     * Sets whether Editor's Picks should be shuffled.
     * @param {boolean} enabled - True to shuffle Editor's Picks.
     * @returns {void}
     */
    setShuffleEditorsPicks(enabled) {
        localStorage.setItem(this.SHUFFLE_EDITORS_PICKS_KEY, enabled ? 'true' : 'false');
    },

    EDITORS_PICKS_SOURCE_KEY: 'home-editors-picks-source',

    /**
     * Gets the source for Editor's Picks content.
     * @returns {string} Source identifier.
     */
    getEditorsPicksSource() {
        try {
            return localStorage.getItem(this.EDITORS_PICKS_SOURCE_KEY) || 'current';
        } catch {
            return 'current';
        }
    },

    /**
     * Sets the source for Editor's Picks content.
     * @param {string} source - The source identifier to store.
     * @returns {void}
     */
    setEditorsPicksSource(source) {
        localStorage.setItem(this.EDITORS_PICKS_SOURCE_KEY, source);
    },
};

export const radioSettings = {
    ENABLED_KEY: 'radio-enabled',

    /**
     * Returns whether radio is enabled.
     * @returns {boolean}
     */
    isEnabled() {
        try {
            return localStorage.getItem(this.ENABLED_KEY) === 'true';
        } catch {
            return false;
        }
    },

    /**
     * Sets whether radio is enabled.
     * @param {boolean} enabled - True to enable radio.
     * @returns {void}
     */
    setEnabled(enabled) {
        localStorage.setItem(this.ENABLED_KEY, enabled ? 'true' : 'false');
    },
};

export const analyticsSettings = {
    ENABLED_KEY: 'analytics-enabled',

    /**
     * Returns whether analytics reporting is enabled.
     * @returns {boolean}
     */
    isEnabled() {
        try {
            const val = localStorage.getItem(this.ENABLED_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    /**
     * Sets whether analytics reporting is enabled.
     * @param {boolean} enabled - True to enable analytics.
     * @returns {void}
     */
    setEnabled(enabled) {
        localStorage.setItem(this.ENABLED_KEY, enabled ? 'true' : 'false');
    },
};

export const sidebarSectionSettings = {
    SHOW_HOME_KEY: 'sidebar-show-home',
    SHOW_LIBRARY_KEY: 'sidebar-show-library',
    SHOW_RECENT_KEY: 'sidebar-show-recent',
    SHOW_UNRELEASED_KEY: 'sidebar-show-unreleased',
    SHOW_DONATE_KEY: 'sidebar-show-donate',
    SHOW_SETTINGS_KEY: 'sidebar-show-settings',
    SHOW_ABOUT_KEY: 'sidebar-show-about',
    SHOW_DISCORD_KEY: 'sidebar-show-discord',
    SHOW_GITHUB_KEY: 'sidebar-show-github',
    ORDER_KEY: 'sidebar-menu-order',
    DEFAULT_ORDER: [
        'sidebar-nav-home',
        'sidebar-nav-library',
        'sidebar-nav-recent',
        'sidebar-nav-unreleased',
        'sidebar-nav-donate',
        'sidebar-nav-settings',
        'sidebar-nav-about-bottom',
        'sidebar-nav-discordbtn',
        'sidebar-nav-githubbtn',
    ],

    /**
     * Gets the IDs of bottom navigation items from the DOM.
     * @returns {string[]} Array of element IDs for bottom nav items.
     */
    getBottomNavIds() {
        const ul = document.querySelector('.sidebar-nav.bottom ul');
        if (!ul) return [];
        return Array.from(ul.children).map((li) => li.id);
    },

    /**
     * Returns whether the Home sidebar item should be visible.
     * @returns {boolean}
     */
    shouldShowHome() {
        try {
            const val = localStorage.getItem(this.SHOW_HOME_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    /**
     * Sets whether the Home sidebar item should be visible.
     * @param {boolean} enabled - True to show Home.
     * @returns {void}
     */
    setShowHome(enabled) {
        localStorage.setItem(this.SHOW_HOME_KEY, enabled ? 'true' : 'false');
    },

    /**
     * Returns whether the Library sidebar item should be visible.
     * @returns {boolean}
     */
    shouldShowLibrary() {
        try {
            const val = localStorage.getItem(this.SHOW_LIBRARY_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    /**
     * Sets whether the Library sidebar item should be visible.
     * @param {boolean} enabled - True to show Library.
     * @returns {void}
     */
    setShowLibrary(enabled) {
        localStorage.setItem(this.SHOW_LIBRARY_KEY, enabled ? 'true' : 'false');
    },

    /**
     * Returns whether the Recent sidebar item should be visible.
     * @returns {boolean}
     */
    shouldShowRecent() {
        try {
            const val = localStorage.getItem(this.SHOW_RECENT_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    /**
     * Sets whether the Recent sidebar item should be visible.
     * @param {boolean} enabled - True to show Recent.
     * @returns {void}
     */
    setShowRecent(enabled) {
        localStorage.setItem(this.SHOW_RECENT_KEY, enabled ? 'true' : 'false');
    },

    /**
     * Returns whether the Unreleased sidebar item should be visible.
     * @returns {boolean}
     */
    shouldShowUnreleased() {
        try {
            const val = localStorage.getItem(this.SHOW_UNRELEASED_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    /**
     * Sets whether the Unreleased sidebar item should be visible.
     * @param {boolean} enabled - True to show Unreleased.
     * @returns {void}
     */
    setShowUnreleased(enabled) {
        localStorage.setItem(this.SHOW_UNRELEASED_KEY, enabled ? 'true' : 'false');
    },

    /**
     * Returns whether the Donate sidebar item should be visible.
     * @returns {boolean}
     */
    shouldShowDonate() {
        try {
            const val = localStorage.getItem(this.SHOW_DONATE_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    /**
     * Sets whether the Donate sidebar item should be visible.
     * @param {boolean} enabled - True to show Donate.
     * @returns {void}
     */
    setShowDonate(enabled) {
        localStorage.setItem(this.SHOW_DONATE_KEY, enabled ? 'true' : 'false');
    },

    /**
     * Returns whether the Settings sidebar item should be visible (always true).
     * @returns {boolean}
     */
    shouldShowSettings() {
        return true;
    },

    /**
     * Sets whether the Settings sidebar item should be visible.
     * @param {boolean} enabled - True to show Settings.
     * @returns {void}
     */
    setShowSettings(enabled) {
        if (enabled) {
            localStorage.setItem(this.SHOW_SETTINGS_KEY, 'true');
        } else {
            localStorage.removeItem(this.SHOW_SETTINGS_KEY);
        }
    },

    /**
     * Returns whether the About sidebar item should be visible.
     * @returns {boolean}
     */
    shouldShowAbout() {
        try {
            const val = localStorage.getItem(this.SHOW_ABOUT_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    /**
     * Sets whether the About sidebar item should be visible.
     * @param {boolean} enabled - True to show About.
     * @returns {void}
     */
    setShowAbout(enabled) {
        localStorage.setItem(this.SHOW_ABOUT_KEY, enabled ? 'true' : 'false');
    },

    /**
     * Returns whether the Discord sidebar button should be visible.
     * @returns {boolean}
     */
    shouldShowDiscord() {
        try {
            const val = localStorage.getItem(this.SHOW_DISCORD_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    /**
     * Sets whether the Discord sidebar button should be visible.
     * @param {boolean} enabled - True to show Discord.
     * @returns {void}
     */
    setShowDiscord(enabled) {
        localStorage.setItem(this.SHOW_DISCORD_KEY, enabled ? 'true' : 'false');
    },

    /**
     * Returns whether the GitHub sidebar button should be visible.
     * @returns {boolean}
     */
    shouldShowGithub() {
        try {
            const val = localStorage.getItem(this.SHOW_GITHUB_KEY);
            return val === null ? true : val === 'true';
        } catch {
            return true;
        }
    },

    /**
     * Sets whether the GitHub sidebar button should be visible.
     * @param {boolean} enabled - True to show GitHub.
     * @returns {void}
     */
    setShowGithub(enabled) {
        localStorage.setItem(this.SHOW_GITHUB_KEY, enabled ? 'true' : 'false');
    },

    /**
     * Normalizes a sidebar order array, filling in any missing items from DEFAULT_ORDER.
     * @param {string[]} order - Array of sidebar item IDs.
     * @returns {string[]} Normalized order with all items present.
     */
    normalizeOrder(order) {
        const baseOrder = this.DEFAULT_ORDER;
        const safeOrder = Array.isArray(order) ? order.filter((id) => baseOrder.includes(id)) : [];
        const uniqueOrder = [...new Set(safeOrder)];
        const missing = baseOrder.filter((id) => !uniqueOrder.includes(id));
        return [...uniqueOrder, ...missing];
    },

    /**
     * Gets the current sidebar item order from storage.
     * @returns {string[]} Normalized array of sidebar item IDs.
     */
    getOrder() {
        try {
            const stored = localStorage.getItem(this.ORDER_KEY);
            if (stored) {
                return this.normalizeOrder(JSON.parse(stored));
            }
        } catch {
            // ignore
        }
        return this.normalizeOrder([]);
    },

    /**
     * Saves the sidebar item order.
     * @param {string[]} order - Array of sidebar item IDs in the desired order.
     * @returns {void}
     */
    setOrder(order) {
        const normalized = this.normalizeOrder(order);
        localStorage.setItem(this.ORDER_KEY, JSON.stringify(normalized));
    },

    /**
     * Applies the stored sidebar item order to the DOM.
     * @returns {void}
     */
    applySidebarOrder() {
        const mainList = document.querySelector('.sidebar-nav.main ul');
        const bottomList = document.querySelector('.sidebar-nav.bottom ul');
        if (!mainList) return;

        const order = this.getOrder();
        const bottomIds = this.getBottomNavIds();
        const mainOrder = order.filter((id) => !bottomIds.includes(id));
        const bottomOrder = order.filter((id) => bottomIds.includes(id));

        mainOrder.forEach((id) => {
            const item = document.getElementById(id);
            if (item) mainList.appendChild(item);
        });

        if (bottomList) {
            bottomOrder.forEach((id) => {
                const item = document.getElementById(id);
                if (item) bottomList.appendChild(item);
            });
        }
    },

    /**
     * Applies both sidebar order and visibility settings to the DOM.
     * @returns {void}
     */
    applySidebarVisibility() {
        this.applySidebarOrder();
        const items = [
            { id: 'sidebar-nav-home', check: this.shouldShowHome() },
            { id: 'sidebar-nav-library', check: this.shouldShowLibrary() },
            { id: 'sidebar-nav-recent', check: this.shouldShowRecent() },
            { id: 'sidebar-nav-unreleased', check: this.shouldShowUnreleased() },
            { id: 'sidebar-nav-donate', check: this.shouldShowDonate() },
            { id: 'sidebar-nav-settings', check: this.shouldShowSettings() },
            { id: 'sidebar-nav-about-bottom', check: this.shouldShowAbout() },
            { id: 'sidebar-nav-discordbtn', check: this.shouldShowDiscord() },
            { id: 'sidebar-nav-githubbtn', check: this.shouldShowGithub() },
        ];

        items.forEach(({ id, check }) => {
            const el = document.getElementById(id);
            if (el) {
                el.style.display = check ? '' : 'none';
            }
        });
    },
};

// System theme listener
if (typeof window !== 'undefined' && window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (themeManager.getTheme() === 'system') {
            document.documentElement.setAttribute('data-theme', e.matches ? 'monochrome' : 'white');
        }
    });
}

export const fontSettings = {
    STORAGE_KEY: 'monochrome-font-config-v2',
    CUSTOM_FONTS_KEY: 'monochrome-custom-fonts',
    FONT_SIZE_KEY: 'monochrome-font-size',
    FONT_LINK_ID: 'monochrome-dynamic-font',
    FONT_FACE_ID: 'monochrome-dynamic-fontface',

    /**
     * Returns the default font configuration object.
     * @returns {object} Default font config.
     */
    getDefaultConfig() {
        return {
            type: 'preset',
            family: 'Inter',
            fallback: 'sans-serif',
            weights: [400, 500, 600, 700, 800],
        };
    },

    /**
     * Returns the default font size percentage.
     * @returns {number} Default font size (100).
     */
    getDefaultFontSize() {
        return 100; // 100% = default size
    },

    /**
     * Gets the stored font size percentage.
     * @returns {number} Font size percentage (50–200).
     */
    getFontSize() {
        try {
            const stored = localStorage.getItem(this.FONT_SIZE_KEY);
            if (stored) {
                const size = parseInt(stored, 10);
                if (!isNaN(size) && size >= 50 && size <= 200) {
                    return size;
                }
            }
        } catch {
            // ignore
        }
        return this.getDefaultFontSize();
    },

    /**
     * Sets the font size percentage and applies it to the document.
     * @param {number} size - The font size percentage (clamped to 50–200).
     * @returns {number} The clamped font size that was applied.
     */
    setFontSize(size) {
        const parsed = parseInt(String(size), 10);
        const validSize = Math.max(50, Math.min(200, isNaN(parsed) ? 100 : parsed));
        localStorage.setItem(this.FONT_SIZE_KEY, validSize.toString());
        this.applyFontSize();
        return validSize;
    },

    /**
     * Applies the stored font size to the document CSS variable.
     * @returns {void}
     */
    applyFontSize() {
        const size = this.getFontSize();
        document.documentElement.style.setProperty('--font-size-scale', `${size}%`);
    },

    /**
     * Resets the font size to the default and applies it.
     * @returns {number} The default font size percentage.
     */
    resetFontSize() {
        localStorage.removeItem(this.FONT_SIZE_KEY);
        this.applyFontSize();
        return this.getDefaultFontSize();
    },

    /**
     * Gets the stored font configuration object.
     * @returns {object} Font configuration.
     */
    getConfig() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch {
            // ignore
        }
        return this.getDefaultConfig();
    },

    /**
     * Saves the font configuration object.
     * @param {object} config - The font config to store.
     * @returns {void}
     */
    setConfig(config) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
    },

    /**
     * Extracts a Google Fonts family name from a Google Fonts URL.
     * @param {string} url - A Google Fonts specimen or CSS URL.
     * @returns {string|null} Extracted family name, or null if not parseable.
     */
    parseGoogleFontsUrl(url) {
        try {
            if (url.includes('fonts.google.com/specimen/')) {
                const match = url.match(/specimen\/([^/?]+)/);
                if (match) {
                    return decodeURIComponent(match[1]).replace(/\+/g, ' ');
                }
            }
            if (url.includes('fonts.googleapis.com/css')) {
                const match = url.match(/family=([^&:]+)/);
                if (match) {
                    return decodeURIComponent(match[1]).replace(/\+/g, ' ').split(':')[0];
                }
            }
        } catch {
            // ignore
        }
        return null;
    },

    /**
     * Loads a Google Font by family name and applies it to the document.
     * @async
     * @param {string} familyName - The Google Fonts family name to load.
     * @returns {Promise<void>}
     */
    async loadGoogleFont(familyName) {
        // Validate familyName to prevent injection
        if (!familyName || typeof familyName !== 'string') {
            return;
        }
        // Only allow alphanumeric, spaces, and basic punctuation in font names
        const sanitizedFamily = familyName.replace(/[^a-zA-Z0-9\s\-_,.]/g, '');
        if (!sanitizedFamily) {
            return;
        }

        const encodedFamily = encodeURIComponent(sanitizedFamily);
        const url = `https://fonts.googleapis.com/css2?family=${encodedFamily}:wght@100;200;300;400;500;600;700;800;900&display=swap`;

        let link = /** @type {HTMLLinkElement | null} */ (document.getElementById(this.FONT_LINK_ID));
        if (!link) {
            link = document.createElement('link');
            link.id = this.FONT_LINK_ID;
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }

        link.href = url;

        this.setConfig({
            type: 'google',
            family: familyName,
            fallback: 'sans-serif',
            weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
        });

        document.documentElement.style.setProperty('--font-family', `'${familyName}', sans-serif`);
    },

    /**
     * Loads a font from an arbitrary URL and applies it to the document.
     * @async
     * @param {string} url - The URL of the font file.
     * @param {string} familyName - The CSS family name to assign.
     * @returns {Promise<void>}
     */
    async loadFontFromUrl(url, familyName) {
        const weights = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const fontFaceId = this.FONT_FACE_ID;

        let style = document.getElementById(fontFaceId);
        if (!style) {
            style = document.createElement('style');
            style.id = fontFaceId;
            document.head.appendChild(style);
        }

        const format = this.getFontFormat(url);
        const fontFamily = familyName || 'CustomFont';

        style.textContent = `
            @font-face {
                font-family: '${fontFamily}';
                src: url('${url}') format('${format}');
                font-weight: 100 900;
                font-style: normal;
                font-display: swap;
            }
        `;

        this.setConfig({
            type: 'url',
            family: fontFamily,
            url: url,
            fallback: 'sans-serif',
            weights: weights,
        });

        document.documentElement.style.setProperty('--font-family', `'${fontFamily}', sans-serif`);
    },

    /**
     * Gets the CSS font format string for a given font file URL.
     * @param {string} url - The font file URL or filename.
     * @returns {string} Font format string, e.g. `'woff2'` or `'truetype'`.
     */
    getFontFormat(url) {
        const ext = url.split('.').pop().toLowerCase();
        const formats = {
            woff2: 'woff2',
            woff: 'woff',
            ttf: 'truetype',
            otf: 'opentype',
        };
        return formats[ext] || 'woff2';
    },

    /**
     * Reads a font file, encodes it as base64, and saves it to localStorage.
     * @async
     * @param {File} file - The font file to save.
     * @returns {Promise<object>} Saved font metadata object including its generated ID.
     */
    async saveUploadedFont(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64 = e.target.result;
                const fontId = 'uploaded-' + Date.now();
                const customFonts = this.getCustomFonts();

                customFonts[fontId] = {
                    name: file.name.replace(/\.[^/.]+$/, ''),
                    base64: base64,
                    format: this.getFontFormat(file.name),
                    size: file.size,
                    uploadedAt: Date.now(),
                };

                localStorage.setItem(this.CUSTOM_FONTS_KEY, JSON.stringify(customFonts));
                resolve({ id: fontId, ...customFonts[fontId] });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    /**
     * Gets all saved custom (uploaded) fonts.
     * @returns {Object} Map of font IDs to font metadata objects.
     */
    getCustomFonts() {
        try {
            const stored = localStorage.getItem(this.CUSTOM_FONTS_KEY);
            return stored ? JSON.parse(stored) : {};
        } catch {
            return {};
        }
    },

    /**
     * Loads a previously uploaded font from storage and applies it to the document.
     * @async
     * @param {string} fontId - The ID of the uploaded font to load.
     * @returns {Promise<void>}
     */
    async loadUploadedFont(fontId) {
        const customFonts = this.getCustomFonts();
        const font = customFonts[fontId];

        if (!font) {
            throw new Error('Font not found');
        }

        const fontFamily = font.name || 'UploadedFont';
        const fontFaceId = this.FONT_FACE_ID;

        let style = document.getElementById(fontFaceId);
        if (!style) {
            style = document.createElement('style');
            style.id = fontFaceId;
            document.head.appendChild(style);
        }

        style.textContent = `
            @font-face {
                font-family: '${fontFamily}';
                src: url('${font.base64}') format('${font.format}');
                font-weight: 100 900;
                font-style: normal;
                font-display: swap;
            }
        `;

        this.setConfig({
            type: 'uploaded',
            family: fontFamily,
            fontId: fontId,
            fallback: 'sans-serif',
            weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
        });

        document.documentElement.style.setProperty('--font-family', `'${fontFamily}', sans-serif`);
    },

    /**
     * Removes a previously uploaded font from storage.
     * @param {string} fontId - The ID of the font to delete.
     * @returns {void}
     */
    deleteUploadedFont(fontId) {
        const customFonts = this.getCustomFonts();
        delete customFonts[fontId];
        localStorage.setItem(this.CUSTOM_FONTS_KEY, JSON.stringify(customFonts));
    },

    /**
     * Loads a built-in preset font and applies it to the document.
     * @param {string} family - The CSS font family name.
     * @param {string} [fallback='sans-serif'] - The fallback font family.
     * @returns {void}
     */
    loadPresetFont(family, fallback = 'sans-serif') {
        let link = document.getElementById(this.FONT_LINK_ID);
        if (link) {
            link.remove();
        }

        let style = document.getElementById(this.FONT_FACE_ID);
        if (style) {
            style.remove();
        }

        this.setConfig({
            type: 'preset',
            family: family,
            fallback: fallback,
            weights: [400, 500, 600, 700, 800],
        });

        const fontValue = family === 'monospace' ? 'monospace' : `'${family}', ${fallback}`;
        document.documentElement.style.setProperty('--font-family', fontValue);
    },

    /**
     * Loads the Apple Music (SF Pro Display) font and applies it to the document.
     * @returns {void}
     */
    loadAppleMusicFont() {
        const APPLE_FONT_LINK_ID = 'monochrome-apple-font';

        // Remove any existing dynamic font links
        let existingLink = document.getElementById(this.FONT_LINK_ID);
        if (existingLink) {
            existingLink.remove();
        }

        // Remove any existing @font-face styles
        let existingStyle = document.getElementById(this.FONT_FACE_ID);
        if (existingStyle) {
            existingStyle.remove();
        }

        // Load Apple font CSS
        let link = /** @type {HTMLLinkElement | null} */ (document.getElementById(APPLE_FONT_LINK_ID));
        if (!link) {
            link = document.createElement('link');
            link.id = APPLE_FONT_LINK_ID;
            link.rel = 'stylesheet';
            link.href = '/fonts/apple/sf-pro-display.css';
            document.head.appendChild(link);
        }

        this.setConfig({
            type: 'preset',
            family: 'Apple Music',
            fallback: 'sans-serif',
            weights: [400, 500, 600, 700],
        });

        document.documentElement.style.setProperty('--font-family', "'SF Pro Display', sans-serif");
    },

    /**
     * Applies the currently configured font to the document.
     * @async
     * @returns {Promise<void>}
     */
    async applyFont() {
        const config = this.getConfig();

        switch (config.type) {
            case 'google':
                await this.loadGoogleFont(config.family);
                break;
            case 'url':
                await this.loadFontFromUrl(config.url, config.family);
                break;
            case 'uploaded':
                await this.loadUploadedFont(config.fontId);
                break;
            case 'preset':
            default:
                if (config.family === 'Apple Music') {
                    this.loadAppleMusicFont();
                } else {
                    this.loadPresetFont(config.family, config.fallback);
                }
                break;
        }
    },

    /**
     * Returns a list of all uploaded fonts with their metadata.
     * @returns {Array} Array of font metadata objects including id, name, size, and uploadedAt.
     */
    getUploadedFontList() {
        const fonts = this.getCustomFonts();
        return Object.entries(fonts).map(([id, font]) => ({
            id,
            name: font.name,
            size: font.size,
            uploadedAt: font.uploadedAt,
        }));
    },
};

export const pwaUpdateSettings = {
    STORAGE_KEY: 'pwa-auto-update-enabled',

    /**
     * Returns whether PWA auto-update is enabled.
     * @returns {boolean}
     */
    isAutoUpdateEnabled() {
        try {
            // Default to true (auto-update) if not set
            return localStorage.getItem(this.STORAGE_KEY) !== 'false';
        } catch {
            return true;
        }
    },

    /**
     * Sets whether PWA auto-update is enabled.
     * @param {boolean} enabled - True to enable auto-update.
     * @returns {void}
     */
    setAutoUpdateEnabled(enabled) {
        localStorage.setItem(this.STORAGE_KEY, enabled ? 'true' : 'false');
    },
};

export const musicProviderSettings = {
    STORAGE_KEY: 'music-provider',

    /**
     * Gets the selected music provider name.
     * @returns {string} Current music provider identifier.
     */
    getProvider() {
        try {
            return localStorage.getItem(this.STORAGE_KEY) || 'tidal';
        } catch {
            return 'tidal';
        }
    },

    /**
     * Sets the music provider.
     * @param {string} provider - The provider identifier to store.
     * @returns {void}
     */
    setProvider(provider) {
        localStorage.setItem(this.STORAGE_KEY, provider);
    },
};

export const modalSettings = {
    STORAGE_KEY: 'close-modals-on-navigation',
    INTERCEPT_BACK_KEY: 'intercept-back-to-close-modals',

    /**
     * Returns whether modals should close when navigating.
     * @returns {boolean}
     */
    shouldCloseOnNavigation() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved === null) {
                return false;
            }
            return saved === 'true';
        } catch {
            return false;
        }
    },

    /**
     * Sets whether modals should close when navigating.
     * @param {boolean} enabled - True to close modals on navigation.
     * @returns {void}
     */
    setCloseOnNavigation(enabled) {
        localStorage.setItem(this.STORAGE_KEY, enabled ? 'true' : 'false');
    },

    /**
     * Returns whether the back button should be intercepted to close modals.
     * @returns {boolean}
     */
    shouldInterceptBackToClose() {
        try {
            const saved = localStorage.getItem(this.INTERCEPT_BACK_KEY);
            if (saved === null) {
                return false;
            }
            return saved === 'true';
        } catch {
            return false;
        }
    },

    /**
     * Sets whether the back button should be intercepted to close modals.
     * @param {boolean} enabled - True to intercept back button.
     * @returns {void}
     */
    setInterceptBackToClose(enabled) {
        localStorage.setItem(this.INTERCEPT_BACK_KEY, enabled ? 'true' : 'false');
    },

    /**
     * Returns whether any modals or side panels are currently open in the DOM.
     * @returns {boolean}
     */
    hasOpenModalsOrPanels() {
        const sidePanel = document.getElementById('side-panel');
        if (sidePanel && sidePanel.classList.contains('active')) {
            return true;
        }
        if (document.querySelector('.modal.active')) {
            return true;
        }
        if (document.querySelector('.modal-overlay')) {
            return true;
        }
        const modalIds = [
            'playlist-modal',
            'folder-modal',
            'playlist-select-modal',
            'shortcuts-modal',
            'missing-tracks-modal',
            'sleep-timer-modal',
            'discography-download-modal',
            'custom-db-modal',
            'tracker-modal',
            'epilepsy-warning-modal',
        ];
        for (const id of modalIds) {
            const modal = document.getElementById(id);
            if (modal && modal.classList.contains('active')) {
                return true;
            }
        }
        return false;
    },

    /**
     * Closes all currently open modals and overlay panels in the DOM.
     * @returns {void}
     */
    closeAllModals() {
        // Close all modal overlays
        document.querySelectorAll('.modal-overlay').forEach((modal) => {
            modal.remove();
        });

        // Close all modals with active class
        document.querySelectorAll('.modal.active').forEach((modal) => {
            modal.classList.remove('active');
        });

        // Close specific modals by ID
        const modalIds = [
            'playlist-modal',
            'folder-modal',
            'playlist-select-modal',
            'shortcuts-modal',
            'missing-tracks-modal',
            'sleep-timer-modal',
            'discography-download-modal',
            'custom-db-modal',
            'tracker-modal',
            'epilepsy-warning-modal',
        ];

        modalIds.forEach((id) => {
            const modal = document.getElementById(id);
            if (modal) {
                modal.classList.remove('active');
            }
        });
    },
};

export const contentBlockingSettings = {
    BLOCKED_ARTISTS_KEY: 'blocked-artists',
    BLOCKED_TRACKS_KEY: 'blocked-tracks',
    BLOCKED_ALBUMS_KEY: 'blocked-albums',

    /**
     * Gets the list of blocked artists.
     * @returns {Array} Array of blocked artist objects.
     */
    getBlockedArtists() {
        try {
            const data = localStorage.getItem(this.BLOCKED_ARTISTS_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    },

    /**
     * Replaces the blocked artists list.
     * @param {Array} artists - Array of artist objects to block.
     * @returns {void}
     */
    setBlockedArtists(artists) {
        localStorage.setItem(this.BLOCKED_ARTISTS_KEY, JSON.stringify(artists));
    },

    /**
     * Returns whether the given artist ID is blocked.
     * @param {string|number} artistId - The artist ID to check.
     * @returns {boolean}
     */
    isArtistBlocked(artistId) {
        if (!artistId) return false;
        return this.getBlockedArtists().some((a) => String(a.id) === String(artistId));
    },

    /**
     * Adds an artist to the blocked list if not already present.
     * @param {object} artist - The artist object with at least an `id` property.
     * @returns {void}
     */
    blockArtist(artist) {
        if (!artist || !artist.id) return;
        const blocked = this.getBlockedArtists();
        if (!blocked.some((a) => String(a.id) === String(artist.id))) {
            blocked.push({
                id: artist.id,
                name: artist.name || 'Unknown Artist',
                blockedAt: Date.now(),
            });
            this.setBlockedArtists(blocked);
        }
    },

    /**
     * Removes an artist from the blocked list.
     * @param {string|number} artistId - The ID of the artist to unblock.
     * @returns {void}
     */
    unblockArtist(artistId) {
        const blocked = this.getBlockedArtists().filter((a) => String(a.id) !== String(artistId));
        this.setBlockedArtists(blocked);
    },

    /**
     * Gets the list of blocked tracks.
     * @returns {Array} Array of blocked track objects.
     */
    getBlockedTracks() {
        try {
            const data = localStorage.getItem(this.BLOCKED_TRACKS_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    },

    /**
     * Replaces the blocked tracks list.
     * @param {Array} tracks - Array of track objects to block.
     * @returns {void}
     */
    setBlockedTracks(tracks) {
        localStorage.setItem(this.BLOCKED_TRACKS_KEY, JSON.stringify(tracks));
    },

    /**
     * Returns whether the given track ID is blocked.
     * @param {string|number} trackId - The track ID to check.
     * @returns {boolean}
     */
    isTrackBlocked(trackId) {
        if (!trackId) return false;
        return this.getBlockedTracks().some((t) => String(t.id) === String(trackId));
    },

    /**
     * Adds a track to the blocked list if not already present.
     * @param {object} track - The track object with at least an `id` property.
     * @returns {void}
     */
    blockTrack(track) {
        if (!track || !track.id) return;
        const blocked = this.getBlockedTracks();
        if (!blocked.some((t) => String(t.id) === String(track.id))) {
            blocked.push({
                id: track.id,
                title: track.title || 'Unknown Track',
                artist: track.artist?.name || track.artist || 'Unknown Artist',
                blockedAt: Date.now(),
            });
            this.setBlockedTracks(blocked);
        }
    },

    /**
     * Removes a track from the blocked list.
     * @param {string|number} trackId - The ID of the track to unblock.
     * @returns {void}
     */
    unblockTrack(trackId) {
        const blocked = this.getBlockedTracks().filter((t) => String(t.id) !== String(trackId));
        this.setBlockedTracks(blocked);
    },

    /**
     * Gets the list of blocked albums.
     * @returns {Array} Array of blocked album objects.
     */
    getBlockedAlbums() {
        try {
            const data = localStorage.getItem(this.BLOCKED_ALBUMS_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    },

    /**
     * Replaces the blocked albums list.
     * @param {Array} albums - Array of album objects to block.
     * @returns {void}
     */
    setBlockedAlbums(albums) {
        localStorage.setItem(this.BLOCKED_ALBUMS_KEY, JSON.stringify(albums));
    },

    /**
     * Returns whether the given album ID is blocked.
     * @param {string|number} albumId - The album ID to check.
     * @returns {boolean}
     */
    isAlbumBlocked(albumId) {
        if (!albumId) return false;
        return this.getBlockedAlbums().some((a) => String(a.id) === String(albumId));
    },

    /**
     * Adds an album to the blocked list if not already present.
     * @param {object} album - The album object with at least an `id` property.
     * @returns {void}
     */
    blockAlbum(album) {
        if (!album || !album.id) return;
        const blocked = this.getBlockedAlbums();
        if (!blocked.some((a) => String(a.id) === String(album.id))) {
            blocked.push({
                id: album.id,
                title: album.title || 'Unknown Album',
                artist: album.artist?.name || album.artist || 'Unknown Artist',
                blockedAt: Date.now(),
            });
            this.setBlockedAlbums(blocked);
        }
    },

    /**
     * Removes an album from the blocked list.
     * @param {string|number} albumId - The ID of the album to unblock.
     * @returns {void}
     */
    unblockAlbum(albumId) {
        const blocked = this.getBlockedAlbums().filter((a) => String(a.id) !== String(albumId));
        this.setBlockedAlbums(blocked);
    },

    /**
     * Returns whether a track should be hidden due to blocking rules.
     * @param {object} track - The track object to evaluate.
     * @returns {boolean}
     */
    // Check if track should be hidden (blocked track or by blocked artist)
    shouldHideTrack(track) {
        if (!track) return true;
        if (this.isTrackBlocked(track.id)) return true;
        if (track.artist?.id && this.isArtistBlocked(track.artist.id)) return true;
        if (track.artists?.some((a) => this.isArtistBlocked(a.id))) return true;
        if (track.album?.id && this.isAlbumBlocked(track.album.id)) return true;
        return false;
    },

    /**
     * Returns whether an album should be hidden due to blocking rules.
     * @param {object} album - The album object to evaluate.
     * @returns {boolean}
     */
    // Check if album should be hidden
    shouldHideAlbum(album) {
        if (!album) return true;
        if (this.isAlbumBlocked(album.id)) return true;
        if (album.artist?.id && this.isArtistBlocked(album.artist.id)) return true;
        if (album.artists?.some((a) => this.isArtistBlocked(a.id))) return true;
        return false;
    },

    /**
     * Returns whether an artist should be hidden due to blocking rules.
     * @param {object} artist - The artist object to evaluate.
     * @returns {boolean}
     */
    // Check if artist should be hidden
    shouldHideArtist(artist) {
        if (!artist) return true;
        return this.isArtistBlocked(artist.id);
    },

    /**
     * Filters an array of tracks, removing any that should be hidden.
     * @param {Array} tracks - The tracks array to filter.
     * @returns {Array} Filtered tracks array.
     */
    // Filter arrays
    filterTracks(tracks) {
        return tracks.filter((t) => !this.shouldHideTrack(t));
    },

    /**
     * Filters an array of albums, removing any that should be hidden.
     * @param {Array} albums - The albums array to filter.
     * @returns {Array} Filtered albums array.
     */
    filterAlbums(albums) {
        return albums.filter((a) => !this.shouldHideAlbum(a));
    },

    /**
     * Filters an array of artists, removing any that should be hidden.
     * @param {Array} artists - The artists array to filter.
     * @returns {Array} Filtered artists array.
     */
    filterArtists(artists) {
        return artists.filter((a) => !this.shouldHideArtist(a));
    },

    /**
     * Gets the total count of all blocked items across artists, tracks, and albums.
     * @returns {number} Total blocked item count.
     */
    // Get all blocked items count
    getTotalBlockedCount() {
        return this.getBlockedArtists().length + this.getBlockedTracks().length + this.getBlockedAlbums().length;
    },

    /**
     * Removes all blocked artists, tracks, and albums from storage.
     * @returns {void}
     */
    // Clear all blocked items
    clearAllBlocked() {
        localStorage.removeItem(this.BLOCKED_ARTISTS_KEY);
        localStorage.removeItem(this.BLOCKED_TRACKS_KEY);
        localStorage.removeItem(this.BLOCKED_ALBUMS_KEY);
    },
};

export const keyboardShortcuts = {
    STORAGE_KEY: 'keyboard-shortcuts',

    DEFAULT_SHORTCUTS: {
        playPause: { key: ' ', shift: false, ctrl: false, alt: false, description: 'Play / Pause' },
        seekForward: { key: 'arrowright', shift: false, ctrl: false, alt: false, description: 'Seek forward 10s' },
        seekBackward: { key: 'arrowleft', shift: false, ctrl: false, alt: false, description: 'Seek backward 10s' },
        nextTrack: { key: 'arrowright', shift: true, ctrl: false, alt: false, description: 'Next track' },
        previousTrack: { key: 'arrowleft', shift: true, ctrl: false, alt: false, description: 'Previous track' },
        volumeUp: { key: 'arrowup', shift: false, ctrl: false, alt: false, description: 'Volume up' },
        volumeDown: { key: 'arrowdown', shift: false, ctrl: false, alt: false, description: 'Volume down' },
        mute: { key: 'm', shift: false, ctrl: false, alt: false, description: 'Mute / Unmute' },
        shuffle: { key: 's', shift: false, ctrl: false, alt: false, description: 'Toggle shuffle' },
        repeat: { key: 'r', shift: false, ctrl: false, alt: false, description: 'Toggle repeat' },
        queue: { key: 'q', shift: false, ctrl: false, alt: false, description: 'Open queue' },
        lyrics: { key: 'l', shift: false, ctrl: false, alt: false, description: 'Toggle lyrics' },
        search: { key: '/', shift: false, ctrl: false, alt: false, description: 'Focus search' },
        escape: { key: 'escape', shift: false, ctrl: false, alt: false, description: 'Close modals' },
        visualizerNext: { key: ']', shift: false, ctrl: false, alt: false, description: 'Next visualizer preset' },
        visualizerPrev: { key: '[', shift: false, ctrl: false, alt: false, description: 'Previous visualizer preset' },
        visualizerCycle: {
            key: '\\',
            shift: false,
            ctrl: false,
            alt: false,
            description: 'Toggle visualizer auto-cycle',
        },
        multiSelectToggle: {
            key: 'control',
            shift: false,
            ctrl: true,
            alt: false,
            description: 'Toggle track selection (individual)',
        },
        multiSelectRange: { key: 'shift', shift: true, ctrl: false, alt: false, description: 'Select track range' },
    },

    /**
     * Gets the current keyboard shortcuts map (merged with defaults).
     * @returns {Object} Map of action names to shortcut objects.
     */
    getShortcuts() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
                    return parsed;
                }
            }
        } catch (e) {
            console.warn('Failed to load keyboard shortcuts:', e);
        }
        return this.getDefaultShortcuts();
    },

    /**
     * Returns a copy of the default keyboard shortcuts map.
     * @returns {Object} Default shortcuts map.
     */
    getDefaultShortcuts() {
        return { ...this.DEFAULT_SHORTCUTS };
    },

    /**
     * Saves a custom shortcut for the given action.
     * @param {string} action - The action name to update.
     * @param {Object} shortcut - The shortcut definition to save.
     * @returns {void}
     */
    setShortcut(action, shortcut) {
        const shortcuts = this.getShortcuts();
        const defaults = this.DEFAULT_SHORTCUTS;
        shortcuts[action] = {
            ...(defaults[action] || {}),
            ...shortcut,
        };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(shortcuts));
    },

    /**
     * Resets all keyboard shortcuts to their defaults.
     * @returns {void}
     */
    resetShortcuts() {
        localStorage.removeItem(this.STORAGE_KEY);
    },

    /**
     * Gets the shortcut definition for a specific action.
     * @param {string} action - The action name to look up.
     * @returns {Object} Shortcut object for the action.
     */
    getShortcutForAction(action) {
        const shortcuts = this.getShortcuts();
        return shortcuts[action] || this.DEFAULT_SHORTCUTS[action];
    },
};
