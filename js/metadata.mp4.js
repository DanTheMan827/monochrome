// @ts-check
import { getCoverBlob, getTrackTitle, getMimeType, getFullArtistString } from './utils.js';
import { METADATA_STRINGS } from './METADATA_STRINGS.js';

const { DEFAULT_TITLE, DEFAULT_ARTIST, DEFAULT_ALBUM } = METADATA_STRINGS;

/**
 * Reads M4A/MP4 metadata from a File and populates a metadata object in-place.
 * Extracts title, artist, album, ISRC, copyright, explicit flag, duration, and cover art.
 * @async
 * @param {File} file - M4A/MP4 audio file to inspect
 * @param {object} metadata - Metadata object to populate (mutated in-place)
 * @returns {Promise<void>}
 */
export async function readM4aMetadata(file, metadata) {
    try {
        const chunkSize = Math.min(file.size, 5 * 1024 * 1024);
        const buffer = await file.slice(0, chunkSize).arrayBuffer();
        const view = new DataView(buffer);

        const atoms = parseMp4Atoms(view);

        const moov = atoms.find((a) => a.type === 'moov');
        if (!moov) return;

        const moovStart = moov.offset + 8;
        const moovLen = moov.size - 8;
        const moovData = new DataView(view.buffer, moovStart, moovLen);
        const moovAtoms = parseMp4Atoms(moovData);

        // mvhd metadata tag
        const mvhd = moovAtoms.find((a) => a.type === 'mvhd');
        if (mvhd) {
            const mvhdStart = moovStart + mvhd.offset + 8;
            const version = view.getUint8(mvhdStart);

            // resolution and length, basically
            let timeScale, duration;

            if (version === 0) {
                // 32-bit format
                timeScale = view.getUint32(mvhdStart + 12, false);
                duration = view.getUint32(mvhdStart + 16, false);
            } else if (version === 1) {
                // 64-bit format
                timeScale = view.getUint32(mvhdStart + 20, false);
                const durHigh = view.getUint32(mvhdStart + 24, false);
                const durLow = view.getUint32(mvhdStart + 28, false);
                duration = durHigh * 0x100000000 + durLow;
            }

            if (timeScale > 0) {
                metadata.duration = duration / timeScale;
            }
        }

        const udta = moovAtoms.find((a) => a.type === 'udta');
        if (!udta) return;

        const udtaStart = moovStart + udta.offset + 8;
        const udtaLen = udta.size - 8;
        const udtaData = new DataView(view.buffer, udtaStart, udtaLen);
        const udtaAtoms = parseMp4Atoms(udtaData);

        const meta = udtaAtoms.find((a) => a.type === 'meta');
        if (!meta) return;

        const metaStart = udtaStart + meta.offset + 12;
        const metaLen = meta.size - 12;
        const metaData = new DataView(view.buffer, metaStart, metaLen);
        const metaAtoms = parseMp4Atoms(metaData);

        const ilst = metaAtoms.find((a) => a.type === 'ilst');
        if (!ilst) return;

        const ilstStart = metaStart + ilst.offset + 8;
        const ilstLen = ilst.size - 8;
        const ilstData = new DataView(view.buffer, ilstStart, ilstLen);
        const items = parseMp4Atoms(ilstData);

        let artistStr = null;

        for (const item of items) {
            const itemStart = ilstStart + item.offset + 8;
            const itemLen = item.size - 8;
            const itemData = new DataView(view.buffer, itemStart, itemLen);
            const dataAtom = parseMp4Atoms(itemData).find((a) => a.type === 'data');
            if (dataAtom) {
                const contentLen = dataAtom.size - 16;
                const contentOffset = itemStart + dataAtom.offset + 16;

                if (item.type === '©nam') {
                    metadata.title = new TextDecoder().decode(new Uint8Array(view.buffer, contentOffset, contentLen));
                } else if (item.type === '©ART') {
                    artistStr = new TextDecoder().decode(new Uint8Array(view.buffer, contentOffset, contentLen));
                } else if (item.type === '©alb') {
                    metadata.album.title = new TextDecoder().decode(
                        new Uint8Array(view.buffer, contentOffset, contentLen)
                    );
                } else if (item.type === 'ISRC') {
                    metadata.isrc = new TextDecoder().decode(new Uint8Array(view.buffer, contentOffset, contentLen));
                } else if (item.type === 'cprt') {
                    metadata.copyright = new TextDecoder().decode(
                        new Uint8Array(view.buffer, contentOffset, contentLen)
                    );
                } else if (item.type === 'covr') {
                    const pictureData = new Uint8Array(view.buffer, contentOffset, contentLen);
                    const mime = getMimeType(pictureData);
                    const blob = new Blob([pictureData], { type: mime });
                    metadata.album.cover = URL.createObjectURL(blob);
                } else if (item.type === 'rtng') {
                    metadata.explicit =
                        contentLen > 0 && new Uint8Array(view.buffer, contentOffset, contentLen)[0] === 1;
                }
            }
        }

        if (artistStr) {
            metadata.artists = artistStr.split(/; |\/|\\/).map((name) => ({ name: name.trim() }));
        }
    } catch (e) {
        console.warn('Error parsing M4A:', e);
    }
}

