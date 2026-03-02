import { sanitizeForFilename } from './utils.ts';

type PathResolver = (track: TrackData, filename: string, index: number) => string;

interface PlaylistMeta {
    title?: string;
    artist?: string | TrackArtist;
    id?: string | number;
    uuid?: string;
    releaseDate?: string;
    numberOfTracks?: number;
    cover?: string;
}

interface PlaylistJsonData {
    format: string;
    version: string;
    type: string;
    generated: string;
    playlist: {
        title: string;
        artist: string;
        id: string | number | null;
        releaseDate?: string | null;
        numberOfTracks?: number;
        cover?: string | null;
    };
    tracks: {
        position: number;
        id: string | number | null;
        title: string;
        artist: string;
        album: string | null;
        albumArtist: string | null;
        trackNumber: number | null;
        duration: number;
        isrc: string | null;
        releaseDate: string | null;
    }[];
}

/**
 * Resolves an artist field that may be a string or TrackArtist object to a string
 */
function resolveArtistName(artist: string | TrackArtist | undefined): string {
    if (!artist) return '';
    if (typeof artist === 'string') return artist;
    return artist.name;
}

/**
 * Generates M3U playlist content
 */
export function generateM3U(
    playlist: PlaylistMeta,
    tracks: TrackData[],
    useRelativePaths: boolean = true,
    pathResolver: PathResolver | null = null,
    audioExtension: string = 'flac'
): string {
    let content: string = '#EXTM3U\n';

    if (playlist.title) {
        content += `#PLAYLIST:${sanitizeForFilename(playlist.title)}\n`;
    }

    if (playlist.artist) {
        content += `#ARTIST:${resolveArtistName(playlist.artist)}\n`;
    }

    const date: string = new Date().toISOString().split('T')[0];
    content += `#DATE:${date}\n\n`;

    tracks.forEach((track: TrackData, index: number) => {
        const duration: number = Math.round(track.duration || 0);
        const artists: string = getTrackArtists(track);
        const title: string = track.title || 'Unknown Title';
        const displayName: string = `${artists} - ${title}`;

        content += `#EXTINF:${duration},${displayName}\n`;

        const filename: string = getTrackFilename(track, index + 1, audioExtension);
        const relativePath: string = typeof pathResolver === 'function' ? pathResolver(track, filename, index) : filename;
        const path: string = useRelativePaths ? relativePath : relativePath;

        content += `${path}\n\n`;
    });

    return content;
}

/**
 * Generates M3U8 playlist content (UTF-8 extended)
 */
export function generateM3U8(
    playlist: PlaylistMeta,
    tracks: TrackData[],
    useRelativePaths: boolean = true,
    pathResolver: PathResolver | null = null,
    audioExtension: string = 'flac'
): string {
    let content: string = '#EXTM3U\n';
    content += '#EXT-X-VERSION:3\n';
    content += '#EXT-X-PLAYLIST-TYPE:VOD\n';

    const maxDuration: number = Math.max(...tracks.map((track: TrackData) => Math.round(track.duration || 0)));
    content += `#EXT-X-TARGETDURATION:${maxDuration}\n`;

    if (playlist.title) {
        content += `#PLAYLIST:${sanitizeForFilename(playlist.title)}\n`;
    }

    if (playlist.artist) {
        content += `#ARTIST:${resolveArtistName(playlist.artist)}\n`;
    }

    const date: string = new Date().toISOString().split('T')[0];
    content += `#DATE:${date}\n\n`;

    tracks.forEach((track: TrackData, index: number) => {
        const duration: number = Math.round(track.duration || 0);
        const artists: string = getTrackArtists(track);
        const title: string = track.title || 'Unknown Title';
        const displayName: string = `${artists} - ${title}`;

        content += `#EXTINF:${duration}.000,${displayName}\n`;

        const filename: string = getTrackFilename(track, index + 1, audioExtension);
        const relativePath: string = typeof pathResolver === 'function' ? pathResolver(track, filename, index) : filename;
        const path: string = useRelativePaths ? relativePath : relativePath;

        content += `${path}\n\n`;
    });

    content += '#EXT-X-ENDLIST\n';
    return content;
}

/**
 * Generates CUE sheet content for albums
 */
export function generateCUE(album: PlaylistMeta, tracks: TrackData[], audioFilename: string): string {
    const performer: string = resolveArtistName(album.artist) || 'Unknown Artist';
    const title: string = album.title || 'Unknown Album';

    let content: string = `PERFORMER "${performer}"\n`;
    content += `TITLE "${title}"\n`;

    // Add file reference
    const fileExtension: string = (audioFilename.split('.').pop() ?? '').toUpperCase();
    content += `FILE "${audioFilename}" ${fileExtension}\n`;

    let currentTime: number = 0;

    tracks.forEach((track: TrackData, index: number) => {
        const trackNumber: string = String(track.trackNumber || index + 1).padStart(2, '0');
        const trackTitle: string = track.title || 'Unknown Track';
        const trackPerformer: string = track.artist?.name || getTrackArtists(track) || performer;
        const duration: number = track.duration || 0;

        content += `  TRACK ${trackNumber} AUDIO\n`;
        content += `    TITLE "${trackTitle}"\n`;
        content += `    PERFORMER "${trackPerformer}"\n`;

        // Calculate time in MM:SS:FF format (Frames = 75 per second)
        const minutes: number = Math.floor(currentTime / 60);
        const seconds: number = Math.floor(currentTime % 60);
        const frames: number = Math.floor((currentTime % 1) * 75);

        content += `    INDEX 01 ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(frames).padStart(2, '0')}\n`;

        currentTime += duration;
    });

    return content;
}

