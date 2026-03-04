//js/player.js
import { MediaPlayer } from 'dashjs';
import type { MediaPlayerClass } from 'dashjs';
import {
    REPEAT_MODE,
    formatTime,
    getTrackArtists,
    getTrackTitle,
    getTrackArtistsHTML,
    getTrackYearDisplay,
    createQualityBadgeHTML,
    escapeHtml,
} from './utils.ts';
import {
    queueManager,
    replayGainSettings,
    trackDateSettings,
    exponentialVolumeSettings,
    audioEffectsSettings,
} from './storage.ts';
import { audioContextManager } from './audio-context.ts';
import type { MusicAPI } from './music-api.ts';

interface ReplayGainValues {
    trackReplayGain: number | undefined;
    trackPeakAmplitude: number | undefined;
    albumReplayGain: number | undefined;
    albumPeakAmplitude: number | undefined;
}

interface SavedQueueState {
    queue: TrackData[];
    shuffledQueue: TrackData[];
    originalQueueBeforeShuffle: TrackData[];
    currentQueueIndex: number;
    shuffleActive: boolean;
    repeatMode: number;
}

export class Player {
    audio: HTMLAudioElement;
    api: MusicAPI;
    quality: string;
    queue: TrackData[];
    shuffledQueue: TrackData[];
    originalQueueBeforeShuffle: TrackData[];
    currentQueueIndex: number;
    shuffleActive: boolean;
    repeatMode: number;
    preloadCache: Map<string | number, string>;
    preloadAbortController: AbortController | null;
    currentTrack: TrackData | null;
    currentRgValues: ReplayGainValues | null;
    userVolume: number;
    isFallbackRetry: boolean;
    autoplayBlocked: boolean;
    isIOS: boolean;
    isPwa: boolean;
    sleepTimer: ReturnType<typeof setTimeout> | null;
    sleepTimerEndTime: number | null;
    sleepTimerInterval: ReturnType<typeof setInterval> | null;
    dashPlayer: MediaPlayerClass;
    dashInitialized: boolean;

