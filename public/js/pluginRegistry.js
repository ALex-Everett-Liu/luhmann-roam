/**
 * Plugin Registry
 * Central registry for managing plugins in the application
 */
const PluginRegistry = (function () {
  // Private variables
  const plugins = new Map();
  let isInitialized = false;

  /**
   * Initialize the plugin registry
   */
  function initialize() {
    if (isInitialized) {
      console.log("PluginRegistry already initialized");
      return;
    }

    console.log("Initializing PluginRegistry...");
    
    // Register built-in plugins
    registerBuiltInPlugins();
    
    isInitialized = true;
    console.log("PluginRegistry initialized with", plugins.size, "plugins");
  }

  /**
   * Register a plugin
   * @param {string} id - Unique plugin identifier
   * @param {Object} config - Plugin configuration
   */
  function register(id, config) {
    if (plugins.has(id)) {
      console.warn(`Plugin "${id}" is already registered, overwriting...`);
    }

    const defaultConfig = {
      id: id,
      name: id,
      description: "",
      version: "1.0.0",
      author: "",
      enabled: true,
      icon: "🔌",
      category: "other",
      launch: null, // Function to launch the plugin
      settings: null, // Function to render plugin settings (optional)
      onEnable: null, // Called when plugin is enabled
      onDisable: null, // Called when plugin is disabled
    };

    plugins.set(id, { ...defaultConfig, ...config });
    console.log(`Plugin "${id}" registered:`, config.name);
  }

  /**
   * Unregister a plugin
   * @param {string} id - Plugin identifier
   */
  function unregister(id) {
    if (plugins.has(id)) {
      plugins.delete(id);
      console.log(`Plugin "${id}" unregistered`);
    }
  }

  /**
   * Get a plugin by ID
   * @param {string} id - Plugin identifier
   * @returns {Object|null} Plugin configuration or null
   */
  function get(id) {
    return plugins.get(id) || null;
  }

  /**
   * Get all plugins
   * @returns {Array} Array of plugin configurations
   */
  function getAll() {
    return Array.from(plugins.values());
  }

  /**
   * Get enabled plugins
   * @returns {Array} Array of enabled plugin configurations
   */
  function getEnabled() {
    return getAll().filter(plugin => plugin.enabled);
  }

  /**
   * Enable a plugin
   * @param {string} id - Plugin identifier
   */
  function enable(id) {
    const plugin = plugins.get(id);
    if (plugin) {
      plugin.enabled = true;
      if (plugin.onEnable) {
        plugin.onEnable();
      }
      savePluginState(id, true);
      console.log(`Plugin "${id}" enabled`);
    }
  }

  /**
   * Disable a plugin
   * @param {string} id - Plugin identifier
   */
  function disable(id) {
    const plugin = plugins.get(id);
    if (plugin) {
      plugin.enabled = false;
      if (plugin.onDisable) {
        plugin.onDisable();
      }
      savePluginState(id, false);
      console.log(`Plugin "${id}" disabled`);
    }
  }

  /**
   * Launch a plugin
   * @param {string} id - Plugin identifier
   */
  function launch(id) {
    const plugin = plugins.get(id);
    if (!plugin) {
      console.error(`Plugin "${id}" not found`);
      return;
    }

    if (!plugin.enabled) {
      console.warn(`Plugin "${id}" is disabled`);
      return;
    }

    if (plugin.launch && typeof plugin.launch === 'function') {
      plugin.launch();
    } else {
      console.error(`Plugin "${id}" has no launch function`);
    }
  }

  /**
   * Save plugin state to localStorage
   * @param {string} id - Plugin identifier
   * @param {boolean} enabled - Enabled state
   */
  function savePluginState(id, enabled) {
    const states = JSON.parse(localStorage.getItem('pluginStates') || '{}');
    states[id] = enabled;
    localStorage.setItem('pluginStates', JSON.stringify(states));
  }

  /**
   * Load plugin state from localStorage
   * @param {string} id - Plugin identifier
   * @returns {boolean} Enabled state (default: true)
   */
  function loadPluginState(id) {
    const states = JSON.parse(localStorage.getItem('pluginStates') || '{}');
    return states[id] !== undefined ? states[id] : true;
  }

  /**
   * Expose loadPluginState for external use
   */
  function getLoadPluginState() {
    return loadPluginState;
  }

  /**
   * Restore plugin states from localStorage
   */
  function restorePluginStates() {
    plugins.forEach((plugin, id) => {
      plugin.enabled = loadPluginState(id);
    });
  }

  /**
   * Register built-in plugins
   */
  function registerBuiltInPlugins() {
    // This is a placeholder for future built-in plugins
  }

  // Public API
  return {
    initialize,
    register,
    unregister,
    get,
    getAll,
    getEnabled,
    enable,
    disable,
    launch,
    restorePluginStates,
    loadPluginState, // Expose for external use
  };
})();

// Make available globally
window.PluginRegistry = PluginRegistry;

