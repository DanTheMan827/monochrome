//js/events.js
import {
    SVG_PLAY,
    SVG_PAUSE,
    SVG_VOLUME,
    SVG_MUTE,
    REPEAT_MODE,
    trackDataStore,
    formatTime,
    SVG_BIN,
    getTrackArtists,
    positionMenu,
    getShareUrl,
    escapeHtml,
} from './utils.ts';
import { lastFMStorage, libreFmSettings, waveformSettings } from './storage.ts';
import { showNotification, downloadTrackWithMetadata, downloadAlbumAsZip, downloadPlaylistAsZip } from './downloads.ts';
import { downloadQualitySettings } from './storage.ts';
import { updateTabTitle, navigate } from './router.ts';
import { db } from './db.ts';
import { syncManager } from './accounts/pocketbase.ts';
import { waveformGenerator } from './waveform.ts';
import { audioContextManager } from './audio-context.ts';
import {
    trackPlayTrack,
    trackPauseTrack,
    trackSkipTrack,
    trackToggleShuffle,
    trackToggleRepeat,
    trackAddToQueue,
    trackPlayNext,
    trackLikeTrack,
    trackUnlikeTrack,
    trackLikeAlbum,
    trackUnlikeAlbum,
    trackLikeArtist,
    trackUnlikeArtist,
    trackLikePlaylist,
    trackUnlikePlaylist,
    trackDownloadTrack,
    trackContextMenuAction,
    trackBlockTrack,
    trackUnblockTrack,
    trackBlockAlbum,
    trackUnblockAlbum,
    trackBlockArtist,
    trackUnblockArtist,
    trackCopyLink,
    trackOpenInNewTab,
    trackSetSleepTimer,
    trackCancelSleepTimer,
    trackStartMix,
} from './analytics.ts';

interface PlayerInstance {
    shuffleActive: boolean;
    repeatMode: number;
    currentTrack: TrackData | null;
    quality: string;
    isFallbackRetry: boolean;
    dashInitialized: boolean;
    dashPlayer: { reset(): void };
    userVolume: number;
    api: ApiInstance;
    updateMediaSessionPlaybackState(): void;
    updateMediaSessionPositionState(): void;
    playNext(): void;
    handlePlayPause(): void;
    playPrev(): void;
    toggleShuffle(): void;
    toggleRepeat(): number;
    isSleepTimerActive(): boolean;
    clearSleepTimer(): void;
    getCurrentQueue(): TrackData[];
    setVolume(volume: number): void;
    playTrackFromQueue(targetTime?: number): void;
    addToQueue(tracks: TrackData | TrackData[]): void;
    addNextToQueue(tracks: TrackData | TrackData[]): void;
    setQueue(tracks: TrackData[], index: number): void;
    playAtIndex(index: number): void;
    setSleepTimer(minutes: number): void;
}

interface ApiInstance {
    getStreamUrl(trackId: string | number, quality: string): Promise<string>;
    getAlbum(id: string | number): Promise<{ album: TrackAlbum; tracks: TrackData[] }>;
    getPlaylist(id: string | number): Promise<{ playlist: PlaylistData; tracks: TrackData[] }>;
    getMix(id: string | number): Promise<{ mix: MixData; tracks: TrackData[] }>;
    getArtist(id: string | number): Promise<ArtistData>;
    getTrack(id: string | number): Promise<{ track: TrackData }>;
    getTrackRecommendations(id: string | number): Promise<TrackData[]>;
}

interface ScrobblerInstance {
    isAuthenticated(): boolean;
    updateNowPlaying(track: TrackData): void;
    loveTrack(track: TrackData): void;
}

interface UIInstance {
    renderRecentPage(): void;
    renderPinnedItems(): void;
    createTrackItemHTML(item: TrackData, index: number, showLike: boolean, showMenu: boolean): string;
    updateLikeState(el: Element, type: string, id: string | number): void;
}

interface ContextMenuElement extends HTMLElement {
    _contextType: string | null;
    _contextTrack: TrackData | null;
    _contextHref: string | null;
    _originalHTML: string | null;
}

let currentTrackIdForWaveform: string | number | null = null;

