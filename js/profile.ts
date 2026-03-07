import { syncManager } from './accounts/pocketbase.ts';
import { authManager } from './accounts/auth.ts';
import { navigate } from './router.ts';
import { MusicAPI } from './music-api.ts';
import { apiSettings } from './storage.ts';
import { debounce, escapeHtml } from './utils.ts';

// objects execution february 29th 2027

interface FavoriteAlbum {
    id: string | number;
    title: string;
    artist: string;
    cover: string;
    description?: string;
}

interface StatusData {
    type: string;
    id: string | number;
    text: string;
    title: string;
    subtitle: string;
    image: string;
    link: string;
}

interface LastFmImage {
    size: string;
    '#text': string;
}

interface LastFmTrack {
    name: string;
    artist?: { '#text'?: string; name?: string } | string;
    image?: LastFmImage[];
    date?: { uts: string };
    playcount?: string;
    '@attr'?: { nowplaying?: string };
    _imgId?: string;
    _needsCover?: boolean;
    _artistName?: string;
}

interface LastFmArtist {
    name: string;
    playcount: string;
    image?: LastFmImage[];
    _imgId?: string;
    _needsCover?: boolean;
}

interface LastFmAlbum {
    name: string;
    artist?: { name?: string; '#text'?: string } | string;
    image?: LastFmImage[];
    playcount?: string;
    _imgId?: string;
    _needsCover?: boolean;
    _artistName?: string;
}

interface UserPlaylist {
    id: string | number;
    name: string;
    cover?: string;
    numberOfTracks?: number;
    isPublic?: boolean;
}

interface ProfileData {
    username: string;
    display_name?: string;
    avatar_url?: string;
    banner?: string;
    status?: string;
    about?: string;
    website?: string;
    lastfm_username?: string;
    favorite_albums?: FavoriteAlbum[];
    privacy?: { playlists?: string; lastfm?: string };
    user_playlists?: Record<string, UserPlaylist>;
}

interface UserData {
    profile: ProfileData;
    library?: Record<string, unknown>;
}

function getLastFmArtistName(artist: LastFmTrack['artist'] | LastFmAlbum['artist']): string {
    if (typeof artist === 'string') return artist;
    return artist?.['#text'] || artist?.name || '';
}

const profilePage = document.getElementById('page-profile') as HTMLElement;
const editProfileModal = document.getElementById('edit-profile-modal') as HTMLElement;
const editProfileBtn = document.getElementById('profile-edit-btn') as HTMLElement;
const viewMyProfileBtn = document.getElementById('view-my-profile-btn') as HTMLElement;

const editUsername = document.getElementById('edit-profile-username') as HTMLInputElement;
const editDisplayName = document.getElementById('edit-profile-display-name') as HTMLInputElement;
const editAvatar = document.getElementById('edit-profile-avatar') as HTMLInputElement;
const editBanner = document.getElementById('edit-profile-banner') as HTMLInputElement;
const editStatusSearch = document.getElementById('edit-profile-status-search') as HTMLInputElement;
const editStatusJson = document.getElementById('edit-profile-status-json') as HTMLInputElement;
const statusSearchResults = document.getElementById('status-search-results') as HTMLElement;
const statusPreview = document.getElementById('status-preview') as HTMLElement;
const clearStatusBtn = document.getElementById('clear-status-btn') as HTMLElement;
const editFavoriteAlbumsList = document.getElementById('edit-favorite-albums-list') as HTMLElement;
const editFavoriteAlbumsSearch = document.getElementById('edit-favorite-albums-search') as HTMLInputElement;
const editFavoriteAlbumsResults = document.getElementById('edit-favorite-albums-results') as HTMLElement;
const editAbout = document.getElementById('edit-profile-about') as HTMLTextAreaElement;
const editWebsite = document.getElementById('edit-profile-website') as HTMLInputElement;
const editLastfm = document.getElementById('edit-profile-lastfm') as HTMLInputElement;
const privacyPlaylists = document.getElementById('privacy-playlists-toggle') as HTMLInputElement;
const privacyLastfm = document.getElementById('privacy-lastfm-toggle') as HTMLInputElement;
const saveProfileBtn = document.getElementById('edit-profile-save') as HTMLButtonElement;
const cancelProfileBtn = document.getElementById('edit-profile-cancel') as HTMLElement;
const usernameError = document.getElementById('username-error') as HTMLElement;

let currentFavoriteAlbums: FavoriteAlbum[] = [];
const api: MusicAPI = new MusicAPI(apiSettings);

async function uploadImage(file: File): Promise<string> {
    try {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch('/upload', { method: 'POST', body: formData });
        if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
        const data: { url: string } = await response.json();
        return data.url;
    } catch (error) {
        console.error('Upload error:', error);
        throw error;
    }
}

