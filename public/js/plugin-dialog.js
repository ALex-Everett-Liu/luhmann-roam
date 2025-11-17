/**
 * Plugin Management Dialog
 * Standalone modular dialog for managing plugins following SettingsManager patterns
 * Provides plugin list, metadata display, and management interface
 */
const PluginDialog = (function() {
  'use strict';

  // Private variables - follow SettingsManager pattern
  let isInitialized = false;
  let modalOverlay = null;
  let pluginModal = null;
  let currentView = "list"; // list or details
  let selectedPluginId = null;

  /**
   * Initialize the PluginDialog
   */
  function initialize() {
    if (isInitialized) {
      console.log("PluginDialog already initialized, skipping");
      return;
    }

    console.log("Initializing PluginDialog...");

    // Create the plugin management button in sidebar
    createPluginButton();

    isInitialized = true;
    console.log("PluginDialog initialization complete");
  }

  /**
   * Create the plugin button in the sidebar
   */
  function createPluginButton() {
    const sidebar = document.querySelector(".sidebar");
    if (!sidebar) {
      console.error("Sidebar not found, cannot create plugin button");
      return;
    }

    const pluginButton = document.createElement("button");
    pluginButton.id = "plugin-manager-button";
    pluginButton.className = "feature-toggle plugin-button";
    pluginButton.innerHTML = "🔌 Plugins";
    pluginButton.title = "Open plugin management (Alt+P)";

    pluginButton.addEventListener("click", openPluginModal);

    const backupButton = document.getElementById("backup-database");

    if (backupButton) {
      sidebar.insertBefore(pluginButton, backupButton);
    } else {
      sidebar.appendChild(pluginButton);
    }

    console.log("Plugin button created and added to sidebar");
  }

  /**
   * Open the plugin modal
   */
  function openPluginModal() {
    // Create modal if it doesn't exist
    if (!pluginModal) {
      createPluginModal();
    }

    // Show the modal
    if (modalOverlay && pluginModal) {
      modalOverlay.style.display = "flex";
      modalOverlay.classList.add("show");

      // Render the current view
      renderCurrentView();

      console.log("Plugin modal opened, current view:", currentView);
    }
  }

  /**
   * Close the plugin modal
   */
  function closePluginModal() {
    if (modalOverlay && pluginModal) {
      modalOverlay.style.display = "none";
      modalOverlay.classList.remove("show");
    }
  }

  /**
   * Create the plugin modal structure
   */
  function createPluginModal() {
    // Create modal overlay following SettingsManager pattern
    modalOverlay = document.createElement("div");
    modalOverlay.className = "plugin-modal-overlay";
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) {
        closePluginModal();
      }
    });

    // Create modal following SettingsManager pattern
    pluginModal = document.createElement("div");
    pluginModal.className = "plugin-modal";
    pluginModal.id = "plugin-modal";

    // Modal content
    const modalContent = document.createElement("div");
    modalContent.className = "plugin-modal-content";

    // Modal header
    const modalHeader = document.createElement("div");
    modalHeader.className = "plugin-modal-header";

    const modalTitle = document.createElement("h2");
    modalTitle.textContent = "Plugin Management";
    modalTitle.className = "plugin-modal-title";

    const closeButton = document.createElement("button");
    closeButton.className = "plugin-modal-close";
    closeButton.innerHTML = "&times;";
    closeButton.addEventListener("click", closePluginModal);

    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeButton);

    // Modal body - plugin list area
    const modalBody = document.createElement("div");
    modalBody.className = "plugin-modal-body";
    modalBody.id = "plugin-modal-body";

    // Modal footer
    const modalFooter = document.createElement("div");
    modalFooter.className = "plugin-modal-footer";

    const refreshButton = document.createElement("button");
    refreshButton.className = "plugin-refresh-btn";
    refreshButton.textContent = "🔄 Refresh";
    refreshButton.addEventListener("click", () => {
      renderCurrentView();
    });

    const closeFooterButton = document.createElement("button");
    closeFooterButton.className = "plugin-close-btn";
    closeFooterButton.textContent = "Close";
    closeFooterButton.addEventListener("click", closePluginModal);

    modalFooter.appendChild(refreshButton);
    modalFooter.appendChild(closeFooterButton);

    // Assemble modal
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    modalContent.appendChild(modalFooter);
    pluginModal.appendChild(modalContent);
    modalOverlay.appendChild(pluginModal);

    // Add to document
    document.body.appendChild(modalOverlay);

    console.log("Plugin modal created");
  }

  /**
   * Render the current view
   */
  function renderCurrentView() {
    const contentArea = document.getElementById("plugin-modal-body");
    if (!contentArea) return;

    contentArea.innerHTML = '';

    if (currentView === "list") {
      renderPluginList(contentArea);
    } else if (currentView === "details") {
      renderPluginDetails(contentArea);
    }
  }

  /**
   * Render plugin list view
   */
  function renderPluginList(container) {
    if (!window.PluginSystem) {
      container.innerHTML = '<div class="plugin-error">PluginSystem not available</div>';
      return;
    }

    const pluginSystemPlugins = window.PluginSystem.plugins;

    if (pluginSystemPlugins.size === 0) {
      container.innerHTML = `
        <div class="plugin-empty-state">
          <div class="plugin-empty-icon">🔌</div>
          <h3>No Plugins Available</h3>
          <p>Create a plugin by calling PluginSystem.register() with a plugin configuration object.</p>
          <code class="plugin-code-example">
PluginSystem.register({
  id: 'my-plugin',
  name: 'My Plugin',
  description: 'A description',
  init: function() { /* initialization code */ }
});
          </code>
        </div>
      `;
      return;
    }

    // Group by category
    const categories = new Map();
    pluginSystemPlugins.forEach((plugin, id) => {
      const category = plugin.category || 'general';
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category).push({ id, ...plugin });
    });

    // Create category sections
    categories.forEach((plugins, category) => {
      const categoryElement = createCategorySection(category, plugins);
      container.appendChild(categoryElement);
    });
  }

  /**
   * Create category section
   */
  function createCategorySection(category, plugins) {
    const categoryDiv = document.createElement('div');
    categoryDiv.className = 'plugin-category';

    const categoryHeader = document.createElement('h3');
    categoryHeader.className = 'plugin-category-header';
    categoryHeader.textContent = formatCategoryName(category);
    categoryDiv.appendChild(categoryHeader);

    plugins.forEach(plugin => {
      const pluginCard = createPluginCard(plugin);
      categoryDiv.appendChild(pluginCard);
    });

    return categoryDiv;
  }

  /**
   * Create plugin card
   */
  function createPluginCard(plugin) {
    const card = document.createElement('div');
    card.className = 'plugin-card';

    card.innerHTML = `
      <div class="plugin-card-header">
        <div class="plugin-info">
          <div class="plugin-name">${plugin.name}</div>
          <div class="plugin-id">${plugin.id}</div>
          <div class="plugin-description">${plugin.description || 'No description available'}</div>
        </div>
        <label class="plugin-toggle">
          <input type="checkbox" class="plugin-toggle-input"
                 data-plugin-id="${plugin.id}"
                 ${plugin.enabled ? 'checked' : ''}>
          <span class="plugin-toggle-slider"></span>
        </label>
      </div>
      <div class="plugin-card-meta">
        <span class="plugin-badge">📁 ${formatCategoryName(plugin.category || 'general')}</span>
        ${plugin.requiresReload ? '<span class="plugin-badge reload">🔄 Requires reload</span>' : ''}
        ${plugin.dependencies.length > 0 ? `<span class="plugin-badge dependencies">🔗 ${plugin.dependencies.length} dependency${plugin.dependencies.length !== 1 ? 'ies' : 'y'}</span>` : ''}
      </div>
    `;

    // Add event listener for toggle
    const toggle = card.querySelector('.plugin-toggle-input');
    toggle.addEventListener('change', (e) => {
      togglePlugin(plugin.id);
    });

    return card;
  }

  /**
   * Render plugin details view
   */
  function renderPluginDetails(container) {
    // Not implemented - focus on basic list functionality first
    container.innerHTML = '<div class="plugin-placeholder">This section is not yet implemented.</div>';
  }

  /**
   * Toggle plugin state
   */
  function togglePlugin(pluginId) {
    if (!window.PluginSystem) return;

    const plugin = window.PluginSystem.plugins.get(pluginId);
    if (!plugin) return;

    if (plugin.enabled) {
      window.PluginSystem.disable(pluginId);
    } else {
      window.PluginSystem.enable(pluginId);
    }

    // Refresh the view to show updated state
    renderCurrentView();

    console.log(`Plugin '${plugin.name}' ${plugin.enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Format category name
   */
  function formatCategoryName(category) {
    return category.charAt(0).toUpperCase() + category.slice(1).replace(/[-_]/g, ' ');
  }

  /**
   * Add keyboard shortcut
   */
  function addKeyboardShortcut() {
    document.addEventListener('keydown', (e) => {
      if (e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        openPluginModal();
      }
    });
  }

  /**
   * Add command palette commands
   */
  function addCommandPaletteCommands() {
    if (window.CommandPaletteManager && typeof window.CommandPaletteManager.register === 'function') {
      window.CommandPaletteManager.register({
        name: 'Open Plugin Manager',
        action: openPluginModal,
        category: 'Plugins',
        keywords: ['plugin', 'manager', 'manage', 'plugins', 'features'],
        description: 'Open the plugin management dialog'
      });
      console.log('PluginDialog: Command palette commands added');
    }
  }

  // Auto-initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    console.log('PluginDialog: Initializing when DOM ready...');
    initialize();
    addKeyboardShortcut();
    addCommandPaletteCommands();
  });

  // Also initialize if DOM is already ready
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    setTimeout(() => {
      console.log('PluginDialog: DOM already ready, initializing...');
      initialize();
      addKeyboardShortcut();
      addCommandPaletteCommands();
    }, 100);
  }

  // Public API
  return {
    show: openPluginModal,
    hide: closePluginModal,
    initialize
  };
})();