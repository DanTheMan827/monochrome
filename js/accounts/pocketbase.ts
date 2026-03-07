//js/accounts/pocketbase.js
import PocketBase, { type RecordModel, ClientResponseError } from 'pocketbase';
import { db } from '../db.ts';
import { authManager } from './auth.ts';
import type { Models } from 'appwrite';

type AppwriteUser = Models.User<Models.Preferences>;


const PUBLIC_COLLECTION = 'public_playlists';
const DEFAULT_POCKETBASE_URL = 'https://data.samidy.xyz';
const POCKETBASE_URL: string = localStorage.getItem('monochrome-pocketbase-url') || DEFAULT_POCKETBASE_URL;

console.log('[PocketBase] Using URL:', POCKETBASE_URL);

const pb: PocketBase = new PocketBase(POCKETBASE_URL);
pb.autoCancellation(false);

type LibraryType = 'track' | 'album' | 'artist' | 'playlist' | 'mix';

interface LibraryCollection {
    tracks: Record<string, Record<string, unknown>>;
    albums: Record<string, Record<string, unknown>>;
    artists: Record<string, Record<string, unknown>>;
    playlists: Record<string, Record<string, unknown>>;
    mixes: Record<string, Record<string, unknown>>;
    [key: string]: Record<string, Record<string, unknown>>;
}

interface ProfileData {
    username: string;
    display_name: string;
    avatar_url: string;
    banner: string;
    status: string;
    about: string;
    website: string;
    privacy: Record<string, string>;
    lastfm_username: string;
    favorite_albums: unknown[];
}

interface UserData {
    library: LibraryCollection;
    history: unknown[];
    userPlaylists: Record<string, Record<string, unknown>>;
    userFolders: Record<string, Record<string, unknown>>;
    profile: ProfileData;
}

interface DatabaseLike {
    getAll?: (store: string) => Promise<Record<string, unknown>[]>;
    db?: { getAll?: (store: string) => Promise<Record<string, unknown>[]> };
    importData(data: Record<string, unknown>): Promise<void>;
}

