/**
 * Butterchurn (Milkdrop) Visualizer Preset
 * WebGL-based audio visualization using the Butterchurn library
 */
import butterchurn, { type ButterchurnVisualizer } from 'butterchurn';
import { visualizerSettings } from '../storage.ts';
import { audioContextManager } from '../audio-context.ts';

type PresetMap = Record<string, Record<string, unknown>>;
type PresetsLoadedCallback = (presets: PresetMap, keys: string[]) => void;

// Module-level preset cache - loads immediately when this file is imported
let cachedPresets: PresetMap | null = null;
let cachedPresetKeys: string[] = [];
let isLoading = false;
let loadCallbacks: PresetsLoadedCallback[] = [];

/**
 * Load presets at module level using dynamic import (lazy loaded)
 */
async function loadPresetsModule(): Promise<void> {
    if (cachedPresets || isLoading) return;
    isLoading = true;

    try {
        // Load butterchurn-presets via script tag to avoid ES module issues
        if (!window.butterchurnPresets) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = '/lib/butterchurnPresets.min.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }

        const butterchurnPresets = window.butterchurnPresets;
        console.log('[Butterchurn] Presets loaded, type:', typeof butterchurnPresets);

        if (typeof butterchurnPresets?.getPresets !== 'function') {
            console.error(
                '[Butterchurn] butterchurnPresets.getPresets is not a function:',
                typeof butterchurnPresets?.getPresets
            );
            isLoading = false;
            return;
        }

        const allPresets = butterchurnPresets.getPresets();
        cachedPresets = allPresets || {};
        cachedPresetKeys = Object.keys(cachedPresets);

        // Filter out unwanted presets
        const skipPatterns = ['flexi', 'empty', 'test', '_'];
        cachedPresetKeys = cachedPresetKeys.filter((key) => {
            return !skipPatterns.some((pattern) => key.toLowerCase().includes(pattern));
        });

        // Sort alphabetically
        cachedPresetKeys.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

        console.log('[Butterchurn] Module-level presets loaded:', cachedPresetKeys.length);

        // Notify all waiting callbacks
        loadCallbacks.forEach((cb) => cb(cachedPresets!, cachedPresetKeys));
        loadCallbacks = [];

        // Dispatch global event
        window.dispatchEvent(new CustomEvent('butterchurn-presets-loaded'));
    } catch (e) {
        console.error('[Butterchurn] Failed to load presets:', e);
        cachedPresets = {};
        cachedPresetKeys = [];
    } finally {
        isLoading = false;
    }
}

/**
 * Get cached presets - available immediately after module loads
 */
export function getButterchurnPresets(): { presets: PresetMap | null; keys: string[] } {
    return { presets: cachedPresets, keys: cachedPresetKeys };
}

/**
 * Register callback for when presets are loaded
 */
export function onButterchurnPresetsLoaded(callback: PresetsLoadedCallback): void {
    if (cachedPresets) {
        callback(cachedPresets, cachedPresetKeys);
    } else {
        loadCallbacks.push(callback);
    }
}

// Start loading presets immediately when module is imported (lazy loaded)
loadPresetsModule();

export class ButterchurnPreset {
    name: string;
    contextType: string;
    visualizer: ButterchurnVisualizer | null;
    canvas: HTMLCanvasElement | null;
    audioContext: AudioContext | null;
    currentPresetIndex: number;
    lastPresetChange: number;
    isInitialized: boolean;
    presets: PresetMap;
    presetKeys: string[];
    blendProgress: number;
    blendDuration: number;
    private _unregisterGraphChange: (() => void) | null = null;

    constructor() {
        this.name = 'Butterchurn';
        this.contextType = 'webgl';

        this.visualizer = null;
        this.canvas = null;
        this.audioContext = null;
        this.currentPresetIndex = 0;
        this.lastPresetChange = 0;
        this.isInitialized = false;

        // Use cached presets if available
        this.presets = cachedPresets || {};
        this.presetKeys = cachedPresetKeys || [];

        // Transition settings
        this.blendProgress = 0;
        this.blendDuration = 2.7; // seconds for preset transitions

        // Listen for presets if not loaded yet
        if (!cachedPresets) {
            onButterchurnPresetsLoaded((presets: PresetMap, keys: string[]) => {
                this.presets = presets;
                this.presetKeys = keys;

                // Notify system that presets are ready (for settings dropdown)
                window.dispatchEvent(new CustomEvent('butterchurn-presets-loaded'));

                // If visualizer already initialized, load a preset
                if (this.isInitialized && this.visualizer) {
                    this.loadNextPreset();
                }
            });
        }
    }

    /**
     * Get the preset cycle duration from settings (in milliseconds)
     */
    getPresetDuration(): number {
        const seconds = visualizerSettings.getButterchurnCycleDuration();
        return seconds * 1000; // Convert to milliseconds
    }

    /**
     * Initialize Butterchurn with the given WebGL context
     */
    init(canvas: HTMLCanvasElement, _gl: WebGLRenderingContext | WebGL2RenderingContext, audioContext: AudioContext, sourceNode: AudioNode | null): void {
        if (this.isInitialized) return;

        try {
            this.canvas = canvas;
            this.audioContext = audioContext;

            // Create Butterchurn visualizer
            this.visualizer = butterchurn.createVisualizer(audioContext, canvas, {
                width: canvas.width,
                height: canvas.height,
                pixelRatio: window.devicePixelRatio || 1,
                textureRatio: 1,
            });

            // Connect audio source
            if (sourceNode) {
                this.connectAudioWithDelay(sourceNode);
            }

            // Load initial preset
            this.loadNextPreset();

            this.lastPresetChange = performance.now();
            this.isInitialized = true;

            // Register for audio graph changes so we can reconnect when EQ is toggled
            if (audioContextManager) {
                this._unregisterGraphChange = audioContextManager.onGraphChange((sourceNode) => {
                    if (sourceNode && this.isInitialized) {
                        console.log('[Butterchurn] Audio graph changed, reconnecting...');
                        this.connectAudioWithDelay(sourceNode);
                    }
                });
            }

            console.log('[Butterchurn] Initialized with', this.presetKeys.length, 'presets');
        } catch (error) {
            console.error('[Butterchurn] Initialization failed:', error);
        }
    }

