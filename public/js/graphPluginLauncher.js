/**
 * Graph Plugin Launcher
 * Opens the independent portable-local-graph plugin in a new window
 */

class GraphPluginLauncher {
  constructor() {
    this.graphWindow = null;
    this.pluginPort = 3001;
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
    button.textContent = "📊 Graph Plugin";
    button.title = "Open independent graph visualization tool";
    
    button.addEventListener("click", () => this.openGraphWindow());
    
    // Add to sidebar via global function
    if (window.addButtonToSidebar) {
      window.addButtonToSidebar(button);
    }
  }

  async openGraphWindow() {
    // Check if plugin server is running
    try {
      const response = await fetch(`http://localhost:${this.pluginPort}/api/graph`);
      if (!response.ok) throw new Error('Server not responding');
    } catch (error) {
      alert(
        'Graph plugin server is not running.\n\n' +
        'To start the plugin:\n' +
        '1. Open a terminal\n' +
        '2. Navigate to the portable-local-graph folder\n' +
        '3. Run: node graph-server.js\n' +
        '4. Then click this button again'
      );
      return;
    }

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
      `http://localhost:${this.pluginPort}/index.html`,
      'GraphPlugin',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    if (!this.graphWindow) {
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

