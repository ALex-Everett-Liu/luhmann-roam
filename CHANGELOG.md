# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Note**: For historical versions prior to 0.32.0, see [CHANGELOG-ARCHIVED.md](CHANGELOG-ARCHIVED.md)

## [0.35.2] - 2025-12-31

### Changed
- **Image Viewer UI Redesign**: Complete UI redesign of Image Viewer plugin using Neumorphism (Soft UI) design system
- **Accent Color Update**: Updated accent colors from blue-purple (`#6C63FF`, `#6366F1`) to light blue (`#7FC9FF`, `#9DD5FF`) across both WebP Converter and Image Viewer plugins
- **Modal Header Consistency**: Updated plugin modal headers to use light blue accent color for visual consistency

### Added
- **Plugin Design System Guide**: Comprehensive design system guide (`docs/development/PLUGIN_DESIGN_SYSTEM_GUIDE.md`) for future plugin developers
- **Design System Documentation**: Complete documentation covering design tokens, typography, shadows, component patterns, code examples, and accessibility guidelines
- **Implementation Examples**: Ready-to-use code examples for cards, buttons, inputs, modals, forms, and common UI patterns
- **Anti-Patterns Section**: Clear guidance on what NOT to do with wrong vs. correct examples

### Technical Details
- **Image Viewer Redesign**: 
  - Updated all 15 CSS modules with Neumorphism styling
  - Added Google Fonts (Plus Jakarta Sans, DM Sans) integration
  - Converted all components to use extruded/inset shadows
  - Updated color palette to match WebP Converter plugin
- **Modal Headers**: Updated both `webp-converter-plugin-modal.css` and `image-viewer-plugin-modal.css` header backgrounds to `#7FC9FF`
- **Design System Guide**:
  - Complete CSS variable definitions
  - Typography guidelines with font weights and usage
  - Shadow system documentation (extruded, inset, hover states)
  - Component patterns for cards, buttons, inputs, modals
  - Code examples for common UI patterns
  - Accessibility checklist (WCAG AA compliance)
  - Quick reference checklist for implementation
- **Consistency**: Both WebP Converter and Image Viewer plugins now share identical design system implementation

### Benefits
- **Visual Consistency**: All plugins now use the same Neumorphism design system with light blue accents
- **Developer Experience**: Comprehensive guide enables consistent plugin development
- **Maintainability**: Centralized design tokens and patterns reduce code duplication
- **Accessibility**: WCAG AA compliant design ensures accessible user experience
- **Future-Proof**: Design system guide ensures new plugins maintain visual consistency

### Affected Components
- `plugins/image-viewer/index.html` - Added Google Fonts links
- `plugins/image-viewer/css/variables.css` - Complete rewrite with Neumorphism design tokens
- `plugins/image-viewer/css/base.css` - Updated typography and body styles
- `plugins/image-viewer/css/header.css` - Extruded card header with hover effects
- `plugins/image-viewer/css/layout.css` - Updated section headers
- `plugins/image-viewer/css/upload.css` - Neumorphic upload area
- `plugins/image-viewer/css/scan.css` - Neumorphic scan button
- `plugins/image-viewer/css/manager.css` - Extruded manager section with inset inputs
- `plugins/image-viewer/css/image-grid.css` - Extruded image cards
- `plugins/image-viewer/css/pagination.css` - Neumorphic pagination buttons
- `plugins/image-viewer/css/dialogs.css` - Extruded dialog cards
- `plugins/image-viewer/css/toast.css` - Neumorphic toast notifications
- `plugins/image-viewer/css/loading.css` - Neumorphic loading spinner
- `plugins/webp-converter/styles.css` - Updated accent colors to light blue
- `public/css/webp-converter-plugin-modal.css` - Updated header color to light blue
- `public/css/image-viewer-plugin-modal.css` - Updated header color to light blue
- `docs/development/PLUGIN_DESIGN_SYSTEM_GUIDE.md` - New comprehensive design system guide

Image Viewer plugin now matches WebP Converter's Neumorphism design system! Complete design system guide available for future plugin development.

## [0.35.1] - 2025-12-31

### Changed
- **WebP Converter UI Redesign**: Complete UI redesign of WebP Converter plugin using Neumorphism (Soft UI) design system
- **Design System Integration**: Migrated from flat design with gradients and borders to Neumorphism with dual opposing RGB shadows
- **Typography**: Updated to use Plus Jakarta Sans (display) and DM Sans (body) fonts from Google Fonts
- **Color Palette**: Switched to cool monochromatic palette (`#E0E5EC` background, `#3D4852` foreground, `#6B7280` muted)
- **Component Styling**: All components (buttons, cards, inputs, toasts) now use neumorphic shadows instead of borders
- **Shadow System**: Implemented dual opposing RGB shadows (extruded/inset states) for tactile depth perception
- **Border Radius**: Updated to use soft, hyper-rounded corners (32px for containers, 16px for buttons)

### Added
- **Neumorphic Design Tokens**: Complete design token system with cool grey palette, RGBA shadows, and typography variables
- **Extruded/Inset Shadow States**: Multiple shadow variants (extruded, extruded hover, inset, inset deep) for different component states
- **Micro-interactions**: Smooth 300ms transitions with translateY transforms for hover/active states
- **Focus States**: WCAG AA compliant focus indicators with 2px accent rings and offset
- **Google Fonts Integration**: Added Plus Jakarta Sans and DM Sans fonts with `display=swap` for optimal loading

### Technical Details
- **Design System**: Complete Neumorphism implementation following design system specifications in `prompt.xml`
- **Shadow Colors**: Uses RGBA shadows (`rgba(255, 255, 255, 0.5-0.6)` for light, `rgb(163, 177, 198, 0.6-0.7)` for dark) instead of solid hex shadows
- **No Borders**: All borders removed - shadows define all edges following neumorphic principles
- **Component Updates**: 
  - Header: Extruded card with hover lift effect
  - Upload Area: Extruded card with drag-over inset state
  - Settings Panel: Extruded card with nested depth
  - Buttons: Extruded shadows with hover lift and active press down
  - Inputs: Inset shadows with deep inset on focus
  - Image Cards: Extruded with hover lift
  - Results: Extruded cards with colored accent bars (no borders)
  - Progress Bar: Inset track with extruded fill
  - Toasts: Extruded cards with colored accent bars
- **Accessibility**: WCAG AA compliant contrast ratios (7.5:1 for primary text, 4.6:1 for muted text)
- **Touch Targets**: Minimum 44px (48px for buttons) for mobile accessibility
- **Responsive Design**: Mobile-first approach with breakpoints at 768px and 480px
- **Typography Scale**: Responsive font sizes from `text-sm` (14px) to `text-7xl` (72px) for hero headlines

### Benefits
- **Visual Consistency**: Cohesive neumorphic aesthetic throughout the plugin
- **Tactile Depth**: Realistic 3D depth perception through dual shadows
- **Modern Design**: Contemporary soft UI aesthetic with premium feel
- **Accessibility**: WCAG AA compliant with proper focus states and contrast ratios
- **Mobile-Friendly**: Fully responsive with touch-friendly targets and hamburger menu support

### Affected Components
- `plugins/webp-converter/index.html` - Added Google Fonts links (Plus Jakarta Sans, DM Sans)
- `plugins/webp-converter/styles.css` - Complete rewrite with Neumorphism design system (1,041 lines)

WebP Converter plugin now features a beautiful Neumorphism design system with tactile depth and modern aesthetics!

## [0.34.12] - 2025-12-15

### Added
- **Video Format Support**: Added support for video formats (WebM, MP4, MOV, AVI, MKV) and GIF files in Image Viewer plugin
- **Video Metadata Extraction**: Video metadata extraction using `fluent-ffmpeg` to get video dimensions and duration
- **Video Thumbnail Generation**: Automatic thumbnail generation for videos by extracting first frame (320x240 WebP) using ffmpeg
- **Image Thumbnail Generation**: Automatic thumbnail generation for images (320x240 WebP) using Sharp library for optimized grid loading
- **Thumbnail Storage**: Added `thumbnail_path` column to images table for storing thumbnail paths (images and videos)
- **Video Detection**: `isVideoFile()` function to detect video formats by file extension
- **Thumbnail API**: Thumbnail generation on upload/scan and on-demand thumbnail serving for both images and videos
- **Video Viewer Support**: Added `<video>` element to image viewer modal for playing videos with standard controls
- **Video MIME Types**: Updated file upload filter to accept video MIME types (video/webm, video/mp4, video/quicktime, video/x-msvideo, video/x-matroska)
- **Video Scanning**: Updated scan functionality to include video file extensions when scanning directories
- **WebP Thumbnail Format**: All thumbnails stored as WebP format for optimal file size (25-35% smaller than JPG)
- **Copy Tags Feature**: Added "Copy Tags" button in Image Details section to copy all tags of an image to clipboard in comma-separated format (`tag1, tag2, tag3`)

### Changed
- **UUID Generation**: Migrated from UUIDv4 to UUIDv7 for better database index locality and performance (main outliner app and Image Viewer plugin)
- **Supported Formats**: Updated `getInfo()` endpoint to include video formats in supported formats list
- **Image Metadata Function**: Enhanced `getImageMetadata()` to handle both images and videos (uses Sharp for images/GIFs, ffmpeg for videos)
- **File Serving**: Updated `serveImage()` endpoint to serve thumbnails (WebP) for both images and videos when `?thumbnail=true` parameter is present
- **Upload UI**: Updated upload section text to mention video support and updated file input to accept `video/*` files
- **Viewer Display**: Updated viewer to detect video files and display `<video>` element instead of `<img>` for videos
- **API Responses**: Updated API responses to include `mimeType` field for frontend video detection
- **Thumbnail Generation**: Now generates thumbnails for all images (not just videos) for faster grid loading and reduced bandwidth usage
- **Thumbnail Format**: Changed from JPG to WebP format for all thumbnails (better compression, smaller file sizes)

### Fixed
- **Thumbnail Cleanup**: Updated `deleteImage()` to also delete thumbnail files when images are deleted

