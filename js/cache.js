// @ts-check
//js/cache.js

/**
 * A two-tier cache (in-memory + IndexedDB) for API responses.
 * Entries are stored with a timestamp and evicted once they exceed the TTL.
 * The memory cache is also capped at a maximum number of entries (LRU-like,
 * oldest-inserted entry is evicted when the cap is reached).
 */
export class APICache {
    /**
     * Creates a new APICache instance and begins async IndexedDB initialisation.
     *
     * @param {object} [options={}] - Configuration options.
     * @param {number} [options.maxSize=200] - Maximum number of entries to keep in the in-memory cache.
     * @param {number} [options.ttl=1800000] - Time-to-live in milliseconds for each cache entry (default 30 minutes).
     */
    constructor(options = {}) {
        this.memoryCache = new Map();
        this.maxSize = options.maxSize || 200;
        this.ttl = options.ttl || 1000 * 60 * 30;
        this.dbName = 'monochrome-cache';
        this.dbVersion = 1;
        this.db = null;
        this.initDB().catch(console.error);
    }

    /**
     * Opens (or creates) the IndexedDB database used for persistent caching.
     * Creates the `responses` object store with a `timestamp` index on first run.
     * Resolves immediately if `indexedDB` is not available in the current environment.
     *
     * @async
     * @returns {Promise<IDBDatabase|undefined>} The opened database instance, or `undefined` when IndexedDB is unavailable.
     */
    async initDB() {
        if (typeof indexedDB === 'undefined') return;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = /** @type {IDBRequest} */ (event.target).result;

                if (!db.objectStoreNames.contains('responses')) {
                    const store = db.createObjectStore('responses', { keyPath: 'key' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    /**
     * Generates a deterministic cache key from a request type and its parameters.
     *
     * @param {string} type - The category or endpoint identifier (e.g. `"manga"`, `"search"`).
     * @param {Object|string|number} params - The query parameters; objects are JSON-serialised.
     * @returns {string} A colon-separated string of the form `"type:serialisedParams"`.
     */
    generateKey(type, params) {
        const paramString = typeof params === 'object' ? JSON.stringify(params) : String(params);
        return `${type}:${paramString}`;
    }

    /**
     * Retrieves a cached value, checking the in-memory cache first and then IndexedDB.
     * A cache hit in IndexedDB is promoted to the memory cache for faster subsequent reads.
     * Returns `null` when no valid (non-expired) entry is found.
     *
     * @async
     * @param {string} type - The category or endpoint identifier used to build the cache key.
     * @param {Object|string|number} params - The query parameters used to build the cache key.
     * @returns {Promise<*>} The cached data, or `null` if the entry is absent or expired.
     */
    async get(type, params) {
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

    /**
     * Stores a value in both the in-memory cache and IndexedDB.
     * If the memory cache exceeds `maxSize`, the oldest-inserted entry is evicted.
     *
     * @async
     * @param {string} type - The category or endpoint identifier used to build the cache key.
     * @param {Object|string|number} params - The query parameters used to build the cache key.
     * @param {*} data - The data to cache.
     * @returns {Promise<void>}
     */
    async set(type, params, data) {
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

    /**
     * Reads a single entry from the IndexedDB `responses` store by its key.
     * Resolves with `null` when the database is unavailable or the key is not found.
     *
     * @param {string} key - The cache key generated by {@link generateKey}.
     * @returns {Promise<{key: string, data: *, timestamp: number}|null>} The stored cache entry, or `null`.
     */
    getFromIndexedDB(key) {
        return new Promise((resolve, reject) => {
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

    /**
     * Writes (or overwrites) a cache entry in the IndexedDB `responses` store.
     * Resolves immediately when the database is unavailable.
     *
     * @param {{key: string, data: *, timestamp: number}} entry - The cache entry to persist.
     * @returns {Promise<void>}
     */
    setInIndexedDB(entry) {
        return new Promise((resolve, reject) => {
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

    /**
     * Clears all entries from both the in-memory cache and the IndexedDB store.
     *
     * @async
     * @returns {Promise<void>}
     */
    async clear() {
        this.memoryCache.clear();

        if (this.db) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['responses'], 'readwrite');
                const store = transaction.objectStore('responses');
                const request = store.clear();

                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }
    }

    /**
     * Removes all expired entries (older than `ttl`) from the in-memory cache and
     * from the IndexedDB store (via a cursor over the `timestamp` index).
     *
     * @async
     * @returns {Promise<void>}
     */
    async clearExpired() {
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

                request.onsuccess = (event) => {
                    const cursor = /** @type {IDBRequest} */ (event.target).result;
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

    /**
     * Returns a snapshot of current cache statistics.
     *
     * @returns {{ memoryEntries: number, maxSize: number, ttl: number }} An object containing
     *   the number of entries currently in the memory cache, the configured maximum size, and
     *   the configured TTL in milliseconds.
     */
    getCacheStats() {
        return {
            memoryEntries: this.memoryCache.size,
            maxSize: this.maxSize,
            ttl: this.ttl,
        };
    }
}