export function initializePlayerEvents(player: PlayerInstance, audioPlayer: HTMLAudioElement, scrobbler: ScrobblerInstance, ui: UIInstance): void {
    const playPauseBtn = document.querySelector('.now-playing-bar .play-pause-btn');
    const nextBtn = document.getElementById('next-btn');
    const prevBtn = document.getElementById('prev-btn');
    const shuffleBtn = document.getElementById('shuffle-btn');
    const repeatBtn = document.getElementById('repeat-btn');
    const sleepTimerBtnDesktop = document.getElementById('sleep-timer-btn-desktop');
    const sleepTimerBtnMobile = document.getElementById('sleep-timer-btn');

    // History tracking
    let historyLoggedTrackId: string | number | null = null;

    audioPlayer.addEventListener('loadstart', () => {
        historyLoggedTrackId = null;
    });

    // Sync UI with player state on load
    if (player.shuffleActive) {
        shuffleBtn?.classList.add('active');
    }

    if (player.repeatMode && player.repeatMode !== REPEAT_MODE.OFF) {
        repeatBtn?.classList.add('active');
        if (player.repeatMode === REPEAT_MODE.ONE) {
            repeatBtn?.classList.add('repeat-one');
        }
        if (repeatBtn) repeatBtn.title = player.repeatMode === REPEAT_MODE.ALL ? 'Repeat Queue' : 'Repeat One';
    } else {
        if (repeatBtn) repeatBtn.title = 'Repeat';
    }

    audioPlayer.addEventListener('play', () => {
        // Initialize audio context manager for EQ (only once)
        if (!audioContextManager.isReady()) {
            audioContextManager.init(audioPlayer);
        }
        audioContextManager.resume();

        if (player.currentTrack) {
            // Track play event
            trackPlayTrack(player.currentTrack);

            // Scrobble
            if (scrobbler.isAuthenticated()) {
                scrobbler.updateNowPlaying(player.currentTrack);
            }

            updateWaveform();
        }

        if (playPauseBtn) playPauseBtn.innerHTML = SVG_PAUSE;
        player.updateMediaSessionPlaybackState();
        player.updateMediaSessionPositionState();
        updateTabTitle(player);
    });

    audioPlayer.addEventListener('playing', () => {
        player.updateMediaSessionPlaybackState();
        player.updateMediaSessionPositionState();
    });

    audioPlayer.addEventListener('pause', () => {
        if (player.currentTrack) {
            trackPauseTrack(player.currentTrack);
        }
        if (playPauseBtn) playPauseBtn.innerHTML = SVG_PLAY;
        player.updateMediaSessionPlaybackState();
        player.updateMediaSessionPositionState();
    });

    audioPlayer.addEventListener('ended', () => {
        player.playNext();
    });

    audioPlayer.addEventListener('timeupdate', async () => {
        const { currentTime, duration } = audioPlayer;
        if (duration) {
            const progressFill = document.getElementById('progress-fill');
            const currentTimeEl = document.getElementById('current-time');
            if (progressFill) progressFill.style.width = `${(currentTime / duration) * 100}%`;
            if (currentTimeEl) currentTimeEl.textContent = formatTime(currentTime);

            // Log to history after 10 seconds of playback
            if (currentTime >= 10 && player.currentTrack && player.currentTrack.id !== historyLoggedTrackId) {
                historyLoggedTrackId = player.currentTrack.id;
                const historyEntry = await db.addToHistory(player.currentTrack);
                syncManager.syncHistoryItem(historyEntry);

                if (window.location.hash === '#recent') {
                    ui.renderRecentPage();
                }
            }
        }
    });

    audioPlayer.addEventListener('loadedmetadata', () => {
        const totalDurationEl = document.getElementById('total-duration');
        if (totalDurationEl) totalDurationEl.textContent = formatTime(audioPlayer.duration);
        player.updateMediaSessionPositionState();
    });

    audioPlayer.addEventListener('error', async () => {
        console.error('Audio playback error');
        if (playPauseBtn) playPauseBtn.innerHTML = SVG_PLAY;

        const currentQuality = player.quality;

        // Check if we can fallback to a lower quality
        if (
            player.currentTrack &&
            currentQuality === 'HI_RES_LOSSLESS' &&
            !player.currentTrack.isLocal &&
            !player.currentTrack.isTracker &&
            !player.isFallbackRetry
        ) {
            console.warn('Playback failed, attempting fallback to LOSSLESS quality...');
            player.isFallbackRetry = true; // Set flag to prevent infinite loops

            try {
                // Force getTrack to fetch new URL for LOSSLESS
                const trackId = player.currentTrack.id;

                // Fetch new stream URL
                const newStreamUrl = await player.api.getStreamUrl(trackId, 'LOSSLESS');

                if (newStreamUrl) {
                    // Reset player state for standard playback (non-DASH if possible)
                    if (player.dashInitialized) {
                        player.dashPlayer.reset();
                        player.dashInitialized = false;
                    }

                    audioPlayer.src = newStreamUrl;
                    audioPlayer.load();
                    await audioPlayer.play();

                    // Reset flag after successful start
                    setTimeout(() => {
                        player.isFallbackRetry = false;
                    }, 5000);
                    return; // Successfully handled
                }
            } catch (fallbackError) {
                console.error('Fallback failed:', fallbackError);
            }
        }

        player.isFallbackRetry = false;

        // Skip to next track on error to prevent queue stalling
        if (player.currentTrack) {
            console.warn('Skipping to next track due to playback error');
            setTimeout(() => player.playNext(), 1000); // Small delay to avoid rapid skipping
        }
    });

    playPauseBtn?.addEventListener('click', () => player.handlePlayPause());
    nextBtn?.addEventListener('click', () => {
        trackSkipTrack(player.currentTrack, 'next');
        player.playNext();
    });
    prevBtn?.addEventListener('click', () => {
        trackSkipTrack(player.currentTrack, 'previous');
        player.playPrev();
    });

    shuffleBtn?.addEventListener('click', () => {
        player.toggleShuffle();
        trackToggleShuffle(player.shuffleActive);
        shuffleBtn.classList.toggle('active', player.shuffleActive);
        if (window.renderQueueFunction) window.renderQueueFunction();
    });

    repeatBtn?.addEventListener('click', () => {
        const mode = player.toggleRepeat();
        trackToggleRepeat(mode === REPEAT_MODE.OFF ? 'off' : mode === REPEAT_MODE.ALL ? 'all' : 'one');
        repeatBtn.classList.toggle('active', mode !== REPEAT_MODE.OFF);
        repeatBtn.classList.toggle('repeat-one', mode === REPEAT_MODE.ONE);
        repeatBtn.title =
            mode === REPEAT_MODE.OFF ? 'Repeat' : mode === REPEAT_MODE.ALL ? 'Repeat Queue' : 'Repeat One';
    });

    // Sleep Timer for desktop
    if (sleepTimerBtnDesktop) {
        sleepTimerBtnDesktop.addEventListener('click', () => {
            if (player.isSleepTimerActive()) {
                player.clearSleepTimer();
                trackCancelSleepTimer();
                showNotification('Sleep timer cancelled');
            } else {
                showSleepTimerModal(player);
            }
        });
    }

    // Sleep Timer for mobile
    if (sleepTimerBtnMobile) {
        sleepTimerBtnMobile.addEventListener('click', () => {
            if (player.isSleepTimerActive()) {
                player.clearSleepTimer();
                trackCancelSleepTimer();
                showNotification('Sleep timer cancelled');
            } else {
                showSleepTimerModal(player);
            }
        });
    }

    // Volume controls
    const volumeBar = document.getElementById('volume-bar');
    const volumeFill = document.getElementById('volume-fill');
    const volumeBtn = document.getElementById('volume-btn');

    // Waveform Masking Logic
    const updateWaveform = async () => {
        const progressBar = document.getElementById('progress-bar');
        const playerControls = document.querySelector('.player-controls');

        const isTracker =
            player.currentTrack &&
            (player.currentTrack.isTracker ||
                (player.currentTrack.id && String(player.currentTrack.id).startsWith('tracker-')));

        if (!waveformSettings.isEnabled() || !player.currentTrack || isTracker) {
            if (progressBar) {
                progressBar.style.webkitMaskImage = '';
                progressBar.style.maskImage = '';
                progressBar.classList.remove('has-waveform', 'waveform-loaded');
            }
            if (playerControls) {
                playerControls.classList.remove('waveform-loaded');
            }
            currentTrackIdForWaveform = null;
            return;
        }

        if (progressBar && currentTrackIdForWaveform !== player.currentTrack.id) {
            currentTrackIdForWaveform = player.currentTrack.id;
            progressBar.classList.add('has-waveform');
            progressBar.classList.remove('waveform-loaded');
            if (playerControls) {
                playerControls.classList.remove('waveform-loaded');
            }

            // Clear current mask while loading
            progressBar.style.webkitMaskImage = '';
            progressBar.style.maskImage = '';

            try {
                const streamUrl = await player.api.getStreamUrl(player.currentTrack.id, 'LOW');
                const waveformData = await waveformGenerator.getWaveform(streamUrl, String(player.currentTrack.id));

                if (waveformData && currentTrackIdForWaveform === player.currentTrack.id) {
                    let { peaks, duration } = waveformData;
                    const trackDuration = player.currentTrack.duration;

                    // Padding logic for sync
                    if (trackDuration && duration && duration < trackDuration) {
                        const diff = trackDuration - duration;
                        if (diff > 0.5) {
                            // If difference is significant (> 500ms)
                            // Calculate how many peaks represent the missing time
                            // peaks.length represents 'duration'
                            // X peaks represent 'diff'
                            const peaksPerSecond = peaks.length / duration;
                            const paddingPeaksCount = Math.floor(diff * peaksPerSecond);

                            if (paddingPeaksCount > 0) {
                                const newPeaks = new Float32Array(peaks.length + paddingPeaksCount);
                                // Fill start with 0s (implied by new Float32Array)
                                newPeaks.set(peaks, paddingPeaksCount);
                                peaks = newPeaks;
                            }
                        }
                    }

                    // Create a temporary canvas to generate the mask
                    const canvas = document.createElement('canvas');
                    const rect = progressBar.getBoundingClientRect();
                    canvas.width = rect.width || 500;
                    canvas.height = 28; // Fixed height for mask generation

                    waveformGenerator.drawWaveform(canvas, peaks);

                    const dataUrl = canvas.toDataURL();
                    progressBar.style.webkitMaskImage = `url(${dataUrl})`;
                    progressBar.style.webkitMaskSize = '100% 100%';
                    progressBar.style.webkitMaskRepeat = 'no-repeat';
                    progressBar.style.maskImage = `url(${dataUrl})`;
                    progressBar.style.maskSize = '100% 100%';
                    progressBar.style.maskRepeat = 'no-repeat';

                    progressBar.classList.add('waveform-loaded');
                    if (playerControls) {
                        playerControls.classList.add('waveform-loaded');
                    }
                }
            } catch (e) {
                console.error('Failed to load waveform mask:', e);
            }
        }
    };

    window.addEventListener('waveform-toggle', ((e: CustomEvent) => {
        if (!e.detail.enabled) {
            const progressBar = document.getElementById('progress-bar');
            const playerControls = document.querySelector('.player-controls');
            if (progressBar) {
                progressBar.style.webkitMaskImage = '';
                progressBar.style.maskImage = '';
                progressBar.classList.remove('has-waveform', 'waveform-loaded');
            }
            if (playerControls) {
                playerControls.classList.remove('waveform-loaded');
            }
        }
        updateWaveform();
    }) as EventListener);

    const updateVolumeUI = (): void => {
        const { muted } = audioPlayer;
        const volume = player.userVolume;
        if (volumeBtn) volumeBtn.innerHTML = muted || volume === 0 ? SVG_MUTE : SVG_VOLUME;
        const effectiveVolume = muted ? 0 : volume * 100;
        if (volumeFill) {
            volumeFill.style.setProperty('--volume-level', `${effectiveVolume}%`);
            volumeFill.style.width = `${effectiveVolume}%`;
        }
    };

    volumeBtn?.addEventListener('click', () => {
        audioPlayer.muted = !audioPlayer.muted;
        localStorage.setItem('muted', audioPlayer.muted ? 'true' : 'false');
    });

    audioPlayer.addEventListener('volumechange', updateVolumeUI);

    // Initialize volume and mute from localStorage
    const savedVolume = parseFloat(localStorage.getItem('volume') || '0.7');
    const savedMuted = localStorage.getItem('muted') === 'true';

    player.setVolume(savedVolume);
    audioPlayer.muted = savedMuted;

    if (volumeFill) volumeFill.style.width = `${savedVolume * 100}%`;
    if (volumeBar) volumeBar.style.setProperty('--volume-level', `${savedVolume * 100}%`);
    updateVolumeUI();

    initializeSmoothSliders(audioPlayer, player);
}