### Technical Details
- **UUIDv7 Migration**: Updated `services/nodeService.js`, `services/imageViewerService.js`, and `routes/imageViewerRoutes.js` to use UUIDv7 instead of UUIDv4
- **UUIDv7 Package**: Added `uuidv7` package (v1.1.0) dependency - the standard `uuid` package doesn't support v7 yet, so using dedicated `uuidv7` package
- **UUIDv7 Benefits**: UUIDv7 includes timestamp in first 48 bits, providing better index locality for SQLite B-tree indexes, reducing fragmentation and improving insert performance
- **Backward Compatibility**: Existing UUIDv4 IDs remain valid - UUID versions are encoded in the UUID itself, allowing both v4 and v7 to coexist in the same database
- **Thumbnail Generation**: Thumbnails generated automatically on upload/scan and cached in `plugins/image-viewer/images/thumbnails/` directory
- **Database Schema**: Added `thumbnail_path` column migration for existing databases
- **Video Processing**: Uses `fluent-ffmpeg` (already in dependencies) for video metadata and thumbnail extraction
- **Image Processing**: Uses Sharp library for image thumbnail generation (resize to 320x240, convert to WebP with quality 80)
- **GIF Support**: GIF files handled by Sharp library for thumbnail generation
- **SVG Handling**: SVG files skip thumbnail generation (already scalable vector format)
- **Thumbnail Caching**: Thumbnails are generated once and reused for performance
- **On-Demand Generation**: Thumbnails can be generated on-demand if missing when requested (updates database after generation)
- **Video Playback**: Videos play in viewer with standard HTML5 video controls
- **View Count**: View count increments properly for videos (using `loadeddata` event instead of `load` event)
- **MIME Type Detection**: Frontend detects videos by MIME type or file extension for proper display
- **WebP Benefits**: WebP format provides 25-35% better compression than JPG while maintaining visual quality
- **Copy Tags**: Uses modern `navigator.clipboard` API with fallback to `document.execCommand('copy')` for older browsers, formats tags as comma-separated string with spaces
- **Thumbnail Size**: All thumbnails standardized to 320x240 pixels (maintains aspect ratio with `fit: 'inside'`)

## [0.34.11] - 2025-12-15

### Changed
- **Image Viewer Code Refactoring**: Split monolithic `renderer.js` (1,599 lines) into 13 modular JavaScript files for better maintainability and organization
- **Image Viewer CSS Refactoring**: Split monolithic `styles.css` (1,571 lines) into 15 modular CSS files organized by component/feature
- **Modular Architecture**: Image viewer plugin now uses modular file structure with clear separation of concerns for both JavaScript and CSS

### Added
- **JavaScript Modules** (`js/` directory):
  - **State Management Module** (`js/state.js`) - Global state variables (images, currentImage, zoom, pan, tags, pagination)
  - **DOM Elements Module** (`js/elements.js`) - Centralized DOM element references
  - **Utilities Module** (`js/utils.js`) - Utility functions (toast notifications, loading overlay, confirm dialog, truncate, renderStars)
  - **File Handling Module** (`js/fileHandling.js`) - File upload and drag & drop functionality
  - **Image Loader Module** (`js/imageLoader.js`) - Loading images and tags, filtering logic
  - **Tag Filter Module** (`js/tagFilter.js`) - Tag filter dialog functionality
  - **Scan Dialog Module** (`js/scanDialog.js`) - Scan dialog functionality
  - **Image Grid Module** (`js/imageGrid.js`) - Image grid rendering and pagination
  - **Image Metadata Module** (`js/imageMetadata.js`) - Rating, ranking, description, and tags management
  - **Viewer Module** (`js/viewer.js`) - Image viewer modal (open/close, navigation, delete)
  - **Zoom/Pan Module** (`js/zoomPan.js`) - Zoom, pan, and fullscreen functionality
  - **Keyboard Module** (`js/keyboard.js`) - Keyboard shortcuts handling
  - **Events Module** (`js/events.js`) - Event listeners setup
  - **Main Renderer** (`renderer.js`) - Minimal initialization file (~20 lines) that orchestrates all modules
- **CSS Modules** (`css/` directory):
  - **Variables Module** (`css/variables.css`) - CSS custom properties (colors, shadows, border-radii)
  - **Base Module** (`css/base.css`) - Universal reset styles and base typography
  - **Layout Module** (`css/layout.css`) - General layout components (app container, section headers)
  - **Header Module** (`css/header.css`) - Application header styles
  - **Upload Module** (`css/upload.css`) - Image upload section styles
  - **Scan Module** (`css/scan.css`) - Image scan section styles
  - **Manager Module** (`css/manager.css`) - Image manager section, filters, and tag display
  - **Pagination Module** (`css/pagination.css`) - Pagination controls for tags and images
  - **Dialogs Module** (`css/dialogs.css`) - All dialog styles (tag filter, confirm, scan)
  - **Image Grid Module** (`css/image-grid.css`) - Image grid display, items, and overlays
  - **Viewer Module** (`css/viewer.css`) - Main image viewer modal, header, controls, image container, fullscreen
  - **Viewer Sidebar Module** (`css/viewer-sidebar.css`) - Viewer sidebar, details, inputs, tag management
  - **Toast Module** (`css/toast.css`) - Toast notification system styles
  - **Loading Module** (`css/loading.css`) - Loading overlay and spinner styles
  - **Responsive Module** (`css/responsive.css`) - Responsive design adjustments for smaller screens
- **Documentation**:
  - **README.md** (`plugins/image-viewer/README.md`) - Comprehensive user documentation with features, usage, API endpoints, keyboard shortcuts, troubleshooting
  - **ARCHITECTURE.md** (`plugins/image-viewer/ARCHITECTURE.md`) - Detailed technical architecture documentation covering module dependencies, data flow, state management, API architecture, database schema, integration patterns
  - **INTEGRATION.md** (`plugins/image-viewer/INTEGRATION.md`) - Quick reference guide for integration points between plugin and main app, including file locations, integration flow, common patterns
  - **PLUGIN_TEMPLATE.md** (`docs/development/PLUGIN_TEMPLATE.md`) - Step-by-step guide for creating new plugins with code templates, best practices, and troubleshooting
- **Integration Comments**: Added helpful comments to integration points in `server.js`, `public/index.html`, backend files, and launcher to guide developers

### Technical Details
- **JavaScript Code Organization**: Reduced main `renderer.js` from 1,599 lines to ~20 lines (98.7% reduction)
- **CSS Code Organization**: Reduced main `styles.css` from 1,571 lines to ~19 lines (98.8% reduction) - now acts as entry point using `@import` rules
- **Module Structure**: Created `plugins/image-viewer/js/` directory with 13 focused JavaScript modules and `plugins/image-viewer/css/` directory with 15 focused CSS modules
- **Dependency Management**: Scripts loaded in correct dependency order in `index.html`, CSS modules imported in logical cascade order in `styles.css`
- **CSS Import Order**: Variables → Base → Layout → Components → Feature-specific → Responsive (ensures proper cascade)
- **Backward Compatibility**: 100% backward compatible - all functionality preserved, only internal structure changed
- **Maintainability**: Each module has single responsibility - easier to find, modify, and test specific features
- **File Sizes**: 
  - JavaScript: Largest module is `zoomPan.js` (~200 lines), most modules under 150 lines
  - CSS: Largest module is `dialogs.css` (~350 lines), most modules under 200 lines
- **Global Functions**: Functions like `openViewer()` and `removeTag()` still exposed globally for HTML onclick handlers
- **No Breaking Changes**: All existing functionality works exactly as before, improved only in code organization
- **Documentation Coverage**: Complete documentation covering user guide, technical architecture, integration reference, and plugin development template

## [0.34.10] - 2025-12-13

### Added
- **Image Description Field**: Added description field for images - supports long-form text descriptions that can't fit in filename or tags
- **Description Database Column**: Added `description` column (TEXT, nullable) to images table with automatic migration for existing databases
- **Description UI**: Added description textarea and save button in Image Details section of image viewer modal
- **Description API Endpoint**: Added `POST /api/plugins/image-viewer/images/:id/description` endpoint for updating image descriptions
- **Keyboard Shortcut Support**: Added Ctrl+Enter (Cmd+Enter on Mac) keyboard shortcut to save description while typing
- **Description Display**: Description automatically displayed in Image Details section when viewing an image

### Changed
- **Keyboard Shortcuts**: Fixed keyboard shortcuts (f, 0, -, etc.) interfering with input fields - shortcuts now ignored when typing in input boxes
- **Image API Responses**: Updated `getImages()` and `getImage()` endpoints to include description field in responses

### Fixed
- **Input Field Interference**: Fixed issue where pressing keys like `f`, `0`, `-` in input boxes would trigger image viewer shortcuts instead of typing characters
- **Keyboard Event Handling**: Keyboard shortcuts now properly detect when user is typing in input fields and skip shortcut processing

### Technical Details
- **Database Migration**: Description column added via `ALTER TABLE` migration - handles existing databases gracefully
- **Service Function**: `updateImageDescription()` function in `imageViewerService.js` handles description updates with proper null/empty string handling
- **Frontend Integration**: Description field integrated into existing image viewer UI following same patterns as rating and ranking fields
- **Input Detection**: Keyboard shortcut handler checks for active input/textarea/contenteditable elements before processing shortcuts
- **Description Storage**: Descriptions stored as TEXT in database, can be null or empty string (empty strings converted to null for consistency)
- **UI Styling**: Description textarea styled to match existing dark theme with proper focus states and placeholder text
- **Event Handling**: Description save button and Ctrl+Enter shortcut properly integrated with existing event listener system

## [0.34.9] - 2025-12-12

### Changed
- **Image Viewer Database Portability**: Changed `file_path` field in image viewer database to store relative paths instead of absolute paths
- **Cross-Platform Compatibility**: Image database now works across different machines with different absolute paths (e.g., `C:\Coding\luhmann-roam` vs `Q:\Coding-2025\luhmann-roam`)
- **Scan Images Dialog**: Replaced `confirm()` with custom confirmation dialog to avoid Electron Windows focus bugs
- **Scan Performance**: Scan dialog now allows selecting specific subfolders instead of scanning entire images directory

### Added
- **Path Conversion Helpers**: Added `toRelativePath()` and `toAbsolutePath()` helper functions in `imageViewerService.js` for converting between absolute and relative paths
- **Migration Script**: Created `scripts/migrate-image-paths-to-relative.js` to convert existing absolute paths in database to relative paths
- **Cross-Drive Path Support**: Migration script handles Windows cross-drive paths (different drive letters) by extracting relative portion from path pattern
- **Confirmation Dialog System**: Added `showConfirmDialog()` function to replace blocking `confirm()` calls with non-blocking Promise-based modal dialog
- **Scan Dialog UI**: Added scan dialog with folder selection dropdown, folder path display, and refresh functionality
- **Subfolder Selection API**: Added `GET /api/plugins/image-viewer/subfolders` endpoint to retrieve list of subfolders in images directory
- **Selective Folder Scanning**: `scanAndImportImages()` now accepts optional `subfolder` parameter to scan only specific folders

### Fixed
- **Database Portability**: Fixed issue where image database couldn't be shared between machines with different absolute paths
- **Path Conversion**: Fixed `path.relative()` limitation on Windows when paths are on different drives by implementing custom relative path extraction
- **Electron Focus Bug**: Replaced `confirm()` in scan function with custom dialog to prevent Windows focus loss issues
- **Dialog Visibility**: Fixed scan dialog and confirmation dialog not appearing due to inline `style="display: none;"` overriding CSS visibility rules
- **Button Event Handling**: Fixed "Start Scan" button not working by adding proper event handlers and `type="button"` attributes

