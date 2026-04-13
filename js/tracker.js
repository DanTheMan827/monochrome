// @ts-check
// js/tracker.js
import { escapeHtml, trackDataStore, formatTime } from './utils.js';
import { navigate } from './router.js';
import { SVG_MENU, SVG_PLAY, SVG_HEART } from './icons.js';
import { Player } from './player.js';

let artistsData = [];
let artistsPopularity = new Map(); // name -> popularity score

// Map to store artist info keyed by sheetId for quick lookup
const artistBySheetId = new Map();

// Store all songs for search functionality
let allSongsCache = new Map(); // sheetId -> {era, songs}

/**
 * Normalizes an artist name for use in image URLs by removing spaces and special characters.
 * @param {string} name - The raw artist name.
 * @returns {string} The normalized lowercase alphanumeric name.
 */
function normalizeArtistName(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Strips producer credit annotations from a song title for scrobbling purposes.
 * @param {string} title - The original song title that may contain producer credits.
 * @returns {string} The cleaned song title without producer credit annotations.
 */
function cleanSongTitle(title) {
    if (!title) return '';
    // Remove (prod. ...), (produced by ...), [prod. ...], etc.
    return title
        .replace(/\s*[([]\s*prod\.?\s+[^)\]]+[)\]]/gi, '')
        .replace(/\s*[([]\s*produced\s+by\s+[^)\]]+[)\]]/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Fetches artist popularity scores from the ArtistGrid trends API and populates
 * the module-level `artistsPopularity` map.
 * @async
 * @returns {Promise<void>}
 */
async function loadArtistsPopularity() {
    try {
        const response = await fetch('https://trends.artistgrid.cx');
        if (!response.ok) return;
        const data = await response.json();
        if (data.results) {
            data.results.forEach((artist, index) => {
                // Store popularity score based on visitors and position
                const score = artist.visitors * (1 - index / data.results.length);
                artistsPopularity.set(artist.name, score);
            });
        }
    } catch (e) {
        console.log('Could not load popularity data:', e);
    }
}

/**
 * Fetches the full artists list from the ArtistGrid NDJSON asset, sorts entries by
 * popularity, and builds the `artistBySheetId` lookup map.
 * @async
 * @returns {Promise<void>}
 */
async function loadArtistsData() {
    try {
        const response = await fetch('https://assets.artistgrid.cx/artists.ndjson');
        if (!response.ok) throw new Error('Network response was not ok');
        const text = await response.text();
        artistsData = text
            .trim()
            .split('\n')
            .filter((line) => line.trim())
            .map((line) => {
                try {
                    return JSON.parse(line);
                } catch {
                    return null;
                }
            })
            .filter((item) => item !== null);

        // Sort by popularity if available
        artistsData.sort((a, b) => {
            const popA = artistsPopularity.get(a.name) || 0;
            const popB = artistsPopularity.get(b.name) || 0;
            return popB - popA;
        });

        // Build sheetId lookup map
        artistBySheetId.clear();
        artistsData.forEach((artist) => {
            const sheetId = getSheetId(artist.url);
            if (sheetId) {
                artistBySheetId.set(sheetId, artist);
            }
        });
    } catch (e) {
        console.error('Failed to load Artists List:', e);
    }
}

/**
 * Extracts the Google Sheets document ID from a spreadsheet URL.
 * @param {string|null|undefined} url - The Google Sheets URL to parse.
 * @returns {string|null} The sheet ID, or `null` if the URL is absent or unrecognised.
 */
function getSheetId(url) {
    if (!url) return null;
    const match = url.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
}

/**
 * Rewrites a tracker API image URL to the R2 CDN equivalent.
 * @param {string|null|undefined} url - The original image URL.
 * @returns {string|null|undefined} The rewritten CDN URL, or the original value when no rewrite is needed.
 */
function transformImageUrl(url) {
    if (!url) return url;
    return url.replace('https://s3.sad.ovh/trackerapi/', 'https://r2.artistgrid.cx/');
}

/**
 * Rewrites the `image` property of every era in an eras map to the R2 CDN URL.
 * @param {Record<string, {image?: string}>|null|undefined} eras - Map of era name to era object.
 * @returns {Record<string, {image?: string}>|null|undefined} The mutated eras map with updated image URLs.
 */
function transformErasImages(eras) {
    if (!eras) return eras;
    for (const eraName in eras) {
        const era = eras[eraName];
        if (era.image) {
            era.image = transformImageUrl(era.image);
        }
    }
    return eras;
}

/**
 * Fetches tracker data for a given sheet ID, trying multiple failover endpoints.
 * @async
 * @param {string} sheetId - The Google Sheets document ID.
 * @returns {Promise<object|null>} The parsed tracker data object, or `null` if all endpoints fail.
 */
