import type { Kawarp, KawarpOptions } from '@kawarp/core';

interface VisualizerStats {
    mode?: string;
}

const KAWARP_DEFAULTS: Required<KawarpOptions> = {
    warpIntensity: 1,
    blurPasses: 8,
    animationSpeed: 1,
    transitionDuration: 1000,
    saturation: 1.5,
    tintColor: [1, 1, 1],
    tintIntensity: 0,
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

export class KawarpPreset {
    name: string = 'Kawarp';
    contextType: string = 'webgl';
    managesOwnContext: boolean = true;

    private kawarp: Kawarp | null = null;
    private canvas: HTMLCanvasElement | null = null;
    private audioElement: HTMLElement | null = null;
    private isInitialized: boolean = false;
    private _lastCoverUrl: string | null = null;
    private _currentScale: number = KAWARP_DEFAULTS.scale;
    private _targetScale: number = KAWARP_DEFAULTS.scale;
    private _lastAnalysisTime: number = 0;
    private _coverObserver: MutationObserver | null = null;

    private readonly _onPlay: () => void;
    private readonly _onPause: () => void;

    constructor() {
        this._onPlay = () => {
            if (this.kawarp) this.kawarp.start();
        };
        this._onPause = () => {
            if (this.kawarp) this.kawarp.stop();
        };
    }

    async lazyInit(canvas: HTMLCanvasElement, _audioContext: AudioContext, _sourceNode: AudioNode): Promise<void> {
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
            if (coverEl?.tagName === 'IMG' && (coverEl as HTMLImageElement).src) {
                this._lastCoverUrl = (coverEl as HTMLImageElement).src;
                this._loadCover((coverEl as HTMLImageElement).src);
            }

            this.kawarp.start();
            this.isInitialized = true;
        } catch (error) {
            console.error('[Kawarp] Init failed:', error);
        }
    }

    connectAudio(): void {}

    private _ensureStarted(): void {
        if (!this.kawarp) return;
        if ((this.audioElement as HTMLMediaElement)?.paused) return;
        this.kawarp.start();
    }

    private _observeCoverArt(): void {
        const container = document.querySelector('.now-playing-bar');
        if (!container) return;

        this._coverObserver = new MutationObserver(() => {
            const el = document.querySelector('.now-playing-bar .cover');
            const src = el?.tagName === 'IMG' ? (el as HTMLImageElement).src : null;
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

    private _loadCover(url: string): void {
        // Cache buster forces a fresh CORS request, bypassing the browser's
        // cached non-CORS response from the <img> tag (same pattern as ui.js)
        const sep = url.includes('?') ? '&' : '?';
        this.kawarp!
            .loadImage(`${url}${sep}${CACHE_BUST_PARAM}`)
            .catch((err: unknown) => console.warn('[Kawarp] Failed to load cover:', err));
    }

    resize(_w: number, _h: number): void {
        if (this.kawarp) this.kawarp.resize();
    }

    draw(_ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, analyser: AnalyserNode | null, _dataArray: Uint8Array, stats: VisualizerStats): void {
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

    private _destroyKawarp(): void {
        if (this.kawarp) {
            this.kawarp.stop();
            this.kawarp.dispose();
            this.kawarp = null;
        }
        this.canvas = null;
        this.isInitialized = false;
    }

    destroy(): void {
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
