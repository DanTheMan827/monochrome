//js/cache.ts

interface CacheEntry {
    key: string;
    data: unknown;
    timestamp: number;
}

interface CacheOptions {
    maxSize?: number;
    ttl?: number;
}

interface CacheStats {
    memoryEntries: number;
    maxSize: number;
    ttl: number;
}

export class APICache {
    private memoryCache: Map<string, CacheEntry>;
    private maxSize: number;
    private ttl: number;
    private dbName: string;
    private dbVersion: number;
    private db: IDBDatabase | null;

    constructor(options: CacheOptions = {}) {
        this.memoryCache = new Map();
        this.maxSize = options.maxSize || 200;
        this.ttl = options.ttl || 1000 * 60 * 30;
        this.dbName = 'monochrome-cache';
        this.dbVersion = 1;
        this.db = null;
        this.initDB();
    }

    async initDB(): Promise<IDBDatabase | void> {
        if (typeof indexedDB === 'undefined') return;

        return new Promise<IDBDatabase>((resolve, reject) => {
            const request: IDBOpenDBRequest = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
                const db: IDBDatabase = (event.target as IDBOpenDBRequest).result;

                if (!db.objectStoreNames.contains('responses')) {
                    const store: IDBObjectStore = db.createObjectStore('responses', { keyPath: 'key' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    generateKey(type: string, params: unknown): string {
        const paramString: string = typeof params === 'object' ? JSON.stringify(params) : String(params);
        return `${type}:${paramString}`;
    }

    async get(type: string, params: unknown): Promise<unknown | null> {
        const key: string = this.generateKey(type, params);

        if (this.memoryCache.has(key)) {
            const cached: CacheEntry | undefined = this.memoryCache.get(key);
            if (cached && Date.now() - cached.timestamp < this.ttl) {
                return cached.data;
            }
            this.memoryCache.delete(key);
        }

        if (this.db) {
            try {
                const cached: CacheEntry | null = await this.getFromIndexedDB(key);
                if (cached && Date.now() - cached.timestamp < this.ttl) {
                    this.memoryCache.set(key, cached);
                    return cached.data;
                }
            } catch (error) {
                console.log('IndexedDB read error:', error);
            }
        }

        return null;
    }

    async set(type: string, params: unknown, data: unknown): Promise<void> {
        const key: string = this.generateKey(type, params);
        const entry: CacheEntry = {
            key,
            data,
            timestamp: Date.now(),
        };

        this.memoryCache.set(key, entry);

        if (this.memoryCache.size > this.maxSize) {
            const firstKey: string | undefined = this.memoryCache.keys().next().value;
            if (firstKey !== undefined) {
                this.memoryCache.delete(firstKey);
            }
        }

        if (this.db) {
            try {
                await this.setInIndexedDB(entry);
            } catch (error) {
                console.log('IndexedDB write error:', error);
            }
        }
    }

    getFromIndexedDB(key: string): Promise<CacheEntry | null> {
        return new Promise<CacheEntry | null>((resolve, reject) => {
            if (!this.db) {
                resolve(null);
                return;
            }

            const transaction: IDBTransaction = this.db.transaction(['responses'], 'readonly');
            const store: IDBObjectStore = transaction.objectStore('responses');
            const request: IDBRequest = store.get(key);

            request.onsuccess = () => resolve((request.result as CacheEntry) || null);
            request.onerror = () => reject(request.error);
        });
    }

    setInIndexedDB(entry: CacheEntry): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (!this.db) {
                resolve();
                return;
            }

            const transaction: IDBTransaction = this.db.transaction(['responses'], 'readwrite');
            const store: IDBObjectStore = transaction.objectStore('responses');
            const request: IDBRequest = store.put(entry);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async clear(): Promise<void> {
        this.memoryCache.clear();

        if (this.db) {
            return new Promise<void>((resolve, reject) => {
                const transaction: IDBTransaction = this.db!.transaction(['responses'], 'readwrite');
                const store: IDBObjectStore = transaction.objectStore('responses');
                const request: IDBRequest = store.clear();

                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }
    }

    async clearExpired(): Promise<void> {
        const now: number = Date.now();
        const expired: string[] = [];

        for (const [key, entry] of this.memoryCache.entries()) {
            if (now - entry.timestamp >= this.ttl) {
                expired.push(key);
            }
        }

        expired.forEach((key: string) => this.memoryCache.delete(key));

        if (this.db) {
            try {
                const transaction: IDBTransaction = this.db.transaction(['responses'], 'readwrite');
                const store: IDBObjectStore = transaction.objectStore('responses');
                const index: IDBIndex = store.index('timestamp');
                const range: IDBKeyRange = IDBKeyRange.upperBound(now - this.ttl);
                const request: IDBRequest = index.openCursor(range);

                request.onsuccess = (event: Event) => {
                    const cursor: IDBCursorWithValue | null = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
                    if (cursor) {
                        cursor.delete();
                        cursor.continue();
                    }
                };
            } catch (error) {
                console.log('Failed to clear expired IndexedDB entries:', error);
            }
        }
    }

    getCacheStats(): CacheStats {
        return {
            memoryEntries: this.memoryCache.size,
            maxSize: this.maxSize,
            ttl: this.ttl,
        };
    }
}