/**
 * Adds metadata to M4A files using MP4 atoms
 * @async
 * @param {Blob} m4aBlob - Source M4A audio blob
 * @param {object} track - Track object containing metadata to embed
 * @param {object} api - API client used to fetch album artwork
 * @returns {Promise<Blob>} New M4A Blob with metadata embedded, or the original on failure
 */
export async function addM4aMetadata(m4aBlob, track, api) {
    try {
        const arrayBuffer = await m4aBlob.arrayBuffer();
        const dataView = new DataView(arrayBuffer);

        // Parse MP4 atoms
        const atoms = parseMp4Atoms(dataView);

        // Create metadata atoms
        const metadataAtoms = createMp4MetadataAtoms(track);

        // Fetch album artwork if available
        if (track.album?.cover) {
            try {
                const imageBlob = await getCoverBlob(api, track.album.cover);
                if (imageBlob) {
                    const imageBytes = new Uint8Array(await imageBlob.arrayBuffer());
                    /** @type {Record<string, any>} */ (metadataAtoms).cover = {
                        type: 'covr',
                        data: imageBytes,
                    };
                }
            } catch (error) {
                console.warn('Failed to embed album art in M4A:', error);
            }
        }

        // Rebuild MP4 file with metadata
        const newMp4Data = rebuildMp4WithMetadata(dataView, atoms, metadataAtoms);

        return new Blob([/** @type {ArrayBuffer} */ (newMp4Data.buffer)], { type: 'audio/mp4' });
    } catch (error) {
        console.error('Failed to add M4A metadata:', error);
        return m4aBlob;
    }
}

/**
 * Parses a flat list of MP4 atoms from a DataView.
 * Handles standard 32-bit sizes, the special "extends to EOF" size-0, and 64-bit extended sizes.
 * @param {DataView} dataView - DataView over the byte range to parse
 * @returns {Array<{type: string, offset: number, size: number}>} Parsed atom descriptors (non-recursive)
 */
export function parseMp4Atoms(dataView) {
    const atoms = [];
    let offset = 0;

    while (offset + 8 <= dataView.byteLength) {
        // MP4 atoms use big-endian byte order
        let size = dataView.getUint32(offset, false);

        // Handle special size values
        if (size === 0) {
            // Size 0 means the atom extends to the end of the file
            size = dataView.byteLength - offset;
        } else if (size === 1) {
            // Size 1 means 64-bit extended size follows (after the type field)
            if (offset + 16 > dataView.byteLength) {
                break;
            }
            // Read 64-bit size from offset+8 (big-endian)
            const sizeHigh = dataView.getUint32(offset + 8, false);
            const sizeLow = dataView.getUint32(offset + 12, false);
            if (sizeHigh !== 0) {
                console.warn('64-bit MP4 atoms larger than 4GB are not supported - file may be processed incompletely');
                break;
            }
            size = sizeLow;
        }

        if (size < 8 || offset + size > dataView.byteLength) {
            break;
        }

        const type = String.fromCharCode(
            dataView.getUint8(offset + 4),
            dataView.getUint8(offset + 5),
            dataView.getUint8(offset + 6),
            dataView.getUint8(offset + 7)
        );

        atoms.push({
            type: type,
            offset: offset,
            size: size,
        });

        offset += size;
    }

    return atoms;
}

/**
 * Builds the iTunes-style tag dictionary and user-defined tag list from a track object.
 * Returns a `{ tags, userTags }` object ready for {@link createMetadataBlock}.
 * @param {object} track - Track object containing metadata fields
 * @returns {{ tags: Object.<string, string|number|{current: number, total: number|undefined}>, userTags: Array<[string, string, string]> }} Structured tag data
 */
