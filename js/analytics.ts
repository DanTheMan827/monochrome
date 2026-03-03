// js/analytics.ts - Plausible Analytics custom event tracking

import { analyticsSettings } from './storage.ts';

type EventProps = Record<string, string | number | boolean>;

/**
 * Check if analytics is enabled
 */
function isAnalyticsEnabled(): boolean {
    return analyticsSettings.isEnabled();
}

/**
 * Track a custom event with Plausible
 */
export function trackEvent(eventName: string, props: EventProps = {}): void {
    if (!isAnalyticsEnabled()) return;
    if (window.plausible) {
        try {
            window.plausible(eventName, { props });
        } catch {
            // Silently fail if analytics is blocked
        }
    }
}

/**
 * Track page views with custom properties
 */
export function trackPageView(path: string): void {
    trackEvent('pageview', { path });
}

// Playback Events
export function trackPlayTrack(track: TrackData | null | undefined): void {
    trackEvent('Play Track', {
        track_id: track?.id || 'unknown',
        track_title: track?.title || 'Unknown',
        artist_id: track?.artist?.id || track?.artists?.[0]?.id || 'unknown',
        artist: track?.artist?.name || track?.artists?.[0]?.name || 'Unknown',
        album_id: track?.album?.id || 'unknown',
        album: track?.album?.title || 'Unknown',
        duration: track?.duration || 0,
        quality: track?.audioQuality || track?.quality || 'Unknown',
        is_local: track?.isLocal || false,
        is_explicit: track?.explicit || false,
        track_number: track?.trackNumber || 0,
        year: String((track?.album?.releaseYear as string | undefined) || track?.album?.releaseDate || 'unknown'),
    });
}

export function trackPauseTrack(track: TrackData | null | undefined): void {
    trackEvent('Pause Track', {
        track_id: track?.id || 'unknown',
        track_title: track?.title || 'Unknown',
        artist_id: track?.artist?.id || track?.artists?.[0]?.id || 'unknown',
        artist: track?.artist?.name || track?.artists?.[0]?.name || 'Unknown',
        album_id: track?.album?.id || 'unknown',
        album: track?.album?.title || 'Unknown',
    });
}

export function trackSkipTrack(track: TrackData | null | undefined, direction: string): void {
    trackEvent('Skip Track', {
        track_id: track?.id || 'unknown',
        track_title: track?.title || 'Unknown',
        artist_id: track?.artist?.id || track?.artists?.[0]?.id || 'unknown',
        artist: track?.artist?.name || track?.artists?.[0]?.name || 'Unknown',
        album_id: track?.album?.id || 'unknown',
        album: track?.album?.title || 'Unknown',
        direction: direction,
    });
}

export function trackToggleShuffle(enabled: boolean): void {
    trackEvent('Toggle Shuffle', { enabled });
}

export function trackToggleRepeat(mode: string): void {
    trackEvent('Toggle Repeat', { mode });
}

export function trackTrackComplete(track: TrackData | null | undefined, completionPercent: number): void {
    trackEvent('Track Complete', {
        track_id: track?.id || 'unknown',
        track_title: track?.title || 'Unknown',
        artist_id: track?.artist?.id || track?.artists?.[0]?.id || 'unknown',
        artist: track?.artist?.name || track?.artists?.[0]?.name || 'Unknown',
        album_id: track?.album?.id || 'unknown',
        album: track?.album?.title || 'Unknown',
        duration: track?.duration || 0,
        completion_percent: completionPercent || 100,
    });
}

export function trackSetVolume(level: number): void {
    // Only track volume changes at coarse intervals to avoid spam
    const roundedLevel: number = Math.round(level * 10) / 10;
    trackEvent('Set Volume', { level: roundedLevel });
}

export function trackToggleMute(muted: boolean): void {
    trackEvent('Toggle Mute', { muted });
}

