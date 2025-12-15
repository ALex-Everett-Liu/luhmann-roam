/**
 * Image Viewer Plugin Launcher
 * 
 * This file handles the integration between the Image Viewer plugin and the main Luhmann Roam app.
 * 
 * Integration Points:
 * 1. PluginRegistry: Registers plugin with main app's plugin system
 * 2. Sidebar Button: Adds launcher button to main app sidebar
 * 3. Modal HTML: Uses modal defined in public/index.html (lines 46-59)
 * 4. Modal CSS: Uses styles from public/css/image-viewer-plugin-modal.css
 * 5. Plugin UI: Loads plugin from /plugins/image-viewer/index.html in iframe
 * 6. API: Communicates with backend via /api/plugins/image-viewer/* endpoints
 * 
 * For developers creating new plugins, see: docs/development/PLUGIN_TEMPLATE.md
 * 
 * Opens the Image Viewer plugin in a modal dialog
 */

class ImageViewerPluginLauncher {
  constructor() {
    this.modal = null;
    this.iframe = null;
    this.loadingIndicator = null;
    this.isFullscreen = false;
    this.init();
  }

  init() {
    // Get modal elements
    this.modal = document.getElementById('image-viewer-plugin-modal');
    this.iframe = document.getElementById('image-viewer-plugin-iframe');
    this.loadingIndicator = document.getElementById('image-viewer-plugin-loading');
    
    console.log('[Image Viewer Plugin] Initialized launcher', {
      modal: !!this.modal,
      iframe: !!this.iframe,
      loadingIndicator: !!this.loadingIndicator
    });
    
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
      console.warn('[Image Viewer Plugin] PluginRegistry not available, retrying...');
      setTimeout(() => this.registerPlugin(), 100);
      return;
    }

    // Initialize registry if needed
    if (typeof window.PluginRegistry.initialize === 'function') {
      window.PluginRegistry.initialize();
    }

    // Register the image viewer plugin
    window.PluginRegistry.register('image-viewer-plugin', {
      name: 'Image Viewer',
      description: 'Image viewer with zoom, fullscreen, tags, ratings, and local server access',
      version: '1.0.0',
      author: 'Luhmann Roam',
      icon: '🖼️',
      category: 'tools',
      enabled: window.PluginRegistry.loadPluginState('image-viewer-plugin'),
      launch: () => {
        this.openViewerModal();
      },
      onEnable: () => {
        console.log('[Image Viewer Plugin] Plugin enabled');
        this.updateButtonState();
      },
      onDisable: () => {
        console.log('[Image Viewer Plugin] Plugin disabled');
        this.updateButtonState();
        // Close modal if open
        if (this.modal && this.modal.classList.contains('visible')) {
          this.closeViewerModal();
        }
      }
    });