export function createMp4MetadataAtoms(track) {
    // MP4 metadata atoms are more complex than FLAC
    // We'll create basic iTunes-style metadata

    /**
     * Array of arrays: [namespace, name, value]
     */
    const userTags = [];
    const tags = {
        '©nam': getTrackTitle(track) || DEFAULT_TITLE,
        '©ART': getFullArtistString(track) || DEFAULT_ARTIST,
        '©alb': track.album?.title || DEFAULT_ALBUM,
        aART: track.album?.artist?.name || track.artist?.name || DEFAULT_ARTIST,
    };

    if (track.isrc) {
        tags['ISRC'] = track.isrc;
        tags['xid '] = ':isrc:' + track.isrc;
    }

    if (track.copyright) {
        tags['cprt'] = track.copyright;
    }

    if (track.trackNumber) {
        tags['trkn'] = {
            current: track.trackNumber,
            total: track.album?.numberOfTracks,
        };
    }
    if (track.explicit) {
        tags['rtng'] = 1; // 1 = Explicit, 2 = Clean, 0 = Unknown
    }

    const discNumber = track.volumeNumber ?? track.discNumber;
    if (discNumber) {
        tags['disk'] = {
            current: discNumber,
            total: 0,
        };
    }

    if (track.bpm) {
        tags['tmpo'] = Math.round(track.bpm);
    }

    const releaseDateStr =
        track.album?.releaseDate || (track.streamStartDate ? track.streamStartDate.split('T')[0] : '');
    if (releaseDateStr) {
        try {
            const year = new Date(releaseDateStr).getFullYear();
            if (!isNaN(year)) {
                tags['©day'] = String(year);
            }
        } catch {
            // Invalid date, skip
        }
    }

    if (track.replayGain) {
        const { albumReplayGain, albumPeakAmplitude, trackReplayGain, trackPeakAmplitude } = track.replayGain;
        let trackPeakAmplitudeString = String(trackPeakAmplitude);
        let albumPeakAmplitudeString = String(albumPeakAmplitude);

        if (trackPeakAmplitudeString.indexOf('.') === -1) {
            trackPeakAmplitudeString += '.000000';
        }
        if (albumPeakAmplitudeString.indexOf('.') === -1) {
            albumPeakAmplitudeString += '.000000';
        }

        if (trackPeakAmplitude) userTags.push(['com.apple.iTunes', 'replaygain_track_peak', trackPeakAmplitudeString]);
        if (trackReplayGain) userTags.push(['com.apple.iTunes', 'replaygain_track_gain', `${trackReplayGain} dB`]);
        if (albumPeakAmplitude) userTags.push(['com.apple.iTunes', 'replaygain_album_peak', albumPeakAmplitudeString]);
        if (albumReplayGain) userTags.push(['com.apple.iTunes', 'replaygain_album_gain', `${albumReplayGain} dB`]);
    }

    return { tags, userTags: /** @type {[string, string, string][]} */ (userTags) };
}

/**
 * Rebuilds an MP4 file by replacing the `udta` atom inside `moov` with freshly constructed metadata.
 * Adjusts `stco`/`co64` chunk offsets when `moov` precedes `mdat` and its size changes.
 * @param {DataView} dataView - DataView over the original MP4 file bytes
 * @param {Array<{type: string, offset: number, size: number}>} atoms - Top-level atoms from {@link parseMp4Atoms}
 * @param {{ tags: object, userTags: Array<[string, string, string]>, cover?: {type: string, data: Uint8Array} }} metadataAtoms - Metadata to embed
 * @returns {Uint8Array} Rebuilt MP4 file as a new byte array
 */
