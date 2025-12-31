# Image Viewer Plugin - Integration Points Reference

This document provides a quick reference for all integration points between the Image Viewer plugin and the main Luhmann Roam app. Useful for developers understanding how plugins integrate with the main app.

## Quick Integration Map

```
┌─────────────────────────────────────────────────────────────┐
│                    Main App (Luhmann Roam)                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  public/index.html                                          │
│  ├── Modal HTML (lines 46-59) ────────────────────────────┐│
│  └── Launcher Script (line 97) ──────────────────────────┐ ││
│                                                           │ ││
│  public/css/image-viewer-plugin-modal.css ───────────────┼─┘│
│  (Modal wrapper styles)                                   │  │
│                                                           │  │
│  server.js                                                │  │
│  ├── API Routes (line 81) ────────────────────────────────┼──┤
│  └── Static Files (line 426) ─────────────────────────────┼──┤
│                                                           │  │
└───────────────────────────────────────────────────────────┼──┘
                                                            │
┌───────────────────────────────────────────────────────────┼──┐
│              Image Viewer Plugin                          │  │
├───────────────────────────────────────────────────────────┼──┤
│                                                           │  │
│  plugins/image-viewer/                                    │  │
│  ├── imageViewerPluginLauncher.js ───────────────────────┘  │
│  │   (Registers plugin, adds button, controls modal)        │
│  │                                                           │
│  ├── index.html                                             │
│  │   (Plugin UI - loads in iframe)                          │
│  │                                                           │
│  ├── renderer.js                                            │
│  │   (Main initialization)                                  │
│  │                                                           │
│  ├── js/*.js                                                │
│  │   (13 modular JavaScript files)                           │
│  │                                                           │
│  └── css/*.css                                              │
│      (15 modular CSS files)                                 │
│                                                              │
│  Backend (in main app root):                                │
│  ├── controllers/imageViewerController.js                   │
│  ├── services/imageViewerService.js                         │
│  └── routes/imageViewerRoutes.js                             │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Integration Points

### 1. Modal HTML (`public/index.html`)

**Location**: Lines 46-59

**Purpose**: Defines the modal wrapper that contains the plugin iframe

**Structure**:
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

**Why here?**: Modal needs to be in main app DOM to overlay correctly. Plugin loads in iframe within modal.

### 2. Modal CSS (`public/css/image-viewer-plugin-modal.css`)

**Location**: `public/css/image-viewer-plugin-modal.css`

**Purpose**: Styles for the modal wrapper (not the plugin itself)

**Linked in**: `public/index.html` line 13

**Styles**: Modal container, header, controls, fullscreen mode, animations

### 3. Launcher Script (`public/index.html`)

**Location**: Line 97

**Code**:
```html
<script src="/plugins/image-viewer/imageViewerPluginLauncher.js"></script>
```

**Purpose**: Loads the plugin launcher which:
- Registers plugin with PluginRegistry
- Adds sidebar button
- Controls modal opening/closing
- Handles enable/disable functionality

### 4. API Routes (`server.js`)

**Location**: Line 81

**Code**:
```javascript
app.use("/api/plugins/image-viewer", imageViewerRoutes);
```

**Purpose**: Registers all API endpoints at `/api/plugins/image-viewer/*`

**Routes defined in**: `routes/imageViewerRoutes.js`

**Handlers in**: `controllers/imageViewerController.js`

**Logic in**: `services/imageViewerService.js`

### 5. Static Files (`server.js`)

**Location**: Line 426

**Code**:
```javascript
app.use("/plugins/image-viewer", express.static(path.join(__dirname, "plugins", "image-viewer")));
```

**Purpose**: Serves plugin UI files at `/plugins/image-viewer/*`

**Serves**: `index.html`, `styles.css`, `renderer.js`, `js/*`, `css/*`, etc.

### 6. Plugin Launcher (`plugins/image-viewer/imageViewerPluginLauncher.js`)

**Purpose**: Handles all integration between plugin and main app

**Key Functions**:
- `registerPlugin()` - Registers with PluginRegistry
- `addLauncherButton()` - Adds sidebar button
- `openViewerModal()` - Opens modal and loads plugin
- `closeViewerModal()` - Closes modal
- `toggleFullscreen()` - Toggles fullscreen mode

**Integration**:
- Uses modal HTML from `public/index.html`
- Uses modal CSS from `public/css/image-viewer-plugin-modal.css`
- Loads plugin from `/plugins/image-viewer/index.html`
- Communicates with API at `/api/plugins/image-viewer/*`

## File Locations Summary

| Component | Location | Purpose |
|-----------|----------|---------|
| **Modal HTML** | `public/index.html` (lines 46-59) | Modal wrapper structure |
| **Modal CSS** | `public/css/image-viewer-plugin-modal.css` | Modal wrapper styles |
| **Launcher Script** | `public/index.html` (line 97) | Script tag loading launcher |
| **Launcher Code** | `plugins/image-viewer/imageViewerPluginLauncher.js` | Launcher implementation |
| **API Routes** | `server.js` (line 81) | Route registration |
| **Route Definitions** | `routes/imageViewerRoutes.js` | Route definitions |
| **Controllers** | `controllers/imageViewerController.js` | HTTP handlers |
| **Services** | `services/imageViewerService.js` | Business logic |
| **Static Files** | `server.js` (line 426) | Static file serving |
| **Plugin UI** | `plugins/image-viewer/index.html` | Plugin interface |
| **Plugin JS** | `plugins/image-viewer/js/*.js` | Plugin JavaScript |
| **Plugin CSS** | `plugins/image-viewer/css/*.css` | Plugin styles |
| **Database** | `plugins/image-viewer/image-viewer.db` | Plugin database |

## Integration Flow

### Plugin Initialization

```
1. Main app loads public/index.html
   ↓
2. Modal HTML exists in DOM (lines 46-59)
   ↓
3. Launcher script loads (line 97)
   ↓
4. imageViewerPluginLauncher.js executes
   ↓
5. Waits for PluginRegistry (DOMContentLoaded)
   ↓
6. Registers plugin with PluginRegistry
   ↓
7. Adds sidebar button
   ↓
8. Sets up modal controls
```

### Opening Plugin

```
1. User clicks sidebar button
   ↓
2. Launcher checks if plugin enabled
   ↓
3. Health check: GET /api/plugins/image-viewer/health
   ↓
4. Shows modal: modal.classList.add('visible')
   ↓
5. Loads iframe: iframe.src = '/plugins/image-viewer/index.html'
   ↓
6. Plugin loads in iframe
   ↓
7. Plugin makes API calls to /api/plugins/image-viewer/*
```

### API Request Flow

```
1. Plugin makes request: fetch('/api/plugins/image-viewer/images')
   ↓
2. Express routes to: routes/imageViewerRoutes.js
   ↓
3. Route handler calls: controllers/imageViewerController.js: getImages()
   ↓
4. Controller calls: services/imageViewerService.js: getImages()
   ↓
5. Service queries: image-viewer.db
   ↓
6. Response returned to plugin
```

## Key Patterns

### Pattern 1: Plugin Registration

```javascript
window.PluginRegistry.register('plugin-id', {
  name: 'Plugin Name',
  description: 'Description',
  version: '1.0.0',
  icon: '🔌',
  category: 'tools',
  enabled: window.PluginRegistry.loadPluginState('plugin-id'),
  launch: () => { /* open modal */ },
  onEnable: () => { /* enable callback */ },
  onDisable: () => { /* disable callback */ }
});
```

### Pattern 2: Modal Integration

```javascript
// Modal HTML in public/index.html
<div id="plugin-modal" class="plugin-modal">
  <div class="plugin-header">
    <h3>Plugin</h3>
    <button id="plugin-close">✕</button>
  </div>
  <div class="plugin-content">
    <iframe id="plugin-iframe" src=""></iframe>
  </div>
