# WebP Converter Plugin

A powerful batch image converter plugin for Luhmann Roam, supporting multiple formats with quality control.

## Features

- **Multiple Format Support**: Convert images to WebP, JPEG, PNG, AVIF, and TIFF
- **Quality Control**: Adjustable quality settings (1-100)
- **Batch Processing**: Convert multiple images at once
- **Drag & Drop**: Easy file upload via drag and drop or file picker
- **Progress Tracking**: Real-time progress updates during conversion
- **File Size Comparison**: See original vs converted file sizes and savings percentage
- **Settings Persistence**: Your preferences are saved and restored automatically

## Usage

1. **Launch the Plugin**: Click the "🖼️ WebP Converter" button in the sidebar, or launch it from Settings > Plugins
2. **Select Images**: Drag and drop images or click "Select Images" to choose files
3. **Configure Settings**:
   - Adjust quality slider (1-100)
   - Choose output format (WebP, JPEG, PNG, AVIF, TIFF)
   - Optionally select a custom output directory
4. **Convert**: Click "Convert Images" to start the conversion process
5. **Download Results**: Click the download button on each converted image to save it

## Supported Formats

### Input Formats
- JPEG/JPG
- PNG
- GIF
- BMP
- TIFF
- WebP
- SVG

### Output Formats
- WebP (recommended for web)
- JPEG
- PNG
- AVIF (modern, high compression)
- TIFF

## API Endpoints

The plugin exposes the following API endpoints:

- `GET /api/plugins/webp-converter/health` - Health check
- `POST /api/plugins/webp-converter/convert` - Convert single image
- `POST /api/plugins/webp-converter/batch` - Batch convert multiple images
- `GET /api/plugins/webp-converter/formats` - Get supported formats
- `GET /api/plugins/webp-converter/info` - Get plugin information
- `POST /api/plugins/webp-converter/cleanup` - Clean up old files

## File Storage

- **Uploads**: Temporary files stored in `plugins/webp-converter/uploads/`
- **Output**: Converted files stored in `plugins/webp-converter/output/`
- **Cleanup**: Files older than 24 hours are automatically cleaned up

## Technical Details

- Built with Sharp for high-performance image processing
- Uses Multer for file upload handling
- Supports files up to 500MB
- Memory-efficient processing with streaming support
- Format-specific optimizations for best quality/size ratio

## Keyboard Shortcuts

- `Ctrl+O`: Open file picker
- `Ctrl+R`: Clear all selected images
- `Escape`: Cancel conversion (if in progress)

## Architecture

This plugin follows the same architecture pattern as the Graph Plugin:

- **Frontend**: `index.html`, `renderer.js`, `styles.css` - Plugin UI
- **Backend**: `routes/webpConverterRoutes.js` - API routes
- **Launcher**: `webpConverterPluginLauncher.js` - Plugin registration and modal management
- **Integration**: Routes integrated into main `server.js` at `/api/plugins/webp-converter/*`
- **Static Files**: Served from `/plugins/webp-converter/*` on main server

## License

Part of Luhmann Roam project.

