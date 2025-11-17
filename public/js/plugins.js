/**
 * Simple Plugin System
 * Lightweight, extensible plugin architecture for feature management
 */
const PluginSystem = (function() {
  'use strict';

  // Plugin registry
  const plugins = new Map();
  const hooks = new Map();
  let isInitialized = false;

  /**
   * Initialize the plugin system
   */
  function initialize() {
    if (isInitialized) {
      console.log('PluginSystem already initialized');
      return;
    }

    console.log('Initializing PluginSystem...');

    // Register built-in plugins
    registerBuiltInPlugins();

    // Load saved plugin states
    loadPluginStates();

    // Initialize enabled plugins
    initializeEnabledPlugins();

    isInitialized = true;
    console.log('PluginSystem initialized successfully');
  }

  /**
   * Register a plugin
   */
  function register(config) {
    if (!config.id || !config.name) {
      console.error('Plugin must have id and name');
      return false;
    }

    const defaultConfig = {
      description: '',
      category: 'general',
      defaultEnabled: false,
      requiresReload: false,
      dependencies: [],
      init: null,
      cleanup: null,
      hooks: {}
    };

    // Merge with provided config
    const pluginConfig = { ...defaultConfig, ...config };

    // Load saved state if exists
    const savedState = localStorage.getItem(`plugin_${config.id}_enabled`);
    pluginConfig.enabled = savedState !== null ? savedState === 'true' : pluginConfig.defaultEnabled;

    plugins.set(config.id, pluginConfig);
    console.log(`Plugin '${config.name}' registered`);

    return true;
  }

  /**
   * Plugin management
   */
  function enable(id) {
    const plugin = plugins.get(id);
    if (!plugin) {
      console.error(`Plugin ${id} not found`);
      return false;
    }

    // Check dependencies
    for (const dep of plugin.dependencies) {
      if (!isEnabled(dep)) {
        console.warn(`Enabling dependency: ${dep}`);
        enable(dep);
      }
    }

    plugin.enabled = true;
    savePluginState(id, true);

    // Call init if available
    if (plugin.init && typeof plugin.init === 'function') {
      try {
        plugin.init();
      } catch (error) {
        console.error(`Error initializing plugin ${id}:`, error);
        plugin.enabled = false;
        return false;
      }
    }

    console.log(`Plugin '${plugin.name}' enabled`);
    triggerHook(`plugin:${id}:enabled`);
    return true;
  }

  function disable(id) {
    const plugin = plugins.get(id);
    if (!plugin) {
      console.error(`Plugin ${id} not found`);
      return false;
    }

    plugin.enabled = false;
    savePluginState(id, false);

    // Call cleanup if available
    if (plugin.cleanup && typeof plugin.cleanup === 'function') {
      try {
        plugin.cleanup();
      } catch (error) {
        console.error(`Error cleaning up plugin ${id}:`, error);
      }
    }

    console.log(`Plugin '${plugin.name}' disabled`);
    triggerHook(`plugin:${id}:disabled`);
    return true;
  }

  function toggle(id) {
    const plugin = plugins.get(id);
    if (!plugin) return false;
    return plugin.enabled ? disable(id) : enable(id);
  }

  function isEnabled(id) {
    const plugin = plugins.get(id);
    return plugin ? plugin.enabled : false;
  }

  /**
   * Hook system for plugins to interact
   */
  function registerHook(name, handler) {
    if (!hooks.has(name)) {
      hooks.set(name, []);
    }
    hooks.get(name).push(handler);
  }

  function triggerHook(name, data = null) {
    const handlers = hooks.get(name);
    if (!handlers || handlers.length === 0) return;

    return handlers.map(handler => {
      try {
        return handler(data);
      } catch (error) {
        console.error(`Error in hook ${name}:`, error);
      }
    });
  }

  /**
   * Core functionality
   */
  function registerBuiltInPlugins() {
    // Built-in plugins go here
    // These serve as simple examples and provide optional functionality

    // Sample plugin - simple utility
    register({
      id: 'sample-plugin',
      name: 'Sample Plugin',
      description: 'Simple example plugin demonstrating the plugin system',
      category: 'examples',
      defaultEnabled: true,
      init: function() {
        console.log('✨ Sample plugin initialized!');
        this.setupUI();
      },
      cleanup: function() {
        console.log('👋 Sample plugin cleaned up');
        this.removeUI();
      },
      setupUI: function() {
        // Add sample UI element to demonstrate plugin integration
        const sampleButton = document.createElement('button');
        sampleButton.id = 'sample-plugin-button';
        sampleButton.textContent = '🔌 Plugin Demo';
        sampleButton.title = 'Click for plugin system demo';
        sampleButton.className = 'feature-toggle';

        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
          const backupBtn = document.getElementById('backup-database');
          if (backupBtn) {
            sidebar.insertBefore(sampleButton, backupBtn);
          } else {
            sidebar.appendChild(sampleButton);
          }
        }

        sampleButton.addEventListener('click', () => {
          this.showDemo();
        });
      },
      removeUI: function() {
        const button = document.getElementById('sample-plugin-button');
        if (button) button.remove();
      },
      showDemo: function() {
        alert(`Plugin System Demo

This button was added by the Sample Plugin (${this.name}).

The new plugin system allows:
- Simple plugin registration
- Enable/disable switching
- Hooks for extensibility
- UI injection points`);
      }
    });
  }

  function loadPluginStates() {
    plugins.forEach((plugin, id) => {
      const saved = localStorage.getItem(`plugin_${id}_enabled`);
      if (saved !== null) {
        plugin.enabled = saved === 'true';
      }
    });
  }

  function savePluginState(id, enabled) {
    localStorage.setItem(`plugin_${id}_enabled`, enabled);
  }

  function initializeEnabledPlugins() {
    plugins.forEach((plugin, id) => {
      if (plugin.enabled && plugin.init) {
        try {
          plugin.init();
        } catch (error) {
          console.error(`Failed to initialize plugin ${id}:`, error);
          plugin.enabled = false;
        }
      }
    });
  }

  /**
   * Plugin settings UI
   */
  function createPluginSection(container) {
    const section = document.createElement('div');
    section.className = 'plugin-settings-section';

    const header = document.createElement('h3');
    header.textContent = 'Plugins';
    section.appendChild(header);

    // Group by category
    const categories = new Map();
    plugins.forEach((plugin, id) => {
      const category = plugin.category || 'general';
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category).push({ id, ...plugin });
    });

    // Create category sections
    categories.forEach((plugins, category) => {
      const categoryDiv = document.createElement('div');
      categoryDiv.className = 'plugin-category';

      const categoryHeader = document.createElement('h4');
      categoryHeader.textContent = formatCategoryName(category);
      categoryDiv.appendChild(categoryHeader);

      plugins.forEach(plugin => {
        const pluginItem = createPluginItem(plugin);
        categoryDiv.appendChild(pluginItem);
      });

      section.appendChild(categoryDiv);
    });

    container.appendChild(section);
    return section;
  }

  function createPluginItem(plugin) {
    const item = document.createElement('div');
    item.className = 'plugin-item';

    const info = document.createElement('div');
    info.className = 'plugin-info';

    const name = document.createElement('span');
    name.className = 'plugin-name';
    name.textContent = plugin.name;

    const desc = document.createElement('div');
    desc.className = 'plugin-description';
    desc.textContent = plugin.description;

    const toggle = createPluginToggle(plugin.id, plugin.enabled);

    info.appendChild(name);
    info.appendChild(desc);

    item.appendChild(info);
    item.appendChild(toggle);

    return item;
  }

  function createPluginToggle(id, enabled) {
    const container = document.createElement('label');
    container.className = 'plugin-toggle';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = enabled;
    input.addEventListener('change', (e) => {
      toggle(id);
    });

    const slider = document.createElement('span');
    slider.className = 'plugin-slider';

    container.appendChild(input);
    container.appendChild(slider);

    return container;
  }

  function formatCategoryName(category) {
    return category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ');
  }

  /**
   * Public API
   */
  return {
    initialize,
    register,
    enable,
    disable,
    toggle,
    isEnabled,
    registerHook,
    triggerHook,
    createPluginSection,
    plugins: plugins
  };
})();

// Make globally available
window.PluginSystem = PluginSystem;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  PluginSystem.initialize();
});