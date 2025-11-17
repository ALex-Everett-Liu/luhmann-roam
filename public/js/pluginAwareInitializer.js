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

      // Plugin-dependent modules (removed dragDropManager)
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
   * Handle plugin state changes (when user enables/disables plugins)
   */
  function handlePluginStateChange(pluginId, enabled) {
    console.log(`Plugin ${pluginId} ${enabled ? "enabled" : "disabled"}`);

    // Note: Drag & Drop functionality removed - keyboard-focused operation only
    // All dragDropManager plugin references have been removed

    // Handle other plugin state changes here if needed
    console.log(`No specific handler for plugin: ${pluginId}`);
  }

  // Public API
  return {
    initializeEnabledModules,
    handlePluginStateChange,
  };
})();

// Make available globally
window.PluginAwareInitializer = PluginAwareInitializer;
