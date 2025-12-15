# Plugin Development Template Guide

This guide shows you how to create a new plugin for Luhmann Roam, using the Image Viewer plugin as a reference example.

## Plugin Architecture Overview

All plugins follow this structure:

```
plugins/your-plugin/
├── Frontend (plugin UI)
│   ├── index.html              # Main UI
│   ├── styles.css              # Styles (or modular CSS)
│   ├── renderer.js             # Main initialization
│   ├── yourPluginLauncher.js   # Plugin launcher
│   └── [other JS/CSS files]    # Your plugin code
│
├── Backend (in main app root)
│   ├── controllers/yourController.js  # HTTP handlers
│   ├── services/yourService.js        # Business logic
│   └── routes/yourRoutes.js           # Route definitions
│
└── Database (optional)
    └── your-plugin.db          # SQLite database (if needed)
```

## Step-by-Step Plugin Creation

### Step 1: Create Plugin Directory

```bash
mkdir plugins/your-plugin
cd plugins/your-plugin
```

### Step 2: Create Frontend Files

**index.html** - Main UI structure:
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Plugin</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="app-container">
        <!-- Your plugin UI here -->
    </div>
    <script src="renderer.js"></script>
</body>
</html>
```

**renderer.js** - Main initialization:
```javascript
// Renderer process for Your Plugin

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // Your initialization code
    setupEventListeners();
    loadData();
}
```

**styles.css** - Basic styles:
```css
:root {
    --primary-color: #6366f1;
    --background: #f8fafc;
    /* Add your CSS variables */
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background-color: var(--background);
    margin: 0;
    padding: 0;
}

.app-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem;
}
```

### Step 3: Create Plugin Launcher

**yourPluginLauncher.js** - Integration with main app:

```javascript
/**
 * Your Plugin Launcher
 * Opens the plugin in a modal dialog
 */

class YourPluginLauncher {
  constructor() {
    this.modal = null;
    this.iframe = null;
    this.loadingIndicator = null;
    this.isFullscreen = false;
    this.init();
  }

  init() {
    // Get modal elements (must exist in public/index.html)
    this.modal = document.getElementById('your-plugin-modal');
    this.iframe = document.getElementById('your-plugin-iframe');
    this.loadingIndicator = document.getElementById('your-plugin-loading');
    
    // Register plugin in registry
    this.registerPlugin();
    
    // Add button to sidebar
    this.addLauncherButton();
    
    // Setup modal controls
    this.setupModalControls();
  }

  registerPlugin() {
    // Wait for PluginRegistry to be available
    if (!window.PluginRegistry) {
      setTimeout(() => this.registerPlugin(), 100);
      return;
    }

    // Initialize registry if needed
    if (typeof window.PluginRegistry.initialize === 'function') {
      window.PluginRegistry.initialize();
    }

    // Register the plugin
    window.PluginRegistry.register('your-plugin', {
      name: 'Your Plugin',
      description: 'Description of your plugin',
      version: '1.0.0',
      author: 'Your Name',
      icon: '🔌',
      category: 'tools',
      enabled: window.PluginRegistry.loadPluginState('your-plugin'),
      launch: () => {
        this.openPluginModal();
      },
      onEnable: () => {
        console.log('[Your Plugin] Plugin enabled');
        this.updateButtonState();
      },
      onDisable: () => {
        console.log('[Your Plugin] Plugin disabled');
        this.updateButtonState();
        if (this.modal && this.modal.classList.contains('visible')) {
          this.closePluginModal();
        }
      }
    });
  }

  addLauncherButton() {
    const button = document.createElement("button");
    button.id = "your-plugin-launcher";
    button.className = "feature-toggle";
    button.textContent = "🔌 Your Plugin";
    button.title = "Open Your Plugin";
    
    button.addEventListener("click", () => {
      const plugin = window.PluginRegistry?.get('your-plugin');
      if (plugin && !plugin.enabled) {
        alert('Your Plugin is disabled. Enable it in Settings > Plugins.');
        return;
      }
      this.openPluginModal();
    });
    
    this.updateButtonState();
    
    if (window.addButtonToSidebar) {
      window.addButtonToSidebar(button);
    }
  }