async function fetchTrackerData(sheetId) {
    const endpoints = [
        'https://trackerapi-1.artistgrid.cx/get/',
        'https://trackerapi-2.artistgrid.cx/get/',
        'https://trackerapi-3.artistgrid.cx/get/',
    ];

    let lastError = null;
    for (const baseUrl of endpoints) {
        try {
            const response = await fetch(`${baseUrl}${sheetId}`);
            if (!response.ok) {
                lastError = new Error(`HTTP ${response.status}`);
                continue;
            }
            const data = await response.json();
            if (data.eras) {
                transformErasImages(data.eras);
            }
            return data;
        } catch (e) {
            lastError = e;
            console.warn(`Failed to fetch from ${baseUrl}, trying next...`);
        }
    }
    console.error('Failed to fetch tracker data from all endpoints', lastError);
    return null;
}

/**
 * Parses a `MM:SS` duration string into total seconds.
 * @param {string} durationStr - The duration string (e.g. `"3:45"`), or `"N/A"` / empty.
 * @returns {number} Total duration in seconds, or `0` if unparseable.
 */
function parseDuration(durationStr) {
    if (!durationStr || durationStr === 'N/A') return 0;
    const parts = durationStr.split(':');
    if (parts.length === 2) {
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return 0;
}

/**
 * Resolves a raw song URL to a direct audio download URL for known hosting providers.
 * Returns `null` for URLs that cannot be resolved to a direct audio stream.
 * @param {string|null|undefined} rawUrl - The raw URL from the tracker data.
 * @returns {string|null} A direct audio URL, or `null` if one cannot be determined.
 */
function getDirectUrl(rawUrl) {
    if (!rawUrl) return null;

    // Only return URLs that are known to be direct audio links
    if (rawUrl.includes('pillows.su/f/')) {
        const match = rawUrl.match(/pillows\.su\/f\/([a-f0-9]+)/);
        if (match) return `https://api.pillows.su/api/download/${match[1]}`;
    } else if (rawUrl.includes('music.froste.lol/song/')) {
        const match = rawUrl.match(/music\.froste\.lol\/song\/([a-f0-9]+)/);
        if (match) return `https://music.froste.lol/song/${match[1]}/download`;
    }

    // For other URLs, check if they look like direct audio files
    const audioExtensions = ['.mp3', '.m4a', '.flac', '.wav', '.ogg', '.aac'];
    const hasAudioExt = audioExtensions.some((ext) => rawUrl.toLowerCase().includes(ext));

    if (hasAudioExt) {
        return rawUrl;
    }

    // Return null for URLs that don't look like direct audio files
    return null;
}

/**
 * Converts a raw tracker song object into the standard track format used by the player.
 * @param {object} song - The raw song object from the tracker API.
 * @param {{name: string, image?: string, timeline?: string, data?: object}} era - The era this song belongs to.
 * @param {string} artistName - The display name of the artist.
 * @param {number} index - The zero-based position of the song within its era.
 * @param {string} [sheetId] - The Google Sheets document ID for the artist tracker.
 * @returns {object} A normalised track object compatible with the Player queue.
 */
export function createTrackFromSong(song, era, artistName, index, sheetId = '') {
    const isValidUrl = (u) => u && typeof u === 'string' && u.trim().length > 0;
    const rawUrl = (isValidUrl(song.url) ? song.url : null) || (song.urls ? song.urls.find(isValidUrl) : null);
    const directUrl = getDirectUrl(rawUrl);
    const duration = parseDuration(song.track_length);
    const cleanTitle = cleanSongTitle(song.name);

    return {
        id: `tracker-${sheetId}-${era.name}-${index}`,
        title: song.name,
        cleanTitle: cleanTitle,
        artist: {
            name: artistName,
        },
        artists: [
            {
                name: artistName,
            },
        ],
        album: {
            title: era.name,
            cover: era.image,
        },
        duration: duration,
        trackNumber: index + 1,
        isTracker: true,
        audioUrl: directUrl,
        remoteUrl: directUrl,
        explicit: false,
        unavailable: !directUrl,
        // Additional tracker-specific data for context menu
        trackerInfo: {
            sheetId: sheetId,
            timeline: era.timeline,
            description: song.desc || song.description || '',
            sourceUrl: rawUrl,
            category: song.category || '',
        },
    };
}

/**
 * Builds the inner HTML string for a single tracker track list item.
 * @param {object} track - The normalised track object.
 * @param {number} index - The zero-based display index used to render the track number.
 * @returns {string} An HTML string representing the track item.
 */
function createTrackerTrackItemHTML(track, index) {
    const isUnavailable = track.unavailable;
    const trackNumberHTML = `<div class="track-number">${index + 1}</div>`;

    const actionsHTML = isUnavailable
        ? ''
        : `
        <button class="track-menu-btn" type="button" title="More options">
            ${SVG_MENU(20)}
        </button>
    `;

    return `
        <div class="track-item ${isUnavailable ? 'unavailable' : ''}" 
             data-track-id="${track.id}"
             ${isUnavailable ? 'title="This track is currently unavailable"' : ''}>
            ${trackNumberHTML}
            <div class="track-item-info">
                <div class="track-item-details">
                    <div class="title">${escapeHtml(track.title)}</div>
                    <div class="artist">${escapeHtml(track.artist.name)}</div>
                </div>
            </div>
            <div class="track-item-duration">${isUnavailable ? '--:--' : formatTime(track.duration)}</div>
            <div class="track-item-actions">
                ${actionsHTML}
            </div>
        </div>
    `;
}

/**
 * Renders a list of tracker tracks into a container element, including a header row,
 * and binds each DOM element to its track data via `trackDataStore`.
 * @param {HTMLElement} container - The DOM element to render the track list into.
 * @param {object[]} tracks - Array of normalised track objects to render.
 * @returns {void}
 */
function renderTrackerTracks(container, tracks) {
    const fragment = document.createDocumentFragment();
    const tempDiv = document.createElement('div');

    // Add header like normal albums
    tempDiv.innerHTML = `
        <div class="track-list-header">
            <span style="width: 40px; text-align: center;">#</span>
            <span>Title</span>
            <span class="duration-header">Duration</span>
            <span style="display: flex; justify-content: flex-end; opacity: 0.8;">Menu</span>
        </div>
    `;

    // Add tracks
    const tracksHTML = tracks.map((track, i) => createTrackerTrackItemHTML(track, i)).join('');

    tempDiv.insertAdjacentHTML('beforeend', tracksHTML);

    // Bind data to elements
    Array.from(tempDiv.children).forEach((element, index) => {
        if (index === 0) return; // Skip header
        const track = tracks[index - 1];
        if (element && track) {
            trackDataStore.set(element, track);
        }
    });

    while (tempDiv.firstChild) {
        fragment.appendChild(tempDiv.firstChild);
    }

    container.innerHTML = '';
    container.appendChild(fragment);
}

/**
 * Generates the HTML markup for a tracker project card, styled like a regular album card.
 * @param {{name: string, image?: string, timeline?: string}} era - The era/project to create a card for.
 * @param {object} _artist - The artist object (unused, reserved for future use).
 * @param {string} sheetId - The Google Sheets document ID used to construct navigation links.
 * @param {number} trackCount - The total number of tracks in this project.
 * @returns {string} An HTML string for the project card.
 */
export function createProjectCardHTML(era, _artist, sheetId, trackCount) {
    const playBtnHTML = `
        <button class="play-btn card-play-btn" data-action="play-card" data-type="tracker-project" data-id="${encodeURIComponent(era.name)}" title="Play">
            ${SVG_PLAY(20)}
        </button>
        <button class="card-menu-btn" data-action="card-menu" data-type="tracker-project" data-id="${encodeURIComponent(era.name)}" title="Menu">
            ${SVG_MENU(20)}
        </button>
    `;

    return `
        <div class="card" data-tracker-project-id="${encodeURIComponent(era.name)}" data-sheet-id="${sheetId}" style="cursor: pointer;">
            <div class="card-image-wrapper">
                <img src="${era.image || 'assets/logo.svg'}" 
                     alt="${escapeHtml(era.name)}" 
                     class="card-image" 
                     loading="lazy"
                     onerror="this.src='assets/logo.svg'">
                <button class="like-btn card-like-btn" data-action="toggle-like" data-type="tracker-project" title="Add to Liked">
                    ${SVG_HEART(20)}
                </button>
                ${playBtnHTML}
            </div>
            <div class="card-info">
                <h3 class="card-title">${escapeHtml(era.name)}</h3>
                <p class="card-subtitle">${era.timeline || 'Unreleased'} • ${trackCount} tracks</p>
            </div>
        </div>
    `;
}

/**
 * Renders the artist-level tracker page showing a grid of unreleased project cards,
 * a search bar for songs, and sets up play/shuffle/download button handlers.
 * @async
 * @param {string} sheetId - The Google Sheets document ID identifying the artist.
 * @param {HTMLElement} container - The DOM element to render the page into.
 * @returns {Promise<void>}
 */
export async function renderTrackerArtistPage(sheetId, container) {
    if (!artistsData.length) {
        await loadArtistsData();
    }

    // Find artist by sheetId
    const artist = artistBySheetId.get(sheetId);
    if (!artist) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem;">Artist not found.</p>';
        return;
    }

    // Fetch tracker data
    const trackerData = await fetchTrackerData(sheetId);
    if (!trackerData || !trackerData.eras) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem;">Failed to load tracker data.</p>';
        return;
    }

    // Cache songs for search
    allSongsCache.set(sheetId, { artist, eras: trackerData.eras });

    const eras = Object.values(trackerData.eras);

    // Set up header
    const imageEl = /** @type {HTMLImageElement} */ (document.getElementById('tracker-artist-detail-image'));
    const nameEl = document.getElementById('tracker-artist-detail-name');
    const metaEl = document.getElementById('tracker-artist-detail-meta');
    const projectsContainer = document.getElementById('tracker-artist-projects-container');
    const playBtn = document.getElementById('play-tracker-artist-btn');
    const downloadBtn = document.getElementById('download-tracker-artist-btn');

    const normalizedName = normalizeArtistName(artist.name);
    imageEl.src = `https://assets.artistgrid.cx/${normalizedName}.webp`;
    imageEl.onerror = function () {
        this.src = 'assets/logo.svg';
    };
    nameEl.textContent = artist.name;
    metaEl.innerHTML = `<span>${eras.length} unreleased projects</span>`;

    // Set up shuffle play button
    if (playBtn) {
        playBtn.onclick = async () => {
            let allTracks = [];
            eras.forEach((era) => {
                if (era.data) {
                    Object.values(era.data).forEach((songs) => {
                        if (songs && songs.length) {
                            songs.forEach((song) => {
                                const track = createTrackFromSong(song, era, artist.name, allTracks.length, sheetId);
                                allTracks.push(track);
                            });
                        }
                    });
                }
            });

            const availableTracks = allTracks.filter((t) => !t.unavailable);
            if (availableTracks.length > 0) {
                const shuffled = [...availableTracks].sort(() => Math.random() - 0.5);
                void Player.instance.setQueue(shuffled, 0);
                void Player.instance.playTrackFromQueue();
            }
        };
    }

    // Set up download button
    if (downloadBtn) {
        downloadBtn.onclick = () => {
            alert('Bulk download coming soon! You can download individual tracks from the project pages.');
        };
    }

    // Add search bar (only if not already present)
    let searchContainer = document.getElementById('unreleased-search-container');
    if (!searchContainer) {
        searchContainer = document.createElement('div');
        searchContainer.id = 'unreleased-search-container';
        searchContainer.style.cssText = 'margin: 1rem 0; padding: 0 1rem;';
        searchContainer.innerHTML = `
            <input type="text" 
                   id="unreleased-search-input" 
                   placeholder="Search all unreleased songs..." 
                   style="width: 100%; 
                          padding: 0.75rem 1rem; 
                          border-radius: var(--radius); 
                          border: 1px solid var(--border); 
                          background: var(--background); 
                          color: var(--foreground);
                          font-size: 1rem;
                          outline: none;
                          transition: border-color 0.2s;"
                   onfocus="this.style.borderColor='var(--primary)'" 
                   onblur="this.style.borderColor='var(--border)'">
        `;
        projectsContainer.parentNode.insertBefore(searchContainer, projectsContainer);
    }

    // Render projects as cards
    projectsContainer.innerHTML = '';
    projectsContainer.className = 'card-grid';

    eras.forEach((era) => {
        let trackCount = 0;
        if (era.data) {
            Object.values(era.data).forEach((songs) => {
                if (songs && songs.length) {
                    trackCount += songs.length;
                }
            });
        }

        if (trackCount === 0) return;

        const cardHTML = createProjectCardHTML(era, artist, sheetId, trackCount);
        projectsContainer.insertAdjacentHTML('beforeend', cardHTML);

        const card = /** @type {HTMLElement & { _eraData?: object; _artistName?: string; _sheetId?: string }} */ (
            projectsContainer.lastElementChild
        );
        card._eraData = era;
        card._artistName = artist.name;
        card._sheetId = sheetId;

        card.onclick = (e) => {
            if (/** @type {Element} */ (e.target).closest('.card-play-btn')) {
                e.stopPropagation();
                let eraTracks = [];
                if (era.data) {
                    Object.values(era.data).forEach((songs) => {
                        if (songs && songs.length) {
                            songs.forEach((song) => {
                                const track = createTrackFromSong(song, era, artist.name, eraTracks.length, sheetId);
                                eraTracks.push(track);
                            });
                        }
                    });
                }
                const availableTracks = eraTracks.filter((t) => !t.unavailable);
                if (availableTracks.length > 0) {
                    void Player.instance.setQueue(availableTracks, 0);
                    void Player.instance.playTrackFromQueue();
                }
            } else if (/** @type {Element} */ (e.target).closest('.card-menu-btn')) {
                e.stopPropagation();
            } else {
                navigate(`/unreleased/${sheetId}/${encodeURIComponent(era.name)}`);
            }
        };
    });

    // Add search functionality
    const searchInput = document.getElementById('unreleased-search-input');
    searchInput.addEventListener('input', (e) => {
        const query = /** @type {HTMLInputElement} */ (e.target).value.toLowerCase().trim();
        if (!query) {
            // Reset view
            projectsContainer.style.display = '';
            document.getElementById('unreleased-search-results')?.remove();
            return;
        }

        // Search through all songs
        let matches = [];
        eras.forEach((era) => {
            if (era.data) {
                Object.values(era.data).forEach((songs) => {
                    if (songs && songs.length) {
                        songs.forEach((song, index) => {
                            if (song.name?.toLowerCase().includes(query)) {
                                matches.push({ song, era, index });
                            }
                        });
                    }
                });
            }
        });

        // Show results
        projectsContainer.style.display = 'none';
        let resultsContainer = document.getElementById('unreleased-search-results');
        if (!resultsContainer) {
            resultsContainer = document.createElement('div');
            resultsContainer.id = 'unreleased-search-results';
            projectsContainer.parentNode.insertBefore(resultsContainer, projectsContainer.nextSibling);
        }

        if (matches.length === 0) {
            resultsContainer.innerHTML =
                '<p style="text-align: center; padding: 2rem; color: var(--muted-foreground);">No songs found.</p>';
        } else {
            resultsContainer.innerHTML = `
                <h3 style="padding: 0 1rem; margin-bottom: 1rem;">Search Results (${matches.length} songs)</h3>
                <div class="track-list" id="unreleased-search-tracklist"></div>
            `;

            const tracklist = document.getElementById('unreleased-search-tracklist');
            const searchTracks = matches.map((m, i) => createTrackFromSong(m.song, m.era, artist.name, i, sheetId));
            renderTrackerTracks(tracklist, searchTracks);

            // Add click handlers
            tracklist.querySelectorAll('.track-item').forEach((item) => {
                const track = trackDataStore.get(item);
                if (!track || track.unavailable) return;

                /** @type {HTMLElement} */ (item).onclick = (e) => {
                    if (/** @type {Element} */ (e.target).closest('.track-menu-btn')) return;

                    const availableTracks = searchTracks.filter((t) => !t.unavailable);
                    const trackIndex = availableTracks.findIndex((t) => t.id === track.id);
                    if (trackIndex >= 0 && availableTracks.length > 0) {
                        void Player.instance.setQueue(availableTracks, trackIndex);
                        void Player.instance.playTrackFromQueue();
                    }
                };
            });
        }
    });

    document.title = `${artist.name} - Unreleased`;
}