### Technical Details
- **Relative Path Storage**: All `file_path` values now stored relative to project root (e.g., `plugins\image-viewer\images\001\image.jpg`)
- **Automatic Conversion**: Service functions automatically convert relative paths to absolute when needed for file operations
- **Migration Process**: Migration script uses transactions for safety and provides detailed logging of converted paths
- **Backward Compatibility**: Existing absolute paths automatically converted to relative paths when migration script is run
- **Path Pattern Detection**: Migration script detects `plugins/image-viewer/images` pattern in paths to extract relative portion even across different drives
- **Confirmation Dialog**: Promise-based async confirmation dialog with keyboard support (Enter/Escape) and backdrop click handling
- **Folder Selection**: Scan dialog loads folders on open, supports refresh, and displays selected folder path
- **Selective Scanning**: When subfolder is specified, scan validates path is within images directory and scans only that folder recursively

## [0.34.8] - 2025-12-11

### Added
- **Tag Filter Pagination**: Pagination system for tag filter dialog with 20 tags per page
- **Tag Filter Page Navigation**: Previous/Next buttons and page jump input for navigating tag pages
- **Tag Filter Total Count**: Display showing total number of tags (e.g., "Total: 1,234 tags")
- **Image Grid Pagination**: Pagination system for image grid with 24 images per page
- **Image Grid Page Navigation**: Previous/Next buttons and page jump input for navigating image pages
- **Image Grid Total Display**: Page info shows current page, total pages, and total image count (e.g., "Page 1 of 5 (120 total)")
- **Page Jump Functionality**: Input field with "Go to" button to jump directly to any page number
- **Enter Key Support**: Press Enter in page jump input to navigate to specified page
- **Ranking Range Filter**: Filter images by ranking value range (e.g., 0-20) with min/max inputs
- **Rating Range Filter**: Filter images by rating value range (e.g., 5.0-10.0) with min/max inputs
- **Range Filter Real-time Updates**: Range filters apply automatically as values are entered

### Changed
- **Tag Filter Dialog**: Tag list now paginated - only shows 20 tags per page instead of all tags at once
- **Image Grid Rendering**: Image grid now paginated - only renders 24 images per page instead of all images at once
- **Pagination Visibility**: Pagination controls automatically hide when not needed (single page)

### Fixed
- **Large Tag Lists**: Tag filter dialog now handles thousands of tags efficiently without performance issues
- **Large Image Collections**: Image grid now handles thousands of images efficiently without rendering lag
- **Pagination Reset**: Pagination automatically resets to page 1 when filters change or images are uploaded/scanned
- **Page Boundary Handling**: Pagination properly adjusts when images are deleted (stays on valid page or moves to last page)

### Technical Details
- **Tag Pagination**: 
  - `TAGS_PER_PAGE = 20` constant for consistent page size
  - Pagination resets to page 1 when search query changes
  - Total count updates based on filtered tags (respects search)
- **Image Pagination**:
  - `IMAGES_PER_PAGE = 24` constant optimized for grid layout
  - Pagination resets to page 1 when filters change (tags, rating, sort)
  - Pagination resets to page 1 after uploading or scanning images
  - Pagination adjusts intelligently when images are deleted
- **Pagination Controls**:
  - Previous/Next buttons disabled at first/last page boundaries
  - Page jump input validates page number and max page limit
  - Page info displays current page, total pages, and total count
  - Smooth scroll to top of content when changing pages
- **Performance Benefits**:
  - Reduced DOM elements: Only renders visible page items instead of all items
  - Faster initial load: Paginated content loads much faster for large collections
  - Better memory usage: Browser doesn't need to manage thousands of DOM nodes
  - Improved scrolling: Smaller DOM tree provides smoother scrolling experience
- **Range Filters**:
  - Ranking range: Filter by `ranking >= min` AND `ranking <= max` (NULLs excluded when range specified)
  - Rating range: Filter by `rating >= min` AND `rating <= max` (supports decimal values)
  - Range filters work together with existing tag and rating filters
  - Real-time filtering: Filters apply automatically as values are entered
  - Inclusive ranges: Both min and max values are included (e.g., 0-20 includes 0 and 20)

### Benefits
- **Scalability**: Can handle thousands of tags and images without performance degradation
- **User Experience**: Easy navigation through large collections with intuitive pagination controls
- **Performance**: Faster rendering and smoother interactions with paginated content
- **Flexibility**: Page jump feature allows quick navigation to any page in large collections

### Affected Components
- `plugins/image-viewer/index.html` - Added pagination HTML elements for both tag filter and image grid, added ranking/rating range filter inputs
- `plugins/image-viewer/renderer.js` - Added pagination state, functions, and rendering logic; added range filter collection and event listeners
- `plugins/image-viewer/styles.css` - Added pagination control styles (reuses tag filter pagination styles), added range input group styles
- `controllers/imageViewerController.js` - Added parsing for ratingMin, ratingMax, rankingMin, rankingMax query parameters
- `services/imageViewerService.js` - Added SQL conditions for ranking and rating range filters with NULL handling

Tag filter and image grid now scale efficiently to thousands of items with intuitive pagination! Range filters enable precise filtering by ranking and rating values.

## [0.34.7] - 2025-12-11

### Changed
- **Tag Schema Normalization**: Migrated from denormalized tag storage to normalized database schema
- **Tag Storage**: Tags now stored in separate `tags` table with unique tag names instead of duplicating tag text in `image_tags`
- **Tag Relationships**: `image_tags` table now uses `tag_id` foreign key references instead of storing tag text directly

### Added
- **Tag Migration System**: Automatic migration function that converts existing databases from old schema to normalized schema
- **Tag Helper Function**: `getOrCreateTag()` function ensures tags exist before linking to images
- **Migration Detection**: Migration automatically detects old schema and migrates data preserving all tag assignments and timestamps

### Fixed
- **Database Initialization**: Fixed circular dependency in database initialization that prevented migration from running
- **Empty SortBy Handling**: Fixed controller to properly handle empty `sortBy` query parameters
- **Default Sorting Option**: Fixed default sorting option to use explicit "default" value instead of empty string for reliable ranking ASC + rating DESC sorting
- **Tag Query Performance**: Improved tag queries by using proper JOINs with normalized schema

### Technical Details
- **Migration Process**: Migration extracts unique tags, creates `tags` table, migrates tag assignments, and preserves all timestamps
- **Backward Compatibility**: Migration is idempotent - safely runs multiple times and only migrates if old schema detected
- **Schema Changes**: 
  - New `tags` table: `id` (TEXT PRIMARY KEY), `name` (TEXT UNIQUE NOT NULL), `created_at` (INTEGER)
  - Updated `image_tags` table: `image_id` + `tag_id` composite primary key (removed unnecessary UUID)
- **Benefits**: 
  - Storage efficiency: Tag text stored once per unique tag instead of once per image
  - Easier tag management: Rename/delete tags in single location
  - Future-ready: Can add tag metadata (description, color, category) without duplication
  - Better performance: Proper indexes on normalized schema

### Affected Components
- `services/imageViewerService.js` - Complete tag schema normalization with migration system
- `controllers/imageViewerController.js` - Fixed empty sortBy parameter handling
- `plugins/image-viewer/index.html` - Changed default sort option value from empty string to "default" for explicit sorting behavior

Database migration runs automatically on first access - existing tag data preserved and converted seamlessly!

## [0.34.6] - 2025-12-11

### Fixed
- **View Count Tracking**: Fixed view count being incremented for thumbnails in grid view - now only increments when viewing full image in viewer
- **View Count Display**: Fixed view count not updating after image loads - now fetches and displays actual incremented count from database
- **View Count Refresh**: View count now updates in both viewer sidebar and grid display after image loads

### Added
- **Tag Filter Dialog**: New dedicated dialog for managing tag filters with search functionality
- **Tag Search**: Real-time search to filter through thousands of tags efficiently
- **Selected Tags Display**: Visual display of selected tags as removable chips below filter button
- **Tag Filter Controls**: Select All, Clear All, Apply, and Cancel buttons for easy tag management
- **Thumbnail Parameter**: Added `?thumbnail=true` query parameter to prevent view count increment for grid thumbnails

### Changed
- **Tag Filter UI**: Replaced `<select multiple>` dropdown with button + dialog system for better scalability
- **Tag Filter Button**: Shows count of selected tags (e.g., "3 tags selected") instead of dropdown
- **Image Loading**: Thumbnails use `?thumbnail=true` parameter, full viewer uses cache-busting timestamp parameter

### Technical Details
- **View Count Logic**: Server checks for `thumbnail=true` query parameter and skips increment for thumbnails
- **View Count Update**: Image load event listener fetches updated image data to display actual view count
- **Tag Filter State**: Uses global `selectedTags` array instead of DOM select element for state management
- **Tag Filter Dialog**: Modal dialog with search input, scrollable checkbox list (max-height: 400px), and action buttons
- **Tag Filter Search**: Case-insensitive search filters tag list in real-time as user types

### Benefits
- **Accurate View Counts**: View count now accurately tracks per-image views without thumbnail interference
- **Scalable Tag Filtering**: Can handle thousands of tags with efficient search and filtering
- **Better UX**: Visual tag selection with search makes it easy to find and select tags
- **Performance**: Thumbnails no longer trigger unnecessary view count increments

### Affected Components
- `controllers/imageViewerController.js` - Added thumbnail parameter check in serveImage endpoint
- `plugins/image-viewer/renderer.js` - Fixed view count tracking, added tag filter dialog functions
- `plugins/image-viewer/index.html` - Replaced select dropdown with button and added tag filter dialog
- `plugins/image-viewer/styles.css` - Added styles for tag filter dialog, button, and selected tags display

View count tracking now works correctly, and tag filtering scales to thousands of tags!

## [0.34.5] - 2025-12-11

### Added
- **Image Ranking System**: Added `ranking` field to image viewer for advanced image organization
- **Decimal Rating Support**: Rating field now supports decimal values (e.g., 8.5, 10.0) instead of integer-only 0-5
- **Ranking Input Field**: New ranking input field in image viewer sidebar with save and clear buttons
- **Review Endpoint**: New `/api/plugins/image-viewer/images/:id/review` endpoint to update both rating and ranking simultaneously
- **Database Migration**: Automatic migration for old `image-viewer.db` files - adds `ranking` column if missing
- **Default Sorting**: Images now sorted by ranking (ascending, NULLS LAST) then rating (descending) by default

### Changed
- **Rating Input**: Replaced star-based rating UI (1-5 stars) with decimal number input field
- **Rating Validation**: Removed 0-5 constraint - rating now accepts any non-negative decimal value
- **Database Schema**: Changed `rating` column from INTEGER to REAL to support decimal values
- **Sort Options**: Added "Ranking" and "Default (Ranking, Rating)" options to sort dropdown
- **Grid Display**: Image grid now shows decimal ratings as numeric values instead of stars for decimals or values > 5

### Fixed
- **Database Compatibility**: Old image-viewer.db files automatically migrated to support new ranking field
- **Type Compatibility**: SQLite type affinity ensures INTEGER rating values continue working with REAL operations

### Technical Details
- **Database Migration**: Migration adds `ranking REAL DEFAULT NULL` column if it doesn't exist
- **Index Creation**: Added index on `ranking` column for efficient sorting
- **API Endpoints**: 
  - `POST /api/plugins/image-viewer/images/:id/ranking` - Update ranking (supports null to clear)
  - `POST /api/plugins/image-viewer/images/:id/review` - Update both rating and ranking
