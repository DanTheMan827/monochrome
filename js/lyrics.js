// @ts-check
//js/lyrics.js
import { getTrackTitle, getTrackArtists, buildTrackFilename } from './utils.js';
import {
    SVG_CLOSE,
    SVG_GENIUS_ACTIVE,
    SVG_GENIUS_INACTIVE,
    SVG_MINUS,
    SVG_PLUS,
    SVG_RESET,
    SVG_GLOBE,
} from './icons.js';
import { sidePanelManager } from './side-panel.js';

const loadAmLyrics = () => {
    const images = Array.from(document.images).filter((img) => !img.complete);
    if (images.length === 0) {
        import('@uimaxbai/am-lyrics/am-lyrics.js').catch(console.error);
    } else {
        void Promise.all(
            images.map(
                (img) =>
                    new Promise((res) => {
                        img.onload = img.onerror = res;
                    })
            )
        ).then(() => import('@uimaxbai/am-lyrics/am-lyrics.js').catch(console.error));
    }
};

if (document.readyState === 'complete') {
    loadAmLyrics();
} else {
    window.addEventListener('load', loadAmLyrics);
}

// Check if text contains Japanese, Chinese, or Korean characters
/**
 * Checks whether the given text contains any CJK (Japanese, Chinese, or Korean) characters.
 *
 * @param {string|null|undefined} text - The text to test.
 * @returns {boolean} `true` if the text contains at least one Asian character.
 */
function containsAsianText(text) {
    if (!text) return false;
    // Japanese: Hiragana (3040-309F), Katakana (30A0-30FF), Kanji (4E00-9FFF, 3400-4DBF)
    // Chinese: CJK Unified Ideographs (4E00-9FFF, 3400-4DBF)
    // Korean: Hangul (AC00-D7AF, 1100-11FF, 3130-318F)
    const asianRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\u3400-\u4DBF\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/;
    return asianRegex.test(text);
}

// Check if track has Asian text in title or artist names
/**
 * Returns whether a track's title or artist name contains any CJK characters.
 *
 * @param {object|null|undefined} track - The track to inspect.
 * @returns {boolean} `true` if the title or artist contains Asian text.
 */
function trackHasAsianText(track) {
    if (!track) return false;
    const title = track.title || '';
    const artist = getTrackArtists(track) || '';
    return containsAsianText(title) || containsAsianText(artist);
}

/**
 * Removes emoji, symbols, and version tags from a search string to improve
 * results when querying lyric providers for tracker-sourced tracks.
 *
 * @param {string|null|undefined} text - Raw search text to clean.
 * @returns {string} The sanitized search string.
 */
function cleanTrackerSearch(text) {
    if (!text) return '';
    // chud emojis will NOT be tolerated in my precious genius lyrics worker
    let cleaned = text.replace(
        /[\p{Extended_Pictographic}\p{Emoji_Component}\p{Emoji_Presentation}\p{Emoji_Modifier}\p{Emoji_Modifier_Base}\p{Symbol}]/gu,
        ''
    );

    cleaned = cleaned.replace(/[\u2600-\u27BF\u2B50\u2B06\u2194\u21AA\u2934\u203C\u2049\u3030\u303D\u3297\u3299]/g, '');

    cleaned = cleaned.replace(/\[v\s*\d+\s*\]/gi, '');

    cleaned = cleaned.replace(/\s+/g, ' ');

    return cleaned.trim();
}

/**
 * Interfaces with the Genius API to search for songs, fetch lyric annotations
 * (referents), and cache results per track.
 */
class GeniusManager {
    /**
     * Creates a new GeniusManager with an empty result cache.
     */
    constructor() {
        this.cache = new Map();
        this.loading = false;
    }

    // idgaf anymore im js hardcoding this lmaooo
    /**
     * Returns the Genius API access token used for API requests.
     *
     * @returns {string} The Genius API bearer token.
     */
    getToken() {
        const hostname = window.location.hostname;
        if (hostname.endsWith('monochrome.tf') || hostname === 'monochrome.tf') {
            return 'OpITG-h86oehKYuJJ5QVY5F-HxUWXb31EwGKarx2Tle3W9rBUVnMaUL9qo_Oh9Q7';
        }
        return 'QmS9OvsS-7ifRBKx_ochIPQU7oejIS9Eo_z5iWHmCPyhwLVQID3pYTHJmJTa6z8z';
    }

    /**
     * Searches Genius for a song matching the given title and artist, returning
     * the best matching result object or `null` if nothing is found.
     *
     * @async
     * @param {string} title - The track title to search for.
     * @param {string} artist - The primary artist name.
     * @returns {Promise<object|null>} The Genius song result, or `null`.
     * @throws {Error} If the search request fails.
     */
    async searchTrack(title, artist) {
        const cleanTitle = title.split('(')[0].split('-')[0].trim();
        const query = encodeURIComponent(`${cleanTitle} ${artist}`);
        const token = this.getToken();

        const url = `https://api.genius.com/search?q=${query}&access_token=${token}`;
        const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);

        if (!response.ok) throw new Error('Failed to search Genius');

        const data = await response.json();
        if (data.response.hits.length === 0) return null;

        const normalize = (str) => str.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
        const targetArtist = normalize(artist);

        const hit = data.response.hits.find((h) => {
            const hitArtist = normalize(h.result.primary_artist.name);
            return hitArtist.includes(targetArtist) || targetArtist.includes(hitArtist);
        });

        return hit ? hit.result : data.response.hits[0].result;
    }

    /**
     * Fetches all Genius referents (annotated lyric fragments) for a given song.
     *
     * @async
     * @param {number|string} songId - The Genius song ID.
     * @returns {Promise<object[]>} Array of referent objects containing fragment text and annotations.
     * @throws {Error} If the referents request fails.
     */
    async getReferents(songId) {
        const token = this.getToken();
        const url = `https://api.genius.com/referents?song_id=${songId}&text_format=plain&per_page=50&access_token=${token}`;
        const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);

        if (!response.ok) throw new Error('Failed to fetch annotations');

        const data = await response.json();
        return data.response.referents;
    }

    /**
     * Retrieves Genius song data and referents for a track, using the in-memory
     * cache to avoid redundant API calls.
     *
     * @async
     * @param {object} track - The track to look up. Must have `id`, `title`, and `artists`/`artist`.
     * @returns {Promise<{song: object, referents: object[]}|null>} Combined song/referents data,
     *   or `null` if the track was not found on Genius.
     * @throws {Error} If either the search or referents request fails.
     */
    async getDataForTrack(track) {
        if (this.cache.has(track.id)) return this.cache.get(track.id);

        try {
            this.loading = true;
            const artist = Array.isArray(track.artists) ? track.artists[0].name : track.artist.name;
            const song = await this.searchTrack(track.title, artist);

            if (!song) {
                this.loading = false;
                return null;
            }

            const referents = await this.getReferents(song.id);
            const result = { song, referents };

            this.cache.set(track.id, result);
            this.loading = false;
            return result;
        } catch (error) {
            console.error('Genius Error:', error);
            this.loading = false;
            throw error;
        }
    }

    /**
     * Finds all Genius referents whose annotated fragment overlaps with the
     * given lyric line using fuzzy word-set matching.
     *
     * @param {string} lineText - The lyric line text to match against.
     * @param {object[]|null|undefined} referents - The array of Genius referents to search.
     * @returns {object[]} Referents whose fragment matches the line.
     */
    findAnnotations(lineText, referents) {
        if (!referents || !lineText) return [];

        const normalize = (str) =>
            str
                .toLowerCase()
                .replace(/[^\p{L}\p{N}\s]/gu, '')
                .replace(/\s+/g, ' ')
                .trim();
        const normLine = normalize(lineText);

        const getWordSet = (str) => new Set(str.split(' ').filter((w) => w.length > 0));
        const lineWords = getWordSet(normLine);

        return referents.filter((ref) => {
            const normFragment = normalize(ref.fragment);

            if (normLine.includes(normFragment) || normFragment.includes(normLine)) return true;

            const fragmentWords = getWordSet(normFragment);
            if (fragmentWords.size === 0 || lineWords.size === 0) return false;

            let matchCount = 0;
            fragmentWords.forEach((w) => {
                if (lineWords.has(w)) matchCount++;
            });

            return matchCount / Math.min(fragmentWords.size, lineWords.size) > 0.6;
        });
    }
}