/**
 * Renders the individual tracker project page for a specific era, populating the
 * album-detail template with track list, buttons, and related project recommendations.
 * @async
 * @param {string} sheetId - The Google Sheets document ID identifying the artist.
 * @param {string} projectName - The name of the project/era to display.
 * @param {HTMLElement} container - The DOM element to render the page into.
 * @param {object} _ui - UI helper object (unused, reserved for future use).
 * @returns {Promise<void>}
 */
export async function renderTrackerProjectPage(sheetId, projectName, container, _ui) {
    if (!artistsData.length) {
        await loadArtistsData();
    }

    const artist = artistBySheetId.get(sheetId);
    if (!artist) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem;">Project not found.</p>';
        return;
    }

    const trackerData = await fetchTrackerData(sheetId);
    if (!trackerData || !trackerData.eras) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem;">Failed to load project data.</p>';
        return;
    }

    const era = Object.values(trackerData.eras).find((e) => e.name === projectName);
    if (!era) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem;">Project not found.</p>';
        return;
    }

    // Collect all tracks for this era
    let eraTracks = [];
    if (era.data) {
        Object.values(era.data).forEach((songs) => {
            if (songs && songs.length) {
                songs.forEach((song) => {
                    const track = createTrackFromSong(song, era, artist.name, eraTracks.length, sheetId);
                    eraTracks.push(track);
                });
            }
        });
    }

    const availableCount = eraTracks.filter((t) => !t.unavailable).length;

    // Use the album page template structure
    const imageEl = /** @type {HTMLImageElement} */ (document.getElementById('album-detail-image'));
    const titleEl = document.getElementById('album-detail-title');
    const metaEl = document.getElementById('album-detail-meta');
    const prodEl = document.getElementById('album-detail-producer');
    const tracklistContainer = document.getElementById('album-detail-tracklist');
    const playBtn = document.getElementById('play-album-btn');
    const shuffleBtn = document.getElementById('shuffle-album-btn');
    const downloadBtn = document.getElementById('download-album-btn');
    const likeBtn = document.getElementById('like-album-btn');
    const mixBtn = document.getElementById('album-mix-btn');
    const addToPlaylistBtn = document.getElementById('add-album-to-playlist-btn');

    // Set album page content
    imageEl.src = era.image || 'assets/logo.svg';
    imageEl.onerror = function () {
        this.src = 'assets/logo.svg';
    };

    titleEl.textContent = era.name;
    metaEl.innerHTML = `${era.timeline || 'Unreleased'} • ${eraTracks.length} tracks • ${availableCount} available`;
    prodEl.innerHTML = `By <a href="/unreleased/${sheetId}">${artist.name}</a>`;

    // Setup buttons
    if (playBtn) {
        playBtn.innerHTML = `${SVG_PLAY(20)}<span>Play Project</span>`;
        playBtn.onclick = () => {
            const availableTracks = eraTracks.filter((t) => !t.unavailable);
            if (availableTracks.length > 0) {
                void Player.instance.setQueue(availableTracks, 0);
                void Player.instance.playTrackFromQueue();
            }
        };
    }

    if (shuffleBtn) {
        shuffleBtn.onclick = () => {
            const availableTracks = eraTracks.filter((t) => !t.unavailable);
            if (availableTracks.length > 0) {
                const shuffled = [...availableTracks].sort(() => Math.random() - 0.5);
                void Player.instance.setQueue(shuffled, 0);
                void Player.instance.playTrackFromQueue();
            }
        };
    }

    if (downloadBtn) {
        downloadBtn.innerHTML = `<span>Download</span>`;
        downloadBtn.onclick = () => {
            alert('Project download coming soon! You can download individual tracks from the menu.');
        };
    }

    if (likeBtn) likeBtn.style.display = 'none';
    if (mixBtn) mixBtn.style.display = 'none';
    if (addToPlaylistBtn) addToPlaylistBtn.style.display = 'none';

    // Render tracks
    renderTrackerTracks(tracklistContainer, eraTracks);

    // Add click handlers for tracks
    tracklistContainer.querySelectorAll('.track-item').forEach((item) => {
        const track = trackDataStore.get(item);
        if (!track || track.unavailable) return;

        /** @type {HTMLElement} */ (item).onclick = (e) => {
            if (/** @type {Element} */ (e.target).closest('.track-menu-btn')) return;

            const availableTracks = eraTracks.filter((t) => !t.unavailable);
            const trackIndex = availableTracks.findIndex((t) => t.id === track.id);
            if (trackIndex >= 0 && availableTracks.length > 0) {
                void Player.instance.setQueue(availableTracks, trackIndex);
                void Player.instance.playTrackFromQueue();
            }
        };
    });

    // Show other projects as recommendations
    const moreAlbumsSection = document.getElementById('album-section-more-albums');
    const moreAlbumsContainer = document.getElementById('album-detail-more-albums');
    const moreAlbumsTitle = document.getElementById('album-title-more-albums');

    if (moreAlbumsSection && moreAlbumsContainer) {
        const otherEras = Object.values(trackerData.eras).filter((e) => e.name !== projectName);
        if (otherEras.length > 0) {
            moreAlbumsContainer.innerHTML = otherEras
                .map((e) => {
                    let trackCount = 0;
                    if (e.data) {
                        Object.values(e.data).forEach((songs) => {
                            if (songs && songs.length) trackCount += songs.length;
                        });
                    }
                    return createProjectCardHTML(e, artist, sheetId, trackCount);
                })
                .join('');

            if (moreAlbumsTitle) {
                moreAlbumsTitle.textContent = `More unreleased from ${artist.name}`;
            }
            moreAlbumsSection.style.display = 'block';

            // Add click handlers for recommendation cards
            moreAlbumsContainer.querySelectorAll('.card').forEach((card) => {
                const htmlCard = /** @type {HTMLElement} */ (card);
                const eraName = decodeURIComponent(htmlCard.dataset.trackerProjectId);
                const era = trackerData.eras[eraName];
                if (!era) return;

                htmlCard.onclick = (e) => {
                    if (/** @type {Element} */ (e.target).closest('.card-play-btn')) {
                        e.stopPropagation();
                        let otherEraTracks = [];
                        if (era.data) {
                            Object.values(era.data).forEach((songs) => {
                                if (songs && songs.length) {
                                    songs.forEach((song) => {
                                        const track = createTrackFromSong(
                                            song,
                                            era,
                                            artist.name,
                                            otherEraTracks.length,
                                            sheetId
                                        );
                                        otherEraTracks.push(track);
                                    });
                                }
                            });
                        }
                        const availableTracks = otherEraTracks.filter((t) => !t.unavailable);
                        if (availableTracks.length > 0) {
                            void Player.instance.setQueue(availableTracks, 0);
                            void Player.instance.playTrackFromQueue();
                        }
                    } else if (/** @type {Element} */ (e.target).closest('.card-menu-btn')) {
                        e.stopPropagation();
                    } else {
                        navigate(`/unreleased/${sheetId}/${encodeURIComponent(era.name)}`);
                    }
                };
            });
        } else {
            moreAlbumsSection.style.display = 'none';
        }
    }

    // Hide other sections that don't apply
    const epsSection = document.getElementById('album-section-eps');
    const similarArtistsSection = document.getElementById('album-section-similar-artists');
    const similarAlbumsSection = document.getElementById('album-section-similar-albums');

    if (epsSection) epsSection.style.display = 'none';
    if (similarArtistsSection) similarArtistsSection.style.display = 'none';
    if (similarAlbumsSection) similarAlbumsSection.style.display = 'none';

    document.title = `${era.name} - ${artist.name}`;
}