/**
 * Generates NFO file content for Kodi/media center compatibility
 */
export function generateNFO(playlist: PlaylistMeta, tracks: TrackData[], type: string = 'playlist'): string {
    const date: string = new Date().toISOString();

    let xml: string = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

    if (type === 'album') {
        xml += '<album>\n';
        xml += `  <title>${escapeXml(playlist.title || 'Unknown Album')}</title>\n`;
        xml += `  <artist>${escapeXml(resolveArtistName(playlist.artist) || 'Unknown Artist')}</artist>\n`;

        if (playlist.releaseDate) {
            xml += `  <year>${new Date(playlist.releaseDate).getFullYear()}</year>\n`;
        }

        xml += `  <musicbrainzalbumid>${playlist.id || ''}</musicbrainzalbumid>\n`;
        xml += `  <dateadded>${date}</dateadded>\n`;

        tracks.forEach((track: TrackData, index: number) => {
            xml += '  <track>\n';
            xml += `    <position>${index + 1}</position>\n`;
            xml += `    <title>${escapeXml(track.title || '')}</title>\n`;
            xml += `    <artist>${escapeXml(getTrackArtists(track) || '')}</artist>\n`;
            xml += `    <duration>${Math.round(track.duration || 0)}</duration>\n`;

            if (track.trackNumber) {
                xml += `    <track>${track.trackNumber}</track>\n`;
            }

            xml += `    <musicbrainztrackid>${track.id || ''}</musicbrainztrackid>\n`;
            xml += '  </track>\n';
        });

        xml += '</album>\n';
    } else {
        xml += '<musicplaylist>\n';
        xml += `  <title>${escapeXml(playlist.title || 'Unknown Playlist')}</title>\n`;
        xml += `  <artist>${escapeXml(resolveArtistName(playlist.artist) || 'Various Artists')}</artist>\n`;
        xml += `  <dateadded>${date}</dateadded>\n`;

        tracks.forEach((track: TrackData, index: number) => {
            xml += '  <track>\n';
            xml += `    <position>${index + 1}</position>\n`;
            xml += `    <title>${escapeXml(track.title || '')}</title>\n`;
            xml += `    <artist>${escapeXml(getTrackArtists(track) || '')}</artist>\n`;
            xml += `    <album>${escapeXml(track.album?.title || '')}</album>\n`;
            xml += `    <duration>${Math.round(track.duration || 0)}</duration>\n`;
            xml += `    <musicbrainztrackid>${track.id || ''}</musicbrainztrackid>\n`;
            xml += '  </track>\n';
        });

        xml += '</musicplaylist>\n';
    }

    return xml;
}

/**
 * Generates JSON playlist with rich metadata
 */
export function generateJSON(playlist: PlaylistMeta, tracks: TrackData[], type: string = 'playlist'): string {
    const data: PlaylistJsonData = {
        format: 'monochrome-playlist',
        version: '1.0',
        type: type,
        generated: new Date().toISOString(),
        playlist: {
            title: playlist.title || 'Unknown',
            artist: resolveArtistName(playlist.artist) || 'Various Artists',
            id: playlist.id || playlist.uuid || null,
        },
        tracks: tracks.map((track: TrackData, index: number) => ({
            position: index + 1,
            id: track.id || null,
            title: track.title || 'Unknown Title',
            artist: getTrackArtists(track) || 'Unknown Artist',
            album: track.album?.title || null,
            albumArtist: track.album?.artist?.name || null,
            trackNumber: track.trackNumber || null,
            duration: Math.round(track.duration || 0),
            isrc: track.isrc || null,
            releaseDate: track.album?.releaseDate || null,
        })),
    };

    if (type === 'album') {
        data.playlist.releaseDate = playlist.releaseDate || null;
        data.playlist.numberOfTracks = tracks.length;
        data.playlist.cover = playlist.cover || null;
    }

    return JSON.stringify(data, null, 2);
}

/**
 * Helper function to get track artists string
 */
function getTrackArtists(track: TrackData): string {
    if (track.artists && track.artists.length > 0) {
        return track.artists.map((artist: TrackArtist) => artist.name).join(', ');
    }
    return track.artist?.name || 'Unknown Artist';
}

/**
 * Helper function to get track filename
 */
function getTrackFilename(track: TrackData, trackNumber: number = 1, audioExtension: string = 'flac'): string {
    const paddedNumber: string = String(trackNumber).padStart(2, '0');
    const artists: string = getTrackArtists(track);
    const title: string = track.title || 'Unknown Title';

    const sanitizedArtists: string = sanitizeForFilename(artists);
    const sanitizedTitle: string = sanitizeForFilename(title);

    return `${paddedNumber} - ${sanitizedArtists} - ${sanitizedTitle}.${audioExtension}`;
}

/**
 * Helper function to escape XML special characters
 */
function escapeXml(text: string): string {
    if (!text) return '';
    return text
        .toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