/**
 * Manages lyrics display, synchronisation, Romaji conversion, and Genius
 * annotation overlays for the currently playing track.
 *
 * Use the static {@link LyricsManager.initialize} factory to create the singleton
 * instance, and {@link LyricsManager.instance} to access it afterwards.
 */
export class LyricsManager {
    static #instance = null;

    /**
     * Returns the singleton LyricsManager instance.
     *
     * @returns {LyricsManager} The active singleton instance.
     * @throws {Error} If {@link LyricsManager.initialize} has not been called yet.
     */
    static get instance() {
        if (!LyricsManager.#instance) {
            throw new Error('LyricsManager is not initialized. Call LyricsManager.initialize() first.');
        }
        return LyricsManager.#instance;
    }

    /**
     * Creates a new LyricsManager. Use {@link LyricsManager.initialize} instead
     * of calling this constructor directly.
     *
     * @param {object} api - The music API instance used to resolve track metadata.
     */
    constructor(api) {
        this.api = api;
        this.currentLyrics = null;
        this.syncedLyrics = [];
        this.lyricsCache = new Map();
        this.componentLoaded = false;
        this.amLyricsElement = null;
        this.animationFrameId = null;
        this.currentTrackId = null;
        this.mutationObserver = null;
        this.romajiObserver = null;
        this.isRomajiMode = false;
        this.originalLyricsData = null;
        this.kuroshiroLoaded = false;
        this.kuroshiroLoading = false;
        this.romajiTextCache = new Map(); // Cache: originalText -> convertedRomaji
        this.convertedTracksCache = new Set(); // Track IDs that have been fully converted
        this.geniusManager = new GeniusManager();
        this.isGeniusMode = false;
        this.currentGeniusData = null;
        this.timingOffset = 0; // Offset in milliseconds (positive = delay lyrics, negative = advance lyrics)
    }