function initializeSmoothSliders(audioPlayer: HTMLAudioElement, player: PlayerInstance): void {
    const progressBar = document.getElementById('progress-bar');
    const progressFill = document.getElementById('progress-fill');
    const currentTimeEl = document.getElementById('current-time');
    const volumeBar = document.getElementById('volume-bar');
    const volumeFill = document.getElementById('volume-fill');
    const volumeBtn = document.getElementById('volume-btn');

    let isSeeking = false;
    let wasPlaying = false;
    let isAdjustingVolume = false;
    let lastSeekPosition = 0;

    const seek = (bar: HTMLElement, event: MouseEvent, setter: (position: number) => void): void => {
        const rect = bar.getBoundingClientRect();
        const position = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        setter(position);
    };

    const updateSeekUI = (position: number): void => {
        if (!isNaN(audioPlayer.duration)) {
            if (progressFill) progressFill.style.width = `${position * 100}%`;
            if (currentTimeEl) {
                currentTimeEl.textContent = formatTime(position * audioPlayer.duration);
            }
        }
    };

    // Progress bar with smooth dragging
    progressBar?.addEventListener('mousedown', (e: MouseEvent) => {
        isSeeking = true;
        wasPlaying = !audioPlayer.paused;
        if (wasPlaying) audioPlayer.pause();

        seek(progressBar, e, (position: number) => {
            lastSeekPosition = position;
            updateSeekUI(position);
        });
    });

    // Touch events for mobile
    progressBar?.addEventListener('touchstart', (e: TouchEvent) => {
        e.preventDefault();
        isSeeking = true;
        wasPlaying = !audioPlayer.paused;
        if (wasPlaying) audioPlayer.pause();

        const touch = e.touches[0];
        const rect = progressBar.getBoundingClientRect();
        const position = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));

        lastSeekPosition = position;
        updateSeekUI(position);
    });

    document.addEventListener('mousemove', (e: MouseEvent) => {
        if (isSeeking && progressBar) {
            seek(progressBar, e, (position: number) => {
                lastSeekPosition = position;
                updateSeekUI(position);
            });
        }

        if (isAdjustingVolume && volumeBar) {
            seek(volumeBar, e, (position: number) => {
                if (audioPlayer.muted) {
                    audioPlayer.muted = false;
                    localStorage.setItem('muted', 'false');
                }
                player.setVolume(position);
                if (volumeFill) volumeFill.style.width = `${position * 100}%`;
                if (volumeBar) volumeBar.style.setProperty('--volume-level', `${position * 100}%`);
            });
        }
    });

    document.addEventListener('touchmove', (e: TouchEvent) => {
        if (isSeeking && progressBar) {
            const touch = e.touches[0];
            const rect = progressBar.getBoundingClientRect();
            const position = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));

            lastSeekPosition = position;
            updateSeekUI(position);
        }

        if (isAdjustingVolume && volumeBar) {
            const touch = e.touches[0];
            const rect = volumeBar.getBoundingClientRect();
            const position = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
            if (audioPlayer.muted) {
                audioPlayer.muted = false;
                localStorage.setItem('muted', 'false');
            }
            player.setVolume(position);
            if (volumeFill) volumeFill.style.width = `${position * 100}%`;
            volumeBar.style.setProperty('--volume-level', `${position * 100}%`);
        }
    });

    document.addEventListener('mouseup', () => {
        if (isSeeking) {
            // Commit the seek
            if (!isNaN(audioPlayer.duration)) {
                audioPlayer.currentTime = lastSeekPosition * audioPlayer.duration;
                player.updateMediaSessionPositionState();
                if (wasPlaying) audioPlayer.play();
            }
            isSeeking = false;
        }

        if (isAdjustingVolume) {
            isAdjustingVolume = false;
        }
    });

    document.addEventListener('touchend', () => {
        if (isSeeking) {
            if (!isNaN(audioPlayer.duration)) {
                audioPlayer.currentTime = lastSeekPosition * audioPlayer.duration;
                player.updateMediaSessionPositionState();
                if (wasPlaying) audioPlayer.play();
            }
            isSeeking = false;
        }

        if (isAdjustingVolume) {
            isAdjustingVolume = false;
        }
    });

    progressBar?.addEventListener('click', (e: MouseEvent) => {
        if (!isSeeking) {
            // Only handle click if not result of a drag release
            seek(progressBar, e, (position: number) => {
                if (!isNaN(audioPlayer.duration) && audioPlayer.duration > 0 && audioPlayer.duration !== Infinity) {
                    audioPlayer.currentTime = position * audioPlayer.duration;
                    player.updateMediaSessionPositionState();
                } else if (player.currentTrack && player.currentTrack.duration) {
                    const targetTime = position * player.currentTrack.duration;
                    const progressFillEl = document.querySelector('.progress-fill') as HTMLElement | null;
                    if (progressFillEl) progressFillEl.style.width = `${position * 100}%`;
                    player.playTrackFromQueue(targetTime);
                }
            });
        }
    });

    volumeBar?.addEventListener('mousedown', (e: MouseEvent) => {
        isAdjustingVolume = true;
        seek(volumeBar, e, (position: number) => {
            if (audioPlayer.muted) {
                audioPlayer.muted = false;
                localStorage.setItem('muted', 'false');
            }
            player.setVolume(position);
            if (volumeFill) volumeFill.style.width = `${position * 100}%`;
            volumeBar.style.setProperty('--volume-level', `${position * 100}%`);
        });
    });

    volumeBar?.addEventListener('touchstart', (e: TouchEvent) => {
        e.preventDefault();
        isAdjustingVolume = true;
        const touch = e.touches[0];
        const rect = volumeBar.getBoundingClientRect();
        const position = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
        if (audioPlayer.muted) {
            audioPlayer.muted = false;
            localStorage.setItem('muted', 'false');
        }
        player.setVolume(position);
        if (volumeFill) volumeFill.style.width = `${position * 100}%`;
        volumeBar.style.setProperty('--volume-level', `${position * 100}%`);
    });

    volumeBar?.addEventListener('click', (e: MouseEvent) => {
        if (!isAdjustingVolume) {
            seek(volumeBar, e, (position: number) => {
                if (audioPlayer.muted) {
                    audioPlayer.muted = false;
                    localStorage.setItem('muted', 'false');
                }
                player.setVolume(position);
                if (volumeFill) volumeFill.style.width = `${position * 100}%`;
                if (volumeBar) volumeBar.style.setProperty('--volume-level', `${position * 100}%`);
            });
        }
    });
    volumeBar?.addEventListener(
        'wheel',
        (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.05 : 0.05;
            const newVolume = Math.max(0, Math.min(1, player.userVolume + delta));

            if (delta > 0 && audioPlayer.muted) {
                audioPlayer.muted = false;
                localStorage.setItem('muted', 'false');
            }

            player.setVolume(newVolume);
            if (volumeFill) volumeFill.style.width = `${newVolume * 100}%`;
            if (volumeBar) volumeBar.style.setProperty('--volume-level', `${newVolume * 100}%`);
        },
        { passive: false }
    );

    volumeBtn?.addEventListener(
        'wheel',
        (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.05 : 0.05;
            const newVolume = Math.max(0, Math.min(1, player.userVolume + delta));

            if (delta > 0 && audioPlayer.muted) {
                audioPlayer.muted = false;
                localStorage.setItem('muted', 'false');
            }

            player.setVolume(newVolume);
            if (volumeFill) volumeFill.style.width = `${newVolume * 100}%`;
            if (volumeBar) volumeBar.style.setProperty('--volume-level', `${newVolume * 100}%`);
        },
        { passive: false }
    );
}

// Standalone function to show add to playlist modal
export async function showAddToPlaylistModal(track: TrackData): Promise<void> {
    const modal = document.getElementById('playlist-select-modal');
    const list = document.getElementById('playlist-select-list');
    const cancelBtn = document.getElementById('playlist-select-cancel');
    const overlay = modal?.querySelector('.modal-overlay');

    const renderModal = async (): Promise<boolean> => {
        const playlists = await db.getPlaylists(true) as PlaylistData[];

        const trackId = track.id;
        const playlistsWithTrack = new Set<string | number>();

        for (const playlist of playlists) {
            if (playlist.tracks && playlist.tracks.some((t: TrackData) => t.id == trackId)) {
                playlistsWithTrack.add(playlist.id);
            }
        }

        if (!list) return false;
        list.innerHTML =
            `
            <div class="modal-option create-new-option" style="border-bottom: 1px solid var(--border); margin-bottom: 0.5rem;">
                <span style="font-weight: 600; color: var(--primary);">+ Create New Playlist</span>
            </div>
        ` +
            playlists
                .map((p: PlaylistData) => {
                    const alreadyContains = playlistsWithTrack.has(p.id);
                    return `
                <div class="modal-option ${alreadyContains ? 'already-contains' : ''}" data-id="${p.id}">
                    <span>${p.name}</span>
                    ${
                        alreadyContains
                            ? `<button class="remove-from-playlist-btn-modal" title="Remove from playlist" style="background: transparent; border: none; color: inherit; cursor: pointer; padding: 4px; display: flex; align-items: center;">${SVG_BIN}</button>`
                            : ''
                    }
                </div>
            `;
                })
                .join('');
        return true;
    };

    if (!(await renderModal())) return;

    const closeModal = (): void => {
        modal?.classList.remove('active');
        cleanup();
    };

    const handleOptionClick = async (e: Event): Promise<void> => {
        const target = e.target as HTMLElement;
        const removeBtn = target.closest('.remove-from-playlist-btn-modal');
        const option = target.closest('.modal-option') as HTMLElement | null;

        if (!option) return;

        if (option.classList.contains('create-new-option')) {
            closeModal();
            const createModal = document.getElementById('playlist-modal') as HTMLElement | null;
            const titleEl = document.getElementById('playlist-modal-title');
            const nameInput = document.getElementById('playlist-name-input') as HTMLInputElement | null;
            const coverInput = document.getElementById('playlist-cover-input') as HTMLInputElement | null;
            const coverFileInput = document.getElementById('playlist-cover-file-input') as HTMLInputElement | null;
            const descInput = document.getElementById('playlist-description-input') as HTMLInputElement | null;
            const importSection = document.getElementById('import-section');
            if (titleEl) titleEl.textContent = 'Create Playlist';
            if (nameInput) nameInput.value = '';
            if (coverInput) coverInput.value = '';
            if (coverFileInput) coverFileInput.value = '';
            if (descInput) descInput.value = '';
            if (createModal) createModal.dataset.editingId = '';
            if (importSection) importSection.style.display = 'none';

            // Reset cover upload state
            const coverUploadBtn = document.getElementById('playlist-cover-upload-btn');
            const coverUrlInput = document.getElementById('playlist-cover-input');
            const coverToggleUrlBtn = document.getElementById('playlist-cover-toggle-url-btn');
            if (coverUploadBtn) {
                coverUploadBtn.style.flex = '1';
                coverUploadBtn.style.display = 'flex';
            }
            if (coverUrlInput) coverUrlInput.style.display = 'none';
            if (coverToggleUrlBtn) {
                coverToggleUrlBtn.textContent = 'or URL';
                coverToggleUrlBtn.title = 'Switch to URL input';
            }

            // Pass track
            if (createModal) (createModal as HTMLElement & { _pendingTracks: TrackData[] })._pendingTracks = [track];

            createModal?.classList.add('active');
            nameInput?.focus();
            return;
        }

        const playlistId = option.dataset.id;

        if (removeBtn) {
            e.stopPropagation();
            await db.removeTrackFromPlaylist(playlistId, track.id);
            const updatedPlaylist = await db.getPlaylist(playlistId);
            syncManager.syncUserPlaylist(updatedPlaylist as Record<string, unknown>, 'update');
            showNotification(`Removed from playlist: ${option.querySelector('span')?.textContent}`);
            await renderModal();
        } else {
            if (option.classList.contains('already-contains')) return;

            await db.addTrackToPlaylist(playlistId, track);
            const updatedPlaylist = await db.getPlaylist(playlistId);
            syncManager.syncUserPlaylist(updatedPlaylist as Record<string, unknown>, 'update');
            showNotification(`Added to playlist: ${option.querySelector('span')?.textContent}`);
            closeModal();
        }
    };

    const cleanup = (): void => {
        cancelBtn?.removeEventListener('click', closeModal);
        overlay?.removeEventListener('click', closeModal);
        list?.removeEventListener('click', handleOptionClick);
    };

    cancelBtn?.addEventListener('click', closeModal);
    overlay?.addEventListener('click', closeModal);
    list?.addEventListener('click', handleOptionClick);

    modal?.classList.add('active');
}