/**
 * Renders the main unreleased music browsing page with a searchable grid of artist cards.
 * @async
 * @param {HTMLElement} container - The DOM element to render the page into.
 * @returns {Promise<void>}
 */
export async function renderUnreleasedPage(container) {
    container.innerHTML = `
        <h2 class="section-title">Unreleased Music</h2>
        <p style="color: var(--muted-foreground); margin-bottom: 1.5rem; font-size: 0.9rem;">
            Unreleased Songs & Info Provided By <a href="https://artistgrid.cx" target="_blank" style="text-decoration: underline;">ArtistGrid</a>. Consider Donating to Them.
        </p>
        <div style="margin-bottom: 1.5rem;">
            <input 
                type="text" 
                id="unreleased-search-input" 
                placeholder="Search artists..." 
                style="width: 100%; max-width: 400px; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid var(--border); background: var(--background); color: var(--foreground); font-size: 0.95rem;"
            />
        </div>
        <div id="unreleased-artists-grid" class="card-grid"></div>
        <div id="unreleased-no-results" style="display: none; text-align: center; padding: 2rem; color: var(--muted-foreground);">
            No artists found matching your search.
        </div>
    `;

    const gridContainer = document.getElementById('unreleased-artists-grid');
    const searchInput = document.getElementById('unreleased-search-input');
    const noResults = document.getElementById('unreleased-no-results');

    // Store all artist cards for filtering
    let allArtistCards = [];

    if (artistsData.length === 0) {
        await loadArtistsPopularity();
        await loadArtistsData();
    }

    gridContainer.innerHTML = '';
    allArtistCards = [];

    artistsData.forEach((artist) => {
        const sheetId = getSheetId(artist.url);
        if (!sheetId) return;

        if (!artist.name) return;

        const artistCard = document.createElement('div');
        artistCard.className = 'card';
        artistCard.style.cursor = 'pointer';
        artistCard.dataset.artistName = artist.name.toLowerCase();

        const normalizedName = normalizeArtistName(artist.name);
        const coverImage = `https://assets.artistgrid.cx/${normalizedName}.webp`;

        artistCard.innerHTML = `
            <div class="card-image-wrapper">
                <img class="card-image" src="${coverImage}" alt="${artist.name}" loading="lazy" onerror="this.src='assets/logo.svg'">
            </div>
            <div class="card-info">
                <h3 class="card-title">${artist.name}</h3>
                <p class="card-subtitle">Unreleased Music</p>
            </div>
        `;

        artistCard.onclick = () => {
            navigate(`/unreleased/${sheetId}`);
        };

        gridContainer.appendChild(artistCard);
        allArtistCards.push(artistCard);
    });

    if (artistsData.length === 0) {
        gridContainer.innerHTML =
            '<p style="text-align: center; color: var(--muted-foreground);">No unreleased music data available.</p>';
    }

    // Setup search functionality
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = /** @type {HTMLInputElement} */ (e.target).value.toLowerCase().trim();
            let visibleCount = 0;

            allArtistCards.forEach((card) => {
                const artistName = card.dataset.artistName;
                if (artistName.includes(query)) {
                    card.style.display = '';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            });

            // Show/hide no results message
            if (noResults) {
                noResults.style.display = visibleCount === 0 && query ? 'block' : 'none';
            }
        });
    }
}