  updateButtonState() {
    const button = document.getElementById('your-plugin-launcher');
    if (!button) return;
    
    const plugin = window.PluginRegistry?.get('your-plugin');
    if (plugin) {
      button.disabled = !plugin.enabled;
      button.style.opacity = plugin.enabled ? '1' : '0.5';
    }
  }

  setupModalControls() {
    const closeBtn = document.getElementById('your-plugin-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closePluginModal());
    }
    
    const fullscreenBtn = document.getElementById('your-plugin-fullscreen');
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
    }
    
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) {
          this.closePluginModal();
        }
      });
    }
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal && this.modal.classList.contains('visible')) {
        if (this.isFullscreen) {
          this.toggleFullscreen();
        } else {
          this.closePluginModal();
        }
      }
    });
  }

  async openPluginModal() {
    // Health check
    try {
      const response = await fetch('/api/plugins/your-plugin/health');
      if (!response.ok) throw new Error(`API responded with status ${response.status}`);
    } catch (error) {
      alert('Your Plugin API is not responding. Please make sure the server is running.');
      return;
    }

    // Show modal
    this.modal.classList.add('visible');

    // Load iframe
    const iframeUrl = '/plugins/your-plugin/index.html';
    
    if (this.iframe) {
      this.iframe.onload = () => {
        this.iframe.classList.add('loaded');
        if (this.loadingIndicator) {
          this.loadingIndicator.style.display = 'none';
        }
      };

      if (this.iframe.src !== iframeUrl) {
        this.iframe.src = iframeUrl;
      } else {
        this.iframe.src = '';
        setTimeout(() => {
          this.iframe.src = iframeUrl;
        }, 100);
      }
    }

    if (this.loadingIndicator) {
      this.loadingIndicator.style.display = 'block';
    }
  }

  closePluginModal() {
    this.modal.classList.add('closing');
    
    setTimeout(() => {
      this.modal.classList.remove('visible', 'closing');
      if (this.isFullscreen) {
        this.isFullscreen = false;
        this.modal.classList.remove('fullscreen');
      }
      if (this.loadingIndicator) {
        this.loadingIndicator.style.display = 'block';
        this.loadingIndicator.textContent = 'Loading Your Plugin...';
      }
    }, 200);
  }

  toggleFullscreen() {
    this.isFullscreen = !this.isFullscreen;
    
    if (this.isFullscreen) {
      this.modal.classList.add('fullscreen');
    } else {
      this.modal.classList.remove('fullscreen');
    }
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  function initLauncher() {
    if (window.PluginRegistry) {
      if (typeof window.PluginRegistry.initialize === 'function') {
        window.PluginRegistry.initialize();
      }
      new YourPluginLauncher();
    } else {
      setTimeout(initLauncher, 100);
    }
  }
  
  setTimeout(initLauncher, 500);
});
```

### Step 4: Add Modal HTML to Main App

Add to `public/index.html` (after other plugin modals):

```html
<!-- Your Plugin Modal -->
<div id="your-plugin-modal" class="your-plugin-modal">
  <div class="your-plugin-header">
    <h3>Your Plugin</h3>
    <div class="your-plugin-controls">
      <button id="your-plugin-fullscreen" class="your-plugin-btn" title="Toggle Fullscreen">⛶</button>
      <button id="your-plugin-close" class="your-plugin-btn" title="Close">✕</button>
    </div>
  </div>
  <div class="your-plugin-content">
    <div id="your-plugin-loading" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 18px; color: #666; z-index: 1; pointer-events: none;">Loading Your Plugin...</div>
    <iframe id="your-plugin-iframe" src="" frameborder="0"></iframe>
  </div>
</div>
```

### Step 5: Add Modal CSS

Create `public/css/your-plugin-modal.css`:

```css
/* Your Plugin Modal Styles */

.your-plugin-modal {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  z-index: 10000;
  padding: 20px;
  box-sizing: border-box;
}

.your-plugin-modal.visible {
  display: flex;
  flex-direction: column;
}