- **Service Functions**: Added `updateImageRanking()` and `updateImageRatingAndRanking()` functions
- **Frontend UI**: Replaced star rating with number inputs, added ranking input with save/clear buttons
- **Enter Key Support**: Press Enter in rating/ranking inputs to save values
- **Sorting Logic**: Default sort uses `ORDER BY CASE WHEN ranking IS NULL THEN 1 ELSE 0 END ASC, ranking ASC, rating DESC`

### Benefits
- **Flexible Organization**: Use ranking for priority ordering and rating for quality assessment
- **Precise Ratings**: Decimal ratings allow fine-grained quality assessment (e.g., 8.5, 9.2)
- **Advanced Sorting**: Combined ranking + rating sorting provides powerful image organization
- **Backward Compatible**: Old databases automatically migrated without data loss
- **User-Friendly**: Clear input fields with save buttons and Enter key support

### Affected Components
- `services/imageViewerService.js` - Added ranking field, decimal rating support, migration logic, new service functions
- `controllers/imageViewerController.js` - Added ranking endpoints, updated rating validation, included ranking in responses
- `routes/imageViewerRoutes.js` - Added ranking and review routes
- `plugins/image-viewer/index.html` - Replaced star rating with number inputs, added ranking input field
- `plugins/image-viewer/renderer.js` - Updated rating/ranking display and save functions, added Enter key support
- `plugins/image-viewer/styles.css` - Added styles for rating/ranking inputs and save/clear buttons

Image viewer now supports advanced organization with decimal ratings and ranking-based sorting!

## [0.34.4] - 2025-12-11

### Fixed
- **Fullscreen Drag Issue**: Fixed image not moving visually during drag in fullscreen mode - transform now applied correctly
- **Transform Application**: Changed from applying pan transform to container to applying combined zoom+pan transform directly to image element
- **Flexbox Interference**: Resolved conflict between flexbox centering and transform in fullscreen mode

### Changed
- **Transform Strategy**: Pan and zoom transforms now combined into single transform on image element instead of separate transforms on container and image
- **Container Transform**: Container transform reset to `none` to allow flexbox to handle centering without interference

### Technical Details
- **Root Cause**: Fullscreen container's `display: flex` with `align-items: center` and `justify-content: center` was interfering with container transform
- **Solution**: Apply `scale(${zoomLevel}) translate(${panX}px, ${panY}px)` directly to image element, reset container transform to `none`
- **Debugging**: Added comprehensive console logging to track transform application and detect mismatches
- **Transform Combination**: Single transform on image element avoids flexbox centering conflicts in fullscreen mode

### Affected Components
- `plugins/image-viewer/renderer.js` - Updated `applyTransform()` function to apply combined transform to image element

Fullscreen drag now works correctly - image moves in real-time during drag operations!

## [0.34.3] - 2025-12-11

### Added
- **Image Scanning Feature**: Added "Scan Images" button to detect and import images manually copied to the images directory
- **Directory Scanning**: Recursively scans `plugins/image-viewer/images/` and subdirectories for image files
- **Automatic Import**: Detects new images and imports them into the database with UUID generation while preserving original filenames
- **Smart Detection**: Skips images already in database to prevent duplicates
- **Scan Statistics**: Shows imported, skipped, and error counts after scanning
- **Mouse Wheel Zoom**: Added mouse wheel zoom functionality - scroll to zoom in/out with zoom towards cursor position
- **Improved Drag/Pan**: Enhanced drag/pan functionality - works at any zoom level, smooth panning with proper coordinate calculations
- **Image-Only Fullscreen**: Fullscreen mode now shows only the image - header, sidebar, and UI elements hidden for immersive viewing

### Changed
- **Upload Section**: Upload section now serves as fallback method - primary workflow is copying images to directory and scanning
- **Image Import Workflow**: Users can now copy images directly to `plugins/image-viewer/images/` or subdirectories (e.g., `images/001/`) and scan to import
- **Fullscreen Behavior**: Fullscreen button now fullscreens only the image container instead of entire modal - cleaner viewing experience
- **Zoom Controls**: Zoom now works via mouse wheel in addition to zoom buttons - more intuitive interaction
- **Pan Interaction**: Pan now works at any zoom level (not just when zoomed) - improved usability

### Technical Details
- **Scan API Endpoint**: `POST /api/plugins/image-viewer/scan` - scans filesystem and imports new images
- **Recursive Directory Scanning**: Scans all subdirectories within images folder
- **File Path Matching**: Uses resolved absolute paths to detect duplicates
- **Original Filename Preservation**: Images keep their original filenames in database (filename and original_filename fields)
- **Metadata Extraction**: Automatically extracts image dimensions, file size, and MIME type during import
- **File Modification Time**: Uses file modification time as created_at timestamp if available
- **Supported Formats**: Scans for jpg, jpeg, png, gif, bmp, tiff, webp, svg files
- **Error Handling**: Continues scanning even if individual files fail, reports errors in results

### Benefits
- **Flexible Workflow**: Copy multiple images at once via file manager instead of uploading one by one
- **Organized Storage**: Supports subdirectories for organizing images (e.g., `images/001/`, `images/002/`)
- **Efficient Import**: Batch import of images without manual upload process
- **Original Filenames**: Preserves original filenames for easy identification
- **No Duplicates**: Automatically skips images already imported

### Fixed
- **Image Link Copy**: Restored copy link functionality - users can copy image URLs to clipboard
- **Drag/Pan Interaction**: Fixed panning to work smoothly at any zoom level with proper coordinate calculations
- **Mouse Wheel Support**: Added mouse wheel zoom with zoom-towards-cursor behavior for intuitive interaction

### Affected Components
- `services/imageViewerService.js` - Added `scanAndImportImages()` function
- `controllers/imageViewerController.js` - Added `scanImages` endpoint handler
- `routes/imageViewerRoutes.js` - Added scan route
- `plugins/image-viewer/index.html` - Added scan section with button and hint, exit fullscreen button
- `plugins/image-viewer/renderer.js` - Added `scanImages()` function, mouse wheel zoom, improved pan/drag, fullscreen improvements, copy link functions
- `plugins/image-viewer/styles.css` - Added scan section styling, fullscreen styles, exit fullscreen button styling

### Technical Details (Image Viewer Improvements)
- **Mouse Wheel Zoom**: Zoom range 0.1x to 5x, zooms towards mouse cursor position for natural interaction
- **Pan System**: Pan coordinates calculated relative to container center, works seamlessly with zoom transforms
- **Fullscreen Implementation**: Fullscreen targets image container only, hides UI elements, shows exit button overlay
- **Transform System**: Zoom applied to image element, pan applied to container element - proper separation for smooth interaction
- **Copy Link**: Restored public link display and copy functionality for sharing images

Image scanning feature enables efficient batch import of manually copied images! Enhanced viewer with mouse wheel zoom, improved panning, and immersive fullscreen mode!

## [0.34.2] - 2025-12-11

### Added
- **Image Viewer Plugin**: New image viewer plugin with zoom, fullscreen, tags, ratings, and local server access
- **Image Management System**: Upload, organize, and manage images with metadata storage
- **Zoom and Pan Controls**: Zoom in/out with mouse wheel or buttons, pan when zoomed in
- **Fullscreen Mode**: Immersive fullscreen viewing experience
- **Tag Management**: Add and remove tags to organize images
- **Rating System**: Rate images from 0-5 stars for easy organization
- **Filtering and Sorting**: Filter images by tags and minimum rating, sort by date, rating, views, filename, or file size
- **Public Image URLs**: Access images via public URLs that work in any browser (e.g., `http://localhost:3003/api/plugins/image-viewer/images/{id}/file`)
- **View Count Tracking**: Automatic tracking of image views
- **Image Metadata**: Stores image dimensions, file size, MIME type, and timestamps
- **Plugin Integration**: Image Viewer registered in PluginRegistry with sidebar button and Settings integration

### Changed
- **Database Integration**: Uses same `sqlite`/`sqlite3` pattern as rest of codebase for consistency
- **Server Routes**: Added `/api/plugins/image-viewer/*` endpoints for image operations

### Technical Details
- **Plugin Architecture**: Follows same pattern as WebP Converter and Graph plugins - modal-based with iframe loading
- **N-Tier Architecture**: Clear separation following Routes → Controllers → Services pattern
  - Routes: URL mapping and middleware only (`routes/imageViewerRoutes.js` - ~85 lines)
  - Controllers: HTTP logic (`controllers/imageViewerController.js` - request/response handling, validation)
  - Services: Business logic (`services/imageViewerService.js` - database operations, image metadata, tags, ratings)
- **Database Schema**: SQLite database with `images` and `image_tags` tables
  - `images` table: Stores image metadata (id, filename, file_path, dimensions, rating, view_count, timestamps)
  - `image_tags` table: Many-to-many relationship for tags with cascade delete
- **API Routes**: New `/api/plugins/image-viewer/*` endpoints for image operations
  - `POST /api/plugins/image-viewer/upload` - Upload single image
  - `GET /api/plugins/image-viewer/images` - Get all images with optional filters
  - `GET /api/plugins/image-viewer/images/:id` - Get single image metadata
  - `GET /api/plugins/image-viewer/images/:id/file` - Serve image file (increments view count)
  - `POST /api/plugins/image-viewer/images/:id/tags` - Update image tags
  - `POST /api/plugins/image-viewer/images/:id/rating` - Update image rating
  - `DELETE /api/plugins/image-viewer/images/:id` - Delete image
  - `GET /api/plugins/image-viewer/tags` - Get all unique tags
  - `GET /api/plugins/image-viewer/info` - Get plugin information
  - `GET /api/plugins/image-viewer/health` - Health check endpoint
- **Image Processing**: Uses Sharp library for extracting image metadata (width, height, format)
- **File Management**: Images stored in `plugins/image-viewer/images/`, uploads in `plugins/image-viewer/uploads/`
- **Static File Serving**: Plugin UI files served from `/plugins/image-viewer/*` on main server
- **Keyboard Shortcuts**: Zoom (+/-), Reset (0), Fullscreen (F), Navigate (Arrow keys), Close (Escape)

### Benefits
- **Professional Image Management**: Complete image organization system with tags and ratings
- **Easy Sharing**: Public URLs allow sharing images via links in any browser
- **Powerful Filtering**: Find images quickly using tags and ratings
- **Flexible Sorting**: Sort by multiple criteria for different organizational needs
- **Seamless Integration**: Works within main app modal system with fullscreen support
- **Data Safety**: All images stored locally - never leave user's system

### Affected Components
- `plugins/image-viewer/` - New plugin directory with complete UI and logic
  - `index.html` - Plugin UI interface with upload, manager, and viewer
  - `renderer.js` - Frontend logic with zoom, fullscreen, and manager features
  - `styles.css` - Plugin styling
  - `imageViewerPluginLauncher.js` - Plugin registration and modal management
