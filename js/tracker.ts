//js/tracker.js
import { escapeHtml, SVG_MENU, SVG_PLAY, trackDataStore, formatTime, SVG_HEART } from './utils.ts';
import { navigate } from './router.ts';

interface TrackerSong {
    name?: string;
    url?: string;
    urls?: string[];
    track_length?: string;
    desc?: string;
    description?: string;
    category?: string;
}

interface TrackerEra {
    name: string;
    image?: string;
    timeline?: string;
    data?: Record<string, TrackerSong[]>;
}

interface TrackerApiResponse {
    eras: Record<string, TrackerEra>;
}

interface TrackerArtistEntry {
    name: string;
    url?: string;
}

interface TrackerTrack {
    id: string;
    title: string;
    cleanTitle: string;
    artist: { name: string };
    artists: { name: string }[];
    album: { title: string; cover: string | undefined };
    duration: number;
    trackNumber: number;
    isTracker: boolean;
    audioUrl: string | null;
    remoteUrl: string | null;
    explicit: boolean;
    unavailable: boolean;
    trackerInfo: {
        sheetId: string;
        timeline: string | undefined;
        description: string;
        sourceUrl: string | null;
        category: string;
    };
}

interface TrackerPlayer {
    setQueue(tracks: TrackerTrack[], index: number): void;
    playTrackFromQueue(): void;
}

interface PopularityResult {
    name: string;
    visitors: number;
}

interface PopularityResponse {
    results?: PopularityResult[];
}

interface SongMatch {
    song: TrackerSong;
    era: TrackerEra;
    index: number;
}

let artistsData: TrackerArtistEntry[] = [];
let artistsPopularity: Map<string, number> = new Map();
let globalPlayer: TrackerPlayer | null = null;

// Map to store artist info keyed by sheetId for quick lookup
const artistBySheetId: Map<string, TrackerArtistEntry> = new Map();

// Store all songs for search functionality
let allSongsCache: Map<string, { artist: TrackerArtistEntry; eras: Record<string, TrackerEra> }> = new Map();

// Normalize artist name for image URL (no spaces, no special chars, all lowercase)
function normalizeArtistName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Clean song title for scrobbling (remove producer credits)
function cleanSongTitle(title: string | undefined): string {
    if (!title) return '';
    // Remove (prod. ...), (produced by ...), [prod. ...], etc.
    return title
        .replace(/\s*[([]\s*prod\.?\s+[^)\]]+[)\]]/gi, '')
        .replace(/\s*[([]\s*produced\s+by\s+[^)\]]+[)\]]/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
}

async function loadArtistsPopularity(): Promise<void> {
    try {
        const response = await fetch('https://trends.artistgrid.cx');
        if (!response.ok) return;
        const data = (await response.json()) as PopularityResponse;
        if (data.results) {
            data.results.forEach((artist: PopularityResult, index: number) => {
                const score: number = artist.visitors * (1 - index / data.results!.length);
                artistsPopularity.set(artist.name, score);
            });
        }
    } catch (e) {
        console.log('Could not load popularity data:', e);
    }
}

async function loadArtistsData(): Promise<void> {
    try {
        const response = await fetch('https://sheets.artistgrid.cx/artists.ndjson');
        if (!response.ok) throw new Error('Network response was not ok');
        const text = await response.text();
        artistsData = text
            .trim()
            .split('\n')
            .filter((line: string) => line.trim())
            .map((line: string): TrackerArtistEntry | null => {
                try {
                    return JSON.parse(line) as TrackerArtistEntry;
                } catch {
                    return null;
                }
            })
            .filter((item: TrackerArtistEntry | null): item is TrackerArtistEntry => item !== null);

        // Sort by popularity if available
        artistsData.sort((a: TrackerArtistEntry, b: TrackerArtistEntry) => {
            const popA: number = artistsPopularity.get(a.name) || 0;
            const popB: number = artistsPopularity.get(b.name) || 0;
            return popB - popA;
        });

        // Build sheetId lookup map
        artistBySheetId.clear();
        artistsData.forEach((artist: TrackerArtistEntry) => {
            const sheetId = getSheetId(artist.url);
            if (sheetId) {
                artistBySheetId.set(sheetId, artist);
            }
        });
    } catch (e) {
        console.error('Failed to load Artists List:', e);
    }
}

function getSheetId(url: string | undefined): string | null {
    if (!url) return null;
    const match = url.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
}