// Track listening progress milestones (10%, 50%, 90%, 100%)
export function trackListeningProgress(track: TrackData | null | undefined, percent: number): void {
    trackEvent('Listening Progress', {
        track_id: track?.id || 'unknown',
        track_title: track?.title || 'Unknown',
        artist_id: track?.artist?.id || track?.artists?.[0]?.id || 'unknown',
        percent: percent,
    });
}

// Search Events
export function trackSearch(query: string, resultsCount: number): void {
    trackEvent('Search', {
        query_length: query?.length || 0,
        has_results: resultsCount > 0,
        results_count: resultsCount,
    });
}

export function trackSearchTabChange(tab: string): void {
    trackEvent('Search Tab Change', { tab });
}

// Navigation Events
export function trackNavigate(path: string, pageType: string): void {
    trackEvent('Navigate', {
        path,
        page_type: pageType,
    });
}

export function trackSidebarNavigation(item: string): void {
    trackEvent('Sidebar Navigation', { item });
}

// Library Events
export function trackLikeTrack(track: TrackData | null | undefined): void {
    trackEvent('Like Track', {
        track_id: track?.id || 'unknown',
        track_title: track?.title || 'Unknown',
        artist_id: track?.artist?.id || track?.artists?.[0]?.id || 'unknown',
        artist: track?.artist?.name || track?.artists?.[0]?.name || 'Unknown',
        album_id: track?.album?.id || 'unknown',
        album: track?.album?.title || 'Unknown',
    });
}

export function trackUnlikeTrack(track: TrackData | null | undefined): void {
    trackEvent('Unlike Track', {
        track_id: track?.id || 'unknown',
        track_title: track?.title || 'Unknown',
        artist_id: track?.artist?.id || track?.artists?.[0]?.id || 'unknown',
        artist: track?.artist?.name || track?.artists?.[0]?.name || 'Unknown',
        album_id: track?.album?.id || 'unknown',
    });
}

export function trackLikeAlbum(album: TrackAlbum | null | undefined): void {
    trackEvent('Like Album', {
        album_title: album?.title || 'Unknown',
        artist: album?.artist?.name || 'Unknown',
    });
}

export function trackUnlikeAlbum(album: TrackAlbum | null | undefined): void {
    trackEvent('Unlike Album', {
        album_title: album?.title || 'Unknown',
    });
}

export function trackLikeArtist(artist: ArtistData | null | undefined): void {
    trackEvent('Like Artist', {
        artist_name: artist?.name || 'Unknown',
    });
}

export function trackUnlikeArtist(artist: ArtistData | null | undefined): void {
    trackEvent('Unlike Artist', {
        artist_name: artist?.name || 'Unknown',
    });
}

export function trackLikePlaylist(playlist: PlaylistData | null | undefined): void {
    trackEvent('Like Playlist', {
        playlist_name: playlist?.title || playlist?.name || 'Unknown',
    });
}

export function trackUnlikePlaylist(playlist: PlaylistData | null | undefined): void {
    trackEvent('Unlike Playlist', {
        playlist_name: playlist?.title || playlist?.name || 'Unknown',
    });
}

// Playlist Management Events
export function trackCreatePlaylist(playlist: PlaylistData | null | undefined, source: string): void {
    trackEvent('Create Playlist', {
        playlist_name: playlist?.name || 'Unknown',
        track_count: playlist?.tracks?.length || 0,
        is_public: (playlist?.isPublic as boolean | undefined) || false,
        source: source || 'manual',
    });
}

export function trackEditPlaylist(playlist: PlaylistData | null | undefined): void {
    trackEvent('Edit Playlist', {
        playlist_name: playlist?.name || 'Unknown',
    });
}

export function trackDeletePlaylist(playlistName: string): void {
    trackEvent('Delete Playlist', { playlist_name: playlistName });
}

export function trackAddToPlaylist(track: TrackData | null | undefined, playlist: PlaylistData | null | undefined): void {
    trackEvent('Add to Playlist', {
        track_title: track?.title || 'Unknown',
        playlist_name: playlist?.name || 'Unknown',
    });
}