- `services/imageViewerService.js` - Service layer with business logic (database operations, image metadata, tags, ratings)
- `controllers/imageViewerController.js` - Controller layer with HTTP handlers
- `routes/imageViewerRoutes.js` - Routes layer for URL mapping only
- `server.js` - Added Image Viewer routes and static file serving
- `public/index.html` - Added Image Viewer modal HTML and launcher script reference
- `public/css/image-viewer-plugin-modal.css` - Modal styling for plugin

### Plugin Features
- **Supported Formats**: JPEG, PNG, GIF, BMP, TIFF, WebP, SVG
- **Max File Size**: 500MB per image
- **Image Viewer**: Zoom (0.1x to 5x), pan when zoomed, fullscreen mode
- **Manager**: Grid view with thumbnails, filtering by tags/rating, sorting options
- **Public Access**: Images accessible via URLs for sharing and embedding

Image Viewer plugin provides comprehensive image management with professional viewing capabilities!

## [0.34.1] - 2025-11-19

### Changed
- **Graph Plugin Architecture Refactoring**: Refactored Graph Plugin to follow N-Tier architecture pattern matching WebP Converter structure
- **Node Controller Architecture Refactoring**: Refactored Node Controller to follow N-Tier architecture pattern for consistency across codebase
- **Code Organization**: Separated business logic from HTTP logic for Graph Plugin and Node operations

### Technical Details
- **Graph Plugin N-Tier Architecture**: Clear separation following Routes → Controllers → Services pattern
  - Routes: URL mapping and middleware only (`routes/graphRoutes.js` - ~47 lines)
  - Controllers: HTTP logic (`controllers/graphController.js` - request/response handling, validation)
  - Services: Business logic (`services/graphService.js` - database operations, data processing, UUID generation, sequence ID management)
- **Node Controller N-Tier Architecture**: Clear separation following Routes → Controllers → Services pattern
  - Controllers: HTTP logic (`controllers/nodeController.js` - request/response handling, input validation, error handling)
  - Services: Business logic (`services/nodeService.js` - database operations, data processing, transaction management, recursive deletion, line break processing)
- **Consistent Architecture**: All major controllers now follow same N-Tier pattern for maintainability

### Benefits
- **Architectural Consistency**: Graph Plugin and Node Controller now match WebP Converter architecture pattern
- **Maintainability**: Business logic centralized in service layer for easier modification
- **Testability**: Service functions can be unit tested independently from HTTP layer
- **Code Clarity**: Controllers simplified to HTTP concerns only, services handle business logic
- **Extensibility**: Easy to add new operations by adding service methods

### Affected Components
- `services/graphService.js` - New service layer with all Graph Plugin business logic
- `controllers/graphController.js` - Refactored to HTTP logic only, delegates to service layer
- `services/nodeService.js` - New service layer with all Node operations business logic
- `controllers/nodeController.js` - Refactored to HTTP logic only, delegates to service layer

Graph Plugin and Node Controller now follow established N-Tier architecture - consistent codebase structure!

## [0.34.0] - 2025-11-19

### Added
- **WebP Converter Plugin**: New batch image converter plugin supporting multiple formats with quality control
- **Image Conversion Support**: Convert images to WebP, JPEG, PNG, AVIF, and TIFF formats
- **Batch Processing**: Convert multiple images simultaneously with progress tracking
- **Quality Control**: Adjustable quality settings (1-100) for optimal file size vs quality balance
- **Drag & Drop Upload**: Easy file upload via drag and drop or file picker
- **File Size Comparison**: Display original vs converted file sizes with savings percentage
- **Settings Persistence**: Conversion preferences (quality, format, output directory) saved automatically
- **Plugin Integration**: WebP Converter registered in PluginRegistry with sidebar button and Settings integration

### Changed
- **WebP Converter Architecture Refactoring**: Refactored WebP Converter plugin to follow N-Tier architecture pattern matching Graph Plugin structure (minor improvement)
- **Code Organization**: Separated business logic from HTTP logic and routes for better maintainability

### Technical Details
- **Plugin Architecture**: Follows same pattern as Graph Plugin - modal-based with iframe loading
- **N-Tier Architecture**: Clear separation following Routes → Controllers → Services pattern
  - Routes: URL mapping and middleware only (`routes/webpConverterRoutes.js` - ~80 lines)
  - Controllers: HTTP logic (`controllers/webpConverterController.js` - request/response handling, validation)
  - Services: Business logic (`services/webpConverterService.js` - image conversion, file management, utilities)
- **API Routes**: New `/api/plugins/webp-converter/*` endpoints for image conversion operations
  - `POST /api/plugins/webp-converter/convert` - Single image conversion
  - `POST /api/plugins/webp-converter/batch` - Batch image conversion
  - `GET /api/plugins/webp-converter/formats` - Get supported formats
  - `GET /api/plugins/webp-converter/info` - Get plugin information
  - `GET /api/plugins/webp-converter/health` - Health check endpoint
  - `POST /api/plugins/webp-converter/cleanup` - Clean up old files
- **Image Processing**: Uses Sharp library for high-performance native image processing
- **File Management**: Temporary uploads in `plugins/webp-converter/uploads/`, outputs in `plugins/webp-converter/output/`
- **Static File Serving**: Plugin UI files served from `/plugins/webp-converter/*` on main server
- **Memory Management**: Streaming processing with unlimited memory support for large files (up to 500MB)
- **Format-Specific Optimizations**: Different processing strategies for WebP, JPEG, PNG, AVIF, and TIFF

### Benefits
- **Professional Image Processing**: High-quality conversions with format-specific optimizations
- **User-Friendly Interface**: Intuitive drag-and-drop workflow with real-time progress feedback
- **Flexible Output**: Support for modern formats (WebP, AVIF) and traditional formats (JPEG, PNG, TIFF)
- **Batch Efficiency**: Process multiple images at once with progress tracking
- **Seamless Integration**: Works within main app modal system with fullscreen support
- **Data Safety**: All processing happens locally - images never leave user's system

### Affected Components
- `plugins/webp-converter/` - New plugin directory with complete UI and logic
  - `index.html` - Plugin UI interface
  - `renderer.js` - Frontend logic (adapted from Electron to web context)
  - `styles.css` - Plugin styling
  - `webpConverterPluginLauncher.js` - Plugin registration and modal management
  - `README.md` - Plugin documentation
- `services/webpConverterService.js` - Service layer with business logic (image conversion, file management)
- `controllers/webpConverterController.js` - Controller layer with HTTP handlers
- `routes/webpConverterRoutes.js` - Routes layer for URL mapping only (refactored to ~80 lines)
- `server.js` - Added WebP converter routes and static file serving
- `public/index.html` - Added WebP converter modal HTML and launcher script reference
- `public/css/webp-converter-plugin-modal.css` - Modal styling for plugin

### Plugin Features
- **Supported Input Formats**: JPEG, PNG, GIF, BMP, TIFF, WebP, SVG
- **Supported Output Formats**: WebP, JPEG, PNG, AVIF, TIFF
- **Keyboard Shortcuts**: 
  - `Ctrl+O` - Open file picker
  - `Ctrl+R` - Clear all selected images
  - `Escape` - Cancel conversion (if in progress)
- **Automatic Cleanup**: Files older than 24 hours automatically cleaned up
- **Progress Tracking**: Real-time progress bar and status updates during conversion
- **Error Handling**: Comprehensive error handling with user-friendly messages

WebP Converter plugin ready for use - professional batch image conversion integrated into Luhmann Roam!

## [0.33.11] - 2025-11-19

### Changed
- **Backup System Enhancement**: Backup functionality now backs up both main database (`outliner.db`) and graph plugin database (`graph.db`) in a single operation
- **Backup Response Format**: Updated backup API response to return array of backups with type and filename information
- **Backup Filenames**: Both databases backed up with same timestamp for easy pairing (e.g., `main-2025-01-15T10-30-45.db` and `graph-2025-01-15T10-30-45.db`)

### Added
- **Graph Database Backup**: Graph plugin database automatically included in backup operations
- **Backup Logging**: Enhanced console logging to show which databases were backed up
- **Graceful Handling**: Backup system handles missing databases gracefully (skips if not found)

### Technical Details
- **Backup Endpoint**: Updated `/api/backup` endpoint in `server.js` to backup both databases
- **Backup Manager**: Updated `backupManager.js` to handle new response format with multiple backups
- **Backward Compatibility**: Frontend maintains compatibility with legacy single-backup response format
- **Database Paths**: Main DB at `outliner.db`, Graph DB at `plugins/graph/graph.db`

### Benefits
- **Complete Data Protection**: Both main notes and graph plugin data backed up together
- **Consistent Timestamps**: Paired backups share same timestamp for easy identification
- **One-Click Backup**: Single backup operation protects all application data
- **Data Safety**: Graph plugin data now included in backup/restore workflow

### Affected Components
- `server.js` - Enhanced backup endpoint to backup both databases
- `public/js/backupManager.js` - Updated to handle multiple backup responses

Backup system now protects both main application and graph plugin data in one operation!

## [0.33.10] - 2025-11-18

### Changed
- **Graph Plugin Save System**: Switched from automatic database saving to manual save/discard pattern matching main app behavior
- **Graph Plugin User Control**: Users now have full control over when changes are persisted to database

### Removed
- **Graph Plugin JSON Export/Import**: Removed JSON file save/load functionality - database-only persistence
- **Automatic Graph Persistence**: Removed automatic saving on create/update/delete operations

### Added
- **Manual Save/Discard Controls**: Added "Save Changes" and "Discard Changes" buttons to graph plugin toolbar
- **Change Tracking System**: Comprehensive tracking of unsaved changes (create, update, delete) for nodes and edges
- **Original State Management**: Stores original database state for proper discard functionality
- **Change Count Display**: Save/Discard buttons show count of unsaved changes (e.g., "Save Changes (3)")

### Technical Details
- **Change Tracking**: `unsavedChanges` Maps track all modifications before database persistence
- **Original State Storage**: `originalState` Maps preserve database state for discard restoration
- **Callback Refactoring**: Graph callbacks now track changes instead of immediately saving to database
- **Data Format Conversion**: Handles conversion between database format (`from_node_id`/`to_node_id`) and graph format (`from`/`to`)
- **Batch Operations**: `saveAllChanges()` processes all tracked changes in sequence
- **State Restoration**: `discardAllChanges()` restores original state including deleted nodes/edges

### Benefits
- **User Control**: Users can experiment with graph changes without immediate persistence
- **Consistency**: Graph plugin now matches main app's manual save/discard workflow
- **Data Safety**: Changes can be discarded if unwanted, preventing accidental database modifications
- **Workflow Flexibility**: Multiple changes can be made before committing to database

### Affected Components
- `plugins/graph/app.js` - Implemented manual save/discard system with change tracking
- `plugins/graph/index.html` - Added Save Changes and Discard Changes buttons to toolbar
- `plugins/graph/graph.js` - No changes (callbacks remain, but behavior changed)

Graph plugin now follows same manual save pattern as main app - full user control over persistence!

## [0.33.9] - 2025-11-18

### Changed
- **Graph Plugin ID Generation**: Switched from `Date.now() + Math.random()` to UUID v4 for all graph nodes and edges
- **Graph Plugin Database Schema**: Added `sequence_id` INTEGER columns to `graph_nodes` and `graph_edges` tables for ordering/display