    constructor(audioElement: HTMLAudioElement, api: MusicAPI, quality: string = 'HI_RES_LOSSLESS') {
        this.audio = audioElement;
        this.api = api;
        this.quality = quality;
        this.queue = [];
        this.shuffledQueue = [];
        this.originalQueueBeforeShuffle = [];
        this.currentQueueIndex = -1;
        this.shuffleActive = false;
        this.repeatMode = REPEAT_MODE.OFF;
        this.preloadCache = new Map();
        this.preloadAbortController = null;
        this.currentTrack = null;
        this.currentRgValues = null;
        this.userVolume = parseFloat(localStorage.getItem('volume') || '0.7');
        this.isFallbackRetry = false;
        this.autoplayBlocked = false;
        this.isIOS = typeof window !== 'undefined' && window.__IS_IOS__ === true;
        this.isPwa =
            typeof window !== 'undefined' &&
            (window.matchMedia?.('(display-mode: standalone)')?.matches ||
                (window.navigator as Navigator & { standalone?: boolean })?.standalone === true);

        // Sleep timer properties
        this.sleepTimer = null;
        this.sleepTimerEndTime = null;
        this.sleepTimerInterval = null;

        // Apply audio effects when track is ready
        this.audio.addEventListener('canplay', () => {
            this.applyAudioEffects();
        });

        // Initialize dash.js player
        this.dashPlayer = MediaPlayer().create();
        this.dashPlayer.updateSettings({
            streaming: {
                buffer: {
                    fastSwitchEnabled: true,
                },
            },
        });
        this.dashInitialized = false;

        this.loadQueueState();
        this.setupMediaSession();

        window.addEventListener('beforeunload', () => {
            this.saveQueueState();
        });

        // Handle visibility change for iOS - AudioContext gets suspended when screen locks
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && !this.audio.paused) {
                // Ensure audio context is resumed when user returns to the app
                if (!audioContextManager.isReady()) {
                    audioContextManager.init(this.audio);
                }
                audioContextManager.resume();
            }
            if (document.visibilityState === 'visible' && this.autoplayBlocked) {
                this.autoplayBlocked = false;
                this.audio.play().catch(() => {});
            }
        });
    }

    private getVideoCoverUrl(videoCoverId: string): string | null {
        return (this.api as MusicAPI & { tidalAPI: { getVideoCoverUrl(id: string): string | null } }).tidalAPI.getVideoCoverUrl(videoCoverId);
    }

    setVolume(value: number): void {
        this.userVolume = Math.max(0, Math.min(1, value));
        localStorage.setItem('volume', String(this.userVolume));
        this.applyReplayGain();
    }

    applyReplayGain(): void {
        const mode = replayGainSettings.getMode(); // 'off', 'track', 'album'
        let gainDb = 0;
        let peak = 1.0;

        if (mode !== 'off' && this.currentRgValues) {
            const { trackReplayGain, trackPeakAmplitude, albumReplayGain, albumPeakAmplitude } = this.currentRgValues;

            if (mode === 'album' && albumReplayGain !== undefined) {
                gainDb = albumReplayGain;
                peak = albumPeakAmplitude || 1.0;
            } else if (trackReplayGain !== undefined) {
                gainDb = trackReplayGain;
                peak = trackPeakAmplitude || 1.0;
            }

            // Apply Pre-Amp
            gainDb += replayGainSettings.getPreamp();
        }

        // Convert dB to linear scale: 10^(dB/20)
        let scale = Math.pow(10, gainDb / 20);

        // Peak protection (prevent clipping)
        if (scale * peak > 1.0) {
            scale = 1.0 / peak;
        }

        // Apply exponential volume curve if enabled
        const curvedVolume = exponentialVolumeSettings.applyCurve(this.userVolume);

        // Calculate effective volume
        const effectiveVolume = curvedVolume * scale;

        // Apply to audio element and/or Web Audio graph
        if (audioContextManager.isReady()) {
            // If Web Audio is active, we apply volume there for better compatibility
            // Especially on Linux where audio.volume might not affect the Web Audio graph
            // We set audio.volume to 1.0 to avoid double-reduction, or keep it synced?
            // Some browsers require audio.volume to be set for system media controls to show volume
            this.audio.volume = 1.0;
            audioContextManager.setVolume(effectiveVolume);
        } else {
            this.audio.volume = Math.max(0, Math.min(1, effectiveVolume));
        }
    }

    applyAudioEffects(): void {
        const speed = audioEffectsSettings.getSpeed();

        if (this.dashInitialized && this.dashPlayer) {
            if (this.dashPlayer.getPlaybackRate() !== speed) {
                this.dashPlayer.setPlaybackRate(speed);
            }
        } else {
            if (this.audio.playbackRate !== speed) {
                this.audio.playbackRate = speed;
            }
        }

        const preservePitch = audioEffectsSettings.isPreservePitchEnabled();
        if (this.audio.preservesPitch !== preservePitch) {
            this.audio.preservesPitch = preservePitch;
            // Firefox support
            if (this.audio.mozPreservesPitch !== undefined) {
                this.audio.mozPreservesPitch = preservePitch;
            }
        }
    }

    setPlaybackSpeed(speed: number): void {
        const validSpeed = Math.max(0.01, Math.min(100, parseFloat(String(speed)) || 1.0));
        audioEffectsSettings.setSpeed(validSpeed);
        this.applyAudioEffects();
    }

    setPreservePitch(enabled: boolean): void {
        audioEffectsSettings.setPreservePitch(enabled);
        this.applyAudioEffects();
    }

    loadQueueState(): void {
        const savedState = queueManager.getQueue() as SavedQueueState | null;
        if (savedState) {
            this.queue = savedState.queue || [];
            this.shuffledQueue = savedState.shuffledQueue || [];
            this.originalQueueBeforeShuffle = savedState.originalQueueBeforeShuffle || [];
            this.currentQueueIndex = savedState.currentQueueIndex ?? -1;
            this.shuffleActive = savedState.shuffleActive || false;
            this.repeatMode = savedState.repeatMode !== undefined ? savedState.repeatMode : REPEAT_MODE.OFF;

            // Restore current track if queue exists and index is valid
            const currentQueue = this.shuffleActive ? this.shuffledQueue : this.queue;
            if (this.currentQueueIndex >= 0 && this.currentQueueIndex < currentQueue.length) {
                this.currentTrack = currentQueue[this.currentQueueIndex];

                // Restore UI
                const track = this.currentTrack;
                const trackTitle = getTrackTitle(track);
                const trackArtistsHTML = getTrackArtistsHTML(track);
                const yearDisplay = getTrackYearDisplay(track);

                const coverEl = document.querySelector('.now-playing-bar .cover') as HTMLElement | null;
                const titleEl = document.querySelector('.now-playing-bar .title') as HTMLElement | null;
                const albumEl = document.querySelector('.now-playing-bar .album') as HTMLElement | null;
                const artistEl = document.querySelector('.now-playing-bar .artist') as HTMLElement | null;

                if (coverEl) {
                    const videoCoverUrl = track.album?.videoCover
                        ? this.getVideoCoverUrl(track.album.videoCover as string)
                        : null;
                    const coverUrl = videoCoverUrl || this.api.getCoverUrl(track.album?.cover || '');

                    if (videoCoverUrl) {
                        if (coverEl.tagName === 'IMG') {
                            const video = document.createElement('video');
                            video.src = videoCoverUrl;
                            video.autoplay = true;
                            video.loop = true;
                            video.muted = true;
                            video.playsInline = true;
                            video.className = coverEl.className;
                            video.id = coverEl.id;
                            coverEl.replaceWith(video);
                        }
                    } else {
                        if (coverEl.tagName === 'VIDEO') {
                            const img = document.createElement('img');
                            img.src = coverUrl;
                            img.className = coverEl.className;
                            img.id = coverEl.id;
                            coverEl.replaceWith(img);
                        } else {
                            (coverEl as HTMLImageElement).src = coverUrl;
                        }
                    }
                }
                if (titleEl) {
                    const qualityBadge = createQualityBadgeHTML(track);
                    titleEl.innerHTML = `${escapeHtml(trackTitle)} ${qualityBadge}`;
                }
                if (albumEl) {
                    const albumTitle = track.album?.title || '';
                    if (albumTitle && albumTitle !== trackTitle) {
                        albumEl.textContent = albumTitle;
                        (albumEl as HTMLElement).style.display = 'block';
                    } else {
                        albumEl.textContent = '';
                        (albumEl as HTMLElement).style.display = 'none';
                    }
                }
                if (artistEl) artistEl.innerHTML = trackArtistsHTML + yearDisplay;

                // Fetch album release date in background if missing
                if (!yearDisplay && track.album?.id) {
                    this.loadAlbumYear(track, trackArtistsHTML, artistEl);
                }

                const mixBtn = document.getElementById('now-playing-mix-btn') as HTMLElement | null;
                if (mixBtn) {
                    mixBtn.style.display = track.mixes && track.mixes.TRACK_MIX ? 'flex' : 'none';
                }
                const totalDurationEl = document.getElementById('total-duration');
                if (totalDurationEl) totalDurationEl.textContent = formatTime(track.duration);
                document.title = `${trackTitle} • ${getTrackArtists(track)}`;

                this.updatePlayingTrackIndicator();
                this.updateMediaSession(track);
            }
        }
    }

    saveQueueState(): void {
        queueManager.saveQueue({
            queue: this.queue,
            shuffledQueue: this.shuffledQueue,
            originalQueueBeforeShuffle: this.originalQueueBeforeShuffle,
            currentQueueIndex: this.currentQueueIndex,
            shuffleActive: this.shuffleActive,
            repeatMode: this.repeatMode,
        });

        if (window.renderQueueFunction) {
            (window.renderQueueFunction as () => void)();
        }
    }

    setupMediaSession(): void {
        if (!('mediaSession' in navigator)) return;

        const setHandlers = () => {
            navigator.mediaSession.setActionHandler('play', async () => {
                // Initialize and resume audio context first (required for iOS lock screen)
                // Must happen before audio.play() or audio won't route through Web Audio
                if (!audioContextManager.isReady()) {
                    audioContextManager.init(this.audio);
                    this.applyReplayGain();
                }
                await audioContextManager.resume();

                try {
                    await this.audio.play();
                } catch (e) {
                    console.error('MediaSession play failed:', e);
                    // If play fails, try to handle it like a regular play/pause
                    this.handlePlayPause();
                }
            });

            navigator.mediaSession.setActionHandler('pause', () => {
                this.audio.pause();
            });

            navigator.mediaSession.setActionHandler('previoustrack', async () => {
                // Ensure audio context is active for iOS lock screen controls
                if (!audioContextManager.isReady()) {
                    audioContextManager.init(this.audio);
                    this.applyReplayGain();
                }
                await audioContextManager.resume();
                this.playPrev();
            });

            navigator.mediaSession.setActionHandler('nexttrack', async () => {
                // Ensure audio context is active for iOS lock screen controls
                if (!audioContextManager.isReady()) {
                    audioContextManager.init(this.audio);
                    this.applyReplayGain();
                }
                await audioContextManager.resume();
                this.playNext();
            });

            if (!this.isIOS) {
                navigator.mediaSession.setActionHandler('seekbackward', (details) => {
                    const skipTime = details.seekOffset || 10;
                    this.seekBackward(skipTime);
                });
                navigator.mediaSession.setActionHandler('seekforward', (details) => {
                    const skipTime = details.seekOffset || 10;
                    this.seekForward(skipTime);
                });
            }

            navigator.mediaSession.setActionHandler('seekto', (details) => {
                if (details.seekTime !== undefined) {
                    this.audio.currentTime = Math.max(0, details.seekTime);
                    this.updateMediaSessionPositionState();
                }
            });

            navigator.mediaSession.setActionHandler('stop', () => {
                this.audio.pause();
                this.audio.currentTime = 0;
                this.updateMediaSessionPlaybackState();
            });
        };

        if (this.isIOS) {
            // iOS: set handlers only when playback starts. Setting them in the constructor makes
            // the lock screen show +10/-10. Registering on first 'playing' gives next/previous track
            this.audio.addEventListener('playing', () => setHandlers(), { once: true });
        } else {
            setHandlers();
        }
    }

    setQuality(quality: string): void {
        this.quality = quality;
    }

    async preloadNextTracks(): Promise<void> {
        if (this.preloadAbortController) {
            this.preloadAbortController.abort();
        }

        this.preloadAbortController = new AbortController();
        const currentQueue = this.shuffleActive ? this.shuffledQueue : this.queue;
        const tracksToPreload: { track: TrackData; index: number }[] = [];

        for (let i = 1; i <= 2; i++) {
            const nextIndex = this.currentQueueIndex + i;
            if (nextIndex < currentQueue.length) {
                tracksToPreload.push({ track: currentQueue[nextIndex], index: nextIndex });
            }
        }

        for (const { track } of tracksToPreload) {
            if (this.preloadCache.has(track.id)) continue;
            const isTracker = track.isTracker || (track.id && String(track.id).startsWith('tracker-'));
            if (track.isLocal || isTracker || (track.audioUrl && !track.isLocal)) continue;
            try {
                const streamUrl = await this.api.getStreamUrl(track.id, this.quality);

                if (this.preloadAbortController.signal.aborted) break;

                this.preloadCache.set(track.id, streamUrl);
                // Warm connection/cache
                // For Blob URLs (DASH), this head request is not needed and can cause errors.
                if (!streamUrl.startsWith('blob:')) {
                    fetch(streamUrl, { method: 'HEAD', signal: this.preloadAbortController.signal }).catch(() => {});
                }
            } catch (error: unknown) {
                if (error instanceof Error && error.name !== 'AbortError') {
                    // console.debug('Failed to get stream URL for preload:', trackTitle);
                }
            }
        }
    }

    async playTrackFromQueue(startTime: number = 0, recursiveCount: number = 0): Promise<void> {
        const currentQueue = this.shuffleActive ? this.shuffledQueue : this.queue;
        if (this.currentQueueIndex < 0 || this.currentQueueIndex >= currentQueue.length) {
            return;
        }

        const track = currentQueue[this.currentQueueIndex];
        if (track.isUnavailable) {
            console.warn(`Attempted to play unavailable track: ${track.title}. Skipping...`);
            this.playNext();
            return;
        }

        // Check if track is blocked
        const { contentBlockingSettings } = await import('./storage.ts');
        if (contentBlockingSettings.shouldHideTrack(track)) {
            console.warn(`Attempted to play blocked track: ${track.title}. Skipping...`);
            this.playNext();
            return;
        }

        this.saveQueueState();

        this.currentTrack = track;

        const trackTitle = getTrackTitle(track);
        const trackArtistsHTML = getTrackArtistsHTML(track);
        const yearDisplay = getTrackYearDisplay(track);

        const coverEl = document.querySelector('.now-playing-bar .cover') as HTMLElement | null;
        if (coverEl) {
            const videoCoverUrl = track.album?.videoCover
                ? this.getVideoCoverUrl(track.album.videoCover as string)
                : null;
            const coverUrl = videoCoverUrl || this.api.getCoverUrl(track.album?.cover || '');

            if (videoCoverUrl) {
                if (coverEl.tagName === 'IMG') {
                    const video = document.createElement('video');
                    video.src = videoCoverUrl;
                    video.autoplay = true;
                    video.loop = true;
                    video.muted = true;
                    video.playsInline = true;
                    video.className = coverEl.className;
                    video.id = coverEl.id;
                    coverEl.replaceWith(video);
                }
            } else {
                if (coverEl.tagName === 'VIDEO') {
                    const img = document.createElement('img');
                    img.src = coverUrl;
                    img.className = coverEl.className;
                    img.id = coverEl.id;
                    coverEl.replaceWith(img);
                } else {
                    (coverEl as HTMLImageElement).src = coverUrl;
                }
            }
        }
        document.querySelector('.now-playing-bar .title')!.innerHTML =
            `${escapeHtml(trackTitle)} ${createQualityBadgeHTML(track)}`;
        const albumEl = document.querySelector('.now-playing-bar .album') as HTMLElement | null;
        if (albumEl) {
            const albumTitle = track.album?.title || '';
            if (albumTitle && albumTitle !== trackTitle) {
                albumEl.textContent = albumTitle;
                albumEl.style.display = 'block';
            } else {
                albumEl.textContent = '';
                albumEl.style.display = 'none';
            }
        }
        const artistEl = document.querySelector('.now-playing-bar .artist') as HTMLElement | null;
        if (artistEl) artistEl.innerHTML = trackArtistsHTML + yearDisplay;

        // Fetch album release date in background if missing
        if (!yearDisplay && track.album?.id) {
            this.loadAlbumYear(track, trackArtistsHTML, artistEl);
        }

        const mixBtn = document.getElementById('now-playing-mix-btn');
        if (mixBtn) {
            mixBtn.style.display = track.mixes && track.mixes.TRACK_MIX ? 'flex' : 'none';
        }
        document.title = `${trackTitle} • ${getTrackArtists(track)}`;

        this.updatePlayingTrackIndicator();
        this.updateMediaSession(track);
        this.updateMediaSessionPlaybackState();
        this.updateNativeWindow(track);

        try {
            let streamUrl: string | undefined;

            const isTracker = track.isTracker || (track.id && String(track.id).startsWith('tracker-'));

            if (isTracker || (track.audioUrl && !track.isLocal)) {
                if (this.dashInitialized) {
                    this.dashPlayer.reset();
                    this.dashInitialized = false;
                }
                streamUrl = track.audioUrl;

                if (
                    (!streamUrl || (typeof streamUrl === 'string' && streamUrl.startsWith('blob:'))) &&
                    track.remoteUrl
                ) {
                    streamUrl = track.remoteUrl;
                }

                if (!streamUrl) {
                    console.warn(`Track ${trackTitle} audio URL is missing. Skipping.`);
                    track.isUnavailable = true;
                    this.playNext();
                    return;
                }

                if (isTracker && !streamUrl.startsWith('blob:') && streamUrl.startsWith('http')) {
                    try {
                        const response = await fetch(streamUrl);
                        if (response.ok) {
                            const blob = await response.blob();
                            streamUrl = URL.createObjectURL(blob);
                        }
                    } catch (e) {
                        console.warn('Failed to fetch tracker blob, trying direct link', e);
                    }
                }

                this.currentRgValues = null;
                this.applyReplayGain();

                this.audio.src = streamUrl;
                this.applyAudioEffects();

                // Wait for audio to be ready before playing (prevents restart issues with blob URLs)
                const canPlay = await this.waitForCanPlayOrTimeout();
                if (!canPlay) return;

                if (startTime > 0) {
                    this.audio.currentTime = startTime;
                }
                const played = await this.safePlay();
                if (!played) return;
            } else if (track.isLocal && track.file) {
                if (this.dashInitialized) {
                    this.dashPlayer.reset(); // Ensure dash is off
                    this.dashInitialized = false;
                }
                streamUrl = URL.createObjectURL(track.file as Blob);
                this.currentRgValues = null; // No replaygain for local files yet
                this.applyReplayGain();

                this.audio.src = streamUrl;
                this.applyAudioEffects();

                // Wait for audio to be ready before playing
                const canPlay = await this.waitForCanPlayOrTimeout();
                if (!canPlay) return;

                if (startTime > 0) {
                    this.audio.currentTime = startTime;
                }
                const played = await this.safePlay();
                if (!played) return;
            } else {
                const isQobuz = String(track.id).startsWith('q:');

                if (isQobuz) {
                    // Qobuz: skip getTrack call, directly fetch stream URL
                    this.currentRgValues = null;
                    this.applyReplayGain();

                    if (this.preloadCache.has(track.id)) {
                        streamUrl = this.preloadCache.get(track.id);
                    } else {
                        streamUrl = await this.api.getStreamUrl(track.id, this.quality);
                    }
                } else {
                    // Tidal: Get track data for ReplayGain (should be cached by API)
                    const trackData = await this.api.getTrack(track.id, this.quality) as { info?: { trackReplayGain?: number; trackPeakAmplitude?: number; albumReplayGain?: number; albumPeakAmplitude?: number; manifest?: string }; originalTrackUrl?: string } | null;

                    if (trackData && trackData.info) {
                        this.currentRgValues = {
                            trackReplayGain: trackData.info.trackReplayGain,
                            trackPeakAmplitude: trackData.info.trackPeakAmplitude,
                            albumReplayGain: trackData.info.albumReplayGain,
                            albumPeakAmplitude: trackData.info.albumPeakAmplitude,
                        };
                    } else {
                        this.currentRgValues = null;
                    }
                    this.applyReplayGain();

                    if (this.preloadCache.has(track.id)) {
                        streamUrl = this.preloadCache.get(track.id) as string | undefined;
                    } else if (trackData?.originalTrackUrl) {
                        streamUrl = trackData.originalTrackUrl;
                    } else if (trackData?.info?.manifest) {
                        streamUrl = this.api.extractStreamUrlFromManifest(trackData.info.manifest) ?? undefined;
                    } else {
                        streamUrl = await this.api.getStreamUrl(track.id, this.quality);
                    }
                }

                // Handle playback
                if (streamUrl && streamUrl.startsWith('blob:') && !track.isLocal) {
                    // It's likely a DASH manifest blob URL
                    if (this.dashInitialized) {
                        this.dashPlayer.attachSource(streamUrl);
                    } else {
                        this.dashPlayer.initialize(this.audio, streamUrl, true);
                        this.dashInitialized = true;
                    }
                    this.applyAudioEffects();

                    if (startTime > 0) {
                        this.dashPlayer.seek(startTime);
                    }
                } else {
                    if (this.dashInitialized) {
                        this.dashPlayer.reset();
                        this.dashInitialized = false;
                    }
                    this.audio.src = streamUrl!;
                    this.applyAudioEffects();

                    // Wait for audio to be ready before playing
                    const canPlay = await this.waitForCanPlayOrTimeout();
                    if (!canPlay) return;

                    if (startTime > 0) {
                        this.audio.currentTime = startTime;
                    }
                    const played = await this.safePlay();
                    if (!played) return;
                }
            }

            this.preloadNextTracks();
        } catch (error: unknown) {
            if (error instanceof Error && (error.name === 'NotAllowedError' || error.name === 'AbortError')) {
                this.autoplayBlocked = true;
                return;
            }
            console.error(`Could not play track: ${trackTitle}`, error);
            // Skip to next track on unexpected error
            if (recursiveCount < currentQueue.length) {
                setTimeout(() => this.playNext(recursiveCount + 1), 1000);
            }
        }
    }

    playAtIndex(index: number): void {
        const currentQueue = this.shuffleActive ? this.shuffledQueue : this.queue;
        if (index >= 0 && index < currentQueue.length) {
            this.currentQueueIndex = index;
            this.playTrackFromQueue(0, 0);
        }
    }

    playNext(recursiveCount: number = 0): void {
        const currentQueue = this.shuffleActive ? this.shuffledQueue : this.queue;
        const isLastTrack = this.currentQueueIndex >= currentQueue.length - 1;

        if (recursiveCount > currentQueue.length) {
            console.error('All tracks in queue are unavailable or blocked.');
            this.audio.pause();
            return;
        }

        // Import blocking settings dynamically
        import('./storage.ts').then(({ contentBlockingSettings }) => {
            if (
                this.repeatMode === REPEAT_MODE.ONE &&
                !currentQueue[this.currentQueueIndex]?.isUnavailable &&
                !contentBlockingSettings.shouldHideTrack(currentQueue[this.currentQueueIndex])
            ) {
                this.playTrackFromQueue(0, recursiveCount);
                return;
            }

            if (!isLastTrack) {
                this.currentQueueIndex++;
                const track = currentQueue[this.currentQueueIndex];
                // Skip unavailable and blocked tracks
                if (track?.isUnavailable || contentBlockingSettings.shouldHideTrack(track)) {
                    return this.playNext(recursiveCount + 1);
                }
            } else if (this.repeatMode === REPEAT_MODE.ALL) {
                this.currentQueueIndex = 0;
                const track = currentQueue[this.currentQueueIndex];
                // Skip unavailable and blocked tracks
                if (track?.isUnavailable || contentBlockingSettings.shouldHideTrack(track)) {
                    return this.playNext(recursiveCount + 1);
                }
            } else {
                return;
            }

            this.playTrackFromQueue(0, recursiveCount);
        });
    }

    playPrev(recursiveCount: number = 0): void {
        if (this.audio.currentTime > 3) {
            this.audio.currentTime = 0;
            this.updateMediaSessionPositionState();
        } else if (this.currentQueueIndex > 0) {
            this.currentQueueIndex--;
            // Skip unavailable and blocked tracks
            const currentQueue = this.shuffleActive ? this.shuffledQueue : this.queue;

            if (recursiveCount > currentQueue.length) {
                console.error('All tracks in queue are unavailable or blocked.');
                this.audio.pause();
                return;
            }

            import('./storage.ts').then(({ contentBlockingSettings }) => {
                const track = currentQueue[this.currentQueueIndex];
                if (track?.isUnavailable || contentBlockingSettings.shouldHideTrack(track)) {
                    return this.playPrev(recursiveCount + 1);
                }
                this.playTrackFromQueue(0, recursiveCount);
            });
        }
    }

    handlePlayPause(): void {
        if (!this.audio.src || this.audio.error) {
            if (this.currentTrack) {
                this.playTrackFromQueue(0, 0);
            }
            return;
        }

        if (this.audio.paused) {
            this.safePlay().catch((e: unknown) => {
                if (e instanceof Error && (e.name === 'NotAllowedError' || e.name === 'AbortError')) return;
                console.error('Play failed, reloading track:', e);
                if (this.currentTrack) {
                    this.playTrackFromQueue(0, 0);
                }
            });
        } else {
            this.audio.pause();
            this.saveQueueState();
        }
    }

    seekBackward(seconds: number = 10): void {
        const newTime = Math.max(0, this.audio.currentTime - seconds);
        this.audio.currentTime = newTime;
        this.updateMediaSessionPositionState();
    }

    seekForward(seconds: number = 10): void {
        const duration = this.audio.duration || 0;
        const newTime = Math.min(duration, this.audio.currentTime + seconds);
        this.audio.currentTime = newTime;
        this.updateMediaSessionPositionState();
    }

    toggleShuffle(): void {
        this.shuffleActive = !this.shuffleActive;

        if (this.shuffleActive) {
            this.originalQueueBeforeShuffle = [...this.queue];
            const currentTrack = this.queue[this.currentQueueIndex];

            const tracksToShuffle = [...this.queue];
            if (currentTrack && this.currentQueueIndex >= 0) {
                tracksToShuffle.splice(this.currentQueueIndex, 1);
            }

            for (let i = tracksToShuffle.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [tracksToShuffle[i], tracksToShuffle[j]] = [tracksToShuffle[j], tracksToShuffle[i]];
            }

            if (currentTrack) {
                this.shuffledQueue = [currentTrack, ...tracksToShuffle];
                this.currentQueueIndex = 0;
            } else {
                this.shuffledQueue = tracksToShuffle;
                this.currentQueueIndex = -1;
            }
        } else {
            const currentTrack = this.shuffledQueue[this.currentQueueIndex];
            this.queue = [...this.originalQueueBeforeShuffle];
            this.currentQueueIndex = this.queue.findIndex((t) => t.id === currentTrack?.id);
        }

        this.preloadCache.clear();
        this.preloadNextTracks();
        this.saveQueueState();
    }

    toggleRepeat(): number {
        this.repeatMode = (this.repeatMode + 1) % 3;
        this.saveQueueState();
        return this.repeatMode;
    }

    setQueue(tracks: TrackData[], startIndex: number = 0): void {
        this.queue = tracks;
        this.currentQueueIndex = startIndex;
        this.shuffleActive = false;
        this.preloadCache.clear();
        this.saveQueueState();
    }

    addToQueue(trackOrTracks: TrackData | TrackData[]): void {
        const tracks = Array.isArray(trackOrTracks) ? trackOrTracks : [trackOrTracks];
        this.queue.push(...tracks);

        if (this.shuffleActive) {
            this.shuffledQueue.push(...tracks);
            this.originalQueueBeforeShuffle.push(...tracks);
        }

        if (!this.currentTrack || this.currentQueueIndex === -1) {
            this.currentQueueIndex = this.getCurrentQueue().length - tracks.length;
            this.playTrackFromQueue(0, 0);
        }
        this.saveQueueState();
    }

    addNextToQueue(trackOrTracks: TrackData | TrackData[]): void {
        const tracks = Array.isArray(trackOrTracks) ? trackOrTracks : [trackOrTracks];
        const currentQueue = this.shuffleActive ? this.shuffledQueue : this.queue;
        const insertIndex = this.currentQueueIndex + 1;

        // Insert after current track
        currentQueue.splice(insertIndex, 0, ...tracks);

        // If we are shuffling, we might want to also add it to the original queue for consistency,
        // though syncing that is tricky. The standard logic often just appends to the active queue view.
        if (this.shuffleActive) {
            this.originalQueueBeforeShuffle.push(...tracks); // Sync original queue
        }

        this.saveQueueState();
        this.preloadNextTracks(); // Update preload since next track changed
    }

    removeFromQueue(index: number): void {
        const currentQueue = this.shuffleActive ? this.shuffledQueue : this.queue;

        // If removing current track
        if (index === this.currentQueueIndex) {
            // If playing, we might want to stop or just let it finish?
            // For now, let's just remove it.
            // If it's the last track, playback will stop naturally or we handle it?
        }

        if (index < this.currentQueueIndex) {
            this.currentQueueIndex--;
        }

        const removedTrack = currentQueue.splice(index, 1)[0];

        if (this.shuffleActive) {
            // Also remove from original queue
            const originalIndex = this.originalQueueBeforeShuffle.findIndex((t) => t.id === removedTrack.id); // Simple ID check
            if (originalIndex !== -1) {
                this.originalQueueBeforeShuffle.splice(originalIndex, 1);
            }
        }

        this.saveQueueState();
        this.preloadNextTracks();
    }

    clearQueue(): void {
        if (this.currentTrack) {
            this.queue = [this.currentTrack];

            if (this.shuffleActive) {
                this.shuffledQueue = [this.currentTrack];
                this.originalQueueBeforeShuffle = [this.currentTrack];
            } else {
                this.shuffledQueue = [];
                this.originalQueueBeforeShuffle = [];
            }
            this.currentQueueIndex = 0;
        } else {
            this.queue = [];
            this.shuffledQueue = [];
            this.originalQueueBeforeShuffle = [];
            this.currentQueueIndex = -1;
        }

        this.preloadCache.clear();
        this.saveQueueState();
    }

    moveInQueue(fromIndex: number, toIndex: number): void {
        const currentQueue = this.shuffleActive ? this.shuffledQueue : this.queue;

        if (fromIndex < 0 || fromIndex >= currentQueue.length) return;
        if (toIndex < 0 || toIndex >= currentQueue.length) return;

        const [track] = currentQueue.splice(fromIndex, 1);
        currentQueue.splice(toIndex, 0, track);

        if (this.currentQueueIndex === fromIndex) {
            this.currentQueueIndex = toIndex;
        } else if (fromIndex < this.currentQueueIndex && toIndex >= this.currentQueueIndex) {
            this.currentQueueIndex--;
        } else if (fromIndex > this.currentQueueIndex && toIndex <= this.currentQueueIndex) {
            this.currentQueueIndex++;
        }
        this.saveQueueState();
    }

    getCurrentQueue(): TrackData[] {
        return this.shuffleActive ? this.shuffledQueue : this.queue;
    }

    getNextTrack(): TrackData | null {
        const currentQueue = this.getCurrentQueue();
        if (this.currentQueueIndex === -1 || currentQueue.length === 0) return null;

        const nextIndex = this.currentQueueIndex + 1;
        if (nextIndex < currentQueue.length) {
            return currentQueue[nextIndex];
        } else if (this.repeatMode === REPEAT_MODE.ALL) {
            return currentQueue[0];
        }
        return null;
    }

    loadAlbumYear(track: TrackData, trackArtistsHTML: string, artistEl: HTMLElement | null): void {
        if (!trackDateSettings.useAlbumYear()) return;

        this.api
            .getAlbum(track.album!.id)
            .then((data: unknown) => {
                const { album } = data as { album?: TrackAlbum };
                if (album?.releaseDate && this.currentTrack?.id === track.id) {
                    track.album!.releaseDate = album.releaseDate;
                    const year = new Date(album.releaseDate).getFullYear();
                    if (!isNaN(year) && artistEl) {
                        artistEl.innerHTML = `${trackArtistsHTML} • ${year}`;
                    }
                }
            })
            .catch(() => {});
    }

    updatePlayingTrackIndicator(): void {
        const currentTrack = this.getCurrentQueue()[this.currentQueueIndex];
        document.querySelectorAll('.track-item').forEach((item) => {
            const el = item as HTMLElement;
            item.classList.toggle('playing', currentTrack != null && el.dataset.trackId === String(currentTrack.id));
        });

        document.querySelectorAll('.queue-track-item').forEach((item) => {
            const el = item as HTMLElement;
            const index = parseInt(el.dataset.queueIndex || '', 10);
            item.classList.toggle('playing', index === this.currentQueueIndex);
        });
    }

    updateMediaSession(track: TrackData): void {
        if (!('mediaSession' in navigator)) return;

        // Force a refresh for picky Bluetooth systems by clearing metadata first
        navigator.mediaSession.metadata = null;


        const coverId = track.album?.cover;
        const trackTitle = getTrackTitle(track);

        navigator.mediaSession.metadata = new MediaMetadata({
            title: trackTitle || 'Unknown Title',
            artist: getTrackArtists(track) || 'Unknown Artist',
            album: track.album?.title || 'Unknown Album',
            artwork: coverId
                ? [
                      {
                          src: this.api.getCoverUrl(coverId, '1280'),
                          sizes: '1280x1280',
                          type: 'image/jpeg',
                      },
                  ]
                : undefined,
        });

        this.updateMediaSessionPlaybackState();
        this.updateMediaSessionPositionState();
    }

    updateMediaSessionPlaybackState(): void {
        if (!('mediaSession' in navigator)) return;
        navigator.mediaSession.playbackState = this.audio.paused ? 'paused' : 'playing';
    }

    updateMediaSessionPositionState(): void {
        if (!('mediaSession' in navigator)) return;
        if (!('setPositionState' in navigator.mediaSession)) return;

        const duration = this.audio.duration;

        if (!duration || isNaN(duration) || !isFinite(duration)) {
            return;
        }

        try {
            navigator.mediaSession.setPositionState({
                duration: duration,
                playbackRate: this.audio.playbackRate || 1,
                position: Math.min(this.audio.currentTime, duration),
            });
        } catch (error) {
            console.log('Failed to update Media Session position:', error);
        }
    }

    async safePlay(): Promise<boolean> {
        try {
            await this.audio.play();
            this.autoplayBlocked = false;
            return true;
        } catch (error: unknown) {
            if (error instanceof Error && (error.name === 'NotAllowedError' || error.name === 'AbortError')) {
                this.autoplayBlocked = true;
                return false;
            }
            throw error;
        }
    }

    async waitForCanPlayOrTimeout(timeoutMs: number = 10000): Promise<boolean> {
        if (this.audio.readyState >= 2) {
            return true;
        }

        return await new Promise((resolve, reject) => {
            const onCanPlay = () => {
                this.audio.removeEventListener('canplay', onCanPlay);
                this.audio.removeEventListener('error', onError);
                resolve(true);
            };
            const onError = (e: Event) => {
                this.audio.removeEventListener('canplay', onCanPlay);
                this.audio.removeEventListener('error', onError);
                reject(e);
            };
            this.audio.addEventListener('canplay', onCanPlay);
            this.audio.addEventListener('error', onError);

            // Timeout after 10 seconds. Treat as autoplay blocked when backgrounded (esp. iOS PWA).
            setTimeout(() => {
                this.audio.removeEventListener('canplay', onCanPlay);
                this.audio.removeEventListener('error', onError);
                if (document.visibilityState === 'hidden' || (this.isIOS && this.isPwa)) {
                    this.autoplayBlocked = true;
                    resolve(false);
                    return;
                }
                reject(new Error('Timeout waiting for audio to load'));
            }, timeoutMs);
        });
    }

    // Sleep Timer Methods
    setSleepTimer(minutes: number): void {
        this.clearSleepTimer(); // Clear any existing timer

        this.sleepTimerEndTime = Date.now() + minutes * 60 * 1000;

        this.sleepTimer = setTimeout(
            () => {
                this.audio.pause();
                this.clearSleepTimer();
                this.updateSleepTimerUI();
            },
            minutes * 60 * 1000
        );

        // Update UI every second
        this.sleepTimerInterval = setInterval(() => {
            this.updateSleepTimerUI();
        }, 1000);

        this.updateSleepTimerUI();
    }

    clearSleepTimer(): void {
        if (this.sleepTimer) {
            clearTimeout(this.sleepTimer);
            this.sleepTimer = null;
        }
        if (this.sleepTimerInterval) {
            clearInterval(this.sleepTimerInterval);
            this.sleepTimerInterval = null;
        }
        this.sleepTimerEndTime = null;
        this.updateSleepTimerUI();
    }

    getSleepTimerRemaining(): number | null {
        if (!this.sleepTimerEndTime) return null;
        const remaining = Math.max(0, this.sleepTimerEndTime - Date.now());
        return Math.ceil(remaining / 1000); // Return seconds remaining
    }

    isSleepTimerActive(): boolean {
        return this.sleepTimer !== null;
    }

    updateSleepTimerUI(): void {
        const timerBtn = document.getElementById('sleep-timer-btn');
        const timerBtnDesktop = document.getElementById('sleep-timer-btn-desktop');

        const updateBtn = (btn: HTMLElement | null): void => {
            if (!btn) return;
            if (this.isSleepTimerActive()) {
                const remaining = this.getSleepTimerRemaining();
                if (remaining !== null && remaining > 0) {
                    const minutes = Math.floor(remaining / 60);
                    const seconds = remaining % 60;
                    btn.innerHTML = `<span style="font-size: 12px; font-weight: bold;">${minutes}:${seconds.toString().padStart(2, '0')}</span>`;
                    btn.title = `Sleep Timer: ${minutes}:${seconds.toString().padStart(2, '0')} remaining`;
                    btn.classList.add('active');
                    btn.style.color = 'var(--primary)';
                } else {
                    btn.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12,6 12,12 16,14"/>
                        </svg>
                    `;
                    btn.title = 'Sleep Timer';
                    btn.classList.remove('active');
                    btn.style.color = '';
                }
            } else {
                btn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12,6 12,12 16,14"/>
                    </svg>
                `;
                btn.title = 'Sleep Timer';
                btn.classList.remove('active');
                btn.style.color = '';
            }
        };

        updateBtn(timerBtn);
        updateBtn(timerBtnDesktop);
    }

    async updateNativeWindow(track: TrackData): Promise<void> {
        if (!window.Neutralino) return;

        const trackTitle = getTrackTitle(track);
        const artist = getTrackArtists(track);
        try {
            await Neutralino.window.setTitle(`${trackTitle} • ${artist}`);
        } catch (e) {
            console.error('Failed to set window title:', e);
        }
    }
}
