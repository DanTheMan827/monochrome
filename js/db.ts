type FavoriteType = 'track' | 'album' | 'artist' | 'playlist' | 'mix';
type PinnableType = 'album' | 'artist' | 'playlist' | 'user-playlist';

interface DBRecord {
    id?: string | number;
    uuid?: string | number;
    addedAt?: number | null;
    timestamp?: number;
    title?: string | null;
    name?: string | null;
    duration?: number | null;
    explicit?: boolean;
    artist?: { id?: string | number; name?: string | null; [key: string]: unknown } | null;
    artists?: Array<{ id: string | number; name?: string | null; [key: string]: unknown }>;
    album?: {
        id?: string | number;
        title?: string | null;
        cover?: string | null;
        releaseDate?: string | null;
        vibrantColor?: string | null;
        artist?: { id?: string | number; name?: string | null; [key: string]: unknown } | null;
        numberOfTracks?: number | null;
        mediaMetadata?: { tags?: string[] } | null;
        [key: string]: unknown;
    } | null;
    cover?: string | null;
    image?: string | null;
    squareImage?: string | null;
    picture?: string | null;
    copyright?: string | null;
    isrc?: string | null;
    trackNumber?: number | null;
    streamStartDate?: string | null;
    version?: string | null;
    mixes?: Record<string, unknown> | null;
    isTracker?: boolean;
    trackerInfo?: unknown;
    audioUrl?: string | null;
    remoteUrl?: string | null;
    audioQuality?: string | null;
    mediaMetadata?: { tags?: string[] } | null;
    releaseDate?: string | null;
    type?: string | null;
    numberOfTracks?: number | null;
    subTitle?: string;
    description?: string;
    mixType?: string;
    tracks?: DBRecord[];
    user?: { name?: string | null; [key: string]: unknown } | null;
    images?: string[];
    createdAt?: number;
    updatedAt?: number;
    playlists?: string[];
    [key: string]: unknown;
}

interface PinnedRecord {
    id: string | number;
    type: string;
    name: string | null | undefined;
    cover: string | null | undefined;
    images?: string[];
    href: string;
    pinnedAt?: number;
}

interface ImportDataShape {
    favorites_tracks?: DBRecord[] | Record<string, DBRecord>;
    favorites_albums?: DBRecord[] | Record<string, DBRecord>;
    favorites_artists?: DBRecord[] | Record<string, DBRecord>;
    favorites_playlists?: DBRecord[] | Record<string, DBRecord>;
    favorites_mixes?: DBRecord[] | Record<string, DBRecord>;
    history_tracks?: DBRecord[] | Record<string, DBRecord>;
    user_playlists?: DBRecord[] | Record<string, DBRecord>;
    user_folders?: DBRecord[] | Record<string, DBRecord>;
    [key: string]: unknown;
}

export class MusicDatabase {
    dbName: string;
    version: number;
    db: IDBDatabase | null;

    constructor() {
        this.dbName = 'MonochromeDB';
        this.version = 8;
        this.db = null;
    }

