// @ts-check
import {
    getCoverBlob,
    getTrackTitle,
    getFullArtistString,
    getMimeType,
    getTrackCoverId,
    getFullArtistArray,
} from './utils.js';
import { addMetadataWithTagLib, getMetadataWithTagLib } from './taglib.ts';
import { LyricsManager } from './lyrics.js';
import { Mp4Stik } from './taglib.types.ts';
import { modernSettings } from './ModernSettings.js';

/**
 * @typedef {import('./container-classes.ts').Track} Track
 * @typedef {import('./container-classes.ts').EnrichedTrack} EnrichedTrack
 * @typedef {import('./container-classes.ts').EnrichedAlbum} EnrichedAlbum
 * @typedef {import("./taglib.types.ts").TagLibMetadata} TagLibMetadata
 * @typedef {import("./taglib.types.ts").TagLibWriteTypes} TagLibWriteTypes
 */

/**
 * Prefetches cover art and lyrics for a track to avoid sequential fetches during download.
 * @param {Track | EnrichedTrack} track - The track to prefetch metadata for
 * @param {object} api - API instance used to fetch cover art
 * @param {Blob | null} [coverBlob] - Optional pre-fetched cover blob; if provided, skips the cover fetch
 * @returns {{ coverFetch: Promise<Blob|null|void>, lyricsFetch: Promise<any>|undefined }} Object containing promises for cover and lyrics
 */
export function prefetchMetadataObjects(track, api, coverBlob = null) {
    const coverId = getTrackCoverId(track);
    const coverFetch = coverBlob
        ? Promise.resolve(coverBlob)
        : coverId
          ? getCoverBlob(api, coverId).catch(console.error)
          : Promise.resolve(null);
    const lyricsFetch = LyricsManager.instance.fetchLyrics?.(track.id, track)?.catch(console.error);

    return { coverFetch, lyricsFetch };
}

/**
 * Adds metadata tags to audio files (FLAC, M4A or MP3)
 * @param {Blob} audioBlob - The audio file blob
 * @param {Track | EnrichedTrack} track - Track metadata
 * @param {object} [_api] - API instance for fetching album art
 * @param {string} [_quality] - Audio quality
 * @param {{ coverFetch: Promise<Blob|null|void>, lyricsFetch: Promise<any>|undefined }} [prefetchPromises]
 * @returns {Promise<Blob>} - Audio blob with embedded metadata
 */
export async function addMetadataToAudio(audioBlob, track, _api, _quality, prefetchPromises) {
    const { coverFetch, lyricsFetch } = prefetchPromises;

    /**
     * @type {TagLibMetadata}
     */
    const data = {
        writeArtistsSeparately: modernSettings.writeArtistsSeparately,
    };

    try {
        /** @type {EnrichedAlbum | undefined} */
        const enrichedAlbum = /** @type {EnrichedAlbum | undefined} */ (track.album);
        /** @type {(Track | EnrichedTrack) & { discNumber?: number }} */
        const enrichedTrack = /** @type {(Track | EnrichedTrack) & { discNumber?: number }} */ (track);

        data.title = getTrackTitle(track);
        data.artist = getFullArtistArray(track);
        data.albumTitle = enrichedAlbum?.title;
        data.albumArtist = enrichedAlbum?.artist?.name || getFullArtistString(track) || '';
        data.trackNumber = track.trackNumber;
        data.discNumber = track.volumeNumber ?? enrichedTrack.discNumber;
        data.totalTracks = enrichedAlbum?.numberOfTracksOnDisc ?? enrichedAlbum?.numberOfTracks;
        data.totalDiscs = enrichedAlbum?.totalDiscs;
        data.copyright = track.copyright;
        data.isrc = track.isrc;
        data.upc = enrichedAlbum?.upc;
        data.explicit = Boolean(track.explicit);
        data.stik = track.type?.toLowerCase().includes('video') ? Mp4Stik.MusicVideo : Mp4Stik.Normal;
        data.extra = {
            TIDAL_TRACK_ID: track.id ? String(track.id) : undefined,
            TIDAL_ALBUM_ID: enrichedAlbum?.id ? String(enrichedAlbum?.id) : undefined,
            TIDAL_TRACK_URL: track.url?.trim() || undefined,
            TIDAL_ALBUM_URL: enrichedAlbum?.url?.trim() || undefined,
            ALBUM_RELEASE_DATE: enrichedAlbum?.releaseDate?.trim() || undefined,
            TIDAL_DATA: JSON.stringify(track, null, 2).replace(/\n/g, '\r\n'),
        };

        if (track.bpm != null) {
            const bpm = Number(track.bpm);
            if (Number.isFinite(bpm)) {
                data.bpm = Math.round(bpm);
            }
        }

        if (track.replayGain) {
            const { albumReplayGain, albumPeakAmplitude, trackReplayGain, trackPeakAmplitude } = track.replayGain;
            data.replayGain = {
                albumReplayGain: `${Number(albumReplayGain)} dB`,
                trackReplayGain: `${Number(trackReplayGain)} dB`,
                albumPeakAmplitude: albumPeakAmplitude ? Number(albumPeakAmplitude) : undefined,
                trackPeakAmplitude: trackPeakAmplitude ? Number(trackPeakAmplitude) : undefined,
            };
        }

        const releaseDateStr =
            enrichedAlbum?.releaseDate?.trim() || track?.streamStartDate?.split('T')?.[0]?.trim() || undefined;

        if (releaseDateStr) {
            try {
                const year = Number(releaseDateStr.split('-')[0]);
                if (!isNaN(year)) {
                    data.releaseDate = String(releaseDateStr);
                }
            } catch {
                // Invalid date, skip
                console.warn('Invalid date', releaseDateStr);
            }
        }

        try {
            if (track.album?.cover) {
                const coverBlob = await coverFetch;

                if (coverBlob) {
                    const coverBuffer = new Uint8Array(await coverBlob.arrayBuffer());
                    data.cover = {
                        data: coverBuffer,
                        type: getMimeType(coverBuffer),
                    };
                }
            }
        } catch (e) {
            console.warn('Error setting cover metadata.', track, e);
        }

        try {
            const lyrics = await lyricsFetch;
            data.lyrics = lyrics?.subtitles || lyrics?.plainLyrics;
        } catch (e) {
            console.warn('Error setting lyrics metadata', track, e);
        }

        return /** @type {Blob} */ (
            await addMetadataWithTagLib(
                /** @type {TagLibWriteTypes} */ (/** @type {unknown} */ (audioBlob)),
                {
                    ...data,
                },
                undefined,
                true,
                true
            )
        );
    } catch (err) {
        console.error(err);
    }

    return audioBlob;
}

