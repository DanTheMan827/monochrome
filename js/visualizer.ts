// js/visualizer.js
import { visualizerSettings } from './storage.ts';
import { LCDPreset } from './visualizers/lcd.ts';
import { ParticlesPreset } from './visualizers/particles.ts';
import { UnknownPleasuresWebGL } from './visualizers/unknown_pleasures_webgl.ts';
import { ButterchurnPreset } from './visualizers/butterchurn.ts';
import { audioContextManager } from './audio-context.ts';

type RenderingCtx = CanvasRenderingContext2D | WebGLRenderingContext | WebGL2RenderingContext;

interface VisualizerStats {
    kick: number;
    intensity: number;
    energyAverage: number;
    lastBeatTime: number;
    lastIntensity: number;
    upbeatSmoother: number;
    sensitivity: number;
    primaryColor: string;
    mode: string;
    paused: boolean;
}

interface VisualizerPreset {
    name?: string;
    contextType?: string;
    draw(
        ctx: RenderingCtx,
        canvas: HTMLCanvasElement,
        analyser: AnalyserNode,
        dataArray: Uint8Array,
        params: VisualizerStats
    ): void;
    resize?(width: number, height: number): void;
    destroy?(): void;
    lazyInit?(
        canvas: HTMLCanvasElement,
        audioContext: AudioContext,
        sourceNode: MediaElementAudioSourceNode | null
    ): void;
}

export class Visualizer {
    canvas: HTMLCanvasElement;
    ctx: RenderingCtx | null;
    audio: HTMLMediaElement;
    audioContext: AudioContext | null;
    analyser: AnalyserNode | null;
    isActive: boolean;
    animationId: number | null;
    presets: Record<string, VisualizerPreset>;
    activePresetKey: string;
    bufferLength: number;
    dataArray: Uint8Array<ArrayBuffer> | null;
    stats: VisualizerStats;
    _lastPrimaryColor: string;
    _resizeBound: () => void;
    _currentContextType: string | undefined;

    constructor(canvas: HTMLCanvasElement, audio: HTMLMediaElement) {
        this.canvas = canvas;
        this.ctx = null;
        this.audio = audio;

        this.audioContext = null;
        this.analyser = null;

        this.isActive = false;
        this.animationId = null;

        this.presets = {
            lcd: new LCDPreset(),
            particles: new ParticlesPreset(),
            'unknown-pleasures': new UnknownPleasuresWebGL(),
            butterchurn: new ButterchurnPreset() as unknown as VisualizerPreset,
        };

        this.activePresetKey = visualizerSettings.getPreset();

        // ---- AUDIO BUFFERS (REUSED) ----
        this.bufferLength = 0;
        this.dataArray = null;

        // ---- STATS (REUSED OBJECT) ----
        this.stats = {
            kick: 0,
            intensity: 0,
            energyAverage: 0.3,
            lastBeatTime: 0,
            lastIntensity: 0,
            upbeatSmoother: 0,
            sensitivity: 0.5,
            primaryColor: '#ffffff',
            mode: '',
            paused: false,
        };

        // ---- CACHED STATE ----
        this._lastPrimaryColor = '';
        this._resizeBound = () => this.resize();
    }

    get activePreset(): VisualizerPreset {
        return this.presets[this.activePresetKey] || this.presets['lcd'];
    }

    init(): void {
        // Ensure shared audio context is initialized
        if (!audioContextManager.isReady()) {
            audioContextManager.init(this.audio);
        }

        this.audioContext = audioContextManager.getAudioContext();
        this.analyser = audioContextManager.getAnalyser();

        if (this.analyser) {
            this.bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(this.bufferLength);
        }
    }

    /**
     * Get the shared AudioContext for external use
     */
    getAudioContext(): AudioContext | null {
        return this.audioContext;
    }

    /**
     * Get the source node
     */
    getSourceNode(): MediaElementAudioSourceNode | null {
        return audioContextManager.getSourceNode();
    }

    initContext(): void {
        const preset: VisualizerPreset = this.activePreset;
        const type: string = preset.contextType || '2d';
        const currentType: string | undefined = this._currentContextType;

        // If context type changed, we need to recreate the canvas
        // (you can't get a different context type from the same canvas)
        if (this.ctx && currentType !== type) {
            // Clone and replace canvas to get fresh context
            const parent: HTMLElement | null = this.canvas.parentElement;
            const newCanvas: HTMLCanvasElement = this.canvas.cloneNode(true) as HTMLCanvasElement;
            if (parent) {
                parent.replaceChild(newCanvas, this.canvas);
            }
            this.canvas = newCanvas;
            this.ctx = null;
        }

        if (this.ctx) return;

        if (type === 'webgl') {
            this.ctx =
                this.canvas.getContext('webgl2', {
                    alpha: true,
                    antialias: true,
                    preserveDrawingBuffer: true,
                    premultipliedAlpha: false,
                }) ||
                this.canvas.getContext('webgl', {
                    alpha: true,
                    antialias: true,
                    preserveDrawingBuffer: true,
                    premultipliedAlpha: false,
                });
        } else {
            this.ctx = this.canvas.getContext('2d');
        }

        this._currentContextType = type;
    }