### Added
- **Graph Sequence ID Support**: Automatic `sequence_id` assignment for all new graph nodes and edges
- **Graph Sequence ID Population**: `populateGraphSequenceIds()` function to assign sequence IDs to existing records
- **Graph Database Indexes**: Performance indexes on `sequence_id` columns for both graph tables

### Technical Details
- **Client-Side ID Generation**: Updated `plugins/graph/graph.js` to use `crypto.randomUUID()` instead of timestamp-based IDs
- **Server-Side ID Generation**: Updated `controllers/graphController.js` and `plugins/graph/graph-server.js` to generate UUID v4 using `uuid` package
- **Database Schema Migration**: Added `sequence_id` columns with automatic migration for existing databases
- **Sequence ID Assignment**: New nodes/edges automatically receive sequential IDs starting from max existing ID + 1
- **Backward Compatibility**: UUID generation falls back to server-side if client doesn't provide ID
- **Import Functionality**: Bulk import operations properly assign sequence IDs to imported nodes and edges

### Benefits
- **Collision Prevention**: UUID v4 eliminates risk of ID collisions from timestamp-based generation
- **Standard Format**: Industry-standard UUID format improves compatibility and database integration
- **Ordering Support**: Sequence IDs enable consistent ordering and display numbering for graph elements
- **Consistency**: Graph plugin now uses same ID strategy as main application (UUID + sequence_id)
- **Data Integrity**: Proper sequence ID management ensures consistent graph element identification

### Affected Components
- `plugins/graph/graph-database.js` - Added sequence_id columns, indexes, and populateGraphSequenceIds function
- `plugins/graph/graph.js` - Changed ID generation from Date.now() + Math.random() to crypto.randomUUID()
- `controllers/graphController.js` - Added UUID v4 generation and sequence_id assignment for nodes/edges
- `plugins/graph/graph-server.js` - Added UUID v4 generation and sequence_id assignment for standalone server
- `server.js` - Added populateGraphSequenceIds call after graph database initialization

Graph plugin now uses robust UUID v4 IDs with sequence numbering - matching main app architecture!

## [0.33.8] - 2025-11-18

### Changed
- **Graph Plugin API Architecture**: Refactored Graph Plugin API routes to follow controller pattern for consistency with node routes
- **Code Organization**: Extracted all Graph Plugin business logic from routes into dedicated controller module
- **Separation of Concerns**: Graph Plugin routes now handle HTTP routing only, business logic moved to controller layer

### Technical Details
- **Graph Controller Module**: New `controllers/graphController.js` with 9 controller functions for all graph operations
  - `getAllGraphData` - Get all graph data
  - `createNode` - Create a new graph node
  - `updateNode` - Update a graph node
  - `deleteNode` - Delete a graph node
  - `createEdge` - Create a new edge
  - `updateEdge` - Update an edge
  - `deleteEdge` - Delete an edge
  - `clearAllData` - Clear all graph data
  - `importGraphData` - Import graph data (bulk insert)
- **Routes Simplification**: `routes/graphRoutes.js` reduced from 254 lines to 47 lines
- **Route Definitions**: Routes now delegate to controller functions, matching `nodeRoutes.js` pattern
- **Middleware Preserved**: Graph database attachment middleware maintained in routes file

### Benefits
- **Architectural Consistency**: Graph Plugin API now follows same pattern as node routes (routes + controller)
- **Maintainability**: Business logic centralized in controller for easier modification
- **Testability**: Controller functions can be unit tested independently from HTTP layer
- **Code Clarity**: Routes file simplified to route definitions only
- **Extensibility**: Easy to add new graph operations by adding controller methods

### Affected Components
- `controllers/graphController.js` - New controller module with all Graph Plugin business logic
- `routes/graphRoutes.js` - Refactored to use controller pattern, reduced from 254 to 47 lines
- `server.js` - No changes required, routes continue to work as before

Graph Plugin API now follows established architectural patterns - routes handle HTTP, controllers handle business logic!

## [0.33.7] - 2025-11-18

### Changed
- **Node Actions Refactoring**: Extracted all node action button creation logic into dedicated `NodeActionsManager` module
- **Code Organization**: Moved ~90 lines of node action creation code from `app.js` to `nodeActionsManager.js`
- **Separation of Concerns**: Node actions logic now isolated in its own module following manager pattern

### Technical Details
- **NodeActionsManager Module**: New `public/js/nodeActionsManager.js` with `createNodeActions(nodeId)` function
- **Button Creation**: All node action buttons (position, move, add sibling, add child, delete, bookmark, focus, default focus) created by manager
- **Global Function Exposure**: Node operation functions (`addSiblingNode`, `addChildNode`, `deleteNode`, `setDefaultFocusNode`) made globally available for manager access
- **Module Initialization**: NodeActionsManager initialized in `app.js` initialization sequence
- **Script Loading**: Added `nodeActionsManager.js` script import to `index.html` before `app.js`

### Benefits
- **Maintainability**: Node actions logic centralized in single module for easier modification
- **Consistency**: Follows same manager pattern as other feature modules (NodeOperationsManager, NodeExpansionManager, etc.)
- **Code Clarity**: `app.js` simplified by removing inline button creation code
- **Extensibility**: Easy to add new node action buttons by modifying single module

### Affected Components
- `public/js/nodeActionsManager.js` - New module for node action button creation
- `public/js/app.js` - Replaced inline node actions creation with NodeActionsManager call
- `public/index.html` - Added nodeActionsManager.js script import

Node actions now managed through dedicated module - cleaner architecture and easier maintenance!

## [0.33.6] - 2025-11-18

### Added
- **Plugin Management System**: Central plugin registry for managing all plugins
- **Plugin Settings Section**: New "Plugins" section in Settings dialog for plugin management
- **Plugin Registry API**: Complete plugin registration and management API (`PluginRegistry`)
- **Plugin Enable/Disable**: Toggle plugins on/off with persistent state storage
- **Plugin Launch from Settings**: Launch plugins directly from Settings > Plugins
- **Plugin Cards UI**: Beautiful plugin cards showing icon, name, description, version, and controls
- **Plugin Categories**: Plugins organized by category (visualization, tools, etc.)
- **Graph Plugin Integration**: Graph plugin now registered in plugin system

### Changed
- **Graph Plugin Registration**: Graph plugin now registers itself in PluginRegistry on initialization
- **Sidebar Button Behavior**: Graph plugin sidebar button respects enabled/disabled state
- **Settings Structure**: Added plugins section to settings sidebar navigation
- **Graph Plugin Architecture**: Refactored to use shared server instead of separate server
  - Graph plugin API routes moved to main server at `/api/plugins/graph/*`
  - Static files served from `/plugins/graph/*` on main server
  - Removed separate server process (port 3001) - now uses main server only
  - Maintains separate database (`graph.db`) for complete data isolation
  - Simpler architecture: one server process, separate databases

### Technical Details
- **PluginRegistry Module**: New `pluginRegistry.js` with complete plugin lifecycle management
- **Plugin State Persistence**: Plugin enabled/disabled states saved to localStorage
- **Plugin Launch System**: Unified launch mechanism through PluginRegistry
- **Settings Integration**: Plugin management fully integrated into existing Settings dialog
- **Plugin Card Rendering**: Dynamic plugin card creation with enable/disable toggles and launch buttons
- **Server Integration**: Graph plugin routes integrated into `server.js` at `/api/plugins/graph/*`
- **Database Isolation**: Separate `graph.db` database maintained for plugin data
- **Static File Serving**: Plugin UI files served from `/plugins/graph/*` on main server
- **Simplified Architecture**: Single server process instead of separate server (port 3001 removed)

### Benefits
- **Centralized Management**: All plugins managed in one place (Settings > Plugins)
- **Easy Plugin Discovery**: See all installed plugins with descriptions and metadata
- **Flexible Control**: Enable/disable plugins without code changes
- **Extensible Architecture**: Easy to add new plugins - just register them
- **User-Friendly**: Clear UI for managing plugins with visual feedback

### Affected Components
- `public/js/pluginRegistry.js` - New plugin registry system
- `public/js/settingsManager.js` - Added plugins section rendering
- `plugins/graph/graphPluginLauncher.js` - Integrated with PluginRegistry
- `public/index.html` - Added pluginRegistry.js script import

### Plugin Registration Example
```javascript
window.PluginRegistry.register('plugin-id', {
  name: 'Plugin Name',
  description: 'Description',
  version: '1.0.0',
  icon: '🔌',
  category: 'visualization',
  launch: () => { /* launch function */ },
  onEnable: () => { /* enable callback */ },
  onDisable: () => { /* disable callback */ }
});
```

Plugin management system ready for future plugin development!

## [0.33.5] - 2025-11-18

### Added
- **Independent Graph Plugin**: Standalone graph visualization tool with its own database and server
- **Graph Plugin Modal**: Modal dialog integration within main app with fullscreen toggle capability
- **Auto-Start Integration**: Graph plugin server automatically starts with main app (no separate command needed)
- **Graph Database**: Separate SQLite database (`graph.db`) for plugin data, completely independent from main app
- **Graph Plugin Launcher**: Sidebar button to open graph plugin in modal dialog
- **Persistent Graph Storage**: All nodes and edges automatically saved to database on creation, update, or deletion
- **Graph Plugin API**: Complete RESTful API for graph operations (CRUD for nodes and edges)
- **File Import/Export**: Save and load graph layouts as JSON files
- **Tooltips**: Hover over nodes to see full content in tooltips
- **Interactive Canvas**: Drag nodes, create connections, edit properties with right-click context menu

### Technical Details
- **Separate Server**: Graph plugin runs on port 3001 (independent from main app on port 3003)
- **Child Process**: Graph server spawned automatically when main server starts
- **Modal Integration**: Plugin loads in iframe within modal dialog, can expand to fullscreen
- **Database Schema**: `graph_nodes` and `graph_edges` tables with foreign key constraints
- **Auto-Persistence**: Callback system ensures all operations save to database automatically
- **CORS Configuration**: Proper CORS setup for iframe loading from main app

### Benefits
- **Complete Independence**: Plugin data completely separate from main notes database
- **Seamless Integration**: One-click access from sidebar, no manual server startup needed
- **Flexible Use Cases**: Create mind maps, concept diagrams, network structures, or any graph visualization
- **Data Safety**: No risk of affecting main app data - completely isolated
- **Professional UI**: Modal with fullscreen capability, smooth animations, proper loading states

### Affected Components
- `server.js` - Added automatic graph plugin server startup as child process
- `plugins/graph/graphPluginLauncher.js` - New launcher with modal integration
- `public/css/graph-plugin-modal.css` - New modal styling with fullscreen support
- `public/index.html` - Added modal structure and launcher script
- `plugins/graph/graph-database.js` - New database layer for plugin
- `plugins/graph/app.js` - Enhanced with database persistence callbacks
- `plugins/graph/graph.js` - Added callback system for auto-save
- `plugins/graph/index.html` - Updated with "Load from App" button (now informational)