</div>

// Launcher code
this.modal = document.getElementById('plugin-modal');
this.iframe = document.getElementById('plugin-iframe');
this.modal.classList.add('visible');
this.iframe.src = '/plugins/plugin/index.html';
```

### Pattern 3: API Integration

```javascript
// Frontend (plugin)
const response = await fetch('/api/plugins/plugin/endpoint');
const data = await response.json();

// Backend (server.js)
app.use("/api/plugins/plugin", pluginRoutes);

// Backend (routes/pluginRoutes.js)
router.get("/endpoint", pluginController.getData);

// Backend (controllers/pluginController.js)
exports.getData = async (req, res) => {
  const data = await pluginService.getData();
  res.json({ success: true, data });
};
```

## Common Integration Tasks

### Adding a New API Endpoint

1. **Add route** in `routes/imageViewerRoutes.js`:
   ```javascript
   router.get("/new-endpoint", imageViewerController.newEndpoint);
   ```

2. **Add handler** in `controllers/imageViewerController.js`:
   ```javascript
   exports.newEndpoint = async (req, res) => {
     const result = await imageViewerService.newOperation();
     res.json({ success: true, data: result });
   };
   ```

3. **Add service method** in `services/imageViewerService.js`:
   ```javascript
   exports.newOperation = async () => {
     const db = await getDb();
     // Database operations
     return result;
   };
   ```

### Adding a New Frontend Feature

1. **Add UI** in `plugins/image-viewer/index.html`

2. **Add styles** in appropriate `css/*.css` file

3. **Add JavaScript** in appropriate `js/*.js` file or create new module

4. **Update renderer.js** if new initialization needed

5. **Load script** in `index.html` if new module created

### Modifying Modal Behavior

1. **Modal HTML**: Edit `public/index.html` (lines 46-59)

2. **Modal CSS**: Edit `public/css/image-viewer-plugin-modal.css`

3. **Modal Logic**: Edit `plugins/image-viewer/imageViewerPluginLauncher.js`

## Troubleshooting Integration Issues

### Plugin not appearing in Settings
- Check `PluginRegistry.register()` is called
- Verify plugin ID is unique
- Check browser console for errors

### Modal not opening
- Verify modal HTML exists in `public/index.html`
- Check modal CSS is loaded
- Verify launcher script is loaded
- Check browser console for errors

### API not responding
- Verify routes registered in `server.js`
- Check route definitions in `routes/imageViewerRoutes.js`
- Verify controller methods exist
- Check server console for errors

### Static files not loading
- Verify static file serving in `server.js`
- Check file paths are correct
- Verify files exist in `plugins/image-viewer/`

## For New Plugin Developers

When creating a new plugin:

1. **Copy structure** from Image Viewer plugin
2. **Follow patterns** shown in this document
3. **Reference** `docs/development/PLUGIN_TEMPLATE.md`
4. **Update** all integration points:
   - Modal HTML in `public/index.html`
   - Modal CSS in `public/css/`
   - Launcher script tag in `public/index.html`
   - API routes in `server.js`
   - Static files in `server.js`

## Related Documentation

- **Plugin Template Guide**: `docs/development/PLUGIN_TEMPLATE.md`
- **Plugin README**: `plugins/image-viewer/README.md`
- **Plugin Architecture**: `plugins/image-viewer/ARCHITECTURE.md`
- **Main App Structure**: `PROJECT_STRUCTURE.md`

