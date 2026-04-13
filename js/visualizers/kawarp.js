// @ts-check
// js/visualizers/kawarp.js

const KAWARP_DEFAULTS = {
    warpIntensity: 1,
    blurPasses: 8,
    animationSpeed: 1,
    transitionDuration: 1000,
    saturation: 1.5,
    dithering: 0.008,
    scale: 1.25,
};

const BEAT_THRESHOLD = 0.75;
const SPEED_MULTIPLIER = 4;
const SCALE_BOOST_PCT = 2;
const BOOSTED_SCALE = KAWARP_DEFAULTS.scale + SCALE_BOOST_PCT / 100;
const SCALE_LERP_UP = 0.5;
const SCALE_LERP_DOWN = 0.12;
const SCALE_THRESHOLD = 0.001;
const ANALYSIS_INTERVAL = 100;
const CACHE_BUST_PARAM = 'not-from-cache-please';

/**
 * Visualizer preset that renders the Kawarp WebGL shader effect using the album cover art.
 * Integrates beat detection to boost animation speed and scale on loud transients.
 * Implements the visualizer preset interface expected by the visualizer manager.
 */
export class KawarpPreset {
    /**
     * Creates a new KawarpPreset instance and sets up audio event handler callbacks.
     */
    constructor() {
        this.name = 'Kawarp';
        this.contextType = 'webgl';
        this.managesOwnContext = true;

        this.kawarp = null;
        this.canvas = null;
        this.audioElement = null;
        this.isInitialized = false;
        this._lastCoverUrl = null;
        this._currentScale = KAWARP_DEFAULTS.scale;
        this._targetScale = KAWARP_DEFAULTS.scale;
        this._lastAnalysisTime = 0;
        this._coverObserver = null;

        this._onPlay = () => {
            if (this.kawarp) this.kawarp.start();
        };
        this._onPause = () => {
            if (this.kawarp) this.kawarp.stop();
        };
    }

    /**
     * Lazily initialises the Kawarp engine on the given canvas.
     * Re-initialises when called with a different canvas element.
     * @async
     * @param {HTMLCanvasElement} canvas - Target canvas for WebGL rendering
     * @param {AudioContext} _audioContext - Shared audio context (unused; Kawarp manages its own)
     * @param {AudioNode} _sourceNode - Source audio node (unused; Kawarp manages its own)
     * @returns {Promise<void>}
     */
    async lazyInit(canvas, _audioContext, _sourceNode) {
        if (this.isInitialized) {
            if (canvas !== this.canvas) {
                this._destroyKawarp();
            } else {
                this._ensureStarted();
                return;
            }
        }

        try {
            const { Kawarp } = await import('@kawarp/core');

            this.canvas = canvas;
            this.kawarp = new Kawarp(canvas, { ...KAWARP_DEFAULTS });

            this.audioElement = document.getElementById('audio-player');
            if (this.audioElement) {
                this.audioElement.addEventListener('play', this._onPlay);
                this.audioElement.addEventListener('pause', this._onPause);
            }

            this._observeCoverArt();

            const coverEl = document.querySelector('.now-playing-bar .cover');
            if (coverEl?.tagName === 'IMG' && /** @type {HTMLImageElement} */ (coverEl).src) {
                this._lastCoverUrl = /** @type {HTMLImageElement} */ (coverEl).src;
                this._loadCover(/** @type {HTMLImageElement} */ (coverEl).src);
            }

            this.kawarp.start();
            this.isInitialized = true;
        } catch (error) {
            console.error('[Kawarp] Init failed:', error);
        }
    }

    /**
     * No-op implementation of the visualizer audio-connection hook.
     * Kawarp manages its own audio context.
     * @returns {void}
     */
    connectAudio() {}

    /**
     * Starts the Kawarp animation if the audio element is currently playing.
     * @returns {void}
     */
    _ensureStarted() {
        if (!this.kawarp) return;
        if (/** @type {{ isPlaying: boolean }} */ (/** @type {unknown} */ (this.kawarp)).isPlaying) return;
        if (/** @type {HTMLMediaElement} */ (/** @type {unknown} */ (this.audioElement))?.paused) return;
        this.kawarp.start();
    }

    /**
     * Attaches a MutationObserver to the now-playing bar to detect cover art changes.
     * @returns {void}
     */
    _observeCoverArt() {
        const container = document.querySelector('.now-playing-bar');
        if (!container) return;

        this._coverObserver = new MutationObserver(() => {
            const el = document.querySelector('.now-playing-bar .cover');
            const src = el?.tagName === 'IMG' ? /** @type {HTMLImageElement} */ (el).src : null;
            if (!src || src === this._lastCoverUrl) return;
            this._lastCoverUrl = src;
            if (this.kawarp && this.isInitialized) {
                this._loadCover(src);
            }
        });

        this._coverObserver.observe(container, {
            attributes: true,
            attributeFilter: ['src'],
            subtree: true,
            childList: true,
        });
    }