export async function handleTrackAction(
    action: string,
    item: TrackData & Record<string, unknown>,
    player: PlayerInstance,
    api: ApiInstance,
    lyricsManager: unknown,
    type: string = 'track',
    ui: UIInstance | null = null,
    scrobbler: ScrobblerInstance | null = null,
    extraData: Record<string, string> | null = null
): Promise<void> {
    if (!item) return;

    // Actions not allowed for unavailable tracks
    const forbiddenForUnavailable = ['add-to-queue', 'play-next', 'track-mix', 'download'];
    if (item.isUnavailable && forbiddenForUnavailable.includes(action)) {
        showNotification('This track is unavailable.');
        return;
    }

    if (action === 'track-mix' && type === 'track') {
        if (item.mixes && item.mixes.TRACK_MIX) {
            navigate(`/mix/${item.mixes.TRACK_MIX}`);
        }
        return;
    }

    // Collection Actions (Album, Playlist, Mix)
    const isCollection = ['album', 'playlist', 'user-playlist', 'mix'].includes(type);
    const collectionActions = ['play-card', 'shuffle-play-card', 'add-to-queue', 'play-next', 'download', 'start-mix'];

    if (isCollection && collectionActions.includes(action)) {
        try {
            // Check if album/artist is blocked
            const { contentBlockingSettings } = await import('./storage.ts');
            if (type === 'album' && contentBlockingSettings.shouldHideAlbum(item as unknown as TrackAlbum)) {
                showNotification('This album is blocked');
                return;
            }

            let tracks: TrackData[] = [];
            let collectionItem: TrackData & Record<string, unknown> = item;

            if (type === 'album') {
                const data = await api.getAlbum(item.id);
                tracks = data.tracks;
                collectionItem = (data.album || item) as TrackData & Record<string, unknown>;
            } else if (type === 'playlist') {
                const data = await api.getPlaylist(item.uuid as string | number);
                tracks = data.tracks;
                collectionItem = (data.playlist || item) as TrackData & Record<string, unknown>;
            } else if (type === 'user-playlist') {
                let playlist = await db.getPlaylist(item.id) as PlaylistData | null;
                if (!playlist) {
                    try {
                        playlist = await syncManager.getPublicPlaylist(String(item.id)) as PlaylistData | null;
                    } catch {
                        /* ignore */
                    }
                }
                tracks = playlist?.tracks ?? (item.tracks as TrackData[] | undefined) ?? [];
                collectionItem = (playlist as TrackData & Record<string, unknown>) || item;
            } else if (type === 'mix') {
                const data = await api.getMix(item.id);
                tracks = data.tracks;
                collectionItem = (data.mix || item) as TrackData & Record<string, unknown>;
            }

            if (tracks.length === 0 && action !== 'start-mix') {
                showNotification(`No tracks found in this ${type}`);
                return;
            }

            if (action === 'download') {
                if (type === 'album') {
                    await downloadAlbumAsZip(
                        collectionItem,
                        tracks,
                        api,
                        downloadQualitySettings.getQuality(),
                        lyricsManager as null
                    );
                } else {
                    await downloadPlaylistAsZip(
                        collectionItem,
                        tracks,
                        api,
                        downloadQualitySettings.getQuality(),
                        lyricsManager as null
                    );
                }
                return;
            }

            // Filter blocked tracks from collections
            tracks = contentBlockingSettings.filterTracks(tracks);

            if (action === 'add-to-queue') {
                player.addToQueue(tracks);
                if (window.renderQueueFunction) window.renderQueueFunction();
                showNotification(`Added ${tracks.length} tracks to queue`);
                return;
            }

            if (action === 'play-next') {
                player.addNextToQueue(tracks);
                if (window.renderQueueFunction) window.renderQueueFunction();
                showNotification(`Playing next: ${tracks.length} tracks`);
                return;
            }

            if (action === 'start-mix') {
                if (type === 'album' && collectionItem.artist?.id) {
                    const artistData = await api.getArtist(collectionItem.artist.id);
                    if (artistData.mixes?.ARTIST_MIX) {
                        navigate(`/mix/${artistData.mixes.ARTIST_MIX}`);
                        return;
                    }
                }
                // Fallback to item's own page or first track's mix
                if (tracks.length > 0 && tracks[0].mixes?.TRACK_MIX) {
                    navigate(`/mix/${tracks[0].mixes.TRACK_MIX}`);
                } else {
                    navigate(`/${type.replace('user-', '')}/${item.id || item.uuid}`);
                }
                return;
            }

            // play-card and shuffle-play-card
            if (action === 'shuffle-play-card') {
                player.shuffleActive = true;
                const tracksToShuffle = [...tracks];
                tracksToShuffle.sort(() => Math.random() - 0.5);
                player.setQueue(tracksToShuffle, 0);
                const shuffleBtn = document.getElementById('shuffle-btn');
                if (shuffleBtn) shuffleBtn.classList.add('active');
            } else {
                player.setQueue(tracks, 0);
                const shuffleBtn = document.getElementById('shuffle-btn');
                if (shuffleBtn) shuffleBtn.classList.remove('active');
            }
            player.playAtIndex(0);
            const name = type === 'user-playlist' ? collectionItem.name : collectionItem.title;
            showNotification(`Playing ${type.replace('user-', '')}: ${name}`);
        } catch (error) {
            console.error('Failed to handle collection action:', error);
            showNotification(`Failed to process ${type} action`);
        }
        return;
    }

    if (action === 'toggle-pin') {
        const pinned = await db.togglePinned(item, type);
        showNotification(pinned ? `Pinned to sidebar` : `Unpinned from sidebar`);

        if (ui && typeof ui.renderPinnedItems === 'function') {
            ui.renderPinnedItems();
        }
    }

    // Individual Track Actions
    // Check if track/artist is blocked
    const { contentBlockingSettings } = await import('./storage.ts');
    if (type === 'track' && contentBlockingSettings.shouldHideTrack(item)) {
        showNotification('This track is blocked');
        return;
    }

    if (action === 'add-to-queue') {
        trackAddToQueue(item, 'end');
        player.addToQueue(item);
        if (window.renderQueueFunction) window.renderQueueFunction();
        showNotification(`Added to queue: ${item.title}`);
    } else if (action === 'play-next') {
        trackPlayNext(item);
        player.addNextToQueue(item);
        if (window.renderQueueFunction) window.renderQueueFunction();
        showNotification(`Playing next: ${item.title}`);
    } else if (action === 'play-card') {
        player.setQueue([item], 0);
        player.playAtIndex(0);
        showNotification(`Playing track: ${item.title}`);
    } else if (action === 'start-mix') {
        trackStartMix(type, item);
        if (item.mixes?.TRACK_MIX) {
            navigate(`/mix/${item.mixes.TRACK_MIX}`);
        } else {
            showNotification('No mix available for this track');
        }
    } else if (action === 'download') {
        trackDownloadTrack(item, downloadQualitySettings.getQuality());
        await downloadTrackWithMetadata(item, downloadQualitySettings.getQuality(), api, lyricsManager as null);
    } else if (action === 'toggle-like') {
        const added = await db.toggleFavorite(type, item);
        syncManager.syncLibraryItem(type as 'track' | 'album' | 'artist' | 'playlist' | 'mix', item, added);

        // Track like/unlike
        if (added) {
            if (type === 'track') trackLikeTrack(item);
            else if (type === 'album') trackLikeAlbum(item);
            else if (type === 'artist') trackLikeArtist(item);
            else if (type === 'playlist' || type === 'user-playlist') trackLikePlaylist(item);
        } else {
            if (type === 'track') trackUnlikeTrack(item);
            else if (type === 'album') trackUnlikeAlbum(item);
            else if (type === 'artist') trackUnlikeArtist(item);
            else if (type === 'playlist' || type === 'user-playlist') trackUnlikePlaylist(item);
        }

        if (added && type === 'track' && scrobbler) {
            if (lastFMStorage.isEnabled() && lastFMStorage.shouldLoveOnLike()) {
                scrobbler.loveTrack(item);
            }
            if (libreFmSettings.isEnabled() && libreFmSettings.shouldLoveOnLike()) {
                scrobbler.loveTrack(item);
            }
        }

        // Update all instances of this item's like button on the page
        const id = type === 'playlist' ? item.uuid : item.id;
        const selector =
            type === 'track'
                ? `[data-track-id="${id}"] .like-btn`
                : `.card[data-${type}-id="${id}"] .like-btn, .card[data-playlist-id="${id}"] .like-btn`;

        // Also check header buttons
        const headerBtn = document.getElementById(`like-${type}-btn`);

        const elementsToUpdate: HTMLElement[] = [...document.querySelectorAll(selector)] as HTMLElement[];
        if (headerBtn) elementsToUpdate.push(headerBtn);

        const nowPlayingLikeBtn = document.getElementById('now-playing-like-btn');
        if (nowPlayingLikeBtn && type === 'track' && player?.currentTrack?.id === item.id) {
            elementsToUpdate.push(nowPlayingLikeBtn);
        }

        const fsLikeBtn = document.getElementById('fs-like-btn');
        if (fsLikeBtn && type === 'track' && player?.currentTrack?.id === item.id) {
            elementsToUpdate.push(fsLikeBtn);
        }

        elementsToUpdate.forEach((btn) => {
            const heartIcon = btn.querySelector('svg');
            if (heartIcon) {
                heartIcon.classList.toggle('filled', added);
                if (heartIcon.hasAttribute('fill')) {
                    heartIcon.setAttribute('fill', added ? 'currentColor' : 'none');
                }
            }
            btn.classList.toggle('active', added);
            btn.title = added ? 'Remove from Favorites' : 'Add to Favorites';
        });

        // Handle Library Page Update
        if (window.location.hash === '#library') {
            const itemSelector =
                type === 'track'
                    ? `.track-item[data-track-id="${id}"]`
                    : `.card[data-${type}-id="${id}"], .card[data-playlist-id="${id}"]`;

            const itemEl = document.querySelector(itemSelector);

            if (!added && itemEl) {
                // Remove item
                const container = itemEl.parentElement;
                itemEl.remove();
                if (container && container.children.length === 0) {
                    const msg = type === 'track' ? 'No liked tracks yet.' : `No liked ${type}s yet.`;
                    container.innerHTML = `<div class="placeholder-text">${msg}</div>`;
                }
            } else if (added && !itemEl && ui && type === 'track') {
                // Add item (specifically for tracks currently)
                const tracksContainer = document.getElementById('library-tracks-container');
                if (tracksContainer) {
                    // Remove placeholder if it exists
                    const placeholder = tracksContainer.querySelector('.placeholder-text');
                    if (placeholder) placeholder.remove();

                    // Create track element
                    const index = tracksContainer.children.length;
                    const trackHTML = ui.createTrackItemHTML(item, index, true, false);

                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = trackHTML;
                    const newEl = tempDiv.firstElementChild;

                    if (newEl) {
                        tracksContainer.appendChild(newEl);
                        trackDataStore.set(newEl as HTMLElement, item);
                        ui.updateLikeState(newEl, 'track', item.id);
                    }
                }
            }
        }
    } else if (action === 'add-to-playlist') {
        const modal = document.getElementById('playlist-select-modal');
        const list = document.getElementById('playlist-select-list');
        const cancelBtn = document.getElementById('playlist-select-cancel');
        const overlay = modal?.querySelector('.modal-overlay');

        const renderModal = async (): Promise<boolean> => {
            const playlists = await db.getPlaylists(true) as PlaylistData[];
            // Removed empty check to allow creating new playlist

            const trackId = item.id;
            const playlistsWithTrack = new Set<string | number>();

            for (const playlist of playlists) {
                if (playlist.tracks && playlist.tracks.some((track: TrackData) => track.id == trackId)) {
                    playlistsWithTrack.add(playlist.id);
                }
            }

            if (!list) return false;
            list.innerHTML =
                `
                <div class="modal-option create-new-option" style="border-bottom: 1px solid var(--border); margin-bottom: 0.5rem;">
                    <span style="font-weight: 600; color: var(--primary);">+ Create New Playlist</span>
                </div>
            ` +
                playlists
                    .map((p: PlaylistData) => {
                        const alreadyContains = playlistsWithTrack.has(p.id);
                        return `
                    <div class="modal-option ${alreadyContains ? 'already-contains' : ''}" data-id="${p.id}">
                        <span>${p.name}</span>
                        ${
                            alreadyContains
                                ? `<button class="remove-from-playlist-btn-modal" title="Remove from playlist" style="background: transparent; border: none; color: inherit; cursor: pointer; padding: 4px; display: flex; align-items: center;">${SVG_BIN}</button>`
                                : ''
                        }
                    </div>
                `;
                    })
                    .join('');
            return true;
        };

        if (!(await renderModal())) return;

        const closeModal = (): void => {
            modal?.classList.remove('active');
            cleanup();
        };

        const handleOptionClick = async (e: Event): Promise<void> => {
            const target = e.target as HTMLElement;
            const removeBtn = target.closest('.remove-from-playlist-btn-modal');
            const option = target.closest('.modal-option') as HTMLElement | null;

            if (!option) return;

            if (option.classList.contains('create-new-option')) {
                closeModal();
                const createModal = document.getElementById('playlist-modal') as HTMLElement | null;
                const titleEl = document.getElementById('playlist-modal-title');
                const nameInput = document.getElementById('playlist-name-input') as HTMLInputElement | null;
                const coverInput = document.getElementById('playlist-cover-input') as HTMLInputElement | null;
                const coverFileInput = document.getElementById('playlist-cover-file-input') as HTMLInputElement | null;
                const descInput = document.getElementById('playlist-description-input') as HTMLInputElement | null;
                const importSection = document.getElementById('import-section');
                if (titleEl) titleEl.textContent = 'Create Playlist';
                if (nameInput) nameInput.value = '';
                if (coverInput) coverInput.value = '';
                if (coverFileInput) coverFileInput.value = '';
                if (descInput) descInput.value = '';
                if (createModal) createModal.dataset.editingId = '';
                if (importSection) importSection.style.display = 'none';

                // Reset cover upload state
                const coverUploadBtn = document.getElementById('playlist-cover-upload-btn');
                const coverUrlInput = document.getElementById('playlist-cover-input');
                const coverToggleUrlBtn = document.getElementById('playlist-cover-toggle-url-btn');
                if (coverUploadBtn) {
                    coverUploadBtn.style.flex = '1';
                    coverUploadBtn.style.display = 'flex';
                }
                if (coverUrlInput) coverUrlInput.style.display = 'none';
                if (coverToggleUrlBtn) {
                    coverToggleUrlBtn.textContent = 'or URL';
                    coverToggleUrlBtn.title = 'Switch to URL input';
                }

                // Pass track
                if (createModal) (createModal as HTMLElement & { _pendingTracks: TrackData[] })._pendingTracks = [item];

                createModal?.classList.add('active');
                nameInput?.focus();
                return;
            }

            const playlistId = option.dataset.id;

            if (removeBtn) {
                e.stopPropagation();
                await db.removeTrackFromPlaylist(playlistId, item.id);
                const updatedPlaylist = await db.getPlaylist(playlistId);
                syncManager.syncUserPlaylist(updatedPlaylist as Record<string, unknown>, 'update');
                showNotification(`Removed from playlist: ${option.querySelector('span')?.textContent}`);
                await renderModal();
            } else {
                if (option.classList.contains('already-contains')) return;

                await db.addTrackToPlaylist(playlistId, item);
                const updatedPlaylist = await db.getPlaylist(playlistId);
                syncManager.syncUserPlaylist(updatedPlaylist as Record<string, unknown>, 'update');
                showNotification(`Added to playlist: ${option.querySelector('span')?.textContent}`);
                closeModal();
            }
        };

        const cleanup = (): void => {
            cancelBtn?.removeEventListener('click', closeModal);
            overlay?.removeEventListener('click', closeModal);
            list?.removeEventListener('click', handleOptionClick);
        };

        cancelBtn?.addEventListener('click', closeModal);
        overlay?.addEventListener('click', closeModal);
        list?.addEventListener('click', handleOptionClick);

        modal?.classList.add('active');
    } else if (action === 'go-to-artist') {
        const artistId = extraData?.artistId || item.artist?.id || item.artists?.[0]?.id;
        const trackerSheetId = extraData?.trackerSheetId || (item.isTracker ? item.trackerInfo?.sheetId : null);

        if (trackerSheetId) {
            navigate(`/unreleased/${trackerSheetId}`);
        } else if (artistId) {
            navigate(`/artist/${artistId}`);
        }
    } else if (action === 'go-to-album') {
        if (item.album?.id) {
            navigate(`/album/${item.album.id}`);
        }
    } else if (action === 'copy-link' || action === 'share') {
        // Use stored href from card if available, otherwise construct URL
        const contextMenu = document.getElementById('context-menu') as ContextMenuElement | null;
        const storedHref = contextMenu?._contextHref;
        const url = getShareUrl(storedHref ? storedHref : `/track/${item.id || item.uuid}`);

        trackCopyLink(type, item.id || item.uuid);
        navigator.clipboard.writeText(url).then(() => {
            showNotification('Link copied to clipboard!');
        });
    } else if (action === 'open-in-new-tab') {
        // Use stored href from card if available, otherwise construct URL
        const contextMenu = document.getElementById('context-menu') as ContextMenuElement | null;
        const storedHref = contextMenu?._contextHref;
        const url = storedHref
            ? `${window.location.origin}${storedHref}`
            : `${window.location.origin}/track/${item.id || item.uuid}`;

        trackOpenInNewTab(type, item.id || item.uuid);
        window.open(url, '_blank');
    } else if (action === 'track-info') {
        // Show detailed track info modal
        const isTracker = item.isTracker;
        let infoHTML = '';

        if (isTracker && item.trackerInfo) {
            // Detailed unreleased/tracker track info
            const releaseDate = (item.trackerInfo.releaseDate as string | undefined) || item.streamStartDate;
            const dateDisplay = releaseDate ? new Date(releaseDate).toLocaleDateString() : 'Unknown';
            const addedDate = item.trackerInfo.addedDate
                ? new Date(item.trackerInfo.addedDate as string).toLocaleDateString()
                : 'Unknown';

            infoHTML = `
                <div style="padding: 1.5rem; max-width: 500px; max-height: 80vh; overflow-y: auto;">
                    <h3 style="margin-bottom: 1rem; font-size: 1.3rem; font-weight: 600;">${escapeHtml(item.title)}</h3>
                    <div style="color: var(--muted-foreground); font-size: 0.9rem; line-height: 1.8;">
                        <div style="margin-bottom: 1rem; padding: 0.75rem; background: var(--accent); border-radius: 8px;">
                            <p style="color: var(--primary); font-weight: 500;">Unreleased Track</p>
                        </div>
                        
                        <div style="display: grid; gap: 0.5rem;">
                            ${item.artists ? `<p><strong style="color: var(--foreground);">Artist:</strong> ${escapeHtml(Array.isArray(item.artists) ? item.artists.map((a) => a.name || a).join(', ') : item.artists)}</p>` : ''}
                            ${item.trackerInfo.artist ? `<p><strong style="color: var(--foreground);">Tracked Artist:</strong> ${escapeHtml(item.trackerInfo.artist)}</p>` : ''}
                            ${item.trackerInfo.project ? `<p><strong style="color: var(--foreground);">Project:</strong> ${escapeHtml(item.trackerInfo.project)}</p>` : ''}
                            ${item.trackerInfo.era ? `<p><strong style="color: var(--foreground);">Era:</strong> ${escapeHtml(item.trackerInfo.era)}</p>` : ''}
                            ${item.trackerInfo.timeline ? `<p><strong style="color: var(--foreground);">Timeline:</strong> ${escapeHtml(item.trackerInfo.timeline)}</p>` : ''}
                            ${item.trackerInfo.category ? `<p><strong style="color: var(--foreground);">Category:</strong> ${escapeHtml(item.trackerInfo.category)}</p>` : ''}
                            ${item.trackerInfo.trackNumber ? `<p><strong style="color: var(--foreground);">Track Number:</strong> ${escapeHtml(String(item.trackerInfo.trackNumber))}</p>` : ''}
                            <p><strong style="color: var(--foreground);">Duration:</strong> ${escapeHtml(formatTime(item.duration))}</p>
                            ${releaseDate !== 'Unknown' ? `<p><strong style="color: var(--foreground);">Release Date:</strong> ${escapeHtml(dateDisplay)}</p>` : ''}
                            ${item.trackerInfo.addedDate ? `<p><strong style="color: var(--foreground);">Added to Tracker:</strong> ${escapeHtml(addedDate)}</p>` : ''}
                            ${item.trackerInfo.leakedDate ? `<p><strong style="color: var(--foreground);">Leak Date:</strong> ${escapeHtml(new Date(item.trackerInfo.leakedDate as string).toLocaleDateString())}</p>` : ''}
                            ${item.trackerInfo.recordingDate ? `<p><strong style="color: var(--foreground);">Recording Date:</strong> ${escapeHtml(new Date(item.trackerInfo.recordingDate as string).toLocaleDateString())}</p>` : ''}
                        </div>
                        
                        ${
                            item.trackerInfo.description
                                ? `
                            <div style="margin-top: 1rem; padding: 0.75rem; background: var(--accent); border-radius: 8px;">
                                <p style="color: var(--foreground); font-weight: 500; margin-bottom: 0.5rem;">Description</p>
                                <p style="font-size: 0.85rem; line-height: 1.6;">${escapeHtml(item.trackerInfo.description)}</p>
                            </div>
                        `
                                : ''
                        }
                        
                        ${
                            item.trackerInfo.notes
                                ? `
                            <div style="margin-top: 1rem; padding: 0.75rem; background: var(--accent); border-radius: 8px;">
                                <p style="color: var(--foreground); font-weight: 500; margin-bottom: 0.5rem;">Notes</p>
                                <p style="font-size: 0.85rem; line-height: 1.6;">${escapeHtml(item.trackerInfo.notes)}</p>
                            </div>
                        `
                                : ''
                        }
                        
                        ${
                            item.trackerInfo.sourceUrl
                                ? `
                            <div style="margin-top: 1rem;">
                                <p style="margin-bottom: 0.5rem;"><strong style="color: var(--foreground);">Source URL:</strong></p>
                                <a href="${escapeHtml(item.trackerInfo.sourceUrl)}" target="_blank" style="color: var(--primary); word-break: break-all; font-size: 0.85rem; display: block; padding: 0.5rem; background: var(--accent); border-radius: 6px; text-decoration: none;">
                                    ${escapeHtml(item.trackerInfo.sourceUrl)}
                                </a>
                            </div>
                        `
                                : ''
                        }
                        
                        ${item.id ? `<p style="margin-top: 1rem; font-size: 0.8rem; color: var(--muted);"><strong>Track ID:</strong> ${escapeHtml(item.id)}</p>` : ''}
                    </div>
                    <button class="btn-primary track-info-close-btn" style="margin-top: 1.5rem; width: 100%;">Close</button>
                </div>
            `;
        } else {
            // Detailed normal track info
            const releaseDate = item.album?.releaseDate || item.streamStartDate;
            const dateDisplay = releaseDate ? new Date(releaseDate).toLocaleDateString() : 'Unknown';
            const quality = item.audioQuality || 'Unknown';
            const bitrate = item.bitrate ? `${item.bitrate} kbps` : '';

            infoHTML = `
                <div style="padding: 1.5rem; max-width: 500px; max-height: 80vh; overflow-y: auto;">
                    <h3 style="margin-bottom: 1rem; font-size: 1.3rem; font-weight: 600;">${escapeHtml(item.title)}</h3>
                    <div style="color: var(--muted-foreground); font-size: 0.9rem; line-height: 1.8;">
                        <div style="display: grid; gap: 0.5rem;">
                            <p><strong style="color: var(--foreground);">Artist:</strong> ${escapeHtml(getTrackArtists(item))}</p>
                            <p><strong style="color: var(--foreground);">Album:</strong> ${escapeHtml(item.album?.title || 'Unknown')}</p>
                            ${item.album?.artist?.name ? `<p><strong style="color: var(--foreground);">Album Artist:</strong> ${escapeHtml(item.album.artist.name)}</p>` : ''}
                            <p><strong style="color: var(--foreground);">Release Date:</strong> ${escapeHtml(dateDisplay)}</p>
                            <p><strong style="color: var(--foreground);">Duration:</strong> ${escapeHtml(formatTime(item.duration))}</p>
                            ${item.trackNumber ? `<p><strong style="color: var(--foreground);">Track Number:</strong> ${escapeHtml(String(item.trackNumber))}</p>` : ''}
                            ${item.discNumber ? `<p><strong style="color: var(--foreground);">Disc Number:</strong> ${escapeHtml(String(item.discNumber))}</p>` : ''}
                            ${item.version ? `<p><strong style="color: var(--foreground);">Version:</strong> ${escapeHtml(item.version)}</p>` : ''}
                            ${item.explicit ? `<p><strong style="color: var(--foreground);">Explicit:</strong> Yes</p>` : ''}
                            <p><strong style="color: var(--foreground);">Quality:</strong> ${escapeHtml(quality)} ${bitrate ? `(${escapeHtml(bitrate)})` : ''}</p>
                        </div>
                        
                        ${
                            Array.isArray(item.credits) && item.credits.length > 0
                                ? `
                            <div style="margin-top: 1rem; padding: 0.75rem; background: var(--accent); border-radius: 8px;">
                                <p style="color: var(--foreground); font-weight: 500; margin-bottom: 0.5rem;">Credits</p>
                                <div style="font-size: 0.85rem; line-height: 1.6;">
                                    ${(item.credits as {type: string; name: string}[]).map((c: {type: string; name: string}) => `<p>${escapeHtml(c.type)}: ${escapeHtml(c.name)}</p>`).join('')}
                                </div>
                            </div>
                        `
                                : ''
                        }
                        
                        ${
                            Array.isArray(item.composers) && item.composers.length > 0
                                ? `
                            <p style="margin-top: 0.5rem;"><strong style="color: var(--foreground);">Composers:</strong> ${escapeHtml((item.composers as {name: string}[]).map((c: {name: string}) => c.name).join(', '))}</p>
                        `
                                : ''
                        }
                        
                        ${
                            (item.lyrics as Record<string, unknown> | undefined)?.text
                                ? `
                            <div style="margin-top: 1rem; padding: 0.75rem; background: var(--accent); border-radius: 8px;">
                                <p style="color: var(--foreground); font-weight: 500; margin-bottom: 0.5rem;">Has Lyrics</p>
                            </div>
                        `
                                : ''
                        }
                        
                        ${item.id ? `<p style="margin-top: 1rem; font-size: 0.8rem; color: var(--muted);"><strong>Track ID:</strong> ${escapeHtml(item.id)}</p>` : ''}
                        ${item.album?.id ? `<p style="font-size: 0.8rem; color: var(--muted);"><strong>Album ID:</strong> ${escapeHtml(item.album.id)}</p>` : ''}
                    </div>
                    <button class="btn-primary track-info-close-btn" style="margin-top: 1.5rem; width: 100%;">Close</button>
                </div>
            `;
        }

        // Create and show modal
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText =
            'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 10000;';
        modal.innerHTML = infoHTML;
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };
        const closeBtn = modal.querySelector('.track-info-close-btn') as HTMLElement | null;
        if (closeBtn) {
            closeBtn.onclick = () => modal.remove();
        }
        document.body.appendChild(modal);
    } else if (action === 'open-original-url') {
        // Open the original source URL for the track
        let url: string | null = null;

        if (item.isTracker && item.trackerInfo && item.trackerInfo.sourceUrl) {
            url = item.trackerInfo.sourceUrl as string;
        } else if (item.remoteUrl) {
            url = item.remoteUrl as string;
        }

        if (url) {
            window.open(url, '_blank');
        } else {
            showNotification('No original URL available for this track.');
        }
    } else if (action === 'block-track') {
        const { contentBlockingSettings } = await import('./storage.ts');
        if (contentBlockingSettings.isTrackBlocked(item.id)) {
            contentBlockingSettings.unblockTrack(item.id);
            trackUnblockTrack(item);
            showNotification(`Unblocked track: ${item.title}`);
        } else {
            contentBlockingSettings.blockTrack(item);
            trackBlockTrack(item);
            showNotification(`Blocked track: ${item.title}`);
        }
    } else if (action === 'block-album') {
        const { contentBlockingSettings } = await import('./storage.ts');
        const albumId = type === 'album' ? item.id : item.album?.id;
        const albumTitle = type === 'album' ? item.title : item.album?.title;
        const albumArtist = type === 'album' ? item.artist : item.album?.artist;

        if (!albumId) {
            showNotification('No album information available');
            return;
        }

        const albumObj = { id: albumId, title: albumTitle || '', cover: '', artist: albumArtist } as TrackAlbum;

        if (contentBlockingSettings.isAlbumBlocked(albumId)) {
            contentBlockingSettings.unblockAlbum(albumId);
            trackUnblockAlbum(albumObj);
            showNotification(`Unblocked album: ${albumTitle || 'Unknown Album'}`);
        } else {
            contentBlockingSettings.blockAlbum(albumObj);
            trackBlockAlbum(albumObj);
            showNotification(`Blocked album: ${albumTitle || 'Unknown Album'}`);
        }
    } else if (action === 'block-artist') {
        const { contentBlockingSettings } = await import('./storage.ts');
        const artistId = item.artist?.id || item.artists?.[0]?.id;
        const artistName = item.artist?.name || item.artists?.[0]?.name || (item.name as string | undefined);

        if (!artistId) {
            showNotification('No artist information available');
            return;
        }

        const artistObj = { id: artistId, name: artistName || 'Unknown Artist' };

        if (contentBlockingSettings.isArtistBlocked(artistId)) {
            contentBlockingSettings.unblockArtist(artistId);
            trackUnblockArtist(artistObj);
            showNotification(`Unblocked artist: ${artistName || 'Unknown Artist'}`);
        } else {
            contentBlockingSettings.blockArtist(artistObj);
            trackBlockArtist(artistObj);
            showNotification(`Blocked artist: ${artistName || 'Unknown Artist'}`);
        }
    }
}

