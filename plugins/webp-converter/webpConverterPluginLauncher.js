/**
 * WebP Converter Plugin Launcher
 * Opens the WebP converter plugin in a modal dialog
 */

class WebPConverterPluginLauncher {
  constructor() {
    this.modal = null;
    this.iframe = null;
    this.loadingIndicator = null;
    this.isFullscreen = false;
    this.init();
  }

  init() {
    // Get modal elements
    this.modal = document.getElementById('webp-converter-plugin-modal');
    this.iframe = document.getElementById('webp-converter-plugin-iframe');
    this.loadingIndicator = document.getElementById('webp-converter-plugin-loading');
    
    console.log('[WebP Converter Plugin] Initialized launcher', {
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
      console.warn('[WebP Converter Plugin] PluginRegistry not available, retrying...');
      setTimeout(() => this.registerPlugin(), 100);
      return;
    }

    // Initialize registry if needed
    if (typeof window.PluginRegistry.initialize === 'function') {
      window.PluginRegistry.initialize();
    }

    // Register the webp converter plugin
    window.PluginRegistry.register('webp-converter-plugin', {
      name: 'WebP Converter',
      description: 'Batch image converter supporting WebP, JPEG, PNG, AVIF, and TIFF formats with quality control',
      version: '1.0.0',
      author: 'Luhmann Roam',
      icon: '🖼️',
      category: 'tools',
      enabled: window.PluginRegistry.loadPluginState('webp-converter-plugin'),
      launch: () => {
        this.openConverterModal();
      },
      onEnable: () => {
        console.log('[WebP Converter Plugin] Plugin enabled');
        this.updateButtonState();
      },
      onDisable: () => {
        console.log('[WebP Converter Plugin] Plugin disabled');
        this.updateButtonState();
        // Close modal if open
        if (this.modal && this.modal.classList.contains('visible')) {
          this.closeConverterModal();
        }
      }
    });

    console.log('[WebP Converter Plugin] Registered in PluginRegistry');
  }

  addLauncherButton() {
    const button = document.createElement("button");
    button.id = "webp-converter-plugin-launcher";
    button.className = "feature-toggle";
    button.textContent = "🖼️ WebP Converter";
    button.title = "Open WebP image converter";
    
    button.addEventListener("click", () => {
      // Check if plugin is enabled
      const plugin = window.PluginRegistry?.get('webp-converter-plugin');
      if (plugin && !plugin.enabled) {
        alert('WebP Converter Plugin is disabled. Enable it in Settings > Plugins to use it.');
        return;
      }
      this.openConverterModal();
    });
    
    // Update button state based on plugin enabled status
    this.updateButtonState();
    
    // Add to sidebar via global function
    if (window.addButtonToSidebar) {
      window.addButtonToSidebar(button);
    }
  }

  updateButtonState() {
    const button = document.getElementById('webp-converter-plugin-launcher');
    if (!button) return;
    
    const plugin = window.PluginRegistry?.get('webp-converter-plugin');
    if (plugin) {
      button.disabled = !plugin.enabled;
      button.style.opacity = plugin.enabled ? '1' : '0.5';
      button.title = plugin.enabled 
        ? 'Open WebP image converter' 
        : 'WebP Converter Plugin is disabled (enable in Settings > Plugins)';
    }
  }

  setupModalControls() {
    // Close button
    const closeBtn = document.getElementById('webp-converter-plugin-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeConverterModal());
    }
    
    // Fullscreen button
    const fullscreenBtn = document.getElementById('webp-converter-plugin-fullscreen');
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
    }
    
    // Close on background click
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) {
          this.closeConverterModal();
        }
      });
    }
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal && this.modal.classList.contains('visible')) {
        if (this.isFullscreen) {
          this.toggleFullscreen();
        } else {
          this.closeConverterModal();
        }
      }
    });
  }

  async openConverterModal() {
    console.log('[WebP Converter Plugin] Opening modal...');
    
    // Check if converter API is available (using main server)
    try {
      console.log('[WebP Converter Plugin] Checking API at /api/plugins/webp-converter/health');
      const response = await fetch('/api/plugins/webp-converter/health');
      console.log(`[WebP Converter Plugin] API response status:`, response.status);
      if (!response.ok) throw new Error(`API responded with status ${response.status}`);
      console.log('[WebP Converter Plugin] API is available!');
    } catch (error) {
      console.error('[WebP Converter Plugin] API check failed:', error);
      alert(
        'WebP Converter plugin API is not responding.\n\n' +
        'Please make sure the main app server is running.\n\n' +
        `Error: ${error.message}`
      );
      return;
    }

    // Show modal first
    console.log('[WebP Converter Plugin] Showing modal...');
    this.modal.classList.add('visible');

    // Load iframe from main server
    const iframeUrl = '/plugins/webp-converter/index.html';
    console.log(`[WebP Converter Plugin] Loading iframe: ${iframeUrl}`);
    
    // Remove loading class if it exists
    if (this.iframe) {
      this.iframe.classList.remove('loaded');
    }
    
    // Show loading indicator
    if (this.loadingIndicator) {
      this.loadingIndicator.style.display = 'block';
      console.log('[WebP Converter Plugin] Loading indicator shown');
    }

    // Set up load handler before setting src
    if (this.iframe) {
      this.iframe.onload = () => {
        console.log('[WebP Converter Plugin] Iframe loaded successfully!');
        this.iframe.classList.add('loaded');
        // Hide loading indicator
        if (this.loadingIndicator) {
          this.loadingIndicator.style.display = 'none';
          console.log('[WebP Converter Plugin] Loading indicator hidden');
        }
      };

      this.iframe.onerror = (error) => {
        console.error('[WebP Converter Plugin] Iframe load error:', error);
        if (this.loadingIndicator) {
          this.loadingIndicator.textContent = 'Failed to load. Check console.';
          this.loadingIndicator.style.color = '#d32f2f';
        }
        alert('Failed to load WebP converter plugin. Check console for details.');
      };

      // Set src to trigger load
      if (this.iframe.src !== iframeUrl) {
        this.iframe.src = iframeUrl;
        console.log('[WebP Converter Plugin] Iframe src set, waiting for load...');
      } else {
        console.log('[WebP Converter Plugin] Iframe already has correct src, reloading...');
        this.iframe.src = ''; // Clear first
        setTimeout(() => {
          this.iframe.src = iframeUrl;
        }, 100);
      }
    }

    // Timeout fallback - hide loading after 10 seconds even if onload doesn't fire
    setTimeout(() => {
      if (this.iframe && !this.iframe.classList.contains('loaded')) {
        console.warn('[WebP Converter Plugin] Load timeout - hiding loading indicator anyway');
        if (this.loadingIndicator) {
          this.loadingIndicator.style.display = 'none';
        }
        if (this.iframe) {
          this.iframe.classList.add('loaded');
        }
      }
    }, 10000);
  }

  closeConverterModal() {
    console.log('[WebP Converter Plugin] Closing modal...');
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
        this.loadingIndicator.textContent = 'Loading WebP Converter...';
        this.loadingIndicator.style.color = '#666';
      }
      console.log('[WebP Converter Plugin] Modal closed');
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
      new WebPConverterPluginLauncher();
    } else {
      // Retry if PluginRegistry not ready
      setTimeout(initLauncher, 100);
    }
  }
  
  // Start initialization
  setTimeout(initLauncher, 500);
});