### Documentation
- `plugins/graph/README.md` - Complete plugin documentation
- `plugins/graph/QUICK_START.md` - Quick start guide
- `plugins/graph/ARCHITECTURE.md` - Technical architecture details
- `plugins/graph/SETUP_COMPLETE.md` - Setup summary
- `README.md` - Updated main app documentation with plugin info

Independent graph visualization plugin - create graphs completely separate from your notes!

## [0.33.3] - 2025-11-18

### Fixed
- **Sequence ID Assignment**: Fixed sequence_id not being assigned to new nodes - all new nodes now automatically receive sequence IDs
- **Sequence ID Population**: Fixed `populateSequenceIds()` function to properly assign sequence IDs to existing nodes with NULL values
- **Sequence ID Conflicts**: Fixed potential conflicts by ensuring new sequence IDs start from max existing ID + 1

### Technical Details
- **createNode Enhancement**: Modified `createNode` in `nodeController.js` to query max sequence_id and assign next available ID
- **populateSequenceIds Fix**: Updated function to filter NULL records and start assignment from max existing sequence_id + 1
- **Database Consistency**: Sequence IDs now properly maintained for both existing and new nodes

### Benefits
- **Complete Sequence ID Coverage**: All nodes in database now have valid sequence IDs
- **Automatic Assignment**: New nodes automatically receive sequence IDs without manual intervention
- **Data Integrity**: Proper sequence ID management ensures consistent node identification

### Affected Components
- `controllers/nodeController.js` - Enhanced `createNode` to assign sequence_id on node creation
- `database.js` - Fixed `populateSequenceIds` to properly handle existing NULL values and avoid conflicts

Sequence ID feature now fully functional - existing nodes populated on server restart, new nodes auto-assigned!

## [0.33.2] - 2025-11-18

### Added
- **Resizable Sidebar**: Drag-to-resize functionality for the left sidebar with persistent width
- **Resize Handle**: Visual resize handle on the right edge of the sidebar with hover feedback
- **Persistent Width**: Sidebar width saved to localStorage and restored on page load
- **Window Resize Handling**: Sidebar automatically adjusts when window is resized to maintain constraints

### Changed
- **Sidebar Layout**: Added `position: relative` to sidebar for resize handle positioning
- **Resize Handle Styling**: Added CSS for resize handle with hover states and cursor feedback

### Fixed
- **Drag Direction**: Fixed counter-intuitive resize behavior - dragging right now increases width, dragging left decreases width

### Technical Details
- **Simple Implementation**: Lightweight `resizableSidebar.js` (~75 lines) following simple function pattern
- **Width Constraints**: Minimum width 200px, maximum 60% of window width
- **Visual Feedback**: Resize handle shows blue highlight on hover, cursor changes to col-resize during drag
- **Smooth Transitions**: CSS transitions provide smooth width changes when not actively resizing

### Benefits
- **Customizable Workspace**: Users can adjust sidebar width to their preference
- **Persistent Preferences**: Width setting persists across browser sessions
- **Intuitive Interaction**: Natural drag-to-resize behavior matching standard desktop application patterns
- **Performance**: Lightweight implementation with minimal overhead

### Affected Components
- `public/js/resizableSidebar.js` - New simple resize functionality module
- `public/css/core/layout.css` - Added resize handle styles and resizing state classes
- `public/index.html` - Added resize handle element and script import
- `public/js/app.js` - Added resizable sidebar initialization

Simple, intuitive sidebar resizing with persistent state!

## [0.33.1] - 2025-11-18

### Added
- **Manual Save Mode**: Toggle between auto-save and manual save modes via Settings
- **Save Changes Button**: Manual save button appears in sidebar when auto-save is disabled
- **Discard Changes Button**: Manual discard button appears in sidebar when auto-save is disabled, allowing users to discard temporary draft text
- **Unsaved Changes Tracking**: Visual indicators (red border + pink background) for nodes with unsaved edits
- **Batch Save Functionality**: Save all pending changes with a single click
- **Batch Discard Functionality**: Discard all pending changes and restore original content with a single click
- **Unsaved Count Display**: Save and discard buttons show count of unsaved changes (e.g., "Save Changes (3)", "Discard Changes (3)")
- **Auto-save Toggle**: Settings panel includes toggle to switch between save modes

### Changed
- **Blur Handler Behavior**: Node content blur handler now respects auto-save setting
- **Save/Discard Button Visibility**: Save Changes and Discard Changes buttons automatically show/hide based on save mode
- **Settings Integration**: Auto-save setting persists across sessions and updates UI immediately

### Technical Details
- **Unsaved Changes Map**: Tracks modified nodes with their content in manual mode
- **Visual Feedback**: CSS classes `.unsaved` and `.has-unsaved` provide clear visual indicators
- **Mode Switching**: Switching to auto-save mode automatically saves any pending changes
- **Node Operations**: Structural changes (add/delete/indent) always save immediately regardless of mode

### Benefits
- **User Control**: Choose between seamless auto-save or deliberate manual save workflow
- **Methodical Editing**: Manual mode allows organizing thoughts without pressure of immediate persistence
- **Visual Clarity**: Clear indicators show which nodes have unsaved changes
- **Backward Compatible**: Auto-save enabled by default maintains existing user experience

### Affected Components
- `public/js/app.js` - Added unsaved changes tracking, manual save/discard functions, and mode-aware blur handler
- `public/js/settingsManager.js` - Added auto-save toggle event listeners and save mode switching logic
- `public/index.html` - Added Save Changes and Discard Changes buttons to sidebar
- `public/css/components/buttons.css` - Added styling for save and discard buttons with unsaved indicators
- `public/css/components/outliner.css` - Added `.unsaved` class styling for visual feedback

Hybrid save system: auto-save by default for seamless capture, manual mode for deliberate editing!

## [0.32.10] - 2025-11-18

### Removed
- Unused position management endpoints: `/api/nodes/reorder/shift`, `/api/nodes/fix-positions`, `/api/nodes/fix-position-conflict`
- Position conflict resolution modal UI
- `shiftNodePositions` controller function

### Changed
- Simplified `addSiblingNode` to create nodes directly without position shifting
- `fixNodePositions` now only detects and logs conflicts instead of showing resolution UI

## [0.32.6] - 2025-11-17

### Removed
- **Complete I18n System Replaced with English-Only Architecture**:
- **Dual Language Content Handling**: Eliminated `content_zh` fields and Chinese language processing across all modules
- **Translation System**: Deleted `I18n.t()` calls and language toggle functionality system-wide
- **Language Detection**: Removed `I18n.getCurrentLanguage()` and language switching mechanics
- **Chinese UI Elements**: Eliminated Chinese content containers, toggle buttons, and bilingual display logic
- **Translation Dependencies**: Removed all internationalization translation keys and English/Chinese comparison logic

### Technical Details

**Complete Internationalization Elimination**:
- **Frontend/Browser Layer**:
  - `public/js/app.js` - Removed dual-language content logic, Chinese content containers, and language toggle buttons
  - `public/js/searchManager.js` - Eliminated 25+ `I18n.t()` translation calls and Chinese language handling
  - `public/js/breadcrumbManager.js` - Simplified to hardcoded English display without language detection
  - `public/js/positionManager.js` - Removed `content_zh` references and translation strings
  - `public/index.html` - Removed "Switch to Chinese" button from sidebar

**Systematic I18n Reference Removal**:
- **Content Logic**: Replaced `currentLanguage === "en"` with hardcoded English content paths
- **Translation Calls**: Eliminated all `I18n.t('key_name')` with direct English text strings
- **Dual Display**: Removed parallel English/Chinese content rendering with toggle buttons
- **Language UI**: Erased Chinese content containers, headers, and visibility toggle functionality

**Orphaned Code Cleanup**:
- **Lines 345-390 in app.js**: Completely removed orphaned dual-language UI creation (`otherLangCode`, `globalOtherLanguageVisible`, toggle button logic)
- **Unreferenced Variables**: Eliminated `languageToggle` DOM references and language system initialization
- **Complex Conditional Logic**: Removed bilingual content comparison patterns across all modules

### Rationale
- **Architectural Simplicity**: Pure English-only system eliminates complex dual-language management overhead
- **Code Reduction**: Removed ~800 lines of internationalization complexity across the codebase
- **Performance Enhancement**: Eliminated language detection logic and conditional content processing
- **Maintenance Streamlining**: Single language approach removes translation file dependencies

### Technical Benefits
- **Bundle Size Reduction**: Smaller JavaScript footprint without translation functions
- **Runtime Performance**: No language detection or content serving overhead
- **Developer Simplicity**: Single language content model without branching logic
- **UI Cleanliness**: No language toggle buttons or dual-language display modes

### Affected Components
- `public/js/app.js` - Major rewrite: removed dual language containers, Chinese button protocols, and translation logic
- `public/js/searchManager.js` - Translation calls replaced, search logic streamlined to English-only
- `public/js/breadcrumbManager.js` - Language detection simplified to hardcoded English
- `public/js/positionManager.js` - Removed Chinese content references in modal dialogs
- `public/index.html` - Removed language switch button from sidebar UI

### Retained Architecture
- **Core Node Operations**: All hierarchical node manipulation preserved in English
- **Search Functionality**: English-only search with simplified result processing
- **Modal Systems**: Settings, backup, and position modals with English text only
- **Settings Integration**: Theme and font settings maintained with English labels

### Code Statistics
- **Lines Removed**: ~800 lines of complex I18n management across frontend modules
- **Functions Eliminated**: Dual language content creation, translation systems, language toggles
- **Variables Cleaned**: `currentLanguage`, `otherLangCode`, `content_zh` references systematically removed
- **Conditional Simplification**: `currentLanguage === "en"` branches replaced with direct English paths

Streamlined to pure English outliner operations - zero translation and dual-language complexity!

## [v0.32.3+] - 2025-11-17

### Fixed
**Link System Completeness**:
- **Resolved startup error**: Removed unresolved `linkController` import in `routes/nodeRoutes.js`
- **Database schema finalization**: Cleaned up remaining link references and table creation
- **Controller cleanup**: Removed `link_count` subqueries from node fetch operations

### Technical Details

**Server Operational Fix**:
```
Error: Cannot find module '../controllers/linkController'
Error resolved by removing lingering import references
```

**Completed Link System Elimination**:
- **Database layer**: Removed `links` table schema creation, eliminated from `populateSequenceIds()`
- **API layer**: Cleaned all link-related queries in `nodeController.js`
- **Route layer**: Removed final `linkController` references in `nodeRoutes.js`

### Comprehensive Changes from v0.32.1 ➜ v0.32.2
Following v0.32.1 vault system simplification:

**Complete Feature Consolidation**:
- **Database Export/Import System**: Deleted entirely, replaced by backup manager
- **Link Management System**: Completely removed - pure node operations sufficient
- **Database Schema**: Simplified to core tables (nodes, attributes, bookmarks)

**Architecture Benefits**:
- **Pure Node Operations**: No connections, links, or complex relationships
- **Performance Enhancement**: Simplified SQL queries without JOIN complexity
- **Interface Clarity**: Clean UI with only essential node actions
- **Codebase Streamlined**: ~1,800+ lines removed across the system

