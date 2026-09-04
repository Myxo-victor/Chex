/**
 * SnapDB.js — Lightweight High-Performance IndexedDB Cache Library (v1.1 Production Hardened)
 * @author: Myxo victor
 * 
 * A framework-free, dependency-free, vanilla JavaScript micro-library providing 
 * a streamlined, promise-based caching layer over IndexedDB with robust TTL enforcement, 
 * atomic sync/upsert operations, stale record garbage collection, deterministic primary key resolution, 
 * connection auto-recovery, and a precise query engine.
 */
(function (global) {
    'use strict';

    const STORE_NAME = 'cached_records';
    const DB_VERSION = 1;

    class SnapDB {
        /**
         * Initializes the SnapDB instance and sets up the underlying IndexedDB connection.
         * The constructor is idempotent and immediately triggers asynchronous database opening,
         * exposing a `ready` promise to coordinate concurrency without race conditions.
         * 
         * @param {string} dbName - The unique name of the IndexedDB database.
         */
        constructor(dbName) {
            if (!dbName || typeof dbName !== 'string' || dbName.trim() === '') {
                throw new Error('SnapDB: constructor requires a valid, non-empty database name string.');
            }

            this.dbName = dbName.trim();
            this.db = null;
            this._isConnecting = false;
            
            // Internal initialization promise to safeguard all asynchronous operations
            this.ready = this._initDatabase();
        }

        /**
         * Opens the IndexedDB connection safely, handling version upgrades, connection dropouts, 
         * version changes, and error states.
         * 
         * @private
         * @returns {Promise<IDBDatabase>}
         */
        _initDatabase() {
            return new Promise((resolve, reject) => {
                if (typeof indexedDB === 'undefined') {
                    return reject(new Error('SnapDB: IndexedDB is not supported in this browser environment.'));
                }

                if (this.db) {
                    return resolve(this.db);
                }

                const request = indexedDB.open(this.dbName, DB_VERSION);

                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        db.createObjectStore(STORE_NAME);
                    }
                };

                request.onsuccess = (event) => {
                    this.db = event.target.result;
                    this._isConnecting = false;

                    // Handle unexpected database closure or connection termination gracefully
                    this.db.onclose = () => {
                        this.db = null;
                    };

                    // Handle other tabs requesting a version upgrade on this database
                    this.db.onversionchange = () => {
                        if (this.db) {
                            this.db.close();
                            this.db = null;
                        }
                    };

                    this.db.onerror = () => {
                        // Silent catch for database level errors; transactions report individually
                    };

                    resolve(this.db);
                };

                request.onerror = (event) => {
                    this._isConnecting = false;
                    reject(new Error(`SnapDB: database initialization failed: ${event.target.error ? event.target.error.message : 'Unknown error'}`));
                };

                request.onblocked = () => {
                    this._isConnecting = false;
                    reject(new Error('SnapDB: Database opening was blocked by an older open connection in another tab.'));
                };
            });
        }

        /**
         * Ensures an active, healthy database connection exists. If the connection was closed 
         * unexpectedly, it transparently reconnects without requiring manual re-instantiation.
         * 
         * @private
         * @returns {Promise<IDBDatabase>}
         */
        async _ensureConnection() {
            if (this.db) {
                return this.db;
            }
            if (!this._isConnecting) {
                this._isConnecting = true;
                this.ready = this._initDatabase();
            }
            return await this.ready;
        }

        /**
         * Determines a reliable, deterministic primary record key for a given data object.
         * Strategy:
         * 1. Checks explicit unique identifier fields in strict precedence: `id`, `_id`, `uuid`.
         * 2. Fallback strategy for objects lacking an explicit ID: Computes a deterministic string hash 
         *    derived from the record's serialized properties, ensuring identical records yield identical keys 
         *    across sync cycles without silent duplicate generation.
         * 
         * @private
         * @param {Object} record - The record object.
         * @returns {string|number} The unique deterministic key.
         */
        _resolveKey(record) {
            if (record && typeof record === 'object') {
                if (record.id !== undefined && record.id !== null && record.id !== '') {
                    return record.id;
                }
                if (record._id !== undefined && record._id !== null && record._id !== '') {
                    return record._id;
                }
                if (record.uuid !== undefined && record.uuid !== null && record.uuid !== '') {
                    return record.uuid;
                }
            }

            // Deterministic hash fallback for records without an explicit primary key
            const stableString = JSON.stringify(record, Object.keys(record).sort());
            let hash = 0;
            for (let i = 0; i < stableString.length; i++) {
                const char = stableString.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash |= 0; // Convert to 32bit integer
            }
            return `__snap_hash_${Math.abs(hash)}`;
        }

        /**
         * Synchronizes a batch of records into the cache with a specified TTL,
         * performing atomic stale record cleanup and upserts within a single transaction.
         * 
         * @param {Array<Object>} dataArray - Array of objects to cache.
         * @param {number} ttlInMinutes - Time-to-live duration in minutes (positive finite number).
         * @returns {Promise<void>}
         */
        async sync(dataArray, ttlInMinutes) {
            await this._ensureConnection();

            if (!Array.isArray(dataArray)) {
                throw new Error('SnapDB: sync() expects an array of objects.');
            }

            if (
                typeof ttlInMinutes !== 'number' ||
                !Number.isFinite(ttlInMinutes) ||
                ttlInMinutes <= 0
            ) {
                throw new Error('SnapDB: invalid TTL. ttlInMinutes must be a positive finite number greater than zero.');
            }

            const expireAt = Date.now() + (ttlInMinutes * 60 * 1000);
            const now = Date.now();

            return new Promise((resolve, reject) => {
                try {
                    // Open a single readwrite transaction for high performance and strict atomicity
                    const transaction = this.db.transaction(STORE_NAME, 'readwrite');
                    const store = transaction.objectStore(STORE_NAME);

                    // 1. Synchronous cursor iteration for deterministic pre-write stale record cleanup
                    const cursorRequest = store.openCursor();

                    cursorRequest.onsuccess = (event) => {
                        const cursor = event.target.result;
                        if (cursor) {
                            const val = cursor.value;
                            if (
                                !val || 
                                typeof val !== 'object' || 
                                !val._meta || 
                                typeof val._meta.expireAt !== 'number' || 
                                val._meta.expireAt <= now
                            ) {
                                cursor.delete();
                            }
                            cursor.continue();
                        }
                    };

                    cursorRequest.onerror = (event) => {
                        reject(new Error(`SnapDB: cursor failure during sync cleanup: ${event.target.error ? event.target.error.message : 'Cursor error'}`));
                    };

                    // 2. Upsert incoming records sequentially inside the same atomic transaction block
                    for (let i = 0; i < dataArray.length; i++) {
                        const record = dataArray[i];
                        if (!record || typeof record !== 'object' || Array.isArray(record)) {
                            continue; // Skip malformed non-object entries safely
                        }

                        const key = this._resolveKey(record);

                        // Use structuredClone for safe, deep cloning without caller mutation
                        let clonedRecord;
                        try {
                            clonedRecord = typeof structuredClone === 'function' 
                                ? structuredClone(record) 
                                : JSON.parse(JSON.stringify(record));
                        } catch (cloneErr) {
                            clonedRecord = JSON.parse(JSON.stringify(record));
                        }

                        clonedRecord._meta = { expireAt };
                        store.put(clonedRecord, key);
                    }

                    transaction.oncomplete = () => {
                        resolve();
                    };

                    transaction.onerror = (event) => {
                        reject(new Error(`SnapDB: transaction failed during sync(): ${event.target.error ? event.target.error.message : 'Transaction error'}`));
                    };

                    transaction.onabort = () => {
                        reject(new Error('SnapDB: transaction was aborted during sync().'));
                    };

                } catch (err) {
                    reject(new Error(`SnapDB: sync() execution error: ${err.message}`));
                }
            });
        }

        /**
         * Queries the cached records using strict primitive and multi-value array matching (AND semantics),
         * automatically discarding expired or malformed records.
         * 
         * @param {Object} filterCriteria - Key-value criteria object for filtering.
         * @returns {Promise<Array<Object>>} Matching records (stripped of internal _meta data).
         */
        async query(filterCriteria = {}) {
            await this._ensureConnection();

            if (!filterCriteria || typeof filterCriteria !== 'object' || Array.isArray(filterCriteria)) {
                throw new Error('SnapDB: query() expects a filter criteria object.');
            }

            const now = Date.now();
            const keysToRemove = [];
            const results = [];

            return new Promise((resolve, reject) => {
                try {
                    // Use a readonly transaction for high-performance query scanning
                    const transaction = this.db.transaction(STORE_NAME, 'readonly');
                    const store = transaction.objectStore(STORE_NAME);
                    const request = store.openCursor();

                    request.onsuccess = (event) => {
                        const cursor = event.target.result;
                        if (cursor) {
                            const record = cursor.value;

                            // Validate record structure and expiration status
                            if (
                                !record || 
                                typeof record !== 'object' || 
                                !record._meta || 
                                typeof record._meta.expireAt !== 'number'
                            ) {
                                // Mark malformed record for background cleanup
                                keysToRemove.push(cursor.primaryKey);
                                cursor.continue();
                                return;
                            }

                            if (record._meta.expireAt <= now) {
                                // Mark expired record for background cleanup
                                keysToRemove.push(cursor.primaryKey);
                                cursor.continue();
                                return;
                            }

                            // Evaluate filter criteria against valid unexpired record
                            if (this._matchesCriteria(record, filterCriteria)) {
                                const cleanRecord = { ...record };
                                delete cleanRecord._meta;
                                results.push(cleanRecord);
                            }

                            cursor.continue();
                        }
                    };

                    request.onerror = (event) => {
                        reject(new Error(`SnapDB: query() failed to read records: ${event.target.error ? event.target.error.message : 'Cursor error'}`));
                    };

                    transaction.oncomplete = () => {
                        // Asynchronous non-blocking background cleanup of expired/malformed records
                        if (keysToRemove.length > 0) {
                            this._backgroundCleanup(keysToRemove).catch(() => {});
                        }
                        resolve(results);
                    };

                    transaction.onerror = (event) => {
                        reject(new Error(`SnapDB: transaction failed during query(): ${event.target.error ? event.target.error.message : 'Transaction error'}`));
                    };

                } catch (err) {
                    reject(new Error(`SnapDB: query() execution error: ${err.message}`));
                }
            });
        }

        /**
         * Performs asynchronous background deletion of expired or malformed keys.
         * 
         * @private
         * @param {Array<string|number>} keys - Array of primary keys to purge.
         * @returns {Promise<void>}
         */
        async _backgroundCleanup(keys) {
            try {
                await this._ensureConnection();
                const transaction = this.db.transaction(STORE_NAME, 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                keys.forEach(k => store.delete(k));
            } catch (e) {
                // Background cleanup failure is non-fatal for query results
            }
        }

        /**
         * Evaluates whether a stored record satisfies all filter criteria using strict 
         * primitive equality and array subset (ALL/AND) semantics.
         * 
         * @private
         * @param {Object} record - Stored record object.
         * @param {Object} criteria - Filter criteria object.
         * @returns {boolean} True if the record matches all criteria.
         */
        _matchesCriteria(record, criteria) {
            const criteriaKeys = Object.keys(criteria);
            if (criteriaKeys.length === 0) return true;

            for (let i = 0; i < criteriaKeys.length; i++) {
                const key = criteriaKeys[i];
                const expectedValue = criteria[key];
                const actualValue = record[key];

                // Case 1: Both expected and actual values are Arrays -> Array ALL matching (subset semantics)
                if (Array.isArray(expectedValue) && Array.isArray(actualValue)) {
                    const allPresent = expectedValue.every(item => actualValue.includes(item));
                    if (!allPresent) return false;
                }
                // Case 2: Expected value is Array, but actual value is not (mismatch)
                else if (Array.isArray(expectedValue) && !Array.isArray(actualValue)) {
                    return false;
                }
                // Case 3: Actual value is Array, but expected filter value is primitive -> Array includes check
                else if (!Array.isArray(expectedValue) && Array.isArray(actualValue)) {
                    if (!actualValue.includes(expectedValue)) {
                        return false;
                    }
                }
                // Case 4: Primitive values -> Strict exact equality matching
                else {
                    if (actualValue !== expectedValue) {
                        return false;
                    }
                }
            }

            return true;
        }

        /**
         * Checks whether the current cache contains valid, unexpired records.
         * Returns true ONLY when the cache contains records and at least one record 
         * has a valid unexpired timestamp in the future.
         * 
         * @returns {Promise<boolean>} True if cache has at least one valid unexpired record.
         */
        async isCacheValid() {
            await this._ensureConnection();
            const now = Date.now();

            return new Promise((resolve, reject) => {
                try {
                    const transaction = this.db.transaction(STORE_NAME, 'readonly');
                    const store = transaction.objectStore(STORE_NAME);
                    const request = store.openCursor();

                    let hasValidRecord = false;

                    request.onsuccess = (event) => {
                        const cursor = event.target.result;
                        if (cursor) {
                            const record = cursor.value;
                            if (
                                record && 
                                typeof record === 'object' && 
                                record._meta && 
                                typeof record._meta.expireAt === 'number' && 
                                record._meta.expireAt > now
                            ) {
                                hasValidRecord = true;
                                return resolve(true); // Short-circuit on first valid record found
                            }
                            cursor.continue();
                        } else {
                            resolve(hasValidRecord);
                        }
                    };

                    request.onerror = (event) => {
                        reject(new Error(`SnapDB: isCacheValid() failed: ${event.target.error ? event.target.error.message : 'Cursor error'}`));
                    };

                } catch (err) {
                    reject(new Error(`SnapDB: isCacheValid() execution error: ${err.message}`));
                }
            });
        }
    }

    // Expose SnapDB globally to the browser window
    global.SnapDB = SnapDB;

})(typeof window !== 'undefined' ? window : this);


/*
----------------------------
How to use this library - Myxo victor
----------------------------
the api code for this library



document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize SnapDB and wait for the connection to open[cite: 3]
    const db = new SnapDB('my_app_cache');
    await db.ready;

    try {
        // 2. Fetch real data directly from your backend API/database endpoint
        const response = await fetch('https://api.yourdomain.com/v1/users');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Parse the JSON response (assumes the API returns an array of user objects)
        const realApiData = await response.json();

        // 3. Replace the hardcoded array with your real API data inside db.sync()[cite: 3]
        await db.sync(realApiData, 15);
        console.log('Real API data successfully synced into SnapDB.');

        // 4. Query or use the cached data normally[cite: 3]
        const developers = await db.query({ role: 'developer' });
        console.log('Queried developers from real data:', developers);

    } catch (err) {
        console.error('Failed to fetch and cache API data:', err);
    }
});


*/