async function updateContextMenuLikeState(contextMenu: ContextMenuElement, contextTrack: TrackData & Record<string, unknown>): Promise<void> {
    if (!contextMenu || !contextTrack) return;

    const likeItem = contextMenu.querySelector('li[data-action="toggle-like"]');
    if (likeItem) {
        const isLiked = await db.isFavorite('track', contextTrack.id);
        likeItem.textContent = isLiked ? 'Unlike' : 'Like';
    }

    const pinItem = contextMenu.querySelector('li[data-action="toggle-pin"]');
    if (pinItem) {
        const isPinned = await db.isPinned(contextTrack.id || contextTrack.uuid);
        pinItem.textContent = isPinned ? 'Unpin' : 'Pin';
    }

    const trackMixItem = contextMenu.querySelector('li[data-action="track-mix"]') as HTMLElement | null;
    if (trackMixItem) {
        const hasMix = contextTrack.mixes && contextTrack.mixes.TRACK_MIX;
        trackMixItem.style.display = hasMix ? 'block' : 'none';
    }

    // Show/hide "Open Original URL" only for unreleased/tracker tracks
    const openOriginalUrlItem = contextMenu.querySelector('li[data-action="open-original-url"]') as HTMLElement | null;
    if (openOriginalUrlItem) {
        const isUnreleased = contextTrack.isTracker || (contextTrack.trackerInfo && contextTrack.trackerInfo.sourceUrl);
        openOriginalUrlItem.style.display = isUnreleased ? 'block' : 'none';
    }

    // Update block/unblock labels
    const { contentBlockingSettings } = await import('./storage.ts');
    const type = contextMenu._contextType || 'track';

    const blockTrackItem = contextMenu.querySelector('li[data-action="block-track"]') as HTMLElement | null;
    if (blockTrackItem) {
        const isBlocked = contentBlockingSettings.isTrackBlocked(contextTrack.id);
        blockTrackItem.textContent = isBlocked
            ? blockTrackItem.dataset.labelUnblock || 'Unblock track'
            : blockTrackItem.dataset.labelBlock || 'Block track';
    }

    const blockAlbumItem = contextMenu.querySelector('li[data-action="block-album"]') as HTMLElement | null;
    if (blockAlbumItem) {
        const albumId = type === 'album' ? contextTrack.id : contextTrack.album?.id;
        const isBlocked = albumId ? contentBlockingSettings.isAlbumBlocked(albumId) : false;
        blockAlbumItem.textContent = isBlocked
            ? blockAlbumItem.dataset.labelUnblock || 'Unblock album'
            : blockAlbumItem.dataset.labelBlock || 'Block album';
    }

    const blockArtistItem = contextMenu.querySelector('li[data-action="block-artist"]') as HTMLElement | null;
    if (blockArtistItem) {
        const artistId = contextTrack.artist?.id || contextTrack.artists?.[0]?.id;
        const isBlocked = artistId ? contentBlockingSettings.isArtistBlocked(artistId) : false;
        blockArtistItem.textContent = isBlocked
            ? blockArtistItem.dataset.labelUnblock || 'Unblock artist'
            : blockArtistItem.dataset.labelBlock || 'Block artist';
    }

    // Filter items based on type
    contextMenu.querySelectorAll<HTMLElement>('li[data-action]').forEach((item: HTMLElement) => {
        const filter = item.dataset.typeFilter;
        if (filter) {
            const types = filter.split(',');
            item.style.display = types.includes(type) ? 'block' : 'none';
        } else {
            item.style.display = 'block';
        }

        // Update labels for Like/Save
        if (item.dataset.action === 'toggle-like') {
            const labelKey = `label${type.charAt(0).toUpperCase() + type.slice(1).replace('User-playlist', 'Playlist')}`;
            const label = item.dataset[labelKey] || item.dataset.labelTrack || 'Like';
            item.textContent = label;
        }
    });

    // Handle multiple artists for "Go to artist"
    const artistItem = contextMenu.querySelector('li[data-action="go-to-artist"]') as HTMLElement | null;
    if (artistItem) {
        const artists = Array.isArray(contextTrack.artists)
            ? contextTrack.artists
            : contextTrack.artist
              ? [contextTrack.artist]
              : [];
        const canShowArtist = type === 'track' || type === 'album';

        if (artists.length > 1 && canShowArtist) {
            artistItem.style.display = 'block';
            artistItem.textContent = 'Go to artists';
            artistItem.dataset.hasMultipleArtists = 'true';
        } else {
            const hasArtist = artists.length > 0;
            artistItem.style.display = hasArtist && canShowArtist ? 'block' : 'none';
            artistItem.dataset.hasMultipleArtists = 'false';
            artistItem.textContent = artists.length > 1 ? 'Go to artists' : 'Go to artist';
            delete artistItem.dataset.artistId;
            delete artistItem.dataset.trackerSheetId;
        }
    }
}