    console.log('[Image Viewer Plugin] Registered in PluginRegistry');
  }

  addLauncherButton() {
    const button = document.createElement("button");
    button.id = "image-viewer-plugin-launcher";
    button.className = "feature-toggle";
    button.textContent = "🖼️ Image Viewer";
    button.title = "Open Image Viewer";
    
    button.addEventListener("click", () => {
      // Check if plugin is enabled
      const plugin = window.PluginRegistry?.get('image-viewer-plugin');
      if (plugin && !plugin.enabled) {
        alert('Image Viewer Plugin is disabled. Enable it in Settings > Plugins to use it.');
        return;
      }
      this.openViewerModal();
    });
    
    // Update button state based on plugin enabled status
    this.updateButtonState();
    
    // Add to sidebar via global function
    if (window.addButtonToSidebar) {
      window.addButtonToSidebar(button);
    }
  }

  updateButtonState() {
    const button = document.getElementById('image-viewer-plugin-launcher');
    if (!button) return;
    
    const plugin = window.PluginRegistry?.get('image-viewer-plugin');
    if (plugin) {
      button.disabled = !plugin.enabled;
      button.style.opacity = plugin.enabled ? '1' : '0.5';
      button.title = plugin.enabled 
        ? 'Open Image Viewer' 
        : 'Image Viewer Plugin is disabled (enable in Settings > Plugins)';
    }
  }

  setupModalControls() {
    // Close button
    const closeBtn = document.getElementById('image-viewer-plugin-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeViewerModal());
    }
    
    // Fullscreen button
    const fullscreenBtn = document.getElementById('image-viewer-plugin-fullscreen');
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
    }
    
    // Close on background click
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) {
          this.closeViewerModal();
        }
      });
    }
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal && this.modal.classList.contains('visible')) {
        if (this.isFullscreen) {
          this.toggleFullscreen();
        } else {
          this.closeViewerModal();
        }
      }
    });
  }

  async openViewerModal() {
    console.log('[Image Viewer Plugin] Opening modal...');
    
    // Check if viewer API is available (using main server)
    try {
      console.log('[Image Viewer Plugin] Checking API at /api/plugins/image-viewer/health');
      const response = await fetch('/api/plugins/image-viewer/health');
      console.log(`[Image Viewer Plugin] API response status:`, response.status);
      if (!response.ok) throw new Error(`API responded with status ${response.status}`);
      console.log('[Image Viewer Plugin] API is available!');
    } catch (error) {
      console.error('[Image Viewer Plugin] API check failed:', error);
      alert(
        'Image Viewer plugin API is not responding.\n\n' +
        'Please make sure the main app server is running.\n\n' +
        `Error: ${error.message}`
      );
      return;
    }

    // Show modal first
    console.log('[Image Viewer Plugin] Showing modal...');
    this.modal.classList.add('visible');

    // Load iframe from main server
    const iframeUrl = '/plugins/image-viewer/index.html';
    console.log(`[Image Viewer Plugin] Loading iframe: ${iframeUrl}`);
    
    // Remove loading class if it exists
    if (this.iframe) {
      this.iframe.classList.remove('loaded');
    }
    
    // Show loading indicator
    if (this.loadingIndicator) {
      this.loadingIndicator.style.display = 'block';
      console.log('[Image Viewer Plugin] Loading indicator shown');
    }

    // Set up load handler before setting src
    if (this.iframe) {
      this.iframe.onload = () => {
        console.log('[Image Viewer Plugin] Iframe loaded successfully!');
        this.iframe.classList.add('loaded');
        // Hide loading indicator
        if (this.loadingIndicator) {
          this.loadingIndicator.style.display = 'none';
          console.log('[Image Viewer Plugin] Loading indicator hidden');
        }
      };

      this.iframe.onerror = (error) => {
        console.error('[Image Viewer Plugin] Iframe load error:', error);
        if (this.loadingIndicator) {
          this.loadingIndicator.textContent = 'Failed to load. Check console.';
          this.loadingIndicator.style.color = '#d32f2f';
        }
        alert('Failed to load Image Viewer plugin. Check console for details.');
      };

      // Set src to trigger load
      if (this.iframe.src !== iframeUrl) {
        this.iframe.src = iframeUrl;
        console.log('[Image Viewer Plugin] Iframe src set, waiting for load...');
      } else {
        console.log('[Image Viewer Plugin] Iframe already has correct src, reloading...');
        this.iframe.src = ''; // Clear first
        setTimeout(() => {
          this.iframe.src = iframeUrl;
        }, 100);
      }
    }

    // Timeout fallback - hide loading after 10 seconds even if onload doesn't fire
    setTimeout(() => {
      if (this.iframe && !this.iframe.classList.contains('loaded')) {
        console.warn('[Image Viewer Plugin] Load timeout - hiding loading indicator anyway');
        if (this.loadingIndicator) {
          this.loadingIndicator.style.display = 'none';
        }
        if (this.iframe) {
          this.iframe.classList.add('loaded');
        }
      }
    }, 10000);
  }

  closeViewerModal() {
    console.log('[Image Viewer Plugin] Closing modal...');
    // Add closing animation
    this.modal.classList.add('closing');
    
    setTimeout(() => {
      this.modal.classList.remove('visible', 'closing');
      if (this.isFullscreen) {
        this.isFullscreen = false;
        this.modal.classList.remove('fullscreen');
      }
      // Reset loading indicator for next time
      if (this.loadingIndicator) {
        this.loadingIndicator.style.display = 'block';
        this.loadingIndicator.textContent = 'Loading Image Viewer...';
        this.loadingIndicator.style.color = '#666';
      }
      console.log('[Image Viewer Plugin] Modal closed');
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
  // Wait for PluginRegistry to be available
  function initLauncher() {
    if (window.PluginRegistry) {
      // Initialize plugin registry first
      if (typeof window.PluginRegistry.initialize === 'function') {
        window.PluginRegistry.initialize();
      }
      // Then create launcher
      new ImageViewerPluginLauncher();
    } else {
      // Retry if PluginRegistry not ready
      setTimeout(initLauncher, 100);
    }
  }
  
  // Start initialization
  setTimeout(initLauncher, 500);
});