/**
 * Renders a single unreleased track's detail page using the album-detail template,
 * and shows other projects from the same artist as recommendations.
 * @async
 * @param {string} trackId - The composite track ID in the format `tracker-{sheetId}-{eraName}-{index}`.
 * @param {HTMLElement} container - The DOM element to render the page into.
 * @param {object} _ui - UI helper object (unused, reserved for future use).
 * @returns {Promise<void>}
 */
export async function renderTrackerTrackPage(trackId, container, _ui) {
    // Parse track ID: tracker-{sheetId}-{eraName}-{index}
    const parts = trackId.split('-');
    if (parts.length < 4) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem;">Invalid track ID.</p>';
        return;
    }

    // Reconstruct sheetId (might contain hyphens)
    const sheetId = parts[1];
    const eraName = decodeURIComponent(parts.slice(2, -1).join('-'));
    const trackIndex = parseInt(parts[parts.length - 1]);

    if (!artistsData.length) {
        await loadArtistsData();
    }

    const artist = artistBySheetId.get(sheetId);
    if (!artist) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem;">Artist not found.</p>';
        return;
    }

    const trackerData = await fetchTrackerData(sheetId);
    if (!trackerData || !trackerData.eras) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem;">Failed to load track data.</p>';
        return;
    }

    const era = trackerData.eras[eraName];
    if (!era || !era.data) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem;">Track not found.</p>';
        return;
    }

    // Find the specific track
    /** @type {ReturnType<typeof createTrackFromSong> | null} */
    let currentTrack = null;
    let allTracks = [];

    Object.values(era.data).forEach((songs) => {
        if (songs && songs.length) {
            songs.forEach((song) => {
                const track = createTrackFromSong(song, era, artist.name, allTracks.length, sheetId);
                allTracks.push(track);
                if (allTracks.length - 1 === trackIndex) {
                    currentTrack = track;
                }
            });
        }
    });

    if (!currentTrack) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem;">Track not found.</p>';
        return;
    }

    // Show track page using album template
    const imageEl = /** @type {HTMLImageElement} */ (document.getElementById('album-detail-image'));
    const titleEl = document.getElementById('album-detail-title');
    const metaEl = document.getElementById('album-detail-meta');
    const prodEl = document.getElementById('album-detail-producer');
    const tracklistContainer = document.getElementById('album-detail-tracklist');
    const playBtn = document.getElementById('play-album-btn');

    imageEl.src = era.image || 'assets/logo.svg';
    imageEl.style.backgroundColor = '';
    imageEl.onerror = function () {
        this.src = 'assets/logo.svg';
    };

    titleEl.textContent = currentTrack.title;
    metaEl.innerHTML = `${era.timeline || 'Unreleased'} • ${formatTime(currentTrack.duration)}`;
    prodEl.innerHTML = `By <a href="/unreleased/${sheetId}">${artist.name}</a> • From <a href="/unreleased/${sheetId}/${encodeURIComponent(era.name)}">${era.name}</a>`;

    if (playBtn) {
        playBtn.innerHTML = `${SVG_PLAY(20)}<span>Play Track</span>`;
        playBtn.onclick = () => {
            const availableTracks = allTracks.filter((t) => !t.unavailable);
            const trackPos = availableTracks.findIndex((t) => t.id === currentTrack.id);
            if (trackPos >= 0 && availableTracks.length > 0) {
                void Player.instance.setQueue(availableTracks, trackPos);
                void Player.instance.playTrackFromQueue();
            }
        };
    }

    // Hide unnecessary buttons
    const shuffleBtn = document.getElementById('shuffle-album-btn');
    const downloadBtn = document.getElementById('download-album-btn');
    const likeBtn = document.getElementById('like-album-btn');
    const mixBtn = document.getElementById('album-mix-btn');
    const addToPlaylistBtn = document.getElementById('add-album-to-playlist-btn');

    if (shuffleBtn) shuffleBtn.style.display = 'none';
    if (downloadBtn) downloadBtn.style.display = 'none';
    if (likeBtn) likeBtn.style.display = 'none';
    if (mixBtn) mixBtn.style.display = 'none';
    if (addToPlaylistBtn) addToPlaylistBtn.style.display = 'none';

    // Render just this track
    renderTrackerTracks(tracklistContainer, [currentTrack]);

    // Add click handler
    const trackItem = tracklistContainer.querySelector('.track-item');
    if (trackItem && !currentTrack.unavailable) {
        /** @type {HTMLElement} */ (trackItem).onclick = (e) => {
            if (/** @type {Element} */ (e.target).closest('.track-menu-btn')) return;

            const availableTracks = allTracks.filter((t) => !t.unavailable);
            const trackPos = availableTracks.findIndex((t) => t.id === currentTrack.id);
            if (trackPos >= 0 && availableTracks.length > 0) {
                void Player.instance.setQueue(availableTracks, trackPos);
                void Player.instance.playTrackFromQueue();
            }
        };
    }

    // Show other projects
    const moreAlbumsSection = document.getElementById('album-section-more-albums');
    const moreAlbumsContainer = document.getElementById('album-detail-more-albums');
    const moreAlbumsTitle = document.getElementById('album-title-more-albums');

    if (moreAlbumsSection && moreAlbumsContainer) {
        const otherEras = Object.values(trackerData.eras).filter((e) => e.name !== eraName);
        if (otherEras.length > 0) {
            moreAlbumsContainer.innerHTML = otherEras
                .map((e) => {
                    let trackCount = 0;
                    if (e.data) {
                        Object.values(e.data).forEach((songs) => {
                            if (songs && songs.length) trackCount += songs.length;
                        });
                    }
                    return createProjectCardHTML(e, artist, sheetId, trackCount);
                })
                .join('');

            if (moreAlbumsTitle) moreAlbumsTitle.textContent = `More unreleased from ${artist.name}`;
            moreAlbumsSection.style.display = 'block';
        } else {
            moreAlbumsSection.style.display = 'none';
        }
    }

    const epsSection = document.getElementById('album-section-eps');
    const similarArtistsSection = document.getElementById('album-section-similar-artists');
    const similarAlbumsSection = document.getElementById('album-section-similar-albums');

    if (epsSection) epsSection.style.display = 'none';
    if (similarArtistsSection) similarArtistsSection.style.display = 'none';
    if (similarAlbumsSection) similarAlbumsSection.style.display = 'none';

    document.title = `${currentTrack.title} - ${artist.name}`;
}