function setupImageUploadControl(idPrefix: string): (currentUrl: string) => void {
    const urlInput = document.getElementById(idPrefix) as HTMLInputElement | null;
    const fileInput = document.getElementById(idPrefix + '-file') as HTMLInputElement | null;
    const uploadBtn = document.getElementById(idPrefix + '-upload-btn') as HTMLButtonElement | null;
    const toggleBtn = document.getElementById(idPrefix + '-toggle-btn') as HTMLElement | null;
    const statusEl = document.getElementById(idPrefix + '-upload-status') as HTMLElement | null;

    if (!urlInput || !fileInput || !uploadBtn || !toggleBtn || !statusEl) return () => {};

    let useUrl = false;

    function updateUI(): void {
        if (useUrl) {
            uploadBtn!.style.display = 'none';
            urlInput!.style.display = 'block';
            toggleBtn!.textContent = 'Upload';
        } else {
            uploadBtn!.style.display = 'flex';
            urlInput!.style.display = 'none';
            toggleBtn!.textContent = 'or URL';
        }
    }

    toggleBtn.addEventListener('click', () => {
        useUrl = !useUrl;
        updateUI();
    });

    uploadBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async (e: Event) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        statusEl.style.display = 'block';
        statusEl.textContent = 'Uploading...';
        statusEl.style.color = 'var(--muted-foreground)';
        uploadBtn.disabled = true;

        try {
            const url = await uploadImage(file);
            urlInput.value = url;
            statusEl.textContent = 'Done!';
            statusEl.style.color = '#10b981';
            setTimeout(() => {
                statusEl.style.display = 'none';
            }, 2000);
        } catch {
            statusEl.textContent = 'Failed - try URL';
            statusEl.style.color = '#ef4444';
        } finally {
            uploadBtn.disabled = false;
            fileInput.value = '';
        }
    });

    return (currentUrl: string): void => {
        urlInput.value = currentUrl || '';
        useUrl = !!currentUrl;
        updateUI();
        statusEl.style.display = 'none';
    };
}

const resetAvatarControl: (currentUrl: string) => void = setupImageUploadControl('edit-profile-avatar');
const resetBannerControl: (currentUrl: string) => void = setupImageUploadControl('edit-profile-banner');