    start(): void {
        if (this.isActive) return;

        if (!this.ctx) {
            this.initContext();
        }
        if (!this.audioContext) {
            this.init();
        }

        if (!this.analyser) {
            return;
        }

        this.isActive = true;

        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        // Initialize Butterchurn if it's the active preset
        if (this.activePresetKey === 'butterchurn' && this.activePreset.lazyInit && this.audioContext) {
            const sourceNode: MediaElementAudioSourceNode | null = audioContextManager.getSourceNode();
            this.activePreset.lazyInit(this.canvas, this.audioContext, sourceNode);
        }

        this.resize();
        window.addEventListener('resize', this._resizeBound);
        this.canvas.style.display = 'block';

        this.animate();
    }

    stop(): void {
        this.isActive = false;

        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        window.removeEventListener('resize', this._resizeBound);

        if (this.ctx && 'clearRect' in this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }

        this.canvas.style.display = 'none';
    }

    resize(): void {
        const w = window.innerWidth;
        const h = window.innerHeight;

        if (this.canvas.width !== w) this.canvas.width = w;
        if (this.canvas.height !== h) this.canvas.height = h;

        if (this.activePreset?.resize) {
            this.activePreset.resize(w, h);
        }
    }

    animate = (): void => {
        if (!this.isActive) return;
        this.animationId = requestAnimationFrame(this.animate);

        if (!this.analyser || !this.dataArray || !this.audioContext || !this.ctx) return;

        // ===== AUDIO ANALYSIS =====
        this.analyser.getByteFrequencyData(this.dataArray);

        // Bass (dynamic bins based on sample rate)
        const volume: number = 10 * Math.max(this.audio.volume, 0.1);

        // Robust bass detection: sum bins up to ~250Hz
        const binSize: number = this.audioContext.sampleRate / this.analyser.fftSize;
        const startBin: number = 1; // Skip DC offset
        // Calculate how many bins cover the bass range (up to 250Hz)
        let numBins: number = Math.floor(250 / binSize);
        if (numBins < 1) numBins = 1; // Ensure at least one bin is checked

        let maxVal: number = 0;
        for (let i: number = 0; i < numBins && startBin + i < this.dataArray.length; i++) {
            const val: number = this.dataArray[startBin + i];
            if (val > maxVal) maxVal = val;
        }

        // Normalize: (Max / 255) / Volume
        const bass: number = maxVal / 255 / volume;

        const intensity: number = bass * bass * 10;
        const stats: VisualizerStats = this.stats;

        stats.energyAverage = stats.energyAverage * 0.99 + intensity * 0.01;
        stats.upbeatSmoother = stats.upbeatSmoother * 0.92 + intensity * 0.08;

        // ===== SENSITIVITY =====
        let sensitivity: number = visualizerSettings.getSensitivity();
        if (visualizerSettings.isSmartIntensityEnabled()) {
            if (stats.energyAverage > 0.4) {
                sensitivity = 0.7;
            } else if (stats.energyAverage > 0.2) {
                sensitivity = 0.1 + ((stats.energyAverage - 0.2) / 0.2) * 0.6;
            } else {
                sensitivity = 0.1;
            }
        }

        // ===== KICK DETECTION =====
        const now: number = performance.now();
        const threshold: number = stats.energyAverage < 0.3 ? 0.5 + (0.3 - stats.energyAverage) * 2 : 0.5;

        // Lower threshold for more responsive kick
        if (intensity > threshold * 0.7) {
            if (intensity > stats.lastIntensity + 0.03 && now - stats.lastBeatTime > 50) {
                stats.kick = 1.0;
                stats.lastBeatTime = now;
            } else {
                if (stats.upbeatSmoother > 0.6 && stats.energyAverage > 0.4) {
                    const upbeatLevel = (stats.upbeatSmoother - 0.6) / 0.4;
                    if (stats.kick < upbeatLevel) {
                        stats.kick = upbeatLevel;
                    } else {
                        stats.kick *= 0.95;
                    }
                } else {
                    stats.kick *= 0.9;
                }
            }
        } else {
            stats.kick *= 0.95;
        }

        stats.lastIntensity = intensity;
        stats.intensity = intensity;
        stats.sensitivity = sensitivity;

        // ===== COLORS (CACHED) =====
        const color: string =
            getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#ffffff';

        if (color !== this._lastPrimaryColor) {
            stats.primaryColor = color;
            this._lastPrimaryColor = color;
        }

        stats.mode = visualizerSettings.getMode();

        // ===== DRAW =====
        this.activePreset.draw(this.ctx, this.canvas, this.analyser, this.dataArray, stats);
    };

    setPreset(key: string): void {
        if (!this.presets[key]) return;

        if (this.activePreset?.destroy) {
            this.activePreset.destroy();
        }

        this.activePresetKey = key;
        this.initContext();
        this.resize();

        // Initialize Butterchurn if switching to it
        const preset: VisualizerPreset = this.presets[key];
        if (key === 'butterchurn' && preset.lazyInit && this.audioContext) {
            const sourceNode: MediaElementAudioSourceNode | null = audioContextManager.getSourceNode();
            preset.lazyInit(this.canvas, this.audioContext, sourceNode);
        }
    }
}
