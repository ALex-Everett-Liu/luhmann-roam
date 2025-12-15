# Image Viewer Plugin

A comprehensive image management and viewing plugin for Luhmann Roam. Features image upload, organization, tagging, rating, and advanced viewing capabilities with zoom, pan, and fullscreen support.

## Key Features

- **Image Upload**: Drag & drop or file picker for multiple images
- **Image Scanning**: Automatically scan and import images from filesystem
- **Tag Management**: Organize images with tags and filter by tags
- **Rating System**: Rate images with decimal values (0.0 - 5.0+)
- **Ranking System**: Rank images for sorting and organization
- **Description Field**: Add long-form descriptions to images
- **Advanced Viewer**: Zoom, pan, fullscreen viewing with keyboard shortcuts
- **Image Grid**: Paginated grid view with thumbnails and metadata
- **Filtering**: Filter by tags, rating range, ranking range, and sort options
- **View Tracking**: Track how many times each image has been viewed
- **Independent Database**: Uses `image-viewer.db` - completely separate from main app

## Architecture

```
Main App Server (Port 3003)
├── API Routes: /api/plugins/image-viewer/*  # Image Viewer API endpoints
├── Static Files: /plugins/image-viewer/*     # Image Viewer UI files
└── Database: image-viewer.db (SQLite)       # Plugin's own database
```

**Data Independence:**
```
Main App Database: outliner.db        # Main app data
Image Viewer Database: image-viewer.db # Plugin data (separate)
```

## Installation

The plugin requires the same dependencies as the main app (already installed):

```bash
# Dependencies already available:
# - express
# - multer (for file uploads)
# - sqlite
# - sqlite3
# - sharp (for image processing)
# - uuid
```

## Usage

### Starting the Plugin

**The image viewer plugin is integrated into the main app - no separate server needed!**

1. **Start the main app**:
   ```bash
   npm start
   ```

2. You'll see the server starting with image viewer plugin initialized:
   ```
   Server running on port 3003
   Image Viewer plugin available at /plugins/image-viewer/index.html
   ```

3. **Open the plugin**:
   - Click the "🖼️ Image Viewer" button in the main app's sidebar
   - The plugin opens in a modal dialog inside the app
   - Use the ⛶ button to toggle fullscreen

**Note**: The plugin uses the main app server - just one server process!

### Basic Operations

#### Uploading Images

1. **Drag & Drop**: Drag image files onto the upload area
2. **File Picker**: Click "Select Images" button to choose files
3. **Supported Formats**: JPG, PNG, GIF, BMP, TIFF, WebP, SVG
4. **Multiple Files**: Select multiple images at once

#### Scanning Images

1. Click "Scan Images" button
2. Select a folder (or leave empty for all folders)
3. Click "Start Scan" to import images from filesystem
4. Images are automatically imported from `plugins/image-viewer/images/` directory

#### Viewing Images

1. Click any image thumbnail in the grid
2. Image opens in full viewer modal
3. **Zoom**: Use mouse wheel, +/- keys, or zoom buttons
4. **Pan**: Click and drag the image
5. **Fullscreen**: Press `F` or click fullscreen button
6. **Navigation**: Use arrow keys to navigate between images

#### Organizing Images

**Tags:**
- Click "Filter by Tags" to open tag filter dialog
- Select tags to filter images
- Add tags to images in the viewer sidebar
- Remove tags by clicking the × icon

**Rating:**
- Open an image in the viewer
- Enter a rating (0.0 - 5.0+) in the sidebar
- Click save or press Enter
- Filter images by rating range

**Ranking:**
- Open an image in the viewer
- Enter a ranking value in the sidebar
- Use ranking for custom sorting
- Clear ranking to remove it

**Description:**
- Open an image in the viewer
- Type description in the textarea
- Press Ctrl+Enter (Cmd+Enter on Mac) to save

#### Filtering Images

- **Tag Filter**: Click "Filter by Tags" button to filter by selected tags
- **Rating Filter**: Use dropdown or range inputs for rating filtering
- **Ranking Filter**: Use range inputs for ranking filtering
- **Sort Options**: Sort by default, ranking, rating, date, views, filename, or file size
- **Sort Order**: Ascending or descending

#### Deleting Images

1. Open an image in the viewer
2. Click "Delete Image" button in the sidebar
3. Confirm deletion
4. Image and file are permanently removed

## Database Schema

