//js/cache.js

interface CacheOptions {
    maxSize?: number;
    ttl?: number;
}

interface CacheEntry {
    key: string;
    data: unknown;
    timestamp: number;
}

export class APICache {
    memoryCache: Map<string, CacheEntry>;
    maxSize: number;
    ttl: number;
    dbName: string;
    dbVersion: number;
    db: IDBDatabase | null;

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
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
                const db = (event.target as IDBOpenDBRequest).result;

                if (!db.objectStoreNames.contains('responses')) {
                    const store = db.createObjectStore('responses', { keyPath: 'key' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    generateKey(type: string, params: unknown): string {
        const paramString = typeof params === 'object' ? JSON.stringify(params) : String(params);
        return `${type}:${paramString}`;
    }

    async get(type: string, params: unknown): Promise<unknown | null> {
        const key = this.generateKey(type, params);

        if (this.memoryCache.has(key)) {
            const cached = this.memoryCache.get(key);
            if (Date.now() - cached.timestamp < this.ttl) {
                return cached.data;
            }
            this.memoryCache.delete(key);
        }

        if (this.db) {
            try {
                const cached = await this.getFromIndexedDB(key);
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
        const key = this.generateKey(type, params);
        const entry = {
            key,
            data,
            timestamp: Date.now(),
        };

        this.memoryCache.set(key, entry);

        if (this.memoryCache.size > this.maxSize) {
            const firstKey = this.memoryCache.keys().next().value;
            this.memoryCache.delete(firstKey);
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

            const transaction = this.db.transaction(['responses'], 'readonly');
            const store = transaction.objectStore('responses');
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }

    setInIndexedDB(entry: CacheEntry): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (!this.db) {
                resolve();
                return;
            }

            const transaction = this.db.transaction(['responses'], 'readwrite');
            const store = transaction.objectStore('responses');
            const request = store.put(entry);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async clear(): Promise<void> {
        this.memoryCache.clear();

        if (this.db) {
            return new Promise<void>((resolve, reject) => {
                const transaction = this.db.transaction(['responses'], 'readwrite');
                const store = transaction.objectStore('responses');
                const request = store.clear();

                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }
    }

    async clearExpired(): Promise<void> {
        const now = Date.now();
        const expired = [];

        for (const [key, entry] of this.memoryCache.entries()) {
            if (now - entry.timestamp >= this.ttl) {
                expired.push(key);
            }
        }

        expired.forEach((key) => this.memoryCache.delete(key));

        if (this.db) {
            try {
                const transaction = this.db.transaction(['responses'], 'readwrite');
                const store = transaction.objectStore('responses');
                const index = store.index('timestamp');
                const range = IDBKeyRange.upperBound(now - this.ttl);
                const request = index.openCursor(range);

                request.onsuccess = (event: Event) => {
                    const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
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

    getCacheStats(): { memoryEntries: number; maxSize: number; ttl: number } {
        return {
            memoryEntries: this.memoryCache.size,
            maxSize: this.maxSize,
            ttl: this.ttl,
        };
    }
}