.your-plugin-modal.fullscreen {
  padding: 0;
}

.your-plugin-header {
  background: #6366f1;
  color: white;
  padding: 12px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 8px 8px 0 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.your-plugin-modal.fullscreen .your-plugin-header {
  border-radius: 0;
}

.your-plugin-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.your-plugin-controls {
  display: flex;
  gap: 10px;
}

.your-plugin-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.your-plugin-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.your-plugin-content {
  flex: 1;
  background: white;
  border-radius: 0 0 8px 8px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  position: relative;
}

.your-plugin-modal.fullscreen .your-plugin-content {
  border-radius: 0;
}

#your-plugin-iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
  transition: opacity 0.3s ease-in;
}

#your-plugin-iframe:not(.loaded) {
  opacity: 0;
}

#your-plugin-iframe.loaded {
  opacity: 1;
}

.your-plugin-content:has(#your-plugin-iframe.loaded)::before {
  display: none;
}

.your-plugin-modal.visible {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.your-plugin-modal.closing {
  animation: fadeOut 0.2s ease-out;
}

@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}
```

Add CSS import to `public/index.html`:
```html
<link rel="stylesheet" href="css/your-plugin-modal.css">
```

### Step 6: Create Backend Files

**routes/yourRoutes.js** - Route definitions:

```javascript
const express = require("express");
const yourController = require("../controllers/yourController");

const router = express.Router();

// Routes
router.get("/health", yourController.health);
router.get("/data", yourController.getData);
router.post("/data", yourController.createData);
// Add more routes as needed

module.exports = router;
```

**controllers/yourController.js** - HTTP handlers:

```javascript
const yourService = require("../services/yourService");

exports.health = (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
};

exports.getData = async (req, res) => {
  try {
    const data = await yourService.getData();
    res.json({ success: true, data });
  } catch (error) {
    console.error("Get data error:", error);
    res.status(500).json({ error: "Failed to get data", details: error.message });
  }
};

exports.createData = async (req, res) => {
  try {
    const result = await yourService.createData(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Create data error:", error);
    res.status(500).json({ error: "Failed to create data", details: error.message });
  }
};
```

**services/yourService.js** - Business logic:

```javascript
const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();
const { open } = require("sqlite");

const DB_PATH = path.join(__dirname, "..", "plugins", "your-plugin", "your-plugin.db");

let dbInstance = null;

async function getDb() {
  if (dbInstance) {
    return dbInstance;
  }
  
  dbInstance = await open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  });
  
  // Initialize database schema
  await initializeDatabase(dbInstance);
  
  return dbInstance;
}

async function initializeDatabase(db) {
  // Create tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS your_table (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);
}

exports.getData = async () => {
  const db = await getDb();
  return await db.all("SELECT * FROM your_table ORDER BY created_at DESC");
};

exports.createData = async (data) => {
  const db = await getDb();
  const id = require("uuid").v4();
  const createdAt = Date.now();
  
  await db.run(
    "INSERT INTO your_table (id, data, created_at) VALUES (?, ?, ?)",
    [id, JSON.stringify(data), createdAt]
  );
  
  return { id, data, created_at: createdAt };
};
```

### Step 7: Register Routes in Server

Add to `server.js`:

```javascript
// At the top with other requires
const yourRoutes = require("./routes/yourRoutes");

// With other API routes (around line 81)
app.use("/api/plugins/your-plugin", yourRoutes);