export function rebuildMp4WithMetadata(dataView, atoms, metadataAtoms) {
    const originalArray = new Uint8Array(dataView.buffer);

    // Find moov atom
    const moovAtom = atoms.find((a) => a.type === 'moov');
    if (!moovAtom) {
        console.warn('No moov atom found in M4A file');
        return originalArray;
    }

    // Construct the new metadata block (udta -> meta -> ilst)
    const newMetadataBytes = createMetadataBlock(metadataAtoms);

    // We need to insert this into the moov atom.
    // If udta exists, we merge/replace. For simplicity, we'll append/create.
    // Ideally, we should parse moov children to find udta.

    // 1. Calculate new sizes
    // New file size = Original size + Metadata block size
    // Note: If we are replacing existing metadata, this calculation would be different,
    // but here we are assuming we are adding fresh or appending.
    // A robust implementation would parse moov children, remove existing udta, and add new one.

    // Let's try to do it right: parse moov children
    const moovChildren = parseMp4Atoms(new DataView(originalArray.buffer, moovAtom.offset + 8, moovAtom.size - 8));

    // Filter out existing udta to replace it
    const filteredMoovChildren = moovChildren.filter((a) => a.type !== 'udta');

    // Calculate new moov size
    // Header (8) + Sum of other children sizes + New Metadata Block Size
    let newMoovSize = 8;
    for (const child of filteredMoovChildren) {
        newMoovSize += child.size;
    }
    newMoovSize += newMetadataBytes.length;

    const sizeDiff = newMoovSize - moovAtom.size;
    const newFileSize = originalArray.length + sizeDiff;

    const newFile = new Uint8Array(newFileSize);
    let offset = 0;
    let originalOffset = 0;

    // Copy atoms before moov
    const atomsBeforeMoov = atoms.filter((a) => a.offset < moovAtom.offset);
    for (const atom of atomsBeforeMoov) {
        newFile.set(originalArray.subarray(atom.offset, atom.offset + atom.size), offset);
        offset += atom.size;
        originalOffset += atom.size;
    }

    // Write new moov atom
    // Size
    newFile[offset++] = (newMoovSize >> 24) & 0xff;
    newFile[offset++] = (newMoovSize >> 16) & 0xff;
    newFile[offset++] = (newMoovSize >> 8) & 0xff;
    newFile[offset++] = newMoovSize & 0xff;

    // Type 'moov'
    newFile[offset++] = 0x6d;
    newFile[offset++] = 0x6f;
    newFile[offset++] = 0x6f;
    newFile[offset++] = 0x76;

    // Write preserved children of moov
    for (const child of filteredMoovChildren) {
        const absoluteChildStart = moovAtom.offset + 8 + child.offset;
        newFile.set(originalArray.subarray(absoluteChildStart, absoluteChildStart + child.size), offset);
        offset += child.size;
    }

    // Write new metadata block (udta)
    newFile.set(newMetadataBytes, offset);
    offset += newMetadataBytes.length;

    // Update originalOffset to skip old moov
    originalOffset = moovAtom.offset + moovAtom.size;

    // Copy atoms after moov
    // Adjust offsets in stco/co64 atoms if necessary?
    // Changing the size of moov (or atoms before mdat) shifts the mdat offsets.
    // If moov comes before mdat, we MUST update the Chunk Offset Atom (stco or co64).
    // This is complex.

    // Safe strategy: If moov is AFTER mdat, we don't need to update offsets.
    // If moov is BEFORE mdat, we need to shift offsets.
    // Most streaming optimized files have moov before mdat.

    const mdatAtom = atoms.find((a) => a.type === 'mdat');
    const moovBeforeMdat = mdatAtom && moovAtom.offset < mdatAtom.offset;

    if (moovBeforeMdat) {
        // We need to update stco/co64 atoms inside the copied moov children content in newFile.
        // This is getting very complicated for a simple "add metadata" feature without a proper library.
        // However, we can try to find 'stco' or 'co64' in the new buffer we just wrote and offset values.

        // Let's assume we need to shift by sizeDiff.
        updateChunkOffsets(newFile, offset - newMoovSize, newMoovSize, sizeDiff);
    }

    // Copy remaining data (mdat etc.)
    if (originalOffset < originalArray.length) {
        newFile.set(originalArray.subarray(originalOffset), offset);
    }

    return newFile;
}

/**
 * Assembles a complete iTunes-compatible `udta` atom from the provided metadata atoms.
 * Internal structure: `udta` → `meta` (FullAtom) → `hdlr` + `ilst`.
 * @param {{ tags: object, userTags: Array<[string, string, string]>, cover?: {type: string, data: Uint8Array} }} metadataAtoms - Metadata to serialise
 * @returns {Uint8Array} Binary `udta` atom bytes
 */
