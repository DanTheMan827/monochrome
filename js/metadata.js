import { TagLib } from 'taglib-wasm';
import { getCoverBlob, getTrackTitle } from './utils.js';

const VENDOR_STRING = 'Monochrome';

/** @type {import('taglib-wasm').TagLib|null} */
let _taglib = null;

async function getTagLib() {
    if (!_taglib) {
        _taglib = await TagLib.initialize();
    }
    return _taglib;
}

/**
 * Builds a full artist string by combining the track's listed artists
 * with any featured artists parsed from the title (feat./with).
 */
function getFullArtistString(track) {
    const knownArtists =
        Array.isArray(track.artists) && track.artists.length > 0
            ? track.artists.map((a) => (typeof a === 'string' ? a : a.name) || '').filter(Boolean)
            : track.artist?.name
              ? [track.artist.name]
              : [];

    // Parse featured artists from title, e.g. "Song (feat. A, B & C)" or "(with X & Y)"
    // Note: splitting on '&' may incorrectly fragment compound artist names like "Simon & Garfunkel".
    const featPattern = /\(\s*(?:feat\.?|ft\.?|with)\s+(.+?)\s*\)/gi;
    const allFeatArtists = [...(track.title?.matchAll(featPattern) ?? [])].flatMap((m) =>
        m[1]
            .split(/\s*[,&]\s*/)
            .map((s) => s.trim())
            .filter(Boolean)
    );
    if (allFeatArtists.length > 0) {
        const knownLower = new Set(knownArtists.map((n) => n.toLowerCase()));
        for (const feat of allFeatArtists) {
            if (!knownLower.has(feat.toLowerCase())) {
                knownArtists.push(feat);
                knownLower.add(feat.toLowerCase());
            }
        }
    }

    return knownArtists.join('; ') || null;
}

/**
 * Adds metadata tags to audio files (FLAC, M4A or MP3) using taglib-wasm.
 * @param {Blob} audioBlob - The audio file blob
 * @param {Object} track - Track metadata
 * @param {Object} api - API instance for fetching album art
 * @param {string} _quality - Audio quality (unused)
 * @returns {Promise<Blob>} - Audio blob with embedded metadata
 */
export async function addMetadataToAudio(audioBlob, track, api, _quality) {
    try {
        const taglib = await getTagLib();
        const arrayBuffer = await audioBlob.arrayBuffer();
        const file = await taglib.open(new Uint8Array(arrayBuffer));

        if (!file.isValid()) {
            console.warn('taglib-wasm: invalid audio file, returning original blob');
            return audioBlob;
        }

        try {
            const tag = file.tag();

            const title = getTrackTitle(track);
            if (title) tag.setTitle(title);

            const artistStr = getFullArtistString(track);
            if (artistStr) tag.setArtist(artistStr);

            if (track.album?.title) tag.setAlbum(track.album.title);

            if (track.trackNumber) tag.setTrack(Number(track.trackNumber));

            const releaseDateStr =
                track.album?.releaseDate || (track.streamStartDate ? track.streamStartDate.split('T')[0] : '');
            if (releaseDateStr) {
                const year = new Date(releaseDateStr).getFullYear();
                if (!isNaN(year)) tag.setYear(year);
            }

            const albumArtist = track.album?.artist?.name || track.artist?.name;
            if (albumArtist) file.setProperty('ALBUMARTIST', albumArtist);

            const discNumber = track.volumeNumber ?? track.discNumber;
            if (discNumber) file.setProperty('DISCNUMBER', String(discNumber));

            if (track.album?.numberOfTracks) file.setProperty('TRACKTOTAL', String(track.album.numberOfTracks));

            if (track.bpm != null) {
                const bpm = Number(track.bpm);
                if (Number.isFinite(bpm)) file.setProperty('BPM', String(Math.round(bpm)));
            }

            if (track.isrc) file.setProperty('ISRC', track.isrc);

            if (track.copyright) file.setProperty('COPYRIGHT', track.copyright);

            if (track.explicit) file.setProperty('ITUNESADVISORY', '1');

            file.setProperty('ENCODEDBY', VENDOR_STRING);

            if (track.replayGain) {
                const { albumReplayGain, albumPeakAmplitude, trackReplayGain, trackPeakAmplitude } = track.replayGain;
                if (trackReplayGain) file.setReplayGainTrackGain(String(trackReplayGain));
                if (trackPeakAmplitude) file.setReplayGainTrackPeak(String(trackPeakAmplitude));
                if (albumReplayGain) file.setReplayGainAlbumGain(String(albumReplayGain));
                if (albumPeakAmplitude) file.setReplayGainAlbumPeak(String(albumPeakAmplitude));
            }

            if (track.album?.cover) {
                try {
                    const imageBlob = await getCoverBlob(api, track.album.cover);
                    if (imageBlob) {
                        const imageData = new Uint8Array(await imageBlob.arrayBuffer());
                        file.setPictures([
                            {
                                data: imageData,
                                mimeType: imageBlob.type || 'image/jpeg',
                                type: 3, // Front cover
                                description: '',
                            },
                        ]);
                    }
                } catch (error) {
                    console.warn('Failed to embed album art:', error);
                }
            }

            file.save();
            const modifiedBuffer = file.getFileBuffer();
            return new Blob([modifiedBuffer], { type: audioBlob.type });
        } finally {
            file.dispose();
        }
    } catch (error) {
        console.error('Failed to add audio metadata:', error);
        return audioBlob;
    }
}

