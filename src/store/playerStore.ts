import { useSyncExternalStore } from 'react';

export interface TrackData {
    id?: string | number;
    title?: string;
    artist?: { id?: string | number; name?: string } | null;
    album?: { id?: string | number; title?: string; cover?: string } | null;
    duration?: number;
    cover?: string;
    quality?: string;
    explicit?: boolean;
    [key: string]: unknown;
}

export interface PlayerState {
    currentTrack: TrackData | null;
    isPlaying: boolean;
    volume: number;
    isMuted: boolean;
    shuffleActive: boolean;
    repeatMode: number; // 0=off, 1=all, 2=one
    currentTime: number;
    duration: number;
    coverSrc: string;
    trackTitle: string;
    trackAlbum: string;
    trackArtist: string;
}

const DEFAULT_COVER = '/assets/appicon.png';

class PlayerStoreClass {
    private _state: PlayerState = {
        currentTrack: null,
        isPlaying: false,
        volume: parseFloat(localStorage.getItem('volume') || '0.7'),
        isMuted: false,
        shuffleActive: false,
        repeatMode: 0,
        currentTime: 0,
        duration: 0,
        coverSrc: DEFAULT_COVER,
        trackTitle: 'Select a song',
        trackAlbum: '',
        trackArtist: '',
    };

    private _listeners = new Set<() => void>();

    getSnapshot(): PlayerState {
        return this._state;
    }

    subscribe(listener: () => void): () => void {
        this._listeners.add(listener);
        return () => {
            this._listeners.delete(listener);
        };
    }

    setState(update: Partial<PlayerState>): void {
        this._state = { ...this._state, ...update };
        this._notify();
    }

    private _notify(): void {
        this._listeners.forEach((l) => l());
    }
}

export const playerStore = new PlayerStoreClass();

export function usePlayerStore(): PlayerState {
    return useSyncExternalStore(
        (cb) => playerStore.subscribe(cb),
        () => playerStore.getSnapshot()
    );
}