export function createMetadataBlock(metadataAtoms) {
    const { tags, userTags, cover } = metadataAtoms;

    const ilstChildren = [];

    // Text tags
    for (const [key, value] of Object.entries(tags)) {
        if (key === 'trkn' || key === 'disk') {
            ilstChildren.push(createIntAtom(key, value));
        } else if (key === 'rtng') {
            ilstChildren.push(createUintAtom(key, value, 1));
        } else if (key === 'tmpo') {
            ilstChildren.push(createUintAtom(key, value, 2));
        } else {
            ilstChildren.push(createStringAtom(key, value));
        }
    }

    // User tags
    for (const [namespace, name, value] of userTags) {
        ilstChildren.push(createUserAtom(namespace, name, value));
    }

    // Cover art
    if (cover) {
        ilstChildren.push(createCoverAtom(cover.data));
    }

    // Construct ilst atom
    const ilstSize = 8 + ilstChildren.reduce((acc, buf) => acc + buf.length, 0);
    const ilst = new Uint8Array(ilstSize);
    let offset = 0;

    writeAtomHeader(ilst, offset, ilstSize, 'ilst');
    offset += 8;

    for (const child of ilstChildren) {
        ilst.set(child, offset);
        offset += child.length;
    }

    // Construct meta atom (FullAtom, version+flags = 4 bytes)
    const metaSize = 12 + ilstSize;
    const meta = new Uint8Array(metaSize);
    offset = 0;

    writeAtomHeader(meta, offset, metaSize, 'meta');
    offset += 8;

    meta[offset++] = 0; // Version
    meta[offset++] = 0; // Flags
    meta[offset++] = 0;
    meta[offset++] = 0;

    meta.set(ilst, offset);

    // Construct hdlr atom (required for meta)
    // "mdir" subtype, "appl" manufacturer, 0 flags/masks, empty name
    // hdlr size: 4 (size) + 4 (type) + 4 (ver/flags) + 4 (pre_defined) + 4 (handler_type) + 12 (reserved) + name (string)
    // Minimal valid hdlr for iTunes metadata:
    const hdlrContent = new Uint8Array([
        0,
        0,
        0,
        0, // Version/Flags
        0,
        0,
        0,
        0, // Pre-defined
        0x6d,
        0x64,
        0x69,
        0x72, // 'mdir'
        0x61,
        0x70,
        0x70,
        0x6c, // 'appl'
        0,
        0,
        0,
        0, // Reserved
        0,
        0,
        0,
        0,
        0,
        0, // Name (empty null-term) check spec? usually simple 0 is enough
    ]);
    const hdlrSize = 8 + hdlrContent.length;
    const hdlr = new Uint8Array(hdlrSize);
    writeAtomHeader(hdlr, 0, hdlrSize, 'hdlr');
    hdlr.set(hdlrContent, 8);

    // Construct udta atom
    // udta contains meta. meta usually should contain hdlr before ilst?
    // Actually, QuickTime spec says meta contains hdlr then ilst.

    const finalMetaSize = 12 + hdlrSize + ilstSize;
    const finalMeta = new Uint8Array(finalMetaSize);
    offset = 0;
    writeAtomHeader(finalMeta, offset, finalMetaSize, 'meta');
    offset += 8;
    finalMeta[offset++] = 0; // Version
    finalMeta[offset++] = 0; // Flags
    finalMeta[offset++] = 0;
    finalMeta[offset++] = 0;

    finalMeta.set(hdlr, offset);
    offset += hdlrSize;
    finalMeta.set(ilst, offset);

    const udtaSize = 8 + finalMetaSize;
    const udta = new Uint8Array(udtaSize);
    writeAtomHeader(udta, 0, udtaSize, 'udta');
    udta.set(finalMeta, 8);

    return udta;
}

/**
 * Creates an iTunes-style string atom (e.g. `©nam`, `©ART`) with a UTF-8 text payload.
 * @param {string} type - Atom type / four-character code (e.g. `'©nam'`)
 * @param {string} value - UTF-8 text value to store
 * @param {boolean} [truncateType=true] - Whether to truncate the type field to exactly 4 bytes
 * @returns {Uint8Array} Serialised atom bytes
 */
export function createStringAtom(type, value, truncateType = true) {
    const typeLength = truncateType ? 4 : type.length;
    const textBytes = new TextEncoder().encode(value);
    const dataSize = 16 + textBytes.length; // 8 (data atom header) + 8 (flags/null) + text
    const atomSize = 4 + typeLength + dataSize;

    const buf = new Uint8Array(atomSize);
    let offset = 0;

    // Wrapper atom (e.g., ©nam)
    writeAtomHeader(buf, offset, atomSize, type, truncateType);
    offset += 4 + typeLength;

    // Data atom
    writeAtomHeader(buf, offset, dataSize, 'data');
    offset += 8;

    // Data Type (1 = UTF-8 text) + Locale (0)
    buf[offset++] = 0;
    buf[offset++] = 0;
    buf[offset++] = 0;
    buf[offset++] = 1; // Type 1
    buf[offset++] = 0;
    buf[offset++] = 0;
    buf[offset++] = 0;
    buf[offset++] = 0;

    buf.set(textBytes, offset);

    return buf;
}