export function trackRemoveFromPlaylist(track: TrackData | null | undefined, playlist: PlaylistData | null | undefined): void {
    trackEvent('Remove from Playlist', {
        track_title: track?.title || 'Unknown',
        playlist_name: playlist?.name || 'Unknown',
    });
}

export function trackCreateFolder(folder: { name?: string } | null | undefined): void {
    trackEvent('Create Folder', {
        folder_name: folder?.name || 'Unknown',
    });
}

export function trackDeleteFolder(folderName: string): void {
    trackEvent('Delete Folder', { folder_name: folderName });
}

// Playback Actions
export function trackPlayAlbum(album: TrackAlbum | null | undefined, shuffle: boolean): void {
    trackEvent('Play Album', {
        album_id: album?.id || 'unknown',
        album_title: album?.title || 'Unknown',
        artist_id: album?.artist?.id || 'unknown',
        artist: album?.artist?.name || 'Unknown',
        shuffle: shuffle || false,
        track_count: album?.numberOfTracks || (album?.tracks as TrackData[] | undefined)?.length || 0,
        year: String((album?.releaseYear as string | undefined) || album?.releaseDate || 'unknown'),
    });
}

export function trackPlayPlaylist(playlist: PlaylistData | null | undefined, shuffle: boolean): void {
    trackEvent('Play Playlist', {
        playlist_id: playlist?.id || 'unknown',
        playlist_name: playlist?.title || playlist?.name || 'Unknown',
        shuffle: shuffle || false,
        track_count: playlist?.tracks?.length || 0,
        is_public: (playlist?.isPublic as boolean | undefined) || false,
    });
}

export function trackPlayArtistRadio(artist: ArtistData | null | undefined): void {
    trackEvent('Play Artist Radio', {
        artist_id: artist?.id || 'unknown',
        artist_name: artist?.name || 'Unknown',
    });
}

export function trackShuffleLikedTracks(count: number): void {
    trackEvent('Shuffle Liked Tracks', { track_count: count });
}

// Download Events
export function trackDownloadTrack(track: TrackData | null | undefined, quality: string): void {
    trackEvent('Download Track', {
        track_id: track?.id || 'unknown',
        track_title: track?.title || 'Unknown',
        artist_id: track?.artist?.id || track?.artists?.[0]?.id || 'unknown',
        artist: track?.artist?.name || track?.artists?.[0]?.name || 'Unknown',
        album_id: track?.album?.id || 'unknown',
        quality: quality || 'Unknown',
    });
}

export function trackDownloadAlbum(album: TrackAlbum | null | undefined, quality: string): void {
    trackEvent('Download Album', {
        album_id: album?.id || 'unknown',
        album_title: album?.title || 'Unknown',
        artist_id: album?.artist?.id || 'unknown',
        artist: album?.artist?.name || 'Unknown',
        track_count: album?.numberOfTracks || (album?.tracks as TrackData[] | undefined)?.length || 0,
        quality: quality || 'Unknown',
    });
}

export function trackDownloadPlaylist(playlist: PlaylistData | null | undefined, quality: string): void {
    trackEvent('Download Playlist', {
        playlist_id: playlist?.id || 'unknown',
        playlist_name: playlist?.title || playlist?.name || 'Unknown',
        track_count: playlist?.tracks?.length || 0,
        quality: quality || 'Unknown',
    });
}

export function trackDownloadLikedTracks(count: number, quality: string): void {
    trackEvent('Download Liked Tracks', {
        track_count: count,
        quality: quality || 'Unknown',
    });
}

export function trackDownloadDiscography(artist: ArtistData | null | undefined, selection: { includeAlbums?: boolean; includeEPs?: boolean; includeSingles?: boolean } | null | undefined): void {
    trackEvent('Download Discography', {
        artist_id: artist?.id || 'unknown',
        artist_name: artist?.name || 'Unknown',
        include_albums: selection?.includeAlbums || false,
        include_eps: selection?.includeEPs || false,
        include_singles: selection?.includeSingles || false,
    });
}

