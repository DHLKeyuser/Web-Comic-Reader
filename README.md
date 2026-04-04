# Web Comic Reader

Modern web-based comic book reader for CBR, CBZ, and CBT files with library management and reading progress tracking.

## Features

- **Modern UI** 
- **Library Mode** - Select your comics folder once, access anytime with persistent folder access
- **Reading Progress** - Automatically saves your last read page and scrolls to it when you reopen
- **Thumbnail Previews** - Auto-generated cover thumbnails for quick comic recognition
- **Recently Read** - Quick access to your last 5 comics with progress indicators
- **Reading Modes** - Paged view or Webtoon/Scroll with continuous vertical reading, zoom, and optional smart gap removal
- **Quick Read Mode** - Upload and read individual files without library setup
- **Client-Side Only** - All processing happens in your browser, no server uploads required
- **Offline Support** - Works completely offline after initial load

## Usage

### Library Mode (Recommended)
1. Click "Select Comics Folder"
2. Choose your comics folder and grant permission
3. Browse your library with thumbnails and progress tracking
4. Click any comic to read
5. Your progress is automatically saved
6. Use the reader toolbar to switch between Paged and Webtoon/Scroll modes

### Quick Read Mode
1. Click "Quick Read"
2. Upload a single CBR/CBZ/CBT file
3. Read immediately (progress won't be saved)

## Getting Started (Development)

### Prerequisites
- A local web server (Python's `http.server`, Node's `http-server`, etc.)
- For Library Mode: HTTPS server setup

### Basic Setup (HTTP - Quick Read Only)
```bash
# Clone or download the repository
git clone <repository-url>
cd Web-Comic-Reader

# Start a local server (choose one):
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Node.js http-server
npx http-server -p 8000

# PHP
php -S localhost:8000
```

Visit `http://localhost:8000` in your browser. Only Quick Read mode will work.

### HTTPS Setup (Required for Library Mode)

To enable Library Mode with folder access, you need HTTPS:

**Option 1: Using nginx-proxy (Recommended for local development)**
1. Set up nginx-proxy with SSL certificates
2. Configure proxy to your local server
3. Access via `https://yourdomain.test`

**Option 2: Using mkcert for local HTTPS**
```bash
# Install mkcert
# macOS
brew install mkcert

# Create local CA
mkcert -install

# Generate certificate
mkcert localhost 127.0.0.1

# Use with your server (example with http-server)
npx http-server -p 8000 -S -C localhost+1.pem -K localhost+1-key.pem
```

### File Structure
```
├── index.html              # Main HTML file
├── assets/
│   ├── css/
│   │   └── styles.css       # All styles and theming
│   └── js/
│       ├── script.js        # Main application logic
│       ├── mobile-library.js # Mobile library storage (IndexedDB)
│       └── uncompress/
│           └── uncompress.js # Archive extraction
├── README.md
└── LICENSE
```

### Development Notes
- Reading progress is stored in `localStorage` (key: `comic_reader_userpref`)
- Reader mode and scroll preferences are stored in `localStorage` (keys: `readerMode`, `scrollZoom`, `scrollSmartGap`)
- Folder handles are stored in `IndexedDB` (database: `ComicReaderDB`)
- Mobile library comics are stored in `IndexedDB` (database: `MobileComicLibraryDB`)
- Thumbnails are base64-encoded JPEG stored in localStorage
- Uses vanilla JavaScript (no jQuery required)

## Requirements

- Modern browser with File System Access API support (Chrome, Edge, Opera)
- **HTTPS required** for Library Mode (folder access)
- For Quick Read Mode, HTTP is sufficient

## Browser Compatibility

### Desktop Library Mode (Folder-based)
Uses the File System Access API to give the reader direct access to a folder of comics on your computer.

**✅ Fully Supported:**
- Chrome/Chromium (desktop)
- Microsoft Edge (desktop)
- Opera (desktop)

### Mobile Library Mode (Import-based)
For browsers that don't support the File System Access API, the reader offers a persistent imported-comic library stored in IndexedDB. Comics are imported via file picker and kept in browser storage across sessions.

**✅ Works on:**
- Safari (macOS & iOS)
- Firefox (desktop & mobile)
- Chrome / Edge / Opera on iOS and Android
- Any modern browser with IndexedDB support

**Features:**
- Import one or multiple `.cbr`, `.cbz`, `.cbt` files at once
- Comics persist in browser storage — survives refresh and app reopening
- Full library experience: series grouping, progress tracking, recently read, chapter navigation
- Manage library: delete individual comics or clear the entire library
- Duplicate detection by name + size + last modified date
- Storage usage display

### Quick Read Mode
Available everywhere — upload a single comic file for immediate reading without library setup. Progress is not saved.

**📝 Note:** Desktop browsers that support the File System Access API will see the folder-based library. All other browsers automatically get the import-based mobile library instead.

## Supported Formats

- `.cbr` - Comic Book RAR
- `.cbz` - Comic Book ZIP
- `.cbt` - Comic Book TAR

## Technical Details

- Pure client-side processing (no server required)
- Reading progress stored in localStorage
- Folder handles stored in IndexedDB
- Thumbnails generated using Canvas API
- lightGallery for image viewing with zoom and fullscreen

## Credits

- [Uncompress.js](https://github.com/workhorsy/uncompress.js) - Archive extraction
- [lightGallery](https://github.com/sachinchoolur/lightGallery) - Image gallery and viewer
- [Dropzone.js](https://www.dropzone.dev/) - File upload handling

## License

This project is licensed under the MIT License - see the LICENSE file for details.