/**
 * Creates a `----` (user-defined / freeform) atom containing a text value.
 * Structure: `----` → `mean` (namespace) + `name` + `data`.
 * @param {string} namespace - Reverse-DNS namespace (e.g. `'com.apple.iTunes'`)
 * @param {string} name - Tag name within the namespace (e.g. `'replaygain_track_gain'`)
 * @param {string} value - UTF-8 text value to store
 * @returns {Uint8Array} Serialised `----` atom bytes
 */
export function createUserAtom(namespace, name, value) {
    const encoder = new TextEncoder();
    const _dashBytes = encoder.encode('----'); // User-defined atom type
    const namespaceBytes = encoder.encode(namespace);
    const _meanBytes = encoder.encode('mean'); // Standard 'mean' atom for namespace
    const nameBytes = encoder.encode(name);
    const valueBytes = encoder.encode('\x00\x00\x00\x01\x00\x00\x00\x00' + value);

    /**
     * Atom structure:
     * [----] (atom header)
     *   [mean] (namespace)
     *   [name] (name)
     *   [data] (value)
     */
    const atomSize = 8 + 12 + namespaceBytes.length + 12 + nameBytes.length + 8 + valueBytes.length;

    const buf = new Uint8Array(atomSize);
    let offset = 0;
    writeAtomHeader(buf, offset, atomSize, '----');
    offset += 8; // Skip header
    writeAtomHeader(buf, offset, namespaceBytes.length + 12, 'mean');
    offset += 12;
    buf.set(namespaceBytes, offset);
    offset += namespaceBytes.length;
    writeAtomHeader(buf, offset, nameBytes.length + 12, 'name');
    offset += 12;
    buf.set(nameBytes, offset);
    offset += nameBytes.length;
    writeAtomHeader(buf, offset, valueBytes.length + 8, 'data');
    offset += 8;
    buf.set(valueBytes, offset);

    return buf;
}

/**
 * Converts a number or BigInt value to a big-endian byte array.
 * @param {number|BigInt|null} value - The value to convert to bytes. If null, returns null.
 * @param {number|null} [byteLength=null] - Optional fixed byte length. If provided, the result will be padded or truncated to this length. If not provided, returns the minimal byte representation.
 * @returns {Uint8Array} A Uint8Array representing the value in big-endian format, or null if value is null.
 * @throws {Error} If the value is a negative number.
 * @example
 * // Variable length (minimal bytes)
 * toBigEndianBytes(256); // Uint8Array [ 1, 0 ]
 * toBigEndianBytes(0); // Uint8Array [ 0 ]
 *
 * // Fixed length with padding
 * toBigEndianBytes(1, 4); // Uint8Array [ 0, 0, 0, 1 ]
 *
 * // With BigInt
 * toBigEndianBytes(0xDEADBEEFn, 4); // Uint8Array [ 222, 173, 190, 239 ]
 */
export function toBigEndianBytes(value, byteLength = null) {
    if (value == null) return new Uint8Array(0);

    if (!Number.isSafeInteger(value) || value < 0) {
        throw new Error('Value must be a non-negative safe integer.');
    }

    // Fixed-length mode
    if (byteLength != null) {
        const bytes = new Uint8Array(byteLength);
        for (let i = byteLength - 1; i >= 0; i--) {
            bytes[i] = Number(value) & 0xff;
            value = Math.floor(Number(value) / 256);
        }
        return bytes;
    }

    // Variable (minimal) mode
    if (value === 0) return new Uint8Array([0]);

    const result = [];
    while (value > 0) {
        result.push(Number(value) & 0xff);
        value = Math.floor(Number(value) / 256);
    }

    result.reverse();

    return new Uint8Array(result);
}

/**
 * Creates an unsigned-integer atom (data type 21) for tags such as `tmpo` (BPM) or `rtng` (rating).
 * @param {string} key - Four-character atom type identifier
 * @param {number} value - Non-negative integer value to store
 * @param {number} [intByteLength=1] - Byte width of the stored integer (1 or 2)
 * @returns {Uint8Array} Serialised atom bytes
 */
