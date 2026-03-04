import { ffmpeg } from './ffmpeg';

class MP3EncodingError extends Error {
    code: string;

    constructor(message: string) {
        super(message);
        this.name = 'MP3EncodingError';
        this.code = 'MP3_ENCODING_FAILED';
    }
}

export async function encodeToMp3(
    audioBlob: Blob,
    onProgress: ((info: { stage: string; message: string; progress: number }) => void) | null = null,
    signal: AbortSignal | null = null
): Promise<Blob> {
    try {
        // Use Web Worker for non-blocking FFmpeg encoding
        if (typeof Worker !== 'undefined') {
            const args: string[] = ['-map_metadata', '-1', '-c:a', 'libmp3lame', '-b:a', '320k', '-ar', '44100'];

            const encode = ffmpeg as (
                input: Blob,
                opts: { args: string[] },
                name: string,
                mime: string,
                progress: ((info: { stage: string; message: string; progress: number }) => void) | null,
                sig: AbortSignal | null
            ) => Promise<Blob>;

            return await encode(audioBlob, { args }, 'output.mp3', 'audio/mpeg', onProgress, signal);
        }

        throw new MP3EncodingError('Web Workers are required for MP3 encoding');
    } catch (error: unknown) {
        console.error('MP3 encoding failed:', error);

        const message: string = error instanceof Error ? error.message : String(error);
        throw new MP3EncodingError(message);
    }
}

export { MP3EncodingError };