const syncManager = {
    pb: pb as PocketBase,
    _userRecordCache: null as RecordModel | null,
    _isSyncing: false as boolean,

    async _getUserRecord(uid: string): Promise<RecordModel | null> {
        if (!uid) return null;

        if (this._userRecordCache && this._userRecordCache.firebase_id === uid) {
            return this._userRecordCache;
        }

        try {
            const record = await this.pb.collection('DB_users').getFirstListItem(`firebase_id="${uid}"`, { f_id: uid });
            this._userRecordCache = record;
            return record;
        } catch (error: unknown) {
            if (error instanceof ClientResponseError && error.status === 404) {
                try {
                    const newRecord = await this.pb.collection('DB_users').create(
                        {
                            firebase_id: uid,
                            library: {},
                            history: [],
                            user_playlists: {},
                            user_folders: {},
                        },
                        { f_id: uid }
                    );
                    this._userRecordCache = newRecord;
                    return newRecord;
                } catch (createError) {
                    console.error('[PocketBase] Failed to create user:', createError);
                    return null;
                }
            }
            console.error('[PocketBase] Failed to get user:', error);
            return null;
        }
    },

    async getUserData(): Promise<UserData | null> {
        const user = authManager.user;
        if (!user) return null;

        const record = await this._getUserRecord(user.$id);
        if (!record) return null;

        const library = this.safeParseInternal(record.library, 'library', {} as LibraryCollection);
        const history = this.safeParseInternal(record.history, 'history', [] as unknown[]);
        const userPlaylists = this.safeParseInternal(record.user_playlists, 'user_playlists', {} as Record<string, Record<string, unknown>>);
        const userFolders = this.safeParseInternal(record.user_folders, 'user_folders', {} as Record<string, Record<string, unknown>>);
        const favoriteAlbums = this.safeParseInternal(record.favorite_albums, 'favorite_albums', [] as unknown[]);

        const profile = {
            username: record.username,
            display_name: record.display_name,
            avatar_url: record.avatar_url,
            banner: record.banner,
            status: record.status,
            about: record.about,
            website: record.website,
            privacy: this.safeParseInternal(record.privacy, 'privacy', { playlists: 'public', lastfm: 'public' }),
            lastfm_username: record.lastfm_username,
            favorite_albums: favoriteAlbums,
        };

        return { library, history, userPlaylists, userFolders, profile };
    },

    async _updateUserJSON(uid: string, field: string, data: unknown): Promise<void> {
        const record = await this._getUserRecord(uid);
        if (!record) {
            console.error('Cannot update: no user record found');
            return;
        }

        try {
            const stringifiedData = typeof data === 'string' ? data : JSON.stringify(data);
            const updated = await this.pb
                .collection('DB_users')
                .update(record.id, { [field]: stringifiedData }, { f_id: uid });
            this._userRecordCache = updated;
        } catch (error) {
            console.error(`Failed to sync ${field} to PocketBase:`, error);
        }
    },

    safeParseInternal<T>(str: unknown, fieldName: string, fallback: T): T {
        if (!str) return fallback;
        if (typeof str !== 'string') return str as T;
        try {
            return JSON.parse(str);
        } catch {
            try {
                // Recovery attempt: replace illegal internal quotes in name/title fields
                const recovered = str.replace(/(:\s*")(.+?)("(?=\s*[,}\n\r]))/g, (match, p1, p2, p3) => {
                    const escapedContent = p2.replace(/(?<!\\)"/g, '\\"');
                    return p1 + escapedContent + p3;
                });
                return JSON.parse(recovered);
            } catch {
                try {
                    // Python-style fallback (Single quotes, True/False, None)
                    // This handles data that was incorrectly serialized as Python repr string
                    if (str.includes("'") || str.includes('True') || str.includes('False')) {
                        const jsFriendly = str
                            .replace(/\bTrue\b/g, 'true')
                            .replace(/\bFalse\b/g, 'false')
                            .replace(/\bNone\b/g, 'null');

                        // Basic safety check: ensure it looks like a structure and doesn't contain obvious code vectors
                        if (
                            (jsFriendly.trim().startsWith('[') || jsFriendly.trim().startsWith('{')) &&
                            !jsFriendly.match(/function|=>|window|document|alert|eval/)
                        ) {
                            return new Function('return ' + jsFriendly)();
                        }
                    }
                } catch (error) {
                    console.log(error); // Ignore fallback error
                }
                return fallback;
            }
        }
    },

    async syncLibraryItem(type: LibraryType, item: Record<string, unknown>, added: boolean): Promise<void> {
        const user = authManager.user;
        if (!user) return;

        const record = await this._getUserRecord(user.$id);
        if (!record) return;

        let library = this.safeParseInternal(record.library, 'library', {} as LibraryCollection);

        const pluralType = type === 'mix' ? 'mixes' : `${type}s`;
        const key = (type === 'playlist' ? item.uuid : item.id) as string;

        if (!library[pluralType]) {
            library[pluralType] = {};
        }

        if (added) {
            library[pluralType][key] = this._minifyItem(type, item);
        } else {
            delete library[pluralType][key];
        }

        await this._updateUserJSON(user.$id, 'library', library);
    },

    _minifyItem(type: LibraryType, item: Record<string, unknown>): Record<string, unknown> {
        if (!item) return item;

        const base = {
            id: item.id,
            addedAt: item.addedAt || Date.now(),
        };

        if (type === 'track') {
            const artists = item.artists as Record<string, unknown>[] | undefined;
            const album = item.album as Record<string, unknown> | undefined;
            return {
                ...base,
                title: item.title || null,
                duration: item.duration || null,
                explicit: item.explicit || false,
                artist: item.artist || (artists && artists.length > 0 ? artists[0] : null) || null,
                artists: artists?.map((a: Record<string, unknown>) => ({ id: a.id, name: a.name || null })) || [],
                album: album
                    ? {
                          id: album.id,
                          title: album.title || null,
                          cover: album.cover || null,
                          releaseDate: album.releaseDate || null,
                          vibrantColor: album.vibrantColor || null,
                          artist: album.artist || null,
                          numberOfTracks: album.numberOfTracks || null,
                      }
                    : null,
                copyright: item.copyright || null,
                isrc: item.isrc || null,
                trackNumber: item.trackNumber || null,
                streamStartDate: item.streamStartDate || null,
                version: item.version || null,
                mixes: item.mixes || null,
            };
        }

        if (type === 'album') {
            const artist = item.artist as Record<string, unknown> | undefined;
            const artists = item.artists as Record<string, unknown>[] | undefined;
            return {
                ...base,
                title: item.title || null,
                cover: item.cover || null,
                releaseDate: item.releaseDate || null,
                explicit: item.explicit || false,
                artist: artist
                    ? { name: artist.name || null, id: artist.id }
                    : artists?.[0]
                      ? { name: artists[0].name || null, id: artists[0].id }
                      : null,
                type: item.type || null,
                numberOfTracks: item.numberOfTracks || null,
            };
        }

        if (type === 'artist') {
            return {
                ...base,
                name: item.name || null,
                picture: item.picture || item.image || null,
            };
        }

        if (type === 'playlist') {
            const tracks = item.tracks as unknown[] | undefined;
            const userObj = item.user as Record<string, unknown> | undefined;
            return {
                uuid: item.uuid || item.id,
                addedAt: item.addedAt || Date.now(),
                title: item.title || item.name || null,
                image: item.image || item.squareImage || item.cover || null,
                numberOfTracks: item.numberOfTracks || (tracks ? tracks.length : 0),
                user: userObj ? { name: userObj.name || null } : null,
            };
        }

        if (type === 'mix') {
            return {
                id: item.id,
                addedAt: item.addedAt || Date.now(),
                title: item.title,
                subTitle: item.subTitle,
                mixType: item.mixType,
                cover: item.cover,
            };
        }

        return item;
    },

    async syncHistoryItem(historyEntry: unknown): Promise<void> {
        const user = authManager.user;
        if (!user) return;

        const record = await this._getUserRecord(user.$id);
        if (!record) return;

        let history = this.safeParseInternal(record.history, 'history', [] as unknown[]);

        const newHistory = [historyEntry, ...history].slice(0, 100);
        await this._updateUserJSON(user.$id, 'history', newHistory);
    },

    async syncUserPlaylist(playlist: Record<string, unknown>, action: string): Promise<void> {
        const user = authManager.user;
        if (!user) return;

        const record = await this._getUserRecord(user.$id);
        if (!record) return;

        let userPlaylists = this.safeParseInternal(record.user_playlists, 'user_playlists', {} as Record<string, Record<string, unknown>>);

        if (action === 'delete') {
            delete userPlaylists[playlist.id as string];
            await this.unpublishPlaylist(playlist.id as string);
        } else {
            userPlaylists[playlist.id as string] = {
                id: playlist.id,
                name: playlist.name,
                cover: playlist.cover || null,
                tracks: playlist.tracks ? (playlist.tracks as Record<string, unknown>[]).map((t: Record<string, unknown>) => this._minifyItem('track', t)) : [],
                createdAt: playlist.createdAt || Date.now(),
                updatedAt: playlist.updatedAt || Date.now(),
                numberOfTracks: playlist.tracks ? (playlist.tracks as unknown[]).length : 0,
                images: playlist.images || [],
                isPublic: playlist.isPublic || false,
            };

            if (playlist.isPublic) {
                await this.publishPlaylist(playlist);
            }
        }

        await this._updateUserJSON(user.$id, 'user_playlists', userPlaylists);
    },

    async syncUserFolder(folder: Record<string, unknown>, action: string): Promise<void> {
        const user = authManager.user;
        if (!user) return;

        const record = await this._getUserRecord(user.$id);
        if (!record) return;

        let userFolders = this.safeParseInternal(record.user_folders, 'user_folders', {} as Record<string, Record<string, unknown>>);

        if (action === 'delete') {
            delete userFolders[folder.id as string];
        } else {
            userFolders[folder.id as string] = {
                id: folder.id,
                name: folder.name,
                cover: folder.cover || null,
                playlists: folder.playlists || [],
                createdAt: folder.createdAt || Date.now(),
                updatedAt: folder.updatedAt || Date.now(),
            };
        }

        await this._updateUserJSON(user.$id, 'user_folders', userFolders);
    },

    async getPublicPlaylist(uuid: string): Promise<RecordModel | null> {
        try {
            const record = await this.pb
                .collection(PUBLIC_COLLECTION)
                .getFirstListItem(`uuid="${uuid}"`, { p_id: uuid });

            let rawCover: string = record.image || record.cover || record.playlist_cover || '';
            const extraData = this.safeParseInternal(record.data, 'data', {} as Record<string, unknown>);

            if (!rawCover && extraData && typeof extraData === 'object') {
                rawCover = extraData.cover as string || extraData.image as string || '';
            }

            let finalCover: string = rawCover;
            if (rawCover && !rawCover.startsWith('http') && !rawCover.startsWith('data:')) {
                finalCover = this.pb.files.getUrl(record, rawCover);
            }

            let images: string[] = [];
            const tracks = this.safeParseInternal(record.tracks, 'tracks', [] as Record<string, unknown>[]);

            if (!finalCover && tracks && tracks.length > 0) {
                const uniqueCovers: string[] = [];
                const seenCovers = new Set<string>();
                for (const track of tracks) {
                    const albumObj = track.album as Record<string, unknown> | undefined;
                    const c = albumObj?.cover as string | undefined;
                    if (c && !seenCovers.has(c)) {
                        seenCovers.add(c);
                        uniqueCovers.push(c);
                        if (uniqueCovers.length >= 4) break;
                    }
                }
                images = uniqueCovers;
            }

            let finalTitle: string = record.title || record.name || record.playlist_name;
            if (!finalTitle && extraData && typeof extraData === 'object') {
                finalTitle = extraData.title as string || extraData.name as string;
            }
            if (!finalTitle) finalTitle = 'Untitled Playlist';

            let finalDescription: string = record.description || '';
            if (!finalDescription && extraData && typeof extraData === 'object') {
                finalDescription = extraData.description as string || '';
            }

            return {
                ...record,
                id: record.uuid,
                name: finalTitle,
                title: finalTitle,
                description: finalDescription,
                cover: finalCover,
                image: finalCover,
                tracks: tracks,
                images: images,
                numberOfTracks: tracks.length,
                type: 'user-playlist',
                isPublic: true,
                user: { name: 'Community Playlist' },
            };
        } catch (error: unknown) {
            if (error instanceof ClientResponseError && error.status === 404) return null;
            console.error('Failed to fetch public playlist:', error);
            throw error;
        }
    },

    async publishPlaylist(playlist: Record<string, unknown>): Promise<void> {
        if (!playlist || !playlist.id) return;
        const uid = authManager.user?.$id;
        if (!uid) return;

        const data = {
            uuid: playlist.id,
            uid: uid,
            firebase_id: uid,
            title: playlist.name,
            name: playlist.name,
            playlist_name: playlist.name,
            image: playlist.cover,
            cover: playlist.cover,
            playlist_cover: playlist.cover,
            description: playlist.description || '',
            tracks: JSON.stringify(playlist.tracks || []),
            isPublic: true,
            data: {
                title: playlist.name,
                cover: playlist.cover,
                description: playlist.description || '',
            },
        };

        try {
            const existing = await this.pb.collection(PUBLIC_COLLECTION).getList(1, 1, {
                filter: `uuid="${playlist.id}"`,
                p_id: playlist.id,
            });

            if (existing.items.length > 0) {
                await this.pb.collection(PUBLIC_COLLECTION).update(existing.items[0].id, data, { f_id: uid });
            } else {
                await this.pb.collection(PUBLIC_COLLECTION).create(data, { f_id: uid });
            }
        } catch (error) {
            console.error('Failed to publish playlist:', error);
        }
    },

    async unpublishPlaylist(uuid: string): Promise<void> {
        const uid = authManager.user?.$id;
        if (!uid) return;

        try {
            const existing = await this.pb.collection(PUBLIC_COLLECTION).getList(1, 1, {
                filter: `uuid="${uuid}"`,
                p_id: uuid,
            });

            if (existing.items && existing.items.length > 0) {
                await this.pb.collection(PUBLIC_COLLECTION).delete(existing.items[0].id, { p_id: uuid, f_id: uid });
            }
        } catch (error) {
            console.error('Failed to unpublish playlist:', error);
        }
    },

    async getProfile(username: string): Promise<RecordModel | null> {
        try {
            const record = await this.pb.collection('DB_users').getFirstListItem(`username="${username}"`, {
                fields: 'username,display_name,avatar_url,banner,status,about,website,lastfm_username,privacy,user_playlists,favorite_albums',
            });
            return {
                ...record,
                privacy: this.safeParseInternal(record.privacy, 'privacy', { playlists: 'public', lastfm: 'public' }),
                user_playlists: this.safeParseInternal(record.user_playlists, 'user_playlists', {} as Record<string, unknown>),
                favorite_albums: this.safeParseInternal(record.favorite_albums, 'favorite_albums', [] as unknown[]),
            };
        } catch {
            return null;
        }
    },

    async updateProfile(data: Record<string, unknown>): Promise<void> {
        const user = authManager.user;
        if (!user) return;
        const record = await this._getUserRecord(user.$id);
        if (!record) return;

        const updateData = { ...data };
        if (updateData.privacy) {
            updateData.privacy = JSON.stringify(updateData.privacy);
        }

        await this.pb.collection('DB_users').update(record.id, updateData, { f_id: user.$id });
        if (this._userRecordCache) {
            this._userRecordCache = { ...this._userRecordCache, ...updateData };
        }
    },

    async isUsernameTaken(username: string): Promise<boolean> {
        try {
            const list = await this.pb.collection('DB_users').getList(1, 1, { filter: `username="${username}"` });
            return list.totalItems > 0;
        } catch {
            return false;
        }
    },

    async clearCloudData(): Promise<void> {
        const user = authManager.user;
        if (!user) return;

        try {
            const record = await this._getUserRecord(user.$id);
            if (record) {
                await this.pb.collection('DB_users').delete(record.id, { f_id: user.$id });
                this._userRecordCache = null;
                alert('Cloud data cleared successfully.');
            }
        } catch (error) {
            console.error('Failed to clear cloud data!', error);
            alert('Failed to clear cloud data! :( Check console for details.');
        }
    },

    async onAuthStateChanged(user: AppwriteUser | null): Promise<void> {
        if (user) {
            if (this._isSyncing) return;

            this._isSyncing = true;

            try {
                const cloudData = await this.getUserData();

                if (cloudData) {
                    const database = db as unknown as DatabaseLike;

                    const getAll = async (store: string): Promise<Record<string, unknown>[]> => {
                        if (database && typeof database.getAll === 'function') return database.getAll(store);
                        if (database?.db && typeof database.db.getAll === 'function')
                            return database.db.getAll(store);
                        return [];
                    };

                    const localData = {
                        tracks: (await getAll('favorites_tracks')) || [],
                        albums: (await getAll('favorites_albums')) || [],
                        artists: (await getAll('favorites_artists')) || [],
                        playlists: (await getAll('favorites_playlists')) || [],
                        mixes: (await getAll('favorites_mixes')) || [],
                        history: (await getAll('history_tracks')) || [],
                        userPlaylists: (await getAll('user_playlists')) || [],
                        userFolders: (await getAll('user_folders')) || [],
                    };

                    let { library, history, userPlaylists, userFolders } = cloudData;
                    let needsUpdate = false;

                    if (!library) library = {} as LibraryCollection;
                    if (!library.tracks) library.tracks = {};
                    if (!library.albums) library.albums = {};
                    if (!library.artists) library.artists = {};
                    if (!library.playlists) library.playlists = {};
                    if (!library.mixes) library.mixes = {};
                    if (!userPlaylists) userPlaylists = {};
                    if (!userFolders) userFolders = {};
                    if (!history) history = [];

                    const mergeItem = (collection: Record<string, Record<string, unknown>>, item: Record<string, unknown>, type: LibraryType): void => {
                        const id = type === 'playlist' ? (item.uuid as string) || (item.id as string) : item.id as string;
                        if (!collection[id]) {
                            collection[id] = this._minifyItem(type, item);
                            needsUpdate = true;
                        }
                    };

                    localData.tracks.forEach((item: Record<string, unknown>) => mergeItem(library.tracks, item, 'track'));
                    localData.albums.forEach((item: Record<string, unknown>) => mergeItem(library.albums, item, 'album'));
                    localData.artists.forEach((item: Record<string, unknown>) => mergeItem(library.artists, item, 'artist'));
                    localData.playlists.forEach((item: Record<string, unknown>) => mergeItem(library.playlists, item, 'playlist'));
                    localData.mixes.forEach((item: Record<string, unknown>) => mergeItem(library.mixes, item, 'mix'));

                    localData.userPlaylists.forEach((playlist: Record<string, unknown>) => {
                        if (!userPlaylists[playlist.id as string]) {
                            userPlaylists[playlist.id as string] = {
                                id: playlist.id,
                                name: playlist.name,
                                cover: playlist.cover || null,
                                tracks: playlist.tracks ? (playlist.tracks as Record<string, unknown>[]).map((t: Record<string, unknown>) => this._minifyItem('track', t)) : [],
                                createdAt: playlist.createdAt || Date.now(),
                                updatedAt: playlist.updatedAt || Date.now(),
                                numberOfTracks: playlist.tracks ? (playlist.tracks as unknown[]).length : 0,
                                images: playlist.images || [],
                                isPublic: playlist.isPublic || false,
                            };
                            needsUpdate = true;
                        }
                    });

                    localData.userFolders.forEach((folder: Record<string, unknown>) => {
                        if (!userFolders[folder.id as string]) {
                            userFolders[folder.id as string] = {
                                id: folder.id,
                                name: folder.name,
                                cover: folder.cover || null,
                                playlists: folder.playlists || [],
                                createdAt: folder.createdAt || Date.now(),
                                updatedAt: folder.updatedAt || Date.now(),
                            };
                            needsUpdate = true;
                        }
                    });

                    if (history.length === 0 && localData.history.length > 0) {
                        history = localData.history;
                        needsUpdate = true;
                    }

                    if (needsUpdate) {
                        await this._updateUserJSON(user.$id, 'library', library);
                        await this._updateUserJSON(user.$id, 'user_playlists', userPlaylists);
                        await this._updateUserJSON(user.$id, 'user_folders', userFolders);
                        await this._updateUserJSON(user.$id, 'history', history);
                    }

                    const convertedData = {
                        favorites_tracks: Object.values(library.tracks).filter((t) => t && typeof t === 'object'),
                        favorites_albums: Object.values(library.albums).filter((a) => a && typeof a === 'object'),
                        favorites_artists: Object.values(library.artists).filter((a) => a && typeof a === 'object'),
                        favorites_playlists: Object.values(library.playlists).filter((p) => p && typeof p === 'object'),
                        favorites_mixes: Object.values(library.mixes).filter((m) => m && typeof m === 'object'),
                        history_tracks: history,
                        user_playlists: Object.values(userPlaylists).filter((p) => p && typeof p === 'object'),
                        user_folders: Object.values(userFolders).filter((f) => f && typeof f === 'object'),
                    };

                    await database.importData(convertedData);
                    await new Promise((resolve) => setTimeout(resolve, 300));

                    window.dispatchEvent(new CustomEvent('library-changed'));
                    window.dispatchEvent(new CustomEvent('history-changed'));
                    window.dispatchEvent(new HashChangeEvent('hashchange'));

                    console.log('[PocketBase] ✓ Sync completed');
                }
            } catch (error) {
                console.error('[PocketBase] Sync error:', error);
            } finally {
                this._isSyncing = false;
            }
        } else {
            this._userRecordCache = null;
            this._isSyncing = false;
        }
    },
};

if (pb) {
    authManager.onAuthStateChanged(syncManager.onAuthStateChanged.bind(syncManager));
}

export { pb, syncManager };