    /**
     * Creates and stores the singleton LyricsManager instance.
     *
     * @async
     * @param {object} api - The music API instance to pass to the constructor.
     * @returns {Promise<LyricsManager>} The newly created singleton instance.
     * @throws {Error} If a singleton instance already exists.
     */
    static async initialize(api) {
        if (LyricsManager.#instance) {
            throw new Error('LyricsManager is already initialized');
        }
        return (LyricsManager.#instance = new LyricsManager(api));
    }

    // Get timing offset for current track
    /**
     * Retrieves the persisted timing offset (in milliseconds) for the given track.
     * A positive value delays lyrics; a negative value advances them.
     *
     * @param {string|number} trackId - The track identifier.
     * @returns {number} The saved offset in milliseconds, or `0` if none is stored.
     */
    getTimingOffset(trackId) {
        try {
            const key = `lyrics-offset-${trackId}`;
            const stored = localStorage.getItem(key);
            return stored ? parseInt(stored, 10) : 0;
        } catch {
            return 0;
        }
    }

    // Set timing offset for current track
    /**
     * Persists a timing offset for the given track to localStorage.
     *
     * @param {string|number} trackId - The track identifier.
     * @param {number} offsetMs - The offset in milliseconds to save.
     */
    setTimingOffset(trackId, offsetMs) {
        try {
            const key = `lyrics-offset-${trackId}`;
            localStorage.setItem(key, offsetMs.toString());
        } catch (e) {
            console.warn('Failed to save lyrics timing offset:', e);
        }
    }

    // Reset timing offset for current track
    /**
     * Resets the timing offset for the given track to zero.
     *
     * @param {string|number} trackId - The track identifier whose offset to clear.
     */
    resetTimingOffset(trackId) {
        this.setTimingOffset(trackId, 0);
    }

    // Get formatted offset display string
    /**
     * Formats an offset value in milliseconds as a human-readable string
     * (e.g. `'+1.5s'` or `'-0.5s'`).
     *
     * @param {number} offsetMs - The offset in milliseconds.
     * @returns {string} The formatted offset string including sign and unit.
     */
    getOffsetDisplayString(offsetMs) {
        const sign = offsetMs >= 0 ? '+' : '';
        const seconds = Math.abs(offsetMs) / 1000;
        return `${sign}${seconds.toFixed(1)}s`;
    }

    // Load Kuroshiro from CDN (npm package uses Node.js path which doesn't work in browser)
    /**
     * Lazily loads the Kuroshiro Japanese-to-Romaji converter and its Kuromoji
     * analyzer from CDN, patching XHR and fetch to redirect dictionary requests.
     * Subsequent calls return immediately if already loaded.
     *
     * @async
     * @returns {Promise<boolean>} `true` if Kuroshiro is ready, `false` on failure.
     */
    async loadKuroshiro() {
        if (this.kuroshiroLoaded) return true;
        if (this.kuroshiroLoading) {
            // Wait for existing load to complete
            return new Promise((resolve) => {
                const checkLoad = setInterval(() => {
                    if (!this.kuroshiroLoading) {
                        clearInterval(checkLoad);
                        resolve(this.kuroshiroLoaded);
                    }
                }, 100);
            });
        }

        this.kuroshiroLoading = true;
        try {
            // Bug on kuromoji@0.1.2 where it mangles absolute URLs
            // Using self-hosted dict files is failed, so we use CDN with monkey-patch
            // Monkey-patch XMLHttpRequest to redirect dictionary requests to CDN
            // Kuromoji uses XHR, not fetch, for loading dictionary files
            if (!window._originalXHROpen) {
                // eslint-disable-next-line @typescript-eslint/unbound-method
                window._originalXHROpen = XMLHttpRequest.prototype.open;
                XMLHttpRequest.prototype.open = function (method, url, ...rest) {
                    const urlStr = url.toString();
                    if (urlStr.includes('/dict/') && urlStr.includes('.dat.gz')) {
                        // Extract just the filename
                        const filename = urlStr.split('/').pop();
                        // Redirect to CDN
                        const cdnUrl = `https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict/${filename}`;
                        return window._originalXHROpen.call(this, method, cdnUrl, ...rest);
                    }
                    return window._originalXHROpen.call(this, method, url, ...rest);
                };
            }

            // Also patch fetch just in case
            if (!window._originalFetch) {
                window._originalFetch = window.fetch;
                window.fetch = async (url, options) => {
                    const urlStr = url instanceof Request ? url.url : String(url);
                    if (urlStr.includes('/dict/') && urlStr.includes('.dat.gz')) {
                        const filename = urlStr.split('/').pop();
                        const cdnUrl = `https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict/${filename}`;
                        console.log(`Redirecting dict fetch: ${filename} -> CDN`);
                        return window._originalFetch(cdnUrl, options);
                    }
                    return window._originalFetch(url, options);
                };
            }

            // Load Kuroshiro from CDN
            if (!window.Kuroshiro) {
                await this.loadScript('https://cdn.jsdelivr.net/npm/kuroshiro@1.2.0/dist/kuroshiro.min.js');
            }

            // Load Kuromoji analyzer from CDN
            if (!window.KuromojiAnalyzer) {
                await this.loadScript(
                    'https://cdn.jsdelivr.net/npm/kuroshiro-analyzer-kuromoji@1.1.0/dist/kuroshiro-analyzer-kuromoji.min.js'
                );
            }

            // Initialize Kuroshiro (CDN version exports as .default)
            const Kuroshiro = window.Kuroshiro.default || window.Kuroshiro;
            const KuromojiAnalyzer = window.KuromojiAnalyzer.default || window.KuromojiAnalyzer;

            this.kuroshiro = new Kuroshiro();

            // Initialize with a dummy path - our fetch interceptor will redirect to CDN
            await this.kuroshiro.init(
                new KuromojiAnalyzer({
                    dictPath: '/dict/', // This gets mangled but our interceptor fixes it
                })
            );

            this.kuroshiroLoaded = true;
            this.kuroshiroLoading = false;
            console.log('✓ Kuroshiro loaded and initialized successfully');
            return true;
        } catch (error) {
            console.error('✗ Failed to load Kuroshiro:', error);
            this.kuroshiroLoaded = false;
            this.kuroshiroLoading = false;
            return false;
        }
    }

    // Helper to load external scripts
    /**
     * Dynamically inserts a `<script>` tag for the given URL and resolves when
     * the script has loaded. Skips insertion if the script is already present.
     *
     * @param {string} src - The URL of the script to load.
     * @returns {Promise<void>} Resolves on successful load.
     * @throws {Error} If the script fails to load.
     */
    loadScript(src) {
        return new Promise((resolve, reject) => {
            // Check if script already exists
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.onload = /** @type {(this: GlobalEventHandlers, ev: Event) => void} */ (
                /** @type {unknown} */ (resolve)
            );
            script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
            document.head.appendChild(script);
        });
    }

    // Check if text contains Japanese characters
    /**
     * Tests whether the given text contains any Japanese characters (Hiragana,
     * Katakana, or Kanji).
     *
     * @param {string|null|undefined} text - The text to test.
     * @returns {boolean} `true` if Japanese characters are present.
     */
    containsJapanese(text) {
        if (!text) return false;
        // Match any Japanese character (Hiragana, Katakana, Kanji)
        return /[\u3040-\u30FF\u31F0-\u9FFF]/.test(text);
    }

    // Convert Japanese text to Romaji (including Kanji) with caching
    /**
     * Converts Japanese text (including Kanji) to Hepburn Romaji using Kuroshiro,
     * with results cached per unique input string. Non-Asian text is returned as-is.
     *
     * @async
     * @param {string} text - The text to convert.
     * @returns {Promise<string>} The converted Romaji text, or the original if
     *   conversion is unavailable or not needed.
     */
    async convertToRomaji(text) {
        if (!text) return text;

        // Check cache first
        if (this.romajiTextCache.has(text)) {
            return this.romajiTextCache.get(text);
        }

        // Only process if text contains Asian characters
        if (!containsAsianText(text)) {
            return text;
        }

        // Make sure Kuroshiro is loaded
        if (!this.kuroshiroLoaded) {
            const success = await this.loadKuroshiro();
            if (!success) {
                console.warn('Kuroshiro not available, skipping conversion');
                return text;
            }
        }

        if (!this.kuroshiro) {
            console.warn('Kuroshiro not available, skipping conversion');
            return text;
        }

        try {
            // Convert to Romaji using Kuroshiro (handles Kanji, Hiragana, Katakana)
            const result = await this.kuroshiro.convert(text, {
                to: 'romaji',
                mode: 'spaced',
                romajiSystem: 'hepburn',
            });
            // Cache the result
            this.romajiTextCache.set(text, result);
            return result;
        } catch (error) {
            console.warn('Romaji conversion failed for text:', text.substring(0, 30), error);
            return text;
        }
    }

    // Set Romaji mode and save preference
    /**
     * Enables or disables Romaji conversion mode and persists the preference
     * to localStorage.
     *
     * @param {boolean} enabled - `true` to enable Romaji mode, `false` to disable.
     */
    setRomajiMode(enabled) {
        this.isRomajiMode = enabled;
        try {
            localStorage.setItem('lyricsRomajiMode', enabled ? 'true' : 'false');
        } catch (e) {
            console.warn('Failed to save Romaji mode preference:', e);
        }
    }

    // Get saved Romaji mode preference
    /**
     * Reads the persisted Romaji mode preference from localStorage.
     *
     * @returns {boolean} `true` if Romaji mode was previously enabled.
     */
    getRomajiMode() {
        try {
            return localStorage.getItem('lyricsRomajiMode') === 'true';
        } catch {
            return false;
        }
    }

    /**
     * Waits for the `am-lyrics` custom element to be defined and marks the
     * component as loaded. Safe to call multiple times.
     *
     * @async
     * @returns {Promise<void>}
     */
    async ensureComponentLoaded() {
        if (this.componentLoaded) return;

        if (typeof customElements !== 'undefined') {
            await customElements.whenDefined('am-lyrics');
            this.componentLoaded = true;
        }
    }

    /**
     * Fetches synced lyrics for the given track from LRCLIB and caches the result.
     * Returns `null` when no synced lyrics are available or the fetch fails.
     *
     * @async
     * @param {string|number} trackId - The unique track identifier used as a cache key.
     * @param {object|null} [track=null] - The track object containing metadata for the query.
     * @returns {Promise<{subtitles: string, lyricsProvider: string}|null>} Lyrics data or `null`.
     */
    async fetchLyrics(trackId, track = null) {
        if (track) {
            if (this.lyricsCache.has(trackId)) {
                return this.lyricsCache.get(trackId);
            }

            try {
                const artist = Array.isArray(track.artists)
                    ? track.artists.map((a) => a.name || a).join(', ')
                    : track.artist?.name || '';
                const title = track.title || '';
                const album = track.album?.title || '';
                const duration = track.duration ? Math.round(track.duration) : null;

                if (!title || !artist) {
                    console.warn('Missing required fields for LRCLIB');
                    return null;
                }

                const params = new URLSearchParams({
                    track_name: title,
                    artist_name: artist,
                });

                if (album) params.append('album_name', album);
                if (duration) params.append('duration', duration.toString());

                const response = await fetch(`https://lrclib.net/api/get?${params.toString()}`);

                if (response.ok) {
                    const data = await response.json();

                    if (data.syncedLyrics) {
                        const lyricsData = {
                            subtitles: data.syncedLyrics,
                            lyricsProvider: 'LRCLIB',
                        };

                        this.lyricsCache.set(trackId, lyricsData);
                        return lyricsData;
                    }
                }
            } catch (error) {
                console.warn('LRCLIB fetch failed:', error);
            }
        }

        return null;
    }

    /**
     * Parses an LRC-format synced lyrics string into an array of timed lines.
     *
     * @param {string|null|undefined} subtitles - The raw LRC subtitle text.
     * @returns {Array<{time: number, text: string}>} Parsed lines with timestamps in seconds.
     */
    parseSyncedLyrics(subtitles) {
        if (!subtitles) return [];
        const lines = subtitles.split('\n').filter((line) => line.trim());
        return lines
            .map((line) => {
                const match = line.match(/\[(\d+):(\d+)\.(\d+)\]\s*(.+)/);
                if (match) {
                    const [, minutes, seconds, centiseconds, text] = match;
                    const timeInSeconds = parseInt(minutes) * 60 + parseInt(seconds) + parseInt(centiseconds) / 100;
                    return { time: timeInSeconds, text: text.trim() };
                }
                return null;
            })
            .filter(Boolean);
    }

    /**
     * Builds a full LRC file string from lyrics data and track metadata,
     * including standard LRC header tags.
     *
     * @param {{subtitles: string, lyricsProvider: string}|null} lyricsData - The lyrics data object.
     * @param {object} track - The track object used for header metadata.
     * @returns {string|null} The formatted LRC content, or `null` if no lyrics are available.
     */
    generateLRCContent(lyricsData, track) {
        if (!lyricsData || !lyricsData.subtitles) return null;

        const trackTitle = getTrackTitle(track);
        const trackArtist = getTrackArtists(track);

        let lrc = `[ti:${trackTitle}]\n`;
        lrc += `[ar:${trackArtist}]\n`;
        lrc += `[al:${track.album?.title || 'Unknown Album'}]\n`;
        lrc += `[by:${lyricsData.lyricsProvider || 'Unknown'}]\n`;
        lrc += '\n';
        lrc += lyricsData.subtitles;

        return lrc;
    }

    /**
     * Creates a downloadable `File` object containing the LRC lyrics for the track.
     * Alerts the user and returns `undefined` if no synced lyrics are available.
     *
     * @param {{subtitles: string, lyricsProvider: string}|null} lyricsData - The lyrics data object.
     * @param {object} track - The track object used to generate the filename.
     * @returns {File|undefined} A `File` with `.lrc` extension, or `undefined`.
     */
    getLRC(lyricsData, track) {
        const lrcContent = this.generateLRCContent(lyricsData, track);
        if (!lrcContent) {
            alert('No synced lyrics available for this track');
            return;
        }

        return new File([lrcContent], buildTrackFilename(track, 'LOSSLESS').replace(/\.flac$/, '.lrc'), {
            type: 'application/octet-stream',
        });
    }

    /**
     * Triggers a browser download of the LRC lyrics file for the given track.
     *
     * @param {{subtitles: string, lyricsProvider: string}|null} lyricsData - The lyrics data object.
     * @param {object} track - The track object used to generate the filename.
     */
    downloadLRC(lyricsData, track) {
        const blob = this.getLRC(lyricsData, track);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = blob.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Returns the index of the synced lyric line that corresponds to the given
     * playback time. Returns `-1` if no line has been reached yet.
     *
     * @param {number} currentTime - The current playback position in seconds.
     * @returns {number} Zero-based index of the active lyric line, or `-1`.
     */
    getCurrentLine(currentTime) {
        if (!this.syncedLyrics || this.syncedLyrics.length === 0) return -1;
        let currentIndex = -1;
        for (let i = 0; i < this.syncedLyrics.length; i++) {
            if (currentTime >= this.syncedLyrics[i].time) {
                currentIndex = i;
            } else {
                break;
            }
        }
        return currentIndex;
    }

    // Setup MutationObserver to convert lyrics in am-lyrics component
    /**
     * Attaches a MutationObserver to the `am-lyrics` element (or its shadow root)
     * that automatically re-applies Romaji conversion and Genius annotations
     * whenever the lyrics content changes.
     *
     * @async
     * @param {Element|null} amLyricsElement - The `<am-lyrics>` custom element to observe.
     * @returns {Promise<void>}
     */
    async setupLyricsObserver(amLyricsElement) {
        this.stopLyricsObserver();

        if (!amLyricsElement) return;

        // Check for shadow DOM
        const observeRoot = amLyricsElement.shadowRoot || amLyricsElement;

        this.romajiObserver = new MutationObserver((mutations) => {
            // Check if any relevant mutation occurred
            const hasRelevantChange = mutations.some((mutation) => {
                if (mutation.type === 'childList') {
                    let relevant = false;
                    if (mutation.addedNodes.length > 0) {
                        for (const node of mutation.addedNodes) {
                            if (
                                node.nodeType === Node.ELEMENT_NODE &&
                                /** @type {Element} */ (node).classList.contains('genius-indicator')
                            )
                                continue;
                            relevant = true;
                            break;
                        }
                    }
                    if (!relevant && mutation.removedNodes.length > 0) {
                        for (const node of mutation.removedNodes) {
                            if (
                                node.nodeType === Node.ELEMENT_NODE &&
                                /** @type {Element} */ (node).classList.contains('genius-indicator')
                            )
                                continue;
                            relevant = true;
                            break;
                        }
                    }
                    return relevant;
                }
                if (mutation.type === 'characterData') return true;
                return false;
            });

            if (!hasRelevantChange) {
                return;
            }

            // Debounce mutations
            if (this.observerTimeout) {
                clearTimeout(this.observerTimeout);
            }
            this.observerTimeout = setTimeout(async () => {
                if (this.isRomajiMode) {
                    await this.convertLyricsContent(amLyricsElement);
                }
                if (this.isGeniusMode && this.currentGeniusData) {
                    await this.applyGeniusAnnotations(amLyricsElement, this.currentGeniusData.referents);
                }
            }, 100);
        });

        // Observe all child nodes for changes (in shadow DOM if it exists)
        // Watch for new nodes AND text content changes to catch when lyrics refresh
        this.romajiObserver.observe(observeRoot, {
            childList: true,
            subtree: true,
            characterData: true, // Watch text changes to catch lyric refreshes
            attributes: false, // Don't watch attribute changes (highlight, etc)
        });

        // Initial conversion if Romaji mode is enabled - single attempt, no periodic polling
        if (this.isRomajiMode) {
            await this.convertLyricsContent(amLyricsElement);
        }
        if (this.isGeniusMode && this.currentGeniusData) {
            await this.applyGeniusAnnotations(amLyricsElement, this.currentGeniusData.referents);
        }
    }

    // Convert lyrics content to Romaji
    /**
     * Traverses all text nodes inside the `am-lyrics` element (or its shadow root)
     * and replaces Japanese text with its Romaji equivalent. Has no effect when
     * Romaji mode is disabled.
     *
     * @async
     * @param {Element|null} amLyricsElement - The `<am-lyrics>` element whose content to convert.
     * @returns {Promise<void>}
     */
    async convertLyricsContent(amLyricsElement) {
        if (!amLyricsElement || !this.isRomajiMode) {
            return;
        }

        // Find the root to traverse - check for shadow DOM first
        const rootToTraverse = amLyricsElement.shadowRoot || amLyricsElement;

        // Make sure Kuroshiro is ready
        if (!this.kuroshiroLoaded) {
            const success = await this.loadKuroshiro();
            if (!success) {
                console.warn('Cannot convert lyrics - Kuroshiro load failed');
                return;
            }
        }

        // Find all text nodes in the component
        const textNodes = [];
        const walker = document.createTreeWalker(rootToTraverse, NodeFilter.SHOW_TEXT, null);

        let node;
        while ((node = walker.nextNode())) {
            textNodes.push(node);
        }

        // Convert Japanese text to Romaji (using async/await for Kuroshiro)
        for (const textNode of textNodes) {
            if (!textNode.parentElement) {
                continue;
            }

            const parentTag = textNode.parentElement.tagName?.toLowerCase();
            const parentClass = String(textNode.parentElement.className || '');

            // Skip elements that shouldn't be converted
            const skipTags = ['script', 'style', 'code', 'input', 'textarea', 'time'];
            if (skipTags.includes(parentTag)) {
                continue;
            }

            const originalText = textNode.textContent;

            // Skip progress indicators and timestamps (but NOT progress-text which is the actual lyrics!)
            if (
                (parentClass.includes('progress') && !parentClass.includes('progress-text')) ||
                (parentClass.includes('time') && !parentClass.includes('progress-text')) ||
                parentClass.includes('timestamp')
            ) {
                continue;
            }

            if (!originalText || originalText.trim().length === 0) {
                continue;
            }

            // Check if contains Japanese - convert if we find Japanese
            if (this.containsJapanese(originalText)) {
                const romajiText = await this.convertToRomaji(originalText);

                // Only update if conversion produced different text
                if (romajiText && romajiText !== originalText) {
                    textNode.textContent = romajiText;
                }
            }
        }

        // Mark this track as converted
        if (this.currentTrackId) {
            this.convertedTracksCache.add(this.currentTrackId);
        }
    }

    // Stop the observer
    /**
     * Disconnects the active MutationObserver and cancels any debounced
     * conversion timeout.
     */
    stopLyricsObserver() {
        if (this.romajiObserver) {
            this.romajiObserver.disconnect();
            this.romajiObserver = null;
        }
        if (this.observerTimeout) {
            clearTimeout(this.observerTimeout);
            this.observerTimeout = null;
        }
    }

    // Toggle Romaji mode
    /**
     * Toggles Romaji conversion mode on or off, persisting the new state and
     * immediately converting/restoring the current lyrics display.
     *
     * @async
     * @param {Element|null} amLyricsElement - The `<am-lyrics>` element to update.
     * @returns {Promise<boolean>} The new Romaji mode state (`true` = enabled).
     */
    async toggleRomajiMode(amLyricsElement) {
        this.isRomajiMode = !this.isRomajiMode;
        this.setRomajiMode(this.isRomajiMode);

        if (amLyricsElement) {
            if (this.isRomajiMode) {
                // Turning ON: Setup observer and convert immediately
                await this.setupLyricsObserver(amLyricsElement);
                await this.convertLyricsContent(amLyricsElement);
            } else {
                // Turning OFF: Stop observer
                // Note: To restore original Japanese, we'd need to reload the component
                this.stopLyricsObserver();
            }
        }

        return this.isRomajiMode;
    }

    /**
     * Highlights lyric lines in the `am-lyrics` element that have matching
     * Genius annotations, adding indicator icons and multi-line span classes.
     *
     * @async
     * @param {Element|null} amLyricsElement - The `<am-lyrics>` element to annotate.
     * @param {object[]|null|undefined} referents - Genius referent objects to match against lyrics.
     * @returns {Promise<void>}
     */
    async applyGeniusAnnotations(amLyricsElement, referents) {
        if (!amLyricsElement || !referents) return;

        const root = amLyricsElement.shadowRoot || amLyricsElement;

        const lineElements = Array.from(root.querySelectorAll('p, .line, .lyric-line, .lrc-line'));

        if (lineElements.length === 0) return;

        lineElements.forEach((el) => {
            el.classList.remove('genius-annotated', 'genius-multi-start', 'genius-multi-end', 'genius-multi-mid');
            delete (/** @type {Element & { __geniusAnnotations?: Array<{id: string}> }} */ (el).__geniusAnnotations);
        });

        const normalize = (str) =>
            str
                .toLowerCase()
                .replace(/[^\p{L}\p{N}\s]/gu, '')
                .replace(/\s+/g, ' ')
                .trim();

        referents.forEach((ref) => {
            const fragment = normalize(ref.fragment);
            if (!fragment) return;

            for (let i = 0; i < lineElements.length; i++) {
                let combinedText = '';
                let currentLines = [];

                for (let j = i; j < lineElements.length; j++) {
                    const line = lineElements[j];

                    const lineClone = line.cloneNode(true);
                    /** @type {HTMLElement} */ (lineClone)
                        .querySelectorAll('.time, .timestamp, [class*="time"], .genius-indicator')
                        .forEach((n) => n.remove());
                    const text = normalize(lineClone.textContent || '');

                    if (!text) continue;

                    if (currentLines.length > 0) combinedText += ' ';
                    combinedText += text;
                    currentLines.push(line);

                    if (combinedText.includes(fragment)) {
                        currentLines.forEach((el, idx) => {
                            el.classList.add('genius-annotated');
                            if (
                                !(
                                    /** @type {Element & { __geniusAnnotations?: Array<{id: string}> }} */ (el)
                                        .__geniusAnnotations
                                )
                            )
                                /** @type {Element & { __geniusAnnotations?: Array<{id: string}> }} */ (
                                    el
                                ).__geniusAnnotations = [];

                            if (
                                !(
                                    /** @type {Element & { __geniusAnnotations?: Array<{id: string}> }} */ (
                                        el
                                    ).__geniusAnnotations.some((a) => a.id === ref.id)
                                )
                            ) {
                                /** @type {Element & { __geniusAnnotations?: Array<{id: string}> }} */ (
                                    el
                                ).__geniusAnnotations.push(ref);
                            }

                            if (currentLines.length > 1) {
                                if (idx === 0) el.classList.add('genius-multi-start');
                                else if (idx === currentLines.length - 1) el.classList.add('genius-multi-end');
                                else el.classList.add('genius-multi-mid');
                            }

                            if (!el.querySelector('.genius-indicator')) {
                                const smiley = document.createElement('span');
                                smiley.className = 'genius-indicator';
                                smiley.textContent = ' ☺';
                                smiley.style.color = '#ffff64';
                                smiley.style.marginLeft = '0.5em';
                                el.appendChild(smiley);
                            }
                        });
                        break;
                    }

                    if (combinedText.length > fragment.length + 50) break;
                }
            }
        });
    }
}

/**
 * Opens the lyrics side panel for the given track, rendering playback controls,
 * timing adjustments, Romaji toggle, and Genius annotation toggles.
 *
 * @param {object} track - The track to display lyrics for.
 * @param {HTMLMediaElement} audioPlayer - The active audio element for sync.
 * @param {LyricsManager|null} lyricsManager - An existing LyricsManager instance, or
 *   `null` to create a temporary one.
 * @param {boolean} [forceOpen=false] - If `true`, reopens the panel even if it is
 *   already showing lyrics for the same track.
 */
export function openLyricsPanel(track, audioPlayer, lyricsManager, forceOpen = false) {
    const manager = lyricsManager || new LyricsManager();

    // Load Kuroshiro in background only if track has Asian text and Romaji mode is enabled
    const isRomajiMode = manager.getRomajiMode();
    if (isRomajiMode && trackHasAsianText(track) && !manager.kuroshiroLoaded && !manager.kuroshiroLoading) {
        manager.loadKuroshiro().catch((err) => {
            console.warn('Failed to load Kuroshiro for Romaji conversion:', err);
        });
    }

    // Load saved timing offset for this track
    manager.timingOffset = manager.getTimingOffset(track.id);

    const renderControls = (container) => {
        const isRomajiMode = manager.getRomajiMode();
        manager.isRomajiMode = isRomajiMode;
        const isGeniusMode = manager.isGeniusMode;
        const offsetDisplay = manager.getOffsetDisplayString(manager.timingOffset);

        container.innerHTML = `
            <div class="lyrics-timing-controls">
                <button id="lyrics-timing-minus-btn" class="btn-icon" title="Decrease delay (lyrics earlier) -0.5s">
                    ${SVG_MINUS(18)}
                </button>
                <span id="lyrics-timing-display" class="lyrics-timing-display" title="Current timing offset">${offsetDisplay}</span>
                <button id="lyrics-timing-plus-btn" class="btn-icon" title="Increase delay (lyrics later) +0.5s">
                    ${SVG_PLUS(18)}
                </button>
                <button id="lyrics-timing-reset-btn" class="btn-icon" title="Reset timing offset">
                    ${SVG_RESET(16)}
                </button>
            </div>
            <button id="romaji-toggle-btn" class="btn-icon" title="Toggle Romaji (Japanese to Latin)" data-enabled="${isRomajiMode}" style="color: ${isRomajiMode ? 'var(--primary)' : ''}">
                ${SVG_GLOBE(20)}
            </button>
            <button id="genius-toggle-btn" class="btn-icon ${isGeniusMode ? 'active-genius' : ''}" title="Genius Mode" style="${isGeniusMode ? 'color: #ffff64;' : ''}">
                ${isGeniusMode ? SVG_GENIUS_ACTIVE(20) : SVG_GENIUS_INACTIVE(20)}
            </button>
            <button id="close-side-panel-btn" class="btn-icon" title="Close">
                ${SVG_CLOSE(20)}
            </button>
        `;

        container.querySelector('#close-side-panel-btn').addEventListener('click', () => {
            sidePanelManager.close();
            clearLyricsPanelSync(audioPlayer, sidePanelManager.panel);
        });

        // Timing adjustment controls
        const updateTimingDisplay = () => {
            const display = container.querySelector('#lyrics-timing-display');
            if (display) {
                display.textContent = manager.getOffsetDisplayString(manager.timingOffset);
            }
        };

        container.querySelector('#lyrics-timing-minus-btn')?.addEventListener('click', () => {
            manager.timingOffset -= 500; // Decrease by 0.5 seconds
            manager.setTimingOffset(track.id, manager.timingOffset);
            updateTimingDisplay();
        });

        container.querySelector('#lyrics-timing-plus-btn')?.addEventListener('click', () => {
            manager.timingOffset += 500; // Increase by 0.5 seconds
            manager.setTimingOffset(track.id, manager.timingOffset);
            updateTimingDisplay();
        });

        container.querySelector('#lyrics-timing-reset-btn')?.addEventListener('click', () => {
            manager.timingOffset = 0;
            manager.resetTimingOffset(track.id);
            updateTimingDisplay();
        });

        // Romaji toggle button handler
        const romajiBtn = container.querySelector('#romaji-toggle-btn');
        if (romajiBtn) {
            const updateRomajiBtn = () => {
                const enabled = manager.isRomajiMode;
                romajiBtn.setAttribute('data-enabled', enabled);
                romajiBtn.style.color = enabled ? 'var(--primary)' : '';
            };
            updateRomajiBtn();

            romajiBtn.addEventListener('click', async () => {
                const amLyrics = sidePanelManager.panel.querySelector('am-lyrics');
                if (amLyrics) {
                    await manager.toggleRomajiMode(amLyrics);
                    updateRomajiBtn();
                }
            });
        }

        // Genius toggle
        const geniusBtn = container.querySelector('#genius-toggle-btn');
        if (geniusBtn) {
            geniusBtn.addEventListener('click', async () => {
                manager.isGeniusMode = !manager.isGeniusMode;
                const enabled = manager.isGeniusMode;

                geniusBtn.classList.toggle('active-genius', enabled);
                geniusBtn.style.color = enabled ? '#ffff64' : '';
                geniusBtn.innerHTML = enabled ? SVG_GENIUS_ACTIVE(20) : SVG_GENIUS_INACTIVE(20);

                if (enabled) {
                    try {
                        geniusBtn.style.opacity = '0.5';
                        await manager.geniusManager.getDataForTrack(track);
                        manager.currentGeniusData = manager.geniusManager.cache.get(track.id);
                        const amLyrics = sidePanelManager.panel.querySelector('am-lyrics');
                        if (amLyrics)
                            void manager.applyGeniusAnnotations(
                                amLyrics,
                                manager.geniusManager.cache.get(track.id)?.referents
                            );
                    } catch (e) {
                        alert(e.message);
                        manager.isGeniusMode = false;
                        geniusBtn.classList.remove('active-genius');
                        geniusBtn.style.color = '';
                    } finally {
                        geniusBtn.style.opacity = '1';
                    }
                } else {
                    const amLyrics = sidePanelManager.panel.querySelector('am-lyrics');
                    if (amLyrics) {
                        const root = amLyrics.shadowRoot || amLyrics;
                        const lineElements = Array.from(root.querySelectorAll('.genius-annotated'));
                        lineElements.forEach((el) => {
                            el.classList.remove(
                                'genius-annotated',
                                'genius-multi-start',
                                'genius-multi-end',
                                'genius-multi-mid'
                            );
                            delete (/** @type {Element & { __geniusAnnotations?: object }} */ (el).__geniusAnnotations);
                        });
                    }
                    const modal = document.querySelector('.genius-annotation-modal');
                    if (modal) modal.remove();
                }
            });
        }
    };

    const renderContent = async (container) => {
        clearLyricsPanelSync(audioPlayer, sidePanelManager.panel);
        await renderLyricsComponent(container, track, audioPlayer, manager);
        /** @type {HTMLElement & { lyricsCleanup?: Function; lyricsManager?: object }} */
        const containerExt = container;
        if (containerExt.lyricsCleanup) {
            /** @type {HTMLElement & { lyricsCleanup?: Function; lyricsManager?: object }} */ (
                sidePanelManager.panel
            ).lyricsCleanup = containerExt.lyricsCleanup;
            /** @type {HTMLElement & { lyricsCleanup?: Function; lyricsManager?: object }} */ (
                sidePanelManager.panel
            ).lyricsManager = containerExt.lyricsManager;
        }
    };

    sidePanelManager.open('lyrics', 'Lyrics', renderControls, renderContent, forceOpen);
}

/**
 * Returns the appropriate lyrics highlight colour for the current theme.
 *
 * @returns {string} `'#000'` for light themes, `'#fff'` for dark themes.
 */
function getLyricsHighlightColor() {
    // Check if the current theme is light
    const isLight = getComputedStyle(document.documentElement).colorScheme === 'light';
    return isLight ? '#000' : '#fff';
}

/**
 * Updates the `highlight-color` attribute on all `<am-lyrics>` elements in the
 * document to match the current theme.
 */
function updateLyricsTheme() {
    const highlightColor = getLyricsHighlightColor();
    document.querySelectorAll('am-lyrics').forEach((el) => {
        el.setAttribute('highlight-color', highlightColor);
    });
}

// watch for theme changes
const themeObserver = new MutationObserver(() => {
    updateLyricsTheme();
});

themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'style'],
});