export function initializeTrackInteractions(player: PlayerInstance, api: ApiInstance, mainContent: HTMLElement, contextMenu: ContextMenuElement, lyricsManager: unknown, ui: UIInstance, scrobbler: ScrobblerInstance): void {
    let contextTrack: (TrackData & Record<string, unknown>) | null = null;

    mainContent.addEventListener('click', async (e: Event) => {
        const target = e.target as HTMLElement;
        const actionBtn = target.closest('.track-action-btn, .like-btn, .play-btn') as HTMLElement | null;
        if (actionBtn && actionBtn.dataset.action) {
            e.preventDefault(); // Prevent card navigation
            e.stopPropagation();
            const itemElement = actionBtn.closest('.track-item, .card');
            const action = actionBtn.dataset.action;
            const type = actionBtn.dataset.type || 'track';

            let item: (TrackData & Record<string, unknown>) | undefined = itemElement ? trackDataStore.get(itemElement as HTMLElement) as TrackData | undefined : trackDataStore.get(actionBtn) as TrackData | undefined;

            // If no item from element (e.g. header buttons), try to get from hash
            if (!item && action === 'toggle-like') {
                const id = window.location.pathname.split('/')[2];
                if (id) {
                    try {
                        if (type === 'album') {
                            const data = await api.getAlbum(id);
                            item = data.album as TrackData & Record<string, unknown>;
                        } else if (type === 'artist') {
                            item = await api.getArtist(id) as unknown as TrackData & Record<string, unknown>;
                        } else if (type === 'playlist') {
                            const data = await api.getPlaylist(id);
                            item = data.playlist as TrackData & Record<string, unknown>;
                        } else if (type === 'mix') {
                            const data = await api.getMix(id);
                            item = data.mix as TrackData & Record<string, unknown>;
                        } else if (type === 'track') {
                            const data = await api.getTrack(id);
                            item = data.track;
                        }
                    } catch (err) {
                        console.error(err);
                    }
                }
            }

            if (item) {
                await handleTrackAction(action, item as TrackData & Record<string, unknown>, player, api, lyricsManager, type, ui, scrobbler);
            }
            return;
        }

        const cardMenuBtn = target.closest('.card-menu-btn') as HTMLElement | null;
        if (cardMenuBtn) {
            e.stopPropagation();
            const card = cardMenuBtn.closest('.card') as HTMLElement | null;
            const type = cardMenuBtn.dataset.type;
            const id = cardMenuBtn.dataset.id;

            let item: (TrackData & Record<string, unknown>) | null = card ? trackDataStore.get(card) as TrackData & Record<string, unknown> : null;

            if (!item) {
                // Fallback: create a shell item
                item = { id: id as string, uuid: id, title: card?.querySelector('.card-title')?.textContent || 'Item', duration: 0 } as unknown as TrackData & Record<string, unknown>;
            }

            if (contextMenu._originalHTML) {
                contextMenu.innerHTML = contextMenu._originalHTML;
                contextMenu._originalHTML = null;
            }

            contextTrack = item;
            contextMenu._contextTrack = item;
            contextMenu._contextType = type || null;

            await updateContextMenuLikeState(contextMenu, item);
            const rect = cardMenuBtn.getBoundingClientRect();
            positionMenu(contextMenu, rect.left, rect.bottom + 5, rect as never);
            return;
        }

        const menuBtn = target.closest('.track-menu-btn') as HTMLElement | null;
        if (menuBtn) {
            e.stopPropagation();
            const trackItem = menuBtn.closest('.track-item') as HTMLElement | null;
            if (trackItem && !trackItem.dataset.queueIndex) {
                const clickedTrack = trackDataStore.get(trackItem) as (TrackData & Record<string, unknown>) | undefined;

                if (clickedTrack && clickedTrack.isLocal) return;

                if (
                    contextMenu.style.display === 'block' &&
                    contextTrack &&
                    clickedTrack &&
                    contextTrack.id === clickedTrack.id
                ) {
                    if (contextMenu._originalHTML) {
                        contextMenu.innerHTML = contextMenu._originalHTML;
                    }
                    contextMenu.style.display = 'none';
                    contextMenu._contextType = null;
                    contextMenu._originalHTML = null;
                    return;
                }

                contextTrack = clickedTrack || null;
                if (contextTrack) {
                    if (contextMenu._originalHTML) {
                        contextMenu.innerHTML = contextMenu._originalHTML;
                        contextMenu._originalHTML = null;
                    }
                    contextMenu._contextTrack = contextTrack;
                    contextMenu._contextType = 'track';
                    await updateContextMenuLikeState(contextMenu, contextTrack);
                    const rect = menuBtn.getBoundingClientRect();
                    positionMenu(contextMenu, rect.left, rect.bottom + 5, rect as never);
                }
            }
            return;
        }

        const trackItem = target.closest('.track-item') as HTMLElement | null;
        if (trackItem && (trackItem.classList.contains('unavailable') || trackItem.classList.contains('blocked'))) {
            return;
        }
        if (
            trackItem &&
            !trackItem.dataset.queueIndex &&
            !target.closest('.remove-from-playlist-btn') &&
            !target.closest('.artist-link')
        ) {
            const clickedTrackId = trackItem.dataset.trackId;
            const isSearch = window.location.pathname.startsWith('/search/');

            if (isSearch) {
                const clickedTrack = trackDataStore.get(trackItem) as TrackData | undefined;
                if (clickedTrack) {
                    player.setQueue([clickedTrack], 0);
                    document.getElementById('shuffle-btn')?.classList.remove('active');
                    player.playTrackFromQueue();

                    api.getTrackRecommendations(clickedTrack.id).then((recs: TrackData[]) => {
                        if (recs && recs.length > 0) {
                            player.addToQueue(recs);
                        }
                    });
                }
            } else {
                const parentList = trackItem.closest('.track-list');
                const allTrackElements = parentList ? Array.from(parentList.querySelectorAll('.track-item')) : [];
                const trackList = allTrackElements.map((el) => trackDataStore.get(el as HTMLElement) as TrackData | undefined).filter(Boolean) as TrackData[];

                if (trackList.length > 0) {
                    const startIndex = trackList.findIndex((t) => t.id == clickedTrackId);

                    player.setQueue(trackList, startIndex);
                    document.getElementById('shuffle-btn')?.classList.remove('active');
                    player.playTrackFromQueue();
                }
            }
        }

        // Handle artist link clicks in track lists
        const artistLink = target.closest('.artist-link') as HTMLElement | null;
        if (artistLink) {
            e.stopPropagation();
            const artistId = artistLink.dataset.artistId;
            const trackerSheetId = artistLink.dataset.trackerSheetId;
            if (trackerSheetId) {
                navigate(`/unreleased/${trackerSheetId}`);
            } else if (artistId) {
                navigate(`/artist/${artistId}`);
            }
            return;
        }

        const card = target.closest('.card') as HTMLElement | null;
        if (card) {
            // Don't navigate if card is blocked (unless clicking menu button)
            if (card.classList.contains('blocked') && !target.closest('.card-menu-btn')) {
                return;
            }

            if (target.closest('.edit-playlist-btn') || target.closest('.delete-playlist-btn')) {
                return;
            }

            const href = card.dataset.href;
            if (href) {
                // Allow native links inside card to work if any exist
                if (target.closest('a')) return;

                e.preventDefault();
                navigate(href);
            }
        }
    });

    mainContent.addEventListener('contextmenu', async (e: MouseEvent) => {
        const ctxTarget = e.target as HTMLElement;
        const trackItem = ctxTarget.closest('.track-item, .queue-track-item') as HTMLElement | null;
        const card = ctxTarget.closest('.card') as HTMLElement | null;

        if (trackItem) {
            e.preventDefault();
            if (trackItem.classList.contains('queue-track-item')) {
                // For queue items, get track from player's queue
                const queueIndex = parseInt(trackItem.dataset.queueIndex || '0');
                contextTrack = player.getCurrentQueue()[queueIndex] as TrackData & Record<string, unknown>;
            } else {
                // For regular track items
                contextTrack = (trackDataStore.get(trackItem) as TrackData & Record<string, unknown>) || null;
            }

            if (contextTrack) {
                if (contextTrack.isLocal) return;

                if (contextMenu._originalHTML) {
                    contextMenu.innerHTML = contextMenu._originalHTML;
                    contextMenu._originalHTML = null;
                }

                // Hide actions for unavailable tracks
                const unavailableActions = ['play-next', 'add-to-queue', 'download', 'track-mix'];
                contextMenu.querySelectorAll<HTMLElement>('[data-action]').forEach((btn: HTMLElement) => {
                    if (unavailableActions.includes(btn.dataset.action || '')) {
                        btn.style.display = contextTrack?.isUnavailable ? 'none' : 'block';
                    }
                });

                contextMenu._contextTrack = contextTrack;
                contextMenu._contextType = 'track';
                await updateContextMenuLikeState(contextMenu, contextTrack);
                positionMenu(contextMenu, e.clientX, e.clientY);
            }
        } else if (card) {
            e.preventDefault();
            const type = card.dataset.albumId
                ? 'album'
                : card.dataset.playlistId
                  ? 'playlist'
                  : card.dataset.mixId
                    ? 'mix'
                    : card.dataset.href
                      ? card.dataset.href.split('/')[1]
                      : 'item';
            const id = card.dataset.albumId || card.dataset.playlistId || card.dataset.mixId;

            const item: TrackData & Record<string, unknown> = (trackDataStore.get(card) as TrackData & Record<string, unknown>) || ({
                id: id || '',
                uuid: id,
                title: card.querySelector('.card-title')?.textContent || '',
                duration: 0,
            } as unknown as TrackData & Record<string, unknown>);

            if (contextMenu._originalHTML) {
                contextMenu.innerHTML = contextMenu._originalHTML;
                contextMenu._originalHTML = null;
            }

            contextTrack = item;
            contextMenu._contextTrack = item;
            contextMenu._contextType = type.replace('userplaylist', 'user-playlist');
            contextMenu._contextHref = card.dataset.href || null;

            await updateContextMenuLikeState(contextMenu, item);
            positionMenu(contextMenu, e.clientX, e.clientY);
        }
    });

    document.addEventListener('click', () => {
        if (contextMenu.style.display === 'block') {
            if (contextMenu._originalHTML) {
                contextMenu.innerHTML = contextMenu._originalHTML;
            }
            contextMenu.style.display = 'none';
            contextMenu._contextType = null;
            contextMenu._originalHTML = null;
        }
    });

    contextMenu.addEventListener('click', async (e: Event) => {
        e.stopPropagation();
        const cmTarget = (e.target as HTMLElement).closest('[data-action]') as HTMLElement | null;
        if (!cmTarget) return;

        const action = cmTarget.dataset.action;
        const track = contextMenu._contextTrack || contextTrack;
        const type = contextMenu._contextType || 'track';

        if (action === 'go-to-artists' || (action === 'go-to-artist' && cmTarget.dataset.hasMultipleArtists === 'true')) {
            const artists = Array.isArray(track?.artists) ? track.artists : track?.artist ? [track.artist] : [];
            if (artists.length > 1) {
                // Save original HTML if not already saved
                if (!contextMenu._originalHTML) {
                    contextMenu._originalHTML = contextMenu.innerHTML;
                }

                // Render sub-menu
                let subMenuHTML =
                    '<li data-action="back-to-main-menu" style="font-weight: bold; border-bottom: 1px solid var(--border); margin-bottom: 0.5rem; padding: 0.75rem 1rem; cursor: pointer;">← Back</li>';
                artists.forEach((artist: TrackArtist) => {
                    subMenuHTML += `<li data-action="go-to-artist" data-artist-id="${artist.id}" style="padding: 0.75rem 1rem; cursor: pointer;">${escapeHtml(artist.name || 'Unknown Artist')}</li>`;
                });
                contextMenu.innerHTML = `<ul>${subMenuHTML}</ul>`;
                return;
            }
        }

        if (action === 'back-to-main-menu') {
            if (contextMenu._originalHTML) {
                contextMenu.innerHTML = contextMenu._originalHTML;
                contextMenu._originalHTML = null;
                // Re-update like state since we replaced the HTML
                if (track) await updateContextMenuLikeState(contextMenu, track);
            }
            return;
        }

        if (action && track) {
            // Track context menu action
            trackContextMenuAction(action, type, track);
            await handleTrackAction(action, track, player, api, lyricsManager, type, ui, scrobbler, cmTarget.dataset as Record<string, string>);
        }

        // Reset menu state before closing
        if (contextMenu._originalHTML) {
            contextMenu.innerHTML = contextMenu._originalHTML;
            contextMenu._originalHTML = null;
        }
        contextMenu.style.display = 'none';
        contextMenu._contextType = null;
    });

    // Now playing bar interactions
    document.querySelector('.now-playing-bar .title')?.addEventListener('click', () => {
        const track = player.currentTrack;
        if (track?.album?.id) {
            navigate(`/album/${track.album.id}`);
        }
    });

    document.querySelector('.now-playing-bar .album')?.addEventListener('click', () => {
        const track = player.currentTrack;
        if (track?.album?.id) {
            navigate(`/album/${track.album.id}`);
        }
    });

    document.querySelector('.now-playing-bar .artist')?.addEventListener('click', (e: Event) => {
        const link = (e.target as HTMLElement | null)?.closest('.artist-link') as HTMLElement | null;
        if (link) {
            e.stopPropagation();
            const artistId = link.dataset.artistId;
            const trackerSheetId = link.dataset.trackerSheetId;
            if (trackerSheetId) {
                // Navigate to tracker artist page
                navigate(`/unreleased/${trackerSheetId}`);
            } else if (artistId) {
                navigate(`/artist/${artistId}`);
            }
            return;
        }

        // Fallback for non-link clicks (e.g. separators) or single artist legacy
        const track = player.currentTrack;
        if (track) {
            // Check if this is a tracker track
            const isTracker = track.isTracker || (track.id && String(track.id).startsWith('tracker-'));
            if (isTracker && track.trackerInfo?.sheetId) {
                navigate(`/unreleased/${track.trackerInfo.sheetId}`);
            } else if (track.artist?.id) {
                navigate(`/artist/${track.artist.id}`);
            }
        }
    });

    const nowPlayingLikeBtn = document.getElementById('now-playing-like-btn');
    if (nowPlayingLikeBtn) {
        nowPlayingLikeBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (player.currentTrack) {
                await handleTrackAction(
                    'toggle-like',
                    player.currentTrack,
                    player,
                    api,
                    lyricsManager,
                    'track',
                    ui,
                    scrobbler
                );
            }
        });
    }

    const nowPlayingMixBtn = document.getElementById('now-playing-mix-btn');
    if (nowPlayingMixBtn) {
        nowPlayingMixBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (player.currentTrack) {
                await handleTrackAction(
                    'track-mix',
                    player.currentTrack,
                    player,
                    api,
                    lyricsManager,
                    'track',
                    ui,
                    scrobbler
                );
            }
        });
    }

    const nowPlayingAddPlaylistBtn = document.getElementById('now-playing-add-playlist-btn');
    if (nowPlayingAddPlaylistBtn) {
        nowPlayingAddPlaylistBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (player.currentTrack) {
                await handleTrackAction(
                    'add-to-playlist',
                    player.currentTrack,
                    player,
                    api,
                    lyricsManager,
                    'track',
                    ui,
                    scrobbler
                );
            }
        });
    }

    // Mobile add playlist button functionality
    const mobileAddPlaylistBtn = document.getElementById('mobile-add-playlist-btn');

    if (mobileAddPlaylistBtn) {
        mobileAddPlaylistBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (player.currentTrack) {
                await handleTrackAction(
                    'add-to-playlist',
                    player.currentTrack,
                    player,
                    api,
                    lyricsManager,
                    'track',
                    ui,
                    scrobbler
                );
            }
        });
    }
}

