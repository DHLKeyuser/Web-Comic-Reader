document.addEventListener('DOMContentLoaded', () => {

    const outputElement = document.getElementById('output');
    const progressTextElement = document.querySelector('.progress-text');
    const sePreConElement = document.querySelector('.se-pre-con');
    const currYearElement = document.getElementById('currYear');
    const wrapElement = document.querySelector('.wrap');
    const collapseBtn = document.getElementById('collapseBtn');
    const selectFolderBtn = document.getElementById('selectFolderBtn');
    const quickReadBtn = document.getElementById('quickReadBtn');
    const toggleUploadBtn = document.getElementById('toggleUploadBtn');
    const backToLibraryBtn = document.getElementById('backToLibraryBtn');
    const recentComicsEl = document.getElementById('recentComics');
    const recentComicsListEl = document.getElementById('recentComicsList');
    const allComicsEl = document.getElementById('allComics');
    const allComicsListEl = document.getElementById('allComicsList');
    const dividerOrEl = document.getElementById('dividerOr');
    const dropzoneEl = document.getElementById('dropzone');
    const initialViewEl = document.getElementById('initialView');
    const libraryViewEl = document.getElementById('libraryView');
    const quickReadViewEl = document.getElementById('quickReadView');
    const footerCollapsedTextEl = document.getElementById('footerCollapsedText');
    const browserNoticeEl = document.getElementById('browserNotice');
    const changeFolderBtn = document.getElementById('changeFolderBtn');
    const currentFolderNameEl = document.getElementById('currentFolderName');
    const readerToolbarEl = document.getElementById('readerToolbar');
    const readerMetaEl = document.getElementById('readerMeta');
    const pagedContainerEl = document.getElementById('pagedContainer');
    const pagedImageLinkEl = document.getElementById('pagedImageLink');
    const pagedImageEl = document.getElementById('pagedImage');
    const lightboxLinksEl = document.getElementById('lightboxLinks');
    const scrollContainerEl = document.getElementById('scrollContainer');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const pageIndicatorEl = document.getElementById('pageIndicator');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomLevelEl = document.getElementById('zoomLevel');
    const smartGapToggleEl = document.getElementById('smartGapToggle');
    const modeButtons = document.querySelectorAll('[data-reading-mode]');

    let comicsDirectoryHandle = null;
    let isLibraryMode = false;

    // current year
    currYearElement.innerHTML = (new Date()).getFullYear();

    // check if File System Access API is supported
    const supportsFileSystemAccess = 'showDirectoryPicker' in window;

    if (supportsFileSystemAccess) {
        selectFolderBtn.style.display = 'flex';
        dividerOrEl.style.display = 'block';
    } else {
        // when API not supported, show notice and make quick read button primary
        browserNoticeEl.style.display = 'block';
        quickReadBtn.classList.remove('folder-btn-secondary');
        quickReadBtn.classList.add('folder-btn-primary');
    }

    // Load all the archive formats
    loadArchiveFormats(['rar', 'zip', 'tar']);

    initializeReaderControls();

    // click on collapsed footer to expand
    document.querySelector('.footer-collapsed').addEventListener('click', async () => {
        wrapElement.classList.remove('collapsed');
        if (isLibraryMode && comicsDirectoryHandle) {
            // check permission again when expanding
            const permission = await comicsDirectoryHandle.queryPermission({ mode: 'read' });
            if (permission === 'granted') {
                showLibraryMode();
            } else {
                showReconnectButton();
            }
        } else if (!isLibraryMode) {
            showQuickReadMode();
        } else {
            initialViewEl.style.display = 'block';
            libraryViewEl.style.display = 'none';
            quickReadViewEl.style.display = 'none';
        }
    });

    // click collapse button to hide uploader
    collapseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        wrapElement.classList.add('collapsed');
    });

    // select comics folder
    if (selectFolderBtn) {
        selectFolderBtn.addEventListener('click', async () => {
            try {
                // if we already have a handle, try to request permission first
                if (comicsDirectoryHandle) {
                    const permission = await comicsDirectoryHandle.requestPermission({ mode: 'read' });
                    if (permission === 'granted') {
                        await showLibraryMode();
                        return;
                    }
                }

                // show directory picker
                const dirHandle = await window.showDirectoryPicker({
                    mode: 'read'
                });

                // explicitly request persistent permission
                const permission = await dirHandle.requestPermission({ mode: 'read' });
                if (permission !== 'granted') {
                    console.error('Permission not granted');
                    return;
                }

                comicsDirectoryHandle = dirHandle;
                await saveDirectoryHandle(dirHandle);
                await showLibraryMode();
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Error selecting folder:', err);
                }
            }
        });
    }

    // quick read button
    if (quickReadBtn) {
        quickReadBtn.addEventListener('click', () => {
            showQuickReadMode();
        });
    }

    // toggle upload button
    if (toggleUploadBtn) {
        toggleUploadBtn.addEventListener('click', () => {
            showQuickReadMode();
        });
    }

    // back to library button
    if (backToLibraryBtn) {
        backToLibraryBtn.addEventListener('click', async () => {
            if (comicsDirectoryHandle) {
                const permission = await comicsDirectoryHandle.queryPermission({ mode: 'read' });
                if (permission === 'granted') {
                    await showLibraryMode();
                } else {
                    // need to request permission with user gesture
                    try {
                        const newPermission = await comicsDirectoryHandle.requestPermission({ mode: 'read' });
                        if (newPermission === 'granted') {
                            await showLibraryMode();
                        } else {
                            showReconnectButton();
                        }
                    } catch (err) {
                        console.error('Failed to request permission:', err);
                        showReconnectButton();
                    }
                }
            }
        });
    }

    // change folder button
    if (changeFolderBtn) {
        changeFolderBtn.addEventListener('click', async () => {
            try {
                // always show directory picker to select a new folder
                const dirHandle = await window.showDirectoryPicker({
                    mode: 'read'
                });

                // explicitly request persistent permission
                const permission = await dirHandle.requestPermission({ mode: 'read' });
                if (permission !== 'granted') {
                    console.error('Permission not granted');
                    return;
                }

                comicsDirectoryHandle = dirHandle;
                await saveDirectoryHandle(dirHandle);
                await showLibraryMode();
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Error selecting folder:', err);
                }
            }
        });
    }

    // load directory handle on startup
    if (supportsFileSystemAccess) {
        loadDirectoryHandle().then(async (result) => {
            if (result.handle && result.hasPermission) {
                comicsDirectoryHandle = result.handle;
                await showLibraryMode();
            } else if (result.handle && !result.hasPermission) {
                // we have a handle but need permission - show button to re-grant
                comicsDirectoryHandle = result.handle;
                showReconnectButton();
            }
        });
    }

    function showReconnectButton() {
        // show initial view with modified button text
        initialViewEl.style.display = 'block';
        libraryViewEl.style.display = 'none';
        quickReadViewEl.style.display = 'none';

        // change button text to indicate reconnection
        const titleEl = selectFolderBtn.querySelector('.btn-title');
        const subtitleEl = selectFolderBtn.querySelector('.btn-subtitle');
        if (titleEl && subtitleEl) {
            titleEl.textContent = 'Reconnect to Comics Folder';
            subtitleEl.textContent = 'Click to restore access to your library';
        }
    }

    async function showLibraryMode() {
        if (!comicsDirectoryHandle) return;

        isLibraryMode = true;
        initialViewEl.style.display = 'none';
        libraryViewEl.style.display = 'block';
        quickReadViewEl.style.display = 'none';
        footerCollapsedTextEl.textContent = 'Show library';

        // display current folder name
        if (currentFolderNameEl && comicsDirectoryHandle.name) {
            currentFolderNameEl.innerHTML = `<svg viewBox="0 0 16 16" fill="currentColor"><path d="M1.75 1A1.75 1.75 0 000 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0016 13.25v-8.5A1.75 1.75 0 0014.25 3H7.5a.25.25 0 01-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75z"/></svg>${comicsDirectoryHandle.name}`;
        }

        // reset button text in case it was changed
        const titleEl = selectFolderBtn.querySelector('.btn-title');
        const subtitleEl = selectFolderBtn.querySelector('.btn-subtitle');
        if (titleEl && subtitleEl) {
            titleEl.textContent = 'Select Comics Folder';
            subtitleEl.textContent = 'Auto-track progress, browse all comics';
        }

        await loadRecentComics();
        await loadAllComics();

        if (recentComicsListEl.children.length > 0) {
            recentComicsEl.style.display = 'block';
        }
        allComicsEl.style.display = 'block';
    }

    function showQuickReadMode() {
        isLibraryMode = false;
        initialViewEl.style.display = 'none';
        libraryViewEl.style.display = 'none';
        quickReadViewEl.style.display = 'block';
        footerCollapsedTextEl.textContent = 'Upload another file';

        // reset button text in case it was changed
        const titleEl = selectFolderBtn.querySelector('.btn-title');
        const subtitleEl = selectFolderBtn.querySelector('.btn-subtitle');
        if (titleEl && subtitleEl) {
            titleEl.textContent = 'Select Comics Folder';
            subtitleEl.textContent = 'Auto-track progress, browse all comics';
        }

        // show back to library button only if we have a directory handle
        if (backToLibraryBtn) {
            backToLibraryBtn.style.display = comicsDirectoryHandle ? 'block' : 'none';
        }
    }

    async function loadAllComics() {
        if (!comicsDirectoryHandle) return;

        try {
            // check permission before accessing
            const permission = await comicsDirectoryHandle.queryPermission({ mode: 'read' });
            if (permission !== 'granted') {
                allComicsListEl.innerHTML = '<div style="text-align: center; color: var(--muted); padding: 20px; font-size: 14px;">Permission required to access folder</div>';
                return;
            }

            allComicsListEl.innerHTML = '<div style="text-align: center; padding: 20px;"><div class="spinner" style="margin: 0 auto;"></div><div style="margin-top: 12px; color: var(--muted); font-size: 14px;">Scanning folder...</div></div>';

            const comics = [];
            const validExtensions = ['.cbr', '.cbz', '.cbt'];

            for await (const entry of comicsDirectoryHandle.values()) {
                if (entry.kind === 'file') {
                    const ext = '.' + entry.name.split('.').pop().toLowerCase();
                    if (validExtensions.includes(ext)) {
                        comics.push(entry.name);
                    }
                }
            }

            allComicsListEl.innerHTML = '';

            if (comics.length === 0) {
                allComicsListEl.innerHTML = '<div style="text-align: center; color: var(--muted); padding: 20px; font-size: 14px;">No comics found in this folder. Make sure your comics have .cbr, .cbz, or .cbt extension.</div>';
                return;
            }

            comics.sort();

            // get reading history for thumbnails
            const readingHistory = JSON.parse(localStorage.getItem('comic_reader_userpref') || '{}');

            for (const filename of comics) {
                const comicData = readingHistory[filename];
                const hasThumbnail = comicData?.thumbnail;

                const iconContent = hasThumbnail
                    ? `<img src="${comicData.thumbnail}" alt="" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px;">`
                    : `<svg viewBox="0 0 16 16">
                        <path d="M3.5 2a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 3.5 14h9a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 12.5 2h-9zm6.854 6.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708-.708L8.793 9H5.5a.5.5 0 0 1 0-1h3.293L6.646 5.854a.5.5 0 1 1 .708-.708l3 3z"/>
                    </svg>`;

                const item = document.createElement('div');
                item.className = 'recent-comic-item';
                item.innerHTML = `
                    <div class="recent-comic-icon">
                        ${iconContent}
                    </div>
                    <div class="recent-comic-info">
                        <div class="recent-comic-name">${filename}</div>
                    </div>
                `;
                item.addEventListener('click', () => openComicFromFolder(filename));
                allComicsListEl.appendChild(item);
            }
        } catch (err) {
            console.error('Failed to load all comics:', err);
            
            if (err.name === 'NotFoundError') {
                const folderName = comicsDirectoryHandle ? comicsDirectoryHandle.name : 'directory';
                
                allComicsListEl.innerHTML = '';
                
                const errorWrapper = document.createElement('div');
                errorWrapper.style.textAlign = 'center';
                errorWrapper.style.padding = '40px 20px';
                
                errorWrapper.innerHTML = `
                    <div style="margin-bottom: 10px; color: var(--text);">Failed to load comics from "<strong>${folderName}</strong>"</div>
                    <div style="margin-bottom: 25px; color: var(--muted); font-size: 14px;">The folder might have been moved, renamed, or deleted.</div>
                `;
                
                // Clone the main select button to reuse its exact style
                if (selectFolderBtn) {
                    const btnClone = selectFolderBtn.cloneNode(true);
                    btnClone.id = ''; // Remove ID
                    btnClone.style.display = 'inline-flex';
                    btnClone.style.margin = '0 auto';
                    
                    // Re-attach click handler to trigger original button
                    btnClone.addEventListener('click', () => {
                        selectFolderBtn.click();
                    });
                    
                    errorWrapper.appendChild(btnClone);
                }
                
                allComicsListEl.appendChild(errorWrapper);
                
                // Clear the invalid handle from memory
                comicsDirectoryHandle = null;
            } else {
                allComicsListEl.innerHTML = '<div style="text-align: center; color: var(--muted); padding: 20px; font-size: 14px;">Error loading comics from folder</div>';
            }
        }
    }

    // Dropzone configuration
    if (window.Dropzone) Dropzone.autoDiscover = false;
    let dropzone = new Dropzone("#dropzone", {
        url: '#',
        acceptedFiles: '.cbr,.cbz,.cbt',
        createImageThumbnails: false,
        autoProcessQueue: false,
        previewsContainer: false,
        maxFiles: 1,
        maxfilesexceeded: function(file) {
            this.removeAllFiles();
        },
        init: function () {
            this.on('addedfile', function (file) {
                openComic(file);
            });
        }
    });

    let currentComicFilename = '';
    let lightGalleryInstance = null;
    const READER_MODE_KEY = 'readerMode';
    const SCROLL_ZOOM_KEY = 'scrollZoom';
    const SMART_GAP_KEY = 'scrollSmartGap';
    const SCROLL_ZOOM_MIN = 0.5;
    const SCROLL_ZOOM_MAX = 2;
    const BASE_SCROLL_WIDTH_VW = 90;

    let readingMode = localStorage.getItem(READER_MODE_KEY) === 'scroll' ? 'scroll' : 'paged';
    let scrollZoom = parseFloat(localStorage.getItem(SCROLL_ZOOM_KEY)) || 1;
    scrollZoom = clamp(scrollZoom, SCROLL_ZOOM_MIN, SCROLL_ZOOM_MAX);
    let smartGapEnabled = localStorage.getItem(SMART_GAP_KEY) === 'true';
    let pageUrls = [];
    let pageLinks = [];
    let totalPages = 0;
    let pagesLoaded = 0;
    let currentPageIndex = 0;
    let currentScrollIndex = 0;
    let scrollPageElements = [];
    let scrollEdgeData = [];
    let lazyObserver = null;
    let visibilityObserver = null;
    let visibilityRatios = new Map();
    let scrollModeReady = false;
    let scrollSaveTimeout = null;

    function openComic(file) {
        outputElement.style.display = 'none';
        wrapElement.classList.add('collapsed');
        collapseBtn.classList.add('show');
        currentComicFilename = file.name;
        progressTextElement.innerHTML = "Reading 0/0 pages";
        sePreConElement.style.display = 'block';

        if (readerToolbarEl) {
            readerToolbarEl.style.display = 'none';
        }

        // destroy previous lightGallery instance
        if (lightGalleryInstance) {
            lightGalleryInstance.destroy(true);
            lightGalleryInstance = null;
        }

        // clear previous blobs
        clearBlobs();
        resetReaderView();

        // Open the file as an archive
        archiveOpenFile(file, (archive, err) => {
            if (archive) {
                readContents(archive, archive.file_name);
            } else {
                showReaderError(err);
            }
        });
    }

    function initializeReaderControls() {
        if (smartGapToggleEl) {
            smartGapToggleEl.checked = smartGapEnabled;
        }

        updateModeButtons();
        applyScrollZoom();
        updateZoomControls();

        modeButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                setReadingMode(btn.dataset.readingMode);
            });
        });

        if (prevPageBtn) {
            prevPageBtn.addEventListener('click', () => goToRelativePage(-1));
        }
        if (nextPageBtn) {
            nextPageBtn.addEventListener('click', () => goToRelativePage(1));
        }
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => adjustScrollZoom(-0.1));
        }
        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => adjustScrollZoom(0.1));
        }
        if (smartGapToggleEl) {
            smartGapToggleEl.addEventListener('change', () => {
                smartGapEnabled = smartGapToggleEl.checked;
                localStorage.setItem(SMART_GAP_KEY, smartGapEnabled.toString());
                applySmartGapState();
            });
        }
        if (pagedImageLinkEl) {
            pagedImageLinkEl.addEventListener('click', (event) => {
                if (!pageLinks.length) {
                    return;
                }
                event.preventDefault();
                const link = pageLinks[currentPageIndex];
                if (link) {
                    link.click();
                }
            });
        }

        document.addEventListener('keydown', handleReaderKeydown);
    }

    function resetReaderView() {
        pageUrls = [];
        pageLinks = [];
        totalPages = 0;
        pagesLoaded = 0;
        currentPageIndex = 0;
        currentScrollIndex = 0;
        scrollPageElements = [];
        scrollEdgeData = [];
        visibilityRatios = new Map();
        scrollModeReady = false;

        if (scrollSaveTimeout) {
            clearTimeout(scrollSaveTimeout);
            scrollSaveTimeout = null;
        }

        clearScrollObservers();

        if (lightboxLinksEl) {
            lightboxLinksEl.innerHTML = '';
        }
        if (scrollContainerEl) {
            scrollContainerEl.innerHTML = '';
        }
        if (pagedImageEl) {
            pagedImageEl.removeAttribute('src');
        }
        if (pagedContainerEl) {
            pagedContainerEl.style.display = 'block';
        }
        if (scrollContainerEl) {
            scrollContainerEl.style.display = 'none';
        }
        if (readerMetaEl) {
            readerMetaEl.textContent = '';
        }

        outputElement.classList.remove('scroll-mode');
        updatePageIndicator();
    }

    function finalizeComicLoad(archiveName) {
        progressTextElement.innerHTML = '<span style="color: #4ade80;">Completed!</span>';
        sePreConElement.style.display = 'none';
        outputElement.style.display = 'block';

        if (readerToolbarEl) {
            readerToolbarEl.style.display = 'flex';
        }
        if (readerMetaEl) {
            readerMetaEl.textContent = archiveName
                ? `${archiveName} - Click the page to open the gallery`
                : 'Click the page to open the gallery';
        }

        buildLightboxLinks();
        initializeGallery();
        const lastPage = getLastPageRead(currentComicFilename);
        currentPageIndex = clamp(lastPage, 0, totalPages - 1);
        currentScrollIndex = currentPageIndex;
        applyReadingMode(true);
        updatePageIndicator();

        setTimeout(() => {
            generateThumbnailFromFirstImage();
        }, 100);
    }

    function showReaderError(message) {
        const safeMessage = typeof message === 'string' ? message : String(message);
        if (readerMetaEl) {
            readerMetaEl.innerHTML = `<span style="color: #ef4444;">${safeMessage}</span>`;
        }
        if (readerToolbarEl) {
            readerToolbarEl.style.display = 'none';
        }
        sePreConElement.style.display = 'none';
        outputElement.style.display = 'block';
    }

    async function readContents(archive, archiveName) {
        const entries = archive.entries;
        const imageEntries = entries.filter(entry => getExt(entry.name) !== '');
        totalPages = imageEntries.length;

        if (totalPages === 0) {
            showReaderError('No images were found in this archive.');
            return;
        }

        const promises = [];
        for (let i = 0; i < imageEntries.length; i++) {
            promises.push(createBlobAsync(imageEntries[i], i, totalPages));
        }

        await Promise.all(promises);
        finalizeComicLoad(archiveName);
    }

    function createBlobAsync(entry, index, max) {
        return new Promise((resolve) => {
            entry.readData((data, err) => {
                if (err) {
                    console.error('Failed to read entry:', err);
                    resolve();
                    return;
                }

                const blob = new Blob([data], { type: getMIME(entry.name) });
                const url = URL.createObjectURL(blob);
                pageUrls[index] = url;
                pagesLoaded += 1;

                progressTextElement.innerHTML = `Reading ${pagesLoaded}/${max} pages`;
                resolve();
            });
        });
    }

    function buildLightboxLinks() {
        if (!lightboxLinksEl) return;

        lightboxLinksEl.innerHTML = '';
        pageLinks = pageUrls.map((url, index) => {
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('aria-label', `Page ${index + 1}`);
            link.dataset.index = index.toString();
            lightboxLinksEl.appendChild(link);
            return link;
        });
    }

    function initializeGallery() {
        if (!lightboxLinksEl || typeof lightGallery !== 'function') {
            return;
        }

        if (lightGalleryInstance) {
            lightGalleryInstance.destroy(true);
            lightGalleryInstance = null;
        }

        lightGalleryInstance = lightGallery(lightboxLinksEl, {
            selector: 'a',
            zoom: true,
            fullScreen: true,
            download: false,
            enableTouch: true,
            thumbnail: true,
            animateThumb: true,
            showThumbByDefault: true,
            autoplay: false,
            autoplayControls: true,
            rotate: true
        });

        if (lightboxLinksEl) {
            lightboxLinksEl.removeEventListener('onAfterSlide', handleLightboxSlide);
            lightboxLinksEl.addEventListener('onAfterSlide', handleLightboxSlide);
        }
    }

    function handleLightboxSlide(event) {
        const index = event.detail.index;
        currentPageIndex = index;
        currentScrollIndex = index;
        updatePageIndicator();
        saveLastPageRead(currentComicFilename, index);
    }

    function setReadingMode(mode) {
        if (mode !== 'paged' && mode !== 'scroll') {
            return;
        }
        if (readingMode === mode) {
            return;
        }

        readingMode = mode;
        localStorage.setItem(READER_MODE_KEY, readingMode);
        applyReadingMode(true);
    }

    function applyReadingMode(shouldJump) {
        updateModeButtons();

        if (readingMode === 'scroll') {
            outputElement.classList.add('scroll-mode');
            if (pagedContainerEl) pagedContainerEl.style.display = 'none';
            if (scrollContainerEl) scrollContainerEl.style.display = 'block';
            if (smartGapToggleEl) smartGapToggleEl.disabled = false;

            renderScrollMode(shouldJump);
        } else {
            outputElement.classList.remove('scroll-mode');
            if (scrollContainerEl) scrollContainerEl.style.display = 'none';
            if (pagedContainerEl) pagedContainerEl.style.display = 'block';
            if (smartGapToggleEl) smartGapToggleEl.disabled = true;

            clearScrollObservers();
            renderPagedImage(currentPageIndex);
        }

        updateZoomControls();
    }

    function updateModeButtons() {
        modeButtons.forEach((btn) => {
            const isActive = btn.dataset.readingMode === readingMode;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-pressed', isActive.toString());
        });
    }

    function renderPagedImage(index) {
        if (!pagedImageEl || totalPages === 0) {
            return;
        }

        const safeIndex = clamp(index, 0, totalPages - 1);
        currentPageIndex = safeIndex;
        currentScrollIndex = safeIndex;
        pagedImageEl.src = pageUrls[safeIndex];
        pagedImageEl.alt = `Page ${safeIndex + 1}`;

        if (pagedImageLinkEl) {
            pagedImageLinkEl.href = pageUrls[safeIndex];
        }

        updatePageIndicator();
    }

    function renderScrollMode(shouldJump) {
        if (!scrollModeReady) {
            buildScrollPages();
        }

        applyScrollZoom();
        initLazyObserver();
        initScrollObserver();

        if (shouldJump) {
            scrollToPageIndex(currentScrollIndex, false);
        }
    }

    function buildScrollPages() {
        if (!scrollContainerEl) return;

        scrollContainerEl.innerHTML = '';
        scrollPageElements = [];
        scrollEdgeData = [];

        pageUrls.forEach((url, index) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'scroll-page';
            wrapper.dataset.index = index.toString();

            const img = document.createElement('img');
            img.loading = 'lazy';
            img.decoding = 'async';
            img.alt = `Page ${index + 1}`;
            img.setAttribute('data-src', url);
            img.addEventListener('load', () => analyzeImageWhitespace(img, index));

            wrapper.appendChild(img);
            scrollContainerEl.appendChild(wrapper);
            scrollPageElements.push(wrapper);
        });

        scrollModeReady = true;
        applySmartGapState();
    }

    function initLazyObserver() {
        if (!scrollContainerEl) return;

        if (lazyObserver) {
            lazyObserver.disconnect();
        }

        const images = scrollContainerEl.querySelectorAll('img[data-src]');
        if (!('IntersectionObserver' in window)) {
            images.forEach((img) => setImageSource(img));
            return;
        }

        lazyObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const img = entry.target;
                setImageSource(img);
                lazyObserver.unobserve(img);
            });
        }, { rootMargin: '800px 0px' });

        images.forEach((img) => lazyObserver.observe(img));
    }

    function initScrollObserver() {
        if (!scrollContainerEl || !scrollPageElements.length) return;

        if (visibilityObserver) {
            visibilityObserver.disconnect();
        }
        visibilityRatios = new Map();

        if (!('IntersectionObserver' in window)) {
            return;
        }

        visibilityObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                const index = Number(entry.target.dataset.index);
                visibilityRatios.set(index, entry.intersectionRatio);
            });

            let bestIndex = currentScrollIndex;
            let bestRatio = 0;
            visibilityRatios.forEach((ratio, index) => {
                if (ratio > bestRatio) {
                    bestRatio = ratio;
                    bestIndex = index;
                }
            });

            if (bestIndex !== currentScrollIndex) {
                currentScrollIndex = bestIndex;
                currentPageIndex = bestIndex;
                updatePageIndicator();
                scheduleSaveProgress(bestIndex);
            }
        }, { threshold: [0, 0.25, 0.5, 0.75, 1] });

        scrollPageElements.forEach((page) => visibilityObserver.observe(page));
    }

    function clearScrollObservers() {
        if (lazyObserver) {
            lazyObserver.disconnect();
            lazyObserver = null;
        }
        if (visibilityObserver) {
            visibilityObserver.disconnect();
            visibilityObserver = null;
        }
    }

    function updatePageIndicator() {
        if (!pageIndicatorEl) return;
        if (totalPages === 0) {
            pageIndicatorEl.textContent = '0 / 0';
            return;
        }

        const index = readingMode === 'scroll' ? currentScrollIndex : currentPageIndex;
        pageIndicatorEl.textContent = `${index + 1} / ${totalPages}`;
    }

    function scrollToPageIndex(index, useSmooth) {
        if (!scrollPageElements.length) return;
        const safeIndex = clamp(index, 0, totalPages - 1);
        currentScrollIndex = safeIndex;
        currentPageIndex = safeIndex;
        updatePageIndicator();

        const target = scrollPageElements[safeIndex];
        if (target) {
            target.scrollIntoView({
                behavior: useSmooth ? 'smooth' : 'auto',
                block: 'start'
            });
        }
    }

    function goToRelativePage(delta) {
        if (totalPages === 0) return;

        if (readingMode === 'scroll') {
            scrollToPageIndex(currentScrollIndex + delta, true);
        } else {
            const nextIndex = clamp(currentPageIndex + delta, 0, totalPages - 1);
            renderPagedImage(nextIndex);
            saveLastPageRead(currentComicFilename, nextIndex);
        }
    }

    function handleReaderKeydown(event) {
        if (outputElement.style.display !== 'block') {
            return;
        }

        const target = event.target;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) {
            return;
        }
        if (document.body.classList.contains('lg-on')) {
            return;
        }

        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            goToRelativePage(-1);
        } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            goToRelativePage(1);
        }
    }

    function applyScrollZoom() {
        if (!scrollContainerEl) return;

        scrollZoom = clamp(scrollZoom, SCROLL_ZOOM_MIN, SCROLL_ZOOM_MAX);
        const desiredWidth = BASE_SCROLL_WIDTH_VW * scrollZoom;
        const clampedWidth = Math.min(desiredWidth, 100);
        scrollContainerEl.style.setProperty('--scroll-image-width', `${clampedWidth}vw`);
        localStorage.setItem(SCROLL_ZOOM_KEY, scrollZoom.toString());
        updateZoomControls();
    }

    function updateZoomControls() {
        if (zoomLevelEl) {
            zoomLevelEl.textContent = `${Math.round(scrollZoom * 100)}%`;
        }
        const isScrollMode = readingMode === 'scroll';
        if (zoomOutBtn) zoomOutBtn.disabled = !isScrollMode;
        if (zoomInBtn) zoomInBtn.disabled = !isScrollMode;
    }

    function adjustScrollZoom(delta) {
        scrollZoom = clamp(scrollZoom + delta, SCROLL_ZOOM_MIN, SCROLL_ZOOM_MAX);
        applyScrollZoom();
    }

    function scheduleSaveProgress(index) {
        if (scrollSaveTimeout) {
            clearTimeout(scrollSaveTimeout);
        }
        scrollSaveTimeout = setTimeout(() => {
            saveLastPageRead(currentComicFilename, index);
        }, 200);
    }

    function setImageSource(img) {
        if (!img) return;
        const dataSrc = img.getAttribute('data-src');
        if (!dataSrc) return;
        img.src = dataSrc;
        img.removeAttribute('data-src');
    }

    function analyzeImageWhitespace(img, index) {
        if (!img.naturalWidth || !img.naturalHeight) {
            return;
        }

        const stripHeight = Math.min(20, img.naturalHeight);
        const sampleHeight = Math.min(10, stripHeight);
        const sampleWidth = Math.min(120, img.naturalWidth);

        const canvas = document.createElement('canvas');
        canvas.width = sampleWidth;
        canvas.height = sampleHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) return;

        const topWhite = isStripMostlyWhite(ctx, img, 0, stripHeight, sampleWidth, sampleHeight);
        const bottomStart = img.naturalHeight - stripHeight;
        const bottomWhite = isStripMostlyWhite(ctx, img, bottomStart, stripHeight, sampleWidth, sampleHeight);

        scrollEdgeData[index] = { topWhite, bottomWhite };
        updateSmartGapForIndex(index);
    }

    function isStripMostlyWhite(ctx, img, startY, stripHeight, sampleWidth, sampleHeight) {
        ctx.clearRect(0, 0, sampleWidth, sampleHeight);
        ctx.drawImage(
            img,
            0,
            startY,
            img.naturalWidth,
            stripHeight,
            0,
            0,
            sampleWidth,
            sampleHeight
        );

        const data = ctx.getImageData(0, 0, sampleWidth, sampleHeight).data;
        const totalPixels = data.length / 4;
        let whitePixels = 0;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            if (r > 240 && g > 240 && b > 240) {
                whitePixels += 1;
            }
        }

        return whitePixels / totalPixels > 0.92;
    }

    function updateSmartGapForIndex(index) {
        if (!smartGapEnabled) return;

        const prevIndex = index - 1;
        if (prevIndex >= 0 && scrollEdgeData[prevIndex] && scrollEdgeData[index]) {
            const shouldTighten = scrollEdgeData[prevIndex].bottomWhite && scrollEdgeData[index].topWhite;
            toggleTightGap(prevIndex, shouldTighten);
        }

        const nextIndex = index + 1;
        if (nextIndex < totalPages && scrollEdgeData[index] && scrollEdgeData[nextIndex]) {
            const shouldTighten = scrollEdgeData[index].bottomWhite && scrollEdgeData[nextIndex].topWhite;
            toggleTightGap(index, shouldTighten);
        }
    }

    function applySmartGapState() {
        if (!scrollPageElements.length) return;

        if (!smartGapEnabled) {
            scrollPageElements.forEach((page) => page.classList.remove('scroll-page--tight'));
            return;
        }

        scrollPageElements.forEach((page, index) => {
            const current = scrollEdgeData[index];
            const next = scrollEdgeData[index + 1];
            const shouldTighten = current && next && current.bottomWhite && next.topWhite;
            toggleTightGap(index, shouldTighten);
        });
    }

    function toggleTightGap(index, shouldTighten) {
        const page = scrollPageElements[index];
        if (!page) return;
        page.classList.toggle('scroll-page--tight', shouldTighten);
    }

    function getExt(filename) {
        const ext = filename.split('.').pop();
        return (ext === filename) ? '' : ext;
    }

    function getMIME(filename) {
        const ext = getExt(filename).toLowerCase();
        const mimeTypes = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'bmp': 'image/bmp',
            'webp': 'image/webp'
        };
        return mimeTypes[ext] || 'image/jpeg';
    }

    function clearBlobs() {
        if (pageUrls.length > 0) {
            pageUrls.forEach(url => {
                try {
                    URL.revokeObjectURL(url);
                } catch (e) {
                    console.warn('Failed to revoke blob URL:', e);
                }
            });
        }
    }

    function generateThumbnailFromFirstImage() {
        try {
            const firstUrl = pageUrls[0];
            if (!firstUrl) {
                return;
            }

            const previewImg = new Image();
            previewImg.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const maxWidth = 100;
                const scale = maxWidth / previewImg.naturalWidth;
                canvas.width = maxWidth;
                canvas.height = previewImg.naturalHeight * scale;

                ctx.drawImage(previewImg, 0, 0, canvas.width, canvas.height);
                const thumbnail = canvas.toDataURL('image/jpeg', 0.7);

                // get existing data to preserve last_page
                const readingHistory = JSON.parse(localStorage.getItem('comic_reader_userpref') || '{}');
                const existing = readingHistory[currentComicFilename] || {};
                saveLastPageRead(currentComicFilename, existing.last_page || 0, thumbnail);
            };
            previewImg.src = firstUrl;
        } catch (e) {
            console.error('Failed to create thumbnail:', e);
        }
    }

    function saveLastPageRead(filename, pageIndex, thumbnail = null) {
        try {
            const readingHistory = JSON.parse(localStorage.getItem('comic_reader_userpref') || '{}');
            const existing = readingHistory[filename] || {};
            const finalThumbnail = thumbnail || existing.thumbnail || null;

            readingHistory[filename] = {
                last_page: pageIndex,
                timestamp: Date.now(),
                thumbnail: finalThumbnail
            };
            localStorage.setItem('comic_reader_userpref', JSON.stringify(readingHistory));
        } catch (e) {
            console.error('Failed to save reading history:', e);
        }
    }

    function getLastPageRead(filename) {
        try {
            const readingHistory = JSON.parse(localStorage.getItem('comic_reader_userpref') || '{}');
            return readingHistory[filename]?.last_page || 0;
        } catch (e) {
            console.error('Failed to read reading history:', e);
            return 0;
        }
    }


    // IndexedDB functions for storing directory handle
    function openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('ComicReaderDB', 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('directories')) {
                    db.createObjectStore('directories');
                }
            };
        });
    }

    async function saveDirectoryHandle(dirHandle) {
        try {
            const db = await openDB();
            const tx = db.transaction('directories', 'readwrite');
            const store = tx.objectStore('directories');
            store.put(dirHandle, 'comicsFolder');
            await tx.complete;
        } catch (err) {
            console.error('Failed to save directory handle:', err);
        }
    }

    async function loadDirectoryHandle() {
        try {
            const db = await openDB();
            const tx = db.transaction('directories', 'readonly');
            const store = tx.objectStore('directories');
            const handle = await new Promise((resolve, reject) => {
                const request = store.get('comicsFolder');
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });

            if (handle) {
                // verify we still have permission
                const permission = await handle.queryPermission({ mode: 'read' });
                if (permission === 'granted') {
                    return { handle, hasPermission: true };
                } else {
                    // permission is 'prompt' or 'denied' - need user interaction
                    return { handle, hasPermission: false };
                }
            }
            return { handle: null, hasPermission: false };
        } catch (err) {
            console.error('Failed to load directory handle:', err);
            return { handle: null, hasPermission: false };
        }
    }

    async function loadRecentComics() {
        try {
            const readingHistory = JSON.parse(localStorage.getItem('comic_reader_userpref') || '{}');

            const recentComics = Object.entries(readingHistory)
                .sort((a, b) => b[1].timestamp - a[1].timestamp)
                .slice(0, 5);

            recentComicsListEl.innerHTML = '';

            if (recentComics.length === 0) {
                return;
            }

            for (const [filename, data] of recentComics) {
                const item = document.createElement('div');
                item.className = 'recent-comic-item';

                const iconContent = data.thumbnail
                    ? `<img src="${data.thumbnail}" alt="" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px;">`
                    : `<svg viewBox="0 0 16 16">
                        <path d="M3.5 2a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 3.5 14h9a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 12.5 2h-9zm6.854 6.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708-.708L8.793 9H5.5a.5.5 0 0 1 0-1h3.293L6.646 5.854a.5.5 0 1 1 .708-.708l3 3z"/>
                    </svg>`;

                item.innerHTML = `
                    <div class="recent-comic-icon">
                        ${iconContent}
                    </div>
                    <div class="recent-comic-info">
                        <div class="recent-comic-name">${filename}</div>
                        <div class="recent-comic-meta">Page ${data.last_page + 1} • ${formatTimestamp(data.timestamp)}</div>
                    </div>
                `;
                item.addEventListener('click', () => openComicFromFolder(filename));
                recentComicsListEl.appendChild(item);
            }
        } catch (err) {
            console.error('Failed to load recent comics:', err);
        }
    }

    async function removeComicFromHistory(filename) {
        const readingHistory = JSON.parse(localStorage.getItem('comic_reader_userpref') || '{}');
        if (readingHistory[filename]) {
            delete readingHistory[filename];
            localStorage.setItem('comic_reader_userpref', JSON.stringify(readingHistory));
            
            // Refresh UI
            await loadRecentComics();
            
            // Hide container if list is empty
            if (recentComicsListEl.children.length === 0) {
                recentComicsEl.style.display = 'none';
            }
        }
    }

    async function openComicFromFolder(filename) {
        try {
            if (!comicsDirectoryHandle) {
                throw new Error('Directory handle not available');
            }

            // check permission before accessing files
            const permission = await comicsDirectoryHandle.queryPermission({ mode: 'read' });
            if (permission !== 'granted') {
                // try to request permission
                const newPermission = await comicsDirectoryHandle.requestPermission({ mode: 'read' });
                if (newPermission !== 'granted') {
                    showReconnectButton();
                    return;
                }
            }

            const fileHandle = await comicsDirectoryHandle.getFileHandle(filename);
            const file = await fileHandle.getFile();
            openComic(file);
            // refresh recent list after opening
            setTimeout(async () => {
                if (comicsDirectoryHandle) {
                    await loadRecentComics();
                    // show recently read if not already visible
                    if (recentComicsListEl.children.length > 0) {
                        recentComicsEl.style.display = 'block';
                    }
                }
            }, 500);
        } catch (err) {
            console.error('Failed to open comic:', err);
            if (err.name === 'NotAllowedError') {
                showReconnectButton();
            } else {
                alert('Could not find this comic in the selected folder. Please re-upload it or select a different folder.');
                await removeComicFromHistory(filename);
            }
        }
    }

    function formatTimestamp(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'Just now';
    }

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }
});