function applyFullscreenLyricsShadowTweaks(amLyrics, container) {
    if (!amLyrics || container?.id !== 'fullscreen-lyrics-content') return;

    const injectStyle = () => {
        const root = amLyrics.shadowRoot;
        if (!root) return false;

        let styleEl = root.getElementById('monochrome-fullscreen-lyrics-tweaks');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'monochrome-fullscreen-lyrics-tweaks';
            root.appendChild(styleEl);
        }

        styleEl.textContent = `
            .lyrics-container {
                scrollbar-width: none !important;
                -ms-overflow-style: none !important;
            }

            .lyrics-container::-webkit-scrollbar {
                width: 0 !important;
                height: 0 !important;
                display: none !important;
                background: transparent !important;
            }

            .lyrics-line {
                transform-origin: left center;
                transition:
                    opacity 0.42s ease,
                    transform 0.55s cubic-bezier(0.22, 1, 0.36, 1) var(--lyrics-line-delay, 0ms),
                    filter 0.48s cubic-bezier(0.22, 1, 0.36, 1) !important;
            }

            .lyrics-line:not(.active):not(.pre-active) {
                opacity: 0.44;
            }
            .lyrics-line-container {
                transition:
                    transform 0.72s cubic-bezier(0.22, 1, 0.36, 1),
                    background-color 0.3s ease,
                    color 0.3s ease !important;
            }

            .lyrics-line.active .lyrics-line-container,
            .lyrics-line.pre-active .lyrics-line-container {
                transition:
                    transform 0.56s cubic-bezier(0.22, 1, 0.36, 1),
                    background-color 0.22s ease,
                    color 0.22s ease !important;
            }

            .lyrics-line.active .lyrics-line-container {
                transform: scale(1.015);
            }
        `;

        return true;
    };

    if (injectStyle()) return;

    let attempts = 0;
    const maxAttempts = 24;
    const tryInject = () => {
        if (injectStyle()) return;
        attempts += 1;
        if (attempts < maxAttempts) {
            requestAnimationFrame(tryInject);
        }
    };

    requestAnimationFrame(tryInject);
}

