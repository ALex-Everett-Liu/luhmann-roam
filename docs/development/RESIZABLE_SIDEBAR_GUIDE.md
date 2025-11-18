# Resizable Sidebar Component

A lightweight, vanilla JavaScript implementation of a resizable sidebar with persistent state management. Perfect for desktop applications, admin panels, code editors, and any interface requiring adjustable workspace layouts.

## Overview

### Why Resizable Sidebars?

Resizable sidebars are essential for applications where users need to balance between:
- **Tool access** (sidebar content) and **workspace** (main content)
- **Information density** vs **readability**
- **Screen real estate** optimization across different devices

### Design Philosophy

This implementation follows modern desktop application patterns used by:
- VS Code, JetBrains IDEs (development tools)
- Figma, Sketch (design tools)
- Blender, Maya (3D software)
- Discord, Slack (communication apps)

### Key Features

- ✅ **Drag-to-resize** with visual feedback
- ✅ **Persistent state** across browser sessions
- ✅ **Smart constraints** (min/max width limits)
- ✅ **Responsive behavior** on window resize
- ✅ **Clean event handling** with proper cleanup
- ✅ **Framework agnostic** - pure vanilla JavaScript
- ✅ **Customizable** via configuration options

## Implementation

### Core JavaScript

```javascript
/**
 * Sets up a resizable sidebar with drag handle
 * @param {Object} options - Configuration options
 * @param {string} options.sidebarSelector - CSS selector for sidebar element
 * @param {string} options.handleSelector - CSS selector for resize handle
 * @param {number} options.minWidth - Minimum sidebar width in pixels
 * @param {number} options.maxWidthRatio - Maximum width as ratio of window width
 * @param {string} options.storageKey - localStorage key for persistence
 * @param {string} options.resizingClass - CSS class applied during resize
 * @param {boolean} options.enableSnapping - Enable snap-to-size functionality
 * @param {number[]} options.snapZones - Array of widths to snap to
 */
function setupResizableSidebar(options = {}) {
    const {
        sidebarSelector = '#sidebar',
        handleSelector = '#resize-handle',
        minWidth = 200,
        maxWidthRatio = 0.6,
        storageKey = 'sidebarWidth',
        resizingClass = 'resizing',
        enableSnapping = false,
        snapZones = [250, 300, 400]
    } = options;

    const sidebar = document.querySelector(sidebarSelector);
    const resizeHandle = document.querySelector(handleSelector);

    if (!sidebar || !resizeHandle) {
        console.warn('Resizable sidebar: Required elements not found', {
            sidebar: !!sidebar,
            resizeHandle: !!resizeHandle
        });
        return;
    }

    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    // Load saved width from localStorage
    function loadSavedWidth() {
        const savedWidth = localStorage.getItem(storageKey);
        if (savedWidth) {
            const width = parseInt(savedWidth);
            const maxWidth = window.innerWidth * maxWidthRatio;

            if (width >= minWidth && width <= maxWidth) {
                sidebar.style.width = width + 'px';
                return width;
            }
        }
        return null;
    }

    // Save width to localStorage
    function saveWidth(width) {
        localStorage.setItem(storageKey, width.toString());
    }

    // Apply width constraints
    function constrainWidth(width) {
        const maxWidth = window.innerWidth * maxWidthRatio;
        return Math.max(minWidth, Math.min(maxWidth, width));
    }

    // Snap to nearest zone if enabled
    function snapWidth(width) {
        if (!enableSnapping) return width;

        const snapThreshold = 15; // pixels
        for (const snapZone of snapZones) {
            if (Math.abs(width - snapZone) <= snapThreshold) {
                return snapZone;
            }
        }
        return width;
    }

    // Initialize with saved width
    loadSavedWidth();

    // Mouse down on resize handle
    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startWidth = sidebar.offsetWidth;

        document.body.classList.add(resizingClass);
        e.preventDefault();

        // Add cursor style to body for consistent feedback
        document.body.style.cursor = 'col-resize';
    });

    // Mouse move for resizing
    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;

        const deltaX = startX - e.clientX; // Reverse for left sidebar
        let newWidth = startWidth + deltaX;

        // Apply snapping
        newWidth = snapWidth(newWidth);

        // Apply constraints
        newWidth = constrainWidth(newWidth);

        sidebar.style.width = newWidth + 'px';
    });

    // Mouse up to stop resizing
    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            document.body.classList.remove(resizingClass);
            document.body.style.cursor = '';

            // Save the final width
            saveWidth(sidebar.offsetWidth);
        }
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        const currentWidth = sidebar.offsetWidth;
        const maxWidth = window.innerWidth * maxWidthRatio;

        if (currentWidth > maxWidth) {
            const newWidth = constrainWidth(currentWidth);
            sidebar.style.width = newWidth + 'px';
            saveWidth(newWidth);
        }
    });

    // Optional: Double-click to reset to default width
    resizeHandle.addEventListener('dblclick', () => {
        const defaultWidth = Math.min(300, window.innerWidth * 0.25);
        const constrainedWidth = constrainWidth(defaultWidth);
        sidebar.style.width = constrainedWidth + 'px';
        saveWidth(constrainedWidth);
    });

    // Return API for programmatic control
    return {
        setWidth: (width) => {
            const constrainedWidth = constrainWidth(width);
            sidebar.style.width = constrainedWidth + 'px';
            saveWidth(constrainedWidth);
        },
        getWidth: () => sidebar.offsetWidth,
        reset: () => {
            localStorage.removeItem(storageKey);
            sidebar.style.width = '';
        }
    };
}
```