    async open(): Promise<IDBDatabase> {
        if (this.db) return this.db;

        return new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error('Database error:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = () => {
                const db = request.result;

                // Favorites stores
                if (!db.objectStoreNames.contains('favorites_tracks')) {
                    const store = db.createObjectStore('favorites_tracks', { keyPath: 'id' });
                    store.createIndex('addedAt', 'addedAt', { unique: false });
                }
                if (!db.objectStoreNames.contains('favorites_albums')) {
                    const store = db.createObjectStore('favorites_albums', { keyPath: 'id' });
                    store.createIndex('addedAt', 'addedAt', { unique: false });
                }
                if (!db.objectStoreNames.contains('favorites_artists')) {
                    const store = db.createObjectStore('favorites_artists', { keyPath: 'id' });
                    store.createIndex('addedAt', 'addedAt', { unique: false });
                }
                if (!db.objectStoreNames.contains('favorites_playlists')) {
                    const store = db.createObjectStore('favorites_playlists', { keyPath: 'uuid' });
                    store.createIndex('addedAt', 'addedAt', { unique: false });
                }
                if (!db.objectStoreNames.contains('favorites_mixes')) {
                    const store = db.createObjectStore('favorites_mixes', { keyPath: 'id' });
                    store.createIndex('addedAt', 'addedAt', { unique: false });
                }
                if (!db.objectStoreNames.contains('history_tracks')) {
                    const store = db.createObjectStore('history_tracks', { keyPath: 'timestamp' });
                    store.createIndex('timestamp', 'timestamp', { unique: true });
                }
                if (!db.objectStoreNames.contains('user_playlists')) {
                    const store = db.createObjectStore('user_playlists', { keyPath: 'id' });
                    store.createIndex('createdAt', 'createdAt', { unique: false });
                }
                if (!db.objectStoreNames.contains('user_folders')) {
                    const store = db.createObjectStore('user_folders', { keyPath: 'id' });
                    store.createIndex('createdAt', 'createdAt', { unique: false });
                }
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings');
                }
                if (!db.objectStoreNames.contains('pinned_items')) {
                    const store = db.createObjectStore('pinned_items', { keyPath: 'id' });
                    store.createIndex('pinnedAt', 'pinnedAt', { unique: false });
                }
            };
        });
    }

    // Generic Helper
    async performTransaction<T = unknown>(storeName: string, mode: IDBTransactionMode, callback: (store: IDBObjectStore) => IDBRequest): Promise<T | undefined> {
        const db = await this.open();
        return new Promise<T | undefined>((resolve, reject) => {
            const transaction = db.transaction(storeName, mode);
            const store = transaction.objectStore(storeName);
            const request = callback(store);

            transaction.oncomplete = () => {
                resolve(request?.result as T | undefined);
            };
            transaction.onerror = () => {
                reject(transaction.error);
            };
        });
    }

    // History API
    async addToHistory(track: DBRecord): Promise<DBRecord> {
        const storeName = 'history_tracks';
        const minified = this._minifyItem('track', track);
        const timestamp = Date.now();
        const entry: DBRecord = { ...minified, timestamp };

        const db = await this.open();

        return new Promise<DBRecord>((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const index = store.index('timestamp');

            // Check the most recent entry
            const cursorReq = index.openCursor(null, 'prev');

            cursorReq.onsuccess = () => {
                const cursor = cursorReq.result;
                if (cursor) {
                    const lastTrack = cursor.value as DBRecord;
                    if (lastTrack.id === track.id) {
                        // If same track, delete the old entry so we just update the timestamp
                        store.delete(cursor.primaryKey);
                    }
                }
                // Add the new entry
                store.put(entry);
            };

            cursorReq.onerror = () => {
                // If cursor fails, just try to put (fallback)
                store.put(entry);
            };

            transaction.oncomplete = () => resolve(entry);
            transaction.onerror = () => reject(transaction.error);
        });
    }

    async getHistory(): Promise<DBRecord[]> {
        const storeName = 'history_tracks';
        const db = await this.open();
        return new Promise<DBRecord[]>((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index('timestamp');
            const request = index.getAll();

            request.onsuccess = () => {
                // Return reversed (newest first)
                resolve(request.result.reverse());
            };
            request.onerror = () => reject(request.error);
        });
    }

    async clearHistory(): Promise<void> {
        const storeName = 'history_tracks';
        const db = await this.open();
        return new Promise<void>((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Favorites API
    async toggleFavorite(type: FavoriteType, item: DBRecord): Promise<boolean> {
        const plural = type === 'mix' ? 'mixes' : `${type}s`;
        const storeName = `favorites_${plural}`;
        const key = type === 'playlist' ? item.uuid : item.id;
        const exists = await this.isFavorite(type, key as string | number);

        if (exists) {
            await this.performTransaction(storeName, 'readwrite', (store) => store.delete(key as IDBValidKey));
            return false; // Removed
        } else {
            const minified = this._minifyItem(type, item);
            const entry: DBRecord = { ...minified, addedAt: Date.now() };
            await this.performTransaction(storeName, 'readwrite', (store) => store.put(entry));
            return true; // Added
        }
    }

    async isFavorite(type: FavoriteType, id: string | number): Promise<boolean> {
        const plural = type === 'mix' ? 'mixes' : `${type}s`;
        const storeName = `favorites_${plural}`;
        try {
            const result = await this.performTransaction(storeName, 'readonly', (store) => store.get(id));
            return !!result;
        } catch {
            return false;
        }
    }

    async getFavorites(type: FavoriteType): Promise<DBRecord[]> {
        const plural = type === 'mix' ? 'mixes' : `${type}s`;
        const storeName = `favorites_${plural}`;
        const db = await this.open();
        return new Promise<DBRecord[]>((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);

            const request = store.getAll();

            request.onsuccess = () => {
                const results: DBRecord[] = request.result;
                results.sort((a: DBRecord, b: DBRecord) => {
                    const aTime = a.addedAt || 0;
                    const bTime = b.addedAt || 0;
                    return bTime - aTime; // Newest first
                });
                resolve(results);
            };
            request.onerror = () => reject(request.error);
        });
    }

    _minifyItem(type: FavoriteType, item: DBRecord): DBRecord {
        if (!item) return item;

        // Base properties to keep
        const base = {
            id: item.id,
            addedAt: item.addedAt || null,
        };

        if (type === 'track') {
            return {
                ...base,
                title: item.title || null,
                duration: item.duration || null,
                explicit: item.explicit || false,
                // Keep minimal artist info
                artist: item.artist || (item.artists && item.artists.length > 0 ? item.artists[0] : null) || null,
                artists: item.artists?.map((a: { id: string | number; name?: string | null }) => ({ id: a.id, name: a.name || null })) || [],
                // Keep minimal album info
                album: item.album
                    ? {
                          id: item.album.id,
                          title: item.album.title || null,
                          cover: item.album.cover || null,
                          releaseDate: item.album.releaseDate || null,
                          vibrantColor: item.album.vibrantColor || null,
                          artist: item.album.artist || null,
                          numberOfTracks: item.album.numberOfTracks || null,
                          mediaMetadata: item.album.mediaMetadata ? { tags: item.album.mediaMetadata.tags } : null,
                      }
                    : null,
                copyright: item.copyright || null,
                isrc: item.isrc || null,
                trackNumber: item.trackNumber || null,
                // Fallback date
                streamStartDate: item.streamStartDate || null,
                // Keep version if exists
                version: item.version || null,
                // Keep mix info
                mixes: item.mixes || null,
                isTracker: item.isTracker || !!(item.id && String(item.id).startsWith('tracker-')),
                trackerInfo: item.trackerInfo || null,
                audioUrl: item.remoteUrl || item.audioUrl || null,
                remoteUrl: item.remoteUrl || null,
                audioQuality: item.audioQuality || null,
                mediaMetadata: item.mediaMetadata ? { tags: item.mediaMetadata.tags } : null,
            };
        }

        if (type === 'album') {
            return {
                ...base,
                title: item.title || null,
                cover: item.cover || null,
                releaseDate: item.releaseDate || null,
                explicit: item.explicit || false,
                // UI uses singular 'artist'
                artist: item.artist
                    ? { name: item.artist.name || null, id: item.artist.id }
                    : item.artists?.[0]
                      ? { name: item.artists[0].name || null, id: item.artists[0].id }
                      : null,
                // Keep type and track count for UI labels
                type: item.type || null,
                numberOfTracks: item.numberOfTracks || null,
            };
        }

        if (type === 'artist') {
            return {
                ...base,
                name: item.name || null,
                picture: item.picture || item.image || null, // Handle both just in case
            };
        }

        if (type === 'playlist') {
            return {
                uuid: item.uuid || item.id,
                addedAt: item.addedAt || item.createdAt || null,
                title: item.title || item.name || null,
                // UI checks squareImage || image || uuid
                image: item.image || item.squareImage || item.cover || null,
                numberOfTracks: item.numberOfTracks || (item.tracks ? item.tracks.length : 0),
                user: item.user ? { name: item.user.name || null } : null,
            };
        }

        if (type === 'mix') {
            return {
                id: item.id,
                addedAt: item.addedAt,
                title: item.title,
                subTitle: item.subTitle,
                description: item.description,
                mixType: item.mixType,
                cover: item.cover,
            };
        }

        return item;
    }

    _minifyPinnedItem(item: DBRecord, type: PinnableType): PinnedRecord | null {
        if (!item) return null;

        const id = item.id || item.uuid;
        let name: string | null | undefined, cover: string | null | undefined, href: string, images: string[] | undefined;

        switch (type) {
            case 'album':
                name = item.title;
                cover = item.cover;
                href = `/album/${id}`;
                break;
            case 'artist':
                name = item.name;
                cover = item.picture;
                href = `/artist/${id}`;
                break;
            case 'playlist':
                name = item.title || item.name;
                cover = item.image || item.cover;
                href = `/playlist/${id}`;
                break;
            case 'user-playlist':
                name = item.name;
                cover = item.cover;
                images = item.images;
                href = `/userplaylist/${id}`;
                break;
            default:
                return null;
        }

        return {
            id: id as string | number,
            type: type,
            name: name,
            cover: cover,
            images: images,
            href: href,
        };
    }

    async togglePinned(item: DBRecord, type: PinnableType): Promise<boolean | undefined> {
        const storeName = 'pinned_items';
        const minifiedItem = this._minifyPinnedItem(item, type);
        if (!minifiedItem) return;

        const key = minifiedItem.id;
        const exists = await this.isPinned(key);

        if (exists) {
            await this.performTransaction(storeName, 'readwrite', (store) => store.delete(key as IDBValidKey));
            return false;
        } else {
            const allPinned = await this.getPinned();
            if (allPinned.length >= 3) {
                const oldest = allPinned.sort((a: PinnedRecord, b: PinnedRecord) => (a.pinnedAt ?? 0) - (b.pinnedAt ?? 0))[0];
                await this.performTransaction(storeName, 'readwrite', (store) => store.delete(oldest.id as IDBValidKey));
            }
            const entry: PinnedRecord = { ...minifiedItem, pinnedAt: Date.now() };
            await this.performTransaction(storeName, 'readwrite', (store) => store.put(entry));
            return true;
        }
    }

    async isPinned(id: string | number): Promise<boolean> {
        const storeName = 'pinned_items';
        try {
            const result = await this.performTransaction(storeName, 'readonly', (store) => store.get(id));
            return !!result;
        } catch {
            return false;
        }
    }

    async exportData(): Promise<Record<string, unknown>> {
        const tracks = await this.getFavorites('track');
        const albums = await this.getFavorites('album');
        const artists = await this.getFavorites('artist');
        const playlists = await this.getFavorites('playlist');
        const mixes = await this.getFavorites('mix');
        const history = await this.getHistory();

        const userPlaylists = await this.getPlaylists(true);
        const userFolders = await this.getFolders();
        const data = {
            favorites_tracks: tracks.map((t: DBRecord) => this._minifyItem('track', t)),
            favorites_albums: albums.map((a: DBRecord) => this._minifyItem('album', a)),
            favorites_artists: artists.map((a: DBRecord) => this._minifyItem('artist', a)),
            favorites_playlists: playlists.map((p: DBRecord) => this._minifyItem('playlist', p)),
            favorites_mixes: mixes.map((m: DBRecord) => this._minifyItem('mix', m)),
            history_tracks: history.map((t: DBRecord) => this._minifyItem('track', t)),
            user_playlists: userPlaylists,
            user_folders: userFolders,
        };
        return data;
    }

    async importData(data: ImportDataShape, clear = false): Promise<boolean> {
        const db = await this.open();

        const importStore = async (storeName: string, items: DBRecord[] | Record<string, DBRecord> | undefined): Promise<boolean> => {
            if (items === undefined) return false;

            const itemsArray: DBRecord[] = Array.isArray(items) ? items : Object.values(items || {});

            console.log(`Importing to ${storeName}: ${itemsArray.length} items`);

            if (itemsArray.length === 0) {
                if (clear) {
                    return new Promise<boolean>((resolve, reject) => {
                        const transaction = db.transaction(storeName, 'readwrite');
                        const store = transaction.objectStore(storeName);

                        const countReq = store.count();
                        countReq.onsuccess = () => {
                            if (countReq.result > 0) {
                                store.clear();
                            }
                        };

                        transaction.oncomplete = () => {
                            resolve(countReq.result > 0);
                        };
                        transaction.onerror = () => reject(transaction.error);
                    });
                }
                return false;
            }

            return new Promise<boolean>((resolve, reject) => {
                const transaction = db.transaction(storeName, 'readwrite');
                const store = transaction.objectStore(storeName);

                // force clear on first sync
                console.log(`Clearing ${storeName} to Make Sure Everythings Good`);
                store.clear();

                itemsArray.forEach((item) => {
                    if (item.id && typeof item.id === 'string' && !isNaN(Number(item.id))) {
                        item.id = parseInt(item.id, 10);
                    }
                    if (item.album?.id && typeof item.album.id === 'string' && !isNaN(Number(item.album.id))) {
                        item.album.id = parseInt(item.album.id, 10);
                    }
                    if (item.artists) {
                        item.artists.forEach((artist: { id: string | number; [key: string]: unknown }) => {
                            if (artist.id && typeof artist.id === 'string' && !isNaN(Number(artist.id))) {
                                artist.id = parseInt(artist.id, 10);
                            }
                        });
                    }

                    // Critical: Ensure key exists for IndexedDB store.put()
                    const keyPath = store.keyPath;
                    if (typeof keyPath === 'string' && keyPath && !item[keyPath]) {
                        console.warn(`Item missing keyPath "${keyPath}" in ${storeName}, generating fallback.`);
                        if (keyPath === 'uuid') item.uuid = crypto.randomUUID();
                        else if (keyPath === 'id')
                            item.id = (item.trackId as string | number) || (item.albumId as string | number) || (item.artistId as string | number) || Date.now() + Math.random();
                        else if (keyPath === 'timestamp') item.timestamp = Date.now() + Math.random();
                    }

                    store.put(item);
                });

                transaction.oncomplete = () => {
                    console.log(`${storeName}: Imported ${itemsArray.length} items`);
                    resolve(true);
                };

                transaction.onerror = () => {
                    console.error(`${storeName}: Transaction error:`, transaction.error);
                    reject(transaction.error);
                };
            });
        };

        console.log('Starting import with data:', {
            tracks: Array.isArray(data.favorites_tracks) ? data.favorites_tracks.length : 0,
            albums: Array.isArray(data.favorites_albums) ? data.favorites_albums.length : 0,
            artists: Array.isArray(data.favorites_artists) ? data.favorites_artists.length : 0,
            playlists: Array.isArray(data.favorites_playlists) ? data.favorites_playlists.length : 0,
            mixes: Array.isArray(data.favorites_mixes) ? data.favorites_mixes.length : 0,
            history: Array.isArray(data.history_tracks) ? data.history_tracks.length : 0,
            userPlaylists: Array.isArray(data.user_playlists) ? data.user_playlists.length : 0,
            user_folders: Array.isArray(data.user_folders) ? data.user_folders.length : 0,
        });

        const results = await Promise.all([
            importStore('favorites_tracks', data.favorites_tracks),
            importStore('favorites_albums', data.favorites_albums),
            importStore('favorites_artists', data.favorites_artists),
            importStore('favorites_playlists', data.favorites_playlists),
            importStore('favorites_mixes', data.favorites_mixes),
            importStore('history_tracks', data.history_tracks),
            data.user_playlists ? importStore('user_playlists', data.user_playlists) : Promise.resolve(false),
            data.user_folders ? importStore('user_folders', data.user_folders) : Promise.resolve(false),
        ]);

        console.log('Import results:', results);
        return results.some((r) => r);
    }

    _updatePlaylistMetadata(playlist: DBRecord): DBRecord {
        playlist.numberOfTracks = playlist.tracks ? playlist.tracks.length : 0;

        if (!playlist.cover) {
            const uniqueCovers: string[] = [];
            const seenCovers = new Set<string>();
            const tracks = playlist.tracks || [];
            for (const track of tracks) {
                const cover = track.album?.cover;
                if (cover && !seenCovers.has(cover)) {
                    seenCovers.add(cover);
                    uniqueCovers.push(cover);
                    if (uniqueCovers.length >= 4) break;
                }
            }
            playlist.images = uniqueCovers;
        }
        return playlist;
    }

    _dispatchPlaylistSync(action: string, playlist: DBRecord): void {
        window.dispatchEvent(
            new CustomEvent('sync-playlist-change', {
                detail: { action, playlist },
            })
        );
    }

    // User Playlists API
    async createPlaylist(name: string, tracks: DBRecord[] = [], cover = '', description = ''): Promise<DBRecord> {
        const id = crypto.randomUUID();
        const playlist: DBRecord = {
            id: id,
            name: name,
            tracks: tracks.map((t: DBRecord) => this._minifyItem('track', { ...t, addedAt: Date.now() })),
            cover: cover,
            description: description,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            numberOfTracks: tracks.length,
            images: [], // Initialize images
        };
        this._updatePlaylistMetadata(playlist);
        await this.performTransaction('user_playlists', 'readwrite', (store) => store.put(playlist));

        // TRIGGER SYNC
        this._dispatchPlaylistSync('create', playlist);

        return playlist;
    }

    async addTrackToPlaylist(playlistId: string, track: DBRecord): Promise<DBRecord | undefined> {
        const playlist = await this.performTransaction<DBRecord>('user_playlists', 'readonly', (store) => store.get(playlistId));
        if (!playlist) throw new Error('Playlist not found');
        playlist.tracks = playlist.tracks || [];
        const trackWithDate: DBRecord = { ...track, addedAt: Date.now() };
        const minifiedTrack = this._minifyItem('track', trackWithDate);
        if (playlist.tracks.some((t: DBRecord) => t.id === track.id)) return;
        playlist.tracks.push(minifiedTrack);
        playlist.updatedAt = Date.now();
        this._updatePlaylistMetadata(playlist);
        await this.performTransaction('user_playlists', 'readwrite', (store) => store.put(playlist));

        this._dispatchPlaylistSync('update', playlist);

        return playlist;
    }

    async addTracksToPlaylist(playlistId: string, tracks: DBRecord[]): Promise<DBRecord | undefined> {
        const playlist = await this.performTransaction<DBRecord>('user_playlists', 'readonly', (store) => store.get(playlistId));
        if (!playlist) throw new Error('Playlist not found');
        playlist.tracks = playlist.tracks || [];

        let addedCount = 0;
        for (const track of tracks) {
            if (!playlist.tracks.some((t: DBRecord) => t.id === track.id)) {
                const trackWithDate: DBRecord = { ...track, addedAt: Date.now() };
                playlist.tracks.push(this._minifyItem('track', trackWithDate));
                addedCount++;
            }
        }

        if (addedCount > 0) {
            playlist.updatedAt = Date.now();
            this._updatePlaylistMetadata(playlist);
            await this.performTransaction('user_playlists', 'readwrite', (store) => store.put(playlist));
            this._dispatchPlaylistSync('update', playlist);
        }

        return playlist;
    }

    async removeTrackFromPlaylist(playlistId: string, trackId: string | number): Promise<DBRecord | undefined> {
        const playlist = await this.performTransaction<DBRecord>('user_playlists', 'readonly', (store) => store.get(playlistId));
        if (!playlist) throw new Error('Playlist not found');
        playlist.tracks = playlist.tracks || [];
        playlist.tracks = playlist.tracks.filter((t: DBRecord) => t.id != trackId);
        playlist.updatedAt = Date.now();
        this._updatePlaylistMetadata(playlist);
        await this.performTransaction('user_playlists', 'readwrite', (store) => store.put(playlist));

        this._dispatchPlaylistSync('update', playlist);

        return playlist;
    }

    async deletePlaylist(playlistId: string): Promise<void> {
        await this.performTransaction('user_playlists', 'readwrite', (store) => store.delete(playlistId));

        // TRIGGER SYNC (but for deleting)
        this._dispatchPlaylistSync('delete', { id: playlistId });
    }

    async getPlaylist(playlistId: string): Promise<DBRecord | undefined> {
        return await this.performTransaction('user_playlists', 'readonly', (store) => store.get(playlistId));
    }

    async updatePlaylist(playlist: DBRecord): Promise<DBRecord> {
        playlist.updatedAt = Date.now();
        this._updatePlaylistMetadata(playlist);
        await this.performTransaction('user_playlists', 'readwrite', (store) => store.put(playlist));

        this._dispatchPlaylistSync('update', playlist);

        return playlist;
    }

    async addPlaylistToFolder(folderId: string, playlistId: string): Promise<DBRecord> {
        const folder = await this.getFolder(folderId);
        if (!folder) throw new Error('Folder not found');
        folder.playlists = folder.playlists || [];
        if (!folder.playlists.includes(playlistId)) {
            folder.playlists.push(playlistId);
            folder.updatedAt = Date.now();
            await this.performTransaction('user_folders', 'readwrite', (store) => store.put(folder));
        }
        return folder;
    }

    // User Folders API
    async createFolder(name: string, cover = ''): Promise<DBRecord> {
        const id = crypto.randomUUID();
        const folder: DBRecord = {
            id: id,
            name: name,
            cover: cover,
            playlists: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        await this.performTransaction('user_folders', 'readwrite', (store) => store.put(folder));
        return folder;
    }

    async getFolders(): Promise<DBRecord[]> {
        const db = await this.open();
        return new Promise<DBRecord[]>((resolve, reject) => {
            const transaction = db.transaction('user_folders', 'readonly');
            const store = transaction.objectStore('user_folders');
            const index = store.index('createdAt');
            const request = index.getAll();
            request.onsuccess = () => resolve(request.result.reverse());
            request.onerror = () => reject(request.error);
        });
    }

    async getFolder(id: string): Promise<DBRecord | undefined> {
        return await this.performTransaction('user_folders', 'readonly', (store) => store.get(id));
    }

    async deleteFolder(id: string): Promise<void> {
        await this.performTransaction('user_folders', 'readwrite', (store) => store.delete(id));
    }

    async getPinned(): Promise<PinnedRecord[]> {
        const storeName = 'pinned_items';
        const db = await this.open();
        return new Promise<PinnedRecord[]>((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => {
                const results: PinnedRecord[] = request.result;
                results.sort((a: PinnedRecord, b: PinnedRecord) => (b.pinnedAt ?? 0) - (a.pinnedAt ?? 0));
                resolve(results);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async getPlaylists(includeTracks = false): Promise<DBRecord[]> {
        const db = await this.open();
        return new Promise<DBRecord[]>((resolve, reject) => {
            const transaction = db.transaction('user_playlists', 'readwrite'); // Changed to readwrite for lazy migration
            const store = transaction.objectStore('user_playlists');
            const index = store.index('createdAt');
            const request = index.getAll();
            request.onsuccess = () => {
                const playlists: DBRecord[] = request.result;
                const reversed = playlists.reverse(); // Newest first
                const processedPlaylists = reversed.map((playlist: DBRecord) => {
                    let needsUpdate = false;

                    // Lazy migration for numberOfTracks
                    if (typeof playlist.numberOfTracks === 'undefined') {
                        playlist.numberOfTracks = playlist.tracks ? playlist.tracks.length : 0;
                        needsUpdate = true;
                    }

                    // Lazy migration for images (collage)
                    if (!playlist.cover && (!playlist.images || playlist.images.length === 0)) {
                        this._updatePlaylistMetadata(playlist);
                        needsUpdate = true;
                    }

                    if (needsUpdate) {
                        // We are in a readwrite transaction, so we can put back
                        try {
                            store.put(playlist);
                        } catch (e) {
                            console.warn('Failed to update playlist metadata', e);
                        }
                    }

                    if (includeTracks) {
                        return playlist;
                    }

                    // Return lightweight copy without tracks
                    // eslint-disable-next-line no-unused-vars
                    const { tracks, ...minified } = playlist;
                    return minified;
                });
                resolve(processedPlaylists);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async updatePlaylistName(playlistId: string, newName: string): Promise<DBRecord | undefined> {
        const playlist = await this.performTransaction<DBRecord>('user_playlists', 'readonly', (store) => store.get(playlistId));
        if (!playlist) throw new Error('Playlist not found');
        playlist.name = newName;
        playlist.updatedAt = Date.now();
        await this.performTransaction('user_playlists', 'readwrite', (store) => store.put(playlist));
        return playlist;
    }

    async updatePlaylistDescription(playlistId: string, newDescription: string): Promise<DBRecord | undefined> {
        const playlist = await this.performTransaction<DBRecord>('user_playlists', 'readonly', (store) => store.get(playlistId));
        if (!playlist) throw new Error('Playlist not found');
        playlist.description = newDescription;
        playlist.updatedAt = Date.now();
        await this.performTransaction('user_playlists', 'readwrite', (store) => store.put(playlist));

        this._dispatchPlaylistSync('update', playlist);

        return playlist;
    }

    async updatePlaylistTracks(playlistId: string, tracks: DBRecord[]): Promise<DBRecord> {
        const db = await this.open();
        return new Promise<DBRecord>((resolve, reject) => {
            const transaction = db.transaction('user_playlists', 'readwrite');
            const store = transaction.objectStore('user_playlists');

            const getRequest = store.get(playlistId);
            getRequest.onsuccess = () => {
                const playlist = getRequest.result;
                if (!playlist) {
                    reject(new Error('Playlist not found'));
                    return;
                }
                playlist.tracks = tracks;
                playlist.updatedAt = Date.now();
                this._updatePlaylistMetadata(playlist);
                const putRequest = store.put(playlist);
                putRequest.onsuccess = () => {
                    resolve(playlist);
                };
                putRequest.onerror = () => {
                    reject(putRequest.error);
                };
            };
            getRequest.onerror = () => {
                reject(getRequest.error);
            };

            transaction.onerror = () => {
                reject(transaction.error);
            };
        });
    }

    async saveSetting(key: string, value: unknown): Promise<void> {
        await this.performTransaction('settings', 'readwrite', (store) => store.put(value, key));
    }

    async getSetting(key: string): Promise<unknown> {
        return await this.performTransaction('settings', 'readonly', (store) => store.get(key));
    }
}

export const db = new MusicDatabase();
