/**
 * Graph Plugin Launcher
 * Opens the portable-local-graph visualization in a new window
 */

class GraphPluginLauncher {
  constructor() {
    this.graphWindow = null;
    this.init();
  }

  init() {
    // Add button to sidebar
    this.addLauncherButton();
  }

  addLauncherButton() {
    const button = document.createElement("button");
    button.id = "graph-plugin-launcher";
    button.className = "feature-toggle";
    button.textContent = "📊 Graph View";
    button.title = "Open graph visualization of your notes";
    
    button.addEventListener("click", () => this.openGraphWindow());
    
    // Add to sidebar via global function
    if (window.addButtonToSidebar) {
      window.addButtonToSidebar(button);
    }
  }

  openGraphWindow() {
    // Check if window is already open
    if (this.graphWindow && !this.graphWindow.closed) {
      this.graphWindow.focus();
      return;
    }

    // Open new window with graph visualization
    const width = 1200;
    const height = 800;
    const left = (screen.width - width) / 2;
    const top = (screen.height - height) / 2;
    
    this.graphWindow = window.open(
      '/portable-local-graph/index.html',
      'GraphVisualization',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    if (this.graphWindow) {
      // Wait for window to load, then auto-load data
      this.graphWindow.addEventListener('load', () => {
        // Small delay to ensure graph is initialized
        setTimeout(() => {
          if (this.graphWindow && this.graphWindow.loadFromApp) {
            this.graphWindow.loadFromApp();
          }
        }, 500);
      });
    } else {
      alert('Could not open graph window. Please check your popup blocker settings.');
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

