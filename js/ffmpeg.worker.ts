import { FFmpeg } from '@ffmpeg/ffmpeg';
import type { FileData } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

interface WorkerMessageData {
    audioData: ArrayBuffer;
    args?: string[];
    output?: { name: string; mime: string };
    encodeStartMessage?: string;
    encodeEndMessage?: string;
}

let ffmpeg: FFmpeg | null = null;
let loadingPromise: Promise<void> | null = null;

async function loadFFmpeg(): Promise<void> {
    if (loadingPromise) return loadingPromise;

    loadingPromise = (async (): Promise<void> => {
        ffmpeg = new FFmpeg();

        ffmpeg.on('log', ({ message }) => {
            self.postMessage({ type: 'log', message });
        });

        ffmpeg.on('progress', ({ progress, time }) => {
            self.postMessage({
                type: 'progress',
                stage: 'encoding',
                progress: progress * 100,
                time,
            });
        });

        self.postMessage({ type: 'progress', stage: 'loading', message: 'Loading FFmpeg...' });

        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
        await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
    })();

    return loadingPromise;
}

self.onmessage = async (e: MessageEvent<WorkerMessageData>): Promise<void> => {
    const {
        audioData,
        args = [],
        output = {
            name: 'output',
            mime: 'application/octet-stream',
        },
        encodeStartMessage = 'Encoding...',
        encodeEndMessage = 'Finalizing...',
    } = e.data;

    try {
        await loadFFmpeg();

        self.postMessage({ type: 'progress', stage: 'encoding', message: encodeStartMessage });

        try {
            // Write input file to FFmpeg virtual filesystem
            await ffmpeg!.writeFile('input', new Uint8Array(audioData));

            const ffmpegArgs: string[] = ['-i', 'input', ...args, output.name];

            // Log the exact FFmpeg command being run for debugging.
            self.postMessage({ type: 'log', message: `Running with args: ${ffmpegArgs.join(' ')}` });

            // Run FFMPEG with the provided arguments.
            await ffmpeg!.exec(ffmpegArgs);

            self.postMessage({ type: 'progress', stage: 'finalizing', message: encodeEndMessage });

            // FileData is Uint8Array | string, both valid BlobPart; cast needed due to Uint8Array generic variance
            const data: FileData = await ffmpeg!.readFile(output.name);
            const outputBlob: Blob = new Blob([data as BlobPart], { type: output.mime });

            self.postMessage({ type: 'complete', blob: outputBlob });
        } finally {
            // Always cleanup virtual filesystem files
            try {
                await ffmpeg!.deleteFile('input');
            } catch {
                // File may not exist if writeFile failed
            }
            try {
                await ffmpeg!.deleteFile(output.name);
            } catch {
                // File may not exist if exec failed
            }
        }
    } catch (error: unknown) {
        const message: string = error instanceof Error ? error.message : String(error);
        self.postMessage({ type: 'error', message });
    }
};
