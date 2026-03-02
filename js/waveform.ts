// js/waveform.ts

interface WaveformResult {
    peaks: Float32Array;
    duration: number;
}

export class WaveformGenerator {
    private audioContext: OfflineAudioContext;
    private cache: Map<string, WaveformResult>;

    constructor() {
        // Use OfflineAudioContext to prevent creating unnecessary OS audio streams
        // decodeAudioData doesn't require a real-time AudioContext
        const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        this.audioContext = new OfflineCtx!(1, 1, 44100);
        this.cache = new Map();
    }

    async getWaveform(url: string, trackId: string): Promise<WaveformResult | null> {
        if (this.cache.has(trackId)) {
            return this.cache.get(trackId) ?? null;
        }

        try {
            const response: Response = await fetch(url);
            const arrayBuffer: ArrayBuffer = await response.arrayBuffer();
            const audioBuffer: AudioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

            const peaks: Float32Array = this.extractPeaks(audioBuffer);
            const result: WaveformResult = { peaks, duration: audioBuffer.duration };
            this.cache.set(trackId, result);
            return result;
        } catch (error: unknown) {
            console.error('Waveform generation failed:', error);
            return null;
        }
    }

    extractPeaks(audioBuffer: AudioBuffer): Float32Array {
        const { length, duration }: { length: number; duration: number } = audioBuffer;
        const numPeaks: number = Math.min(Math.floor(4 * duration), 1000);
        const peaks: Float32Array = new Float32Array(numPeaks);
        const chanData: Float32Array = audioBuffer.getChannelData(0); // Use first channel
        const step: number = Math.floor(length / numPeaks);
        const stride: number = 8; // Check every 8th sample for speed

        for (let i: number = 0; i < numPeaks; i++) {
            let max: number = 0;
            const start: number = i * step;
            const end: number = start + step;
            for (let j: number = start; j < end; j += stride) {
                const datum: number = chanData[j];
                if (datum > max) {
                    max = datum;
                } else if (-datum > max) {
                    max = -datum;
                }
            }
            peaks[i] = max;
        }

        // Normalize peaks so the highest peak is 1.0
        let maxPeak: number = 0;
        for (let i: number = 0; i < numPeaks; i++) {
            if (peaks[i] > maxPeak) maxPeak = peaks[i];
        }
        if (maxPeak > 0) {
            for (let i: number = 0; i < numPeaks; i++) {
                peaks[i] /= maxPeak;
            }
        }

        return peaks;
    }

    drawWaveform(canvas: HTMLCanvasElement | null, peaks: Float32Array | null): void {
        if (!canvas || !peaks) return;

        const ctx: CanvasRenderingContext2D | null = canvas.getContext('2d');
        if (!ctx) return;
        const width: number = canvas.width;
        const height: number = canvas.height;

        ctx.clearRect(0, 0, width, height);

        const step: number = width / peaks.length;
        const centerY: number = height / 2;

        ctx.fillStyle = '#000'; // Mask color (opaque part)
        ctx.beginPath();

        // Draw top half
        ctx.moveTo(0, centerY);
        for (let i: number = 0; i < peaks.length; i++) {
            const peak: number = peaks[i];
            const barHeight: number = Math.max(1.5, peak * height * 0.9);
            ctx.lineTo(i * step, centerY - barHeight / 2);
        }

        // Draw bottom half (backwards)
        for (let i: number = peaks.length - 1; i >= 0; i--) {
            const peak: number = peaks[i];
            const barHeight: number = Math.max(1.5, peak * height * 0.9);
            ctx.lineTo(i * step, centerY + barHeight / 2);
        }

        ctx.closePath();
        ctx.fill();
    }

    // Removed drawRoundedRect as it's no longer used for continuous paths
}

export const waveformGenerator = new WaveformGenerator();