// Queue Management
export function trackAddToQueue(track: TrackData | null | undefined, position: string): void {
    trackEvent('Add to Queue', {
        track_id: track?.id || 'unknown',
        track_title: track?.title || 'Unknown',
        artist_id: track?.artist?.id || track?.artists?.[0]?.id || 'unknown',
        artist: track?.artist?.name || track?.artists?.[0]?.name || 'Unknown',
        album_id: track?.album?.id || 'unknown',
        position: position || 'end',
    });
}

export function trackPlayNext(track: TrackData | null | undefined): void {
    trackEvent('Play Next', {
        track_id: track?.id || 'unknown',
        track_title: track?.title || 'Unknown',
        artist_id: track?.artist?.id || track?.artists?.[0]?.id || 'unknown',
        artist: track?.artist?.name || track?.artists?.[0]?.name || 'Unknown',
        album_id: track?.album?.id || 'unknown',
    });
}

export function trackClearQueue(): void {
    trackEvent('Clear Queue');
}

export function trackShuffleQueue(): void {
    trackEvent('Shuffle Queue');
}

// Context Menu Actions
export function trackContextMenuAction(action: string, itemType: string, item: { title?: string; name?: string } | null | undefined): void {
    trackEvent('Context Menu Action', {
        action,
        item_type: itemType,
        item_name: item?.title || item?.name || 'Unknown',
    });
}

export function trackBlockTrack(track: TrackData | null | undefined): void {
    trackEvent('Block Track', {
        track_id: track?.id || 'unknown',
        track_title: track?.title || 'Unknown',
        artist_id: track?.artist?.id || track?.artists?.[0]?.id || 'unknown',
        artist: track?.artist?.name || track?.artists?.[0]?.name || 'Unknown',
        album_id: track?.album?.id || 'unknown',
    });
}

export function trackUnblockTrack(track: TrackData | null | undefined): void {
    trackEvent('Unblock Track', {
        track_id: track?.id || 'unknown',
        track_title: track?.title || 'Unknown',
    });
}

export function trackBlockAlbum(album: TrackAlbum | null | undefined): void {
    trackEvent('Block Album', {
        album_id: album?.id || 'unknown',
        album_title: album?.title || 'Unknown',
        artist_id: album?.artist?.id || 'unknown',
    });
}

export function trackUnblockAlbum(album: TrackAlbum | null | undefined): void {
    trackEvent('Unblock Album', {
        album_id: album?.id || 'unknown',
        album_title: album?.title || 'Unknown',
    });
}

export function trackBlockArtist(artist: ArtistData | null | undefined): void {
    trackEvent('Block Artist', {
        artist_id: artist?.id || 'unknown',
        artist_name: artist?.name || 'Unknown',
    });
}

export function trackUnblockArtist(artist: ArtistData | null | undefined): void {
    trackEvent('Unblock Artist', {
        artist_id: artist?.id || 'unknown',
        artist_name: artist?.name || 'Unknown',
    });
}

export function trackCopyLink(type: string, id: string | number): void {
    trackEvent('Copy Link', { type, id });
}

export function trackOpenInNewTab(type: string, id: string | number): void {
    trackEvent('Open in New Tab', { type, id });
}

// Lyrics Events
export function trackOpenLyrics(track: TrackData | null | undefined): void {
    trackEvent('Open Lyrics', {
        track_title: track?.title || 'Unknown',
        artist: track?.artist?.name || track?.artists?.[0]?.name || 'Unknown',
    });
}

export function trackCloseLyrics(track: TrackData | null | undefined): void {
    trackEvent('Close Lyrics', {
        track_title: track?.title || 'Unknown',
    });
}

// Fullscreen/Cover View Events
export function trackOpenFullscreenCover(track: TrackData | null | undefined): void {
    trackEvent('Open Fullscreen Cover', {
        track_title: track?.title || 'Unknown',
    });
}

export function trackCloseFullscreenCover(): void {
    trackEvent('Close Fullscreen Cover');
}

export function trackToggleVisualizer(enabled: boolean): void {
    trackEvent('Toggle Visualizer', { enabled });
}