/**
 * Initialises the tracker module by pre-loading artist popularity scores and artist data.
 * Should be called once during application startup.
 * @async
 * @returns {Promise<void>}
 */
export async function initTracker() {
    await Promise.all([loadArtistsPopularity(), loadArtistsData()]);
}

/**
 * Finds a tracker artist entry by display name, using an exact match first and then
 * a normalised fuzzy match as fallback.
 * @param {string|null|undefined} artistName - The artist name to search for.
 * @returns {object|null} The matching artist object, or `null` if not found.
 */
export function findTrackerArtistByName(artistName) {
    // First try exact match
    if (!artistName) return null;

    let match = artistsData.find((a) => a.name?.toLowerCase() === artistName.toLowerCase());
    if (match) return match;

    // Try fuzzy match (remove special chars and spaces)
    const normalized = artistName.toLowerCase().replace(/[^a-z0-9]/g, '');
    match = artistsData.find((a) => {
        if (!a.name) return false;
        const aNormalized = a.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        return aNormalized === normalized || aNormalized.includes(normalized) || normalized.includes(aNormalized);
    });

    return match || null;
}

/**
 * Retrieves all unreleased projects for a given artist name from the tracker API.
 * @async
 * @param {string} artistName - The display name of the artist.
 * @returns {Promise<{artist: object, sheetId: string, eras: object[]}|null>}
 *   An object containing the artist, their sheet ID, and an array of era objects,
 *   or `null` if the artist or their tracker data cannot be found.
 */
export async function getArtistUnreleasedProjects(artistName) {
    const artist = findTrackerArtistByName(artistName);
    if (!artist) return null;

    const sheetId = getSheetId(artist.url);
    if (!sheetId) return null;

    const trackerData = await fetchTrackerData(sheetId);
    if (!trackerData || !trackerData.eras) return null;

    return {
        artist,
        sheetId,
        eras: Object.values(trackerData.eras),
    };
}
