import { LastFMScrobbler } from './lastfm.ts';
import { ListenBrainzScrobbler } from './listenbrainz.ts';
import { MalojaScrobbler } from './maloja.ts';
import { LibreFmScrobbler } from './librefm.ts';

export class MultiScrobbler {
    private lastfm: LastFMScrobbler;
    private listenbrainz: ListenBrainzScrobbler;
    private maloja: MalojaScrobbler;
    private librefm: LibreFmScrobbler;

    constructor() {
        this.lastfm = new LastFMScrobbler();
        this.listenbrainz = new ListenBrainzScrobbler();
        this.maloja = new MalojaScrobbler();
        this.librefm = new LibreFmScrobbler();
    }

    // Proxy method for Last.fm specific usage (auth flow)
    getLastFM(): LastFMScrobbler {
        return this.lastfm;
    }

    // Proxy method for Libre.fm specific usage (auth flow)
    getLibreFm(): LibreFmScrobbler {
        return this.librefm;
    }

    isAuthenticated(): boolean {
        // Return true if any service is configured, so events.js will proceed to call updateNowPlaying
        // Individual services check their own enabled/auth state internally
        return (
            this.lastfm.isAuthenticated() ||
            this.listenbrainz.isEnabled() ||
            this.maloja.isEnabled() ||
            this.librefm.isAuthenticated()
        );
    }

    updateNowPlaying(track: TrackData): void {
        this.lastfm.updateNowPlaying(track);
        this.listenbrainz.updateNowPlaying(track);
        this.maloja.updateNowPlaying(track);
        this.librefm.updateNowPlaying(track);
    }

    onTrackChange(track: TrackData): void {
        this.lastfm.onTrackChange(track);
        this.listenbrainz.onTrackChange(track);
        this.maloja.onTrackChange(track);
        this.librefm.onTrackChange(track);
    }

    onPlaybackStop(): void {
        this.lastfm.onPlaybackStop();
        this.listenbrainz.onPlaybackStop();
        this.maloja.onPlaybackStop();
        this.librefm.onPlaybackStop();
    }

    // Love/Like tracks on all services that support it
    async loveTrack(track: TrackData): Promise<void> {
        await this.lastfm.loveTrack(track);
        await this.librefm.loveTrack(track);
        // ListenBrainz and Maloja feedback could be added here when supported
    }
}