// With other static file serving (around line 426)
app.use("/plugins/your-plugin", express.static(path.join(__dirname, "plugins", "your-plugin")));
```

### Step 8: Load Launcher Script

Add to `public/index.html` (before closing `</body>`):

```html
<script src="/plugins/your-plugin/yourPluginLauncher.js"></script>
```

## Reference: Image Viewer Plugin Structure

For a complete example, see the Image Viewer plugin:

- **Frontend**: `plugins/image-viewer/`
- **Backend**: `controllers/imageViewerController.js`, `services/imageViewerService.js`, `routes/imageViewerRoutes.js`
- **Launcher**: `plugins/image-viewer/imageViewerPluginLauncher.js`
- **Modal HTML**: `public/index.html` (lines 46-59)
- **Modal CSS**: `public/css/image-viewer-plugin-modal.css`
- **Documentation**: `plugins/image-viewer/README.md` and `ARCHITECTURE.md`

## Best Practices

### 1. Modular Code Organization

**JavaScript:**
- Split code into focused modules
- Each module has single responsibility
- Use clear, descriptive file names
- Keep modules under 200 lines when possible

**CSS:**
- Use modular CSS files
- Group related styles together
- Use CSS custom properties for theming
- Import modules in logical order

### 2. State Management

- Use global state variables for simple plugins
- Keep state in dedicated `state.js` file
- Document state variables
- Consider module pattern for complex state

### 3. Error Handling

**Frontend:**
- Use try/catch for async operations
- Show user-friendly error messages
- Use toast notifications for feedback
- Log errors to console for debugging

**Backend:**
- Validate all inputs
- Use parameterized queries (prevent SQL injection)
- Return consistent error format
- Log errors with context

### 4. API Design

- Use RESTful conventions
- Consistent response format: `{ success: true, data: ... }`
- Include error details: `{ error: "...", details: "..." }`
- Use appropriate HTTP status codes

### 5. Database Design

- Use separate database file for plugin
- Enable foreign keys for referential integrity
- Create indexes on frequently queried columns
- Use migrations for schema changes

### 6. Plugin Integration

- Always check PluginRegistry availability
- Implement enable/disable callbacks
- Update button state based on enabled status
- Handle modal cleanup on disable

### 7. Documentation

- Create README.md with usage instructions
- Create ARCHITECTURE.md for complex plugins
- Document API endpoints
- Include code comments for complex logic

## Testing Your Plugin

### Checklist

- [ ] Plugin appears in Settings > Plugins
- [ ] Plugin can be enabled/disabled
- [ ] Sidebar button appears when enabled
- [ ] Modal opens when clicking button
- [ ] Health check endpoint works
- [ ] API endpoints respond correctly
- [ ] Database operations work
- [ ] Errors handled gracefully
- [ ] Fullscreen toggle works
- [ ] ESC key closes modal
- [ ] Modal closes on backdrop click

## Common Patterns

### Pattern 1: Simple Data Display Plugin

```javascript
// renderer.js
async function loadData() {
  const response = await fetch('/api/plugins/your-plugin/data');
  const result = await response.json();
  displayData(result.data);
}
```

### Pattern 2: Form Submission Plugin

```javascript
// renderer.js
async function submitForm(formData) {
  const response = await fetch('/api/plugins/your-plugin/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  });
  const result = await response.json();
  if (result.success) {
    showToast('Success!', 'success');
  }
}
```

### Pattern 3: File Upload Plugin

```javascript
// renderer.js
async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/api/plugins/your-plugin/upload', {
    method: 'POST',
    body: formData
  });
  
  return await response.json();
}
```

## Troubleshooting

### Plugin not appearing in Settings
- Check PluginRegistry.register() is called
- Verify plugin ID is unique
- Check browser console for errors

### Modal not opening
- Verify modal HTML exists in `public/index.html`
- Check modal CSS is loaded
- Verify iframe src is correct

### API not responding
- Check routes registered in `server.js`
- Verify controller methods exist
- Check server console for errors

### Database errors
- Verify database file path is correct
- Check database schema initialization
- Verify SQLite3 package installed

## Next Steps

1. **Start Simple**: Create a basic plugin first
2. **Iterate**: Add features incrementally
3. **Test**: Test each feature as you add it
4. **Document**: Update documentation as you go
5. **Refactor**: Improve code organization as needed

## Resources

- **Image Viewer Plugin**: Complete reference implementation
- **Graph Plugin**: Another example plugin
- **PluginRegistry**: `public/js/pluginRegistry.js`
- **Main App Structure**: See `PROJECT_STRUCTURE.md`

## Support

For questions or issues:
1. Check existing plugin documentation
2. Review Image Viewer plugin code
3. Check main app documentation
4. Review server.js for integration patterns

Happy plugin development! 🚀