/**
 * Reads metadata from a file
 * @param {Uint8Array | Blob | File | FileSystemFileHandle | FileSystemFileEntry} file
 * @param {{ filename?: string, siblings?: File[] }} [options]
 * @returns {Promise<object>} Track metadata
 */
export async function readTrackMetadata(
    file,
    { filename = /** @type {File} */ (/** @type {unknown} */ (file))?.name || 'Unknown Title', siblings } = {}
) {
    const metadata = {
        title: filename?.replace(/\.[^/.]+$/, ''),
        artists: [],
        artist: { name: 'Unknown Artist' }, // For fallback/compatibility
        album: { title: 'Unknown Album', cover: 'assets/appicon.png', releaseDate: null },
        duration: 0,
        isrc: null,
        copyright: null,
        explicit: false,
        isLocal: true,
        file: file,
        id: `local-${filename}-${/** @type {File} */ (/** @type {unknown} */ (file))?.lastModified ?? 0}`,
    };

    try {
        const data = await getMetadataWithTagLib(file, filename, true);

        if (data) {
            metadata.title = data.title || metadata.title;
            const rawArtist = data.artist;
            const artistNames = (Array.isArray(rawArtist) ? rawArtist : (rawArtist || '').split(';'))
                .map((a) => a.trim())
                .filter((a) => a);

            if (artistNames.length > 0) {
                metadata.artists = artistNames.map((name) => ({ name }));
                metadata.artist = metadata.artists[0];
            }

            metadata.album.title = data.albumTitle || metadata.album.title;
            metadata.album.releaseDate = data.releaseDate || metadata.album.releaseDate;

            if (data.albumArtist) {
                metadata.album.artist = { name: data.albumArtist };
            } else if (metadata.artist.name !== 'Unknown Artist') {
                metadata.album.artist = { name: metadata.artist.name };
            }

            if (data.cover) {
                const blob = new Blob([/** @type {BlobPart} */ (/** @type {unknown} */ (data.cover.data))], {
                    type: data.cover.type,
                });
                metadata.album.cover = URL.createObjectURL(blob);
            }

            metadata.duration = data.duration;
            metadata.isrc = data.isrc || metadata.isrc;
            metadata.copyright = data.copyright || metadata.copyright;
            metadata.explicit = !!data.explicit;
        }
    } catch (e) {
        console.warn('Error reading metadata for', filename, e);
    }

    if (metadata.album.cover === 'assets/appicon.png' && siblings?.length > 0) {
        const baseName = filename.substring(0, filename.lastIndexOf('.'));
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
        const coverFile = siblings.find((f) => {
            const fName = f.name;
            const lastDot = fName.lastIndexOf('.');
            if (lastDot === -1) return false;
            const fBase = fName.substring(0, lastDot);
            const fExt = fName.substring(lastDot).toLowerCase();
            return fBase === baseName && imageExtensions.includes(fExt);
        });

        if (coverFile) {
            metadata.album.cover = URL.createObjectURL(coverFile);
        }
    }

    return metadata;
}