### images Table
```sql
CREATE TABLE images (
  id TEXT PRIMARY KEY,
  original_filename TEXT NOT NULL,
  file_path TEXT NOT NULL,              -- Relative path from project root
  file_size INTEGER NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  rating REAL,                          -- Decimal rating (0.0 - 5.0+)
  ranking REAL,                         -- Custom ranking value
  description TEXT,                     -- Long-form description
  view_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  last_viewed_at INTEGER
)
```

### image_tags Table
```sql
CREATE TABLE image_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  image_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE,
  UNIQUE(image_id, tag)
)
```

### Indexes
```sql
CREATE INDEX idx_image_tags_image_id ON image_tags(image_id);
CREATE INDEX idx_image_tags_tag ON image_tags(tag);
CREATE INDEX idx_images_rating ON images(rating);
CREATE INDEX idx_images_ranking ON images(ranking);
CREATE INDEX idx_images_created_at ON images(created_at);
```

## API Endpoints

The plugin exposes a RESTful API through the main server at `/api/plugins/image-viewer`:

### Health Check
```
GET /api/plugins/image-viewer/health
```
Returns API status

### Upload Image
```
POST /api/plugins/image-viewer/upload
Content-Type: multipart/form-data
Body: { image: File }
```

### Get All Images
```
GET /api/plugins/image-viewer/images?tags=tag1,tag2&ratingMin=1&ratingMax=5&sortBy=rating&sortOrder=DESC
Query Parameters:
  - tags: Comma-separated tag list
  - rating: Minimum rating (integer)
  - ratingMin: Minimum rating (decimal)
  - ratingMax: Maximum rating (decimal)
  - rankingMin: Minimum ranking (decimal)
  - rankingMax: Maximum ranking (decimal)
  - sortBy: default|ranking|rating|created_at|view_count|filename|file_size
  - sortOrder: ASC|DESC
```

### Get Single Image
```
GET /api/plugins/image-viewer/images/:id
```

### Serve Image File
```
GET /api/plugins/image-viewer/images/:id/file?thumbnail=true
Query Parameters:
  - thumbnail: true|false (optional)
```

### Update Image Tags
```
POST /api/plugins/image-viewer/images/:id/tags
Body: { tags: ["tag1", "tag2", ...] }
```

### Update Image Rating
```
POST /api/plugins/image-viewer/images/:id/rating
Body: { rating: 4.5 }
```

### Update Image Ranking
```
POST /api/plugins/image-viewer/images/:id/ranking
Body: { ranking: 10.5 }  // or { ranking: null } to clear
```

### Update Image Description
```
POST /api/plugins/image-viewer/images/:id/description
Body: { description: "Image description" }  // or { description: null } to clear
```

### Delete Image
```
DELETE /api/plugins/image-viewer/images/:id
```

### Get All Tags
```
GET /api/plugins/image-viewer/tags
```

### Get Subfolders
```
GET /api/plugins/image-viewer/subfolders
```

### Scan Images
```
POST /api/plugins/image-viewer/scan
Body: { subfolder: "001" }  // optional, null for all folders
```

### Get Plugin Info
```
GET /api/plugins/image-viewer/info
```

## Keyboard Shortcuts

### In Image Viewer Modal

- **+** or **=**: Zoom in
- **-**: Zoom out
- **0**: Reset zoom
- **F**: Toggle fullscreen
- **Arrow Left**: Previous image
- **Arrow Right**: Next image
- **Escape**: Exit fullscreen or close viewer
- **Ctrl+Enter** (Mac: **Cmd+Enter**): Save description

### In Input Fields

Keyboard shortcuts are disabled when typing in input fields to prevent interference.

## Integration with Main App

The main Luhmann Roam app includes a launcher button:

1. Button appears in the sidebar: "🖼️ Image Viewer"
2. Clicking it checks if the plugin API is available
3. Opens the plugin in a modal dialog inside the app
4. Modal features:
   - ⛶ Fullscreen button - Expand to fullscreen or restore
   - ✕ Close button - Close the plugin
   - Click outside modal - Close the plugin
   - ESC key - Exit fullscreen or close the plugin

The plugin uses the main app server but has its own database - data remains completely independent.

## File Structure