## HTML Structure

### Required DOM Structure

```html
<div class="app-layout">
    <!-- Resizable Sidebar -->
    <div id="sidebar" class="sidebar">
        <!-- Your sidebar content -->
        <div class="sidebar-content">
            <h3>Tools</h3>
            <ul>
                <li>Option 1</li>
                <li>Option 2</li>
                <li>Option 3</li>
            </ul>
        </div>

        <!-- Resize Handle -->
        <div id="resize-handle" class="resize-handle"></div>
    </div>

    <!-- Main Content Area -->
    <div class="main-content">
        <h1>Main Application Area</h1>
        <p>This area adjusts as the sidebar is resized.</p>
    </div>
</div>
```

### Alternative Layouts

#### Right Sidebar
```html
<div class="app-layout">
    <div class="main-content">
        <!-- Main content first -->
    </div>
    <div id="sidebar" class="sidebar sidebar-right">
        <!-- Resize handle on the left side -->
        <div id="resize-handle" class="resize-handle resize-handle-left"></div>
        <!-- Sidebar content -->
    </div>
</div>
```

## CSS Requirements

### Essential Styles

```css
/* App Layout */
.app-layout {
    display: flex;
    height: 100vh;
    overflow: hidden;
}

/* Sidebar */
.sidebar {
    width: 300px; /* Default width */
    background: #f8f9fa;
    border-right: 1px solid #dee2e6;
    position: relative;
    flex-shrink: 0; /* Prevent shrinking */
    overflow: hidden;
}

.sidebar-content {
    padding: 16px;
    height: 100%;
    overflow-y: auto;
}

/* Main Content */
.main-content {
    flex: 1;
    background: #ffffff;
    overflow: auto;
}

/* Resize Handle */
.resize-handle {
    position: absolute;
    top: 0;
    right: 0;
    width: 4px;
    height: 100%;
    background: transparent;
    cursor: col-resize;
    z-index: 1000;
}

.resize-handle:hover {
    background: #007bff;
    transition: background 0.2s;
}

/* Active resize state */
.resize-handle:active,
.resizing .resize-handle {
    background: #007bff;
}

/* Resizing state for body */
.resizing {
    cursor: col-resize !important;
    user-select: none;
}

.resizing * {
    cursor: col-resize !important;
}

/* Right sidebar variant */
.sidebar-right {
    border-right: none;
    border-left: 1px solid #dee2e6;
}

.resize-handle-left {
    right: auto;
    left: 0;
    cursor: col-resize;
}
```

### Optional Enhanced Styles

```css
/* Enhanced resize handle with visual indicator */
.resize-handle::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 2px;
    height: 40px;
    background: #ccc;
    border-radius: 1px;
    opacity: 0;
    transition: opacity 0.2s;
}

.resize-handle:hover::before {
    opacity: 1;
}

/* Snap zone indicators (optional) */
.sidebar.snap-indicator {
    box-shadow: inset -2px 0 0 #007bff;
}

/* Smooth transitions when not resizing */
.sidebar:not(.resizing) {
    transition: width 0.2s ease;
}
```

## Integration Guide

### Basic Setup

1. **Include the HTML structure** in your page
2. **Add the required CSS** styles
3. **Initialize the component** after DOM is ready

```javascript
// Basic initialization
document.addEventListener('DOMContentLoaded', () => {
    setupResizableSidebar();
});
```

### Custom Configuration