async function fetchTrackerData(sheetId: string): Promise<TrackerApiResponse | null> {
    try {
        const response = await fetch(`https://tracker.israeli.ovh/get/${sheetId}`);
        if (!response.ok) return null;
        return (await response.json()) as TrackerApiResponse;
    } catch (e) {
        console.error('Failed to fetch tracker data', e);
        return null;
    }
}

function parseDuration(durationStr: string | undefined): number {
    if (!durationStr || durationStr === 'N/A') return 0;
    const parts = durationStr.split(':');
    if (parts.length === 2) {
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return 0;
}

function getDirectUrl(rawUrl: string | undefined | null): string | null {
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

// Convert tracker song to standard track format
export function createTrackFromSong(
    song: TrackerSong,
    era: TrackerEra,
    artistName: string,
    index: number,
    sheetId: string = ''
): TrackerTrack {
    const isValidUrl = (u: string | undefined): boolean => !!u && typeof u === 'string' && u.trim().length > 0;
    const rawUrl = (isValidUrl(song.url) ? song.url : null) || (song.urls ? song.urls.find(isValidUrl) : null);
    const directUrl = getDirectUrl(rawUrl);
    const duration = parseDuration(song.track_length);
    const cleanTitle = cleanSongTitle(song.name);

    return {
        id: `tracker-${sheetId}-${era.name}-${index}`,
        title: song.name || '',
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
            sourceUrl: rawUrl || null,
            category: song.category || '',
        },
    };
}

// Create track item HTML for tracker songs - EXACTLY like normal tracks
function createTrackerTrackItemHTML(track: TrackerTrack, index: number): string {
    const isUnavailable = track.unavailable;
    const trackNumberHTML = `<div class="track-number">${index + 1}</div>`;

    const actionsHTML = isUnavailable
        ? ''
        : `
        <button class="track-menu-btn" type="button" title="More options">
            ${SVG_MENU}
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

// Render tracks for a tracker era - EXACTLY like normal album track list
function renderTrackerTracks(container: HTMLElement, tracks: TrackerTrack[]): void {
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
    const tracksHTML: string = tracks
        .map((track: TrackerTrack, i: number) => createTrackerTrackItemHTML(track, i))
        .join('');

    tempDiv.insertAdjacentHTML('beforeend', tracksHTML);

    // Bind data to elements
    Array.from(tempDiv.children).forEach((element, index) => {
        if (index === 0) return; // Skip header
        const track = tracks[index - 1];
        if (element && track) {
            trackDataStore.set(element, track as unknown as TrackData);
        }
    });

    while (tempDiv.firstChild) {
        fragment.appendChild(tempDiv.firstChild);
    }

    container.innerHTML = '';
    container.appendChild(fragment);
}

// Create project card HTML - EXACTLY like album cards
export function createProjectCardHTML(
    era: TrackerEra,
    artist: TrackerArtistEntry,
    sheetId: string,
    trackCount: number
): string {
    const playBtnHTML = `
        <button class="play-btn card-play-btn" data-action="play-card" data-type="tracker-project" data-id="${encodeURIComponent(era.name)}" title="Play">
            ${SVG_PLAY}
        </button>
        <button class="card-menu-btn" data-action="card-menu" data-type="tracker-project" data-id="${encodeURIComponent(era.name)}" title="Menu">
            ${SVG_MENU}
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
                    ${SVG_HEART}
                </button>
                ${playBtnHTML}
            </div>
            <div class="card-info">
                <h4 class="card-title">${escapeHtml(era.name)}</h4>
                <p class="card-subtitle">${era.timeline || 'Unreleased'} • ${trackCount} tracks</p>
            </div>
        </div>
    `;
}

// Render tracker artist page (grid of projects)
export async function renderTrackerArtistPage(sheetId: string, container: HTMLElement): Promise<void> {
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
    const imageEl = document.getElementById('tracker-artist-detail-image') as HTMLImageElement | null;
    const nameEl = document.getElementById('tracker-artist-detail-name');
    const metaEl = document.getElementById('tracker-artist-detail-meta');
    const projectsContainer = document.getElementById('tracker-artist-projects-container');
    const playBtn = document.getElementById('play-tracker-artist-btn') as HTMLElement | null;
    const downloadBtn = document.getElementById('download-tracker-artist-btn') as HTMLElement | null;

    if (!imageEl || !nameEl || !metaEl || !projectsContainer) return;

    const normalizedName = normalizeArtistName(artist.name);
    imageEl.src = `https://assets.artistgrid.cx/${normalizedName}.webp`;
    imageEl.onerror = function (this: HTMLImageElement) {
        this.src = 'assets/logo.svg';
    };
    nameEl.textContent = artist.name;
    metaEl.innerHTML = `<span>${eras.length} unreleased projects</span>`;

    // Set up shuffle play button
    if (playBtn) {
        playBtn.onclick = async () => {
            const allTracks: TrackerTrack[] = [];
            eras.forEach((era: TrackerEra) => {
                if (era.data) {
                    Object.values(era.data).forEach((songs: TrackerSong[]) => {
                        if (songs && songs.length) {
                            songs.forEach((song: TrackerSong) => {
                                const track = createTrackFromSong(song, era, artist.name, allTracks.length, sheetId);
                                allTracks.push(track);
                            });
                        }
                    });
                }
            });

            const availableTracks = allTracks.filter((t: TrackerTrack) => !t.unavailable);
            if (availableTracks.length > 0) {
                const shuffled = [...availableTracks].sort(() => Math.random() - 0.5);
                globalPlayer!.setQueue(shuffled, 0);
                globalPlayer!.playTrackFromQueue();
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
        projectsContainer.parentNode!.insertBefore(searchContainer, projectsContainer);
    }

    // Render projects as cards
    projectsContainer.innerHTML = '';
    projectsContainer.className = 'card-grid';

    eras.forEach((era: TrackerEra) => {
        let trackCount = 0;
        if (era.data) {
            Object.values(era.data).forEach((songs: TrackerSong[]) => {
                if (songs && songs.length) {
                    trackCount += songs.length;
                }
            });
        }

        if (trackCount === 0) return;

        const cardHTML = createProjectCardHTML(era, artist, sheetId, trackCount);
        projectsContainer.insertAdjacentHTML('beforeend', cardHTML);

        const card = projectsContainer.lastElementChild as HTMLElement | null;
        if (card) {
            (card as unknown as Record<string, unknown>)._eraData = era;
            (card as unknown as Record<string, unknown>)._artistName = artist.name;
            (card as unknown as Record<string, unknown>)._sheetId = sheetId;

            card.onclick = (e: MouseEvent) => {
                if ((e.target as HTMLElement).closest('.card-play-btn')) {
                    e.stopPropagation();
                    const eraTracks: TrackerTrack[] = [];
                    if (era.data) {
                        Object.values(era.data).forEach((songs: TrackerSong[]) => {
                            if (songs && songs.length) {
                                songs.forEach((song: TrackerSong) => {
                                    const track = createTrackFromSong(
                                        song,
                                        era,
                                        artist.name,
                                        eraTracks.length,
                                        sheetId
                                    );
                                    eraTracks.push(track);
                                });
                            }
                        });
                    }
                    const availableTracks = eraTracks.filter((t: TrackerTrack) => !t.unavailable);
                    if (availableTracks.length > 0) {
                        globalPlayer!.setQueue(availableTracks, 0);
                        globalPlayer!.playTrackFromQueue();
                    }
                } else if ((e.target as HTMLElement).closest('.card-menu-btn')) {
                    e.stopPropagation();
                } else {
                    navigate(`/unreleased/${sheetId}/${encodeURIComponent(era.name)}`);
                }
            };
        }
    });

    // Add search functionality
    const searchInput = document.getElementById('unreleased-search-input') as HTMLInputElement | null;
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const query: string = searchInput.value.toLowerCase().trim();
            if (!query) {
                // Reset view
                projectsContainer.style.display = '';
                document.getElementById('unreleased-search-results')?.remove();
                return;
            }

            // Search through all songs
            const matches: SongMatch[] = [];
            eras.forEach((era: TrackerEra) => {
                if (era.data) {
                    Object.values(era.data).forEach((songs: TrackerSong[]) => {
                        if (songs && songs.length) {
                            songs.forEach((song: TrackerSong, index: number) => {
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
                projectsContainer.parentNode!.insertBefore(resultsContainer, projectsContainer.nextSibling);
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
                if (tracklist) {
                    const searchTracks: TrackerTrack[] = matches.map((m: SongMatch, i: number) =>
                        createTrackFromSong(m.song, m.era, artist.name, i, sheetId)
                    );
                    renderTrackerTracks(tracklist, searchTracks);

                    // Add click handlers
                    tracklist.querySelectorAll('.track-item').forEach((item: Element) => {
                        const track = trackDataStore.get(item) as TrackerTrack | undefined;
                        if (!track || track.unavailable) return;

                        (item as HTMLElement).onclick = (e: MouseEvent) => {
                            if ((e.target as HTMLElement).closest('.track-menu-btn')) return;

                            const availableTracks = searchTracks.filter((t: TrackerTrack) => !t.unavailable);
                            const trackIndex = availableTracks.findIndex((t: TrackerTrack) => t.id === track.id);
                            if (trackIndex >= 0 && availableTracks.length > 0) {
                                globalPlayer!.setQueue(availableTracks, trackIndex);
                                globalPlayer!.playTrackFromQueue();
                            }
                        };
                    });
                }
            }
        });
    }

    document.title = `${artist.name} - Unreleased`;
}

// Render individual tracker project page
export async function renderTrackerProjectPage(
    sheetId: string,
    projectName: string,
    container: HTMLElement,
    _ui: unknown
): Promise<void> {
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

    const era = Object.values(trackerData.eras).find((e: TrackerEra) => e.name === projectName);
    if (!era) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem;">Project not found.</p>';
        return;
    }

    // Collect all tracks for this era
    const eraTracks: TrackerTrack[] = [];
    if (era.data) {
        Object.values(era.data).forEach((songs: TrackerSong[]) => {
            if (songs && songs.length) {
                songs.forEach((song: TrackerSong) => {
                    const track = createTrackFromSong(song, era, artist.name, eraTracks.length, sheetId);
                    eraTracks.push(track);
                });
            }
        });
    }

    const availableCount: number = eraTracks.filter((t: TrackerTrack) => !t.unavailable).length;

    // Use the album page template structure
    const imageEl = document.getElementById('album-detail-image') as HTMLImageElement | null;
    const titleEl = document.getElementById('album-detail-title');
    const metaEl = document.getElementById('album-detail-meta');
    const prodEl = document.getElementById('album-detail-producer');
    const tracklistContainer = document.getElementById('album-detail-tracklist');
    const playBtn = document.getElementById('play-album-btn') as HTMLElement | null;
    const shuffleBtn = document.getElementById('shuffle-album-btn') as HTMLElement | null;
    const downloadBtn = document.getElementById('download-album-btn') as HTMLElement | null;
    const likeBtn = document.getElementById('like-album-btn');
    const mixBtn = document.getElementById('album-mix-btn');
    const addToPlaylistBtn = document.getElementById('add-album-to-playlist-btn');

    if (!imageEl || !titleEl || !metaEl || !prodEl || !tracklistContainer) return;

    // Set album page content
    imageEl.src = era.image || 'assets/logo.svg';
    imageEl.style.backgroundColor = '';
    imageEl.onerror = function (this: HTMLImageElement) {
        this.src = 'assets/logo.svg';
    };

    titleEl.textContent = era.name;
    metaEl.innerHTML = `${era.timeline || 'Unreleased'} • ${eraTracks.length} tracks • ${availableCount} available`;
    prodEl.innerHTML = `By <a href="/unreleased/${sheetId}">${artist.name}</a>`;

    // Setup buttons
    if (playBtn) {
        playBtn.innerHTML = `${SVG_PLAY}<span>Play Project</span>`;
        playBtn.onclick = () => {
            const availableTracks = eraTracks.filter((t: TrackerTrack) => !t.unavailable);
            if (availableTracks.length > 0) {
                globalPlayer!.setQueue(availableTracks, 0);
                globalPlayer!.playTrackFromQueue();
            }
        };
    }

    if (shuffleBtn) {
        shuffleBtn.onclick = () => {
            const availableTracks = eraTracks.filter((t: TrackerTrack) => !t.unavailable);
            if (availableTracks.length > 0) {
                const shuffled = [...availableTracks].sort(() => Math.random() - 0.5);
                globalPlayer!.setQueue(shuffled, 0);
                globalPlayer!.playTrackFromQueue();
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
    tracklistContainer.querySelectorAll('.track-item').forEach((item: Element) => {
        const track = trackDataStore.get(item) as TrackerTrack | undefined;
        if (!track || track.unavailable) return;

        (item as HTMLElement).onclick = (e: MouseEvent) => {
            if ((e.target as HTMLElement).closest('.track-menu-btn')) return;

            const availableTracks = eraTracks.filter((t: TrackerTrack) => !t.unavailable);
            const trackIndex = availableTracks.findIndex((t: TrackerTrack) => t.id === track.id);
            if (trackIndex >= 0 && availableTracks.length > 0) {
                globalPlayer!.setQueue(availableTracks, trackIndex);
                globalPlayer!.playTrackFromQueue();
            }
        };
    });

    // Show other projects as recommendations
    const moreAlbumsSection = document.getElementById('album-section-more-albums');
    const moreAlbumsContainer = document.getElementById('album-detail-more-albums');
    const moreAlbumsTitle = document.getElementById('album-title-more-albums');

    if (moreAlbumsSection && moreAlbumsContainer) {
        const otherEras: TrackerEra[] = Object.values(trackerData.eras).filter(
            (e: TrackerEra) => e.name !== projectName
        );
        if (otherEras.length > 0) {
            moreAlbumsContainer.innerHTML = otherEras
                .map((e: TrackerEra) => {
                    let trackCount = 0;
                    if (e.data) {
                        Object.values(e.data).forEach((songs: TrackerSong[]) => {
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
            moreAlbumsContainer.querySelectorAll('.card').forEach((card: Element) => {
                const htmlCard = card as HTMLElement;
                const eraName = decodeURIComponent(htmlCard.dataset.trackerProjectId || '');
                const cardEra = trackerData.eras[eraName];
                if (!cardEra) return;

                htmlCard.onclick = (e: MouseEvent) => {
                    if ((e.target as HTMLElement).closest('.card-play-btn')) {
                        e.stopPropagation();
                        const otherEraTracks: TrackerTrack[] = [];
                        if (cardEra.data) {
                            Object.values(cardEra.data).forEach((songs: TrackerSong[]) => {
                                if (songs && songs.length) {
                                    songs.forEach((song: TrackerSong) => {
                                        const track = createTrackFromSong(
                                            song,
                                            cardEra,
                                            artist.name,
                                            otherEraTracks.length,
                                            sheetId
                                        );
                                        otherEraTracks.push(track);
                                    });
                                }
                            });
                        }
                        const availableTracks = otherEraTracks.filter((t: TrackerTrack) => !t.unavailable);
                        if (availableTracks.length > 0) {
                            globalPlayer!.setQueue(availableTracks, 0);
                            globalPlayer!.playTrackFromQueue();
                        }
                    } else if ((e.target as HTMLElement).closest('.card-menu-btn')) {
                        e.stopPropagation();
                    } else {
                        navigate(`/unreleased/${sheetId}/${encodeURIComponent(cardEra.name)}`);
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

// Render the unreleased page with all artists
export async function renderUnreleasedPage(container: HTMLElement): Promise<void> {
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
    const searchInput = document.getElementById('unreleased-search-input') as HTMLInputElement | null;
    const noResults = document.getElementById('unreleased-no-results');

    if (!gridContainer) return;

    // Store all artist cards for filtering
    let allArtistCards: HTMLDivElement[] = [];

    if (artistsData.length === 0) {
        await loadArtistsPopularity();
        await loadArtistsData();
    }

    gridContainer.innerHTML = '';
    allArtistCards = [];

    artistsData.forEach((artist: TrackerArtistEntry) => {
        const sheetId = getSheetId(artist.url);
        if (!sheetId) return;

        if (!artist.name) return;

        const artistCard: HTMLDivElement = document.createElement('div');
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
                <h4 class="card-title">${artist.name}</h4>
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
        searchInput.addEventListener('input', () => {
            const query: string = searchInput.value.toLowerCase().trim();
            let visibleCount = 0;

            allArtistCards.forEach((card: HTMLDivElement) => {
                const artistName: string = card.dataset.artistName || '';
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

// Render track page for unreleased songs
export async function renderTrackerTrackPage(trackId: string, container: HTMLElement, _ui: unknown): Promise<void> {
    // Parse track ID: tracker-{sheetId}-{eraName}-{index}
    const parts: string[] = trackId.split('-');
    if (parts.length < 4) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem;">Invalid track ID.</p>';
        return;
    }

    // Reconstruct sheetId (might contain hyphens)
    const sheetId: string = parts[1];
    const eraName: string = decodeURIComponent(parts.slice(2, -1).join('-'));
    const trackIndex: number = parseInt(parts[parts.length - 1]);

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
    let currentTrack: TrackerTrack | null = null;
    const allTracks: TrackerTrack[] = [];

    Object.values(era.data).forEach((songs: TrackerSong[]) => {
        if (songs && songs.length) {
            songs.forEach((song: TrackerSong) => {
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

    // Capture as const after null check
    const resolvedTrack: TrackerTrack = currentTrack;

    // Show track page using album template
    const imageEl = document.getElementById('album-detail-image') as HTMLImageElement | null;
    const titleEl = document.getElementById('album-detail-title');
    const metaEl = document.getElementById('album-detail-meta');
    const prodEl = document.getElementById('album-detail-producer');
    const tracklistContainer = document.getElementById('album-detail-tracklist');
    const playBtn = document.getElementById('play-album-btn') as HTMLElement | null;

    if (!imageEl || !titleEl || !metaEl || !prodEl || !tracklistContainer) return;

    imageEl.src = era.image || 'assets/logo.svg';
    imageEl.style.backgroundColor = '';
    imageEl.onerror = function (this: HTMLImageElement) {
        this.src = 'assets/logo.svg';
    };

    titleEl.textContent = resolvedTrack.title;
    metaEl.innerHTML = `${era.timeline || 'Unreleased'} • ${formatTime(resolvedTrack.duration)}`;
    prodEl.innerHTML = `By <a href="/unreleased/${sheetId}">${artist.name}</a> • From <a href="/unreleased/${sheetId}/${encodeURIComponent(era.name)}">${era.name}</a>`;

    if (playBtn) {
        playBtn.innerHTML = `${SVG_PLAY}<span>Play Track</span>`;
        playBtn.onclick = () => {
            const availableTracks = allTracks.filter((t: TrackerTrack) => !t.unavailable);
            const trackPos = availableTracks.findIndex((t: TrackerTrack) => t.id === resolvedTrack.id);
            if (trackPos >= 0 && availableTracks.length > 0) {
                globalPlayer!.setQueue(availableTracks, trackPos);
                globalPlayer!.playTrackFromQueue();
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
    renderTrackerTracks(tracklistContainer, [resolvedTrack]);

    // Add click handler
    const trackItem = tracklistContainer.querySelector('.track-item') as HTMLElement | null;
    if (trackItem && !resolvedTrack.unavailable) {
        trackItem.onclick = (e: MouseEvent) => {
            if ((e.target as HTMLElement).closest('.track-menu-btn')) return;

            const availableTracks = allTracks.filter((t: TrackerTrack) => !t.unavailable);
            const trackPos = availableTracks.findIndex((t: TrackerTrack) => t.id === resolvedTrack.id);
            if (trackPos >= 0 && availableTracks.length > 0) {
                globalPlayer!.setQueue(availableTracks, trackPos);
                globalPlayer!.playTrackFromQueue();
            }
        };
    }

    // Show other projects
    const moreAlbumsSection = document.getElementById('album-section-more-albums');
    const moreAlbumsContainer = document.getElementById('album-detail-more-albums');
    const moreAlbumsTitle = document.getElementById('album-title-more-albums');

    if (moreAlbumsSection && moreAlbumsContainer) {
        const otherEras: TrackerEra[] = Object.values(trackerData.eras).filter((e: TrackerEra) => e.name !== eraName);
        if (otherEras.length > 0) {
            moreAlbumsContainer.innerHTML = otherEras
                .map((e: TrackerEra) => {
                    let trackCount = 0;
                    if (e.data) {
                        Object.values(e.data).forEach((songs: TrackerSong[]) => {
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

    document.title = `${resolvedTrack.title} - ${artist.name}`;
}

export async function initTracker(player: TrackerPlayer): Promise<void> {
    globalPlayer = player;
    await Promise.all([loadArtistsPopularity(), loadArtistsData()]);
}

// Helper function to find a tracker artist by name (for use in normal artist pages)
export function findTrackerArtistByName(artistName: string): TrackerArtistEntry | null {
    // First try exact match
    if (!artistName) return null;

    let match = artistsData.find((a: TrackerArtistEntry) => a.name?.toLowerCase() === artistName.toLowerCase());
    if (match) return match;

    // Try fuzzy match (remove special chars and spaces)
    const normalized: string = artistName.toLowerCase().replace(/[^a-z0-9]/g, '');
    match = artistsData.find((a: TrackerArtistEntry) => {
        if (!a.name) return false;
        const aNormalized: string = a.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        return aNormalized === normalized || aNormalized.includes(normalized) || normalized.includes(aNormalized);
    });

    return match || null;
}

// Helper function to get artist's unreleased projects (for use in normal artist pages)
export async function getArtistUnreleasedProjects(
    artistName: string
): Promise<{ artist: TrackerArtistEntry; sheetId: string; eras: TrackerEra[] } | null> {
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