export async function loadProfile(username: string): Promise<void> {
    document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
    profilePage.classList.add('active');

    (document.getElementById('profile-banner') as HTMLElement).style.backgroundImage = '';
    (document.getElementById('profile-avatar') as HTMLImageElement).src = '/assets/appicon.png';
    (document.getElementById('profile-display-name') as HTMLElement).textContent = 'Loading...';
    (document.getElementById('profile-username') as HTMLElement).textContent = '@' + username;
    (document.getElementById('profile-status') as HTMLElement).style.display = 'none';
    (document.getElementById('profile-about') as HTMLElement).textContent = '';
    (document.getElementById('profile-website') as HTMLElement).style.display = 'none';
    (document.getElementById('profile-lastfm') as HTMLElement).style.display = 'none';
    (document.getElementById('profile-playlists-container') as HTMLElement).innerHTML = '';

    const favAlbumsSection = document.getElementById('profile-favorite-albums-section') as HTMLElement | null;
    const favAlbumsContainer = document.getElementById('profile-favorite-albums-container') as HTMLElement | null;
    if (favAlbumsSection) favAlbumsSection.style.display = 'none';
    if (favAlbumsContainer) favAlbumsContainer.innerHTML = '';

    const recentSection = document.getElementById('profile-recent-scrobbles-section') as HTMLElement | null;
    const recentContainer = document.getElementById('profile-recent-scrobbles-container') as HTMLElement | null;
    if (recentSection) recentSection.style.display = 'none';
    if (recentContainer) recentContainer.innerHTML = '';

    const topArtistsSection = document.getElementById('profile-top-artists-section') as HTMLElement | null;
    const topArtistsContainer = document.getElementById('profile-top-artists-container') as HTMLElement | null;
    const topAlbumsSection = document.getElementById('profile-top-albums-section') as HTMLElement | null;
    const topAlbumsContainer = document.getElementById('profile-top-albums-container') as HTMLElement | null;
    const topTracksSection = document.getElementById('profile-top-tracks-section') as HTMLElement | null;
    const topTracksContainer = document.getElementById('profile-top-tracks-container') as HTMLElement | null;

    if (topArtistsSection) topArtistsSection.style.display = 'none';
    if (topArtistsContainer) topArtistsContainer.innerHTML = '';
    if (topAlbumsSection) topAlbumsSection.style.display = 'none';
    if (topAlbumsContainer) topAlbumsContainer.innerHTML = '';
    if (topTracksSection) topTracksSection.style.display = 'none';
    if (topTracksContainer) topTracksContainer.innerHTML = '';

    editProfileBtn.style.display = 'none';

    const profile = (await syncManager.getProfile(username)) as ProfileData | null;

    if (!profile) {
        (document.getElementById('profile-display-name') as HTMLElement).textContent = 'User not found';
        return;
    }

    (document.getElementById('profile-display-name') as HTMLElement).textContent = profile.display_name || username;
    if (profile.banner)
        (document.getElementById('profile-banner') as HTMLElement).style.backgroundImage = `url('${profile.banner}')`;
    if (profile.avatar_url) (document.getElementById('profile-avatar') as HTMLImageElement).src = profile.avatar_url;

    if (profile.status) {
        const statusEl = document.getElementById('profile-status') as HTMLElement;
        try {
            const statusObj: StatusData = JSON.parse(profile.status);
            statusEl.innerHTML = `
                <span style="opacity: 0.7; margin-right: 0.25rem;">Listening to:</span>
                <img src="${statusObj.image}" style="width: 20px; height: 20px; border-radius: 2px; vertical-align: middle; margin-right: 0.5rem;">
                <a href="${statusObj.link}" class="status-link" style="color: inherit; text-decoration: none; font-weight: 500;">${statusObj.text}</a>
            `;
            (statusEl.querySelector('.status-link') as HTMLElement).onclick = (e: MouseEvent) => {
                e.preventDefault();
                navigate(statusObj.link);
            };
        } catch {
            statusEl.textContent = `Listening to: ${profile.status}`;
        }
        statusEl.style.display = 'inline-flex';
    }

    if (profile.about) {
        (document.getElementById('profile-about') as HTMLElement).textContent = profile.about;
    }

    if (profile.website) {
        const webEl = document.getElementById('profile-website') as HTMLAnchorElement;
        webEl.href = profile.website;
        webEl.style.display = 'inline-block';
    }

    if (profile.favorite_albums && profile.favorite_albums.length > 0) {
        if (favAlbumsSection && favAlbumsContainer) {
            favAlbumsSection.style.display = 'block';
            favAlbumsContainer.innerHTML = profile.favorite_albums
                .map((album: FavoriteAlbum) => {
                    const image = api.getCoverUrl(album.cover);
                    return `
                    <div class="favorite-album-item" style="display: flex; gap: 1rem; margin-bottom: 1rem; background: var(--card); padding: 1rem; border-radius: var(--radius); border: 1px solid var(--border);">
                        <div class="card" style="width: 120px; flex-shrink: 0; padding: 0; border: none; background: transparent; cursor: pointer;" onclick="window.location.hash='/album/${album.id}'">
                            <div class="card-image-wrapper" style="margin-bottom: 0.5rem;">
                                <img src="${image}" class="card-image" loading="lazy" style="border-radius: var(--radius);">
                            </div>
                            <div class="card-info">
                                <div class="card-title" style="font-size: 0.9rem;">${escapeHtml(album.title)}</div>
                                <div class="card-subtitle" style="font-size: 0.8rem;">${escapeHtml(album.artist)}</div>
                            </div>
                        </div>
                        <div class="favorite-album-description" style="flex: 1; display: flex; flex-direction: column;">
                            <h4 style="margin: 0 0 0.5rem 0; font-size: 0.9rem; color: var(--muted-foreground); text-transform: uppercase; letter-spacing: 0.05em;">Why it's a favorite</h4>
                            <p style="margin: 0; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(album.description || '')}</p>
                        </div>
                    </div>
                `;
                })
                .join('');
        }
    }

    if (profile.lastfm_username && profile.privacy?.lastfm !== 'private') {
        const lfmEl = document.getElementById('profile-lastfm') as HTMLAnchorElement;
        lfmEl.href = `https://last.fm/user/${profile.lastfm_username}`;
        lfmEl.style.display = 'inline-block';
    }

    if (profile.lastfm_username && profile.privacy?.lastfm !== 'private') {
        fetchLastFmRecentTracks(profile.lastfm_username).then(async (tracks: LastFmTrack[]) => {
            if (tracks.length > 0) {
                recentSection!.style.display = 'block';
                recentContainer!.innerHTML = tracks
                    .map((track: LastFmTrack, index: number) => {
                        const isNowPlaying = track['@attr']?.nowplaying === 'true';
                        let image = getLastFmImage(track.image);
                        const hasImage = !!image;
                        if (!image) image = '/assets/appicon.png';

                        track._imgId = `scrobble-img-${index}`;
                        track._needsCover = !hasImage;

                        let dateDisplay = '';
                        if (isNowPlaying) dateDisplay = 'Scrobbling now';
                        else if (track.date) {
                            const date = new Date(Number(track.date.uts) * 1000);
                            dateDisplay =
                                date.toLocaleDateString() +
                                ' ' +
                                date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        }

                        const artistText: string = getLastFmArtistName(track.artist);

                        return `
                        <div class="track-item lastfm-track" data-title="${escapeHtml(track.name)}" data-artist="${escapeHtml(artistText)}" style="grid-template-columns: 40px 1fr auto; cursor: pointer;">
                            <img id="${track._imgId}" src="${image}" class="track-item-cover" style="width: 40px; height: 40px; border-radius: 4px;" loading="lazy" onerror="this.src='/assets/appicon.png'">
                            <div class="track-item-info">
                                <div class="track-item-details">
                                    <div class="title">${track.name}</div>
                                    <div class="artist">${artistText || 'Unknown Artist'}</div>
                                </div>
                            </div>
                            <div class="track-item-duration" style="font-size: 0.8rem; min-width: auto;">${dateDisplay}</div>
                        </div>
                    `;
                    })
                    .join('');

                recentContainer!.querySelectorAll('.track-item').forEach((item) => {
                    const el = item as HTMLElement;
                    el.addEventListener('click', () => handleTrackClick(el.dataset.title, el.dataset.artist));
                    el.addEventListener('contextmenu', (e: Event) => {
                        e.preventDefault();
                        return false;
                    });
                });

                for (const track of tracks) {
                    if (track._needsCover) {
                        fetchFallbackCover(track.name, getLastFmArtistName(track.artist), track._imgId);
                    }
                }
            }
        });

        fetchLastFmTopArtists(profile.lastfm_username).then(async (artists: LastFmArtist[]) => {
            if (artists.length > 0 && topArtistsSection && topArtistsContainer) {
                topArtistsSection.style.display = 'block';
                topArtistsContainer.innerHTML = artists
                    .map((artist: LastFmArtist, index: number) => {
                        let image = getLastFmImage(artist.image);
                        const hasImage = !!image;
                        if (!image) image = '/assets/appicon.png';

                        const imgId = `top-artist-img-${index}`;
                        artist._imgId = imgId;
                        artist._needsCover = !hasImage;

                        return `
                        <div class="card artist lastfm-card" data-name="${escapeHtml(artist.name)}" style="cursor: pointer;">
                            <div class="card-image-wrapper">
                                <img id="${imgId}" src="${image}" class="card-image" loading="lazy" onerror="this.src='/assets/appicon.png'">
                            </div>
                            <div class="card-info">
                                <div class="card-title">${artist.name}</div>
                                <div class="card-subtitle">${parseInt(artist.playcount).toLocaleString()} plays</div>
                            </div>
                        </div>
                    `;
                    })
                    .join('');

                topArtistsContainer.querySelectorAll('.card').forEach((card) => {
                    const el = card as HTMLElement;
                    el.addEventListener('click', () => handleArtistClick(el.dataset.name));
                    el.addEventListener('contextmenu', (e: Event) => {
                        e.preventDefault();
                        return false;
                    });
                });

                for (const artist of artists) {
                    if (artist._needsCover) {
                        fetchFallbackArtistImage(artist.name, artist._imgId);
                    }
                }
            }
        });

        fetchLastFmTopAlbums(profile.lastfm_username).then(async (albums: LastFmAlbum[]) => {
            if (albums.length > 0 && topAlbumsSection && topAlbumsContainer) {
                topAlbumsSection.style.display = 'block';
                topAlbumsContainer.innerHTML = albums
                    .map((album: LastFmAlbum, index: number) => {
                        let image = getLastFmImage(album.image);
                        const hasImage = !!image;
                        if (!image) image = '/assets/appicon.png';

                        const imgId = `top-album-img-${index}`;
                        album._imgId = imgId;
                        album._needsCover = !hasImage;

                        const artistName: string = getLastFmArtistName(album.artist) || 'Unknown Artist';
                        album._artistName = artistName;

                        return `
                        <div class="card lastfm-card" data-name="${escapeHtml(album.name)}" data-artist="${escapeHtml(artistName)}" style="cursor: pointer;">
                            <div class="card-image-wrapper">
                                <img id="${imgId}" src="${image}" class="card-image" loading="lazy" onerror="this.src='/assets/appicon.png'">
                            </div>
                            <div class="card-info">
                                <div class="card-title">${album.name}</div>
                                <div class="card-subtitle">${artistName}</div>
                            </div>
                        </div>
                    `;
                    })
                    .join('');

                topAlbumsContainer.querySelectorAll('.card').forEach((card) => {
                    const el = card as HTMLElement;
                    el.addEventListener('click', () => handleAlbumClick(el.dataset.name, el.dataset.artist));
                    el.addEventListener('contextmenu', (e: Event) => {
                        e.preventDefault();
                        return false;
                    });
                });

                for (const album of albums) {
                    if (album._needsCover) {
                        fetchFallbackAlbumCover(album.name, album._artistName, album._imgId);
                    }
                }
            }
        });

        fetchLastFmTopTracks(profile.lastfm_username).then(async (tracks: LastFmTrack[]) => {
            if (tracks.length > 0 && topTracksSection && topTracksContainer) {
                topTracksSection.style.display = 'block';
                topTracksContainer.innerHTML = tracks
                    .map((track: LastFmTrack, index: number) => {
                        let image = getLastFmImage(track.image);
                        const hasImage = !!image;
                        if (!image) image = '/assets/appicon.png';

                        const imgId = `top-track-img-${index}`;
                        track._imgId = imgId;
                        track._needsCover = !hasImage;

                        const artistName: string = getLastFmArtistName(track.artist) || 'Unknown Artist';
                        track._artistName = artistName;

                        return `
                        <div class="track-item lastfm-track" data-title="${escapeHtml(track.name)}" data-artist="${escapeHtml(artistName)}" style="grid-template-columns: 40px 1fr auto; cursor: pointer;">
                            <img id="${imgId}" src="${image}" class="track-item-cover" style="width: 40px; height: 40px; border-radius: 4px;" loading="lazy" onerror="this.src='/assets/appicon.png'">
                            <div class="track-item-info">
                                <div class="track-item-details">
                                    <div class="title">${track.name}</div>
                                    <div class="artist">${artistName}</div>
                                </div>
                            </div>
                            <div class="track-item-duration" style="font-size: 0.8rem; min-width: auto;">${parseInt(track.playcount || '0').toLocaleString()} plays</div>
                        </div>
                    `;
                    })
                    .join('');

                topTracksContainer.querySelectorAll('.track-item').forEach((item) => {
                    const el = item as HTMLElement;
                    el.addEventListener('click', () => handleTrackClick(el.dataset.title, el.dataset.artist));
                    el.addEventListener('contextmenu', (e: Event) => {
                        e.preventDefault();
                        return false;
                    });
                });

                for (const track of tracks) {
                    if (track._needsCover) {
                        fetchFallbackCover(track.name, track._artistName, track._imgId);
                    }
                }
            }
        });
    }

    const currentUser = (await syncManager.getUserData()) as UserData | null;
    const isOwner: boolean = !!(currentUser && currentUser.profile && currentUser.profile.username === username);

    if (isOwner) {
        editProfileBtn.style.display = 'inline-flex';
    }

    if (profile.privacy?.playlists !== 'private' || isOwner) {
        const container = document.getElementById('profile-playlists-container') as HTMLElement;
        const playlists: Record<string, UserPlaylist> = profile.user_playlists || {};

        Object.values(playlists).forEach((playlist: UserPlaylist) => {
            if (!playlist.isPublic && !isOwner) return;

            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div class="card-image-wrapper">
                    <img src="${playlist.cover || '/assets/appicon.png'}" class="card-image" loading="lazy" alt="${playlist.name}">
                </div>
                <div class="card-info">
                    <div class="card-title">${playlist.name}</div>
                    <div class="card-subtitle">${playlist.numberOfTracks || 0} tracks</div>
                </div>
            `;
            card.onclick = () => {
                window.location.hash = `/userplaylist/${playlist.id}`;
            };
            container.appendChild(card);
        });

        if (container.children.length === 0) {
            container.innerHTML =
                '<p style="color: var(--muted-foreground); grid-column: 1/-1; text-align: center;">No public playlists.</p>';
        }
    }
}

export function openEditProfile(): void {
    syncManager.getUserData().then((data) => {
        if (!data || !data.profile) return;
        const p = data.profile as ProfileData;

        editUsername.value = p.username || '';
        editDisplayName.value = p.display_name || '';
        resetAvatarControl(p.avatar_url || '');
        resetBannerControl(p.banner || '');

        editStatusJson.value = p.status || '';
        editStatusSearch.value = '';
        if (p.status) {
            try {
                const statusObj: StatusData = JSON.parse(p.status);
                showStatusPreview(statusObj);
            } catch {
                if (p.status.trim()) {
                    editStatusSearch.value = p.status;
                    hideStatusPreview();
                }
            }
        } else {
            hideStatusPreview();
        }

        currentFavoriteAlbums = p.favorite_albums || [];
        renderEditFavoriteAlbums();
        editFavoriteAlbumsSearch.value = '';
        editFavoriteAlbumsResults.style.display = 'none';

        editAbout.value = p.about || '';
        editWebsite.value = p.website || '';
        editLastfm.value = p.lastfm_username || '';

        privacyPlaylists.checked = p.privacy?.playlists !== 'private';
        privacyLastfm.checked = p.privacy?.lastfm !== 'private';

        editProfileModal.classList.add('active');
    });
}

async function saveProfile(): Promise<void> {
    const newUsername: string = editUsername.value.trim();
    if (!newUsername) {
        usernameError.textContent = 'Username cannot be empty';
        usernameError.style.display = 'block';
        return;
    }

    const currentUser = (await syncManager.getUserData()) as UserData | null;
    if (currentUser?.profile?.username !== newUsername) {
        const taken = await syncManager.isUsernameTaken(newUsername);
        if (taken) {
            usernameError.textContent = 'Username is already taken';
            usernameError.style.display = 'block';
            return;
        }
    }

    usernameError.style.display = 'none';
    saveProfileBtn.disabled = true;
    saveProfileBtn.textContent = 'Saving...';

    const data = {
        username: newUsername,
        display_name: editDisplayName.value.trim(),
        avatar_url: editAvatar.value.trim(),
        banner: editBanner.value.trim(),
        status: editStatusJson.value.trim() || (editStatusSearch.value.trim() ? editStatusSearch.value.trim() : ''),
        about: editAbout.value.trim(),
        website: editWebsite.value.trim(),
        favorite_albums: currentFavoriteAlbums,
        lastfm_username: editLastfm.value.trim(),
        privacy: {
            playlists: privacyPlaylists.checked ? 'public' : 'private',
            lastfm: privacyLastfm.checked ? 'public' : 'private',
        },
    };

    try {
        await syncManager.updateProfile(data);
        editProfileModal.classList.remove('active');
        loadProfile(newUsername);

        if (window.location.pathname.includes('/user/@')) {
            window.history.replaceState(null, '', `/user/@${newUsername}`);
        }
    } catch (e) {
        alert('Failed to save profile. See console.');
        console.error(e);
    } finally {
        saveProfileBtn.disabled = false;
        saveProfileBtn.textContent = 'Save Profile';
    }
}

editProfileBtn.addEventListener('click', openEditProfile);
cancelProfileBtn.addEventListener('click', () => editProfileModal.classList.remove('active'));
saveProfileBtn.addEventListener('click', saveProfile);

viewMyProfileBtn.addEventListener('click', async () => {
    const data = await syncManager.getUserData();
    if (data && data.profile && data.profile.username) {
        navigate(`/user/@${data.profile.username}`);
    } else {
        openEditProfile();
    }
});

authManager.onAuthStateChanged((user) => {
    viewMyProfileBtn.style.display = user ? 'inline-block' : 'none';
});

function showStatusPreview(data: StatusData): void {
    (document.getElementById('status-preview-img') as HTMLImageElement).src = data.image;
    (document.getElementById('status-preview-title') as HTMLElement).textContent = data.title;
    (document.getElementById('status-preview-subtitle') as HTMLElement).textContent = data.subtitle;
    statusPreview.style.display = 'flex';
    editStatusSearch.style.display = 'none';
}

function hideStatusPreview(): void {
    statusPreview.style.display = 'none';
    editStatusSearch.style.display = 'block';
    editStatusJson.value = '';
}

clearStatusBtn.addEventListener('click', () => {
    hideStatusPreview();
    editStatusSearch.value = '';
    editStatusSearch.focus();
});

const performStatusSearch = debounce(async (query: unknown) => {
    if (!query) {
        statusSearchResults.style.display = 'none';
        return;
    }
    const q = String(query);

    try {
        const [tracks, albums] = await Promise.all([
            api.searchTracks(q, { limit: 3 }),
            api.searchAlbums(q, { limit: 3 }),
        ]);

        statusSearchResults.innerHTML = '';

        const createItem = (
            item: {
                id: string | number;
                title: string;
                artist?: { name?: string };
                album?: { cover?: string };
                cover?: string;
            },
            type: string
        ): HTMLDivElement => {
            const div = document.createElement('div');
            div.className = 'search-result-item';
            const title: string = item.title;
            const subtitle: string =
                type === 'track' ? item.artist?.name || 'Unknown Artist' : item.artist?.name || 'Unknown Artist';
            const image: string = api.getCoverUrl(item.album?.cover || item.cover || '');

            div.innerHTML = `
                <img src="${image}">
                <div class="search-result-info">
                    <div class="search-result-title">${title}</div>
                    <div class="search-result-subtitle">${type === 'track' ? 'Song' : 'Album'} • ${subtitle}</div>
                </div>
            `;

            div.onclick = (): void => {
                const data: StatusData = {
                    type: type,
                    id: item.id,
                    text: `${title} - ${subtitle}`,
                    title: title,
                    subtitle: subtitle,
                    image: image,
                    link: `/${type}/${item.id}`,
                };
                editStatusJson.value = JSON.stringify(data);
                showStatusPreview(data);
                statusSearchResults.style.display = 'none';
            };
            return div;
        };

        tracks.items.forEach((t: TrackData) => statusSearchResults.appendChild(createItem(t, 'track')));
        albums.items.forEach((a: TrackAlbum) => statusSearchResults.appendChild(createItem(a, 'album')));

        statusSearchResults.style.display = tracks.items.length || albums.items.length ? 'block' : 'none';
    } catch (e) {
        console.error('Status search failed', e);
    }
}, 300);

editStatusSearch.addEventListener('input', (e: Event) =>
    performStatusSearch((e.target as HTMLInputElement).value.trim())
);
document.addEventListener('click', (e: MouseEvent) => {
    if (!(e.target as HTMLElement).closest('.status-picker-container')) {
        statusSearchResults.style.display = 'none';
    }
});

function renderEditFavoriteAlbums(): void {
    editFavoriteAlbumsList.innerHTML = currentFavoriteAlbums
        .map(
            (album: FavoriteAlbum, index: number) => `
        <div class="edit-favorite-album-item" style="background: var(--secondary); padding: 0.5rem; border-radius: var(--radius); border: 1px solid var(--border);">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                <img src="${api.getCoverUrl(album.cover)}" style="width: 40px; height: 40px; border-radius: 4px; object-fit: cover;">
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(album.title)}</div>
                    <div style="font-size: 0.8rem; color: var(--muted-foreground);">${escapeHtml(album.artist)}</div>
                </div>
                <button class="btn-icon remove-album-btn" data-index="${index}" style="color: var(--danger);">&times;</button>
            </div>
            <textarea class="template-input album-description-input" data-index="${index}" placeholder="Why is this a favorite?" style="min-height: 60px; font-size: 0.85rem; resize: vertical;">${escapeHtml(album.description || '')}</textarea>
        </div>
    `
        )
        .join('');

    editFavoriteAlbumsList.querySelectorAll('.remove-album-btn').forEach((btn) => {
        const el = btn as HTMLElement;
        el.onclick = (): void => {
            const idx: number = parseInt(el.dataset.index || '0');
            currentFavoriteAlbums.splice(idx, 1);
            renderEditFavoriteAlbums();
        };
    });

    editFavoriteAlbumsList.querySelectorAll('.album-description-input').forEach((input) => {
        const el = input as HTMLTextAreaElement;
        el.oninput = (): void => {
            const idx: number = parseInt(el.dataset.index || '0');
            currentFavoriteAlbums[idx].description = el.value;
        };
    });

    if (currentFavoriteAlbums.length >= 5) {
        editFavoriteAlbumsSearch.disabled = true;
        editFavoriteAlbumsSearch.placeholder = 'Max 5 albums reached';
    } else {
        editFavoriteAlbumsSearch.disabled = false;
        editFavoriteAlbumsSearch.placeholder = 'Search for an album...';
    }
}

const performFavoriteAlbumSearch = debounce(async (query: unknown) => {
    if (!query || currentFavoriteAlbums.length >= 5) {
        editFavoriteAlbumsResults.style.display = 'none';
        return;
    }
    const q = String(query);

    try {
        const results = await api.searchAlbums(q, { limit: 5 });
        editFavoriteAlbumsResults.innerHTML = '';

        if (results.items.length === 0) {
            editFavoriteAlbumsResults.style.display = 'none';
            return;
        }

        results.items.forEach((album: TrackAlbum) => {
            const div = document.createElement('div');
            div.className = 'search-result-item';
            const image = api.getCoverUrl(album.cover);

            div.innerHTML = `
                <img src="${image}">
                <div class="search-result-info">
                    <div class="search-result-title">${album.title}</div>
                    <div class="search-result-subtitle">${album.artist?.name || 'Unknown Artist'}</div>
                </div>
            `;

            div.onclick = () => {
                currentFavoriteAlbums.push({
                    id: album.id,
                    title: album.title,
                    artist: album.artist?.name || 'Unknown Artist',
                    cover: album.cover,
                    description: '',
                });
                renderEditFavoriteAlbums();
                editFavoriteAlbumsSearch.value = '';
                editFavoriteAlbumsResults.style.display = 'none';
            };
            editFavoriteAlbumsResults.appendChild(div);
        });

        editFavoriteAlbumsResults.style.display = 'block';
    } catch (e) {
        console.error('Album search failed', e);
    }
}, 300);

editFavoriteAlbumsSearch.addEventListener('input', (e: Event) =>
    performFavoriteAlbumSearch((e.target as HTMLInputElement).value.trim())
);

function getLastFmImage(images: LastFmImage[] | undefined): string | null {
    if (!images) return null;
    const imgArray: LastFmImage[] = Array.isArray(images) ? images : [images];
    const sizes: string[] = ['extralarge', 'large', 'medium', 'small'];

    const placeholders: string[] = ['2a96cbd8b46e442fc41c2b86b821562f', 'c6f59c1e5e7240a4c0d427abd71f3dbb'];

    const isValidUrl = (url: string): boolean => {
        if (!url) return false;
        return !placeholders.some((ph) => url.includes(ph));
    };

    for (const size of sizes) {
        const img = imgArray.find((i: LastFmImage) => i.size === size);
        if (img && img['#text'] && isValidUrl(img['#text'])) return img['#text'];
    }
    const anyImg = imgArray.find((i: LastFmImage) => i['#text'] && isValidUrl(i['#text']));
    if (anyImg) return anyImg['#text'];
    return null;
}

async function handleArtistClick(name: string | undefined): Promise<void> {
    try {
        const results = await api.searchArtists(name || '', { limit: 1 });
        if (results.items.length > 0) {
            navigate(`/artist/${results.items[0].id}`);
        } else {
            alert('Artist not found in library');
        }
    } catch (e) {
        console.error(e);
    }
}

async function handleAlbumClick(name: string | undefined, artist: string | undefined): Promise<void> {
    try {
        const query = `${name} ${artist}`;
        const results = await api.searchAlbums(query, { limit: 1 });
        if (results.items.length > 0) {
            navigate(`/album/${results.items[0].id}`);
        } else {
            alert('Album not found in library');
        }
    } catch (e) {
        console.error(e);
    }
}

async function handleTrackClick(title: string | undefined, artist: string | undefined): Promise<void> {
    try {
        const query = `${title} ${artist}`;
        const results = await api.searchTracks(query, { limit: 1 });
        if (results.items.length > 0) {
            const track = results.items[0];
            if (window.monochromePlayer) {
                window.monochromePlayer.setQueue([track], 0);
                window.monochromePlayer.playTrackFromQueue();
            }
        } else {
            alert('Track not found');
        }
    } catch (e) {
        console.error(e);
    }
}

async function fetchFallbackCover(title: string, artist: string | undefined, imgId: string | undefined): Promise<void> {
    try {
        const query = `${title} ${artist}`;
        await new Promise((r) => setTimeout(r, 100));
        const results = await api.searchTracks(query, { limit: 5 });
        let foundCover = false;

        if (results.items && results.items.length > 0) {
            const found = results.items.find((item: TrackData) => item.album?.cover);
            if (found) {
                const newUrl: string = api.getCoverUrl(found.album!.cover!);
                const imgEl = document.getElementById(imgId || '') as HTMLImageElement | null;
                if (imgEl) {
                    imgEl.src = newUrl;
                    foundCover = true;
                }
            }
        }

        if (!foundCover) {
            await fetchFallbackArtistImage(artist, imgId);
        }
    } catch {
        await fetchFallbackArtistImage(artist, imgId);
    }
}

async function fetchFallbackAlbumCover(
    title: string,
    artist: string | undefined,
    imgId: string | undefined
): Promise<void> {
    try {
        const query: string = `${title} ${artist}`;
        await new Promise((r: (value: void) => void) => setTimeout(r, 100));
        const results = await api.searchAlbums(query, { limit: 5 });
        let foundCover = false;

        if (results.items && results.items.length > 0) {
            const found = results.items.find((item: TrackAlbum) => item.cover);
            if (found) {
                const newUrl: string = api.getCoverUrl(found.cover);
                const imgEl = document.getElementById(imgId || '') as HTMLImageElement | null;
                if (imgEl) {
                    imgEl.src = newUrl;
                    foundCover = true;
                }
            }
        }

        if (!foundCover) {
            await fetchFallbackArtistImage(artist, imgId);
        }
    } catch {
        await fetchFallbackArtistImage(artist, imgId);
    }
}

async function fetchFallbackArtistImage(artistName: string | undefined, imgId: string | undefined): Promise<void> {
    try {
        await new Promise((r: (value: void) => void) => setTimeout(r, 100));
        const results = await api.searchArtists(artistName || '', { limit: 3 });
        if (results.items && results.items.length > 0) {
            const found = results.items.find((item: ArtistData) => item.picture);
            if (found) {
                const newUrl: string = api.getArtistPictureUrl(found.picture!);
                const imgEl = document.getElementById(imgId || '') as HTMLImageElement | null;
                if (imgEl) imgEl.src = newUrl;
            }
        }
    } catch {
        // Silently ignore errors
    }
}

async function fetchLastFmRecentTracks(username: string): Promise<LastFmTrack[]> {
    const apiKey = '85214f5abbc730e78770f27784b9bdf7';
    const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(username)}&api_key=${apiKey}&format=json&limit=5`;
    try {
        const res: Response = await fetch(url);
        const data = await res.json();
        const tracks = data.recenttracks?.track;
        if (!tracks) return [];
        return Array.isArray(tracks) ? tracks : [tracks];
    } catch (e) {
        console.error('Failed to fetch Last.fm recent tracks', e);
        return [];
    }
}

async function fetchLastFmTopArtists(username: string): Promise<LastFmArtist[]> {
    const apiKey = '85214f5abbc730e78770f27784b9bdf7';
    const url = `https://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${encodeURIComponent(username)}&api_key=${apiKey}&format=json&limit=6`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        return data.topartists?.artist || [];
    } catch (e) {
        console.error('Failed to fetch Last.fm top artists', e);
        return [];
    }
}

async function fetchLastFmTopAlbums(username: string): Promise<LastFmAlbum[]> {
    const apiKey = '85214f5abbc730e78770f27784b9bdf7';
    const url = `https://ws.audioscrobbler.com/2.0/?method=user.gettopalbums&user=${encodeURIComponent(username)}&api_key=${apiKey}&format=json&limit=6`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        return data.topalbums?.album || [];
    } catch (e) {
        console.error('Failed to fetch Last.fm top albums', e);
        return [];
    }
}

async function fetchLastFmTopTracks(username: string): Promise<LastFmTrack[]> {
    const apiKey = '85214f5abbc730e78770f27784b9bdf7';
    const url = `https://ws.audioscrobbler.com/2.0/?method=user.gettoptracks&user=${encodeURIComponent(username)}&api_key=${apiKey}&format=json&limit=5`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        return data.toptracks?.track || [];
    } catch (e) {
        console.error('Failed to fetch Last.fm top tracks', e);
        return [];
    }
}
