interface FfmpegProgressEvent {
    stage: string | undefined;
    message: string | undefined;
    progress: number | undefined;
}

interface FfmpegWorkerMessageData {
    type: string;
    blob?: Blob;
    message?: string;
    stage?: string;
    progress?: number;
}

class FfmpegError extends Error {
    code: string;
    constructor(message: string) {
        super(message);
        this.name = 'FfmpegError';
        this.code = 'FFMPEG_FAILED';
    }
}

async function ffmpegWorker(
    audioBlob: Blob,
    args: Record<string, unknown> = {},
    outputName: string = 'output',
    outputMime: string = 'application/octet-stream',
    onProgress: ((event: FfmpegProgressEvent) => void) | null = null,
    signal: AbortSignal | null = null
): Promise<Blob> {
    const audioData: ArrayBuffer = await audioBlob.arrayBuffer();

    return new Promise<Blob>((resolve, reject) => {
        const worker: Worker = new Worker(new URL('./ffmpeg.worker.js', import.meta.url), { type: 'module' });

        // Handle abort signal
        const abortHandler = (): void => {
            worker.terminate();
            reject(new FfmpegError('FFMPEG aborted'));
        };

        if (signal) {
            if (signal.aborted) {
                abortHandler();
                return;
            }
            signal.addEventListener('abort', abortHandler);
        }

        worker.onmessage = (e: MessageEvent<FfmpegWorkerMessageData>): void => {
            const { type, blob, message, stage, progress }: FfmpegWorkerMessageData = e.data;

            if (type === 'complete') {
                if (signal) signal.removeEventListener('abort', abortHandler);
                worker.terminate();
                resolve(blob!);
            } else if (type === 'error') {
                if (signal) signal.removeEventListener('abort', abortHandler);
                worker.terminate();
                reject(new FfmpegError(message!));
            } else if (type === 'progress' && onProgress) {
                onProgress({ stage, message, progress });
            } else if (type === 'log') {
                console.log('[FFmpeg]', message);
            }
        };

        worker.onerror = (error: ErrorEvent): void => {
            if (signal) signal.removeEventListener('abort', abortHandler);
            worker.terminate();
            reject(new FfmpegError('Worker failed: ' + error.message));
        };

        // Transfer audio data to worker
        worker.postMessage(
            {
                audioData,
                ...args,
                output: {
                    name: outputName,
                    mime: outputMime,
                },
            },
            [audioData]
        );
    });
}

export async function ffmpeg(
    audioBlob: Blob,
    args: Record<string, unknown> = {},
    outputName: string = 'output',
    outputMime: string = 'application/octet-stream',
    onProgress: ((event: FfmpegProgressEvent) => void) | null = null,
    signal: AbortSignal | null = null
): Promise<Blob> {
    try {
        // Use Web Worker for non-blocking FFmpeg encoding
        if (typeof Worker !== 'undefined') {
            return await ffmpegWorker(audioBlob, args, outputName, outputMime, onProgress, signal);
        }

        throw new FfmpegError('Web Workers are required for FFMPEG');
    } catch (error: unknown) {
        console.error('FFMPEG failed:', error);
        throw error;
    }
}

export { FfmpegError };
