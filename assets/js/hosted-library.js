/**
 * Hosted Library - Fetch comics from the Mangas/ folder served alongside the app.
 * Reads Mangas/library.json for the comic manifest, fetches CBZ/CBR/CBT files via HTTP.
 * Works on every browser — no special APIs needed.
 */
const HostedLibrary = (() => {
    const MANIFEST_PATH = 'Mangas/library.json';
    let manifest = null;
    let comicPathMap = new Map();

    async function loadManifest() {
        try {
            const resp = await fetch(MANIFEST_PATH, { cache: 'no-cache' });
            if (!resp.ok) return null;
            manifest = await resp.json();
            buildPathMap();
            return manifest;
        } catch (err) {
            console.warn('Could not load hosted library manifest:', err);
            return null;
        }
    }

    function buildPathMap() {
        comicPathMap = new Map();
        if (!manifest || !manifest.series) return;
        for (const series of manifest.series) {
            const folder = series.folder || series.title;
            for (const chapter of (series.chapters || [])) {
                const path = `Mangas/${folder}/${chapter}`;
                comicPathMap.set(chapter, path);
            }
        }
    }

    function listSeries() {
        if (!manifest || !manifest.series) return [];
        return manifest.series;
    }

    function listAllChapters() {
        if (!manifest || !manifest.series) return [];
        const all = [];
        for (const series of manifest.series) {
            for (const chapter of (series.chapters || [])) {
                all.push(chapter);
            }
        }
        return all;
    }

    function getComicPath(filename) {
        return comicPathMap.get(filename) || null;
    }

    async function fetchComicFile(filename) {
        const path = getComicPath(filename);
        if (!path) throw new Error('Comic not found in manifest: ' + filename);

        const encodedPath = path.split('/').map(encodeURIComponent).join('/');
        const resp = await fetch(encodedPath);
        if (!resp.ok) {
            throw new Error(`Failed to download "${filename}" (HTTP ${resp.status})`);
        }
        const blob = await resp.blob();
        return new File([blob], filename, { type: blob.type || 'application/octet-stream' });
    }

    function hasComics() {
        return manifest && manifest.series && manifest.series.length > 0 &&
            manifest.series.some(s => s.chapters && s.chapters.length > 0);
    }

    return {
        loadManifest,
        listSeries,
        listAllChapters,
        getComicPath,
        fetchComicFile,
        hasComics
    };
})();
