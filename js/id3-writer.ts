import { getCoverBlob, getTrackTitle } from './utils.ts';
import type { CoverApi } from './utils.ts';

async function writeID3v2Tag(mp3Blob: Blob, metadata: TrackData, coverBlob: Blob | null = null): Promise<Blob> {
    const frames: Uint8Array[] = [];

    if (metadata.title) {
        frames.push(createTextFrame('TIT2', getTrackTitle(metadata)));
    }

    const artistName: string | undefined = metadata.artist?.name || metadata.artists?.[0]?.name;
    if (artistName) {
        frames.push(createTextFrame('TPE1', artistName));
    }

    if (metadata.album?.title) {
        frames.push(createTextFrame('TALB', metadata.album.title));
    }

    const albumArtistName: string | undefined =
        metadata.album?.artist?.name || metadata.artist?.name || metadata.artists?.[0]?.name;
    if (albumArtistName) {
        frames.push(createTextFrame('TPE2', albumArtistName));
    }

    if (metadata.trackNumber) {
        frames.push(createTextFrame('TRCK', metadata.trackNumber.toString()));
    }

    if (metadata.album?.releaseDate) {
        const year: number = new Date(metadata.album.releaseDate).getFullYear();
        if (!Number.isNaN(year) && Number.isFinite(year)) {
            frames.push(createTextFrame('TYER', year.toString()));
        }
    }

    if (metadata.isrc) {
        frames.push(createTextFrame('TSRC', metadata.isrc));
    }

    if (metadata.copyright) {
        frames.push(createTextFrame('TCOP', metadata.copyright));
    }

    frames.push(createTextFrame('TENC', 'Monochrome'));

    if (coverBlob) {
        frames.push(await createAPICFrame(coverBlob));
    }

    return buildID3v2Tag(mp3Blob, frames);
}

function createTextFrame(frameId: string, text: string): Uint8Array {
    // ID3v2.3 UTF-16 encoding with BOM
    const bom: Uint8Array = new Uint8Array([0xff, 0xfe]); // UTF-16LE BOM
    const utf16Bytes: Uint8Array = new Uint8Array(text.length * 2);

    for (let i: number = 0; i < text.length; i++) {
        const charCode: number = text.charCodeAt(i);
        utf16Bytes[i * 2] = charCode & 0xff;
        utf16Bytes[i * 2 + 1] = (charCode >> 8) & 0xff;
    }

    const frameSize: number = 1 + bom.length + utf16Bytes.length;
    const frame: Uint8Array = new Uint8Array(10 + frameSize);
    const view: DataView = new DataView(frame.buffer);

    for (let i: number = 0; i < 4; i++) {
        frame[i] = frameId.charCodeAt(i);
    }

    view.setUint32(4, frameSize, false);

    frame[10] = 0x01; // UTF-16 with BOM

    frame.set(bom, 11);
    frame.set(utf16Bytes, 11 + bom.length);

    return frame;
}

async function createAPICFrame(coverBlob: Blob): Promise<Uint8Array> {
    const imageBytes: Uint8Array = new Uint8Array(await coverBlob.arrayBuffer());
    const mimeType: string = coverBlob.type || 'image/jpeg';
    const mimeBytes: Uint8Array = new TextEncoder().encode(mimeType);

    const frameSize: number = 1 + mimeBytes.length + 1 + 1 + 1 + imageBytes.length;

    const frame: Uint8Array = new Uint8Array(10 + frameSize);
    const view: DataView = new DataView(frame.buffer);

    for (let i: number = 0; i < 4; i++) {
        frame[i] = 'APIC'.charCodeAt(i);
    }

    view.setUint32(4, frameSize, false);

    let offset: number = 10;
    frame[offset++] = 0x00;

    frame.set(mimeBytes, offset);
    offset += mimeBytes.length;
    frame[offset++] = 0x00;

    frame[offset++] = 0x03;

    frame[offset++] = 0x00;

    frame.set(imageBytes, offset);

    return frame;
}

function buildID3v2Tag(mp3Blob: Blob, frames: Uint8Array[]): Blob {
    const framesData: Uint8Array = new Uint8Array(frames.reduce((acc: number, f: Uint8Array) => acc + f.length, 0));
    let offset: number = 0;
    for (const frame of frames) {
        framesData.set(frame, offset);
        offset += frame.length;
    }

    const tagSize: number = framesData.length;

    const header: Uint8Array = new Uint8Array(10);
    header[0] = 0x49;
    header[1] = 0x44;
    header[2] = 0x33;
    header[3] = 0x03;
    header[4] = 0x00;
    header[5] = 0x00;

    header[6] = (tagSize >> 21) & 0x7f;
    header[7] = (tagSize >> 14) & 0x7f;
    header[8] = (tagSize >> 7) & 0x7f;
    header[9] = tagSize & 0x7f;

    return new Blob([header as BlobPart, framesData as BlobPart, mp3Blob], { type: 'audio/mpeg' });
}

export async function addMp3Metadata(mp3Blob: Blob, track: TrackData, api: CoverApi): Promise<Blob> {
    try {
        let coverBlob: Blob | null = null;

        if (track.album?.cover) {
            try {
                coverBlob = await getCoverBlob(api, track.album.cover);
            } catch (error: unknown) {
                console.warn('Failed to fetch album art for MP3:', error);
            }
        }

        return await writeID3v2Tag(mp3Blob, track, coverBlob);
    } catch (error: unknown) {
        console.error('Failed to add MP3 metadata:', error);
        return mp3Blob;
    }
}
