# Image Viewer Plugin Architecture

## Overview

The Image Viewer plugin is a **completely independent** plugin that uses the main Luhmann Roam server but maintains its own separate database. It has complete data isolation while sharing the server infrastructure.

## Independence Model

```
┌─────────────────────────────────────────────────────────────┐
│              Main Luhmann Roam Server (Port 3003)          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  API Routes:                                                 │
│  ├── /api/nodes/*          → outliner.db (main database)   │
│  └── /api/plugins/image-viewer/* → image-viewer.db         │
│                                                              │
│  Static Files:                                               │
│  └── /plugins/image-viewer/* → Image Viewer UI             │
│                                                              │
│  ❌ NO DATA SHARING - Separate databases, shared server     │
│                                                              │
│  Launcher Button ────────────────────────────────────────→  │
│  Opens plugin in modal dialog                                │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Backend
- **Framework**: Express.js (shared with main app)
- **Database**: SQLite3 (via sqlite + sqlite3 packages)
- **File Upload**: Multer middleware
- **Image Processing**: Sharp library
- **API Style**: RESTful
- **API Path**: `/api/plugins/image-viewer/*` (on main server)
- **Static Files**: `/plugins/image-viewer/*` (served by main server)

### Frontend
- **JavaScript**: Vanilla ES6+ (modular architecture)
- **No Framework**: Pure JavaScript for simplicity
- **UI**: Custom HTML/CSS with modular stylesheets
- **State Management**: Global state variables (module pattern)
- **Event Handling**: Event delegation and direct listeners

### Data Layer
- **ORM**: None (direct SQL queries)
- **Connection**: sqlite package with async/await
- **Migrations**: Auto-create tables on first run
- **Foreign Keys**: Enabled for referential integrity

## File Structure

```
plugins/image-viewer/
│
├── Frontend Layer
│   ├── index.html                    # Main UI structure
│   ├── styles.css                    # Main stylesheet (imports all modules)
│   ├── renderer.js                   # Main initialization (~20 lines)
│   ├── imageViewerPluginLauncher.js  # Plugin launcher/integration
│   │
│   ├── js/                           # JavaScript modules (13 files)
│   │   ├── state.js                  # Global state variables
│   │   ├── elements.js               # DOM element references
│   │   ├── utils.js                  # Utilities (toast, loading, confirm)
│   │   ├── fileHandling.js           # File upload & drag & drop
│   │   ├── imageLoader.js            # Image loading & filtering
│   │   ├── tagFilter.js              # Tag filter dialog
│   │   ├── scanDialog.js             # Scan dialog
│   │   ├── imageGrid.js              # Grid rendering & pagination
│   │   ├── imageMetadata.js          # Rating, ranking, description, tags
│   │   ├── viewer.js                 # Viewer modal (open/close/navigation)
│   │   ├── zoomPan.js                # Zoom, pan, fullscreen
│   │   ├── keyboard.js                # Keyboard shortcuts
│   │   └── events.js                 # Event listeners setup
│   │
│   └── css/                          # CSS modules (15 files)
│       ├── variables.css            # CSS custom properties
│       ├── base.css                  # Reset & base styles
│       ├── layout.css                # Layout components
│       ├── header.css                # Header styles
│       ├── upload.css                # Upload section
│       ├── scan.css                  # Scan section
│       ├── manager.css               # Manager section & filters
│       ├── pagination.css            # Pagination components
│       ├── dialogs.css               # All dialogs
│       ├── image-grid.css            # Image grid & items
│       ├── viewer.css                # Viewer modal
│       ├── viewer-sidebar.css        # Viewer sidebar & details
│       ├── toast.css                 # Toast notifications
│       ├── loading.css               # Loading overlay
│       └── responsive.css             # Responsive styles
│
├── Backend Layer (in main app root)
│   ├── controllers/imageViewerController.js  # HTTP request handlers
│   ├── services/imageViewerService.js         # Business logic & database
│   └── routes/imageViewerRoutes.js            # Route definitions
│
├── Database
│   └── image-viewer.db                # SQLite database (created at runtime)
│
├── Images Storage
│   └── images/                       # Image files directory
│       ├── 001/                      # Subfolder example
│       └── ...
│
└── Documentation
    ├── README.md                     # User documentation
    └── ARCHITECTURE.md                # This file

Note: API routes registered in server.js at /api/plugins/image-viewer/*
Note: Static files served from /plugins/image-viewer/* on main server
Note: Modal HTML in public/index.html (lines 46-59)
Note: Modal CSS in public/css/image-viewer-plugin-modal.css
```

## Module Dependencies

### JavaScript Module Loading Order

Scripts are loaded in `index.html` in this order (dependency order):

1. `js/state.js` - No dependencies
2. `js/elements.js` - No dependencies
3. `js/utils.js` - Depends on `elements.js`
4. `js/fileHandling.js` - Depends on `state`, `elements`, `utils`
5. `js/imageLoader.js` - Depends on `state`, `elements`, `utils`
6. `js/tagFilter.js` - Depends on `state`, `elements`, `utils`, `imageLoader`
7. `js/scanDialog.js` - Depends on `state`, `elements`, `utils`, `imageLoader`
8. `js/imageGrid.js` - Depends on `state`, `elements`, `utils`
9. `js/imageMetadata.js` - Depends on `state`, `elements`, `utils`, `imageLoader`
10. `js/viewer.js` - Depends on `state`, `elements`, `utils`, `imageGrid`, `imageMetadata`
11. `js/zoomPan.js` - Depends on `state`, `elements`, `viewer`
12. `js/keyboard.js` - Depends on `state`, `elements`, `viewer`, `zoomPan`
13. `js/events.js` - Depends on everything
14. `renderer.js` - Main initialization (depends on everything)

### CSS Module Loading Order

Stylesheets are imported in `styles.css` in this order:

1. `variables.css` - CSS custom properties (no dependencies)
2. `base.css` - Base styles (depends on variables)
3. `layout.css` - Layout (depends on base)
4. `header.css` - Header (depends on layout)
5. `upload.css` - Upload (depends on layout)
6. `scan.css` - Scan (depends on layout)
7. `manager.css` - Manager (depends on layout)
8. `pagination.css` - Pagination (depends on layout)
9. `dialogs.css` - Dialogs (depends on layout, pagination)
10. `image-grid.css` - Grid (depends on layout)
11. `viewer.css` - Viewer (depends on layout)
12. `viewer-sidebar.css` - Sidebar (depends on viewer)
13. `toast.css` - Toast (depends on base)
14. `loading.css` - Loading (depends on base)
15. `responsive.css` - Responsive (depends on everything)

## Data Flow

### Uploading an Image

```
User drags file → fileHandling.js: handleFiles()
          ↓
    fileHandling.js: uploadImage()
    - Creates FormData
    - POST /api/plugins/image-viewer/upload
          ↓
    routes/imageViewerRoutes.js
    - Multer middleware processes file
          ↓
    controllers/imageViewerController.js: upload()
    - Calls imageViewerService.saveImage()
          ↓
    services/imageViewerService.js: saveImage()
    - Processes image with Sharp
    - Generates thumbnail
    - Saves file to images/ directory
    - INSERT INTO images
    - INSERT INTO image_tags (if tags provided)
          ↓
    image-viewer.db
    - Image persisted
          ↓
    Response returned
          ↓
    fileHandling.js: handleFiles()
    - Shows success toast
    - Calls loadImages() to refresh grid
```

### Loading Images

```
Page loads → renderer.js: initializeApp()
          ↓
    imageLoader.js: loadImages()
    - Reads filter inputs
    - Builds query parameters
    - GET /api/plugins/image-viewer/images?tags=...&ratingMin=...
          ↓
    routes/imageViewerRoutes.js
          ↓
    controllers/imageViewerController.js: getImages()
    - Calls imageViewerService.getImages(filters)
          ↓
    services/imageViewerService.js: getImages()
    - Builds SQL query with filters
    - SELECT FROM images + JOIN image_tags
    - Applies sorting
          ↓
    image-viewer.db
    - Returns filtered images
          ↓
    Response with images array
          ↓
    imageLoader.js: loadImages()
    - Updates global images array
    - Calls renderImageGrid()
          ↓
    imageGrid.js: renderImageGrid()
    - Calculates pagination
    - Renders image thumbnails
    - Updates pagination controls
```

### Viewing an Image

```
User clicks thumbnail → imageGrid.js: onclick="openViewer(id)"
          ↓
    viewer.js: openViewer(imageId)
    - Finds image in images array
    - Updates viewer UI (name, dimensions, etc.)
    - Sets up view count increment handler
    - Sets image src (triggers load)
    - Resets zoom/pan
    - Shows modal
          ↓
    Image loads → viewer.js: updateViewCountAfterLoad()
    - Waits 100ms
    - GET /api/plugins/image-viewer/images/:id
          ↓
    controllers/imageViewerController.js: getImage()
    - Returns image data
          ↓
    viewer.js: openViewer()
    - Updates view count display
    - Updates images array
    - Re-renders grid
```

### Updating Image Metadata

```
User edits rating → viewer.js: saveRating()
          ↓
    imageMetadata.js: saveRating()
    - Reads input value
    - Validates (non-negative number)
    - POST /api/plugins/image-viewer/images/:id/rating
    Body: { rating: 4.5 }
          ↓
    routes/imageViewerRoutes.js
          ↓
    controllers/imageViewerController.js: updateRating()
    - Validates rating value
    - Calls imageViewerService.updateImageRating()
          ↓
    services/imageViewerService.js: updateImageRating()
    - UPDATE images SET rating = ? WHERE id = ?
          ↓
    image-viewer.db
    - Rating updated
          ↓
    Response with updated rating
          ↓
    imageMetadata.js: saveRating()
    - Updates currentImage.rating
    - Updates display
    - Calls loadImages() to refresh grid
    - Shows success toast
```

## State Management

### Global State Variables (`js/state.js`)

```javascript
let images = [];                    // All loaded images
let currentImage = null;            // Currently viewed image
let zoomLevel = 1;                  // Current zoom level
let isFullscreen = false;           // Fullscreen state
let panX = 0;                       // Pan X offset
let panY = 0;                       // Pan Y offset
let isPanning = false;              // Panning state
let panStartX = 0;                  // Pan start X
let panStartY = 0;                  // Pan start Y
let allTags = [];                   // All available tags
let selectedTags = [];              // Selected tags for filtering
let tagFilterSearchQuery = '';      // Tag filter search query
let currentTagPage = 1;             // Current tag filter page
let currentImagePage = 1;           // Current image grid page
let scanFolders = [];               // Available scan folders
```

**State Access Pattern:**
- All modules access global state directly
- State is modified by various modules
- No centralized state management (simple approach for this plugin)

## API Architecture

### RESTful Design

| Method | Endpoint | Purpose | Controller Method |
|--------|----------|---------|-------------------|
| GET | `/health` | Health check | `health()` |
| POST | `/upload` | Upload image | `upload()` |
| GET | `/images` | Get all images (filtered) | `getImages()` |
| GET | `/images/:id` | Get single image | `getImage()` |
| GET | `/images/:id/file` | Serve image file | `serveImage()` |
| POST | `/images/:id/tags` | Update tags | `updateTags()` |
| POST | `/images/:id/rating` | Update rating | `updateRating()` |
| POST | `/images/:id/ranking` | Update ranking | `updateRanking()` |
| POST | `/images/:id/description` | Update description | `updateDescription()` |
| DELETE | `/images/:id` | Delete image | `deleteImage()` |
| GET | `/tags` | Get all tags | `getTags()` |
| GET | `/subfolders` | Get subfolders | `getSubfolders()` |
| POST | `/scan` | Scan and import images | `scanImages()` |
| GET | `/info` | Get plugin info | `getInfo()` |

### Request/Response Format

All requests/responses use JSON (except file uploads):

**Upload Image Request:**
```
POST /api/plugins/image-viewer/upload
Content-Type: multipart/form-data
Body: FormData with 'image' field
```

**Get Images Response:**
```json
{
  "success": true,
  "images": [
    {
      "id": "uuid",
      "filename": "image.jpg",
      "width": 1920,
      "height": 1080,
      "fileSize": 1234567,
      "fileSizeFormatted": "1.2 MB",
      "rating": 4.5,
      "ranking": 10.0,
      "description": "Image description",
      "viewCount": 5,
      "tags": ["tag1", "tag2"],
      "url": "/api/plugins/image-viewer/images/uuid/file"
    }
  ],
  "count": 1
}
```

## Database Schema

### Normalized Design

```sql
images                          image_tags
┌─────────────────┐            ┌──────────────────┐
│ id (PK)         │◄───────────┤ image_id (FK)    │
│ filename        │            │ tag              │
│ file_path       │            │ created_at       │
│ file_size       │            │ id (PK)          │
│ width           │            └──────────────────┘
│ height          │
│ rating          │
│ ranking         │
│ description     │
│ view_count      │
│ created_at      │
│ last_viewed_at  │
└─────────────────┘
```

### Foreign Key Constraints

- `image_tags.image_id` → `images.id` (CASCADE DELETE)

This ensures:
- Deleting an image automatically deletes its tags
- No orphaned tags
- Referential integrity maintained

### Indexes

```sql
CREATE INDEX idx_image_tags_image_id ON image_tags(image_id);
CREATE INDEX idx_image_tags_tag ON image_tags(tag);
CREATE INDEX idx_images_rating ON images(rating);
CREATE INDEX idx_images_ranking ON images(ranking);
CREATE INDEX idx_images_created_at ON images(created_at);
```

Benefits:
- Fast tag lookups
- Fast filtering by rating/ranking
- Efficient sorting by date

## Integration with Main App

### Server Integration (`server.js`)

**API Routes Registration:**
```javascript
// Line 81
app.use("/api/plugins/image-viewer", imageViewerRoutes);
```

**Static Files Serving:**
```javascript
// Line 426
app.use("/plugins/image-viewer", express.static(path.join(__dirname, "plugins", "image-viewer")));
```

### Modal HTML (`public/index.html`)

The modal wrapper HTML is defined in the main app's `index.html` (lines 46-59):

```html
<div id="image-viewer-plugin-modal" class="image-viewer-plugin-modal">
  <div class="image-viewer-plugin-header">
    <h3>Image Viewer</h3>
    <div class="image-viewer-plugin-controls">
      <button id="image-viewer-plugin-fullscreen">⛶</button>
      <button id="image-viewer-plugin-close">✕</button>
    </div>
  </div>
  <div class="image-viewer-plugin-content">
    <div id="image-viewer-plugin-loading">Loading Image Viewer...</div>
    <iframe id="image-viewer-plugin-iframe" src="" frameborder="0"></iframe>
  </div>
</div>
```

**Why Modal HTML is in Main App:**
- Modal needs to be in main app DOM to overlay correctly
- Plugin loads in iframe within modal
- Modal controls (close, fullscreen) are in main app
- Allows plugin to be completely isolated in iframe

### Modal CSS (`public/css/image-viewer-plugin-modal.css`)

The modal wrapper styles are in the main app's CSS directory:
- Styles the modal container, header, controls
- Handles fullscreen mode
- Loading indicator styles
- Animation styles

### Plugin Launcher (`plugins/image-viewer/imageViewerPluginLauncher.js`)

**Initialization Flow:**
```
DOMContentLoaded → Wait for PluginRegistry
          ↓
    registerPlugin()
    - Registers with PluginRegistry
    - Sets up enable/disable callbacks
          ↓
    addLauncherButton()
    - Creates sidebar button
    - Adds click handler
          ↓
    setupModalControls()
    - Sets up close button
    - Sets up fullscreen button
    - Sets up backdrop click
    - Sets up ESC key handler
```

**Opening Plugin:**
```
User clicks button → openViewerModal()
          ↓
    Health check: GET /api/plugins/image-viewer/health
          ↓
    Show modal: modal.classList.add('visible')
          ↓
    Load iframe: iframe.src = '/plugins/image-viewer/index.html'
          ↓
    Iframe loads → onload handler
    - Hide loading indicator
    - Add 'loaded' class
```

## Module Responsibilities

### Frontend Modules

**state.js**: Global state variables
- No functions, just variable declarations
- Accessed by all modules

**elements.js**: DOM element references
- Centralized element access
- Single source of truth for selectors

**utils.js**: Utility functions
- `showToast()` - Toast notifications
- `showLoading()` - Loading overlay
- `showConfirmDialog()` - Confirmation dialogs
- `truncate()` - String truncation
- `renderStars()` - Rating display

**fileHandling.js**: File operations
- `setupDragAndDrop()` - Drag & drop setup
- `handleFileSelect()` - File input handler
- `handleFiles()` - File processing
- `uploadImage()` - API upload

**imageLoader.js**: Image loading & filtering
- `loadImages()` - Fetch images from API
- `loadTags()` - Fetch tags from API
- `applyFilters()` - Apply current filters
- `updateTagFilterDisplay()` - Update UI

**tagFilter.js**: Tag filter dialog
- `openTagFilterDialog()` - Open dialog
- `renderTagFilterList()` - Render tag list
- `filterTagList()` - Filter tags by search
- `applyTagFilter()` - Apply selected tags

**scanDialog.js**: Scan dialog
- `openScanDialog()` - Open dialog
- `loadScanFolders()` - Load folder list
- `startScan()` - Start scan process
- `scanImages()` - API scan call

**imageGrid.js**: Grid rendering
- `renderImageGrid()` - Render image grid
- `goToImagePage()` - Navigate pages
- `updateImagePagination()` - Update pagination UI

**imageMetadata.js**: Metadata management
- `saveRating()` - Save rating
- `saveRanking()` - Save ranking
- `saveDescription()` - Save description
- `addTagsToCurrentImage()` - Add tags
- `removeTag()` - Remove tag
- `copyPublicLink()` - Copy link

**viewer.js**: Viewer modal
- `openViewer()` - Open image viewer
- `closeViewer()` - Close viewer
- `deleteCurrentImage()` - Delete image
- `navigateImage()` - Navigate between images

**zoomPan.js**: Zoom & pan
- `zoomImage()` - Zoom in/out
- `resetZoom()` - Reset zoom
- `applyTransform()` - Apply CSS transform
- `toggleFullscreen()` - Toggle fullscreen
- `setupImagePanning()` - Setup pan handlers

**keyboard.js**: Keyboard shortcuts
- `handleKeyboard()` - Keyboard event handler

**events.js**: Event listeners
- `setupEventListeners()` - Setup all event listeners

**renderer.js**: Main initialization
- `initializeApp()` - Initialize everything
- Sets up global functions (`openViewer`, `removeTag`)

### Backend Modules

**routes/imageViewerRoutes.js**: Route definitions
- Defines all API routes
- Sets up Multer for file uploads
- Error handling middleware

**controllers/imageViewerController.js**: HTTP handlers
- Request/response handling
- Input validation
- Calls service methods
- Error handling

**services/imageViewerService.js**: Business logic
- Database operations
- Image processing (Sharp)
- File system operations
- Path conversion utilities

## Performance Considerations

### Frontend

**Image Grid Pagination:**
- Only renders 24 images per page
- Reduces DOM nodes
- Faster rendering

**Lazy Loading:**
- Thumbnails use `loading="lazy"`
- Images load as user scrolls

**Event Delegation:**
- Uses event delegation where possible
- Reduces event listeners

**State Management:**
- Global state avoids prop drilling
- Simple but effective for this use case

### Backend

**Database Indexes:**
- Indexes on frequently queried columns
- Fast filtering and sorting

**Image Processing:**
- Thumbnails generated on upload
- Reduces load time for grid view

**File Path Storage:**
- Relative paths stored in database
- Cross-platform compatibility

## Security Considerations

### Current State (Development)
- No authentication
- No authorization
- File upload size limit (500MB)
- File type validation (image types only)
- SQL injection prevention (parameterized queries)

### Production Recommendations
1. **Authentication**: Add API key or JWT
2. **File Validation**: Additional file type checking
3. **Rate Limiting**: Prevent upload abuse
4. **Input Sanitization**: Sanitize all user inputs
5. **Path Traversal**: Prevent directory traversal attacks
6. **XSS Prevention**: Sanitize user content

## Future Enhancements

### Planned Features
- Image editing (crop, rotate, filters)
- Batch operations (bulk tag, bulk delete)
- Collections/albums
- Image search (by content, OCR)
- Export metadata (CSV, JSON)
- Image comparison view
- Slideshow mode
- Keyboard navigation improvements

### Technical Improvements
- TypeScript migration
- Unit tests
- Integration tests
- Image caching strategy
- Progressive image loading
- WebP conversion on upload
- Image optimization

## Troubleshooting

### Common Issues

**Modal not opening:**
- Check PluginRegistry is initialized
- Verify modal HTML exists in `public/index.html`
- Check browser console for errors

**Images not loading:**
- Verify API routes registered in `server.js`
- Check static file serving configured
- Verify database file exists

**Upload failing:**
- Check file size (max 500MB)
- Verify file type is supported
- Check server console for errors
- Verify `uploads/` directory exists

**Database errors:**
- Check database file permissions
- Verify SQLite3 package installed
- Check database schema initialization

## Development Workflow

### Making Changes

**Frontend Changes:**
1. Edit files in `plugins/image-viewer/js/` or `css/`
2. Refresh browser (no build step)
3. Check browser console for errors

**Backend Changes:**
1. Edit controller/service/route files
2. Restart server: `npm start`
3. Check server console for errors

**Database Schema Changes:**
1. Edit `services/imageViewerService.js` initialization
2. Delete `image-viewer.db` file
3. Restart server (recreates schema)

### Testing Checklist

- [ ] Upload single image
- [ ] Upload multiple images
- [ ] Drag & drop upload
- [ ] Scan images from filesystem
- [ ] Filter by tags
- [ ] Filter by rating
- [ ] Filter by ranking
- [ ] Sort images
- [ ] View image in modal
- [ ] Zoom in/out
- [ ] Pan image
- [ ] Fullscreen mode
- [ ] Navigate between images
- [ ] Add/remove tags
- [ ] Update rating
- [ ] Update ranking
- [ ] Update description
- [ ] Delete image
- [ ] Pagination navigation
- [ ] Keyboard shortcuts

## Contributing

When contributing:
1. Maintain modular architecture
2. Follow existing code patterns
3. Update documentation
4. Test all affected features
5. Keep modules focused (single responsibility)
6. Update this architecture doc for major changes

## License

Part of Luhmann Roam project (MIT License)