System now operates with ultimate simplicity: pure hierarchical node-based outliner!

### Removed
- **Complete Link System Database Schema**: Removed links table creation from `database.js`
- **Links Table Reference**: Eliminated links from `populateSequenceIds()` function
- **Node Controller Link Counts**: Removed `link_count` subqueries from node queries
- **Node Deletion Cascade**: Removed automatic link deletion when nodes are deleted

### Technical Details

**Database Layer Changes**:
- Removed `links` table schema creation from `initializeDatabase()` function
- Eliminated links table from `populateSequenceIds()` to only process nodes and attributes
- Links table previously enabled bidirectional node connections with weight/metadata

**API Layer Cleanup**:
- Removed `link_count` subqueries from `nodeController.js` node fetch operations
  - Previously returned link count for each node in `/api/nodes` and `/api/nodes/:id/children`
  - Search functionality no longer includes link count information
- Eliminated automatic link deletion during node removal operations
  - Previously: `DELETE FROM links WHERE from_node_id = ? OR to_node_id = ?`
  - Now: Pure node hierarchy operations only

**Foundation Simplification**:
- Database maintains only: `nodes`, `node_attributes`, `bookmarks` tables
- Sequence ID functionality operates only on relevant tables
- Foreign key relationships simplified to core outliner components

### Rationale
- **Architectural Completeness**: Link system elimination finalized at database level
- **Data Integrity**: Maintains existing databases without breaking changes
- **Performance Enhancement**: Simplified SQL queries without JOIN complexity
- **Foundation Clarity**: Pure hierarchical node-only operations at database core

### Affected Components
- `database.js` - Removed table creation, simplified sequence ID population
- `controllers/nodeController.js` - Cleaned all link-related SQL queries and operations
- **Database Schema**: Simplified to nodes + attributes + bookmarks only

### Preserved Architecture
- **Backward Compatibility**: Existing databases continue functioning
- **Core Tables**: Nodes, attributes, bookmarks maintain full functionality
- **API Stability**: All `/api/nodes/*` endpoints fully operational
- **Data Migration**: No breaking changes to existing data

Streamlined to core database foundation with pure node hierarchy - zero link complexity!

## [0.32.3] - 2025-11-17

### Removed
- **Complete Link Management System**: Deleted `linkManager.js`, `linkController.js`, `linkRoutes.js`, and `link-manager.css`
- **Link APIs**: Removed `/api/links` GET, POST, PUT, DELETE endpoints
- **Link Web UI**: Eliminated link `🔗` button from node actions
- **Link Modal Features**: Removed link creation, editing, search functionality with modals
- **Link Count Display**: Removed link count indicators from node content display
- **Bidirectional Links**: Eliminated connection between nodes with weights and descriptions

### Rationale
- **Core Functionality Sufficiency**: Pure node operations comprehensively satisfy user needs
- **Complexity Elimination**: Link management introduced unnecessary UX complexity
- **Workflow Focus**: Outliner experience refined to core node hierarchy operations
- **Interface Cleanup**: Removed visual clutter with 🔗 buttons and link count indicators

### Affected Components
- `server.js` - Removed link routes and API endpoint registration
- `public/js/app.js` - Eliminated link button creation and node action
- `public/index.html` - Removed linkManager.js script references
- `public/css/index.css` - Removed link-manager CSS styling imports

### Technical Changes
- **API Layer**: Cleaned up URL paths `/api/links/*` endpoints
- **Frontend UI**: Streamlined node action button set
- **Code Reduction**: Removed ~675 lines across JavaScript/CSS/Server files
- **Bundle Size**: Reduced client-side dependencies and startup complexity

### Retained Functionality
- **Core Outliner Operations**: Node creation, editing, moving, hierarchical organization preserved
- **Database Integrity**: Underlying nodes and foreign key relationships maintained
- **API Stability**: `/api/nodes/*` endpoints remain fully functional
- **User Workflow**: Pure node-based information architecture intact

### Benefits
- **Code Reduction**: Eliminated ~675 lines of link management complexity
- **Performance Gain**: Faster UI initialization without link components
- **UX Simplification**: Cleaner node interface without 🔗 buttons
- **Architecture Focus**: Streamlined to core outliner functionality

## [0.32.2] - 2025-11-17

### Removed
- **Complete Database Export/Import System**: Deleted `databaseExportImportManager.js`, `databaseExportImportController.js`, `databaseExportImportRoutes.js`
- **Export/Import CSS**: Removed `export-import.css` styling files
- **Export/Import UI Elements**: Removed export/import buttons and modals
- **Export Node Tree Functionality**: Eliminated node tree export from node actions
- **Database Table APIs**: Removed `/api/database/export`, `/api/database/import`, `/api/database/tables` endpoints

### Rationale
- **Core Functionality Redundancy**: Database export/import system overlapped with existing backup functionality
- **Backup Manager Sufficiency**: `@public/jsackupManager.js` provides complete database backup/restore functionality
- **Code Reduction**: Removed ~1300 lines of export/import management code
- **Architecture Streamlining**: Single backup system eliminates feature overlap

### Affected Components
- `server.js` - Removed database API route usage
- `public/index.html` - Removed export/import script references
- `public/css/index.css` - Removed export-import CSS imports
- `public/js/app.js` - Removed DatabaseExportImportManager initialization and export tree button creation

### Retained Functionality
- **Backup System**: `@public	sackupManager.js` provides comprehensive database backup/restore
- **Node Operations**: All core node creation, editing, and management preserved
- **Data Integrity**: Backup system maintains database consistency without table-specific complexity

### Technical Details
- **Code Reduction**: Eliminated ~1300 lines across JavaScript, CSS, and server files
- **Performance Improvement**: Removed unnecessary export/import APIs and DOM elements
- **UI Cleanup**: Eliminated export/import buttons, modals, and related UI complexity
- **Single Solution**: Unified backup approach for data management

## [0.32.1] - 2025-11-17

### Removed
- **Complete Vault System**: Deleted `vaultManager.js`, `vaultRoutes.js`, `vault-manager.css`, and related vault files
- **Multi-Database Support**: Removed vault-based database switching functionality
- **Vault Middleware**: Eliminated `req.currentVault` and vault-related request handling
- **Vault UI Elements**: Removed vault switching buttons and vault-based UI components
- **Global Vault State**: Removed `global.currentVault` and vault-based localStorage keys

### Changed
- **Simplified Database Architecture**: Single `outliner.db` database only - no vault switching
- **Streamlined Backup System**: Removed vault parameter from backup API calls
- **Simplified Default Focus**: Vault-aware node focus replaced with simple `main_default_focus_node`
- **Reduced Server Routing**: Removed `/api/vaults` endpoints and related middleware

### Technical Details
- **Database Layer**: Modified `getDb()` to always use main database path
- **Backup System**: `backupManager.js` now calls `/api/backup` without vault parameters
- **Focus Management**: Default focus node storage simplified to single key
- **Server Configuration**: Removed vault directory creation and multi-database middleware

### Affected Components
- `server.js` - Removed vault routes, middleware, and multi-database logic
- `database.js` - Simplified to single database connection
- `public/js/app.js` - Removed vault manager references and vault-aware focus logic
- `public/js/backupManager.js` - Eliminated vault parameter from backup calls

### Benefits
- **Code Reduction**: Removed vault system complexity (~300+ lines)
- **Maintenance Simplification**: Single database model eliminates vault switching issues
- **Performance Improvement**: Removed vault middleware overhead
- **Architecture Streamlining**: Simplified to core outliner functionality without database complexity

## [0.32.0] - 2025-11-17

### Added
- **New Plugin System**: Simple, extensible plugin architecture replacing complex plugin manager
- **Built-in Sample Plugin**: Tutorial Explorer plugin demonstrating the new system
- **Hook System**: Plugin hooks for event-driven architecture
- **Standalone Plugin Management Dialog**: Complete plugin management UI accessible via Alt+P shortcut
- **Plugin CSS Framework**: Comprehensive styling for plugin management UI
- **Plugin Dialog Integration**: Sidebar button and command palette commands for easy access

### Changed
- **Simplified Plugin Architecture**:
  - Replaced complex `pluginManager.js` with lightweight `plugins.js`
  - Removed dependency chains and complex initialization flows
  - Simplified registration to basic object definition
- **Enhanced Developer Experience**:
  - Clear plugin lifecycle (init/cleanup)
  - Hook system for plugins to interact with core features
  - Built-in sample plugin as development template
  - **Plugin Dialog System**: Professional standalone dialog for plugin management
- **Streamlined Integration**:
  - New plugin dialog accessible via sidebar button and Alt+P keyboard shortcut
  - Command palette integration for plugin management
  - Clean, professional dialog following SettingsManager design patterns
  - Settings modal also shows plugins via PluginSystem integration

### Removed
- **Complex Plugin Manager**: Deleted 340+ line `pluginManager.js` with complex state management
- **Plugin Aware Initializer**: Removed 113+ line `pluginAwareInitializer.js` dependency
- **Plugin Manager CSS**: Eliminated complex plugin management styling
- **Plugin Registration Middleware**: Removed plugin-to-plugin interaction complexity
- **Legacy Plugin UI**: Deleted separate plugin management interfaces

### Technical Details
- **New Plugin Architecture**:
  ```javascript
  // Simple plugin definition
  window.PluginSystem.register({
    id: 'tutorial-sample',
    name: 'Tutorial Explorer',
    description: 'Interactive tutorial system',
    init: function() { /* startup logic */ },
    cleanup: function() { /* shutdown logic */ }
  });
  ```
- **Hook System**: `registerHook()` and `triggerHook()` for plugin interactions
- **Plugin Dialog Architecture**:
  - **Standalone Modal**: Self-contained dialog following SettingsManager patterns
  - **Real CSS Variables**: Uses actual `--theme` variables from variables.css
  - **Dark Theme Support**: Complete dark mode implementation with proper variables
  - **Entry Points**: Sidebar button, Alt+P keyboard shortcut, command palette commands
  - **Professional Styling**: Card-based UI with toggle switches, no `!important` abuse
  - **Mobile Responsive**: Proper adaptation for small screens
- **Settings Integration**: Automatic plugin discovery and UI generation for both dialog and settings modal
- **Extensible Design**: Plugins can add commands, UI, and functionality

### Built-in Sample Plugin

The new `plugin-tutorialsample.js` demonstrates:
- Plugin registration and initialization
- UI element insertion (sidebar button)
- Command palette integration
- Event-driven hooks
- Interactive tutorials
- Clean startup/shutdown lifecycle

This serves as a template for future plugin development.

### Benefits

1. **Developer-Friendly**: Simplified API for creating plugins
2. **Maintainable**: Clear separation of core vs. plugin functionality
3. **Extensible**: Easy to add new features as plugins
4. **Modular**: Each plugin is self-contained with clear boundaries
5. **Testable**: Plugin lifecycle is predictable and isolated
6. **Future-Ready**: Clear path for plugin-based feature development