    /**
     * Loads a cover art image into the Kawarp engine, appending a cache-bust parameter
     * to force a fresh CORS request bypassing the browser's cached non-CORS response.
     * @param {string} url - Absolute URL of the cover image
     * @returns {void}
     */
    _loadCover(url) {
        // Cache buster forces a fresh CORS request, bypassing the browser's
        // cached non-CORS response from the <img> tag (same pattern as ui.js)
        const sep = url.includes('?') ? '&' : '?';
        this.kawarp
            .loadImage(`${url}${sep}${CACHE_BUST_PARAM}`)
            .catch((err) => console.warn('[Kawarp] Failed to load cover:', err));
    }

    /**
     * Notifies the Kawarp engine of a canvas resize.
     * @param {number} _w - New canvas width in pixels (forwarded to Kawarp which reads it from the element)
     * @param {number} _h - New canvas height in pixels (forwarded to Kawarp which reads it from the element)
     * @returns {void}
     */
    resize(_w, _h) {
        if (this.kawarp) this.kawarp.resize();
    }

    /**
     * Per-frame draw callback invoked by the visualizer manager.
     * Performs throttled beat detection and smoothly lerps the canvas scale.
     * @param {CanvasRenderingContext2D | null} _ctx - 2D context (unused; Kawarp renders via WebGL)
     * @param {HTMLCanvasElement} canvas - The canvas element being rendered to
     * @param {AnalyserNode | null} analyser - Web Audio analyser node for beat detection
     * @param {Uint8Array | null} _dataArray - Pre-allocated frequency data array (unused)
     * @param {{ mode: string }} stats - Visualizer stats; `mode` may be `'blended'`
     * @returns {void}
     */
    draw(_ctx, canvas, analyser, _dataArray, stats) {
        if (!this.kawarp || !this.isInitialized) return;

        this._ensureStarted();

        // Beat detection, throttled to every 100ms
        const now = performance.now();
        if (analyser && now - this._lastAnalysisTime >= ANALYSIS_INTERVAL) {
            const buf = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteTimeDomainData(buf);

            let peak = 0;
            for (let i = 0; i < buf.length; i++) {
                const a = Math.abs(buf[i] - 128) / 128;
                if (a > peak) {
                    peak = a;
                    if (peak > BEAT_THRESHOLD) break;
                }
            }

            const isBeat = peak > BEAT_THRESHOLD;

            this.kawarp.animationSpeed = isBeat
                ? KAWARP_DEFAULTS.animationSpeed * SPEED_MULTIPLIER
                : KAWARP_DEFAULTS.animationSpeed;

            this._targetScale = isBeat ? BOOSTED_SCALE : KAWARP_DEFAULTS.scale;

            this._lastAnalysisTime = now;
        }

        // Scale lerp
        const diff = this._targetScale - this._currentScale;
        if (Math.abs(diff) > SCALE_THRESHOLD) {
            const lerp = diff > 0 ? SCALE_LERP_UP : SCALE_LERP_DOWN;
            this._currentScale += diff * lerp;
            this.kawarp.scale = this._currentScale;
        }

        // Blended mode support
        if (stats.mode === 'blended') {
            canvas.style.opacity = '0.85';
            canvas.style.mixBlendMode = 'screen';
        } else {
            canvas.style.opacity = '1';
            canvas.style.mixBlendMode = 'normal';
        }
    }

    /**
     * Stops and disposes the Kawarp engine and clears canvas/state references.
     * @returns {void}
     */
    _destroyKawarp() {
        if (this.kawarp) {
            this.kawarp.stop();
            this.kawarp.dispose();
            this.kawarp = null;
        }
        this.canvas = null;
        this.isInitialized = false;
    }

    /**
     * Tears down the preset: disconnects the cover observer, removes audio listeners, and destroys the engine.
     * @returns {void}
     */
    destroy() {
        if (this._coverObserver) {
            this._coverObserver.disconnect();
            this._coverObserver = null;
        }
        if (this.audioElement) {
            this.audioElement.removeEventListener('play', this._onPlay);
            this.audioElement.removeEventListener('pause', this._onPause);
            this.audioElement = null;
        }
        this._destroyKawarp();
        this._lastCoverUrl = null;
        this._currentScale = KAWARP_DEFAULTS.scale;
        this._targetScale = KAWARP_DEFAULTS.scale;
    }
}