export function trackToggleLyricsFullscreen(enabled: boolean): void {
    trackEvent('Toggle Lyrics Fullscreen', { enabled });
}

// Settings Events
export function trackChangeSetting(setting: string, value: unknown): void {
    trackEvent('Change Setting', {
        setting,
        value: typeof value === 'object' ? JSON.stringify(value) : String(value),
    });
}

export function trackChangeTheme(theme: string): void {
    trackEvent('Change Theme', { theme });
}

export function trackChangeQuality(type: string, quality: string): void {
    trackEvent('Change Quality', { type, quality });
}

export function trackChangeVolume(volume: number): void {
    trackEvent('Change Volume', { volume: Math.round(volume * 100) });
}

export function trackToggleScrobbler(service: string, enabled: boolean): void {
    trackEvent('Toggle Scrobbler', { service, enabled });
}

export function trackConnectScrobbler(service: string): void {
    trackEvent('Connect Scrobbler', { service });
}

export function trackDisconnectScrobbler(service: string): void {
    trackEvent('Disconnect Scrobbler', { service });
}

// Local Files Events
export function trackSelectLocalFolder(fileCount: number): void {
    trackEvent('Select Local Folder', { file_count: fileCount });
}

export function trackPlayLocalFile(track: TrackData | null | undefined): void {
    trackEvent('Play Local File', {
        track_title: track?.title || 'Unknown',
    });
}

export function trackChangeLocalFolder(): void {
    trackEvent('Change Local Folder');
}

// Import/Export Events
export function trackImportCSV(playlistName: string, trackCount: number, missingCount: number): void {
    trackEvent('Import CSV', {
        playlist_name: playlistName,
        track_count: trackCount,
        missing_count: missingCount,
    });
}

export function trackImportJSPF(playlistName: string, trackCount: number, missingCount: number, source: string): void {
    trackEvent('Import JSPF', {
        playlist_name: playlistName,
        track_count: trackCount,
        missing_count: missingCount,
        source: source || 'unknown',
    });
}

export function trackImportXSPF(playlistName: string, trackCount: number, missingCount: number): void {
    trackEvent('Import XSPF', {
        playlist_name: playlistName,
        track_count: trackCount,
        missing_count: missingCount,
    });
}

export function trackImportXML(playlistName: string, trackCount: number, missingCount: number): void {
    trackEvent('Import XML', {
        playlist_name: playlistName,
        track_count: trackCount,
        missing_count: missingCount,
    });
}

export function trackImportM3U(playlistName: string, trackCount: number, missingCount: number): void {
    trackEvent('Import M3U', {
        playlist_name: playlistName,
        track_count: trackCount,
        missing_count: missingCount,
    });
}

// Sleep Timer Events
export function trackSetSleepTimer(minutes: number): void {
    trackEvent('Set Sleep Timer', { minutes });
}

export function trackCancelSleepTimer(): void {
    trackEvent('Cancel Sleep Timer');
}

// History Events
export function trackClearHistory(): void {
    trackEvent('Clear History');
}

export function trackClearRecent(): void {
    trackEvent('Clear Recent');
}

// Casting Events
export function trackStartCasting(deviceType: string): void {
    trackEvent('Start Casting', { device_type: deviceType });
}

export function trackStopCasting(): void {
    trackEvent('Stop Casting');
}

// Keyboard Shortcuts
export function trackKeyboardShortcut(key: string): void {
    trackEvent('Keyboard Shortcut', { key });
}

// Pinning Events
export function trackPinItem(type: string, item: { title?: string; name?: string } | null | undefined): void {
    trackEvent('Pin Item', {
        type,
        item_name: item?.title || item?.name || 'Unknown',
    });
}

export function trackUnpinItem(type: string, item: { title?: string; name?: string } | null | undefined): void {
    trackEvent('Unpin Item', {
        type,
        item_name: item?.title || item?.name || 'Unknown',
    });
}

// Side Panel Events
export function trackOpenSidePanel(panelType: string): void {
    trackEvent('Open Side Panel', { panel_type: panelType });
}