```
plugins/image-viewer/
├── Frontend
│   ├── index.html                    # Main UI structure
│   ├── styles.css                    # Main stylesheet (imports modules)
│   ├── renderer.js                   # Main initialization
│   ├── imageViewerPluginLauncher.js  # Plugin launcher/integration
│   ├── js/                           # JavaScript modules
│   │   ├── state.js                  # Global state variables
│   │   ├── elements.js               # DOM element references
│   │   ├── utils.js                  # Utility functions
│   │   ├── fileHandling.js           # File upload & drag & drop
│   │   ├── imageLoader.js            # Image loading & filtering
│   │   ├── tagFilter.js              # Tag filter dialog
│   │   ├── scanDialog.js             # Scan dialog
│   │   ├── imageGrid.js              # Grid rendering & pagination
│   │   ├── imageMetadata.js          # Rating, ranking, description, tags
│   │   ├── viewer.js                 # Viewer modal
│   │   ├── zoomPan.js                # Zoom, pan, fullscreen
│   │   ├── keyboard.js                # Keyboard shortcuts
│   │   └── events.js                 # Event listeners setup
│   └── css/                          # CSS modules
│       ├── variables.css             # CSS custom properties
│       ├── base.css                  # Reset & base styles
│       ├── layout.css                # Layout components
│       ├── header.css                 # Header styles
│       ├── upload.css                 # Upload section
│       ├── scan.css                   # Scan section
│       ├── manager.css                # Manager section & filters
│       ├── pagination.css             # Pagination components
│       ├── dialogs.css                # All dialogs
│       ├── image-grid.css             # Image grid & items
│       ├── viewer.css                 # Viewer modal
│       ├── viewer-sidebar.css         # Viewer sidebar & details
│       ├── toast.css                  # Toast notifications
│       ├── loading.css                # Loading overlay
│       └── responsive.css             # Responsive styles
├── Backend (in main app)
│   ├── controllers/imageViewerController.js  # HTTP endpoints
│   ├── services/imageViewerService.js         # Business logic
│   └── routes/imageViewerRoutes.js            # Route definitions
├── Database
│   └── image-viewer.db                # SQLite database (created automatically)
├── Images Storage
│   └── images/                        # Image files directory
│       ├── 001/                       # Subfolder example
│       └── ...
└── Documentation
    ├── README.md                      # This file
    └── ARCHITECTURE.md                 # Architecture documentation
```

## Data Independence

**Important**: The image viewer plugin has NO connection to the main app's data:

- ✅ Plugin uses `image-viewer.db`
- ✅ Main app uses `outliner.db`
- ✅ No shared tables or data
- ✅ No automatic syncing
- ✅ Complete data isolation

This means:
- You can manage images completely independently
- No risk of affecting your main notes database
- Can be used as a standalone tool even without the main app

## Troubleshooting

### Plugin button shows "API not responding"
→ Make sure the main app server is running (`npm start`)

### Images not uploading
→ Check file size (max 500MB)
→ Verify file format is supported
→ Check server console for errors

### Images not displaying
→ Check that image files exist in `plugins/image-viewer/images/` directory
→ Verify database has correct file paths
→ Check browser console for errors

### Database file location
→ `plugins/image-viewer/image-viewer.db` (created automatically on first run)

### Image files location
→ `plugins/image-viewer/images/` (created automatically on first run)

## Development

### Running the Plugin
The plugin runs as part of the main app:
```bash
npm start
# Plugin available at http://localhost:3003/plugins/image-viewer/index.html
```

### API Base URL
The plugin uses relative paths, so it works with the main server automatically:
```javascript
const API_BASE = '/api/plugins/image-viewer';
```

### Making Changes

**Frontend Changes:**
- Edit files in `plugins/image-viewer/js/` or `plugins/image-viewer/css/`
- Refresh browser to see changes
- No build step required

**Backend Changes:**
- Edit `controllers/imageViewerController.js`, `services/imageViewerService.js`, or `routes/imageViewerRoutes.js`
- Restart server: `npm start`

**Database Schema Changes:**
- Edit `services/imageViewerService.js` initialization code
- Delete `image-viewer.db` file to recreate schema
- Restart server

## Technical Details

- **Backend**: Express.js with SQLite
- **Frontend**: Vanilla JavaScript (ES6+), modular architecture
- **Database**: SQLite with foreign key constraints
- **File Upload**: Multer middleware
- **Image Processing**: Sharp library (for thumbnails)
- **Styling**: Modular CSS with CSS custom properties
- **No Framework**: Pure JavaScript, no frameworks

## Browser Compatibility

Works in modern browsers that support:
- ES6+ JavaScript
- Fetch API
- Async/await
- CSS Grid
- CSS Custom Properties
- File API
- Drag & Drop API

## License

Part of the Luhmann Roam project (MIT License)