    /**
     * Connect audio source to the visualizer (public API)
     */
    connectAudio(sourceNode: AudioNode): void {
        if (sourceNode) {
            this.connectAudioWithDelay(sourceNode);
        }
    }

    /**
     * Connect audio source with delay node for proper sync
     * Like bc-demo.html: creates a delay node and connects visualizer to it
     */
    connectAudioWithDelay(sourceNode: AudioNode): void {
        if (!this.audioContext || !this.visualizer) return;

        try {
            // Connect visualizer directly to the source node
            this.visualizer.connectAudio(sourceNode);
            console.log('[Butterchurn] Audio connected');
        } catch (error) {
            console.warn('[Butterchurn] Failed to connect audio:', error);
        }
    }

    /**
     * Load next preset based on settings (sequential or random)
     */
    loadNextPreset(): void {
        if (!this.visualizer || this.presetKeys.length === 0) return;

        const randomize = visualizerSettings.isButterchurnRandomizeEnabled();

        if (randomize) {
            this.currentPresetIndex = Math.floor(Math.random() * this.presetKeys.length);
        } else {
            this.currentPresetIndex = (this.currentPresetIndex + 1) % this.presetKeys.length;
        }

        const presetKey = this.presetKeys[this.currentPresetIndex];
        const preset = this.presets[presetKey];

        if (preset) {
            try {
                this.visualizer.loadPreset(preset, this.blendDuration);
            } catch (error) {
                console.warn('[Butterchurn] Failed to load preset:', presetKey, error);
                // Try next preset
                if (this.presetKeys.length > 1) {
                    this.loadNextPreset();
                }
            }
        }
    }

    /**
     * Load a specific preset by name
     */
    loadPreset(presetName: string): void {
        if (!this.visualizer || !this.presets) return;

        const preset = this.presets[presetName];
        if (preset) {
            this.visualizer.loadPreset(preset, this.blendDuration);
            console.log('[Butterchurn] Loaded preset:', presetName);

            // Update current index if found
            const index = this.presetKeys.indexOf(presetName);
            if (index !== -1) {
                this.currentPresetIndex = index;
            }
        }
    }

    /**
     * Get list of available preset names
     */
    getPresetNames(): string[] {
        return this.presetKeys;
    }

    /**
     * Get current preset name
     */
    getCurrentPresetName(): string {
        return this.presetKeys[this.currentPresetIndex] || 'Unknown';
    }

    /**
     * Skip to next preset (manually triggered)
     */
    nextPreset(): void {
        this.loadNextPreset();
        this.lastPresetChange = performance.now();
    }

    /**
     * Resize handler
     */
    resize(width: number, height: number): void {
        if (this.visualizer) {
            this.visualizer.setRendererSize(width, height);
        }
    }

    /**
     * Main draw function called each animation frame
     */
    draw(_ctx: WebGLRenderingContext | WebGL2RenderingContext | null, canvas: HTMLCanvasElement, _analyser: AnalyserNode, _dataArray: Uint8Array, params: { mode: string }): void {
        if (!this.isInitialized) {
            return;
        }

        if (!this.visualizer) return;

        const { mode } = params;
        const now = performance.now();

        // Auto-cycle presets
        const isCycleEnabled = visualizerSettings.isButterchurnCycleEnabled();
        if (isCycleEnabled) {
            const cycleDuration = this.getPresetDuration();
            if (cycleDuration > 0 && now - this.lastPresetChange > cycleDuration) {
                this.loadNextPreset();
                this.lastPresetChange = now;
            }
        }

        // Render the visualization
        try {
            this.visualizer.render();
        } catch (error) {
            console.warn('[Butterchurn] Render error:', error);
        }

        // Handle blended mode
        if (mode === 'blended') {
            canvas.style.opacity = '0.85';
            canvas.style.mixBlendMode = 'screen';
        } else {
            canvas.style.opacity = '1';
            canvas.style.mixBlendMode = 'normal';
        }
    }

    /**
     * Lazy initialization helper for when audio context becomes available
     */
    lazyInit(canvas: HTMLCanvasElement, audioContext: AudioContext, sourceNode: AudioNode | null): void {
        if (!this.isInitialized && canvas && audioContext) {
            const gl =
                canvas.getContext('webgl2', {
                    alpha: true,
                    antialias: true,
                    preserveDrawingBuffer: true,
                }) ||
                canvas.getContext('webgl', {
                    alpha: true,
                    antialias: true,
                    preserveDrawingBuffer: true,
                });

            if (gl) {
                this.init(canvas, gl, audioContext, null);

                // Connect audio if sourceNode is provided
                if (sourceNode) {
                    this.connectAudioWithDelay(sourceNode);
                }
            }
        } else if (this.isInitialized && sourceNode) {
            // Reconnect if source changed
            this.connectAudioWithDelay(sourceNode);
        }
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        // Unregister graph change listener
        if (this._unregisterGraphChange) {
            this._unregisterGraphChange();
            this._unregisterGraphChange = null;
        }

        if (this.visualizer) {
            this.visualizer = null;
        }
        this.isInitialized = false;
        this.canvas = null;
        this.audioContext = null;
        console.log('[Butterchurn] Destroyed');
    }
}