/**
 * Creates and configures an `<am-lyrics>` element inside the given container,
 * loads lyrics in the background, sets up synchronisation, and applies any
 * active Romaji or Genius annotation modes.
 *
 * @async
 * @param {HTMLElement} container - The DOM element to render the lyrics component into.
 * @param {object} track - The track whose lyrics should be displayed.
 * @param {HTMLMediaElement} audioPlayer - The audio element used for time synchronisation.
 * @param {LyricsManager} lyricsManager - The LyricsManager instance.
 * @returns {Promise<Element|null>} The created `<am-lyrics>` element, or `null` on failure.
 */
async function renderLyricsComponent(container, track, audioPlayer, lyricsManager) {
    container.innerHTML = '<div class="lyrics-loading">Loading lyrics...</div>';

    try {
        await lyricsManager.ensureComponentLoaded();

        // Set initial Romaji mode
        lyricsManager.isRomajiMode = lyricsManager.getRomajiMode();
        lyricsManager.currentTrackId = track.id;

        const title = getTrackTitle(track);
        const artist = getTrackArtists(track);
        const album = track.album?.title;
        const durationMs = track.duration ? Math.round(track.duration * 1000) : undefined;
        const isrc = (track.isrc || track.mediaMetadata?.isrc || track.audioQuality?.isrc || '').trim();

        const isTracker = track.isTracker || (track.id && String(track.id).startsWith('tracker-'));
        let queryTitle = title;
        let queryArtist = artist;

        if (isTracker) {
            queryTitle = cleanTrackerSearch(title);
            queryArtist = cleanTrackerSearch(artist);
        }

        container.innerHTML = '';
        const amLyrics = document.createElement('am-lyrics');
        amLyrics.setAttribute('song-title', queryTitle);
        amLyrics.setAttribute('song-artist', queryArtist);
        if (album) amLyrics.setAttribute('song-album', album);
        if (durationMs) amLyrics.setAttribute('song-duration', String(durationMs));
        amLyrics.setAttribute('query', `${queryTitle} ${queryArtist}`.trim());
        if (isrc) amLyrics.setAttribute('isrc', isrc);

        amLyrics.setAttribute('highlight-color', getLyricsHighlightColor());
        amLyrics.setAttribute('hover-background-color', 'color-mix(in srgb, var(--primary) 16%, transparent)');
        amLyrics.setAttribute('autoscroll', '');
        amLyrics.setAttribute('interpolate', '');
        amLyrics.style.height = '100%';
        amLyrics.style.width = '100%';

        container.appendChild(amLyrics);
        applyFullscreenLyricsShadowTweaks(amLyrics, container);

        void lyricsManager.setupLyricsObserver(amLyrics);

        // If Romaji mode is enabled and track has Asian text, ensure Kuroshiro is ready
        if (lyricsManager.isRomajiMode && trackHasAsianText(track) && !lyricsManager.kuroshiroLoaded) {
            await lyricsManager.loadKuroshiro();
        }

        lyricsManager
            .fetchLyrics(track.id, track)
            .then(async () => {
                if (lyricsManager.isGeniusMode) {
                    try {
                        const data = await lyricsManager.geniusManager.getDataForTrack(track);
                        if (data) {
                            lyricsManager.currentGeniusData = data;
                            void lyricsManager.applyGeniusAnnotations(amLyrics, data.referents);
                        }
                    } catch (e) {
                        console.warn('Genius auto-load failed', e);
                    }
                }
            })
            .catch((e) => console.warn('Background lyrics fetch failed', e));

        // Wait for lyrics to appear, then do an immediate conversion
        const waitForLyrics = () => {
            return new Promise((resolve) => {
                // Check if lyrics are already loaded
                const checkForLyrics = () => {
                    const hasLyrics =
                        amLyrics.querySelector(".lyric-line, [class*='lyric']") ||
                        (amLyrics.shadowRoot && amLyrics.shadowRoot.querySelector("[class*='lyric']")) ||
                        (amLyrics.textContent && amLyrics.textContent.length > 50);
                    return hasLyrics;
                };

                if (checkForLyrics()) {
                    resolve();
                    return;
                }

                // Check more frequently (200ms) for faster response
                let attempts = 0;
                const maxAttempts = 25; // 5 seconds max
                const interval = setInterval(() => {
                    attempts++;
                    if (checkForLyrics() || attempts >= maxAttempts) {
                        clearInterval(interval);
                        resolve();
                    }
                }, 200);
            });
        };

        await waitForLyrics();

        // Convert immediately after lyrics detected
        if (lyricsManager.isRomajiMode) {
            await lyricsManager.convertLyricsContent(amLyrics);
            // One retry after 500ms in case more lyrics load
            setTimeout(() => lyricsManager.convertLyricsContent(amLyrics), 500);
        }

        if (lyricsManager.isGeniusMode && lyricsManager.currentGeniusData) {
            void lyricsManager.applyGeniusAnnotations(amLyrics, lyricsManager.currentGeniusData.referents);
        }

        const cleanup = setupSync(track, audioPlayer, amLyrics, lyricsManager);

        // Attach cleanup to container for easy access
        /** @type {HTMLElement & { lyricsCleanup?: Function; lyricsManager?: object }} */ (container).lyricsCleanup =
            cleanup;
        /** @type {HTMLElement & { lyricsCleanup?: Function; lyricsManager?: object }} */ (container).lyricsManager =
            lyricsManager;

        return amLyrics;
    } catch (error) {
        console.error('Failed to load lyrics:', error);
        container.innerHTML = '<div class="lyrics-error">Failed to load lyrics</div>';
        return null;
    }
}