function showSleepTimerModal(player: PlayerInstance): void {
    const modal = document.getElementById('sleep-timer-modal');
    if (!modal) return;

    const closeModal = (): void => {
        modal.classList.remove('active');
        cleanup();
    };

    const handleOptionClick = (e: Event): void => {
        const timerOption = (e.target as HTMLElement).closest('.timer-option') as HTMLElement | null;
        if (timerOption) {
            let minutes: number;
            if (timerOption.id === 'custom-timer-btn') {
                const customInput = document.getElementById('custom-minutes') as HTMLInputElement | null;
                minutes = parseInt(customInput?.value || '');
                if (!minutes || minutes < 1) {
                    showNotification('Please enter a valid number of minutes');
                    return;
                }
            } else {
                minutes = parseInt(timerOption.dataset.minutes || '');
            }

            if (minutes) {
                player.setSleepTimer(minutes);
                trackSetSleepTimer(minutes);
                showNotification(`Sleep timer set for ${minutes} minute${minutes === 1 ? '' : 's'}`);
                closeModal();
            }
        }
    };

    const handleCancel = (e: Event): void => {
        const cancelTarget = e.target as HTMLElement;
        if (cancelTarget.id === 'cancel-sleep-timer' || cancelTarget.classList.contains('modal-overlay')) {
            closeModal();
        }
    };

    const cleanup = (): void => {
        modal.removeEventListener('click', handleOptionClick);
        modal.removeEventListener('click', handleCancel);
    };

    modal.addEventListener('click', handleOptionClick);
    modal.addEventListener('click', handleCancel);

    modal.classList.add('active');
}