/**
 * Reads metadata from a file using taglib-wasm.
 * @param {File} file
 * @param {File[]} siblings - Sibling files in the same directory (for cover art fallback)
 * @returns {Promise<Object>} Track metadata
 */
export async function readTrackMetadata(file, siblings = []) {
    const metadata = {
        title: file.name.replace(/\.[^/.]+$/, ''),
        artists: [],
        artist: { name: 'Unknown Artist' }, // For fallback/compatibility
        album: { title: 'Unknown Album', cover: 'assets/appicon.png', releaseDate: null },
        duration: 0,
        isrc: null,
        copyright: null,
        isLocal: true,
        file: file,
        id: `local-${file.name}-${file.lastModified}`,
    };

    try {
        const taglib = await getTagLib();
        const audioFile = await taglib.open(file);

        if (audioFile.isValid()) {
            try {
                const tag = audioFile.tag();
                const props = audioFile.audioProperties();

                if (tag.title) metadata.title = tag.title;

                if (tag.album) metadata.album.title = tag.album;

                if (tag.year) metadata.album.releaseDate = String(tag.year);

                if (props?.length) metadata.duration = props.length;

                const artistStr = tag.artist || audioFile.getProperty('ALBUMARTIST');
                if (artistStr) {
                    metadata.artists = artistStr
                        .split(/; |\/|\\/)
                        .map((name) => ({ name: name.trim() }))
                        .filter((a) => a.name);
                }

                const isrc = audioFile.getProperty('ISRC');
                if (isrc) metadata.isrc = isrc;

                const copyright = audioFile.getProperty('COPYRIGHT');
                if (copyright) metadata.copyright = copyright;

                const explicit = audioFile.getProperty('ITUNESADVISORY');
                if (explicit) metadata.explicit = explicit === '1';

                const pictures = audioFile.getPictures();
                const cover = pictures.find((p) => p.type === 3) || pictures[0];
                if (cover) {
                    const blob = new Blob([cover.data], { type: cover.mimeType });
                    metadata.album.cover = URL.createObjectURL(blob);
                }
            } finally {
                audioFile.dispose();
            }
        }
    } catch (e) {
        console.warn('Error reading metadata for', file.name, e);
    }

    if (metadata.artists.length > 0) {
        metadata.artist = metadata.artists[0];
    }

    if (metadata.album.cover === 'assets/appicon.png' && siblings.length > 0) {
        const baseName = file.name.substring(0, file.name.lastIndexOf('.'));
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