/**
 * Wires up `requestAnimationFrame`-driven time synchronisation between an audio
 * element and an `<am-lyrics>` component, applying the active timing offset.
 * Returns a cleanup function that removes all event listeners and cancels the
 * animation loop.
 *
 * @param {object} track - The track being played (used to look up timing offset and lyrics cache).
 * @param {HTMLMediaElement} audioPlayer - The audio element providing playback time.
 * @param {any} amLyrics - The `<am-lyrics>` element to keep in sync.
 * @param {LyricsManager} lyricsManager - The LyricsManager instance.
 * @returns {() => void} A cleanup function to remove all listeners and stop the loop.
 */
function setupSync(track, audioPlayer, amLyrics, lyricsManager) {
    let baseTimeMs = 0;
    let lastTimestamp = performance.now();
    let animationFrameId = null;

    // Get timing offset from lyrics manager (in milliseconds)
    const getTimingOffset = () => {
        return lyricsManager?.timingOffset || 0;
    };

    const updateTime = () => {
        const currentMs = audioPlayer.currentTime * 1000;
        baseTimeMs = currentMs;
        lastTimestamp = performance.now();
        // Apply timing offset: positive offset delays lyrics, negative advances them
        amLyrics.currentTime = currentMs - getTimingOffset();
    };

    const tick = () => {
        if (!audioPlayer.paused) {
            const now = performance.now();
            const elapsed = now - lastTimestamp;
            const nextMs = baseTimeMs + elapsed;
            // Apply timing offset: positive offset delays lyrics, negative advances them
            amLyrics.currentTime = nextMs - getTimingOffset();
            animationFrameId = requestAnimationFrame(tick);
        }
    };

    const onPlay = () => {
        baseTimeMs = audioPlayer.currentTime * 1000;
        lastTimestamp = performance.now();
        tick();
    };

    const onPause = () => {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    };

    const onLineClick = (e) => {
        if (e.detail && e.detail.timestamp !== undefined) {
            const manager =
                lyricsManager ||
                /** @type {HTMLElement & { lyricsManager?: object }} */ (sidePanelManager.panel).lyricsManager;
            if (manager && manager.isGeniusMode) {
                const timestampSeconds = e.detail.timestamp / 1000;

                const lyricsData = manager.lyricsCache.get(track.id);
                if (lyricsData && lyricsData.subtitles) {
                    const parsed = manager.parseSyncedLyrics(lyricsData.subtitles);

                    const line = parsed.find((l) => Math.abs(l.time - timestampSeconds) < 1.0);

                    if (line && line.text && manager.currentGeniusData) {
                        const annotations = manager.geniusManager.findAnnotations(
                            line.text,
                            manager.currentGeniusData.referents
                        );
                        showGeniusAnnotations(annotations, line.text);
                    }
                }
                return;
            }

            audioPlayer.currentTime = e.detail.timestamp / 1000;
            void audioPlayer.play();
        }
    };

    audioPlayer.addEventListener('timeupdate', updateTime);
    audioPlayer.addEventListener('play', onPlay);
    audioPlayer.addEventListener('pause', onPause);
    audioPlayer.addEventListener('seeked', updateTime);
    amLyrics.addEventListener('line-click', onLineClick);

    if (!audioPlayer.paused) {
        tick();
    }

    return () => {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        audioPlayer.removeEventListener('timeupdate', updateTime);
        audioPlayer.removeEventListener('play', onPlay);
        audioPlayer.removeEventListener('pause', onPause);
        audioPlayer.removeEventListener('seeked', updateTime);
        amLyrics.removeEventListener('line-click', onLineClick);
    };
}