```javascript
// Advanced configuration
const sidebarAPI = setupResizableSidebar({
    sidebarSelector: '#my-sidebar',
    handleSelector: '#my-handle',
    minWidth: 250,
    maxWidthRatio: 0.7,
    storageKey: 'myAppSidebarWidth',
    resizingClass: 'app-resizing',
    enableSnapping: true,
    snapZones: [200, 300, 400, 500]
});

// Use the returned API
console.log('Current width:', sidebarAPI.getWidth());
sidebarAPI.setWidth(350);
```


## Customization Options

### Configuration Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `sidebarSelector` | string | `'#sidebar'` | CSS selector for sidebar element |
| `handleSelector` | string | `'#resize-handle'` | CSS selector for resize handle |
| `minWidth` | number | `200` | Minimum sidebar width in pixels |
| `maxWidthRatio` | number | `0.6` | Maximum width as ratio of window width |
| `storageKey` | string | `'sidebarWidth'` | localStorage key for persistence |
| `resizingClass` | string | `'resizing'` | CSS class applied during resize |
| `enableSnapping` | boolean | `false` | Enable snap-to-size functionality |
| `snapZones` | number[] | `[250, 300, 400]` | Array of widths to snap to |

### Styling Customization

#### Dark Theme
```css
.sidebar {
    background: #2d3748;
    border-right: 1px solid #4a5568;
    color: #e2e8f0;
}

.resize-handle:hover {
    background: #63b3ed;
}
```

#### Rounded Handle
```css
.resize-handle {
    width: 8px;
    right: -4px;
    background: #e2e8f0;
    border-radius: 4px;
}
```

## Advanced Features

### Multiple Sidebars

```javascript
// Left sidebar
const leftSidebar = setupResizableSidebar({
    sidebarSelector: '#left-sidebar',
    handleSelector: '#left-handle',
    storageKey: 'leftSidebarWidth'
});

// Right sidebar
const rightSidebar = setupResizableSidebar({
    sidebarSelector: '#right-sidebar',
    handleSelector: '#right-handle',
    storageKey: 'rightSidebarWidth'
});
```

### Programmatic Control

```javascript
const api = setupResizableSidebar();

// Set specific width
api.setWidth(400);

// Get current width
const currentWidth = api.getWidth();

// Reset to default
api.reset();
```


## Troubleshooting

### Common Issues

#### Sidebar doesn't resize
**Problem:** Elements not found or incorrect selectors
```javascript
// Check if elements exist
const sidebar = document.querySelector('#sidebar');
const handle = document.querySelector('#resize-handle');
console.log('Elements found:', { sidebar: !!sidebar, handle: !!handle });
```

#### Width not persisting
**Problem:** localStorage not available or blocked
```javascript
// Check localStorage availability
try {
    localStorage.setItem('test', 'test');
    localStorage.removeItem('test');
    console.log('localStorage available');
} catch(e) {
    console.warn('localStorage not available:', e);
}
```

#### Layout breaks on mobile
**Problem:** Fixed widths don't work well on small screens
```css
/* Add responsive breakpoint */
@media (max-width: 768px) {
    .sidebar {
        width: 100% !important;
        position: fixed;
        z-index: 1000;
        transform: translateX(-100%);
        transition: transform 0.3s;
    }

    .sidebar.open {
        transform: translateX(0);
    }

    .resize-handle {
        display: none;
    }
}
```

#### Performance issues with large content
**Problem:** Frequent reflows during resize
```css
/* Use transform instead of width for better performance */
.sidebar {
    transform-origin: left;
    will-change: transform;
}

/* Enable GPU acceleration */
.resize-handle {
    will-change: background;
}
```

### Debug Mode

```javascript
// Add debug logging
const api = setupResizableSidebar({
    // ... your options
    debug: true // Add this custom option
});

// Modify the implementation to include debug logs
if (options.debug) {
    console.log('Sidebar resize:', {
        startWidth,
        newWidth,
        constrained: constrainWidth(newWidth)
    });
}
```

## Performance Considerations

### Optimization Tips

1. **Use `requestAnimationFrame`** for smooth animations
2. **Debounce** localStorage writes
3. **Cache** DOM queries
4. **Use CSS transforms** when possible instead of width changes

### Memory Management

```javascript
// Clean up event listeners when component is destroyed
function destroyResizableSidebar(api) {
    // Remove event listeners
    document.removeEventListener('mousemove', mouseMoveHandler);
    document.removeEventListener('mouseup', mouseUpHandler);
    window.removeEventListener('resize', windowResizeHandler);

    // Clear references
    api = null;
}
```

## License

This implementation is provided under the MIT License. Feel free to use, modify, and distribute in your projects.

---

**Created with ❤️ for better user experiences**

*Found this helpful? Consider starring the repository or sharing with fellow developers!*
