import { listenBrainzSettings, lastFMStorage } from './storage.ts';

interface ListenBrainzAdditionalInfo {
    submission_client: string;
    submission_client_version: string;
    duration?: number;
    track_number?: number;
    is_local?: boolean;
}

interface ListenBrainzTrackMetadata {
    artist_name: string;
    track_name: string;
    release_name?: string;
    additional_info: ListenBrainzAdditionalInfo;
}

interface ListenBrainzPayloadItem {
    track_metadata: ListenBrainzTrackMetadata;
    listened_at?: number;
}

interface ListenBrainzSubmission {
    listen_type: string;
    payload: ListenBrainzPayloadItem[];
}

export class ListenBrainzScrobbler {
    private readonly DEFAULT_API_URL: string;
    private currentTrack: TrackData | null;
    private scrobbleTimer: ReturnType<typeof setTimeout> | null;
    private scrobbleThreshold: number;
    private hasScrobbled: boolean;
    private isScrobbling: boolean;

    constructor() {
        this.DEFAULT_API_URL = 'https://api.listenbrainz.org/1';
        this.currentTrack = null;
        this.scrobbleTimer = null;
        this.scrobbleThreshold = 0;
        this.hasScrobbled = false;
        this.isScrobbling = false;
    }

    getApiUrl(): string {
        const customUrl: string = listenBrainzSettings.getCustomUrl();
        return customUrl || this.DEFAULT_API_URL;
    }

    isEnabled(): boolean {
        return listenBrainzSettings.isEnabled() && !!listenBrainzSettings.getToken();
    }

    getToken(): string {
        return listenBrainzSettings.getToken();
    }

    _getMetadata(track: TrackData | null): ListenBrainzTrackMetadata | null {
        if (!track) return null;

        // Get the primary artist name
        let artistName: string = 'Unknown Artist';

        if (track.artist?.name) {
            artistName = track.artist.name;
        } else if (typeof track.artist === 'string') {
            artistName = track.artist;
        } else if (track.artists && track.artists.length > 0) {
            const first: TrackArtist = track.artists[0];
            artistName = typeof first === 'string' ? first : first.name || 'Unknown Artist';
        }

        // Clean artist name
        if (typeof artistName === 'string') {
            artistName = artistName
                .split(/\s*[&]\s*|\s+feat\.?\s+|\s+ft\.?\s+|\s+featuring\s+|\s+with\s+|\s+x\s+/i)[0]
                .trim();
        }

        const payload: ListenBrainzTrackMetadata = {
            artist_name: artistName,
            track_name: (track.cleanTitle as string | undefined) || track.title,
            additional_info: {
                submission_client: 'Monochrome',
                submission_client_version: '1.0.0',
            },
        };

        if (track.album?.title) {
            payload.release_name = track.album.title;
        }

        if (track.duration) {
            payload.additional_info.duration = Math.floor(track.duration);
        }

        if (track.trackNumber) {
            payload.additional_info.track_number = track.trackNumber;
        }

        if (track.isLocal) {
            payload.additional_info.is_local = true;
        }

        return payload;
    }

    async submitListen(listenType: string, track: TrackData, timestamp: number | null = null): Promise<void> {
        if (!this.isEnabled()) return;

        const metadata: ListenBrainzTrackMetadata | null = this._getMetadata(track);
        if (!metadata) return;

        const payload: ListenBrainzPayloadItem[] = [
            {
                track_metadata: metadata,
            },
        ];

        if (timestamp) {
            payload[0].listened_at = timestamp;
        }

        const body: ListenBrainzSubmission = {
            listen_type: listenType,
            payload: payload,
        };

        try {
            const apiUrl: string = this.getApiUrl();
            const response: Response = await fetch(`${apiUrl}/submit-listens`, {
                method: 'POST',
                headers: {
                    Authorization: `Token ${this.getToken()}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                // ListenBrainz doesn't always return JSON on error
                const text: string = await response.text();
                throw new Error(`ListenBrainz API Error ${response.status}: ${text}`);
            }

            console.log(`[ListenBrainz] Submitted ${listenType}: ${metadata.track_name}`);
        } catch (error: unknown) {
            console.error('[ListenBrainz] Submission failed:', error);
        }
    }

    async updateNowPlaying(track: TrackData): Promise<void> {
        if (!this.isEnabled()) return;

        this.currentTrack = track;
        // Only reset hasScrobbled if we're not currently in the middle of scrobbling
        // to prevent race conditions that could cause double scrobbles
        if (!this.isScrobbling) {
            this.hasScrobbled = false;
        }
        this.clearScrobbleTimer();

        await this.submitListen('playing_now', track);

        const scrobblePercentage: number = lastFMStorage.getScrobblePercentage() / 100;
        this.scrobbleThreshold = Math.min(track.duration * scrobblePercentage, 240);
        this.scheduleScrobble(this.scrobbleThreshold * 1000);
    }

    scheduleScrobble(delay: number): void {
        this.clearScrobbleTimer();
        this.scrobbleTimer = setTimeout(() => {
            this.scrobbleCurrentTrack();
        }, delay);
    }

    clearScrobbleTimer(): void {
        if (this.scrobbleTimer) {
            clearTimeout(this.scrobbleTimer);
            this.scrobbleTimer = null;
        }
    }

    async scrobbleCurrentTrack(): Promise<void> {
        if (!this.isEnabled() || !this.currentTrack || this.hasScrobbled) return;

        this.isScrobbling = true;

        try {
            const timestamp: number = Math.floor(Date.now() / 1000);
            await this.submitListen('single', this.currentTrack, timestamp);
            this.hasScrobbled = true;
        } finally {
            this.isScrobbling = false;
        }
    }

    onTrackChange(track: TrackData): void {
        this.updateNowPlaying(track);
    }

    onPlaybackStop(): void {
        this.clearScrobbleTimer();
    }

    disconnect(): void {
        this.clearScrobbleTimer();
        this.currentTrack = null;
    }
}