/**
 * Displays a floating modal with Genius annotations for the given lyric line.
 * Replaces any existing annotation modal.
 *
 * @param {object[]} annotations - Genius referent objects containing annotation text.
 * @param {string} lineText - The lyric line whose annotations are being shown.
 */
function showGeniusAnnotations(annotations, lineText) {
    const existing = document.querySelector('.genius-annotation-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.className = 'genius-annotation-modal';

    let contentHtml = `
        <div class="genius-modal-content">
            <div class="genius-header">
                <span class="genius-line">"${lineText}"</span>
                <button class="close-genius">×</button>
            </div>
            <div class="genius-body">
    `;

    if (annotations.length === 0) {
        contentHtml += `
            <div class="annotation-item">
                <div class="annotation-text" style="color: var(--muted-foreground); font-style: italic;">No Genius annotation found for this line.</div>
            </div>
        `;
    } else {
        annotations.forEach((ann) => {
            const body = ann.annotations[0].body.plain;
            contentHtml += `
                <div class="annotation-item">
                    <div class="annotation-text">${body.replace(/\n/g, '<br>')}</div>
                </div>
            `;
        });
    }

    contentHtml += `</div></div>`;
    modal.innerHTML = contentHtml;

    document.body.appendChild(modal);

    modal.querySelector('.close-genius').addEventListener('click', () => modal.remove());

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

/**
 * Renders lyrics for a track directly into the provided container element,
 * intended for use in the fullscreen player view.
 *
 * @async
 * @param {object} track - The track whose lyrics should be displayed.
 * @param {HTMLMediaElement} audioPlayer - The audio element used for synchronisation.
 * @param {LyricsManager} lyricsManager - The LyricsManager instance.
 * @param {HTMLElement} container - The container element to render into.
 * @returns {Promise<Element|null>} The created `<am-lyrics>` element, or `null` on failure.
 */
export async function renderLyricsInFullscreen(track, audioPlayer, lyricsManager, container) {
    return renderLyricsComponent(container, track, audioPlayer, lyricsManager);
}

/**
 * Stops the lyrics synchronisation loop and observer for a fullscreen lyrics
 * container, preventing stale callbacks after the panel is closed.
 *
 * @param {HTMLElement & { lyricsCleanup?: Function, lyricsManager?: LyricsManager }} container
 *   The fullscreen container element with attached cleanup references.
 */
export function clearFullscreenLyricsSync(container) {
    if (container && container.lyricsCleanup) {
        container.lyricsCleanup();
        container.lyricsCleanup = null;
    }
    if (container && container.lyricsManager) {
        container.lyricsManager.stopLyricsObserver();
    }
}

/**
 * Stops the lyrics synchronisation loop and observer attached to the side panel,
 * preventing stale callbacks after the panel is closed.
 *
 * @param {HTMLMediaElement} _audioPlayer - Unused; kept for API consistency.
 * @param {HTMLElement & { lyricsCleanup?: Function, lyricsManager?: LyricsManager }} panel
 *   The side panel element with attached cleanup references.
 */
export function clearLyricsPanelSync(_audioPlayer, panel) {
    if (panel && panel.lyricsCleanup) {
        panel.lyricsCleanup();
        panel.lyricsCleanup = null;
    }
    if (panel && panel.lyricsManager) {
        panel.lyricsManager.stopLyricsObserver();
    }
}
