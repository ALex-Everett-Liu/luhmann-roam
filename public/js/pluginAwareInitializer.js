/**
 * Plugin-Aware Initializer
 * Only initializes modules whose plugins are enabled
 */
const PluginAwareInitializer = (function () {
  /**
   * Initialize all enabled plugins and their modules
   */
  function initializeEnabledModules() {
    console.log("🚀 Starting plugin-aware module initialization...");

    // Wait for PluginManager to be ready
    if (!window.PluginManager) {
      console.warn("PluginManager not available, deferring initialization");
      setTimeout(initializeEnabledModules, 100);
      return;
    }

    // ADDED: Wait for PluginManager to be fully initialized
    if (!window.PluginManager.isInitialized) {
      console.warn(
        "PluginManager not fully initialized, deferring initialization",
      );
      setTimeout(initializeEnabledModules, 100);
      return;
    }

    // Initialize modules based on plugin states
    const moduleInitializers = {
      // Core modules (always enabled)
      core: {
        name: "Core Modules",
        initialize: initializeCoreModules,
        enabled: true,
      },

      // Plugin-dependent modules
      dragDropManager: {
        name: "Drag & Drop Manager",
        initialize: initializeDragDropManager,
        pluginId: "dragDropManager",
      },

      graphManagementUI: {
        name: "Graph Management UI",
        initialize: initializeGraphManagementUI,
        pluginId: "graphManagementUI",
      },

      graphAnalysisVisualizer: {
        name: "Graph Analysis Visualizer",
        initialize: initializeGraphAnalysisVisualizer,
        pluginId: "graphAnalysisVisualizer",
      },

      localGraphIndicators: {
        name: "Local Graph Indicators",
        initialize: initializeLocalGraphIndicators,
        enabled: true, // Always enable indicators when LocalGraphManager exists
      },

      localGraphManager: {
        name: "Local Graph Manager",
        initialize: initializeLocalGraphManager,
        pluginId: "localGraphManager",
      },

      globalGraphManager: {
        name: "Global Graph Manager",
        initialize: initializeGlobalGraphManager,
        pluginId: "globalGraphManager",
      },
    };

    // Initialize each module if its plugin is enabled
    for (const [moduleId, config] of Object.entries(moduleInitializers)) {
      const isEnabled =
        config.enabled ||
        (config.pluginId && PluginManager.isPluginEnabled(config.pluginId));

      if (isEnabled) {
        console.log(`✅ Initializing ${config.name}...`);
        try {
          config.initialize();
        } catch (error) {
          console.error(`❌ Failed to initialize ${config.name}:`, error);
        }
      } else {
        console.log(`⏭️  Skipping ${config.name} (plugin disabled)`);
      }
    }

    console.log("🎉 Plugin-aware initialization complete");
  }

  /**
   * Initialize core modules that are always needed
   */
  function initializeCoreModules() {
    // These are always initialized regardless of plugins

    // I18n
    if (window.I18n && !window.I18n.isInitialized) {
      I18n.initialize();
    }

    // HotkeyManager
    if (window.HotkeyManager && !window.HotkeyManager.isInitialized) {
      HotkeyManager.initialize();
    }

    // CommandPaletteManager
    if (
      window.CommandPaletteManager &&
      !window.CommandPaletteManager.isInitialized
    ) {
      CommandPaletteManager.initialize();
    }

    // SettingsManager
    if (window.SettingsManager && !window.SettingsManager.isInitialized) {
      SettingsManager.initialize();
    }
  }

  /**
   * Initialize Drag & Drop Manager only if plugin is enabled
   */
  function initializeDragDropManager() {
    if (window.DragDropManager && !window.DragDropManager.isInitialized) {
      DragDropManager.initialize();
      // Add sidebar button
      addDragDropButton();
    }
  }

  /**
   * Initialize Graph Management UI only if plugin is enabled
   */
  function initializeGraphManagementUI() {
    if (window.GraphManagementUI && !window.GraphManagementUI.isInitialized) {
      try {
        GraphManagementUI.initialize();
        addGraphManagementButton();
      } catch (error) {
        console.error("Failed to initialize GraphManagementUI:", error);
      }
    }
  }

  /**
   * Initialize Graph Analysis Visualizer only if plugin is enabled
   */
  function initializeGraphAnalysisVisualizer() {
    if (
      window.GraphAnalysisVisualizer &&
      !window.GraphAnalysisVisualizer.isInitialized
    ) {
      try {
        GraphAnalysisVisualizer.initialize();
        addGraphAnalysisButton();
      } catch (error) {
        console.error("Failed to initialize GraphAnalysisVisualizer:", error);
      }
    }
  }

  /**
   * Initialize Local Graph Manager only if plugin is enabled
   */
  function initializeLocalGraphManager() {
    if (window.LocalGraphManager && !window.LocalGraphManager.isInitialized) {
      try {
        LocalGraphManager.initialize();
        addLocalGraphButton();
      } catch (error) {
        console.error("Failed to initialize LocalGraphManager:", error);
      }
    }
  }

  function initializeLocalGraphIndicators() {
    if (
      window.LocalGraphIndicators &&
      !window.LocalGraphIndicators.isInitialized()
    ) {
      try {
        LocalGraphIndicators.initialize();
      } catch (error) {
        console.error("Failed to initialize LocalGraphIndicators:", error);
      }
    }
  }

  /**
   * Initialize Global Graph Manager only if plugin is enabled
   */
  function initializeGlobalGraphManager() {
    if (
      window.GlobalGraphManager &&
      !window.GlobalGraphManager.isInitialized()
    ) {
      try {
        GlobalGraphManager.initialize();
        addGlobalGraphButton();
      } catch (error) {
        console.error("Failed to initialize GlobalGraphManager:", error);
      }
    }
  }

  /**
   * Helper functions to add sidebar buttons
   */

  function addGraphManagementButton() {
    // Check if addButtonToSidebar is available
    if (!window.addButtonToSidebar) {
      console.error(
        "addButtonToSidebar not available, deferring button creation",
      );
      setTimeout(() => addGraphManagementButton(), 100);
      return;
    }

    const toggleGraphManagementButton = document.createElement("button");
    toggleGraphManagementButton.id = "toggle-graph-management";
    toggleGraphManagementButton.className = "feature-toggle";
    toggleGraphManagementButton.textContent = "Graph Management";
    toggleGraphManagementButton.title = "Manage graph vertices and edges";

    toggleGraphManagementButton.addEventListener("click", function () {
      if (window.GraphManagementUI) {
        if (GraphManagementUI.isVisible()) {
          GraphManagementUI.hide();
        } else {
          GraphManagementUI.show();
        }
      }
    });

    window.addButtonToSidebar(toggleGraphManagementButton);
  }

  function addGraphAnalysisButton() {
    // Check if addButtonToSidebar is available
    if (!window.addButtonToSidebar) {
      console.error(
        "addButtonToSidebar not available, deferring button creation",
      );
      setTimeout(() => addGraphAnalysisButton(), 100);
      return;
    }

    const toggleGraphAnalysisButton = document.createElement("button");
    toggleGraphAnalysisButton.id = "toggle-graph-analysis";
    toggleGraphAnalysisButton.className = "feature-toggle";
    toggleGraphAnalysisButton.textContent = "Graph Analysis";
    toggleGraphAnalysisButton.title =
      "Open advanced graph analysis and visualization";

    toggleGraphAnalysisButton.addEventListener("click", function () {
      if (window.GraphAnalysisVisualizer) {
        if (GraphAnalysisVisualizer.isVisible()) {
          GraphAnalysisVisualizer.hide();
        } else {
          GraphAnalysisVisualizer.show();
        }
      }
    });

    window.addButtonToSidebar(toggleGraphAnalysisButton);
  }

  function addDragDropButton() {
    const toggleDragDropButton = document.createElement("button");
    toggleDragDropButton.id = "toggle-drag-drop";
    toggleDragDropButton.className = "feature-toggle";
    toggleDragDropButton.textContent = DragDropManager.isEnabled()
      ? "Disable Drag & Drop"
      : "Enable Drag & Drop";
    toggleDragDropButton.classList.toggle(
      "active",
      DragDropManager.isEnabled(),
    );
    toggleDragDropButton.title =
      "Toggle drag and drop functionality (improves performance when disabled)";

    toggleDragDropButton.addEventListener("click", () => {
      if (
        window.PluginManager &&
        !PluginManager.isPluginEnabled("dragDropManager")
      ) {
        alert(
          "Drag & Drop plugin is disabled. Please enable it in Settings > Plugins.",
        );
        return;
      }
      DragDropManager.toggle();
      // Update button text
      const isEnabled = DragDropManager.isEnabled();
      toggleDragDropButton.textContent = isEnabled
        ? "Disable Drag & Drop"
        : "Enable Drag & Drop";
      toggleDragDropButton.classList.toggle("active", isEnabled);
    });

    window.addButtonToSidebar(toggleDragDropButton);
  }

  function addLocalGraphButton() {
    // Check if addButtonToSidebar is available
    if (!window.addButtonToSidebar) {
      console.error(
        "addButtonToSidebar not available, deferring button creation",
      );
      setTimeout(() => addLocalGraphButton(), 100);
      return;
    }

    const toggleLocalGraphButton = document.createElement("button");
    toggleLocalGraphButton.id = "toggle-local-graph";
    toggleLocalGraphButton.className = "feature-toggle";
    toggleLocalGraphButton.textContent = "Local Graph";
    toggleLocalGraphButton.title =
      "Explore local graph neighborhoods around a center node";

    toggleLocalGraphButton.addEventListener("click", function () {
      if (window.LocalGraphManager) {
        if (LocalGraphManager.isVisible()) {
          LocalGraphManager.hide();
        } else {
          LocalGraphManager.show();
        }
      }
    });

    window.addButtonToSidebar(toggleLocalGraphButton);
  }

  function addGlobalGraphButton() {
    // Check if addButtonToSidebar is available
    if (!window.addButtonToSidebar) {
      console.error(
        "addButtonToSidebar not available, deferring button creation",
      );
      setTimeout(() => addGlobalGraphButton(), 100);
      return;
    }

    const toggleGlobalGraphButton = document.createElement("button");
    toggleGlobalGraphButton.id = "toggle-global-graph";
    toggleGlobalGraphButton.className = "feature-toggle";
    toggleGlobalGraphButton.textContent = "Global Graph Explorer";
    toggleGlobalGraphButton.title =
      "Complete graph visualization with multiple layouts and centrality analysis";

    toggleGlobalGraphButton.addEventListener("click", function () {
      if (
        window.PluginManager &&
        !PluginManager.isPluginEnabled("globalGraphManager")
      ) {
        alert(
          "Global Graph Explorer plugin is disabled. Please enable it in Settings > Plugins.",
        );
        return;
      }

      if (window.GlobalGraphManager) {
        if (GlobalGraphManager.isVisible()) {
          GlobalGraphManager.hide();
        } else {
          GlobalGraphManager.show();
        }
      }
    });

    window.addButtonToSidebar(toggleGlobalGraphButton);
  }

  /**
   * Handle plugin state changes (when user enables/disables plugins)
   */
  function handlePluginStateChange(pluginId, enabled) {
    console.log(`Plugin ${pluginId} ${enabled ? "enabled" : "disabled"}`);

    if (enabled) {
      // Initialize the module if it wasn't already
      switch (pluginId) {
        case "dragDropManager":
          initializeDragDropManager();
          break;

        case "graphManagementUI":
          initializeGraphManagementUI();
          break;
        case "graphAnalysisVisualizer":
          initializeGraphAnalysisVisualizer();
          break;

        case "localGraphManager":
          initializeLocalGraphManager();
          break;
        case "globalGraphManager":
          initializeGlobalGraphManager();
          break;
        default:
          console.log(
            `No specific initialization handler for plugin: ${pluginId}`,
          );
      }
    } else {
      // Handle plugin disable
      switch (pluginId) {
        case "dragDropManager":
          if (window.DragDropManager) {
            DragDropManager.disable();
          }
          break;

        case "localGraphManager":
          if (window.LocalGraphManager) {
            LocalGraphManager.hide();
          }
          break;
        case "globalGraphManager":
          if (window.GlobalGraphManager) {
            GlobalGraphManager.hide();
          }
          break;
        default:
          console.log(`No specific cleanup handler for plugin: ${pluginId}`);
      }
    }
  }

  // Public API
  return {
    initializeEnabledModules,
    handlePluginStateChange,
  };
})();

// Make available globally
window.PluginAwareInitializer = PluginAwareInitializer;