export function trackCloseSidePanel(): void {
    trackEvent('Close Side Panel');
}

// Queue Panel Events
export function trackOpenQueue(): void {
    trackEvent('Open Queue');
}

export function trackCloseQueue(): void {
    trackEvent('Close Queue');
}

// Mix Events
export function trackStartMix(sourceType: string, source: { title?: string; name?: string } | null | undefined): void {
    trackEvent('Start Mix', {
        source_type: sourceType,
        source_name: source?.title || source?.name || 'Unknown',
    });
}

export function trackPlayMix(mixId: string): void {
    trackEvent('Play Mix', { mix_id: mixId });
}

// Search History Events
export function trackClearSearchHistory(): void {
    trackEvent('Clear Search History');
}

export function trackClickSearchHistory(query: string): void {
    trackEvent('Click Search History', { query_length: query?.length || 0 });
}

// PWA/Update Events
export function trackPwaInstall(): void {
    trackEvent('PWA Install');
}

export function trackPwaUpdate(): void {
    trackEvent('PWA Update');
}

export function trackDismissUpdate(): void {
    trackEvent('Dismiss Update');
}

// Sort Events
export function trackChangeSort(sortType: string): void {
    trackEvent('Change Sort', { sort_type: sortType });
}

// Modal Events
export function trackOpenModal(modalName: string): void {
    trackEvent('Open Modal', { modal_name: modalName });
}

export function trackCloseModal(modalName: string): void {
    trackEvent('Close Modal', { modal_name: modalName });
}

// Sharing Events
export function trackSharePlaylist(playlist: PlaylistData | null | undefined, isPublic: boolean): void {
    trackEvent('Share Playlist', {
        playlist_name: playlist?.name || 'Unknown',
        is_public: isPublic,
    });
}

// Audio Effects Events
export function trackChangePlaybackSpeed(speed: number): void {
    trackEvent('Change Playback Speed', { speed });
}

export function trackToggleReplayGain(mode: string): void {
    trackEvent('Toggle ReplayGain', { mode });
}

export function trackChangeEqualizer(preset: string): void {
    trackEvent('Change Equalizer', { preset });
}

// Waveform Events
export function trackToggleWaveform(enabled: boolean): void {
    trackEvent('Toggle Waveform', { enabled });
}

// Error Events
export function trackPlaybackError(errorType: string, track: TrackData | null | undefined): void {
    trackEvent('Playback Error', {
        error_type: errorType,
        track_title: track?.title || 'Unknown',
    });
}

export function trackSearchError(query: string): void {
    trackEvent('Search Error', { query_length: query?.length || 0 });
}

export function trackApiError(endpoint: string): void {
    trackEvent('API Error', { endpoint });
}

// Feature Discovery Events
export function trackViewFeature(feature: string): void {
    trackEvent('View Feature', { feature });
}

export function trackUseFeature(feature: string): void {
    trackEvent('Use Feature', { feature });
}

// Session Events
export function trackSessionStart(): void {
    trackEvent('Session Start', {
        user_agent: navigator.userAgent,
        screen_width: window.screen.width,
        screen_height: window.screen.height,
        language: navigator.language,
    });
}

export function trackSessionEnd(duration: number): void {
    trackEvent('Session End', { duration });
}

// Initialize analytics on page load
export function initAnalytics(): void {
    if (!isAnalyticsEnabled()) return;

    // Track initial page view
    trackPageView(window.location.pathname);

    // Track session start
    trackSessionStart();

    // Track navigation changes
    let lastPath: string = window.location.pathname;
    setInterval(() => {
        const currentPath: string = window.location.pathname;
        if (currentPath !== lastPath) {
            trackPageView(currentPath);
            lastPath = currentPath;
        }
    }, 500);

    // Track online/offline status
    window.addEventListener('online', () => trackEvent('Go Online'));
    window.addEventListener('offline', () => trackEvent('Go Offline'));

    // Track visibility changes (app focus/blur)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            trackEvent('App Background');
        } else {
            trackEvent('App Foreground');
        }
    });
}
