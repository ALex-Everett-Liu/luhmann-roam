/**
 * Graph Plugin Launcher
 * Opens the independent portable-local-graph plugin in a modal dialog
 */

class GraphPluginLauncher {
  constructor() {
    this.pluginPort = 3001;
    this.modal = null;
    this.iframe = null;
    this.isFullscreen = false;
    this.init();
  }

  init() {
    // Get modal elements
    this.modal = document.getElementById('graph-plugin-modal');
    this.iframe = document.getElementById('graph-plugin-iframe');
    
    // Add button to sidebar
    this.addLauncherButton();
    
    // Setup modal controls
    this.setupModalControls();
  }

  addLauncherButton() {
    const button = document.createElement("button");
    button.id = "graph-plugin-launcher";
    button.className = "feature-toggle";
    button.textContent = "📊 Graph Plugin";
    button.title = "Open graph visualization tool";
    
    button.addEventListener("click", () => this.openGraphModal());
    
    // Add to sidebar via global function
    if (window.addButtonToSidebar) {
      window.addButtonToSidebar(button);
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
    // Check if plugin server is running (should be auto-started with main app)
    try {
      const response = await fetch(`http://localhost:${this.pluginPort}/api/graph`);
      if (!response.ok) throw new Error('Server not responding');
    } catch (error) {
      alert(
        'Graph plugin server is not responding.\n\n' +
        'The plugin server should start automatically with the main app.\n' +
        'Please restart the main app (npm start) or check the console for errors.'
      );
      return;
    }

    // Load iframe if not already loaded
    if (!this.iframe.src) {
      this.iframe.src = `http://localhost:${this.pluginPort}/index.html`;
      
      // Mark as loaded when iframe loads
      this.iframe.onload = () => {
        this.iframe.classList.add('loaded');
      };
    }

    // Show modal
    this.modal.classList.add('visible');
  }

  closeGraphModal() {
    // Add closing animation
    this.modal.classList.add('closing');
    
    setTimeout(() => {
      this.modal.classList.remove('visible', 'closing');
      if (this.isFullscreen) {
        this.isFullscreen = false;
        this.modal.classList.remove('fullscreen');
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
  // Wait a bit for the main app to initialize
  setTimeout(() => {
    new GraphPluginLauncher();
  }, 1000);
});