export function createUintAtom(key, value, intByteLength = 1) {
    const numberBytes = toBigEndianBytes(value, intByteLength);
    const dataSize = 16 + intByteLength; // Atom header (8) + number bytes
    const atomSize = 8 + dataSize;

    const buf = new Uint8Array(atomSize);
    let offset = 0;

    // Wrapper atom (e.g., ©nam)
    writeAtomHeader(buf, offset, atomSize, key);
    offset += 8;

    // Data atom
    writeAtomHeader(buf, offset, dataSize, 'data');
    offset += 8;

    // Data Type ((Big Endian Unsigned Integer) + Locale (0))
    buf[offset++] = 0;
    buf[offset++] = 0;
    buf[offset++] = 0;
    buf[offset++] = 21; // Type 21
    buf[offset++] = 0;
    buf[offset++] = 0;
    buf[offset++] = 0;
    buf[offset++] = 0;
    buf.set(numberBytes, offset++);

    return buf;
}

/**
 * Creates a track/disc number atom (`trkn` or `disk`) with a current/total pair.
 * The payload layout follows the iTunes convention: reserved(2) + current(2) + total(2) + reserved(2).
 * @param {string} type - Atom type: `'trkn'` or `'disk'`
 * @param {number | {current: number, total?: number}} value - Track/disc number, or an object with `current` and optional `total`
 * @returns {Uint8Array} Serialised atom bytes
 */
export function createIntAtom(type, value) {
    // trkn/disk are special: data is 8 bytes.
    // reserved(2) + track(2) + total(2) + reserved(2)
    const dataSize = 16 + 8;
    const atomSize = 8 + dataSize;

    const buf = new Uint8Array(atomSize);
    let offset = 0;

    writeAtomHeader(buf, offset, atomSize, type);
    offset += 8;

    writeAtomHeader(buf, offset, dataSize, 'data');
    offset += 8;

    // Data Type (0 = implicit/int) + Locale
    buf[offset++] = 0;
    buf[offset++] = 0;
    buf[offset++] = 0;
    buf[offset++] = 0; // Type 0
    buf[offset++] = 0;
    buf[offset++] = 0;
    buf[offset++] = 0;
    buf[offset++] = 0;

    const current = typeof value === 'object' ? value.current : value;
    const total = typeof value === 'object' ? value.total : 0;

    // Numbering payload (track/disc number + total)
    buf[offset++] = 0;
    buf[offset++] = 0;
    const numberValue = parseInt(String(current), 10) || 0;
    buf[offset++] = (numberValue >> 8) & 0xff;
    buf[offset++] = numberValue & 0xff;
    const totalValue = parseInt(String(total ?? 0), 10) || 0;
    buf[offset++] = (totalValue >> 8) & 0xff;
    buf[offset++] = totalValue & 0xff;
    buf[offset++] = 0;
    buf[offset++] = 0;

    return buf;
}

/**
 * Creates a `covr` atom containing raw image bytes.
 * Automatically selects data type 13 (JPEG) or 14 (PNG) based on the image signature.
 * @param {Uint8Array} imageBytes - Raw image bytes (JPEG or PNG)
 * @returns {Uint8Array} Serialised `covr` atom bytes
 */
export function createCoverAtom(imageBytes) {
    const dataSize = 16 + imageBytes.length;
    const atomSize = 8 + dataSize;

    const buf = new Uint8Array(atomSize);
    let offset = 0;

    writeAtomHeader(buf, offset, atomSize, 'covr');
    offset += 8;

    writeAtomHeader(buf, offset, dataSize, 'data');
    offset += 8;

    // Data Type (13 = JPEG, 14 = PNG)
    // We try to detect or default to JPEG (13)
    let type = 13;
    if (imageBytes[0] === 0x89 && imageBytes[1] === 0x50) {
        // PNG signature
        type = 14;
    }

    buf[offset++] = 0;
    buf[offset++] = 0;
    buf[offset++] = 0;
    buf[offset++] = type;
    buf[offset++] = 0;
    buf[offset++] = 0;
    buf[offset++] = 0;
    buf[offset++] = 0;

    buf.set(imageBytes, offset);

    return buf;
}

/**
 * Creates an atom header for MP4 metadata.
 * @param {number} size - The size of the atom in bytes.
 * @param {string} type - The 4-character atom type identifier.
 * @param {boolean} [truncate=false] - Whether to truncate the type to 4 characters or use full length.
 * @returns {Uint8Array} A byte array containing the atom header with size and type information.
 */
export function getAtomHeader(size, type, truncate = false) {
    const buf = new Uint8Array(4 + (truncate ? 4 : type.length));
    buf[0] = (size >> 24) & 0xff;
    buf[1] = (size >> 16) & 0xff;
    buf[2] = (size >> 8) & 0xff;
    buf[3] = size & 0xff;

    for (let i = 0; i < (truncate ? 4 : type.length); i++) {
        buf[4 + i] = type.charCodeAt(i);
    }

    return buf;
}

