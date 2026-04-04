/**
 * Mobile Library - Persistent comic storage using IndexedDB
 * For browsers without File System Access API support (iOS, Safari, Firefox, etc.)
 */
const MobileLibrary = (() => {
    const DB_NAME = 'MobileComicLibraryDB';
    const DB_VERSION = 1;
    const STORE_NAME = 'comics';
    let db = null;

    function openDB() {
        return new Promise((resolve, reject) => {
            if (db) { resolve(db); return; }
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => { db = request.result; resolve(db); };
            request.onupgradeneeded = (event) => {
                const database = event.target.result;
                if (!database.objectStoreNames.contains(STORE_NAME)) {
                    database.createObjectStore(STORE_NAME, { keyPath: 'filename' });
                }
            };
        });
    }

    async function init() {
        await openDB();
        if (navigator.storage && navigator.storage.persist) {
            try { await navigator.storage.persist(); } catch (e) { /* best-effort */ }
        }
    }

    async function importComic(file) {
        const database = await openDB();
        const arrayBuffer = await file.arrayBuffer();
        const record = {
            filename: file.name,
            size: file.size,
            lastModified: file.lastModified,
            data: arrayBuffer,
            importedAt: Date.now()
        };
        return new Promise((resolve, reject) => {
            const tx = database.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            store.put(record);
            tx.oncomplete = () => resolve(record);
            tx.onerror = () => reject(tx.error);
        });
    }

    async function isDuplicate(file) {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const tx = database.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(file.name);
            request.onsuccess = () => {
                const existing = request.result;
                if (!existing) { resolve({ isDuplicate: false }); return; }
                resolve({
                    isDuplicate: true,
                    isIdentical: existing.size === file.size && existing.lastModified === file.lastModified
                });
            };
            request.onerror = () => reject(request.error);
        });
    }

    async function listComics() {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const tx = database.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.getAll();
            request.onsuccess = () => {
                resolve(request.result.map(r => ({
                    filename: r.filename,
                    size: r.size,
                    lastModified: r.lastModified,
                    importedAt: r.importedAt
                })));
            };
            request.onerror = () => reject(request.error);
        });
    }

    async function getComicFile(filename) {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const tx = database.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(filename);
            request.onsuccess = () => {
                const record = request.result;
                if (!record) { reject(new Error('Comic not found: ' + filename)); return; }
                resolve(new File([record.data], record.filename, {
                    type: 'application/octet-stream',
                    lastModified: record.lastModified
                }));
            };
            request.onerror = () => reject(request.error);
        });
    }

    async function deleteComic(filename) {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const tx = database.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            store.delete(filename);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async function clearAll() {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const tx = database.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            store.clear();
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async function getComicCount() {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const tx = database.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.count();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async function getStorageEstimate() {
        if (navigator.storage && navigator.storage.estimate) {
            const est = await navigator.storage.estimate();
            return { usage: est.usage || 0, quota: est.quota || 0 };
        }
        return null;
    }

    function formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    return {
        init,
        importComic,
        isDuplicate,
        listComics,
        getComicFile,
        deleteComic,
        clearAll,
        getComicCount,
        getStorageEstimate,
        formatBytes
    };
})();
