/**
 * Graph Plugin Launcher
 * Opens the independent portable-local-graph plugin in a modal dialog
 */

class GraphPluginLauncher {
  constructor() {
    this.pluginPort = 3001;
    this.modal = null;
    this.iframe = null;
    this.loadingIndicator = null;
    this.isFullscreen = false;
    this.init();
  }

  init() {
    // Get modal elements
    this.modal = document.getElementById('graph-plugin-modal');
    this.iframe = document.getElementById('graph-plugin-iframe');
    this.loadingIndicator = document.getElementById('graph-plugin-loading');
    
    console.log('[Graph Plugin] Initialized launcher', {
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
      console.warn('[Graph Plugin] PluginRegistry not available, retrying...');
      setTimeout(() => this.registerPlugin(), 100);
      return;
    }

    // Initialize registry if needed
    if (typeof window.PluginRegistry.initialize === 'function') {
      window.PluginRegistry.initialize();
    }

    // Register the graph plugin
    window.PluginRegistry.register('graph-plugin', {
      name: 'Graph Visualization',
      description: 'Interactive graph visualization tool for creating mind maps, concept diagrams, and network structures',
      version: '1.0.0',
      author: 'Luhmann Roam',
      icon: '📊',
      category: 'visualization',
      enabled: window.PluginRegistry.loadPluginState('graph-plugin'),
      launch: () => {
        this.openGraphModal();
      },
      onEnable: () => {
        console.log('[Graph Plugin] Plugin enabled');
        this.updateButtonState();
      },
      onDisable: () => {
        console.log('[Graph Plugin] Plugin disabled');
        this.updateButtonState();
        // Close modal if open
        if (this.modal && this.modal.classList.contains('visible')) {
          this.closeGraphModal();
        }
      }
    });

    console.log('[Graph Plugin] Registered in PluginRegistry');
  }

  addLauncherButton() {
    const button = document.createElement("button");
    button.id = "graph-plugin-launcher";
    button.className = "feature-toggle";
    button.textContent = "📊 Graph Plugin";
    button.title = "Open graph visualization tool";
    
    button.addEventListener("click", () => {
      // Check if plugin is enabled
      const plugin = window.PluginRegistry?.get('graph-plugin');
      if (plugin && !plugin.enabled) {
        alert('Graph Plugin is disabled. Enable it in Settings > Plugins to use it.');
        return;
      }
      this.openGraphModal();
    });
    
    // Update button state based on plugin enabled status
    this.updateButtonState();
    
    // Add to sidebar via global function
    if (window.addButtonToSidebar) {
      window.addButtonToSidebar(button);
    }
  }

  updateButtonState() {
    const button = document.getElementById('graph-plugin-launcher');
    if (!button) return;
    
    const plugin = window.PluginRegistry?.get('graph-plugin');
    if (plugin) {
      button.disabled = !plugin.enabled;
      button.style.opacity = plugin.enabled ? '1' : '0.5';
      button.title = plugin.enabled 
        ? 'Open graph visualization tool' 
        : 'Graph Plugin is disabled (enable in Settings > Plugins)';
    }
  }

  setupModalControls() {
    // Close button
    const closeBtn = document.getElementById('graph-plugin-close');
    closeBtn.addEventListener('click', () => this.closeGraphModal());
    
    // Fullscreen button
    const fullscreenBtn = document.getElementById('graph-plugin-fullscreen');
    fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
    
    // Close on background click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.closeGraphModal();
      }
    });
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.classList.contains('visible')) {
        if (this.isFullscreen) {
          this.toggleFullscreen();
        } else {
          this.closeGraphModal();
        }
      }
    });
  }

  async openGraphModal() {
    console.log('[Graph Plugin] Opening modal...');
    
    // Check if plugin server is running (should be auto-started with main app)
    try {
      console.log(`[Graph Plugin] Checking server at http://localhost:${this.pluginPort}/api/graph`);
      const response = await fetch(`http://localhost:${this.pluginPort}/api/graph`);
      console.log(`[Graph Plugin] Server response status:`, response.status);
      if (!response.ok) throw new Error(`Server responded with status ${response.status}`);
      console.log('[Graph Plugin] Server is running!');
    } catch (error) {
      console.error('[Graph Plugin] Server check failed:', error);
      alert(
        'Graph plugin server is not responding.\n\n' +
        'The plugin server should start automatically with the main app.\n' +
        'Please restart the main app (npm start) or check the console for errors.\n\n' +
        `Error: ${error.message}`
      );
      return;
    }

    // Show modal first
    console.log('[Graph Plugin] Showing modal...');
    this.modal.classList.add('visible');

    // Load iframe
    const iframeUrl = `http://localhost:${this.pluginPort}/index.html`;
    console.log(`[Graph Plugin] Loading iframe: ${iframeUrl}`);
    
    // Remove loading class if it exists
    this.iframe.classList.remove('loaded');
    
    // Show loading indicator
    if (this.loadingIndicator) {
      this.loadingIndicator.style.display = 'block';
      console.log('[Graph Plugin] Loading indicator shown');
    }

    // Set up load handler before setting src
    this.iframe.onload = () => {
      console.log('[Graph Plugin] Iframe loaded successfully!');
      this.iframe.classList.add('loaded');
      // Hide loading indicator
      if (this.loadingIndicator) {
        this.loadingIndicator.style.display = 'none';
        console.log('[Graph Plugin] Loading indicator hidden');
      }
    };

    this.iframe.onerror = (error) => {
      console.error('[Graph Plugin] Iframe load error:', error);
      if (this.loadingIndicator) {
        this.loadingIndicator.textContent = 'Failed to load. Check console.';
        this.loadingIndicator.style.color = '#d32f2f';
      }
      alert('Failed to load graph plugin. Check console for details.');
    };

    // Set src to trigger load
    if (this.iframe.src !== iframeUrl) {
      this.iframe.src = iframeUrl;
      console.log('[Graph Plugin] Iframe src set, waiting for load...');
    } else {
      console.log('[Graph Plugin] Iframe already has correct src, reloading...');
      this.iframe.src = ''; // Clear first
      setTimeout(() => {
        this.iframe.src = iframeUrl;
      }, 100);
    }

    // Timeout fallback - hide loading after 10 seconds even if onload doesn't fire
    setTimeout(() => {
      if (!this.iframe.classList.contains('loaded')) {
        console.warn('[Graph Plugin] Load timeout - hiding loading indicator anyway');
        if (this.loadingIndicator) {
          this.loadingIndicator.style.display = 'none';
        }
        this.iframe.classList.add('loaded');
      }
    }, 10000);
  }

  closeGraphModal() {
    console.log('[Graph Plugin] Closing modal...');
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
        this.loadingIndicator.textContent = 'Loading Graph Plugin...';
        this.loadingIndicator.style.color = '#666';
      }
      console.log('[Graph Plugin] Modal closed');
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
      new GraphPluginLauncher();
    } else {
      // Retry if PluginRegistry not ready
      setTimeout(initLauncher, 100);
    }
  }
  
  // Start initialization
  setTimeout(initLauncher, 500);
});