/**
 * Writes an atom header to a buffer at the specified offset.
 * @param {Uint8Array} buf - The buffer to write the atom header to.
 * @param {number} offset - The offset in the buffer where the atom header should be written.
 * @param {number} size - The size of the atom.
 * @param {string} type - The type of the atom (typically a 4-character code).
 * @param {boolean} [truncate=true] - Whether to truncate the atom header. Defaults to true.
 * @returns {void}
 */
export function writeAtomHeader(buf, offset, size, type, truncate = true) {
    buf.set(getAtomHeader(size, type, truncate), offset);
}

/**
 * Updates `stco` (32-bit) and `co64` (64-bit) chunk offset atoms found within a moov region.
 * Called after the `moov` atom is resized to keep chunk offsets pointing at the correct `mdat` position.
 * @param {Uint8Array} buffer - Full output buffer containing the rebuilt file
 * @param {number} moovOffset - Byte offset of the `moov` atom header within `buffer`
 * @param {number} moovSize - Total byte size of the `moov` atom (including its 8-byte header)
 * @param {number} shift - Number of bytes to add to each stored chunk offset
 * @returns {void}
 */
export function updateChunkOffsets(buffer, moovOffset, moovSize, shift) {
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

    // Scan moov for stco/co64
    // This is a naive recursive search restricted to the known moov range

    // We parse atoms starting from moov content
    let offset = moovOffset + 8; // Skip moov header
    const end = moovOffset + moovSize;

    findAndShiftOffsets(view, offset, end, shift);
}

/**
 * Recursively scans a byte range for `stco` and `co64` atoms and shifts each stored offset value.
 * Also recurses into container atoms (`trak`, `mdia`, `minf`, `stbl`).
 * @param {DataView} view - DataView over the output buffer
 * @param {number} start - Start byte offset (inclusive) of the range to scan
 * @param {number} end - End byte offset (exclusive) of the range to scan
 * @param {number} shift - Bytes to add to each chunk offset entry
 * @returns {void}
 */
export function findAndShiftOffsets(view, start, end, shift) {
    let offset = start;

    while (offset + 8 <= end) {
        const size = view.getUint32(offset, false);
        const type = String.fromCharCode(
            view.getUint8(offset + 4),
            view.getUint8(offset + 5),
            view.getUint8(offset + 6),
            view.getUint8(offset + 7)
        );

        if (size < 8) break;

        if (type === 'trak' || type === 'mdia' || type === 'minf' || type === 'stbl') {
            // Container atoms, recurse
            findAndShiftOffsets(view, offset + 8, offset + size, shift);
        } else if (type === 'stco') {
            // Chunk Offset Atom (32-bit)
            // Header (8) + Version(1) + Flags(3) + Count(4) + Entries(Count * 4)
            const count = view.getUint32(offset + 12, false);
            for (let i = 0; i < count; i++) {
                const entryOffset = offset + 16 + i * 4;
                const oldVal = view.getUint32(entryOffset, false);
                view.setUint32(entryOffset, oldVal + shift, false);
            }
        } else if (type === 'co64') {
            // Chunk Offset Atom (64-bit)
            // Header (8) + Version(1) + Flags(3) + Count(4) + Entries(Count * 8)
            const count = view.getUint32(offset + 12, false);
            for (let i = 0; i < count; i++) {
                const entryOffset = offset + 16 + i * 8;
                // Read 64-bit int
                const oldHigh = view.getUint32(entryOffset, false);
                const oldLow = view.getUint32(entryOffset + 4, false);

                // Add shift (assuming shift is small enough not to overflow low 32 in a way that affects high simply?)
                // Shift is Javascript number (double), up to 9007199254740991.
                // 32-bit uint max is 4294967295.

                // Proper 64-bit addition
                // Construct BigInt
                // Note: BigInt might not be available in all older environments, but modern browsers support it.
                // Fallback: simpler logic

                let newLow = oldLow + shift;
                let carry = 0;
                if (newLow > 0xffffffff) {
                    carry = Math.floor(newLow / 0x100000000);
                    newLow = newLow >>> 0;
                }
                const newHigh = oldHigh + carry;

                view.setUint32(entryOffset, newHigh, false);
                view.setUint32(entryOffset + 4, newLow, false);
            }
        }

        offset += size;
    }
}
