// PluginManager - Handles enabling/disabling app functionality as plugins
(function() {
    const PluginManager = {
      // Private variables
      plugins: {},
      isInitialized: false,
      
      // Initialize the manager
      initialize: function() {
        if (this.isInitialized) {
          console.log('PluginManager already initialized, skipping');
          return this;
        }
        
        console.log('PluginManager initializing...');
        
        // Load saved plugin states from localStorage
        this.loadPluginStates();
        
        // Register built-in plugins
        this.registerBuiltInPlugins();
        
        // Don't create plugin UI here anymore - SettingsManager will handle it
        // this.createPluginUI();
        
        this.isInitialized = true;
        console.log('PluginManager initialization complete');
        return this;
      },
      
      // Register a plugin with the manager
      registerPlugin: function(id, options = {}) {
        const defaultOptions = {
          name: id,
          description: '',
          defaultEnabled: true,
          requiresReload: false,
          category: 'general',
          initialize: null,
          cleanup: null,
          toggle: null,
          dependencies: []
        };
        
        const pluginOptions = {...defaultOptions, ...options};
        
        // Don't overwrite existing enabled state if it exists
        if (this.plugins[id] && this.plugins[id].enabled !== undefined) {
          pluginOptions.enabled = this.plugins[id].enabled;
        } else {
          // Otherwise use default or saved state
          const savedState = localStorage.getItem(`plugin_${id}_enabled`);
          pluginOptions.enabled = savedState !== null ? 
            (savedState === 'true') : 
            pluginOptions.defaultEnabled;
        }
        
        this.plugins[id] = pluginOptions;
        console.log(`Plugin "${id}" registered with state: ${pluginOptions.enabled ? 'enabled' : 'disabled'}`);
        
        return this;
      },
      
      // Register all built-in plugins
      registerBuiltInPlugins: function() {
        // Register DragDropManager
        this.registerPlugin('dragDropManager', {
          name: 'Drag & Drop',
          description: 'Allows dragging and dropping nodes to reorganize them',
          defaultEnabled: true,
          category: 'interaction'
        });
        
        // Register NodeGridVisualizer
        this.registerPlugin('nodeGridVisualizerManager', {
          name: 'Node Grid Visualizer',
          description: 'Grid-based visualization of node hierarchy',
          defaultEnabled: false,
          category: 'visualization'
        });
        
        // Register CosmicNodeVisualizer
        this.registerPlugin('cosmicNodeVisualizerManager', {
          name: 'Cosmic Node Visualizer',
          description: '3D solar system visualization of nodes',
          defaultEnabled: false,
          category: 'visualization'
        });
        
        // Register GraphManagementUI
        this.registerPlugin('graphManagementUI', {
          name: 'Graph Management',
          description: 'Manage graph vertices and edges',
          defaultEnabled: true,
          category: 'analysis'
        });
        
        // Register GraphAnalysisVisualizer
        this.registerPlugin('graphAnalysisVisualizer', {
          name: 'Graph Analysis Visualizer',
          description: 'Advanced graph analysis and visualization',
          defaultEnabled: true,
          category: 'analysis'
        });
        
        // Register StyleSettingsManager
        this.registerPlugin('styleSettingsManager', {
          name: 'Style Settings',
          description: 'Customizes the appearance of the app',
          defaultEnabled: true,
          category: 'appearance'
        });
        
        // Register FontManager
        this.registerPlugin('fontManager', {
          name: 'Font Manager',
          description: 'Customizes fonts used in the app',
          defaultEnabled: true,
          category: 'appearance'
        });
        
        // Register BookmarkManager
        this.registerPlugin('bookmarkManager', {
          name: 'Bookmark Manager',
          description: 'Allows bookmarking favorite nodes',
          defaultEnabled: true,
          category: 'utility'
        });
        
        // Register AttributeManager
        this.registerPlugin('attributeManager', {
          name: 'Attribute Manager',
          description: 'Allows adding custom attributes to nodes',
          defaultEnabled: true,
          category: 'data'
        });
        
        // Register NewCodeGraphManager
        this.registerPlugin('newCodeGraphManager', {
          name: 'New Code Graph',
          description: 'Simple, clean code analysis and visualization tool',
          defaultEnabled: true,
          requiresReload: false,
          category: 'analysis',
          initialize: function() {
            if (window.NewCodeGraphManager) {
              console.log('Initializing NewCodeGraphManager plugin');
              NewCodeGraphManager.initialize();
              return true;
            }
            return false;
          },
          cleanup: function() {
            if (window.NewCodeGraphManager) {
              console.log('Cleaning up NewCodeGraphManager plugin');
              NewCodeGraphManager.hide();
              NewCodeGraphManager.globalCleanup();
              return true;
            }
            return false;
          },
          toggle: function(enabled) {
            if (window.NewCodeGraphManager) {
              if (enabled) {
                NewCodeGraphManager.initialize();
              } else {
                NewCodeGraphManager.hide();
                NewCodeGraphManager.globalCleanup();
              }
              return true;
            }
            return false;
          }
        });
        
        // Register CodeGraphManager (Old) - POTENTIAL CURSOR ISSUE CULPRIT
        this.registerPlugin('codeGraphManager', {
          name: 'Code Graph (Legacy)',
          description: 'Complex code analysis and visualization tool (legacy version) - May cause cursor issues',
          defaultEnabled: false, // Disabled by default since it's legacy and problematic
          requiresReload: false,
          category: 'analysis',
          initialize: function() {
            if (window.CodeGraphManager) {
              console.log('Initializing CodeGraphManager (legacy) plugin');
              CodeGraphManager.initialize();
              return true;
            }
            return false;
          },
          cleanup: function() {
            if (window.CodeGraphManager) {
              console.log('Cleaning up CodeGraphManager (legacy) plugin');
              CodeGraphManager.hide();
              
              // Clean up any modals or overlays
              const modal = document.querySelector('.code-graph-modal');
              if (modal) {
                modal.style.display = 'none';
                modal.remove(); // Completely remove the modal
              }
              
              // Remove all global event listeners that might affect cursor
              // These are the problematic listeners found in lines 2406 and 3381
              const clonedDocument = document.cloneNode(true);
              document.parentNode.replaceChild(clonedDocument, document);
              
              // Alternative approach: Remove specific known listeners
              // Note: This is a more targeted cleanup but may not catch all listeners
              document.removeEventListener('click', window.codeGraphDropdownHandler);
              document.removeEventListener('click', window.codeGraphAutocompleteHandler);
              
              // Reset any global cursor styles
              document.body.style.cursor = '';
              document.documentElement.style.cursor = '';
              
              return true;
            }
            return false;
          },
          toggle: function(enabled) {
            if (window.CodeGraphManager) {
              if (enabled) {
                console.warn('⚠️ Enabling legacy CodeGraphManager - this may cause cursor issues in the main outliner');
                CodeGraphManager.initialize();
              } else {
                console.log('🧹 Disabling legacy CodeGraphManager and cleaning up global listeners');
                CodeGraphManager.hide();
                
                // Aggressive cleanup for global listeners
                const modal = document.querySelector('.code-graph-modal');
                if (modal) {
                  modal.style.display = 'none';
                  modal.remove();
                }
                
                // Remove global event listeners that cause cursor issues
                document.removeEventListener('click', window.codeGraphDropdownHandler);
                document.removeEventListener('click', window.codeGraphAutocompleteHandler);
                
                // Reset cursor styles
                document.body.style.cursor = '';
                document.documentElement.style.cursor = '';
                
                // Remove any lingering dropdown elements
                const dropdowns = document.querySelectorAll('.dropdown-options, .autocomplete-suggestions');
                dropdowns.forEach(dropdown => dropdown.remove());
              }
              return true;
            }
            return false;
          }
        });
        
        // Register EnhancedCodeGraphManager
        this.registerPlugin('enhancedCodeGraphManager', {
          name: 'Enhanced Code Graph',
          description: 'Full CRUD code analysis with project management and advanced features',
          defaultEnabled: true,
          requiresReload: false,
          category: 'analysis',
          initialize: function() {
            if (window.EnhancedCodeGraphManager) {
              console.log('Initializing EnhancedCodeGraphManager plugin');
              EnhancedCodeGraphManager.initialize();
              return true;
            }
            return false;
          },
          cleanup: function() {
            if (window.EnhancedCodeGraphManager) {
              console.log('Cleaning up EnhancedCodeGraphManager plugin');
              EnhancedCodeGraphManager.hide();
              return true;
            }
            return false;
          },
          toggle: function(enabled) {
            if (window.EnhancedCodeGraphManager) {
              if (enabled) {
                EnhancedCodeGraphManager.initialize();
              } else {
                EnhancedCodeGraphManager.hide();
              }
              return true;
            }
            return false;
          }
        });
      },
      
      // Load saved plugin states from localStorage
      loadPluginStates: function() {
        const keys = Object.keys(localStorage);
        const pluginStateKeys = keys.filter(key => key.startsWith('plugin_') && key.endsWith('_enabled'));
        
        pluginStateKeys.forEach(key => {
          const pluginId = key.replace('plugin_', '').replace('_enabled', '');
          const enabled = localStorage.getItem(key) === 'true';
          
          // If the plugin exists, update its state
          if (this.plugins[pluginId]) {
            this.plugins[pluginId].enabled = enabled;
          } else {
            // Otherwise, pre-register it with just the enabled state
            this.plugins[pluginId] = { enabled };
          }
        });
      },
      
      // Save plugin state to localStorage
      savePluginState: function(id, enabled) {
        localStorage.setItem(`plugin_${id}_enabled`, enabled);
      },
      
      // Toggle a plugin on/off
      togglePlugin: function(id, enabled) {
        if (!this.plugins[id]) {
          console.error(`Plugin "${id}" not registered`);
          return false;
        }
        
        const plugin = this.plugins[id];
        const newState = enabled !== undefined ? enabled : !plugin.enabled;
        
        console.log(`Toggling plugin "${id}" to: ${newState ? 'enabled' : 'disabled'}`);
        
        // Check dependencies
        if (newState && plugin.dependencies && plugin.dependencies.length > 0) {
          for (const depId of plugin.dependencies) {
            if (!this.isPluginEnabled(depId)) {
              console.warn(`Plugin "${id}" requires "${depId}" which is disabled. Enabling dependency.`);
              this.togglePlugin(depId, true);
            }
          }
        }
        
        // Call plugin-specific toggle handler if available
        if (plugin.toggle && typeof plugin.toggle === 'function') {
          const success = plugin.toggle(newState);
          if (!success) {
            console.warn(`Plugin "${id}" toggle handler failed`);
          }
        }
        
        // Update state
        plugin.enabled = newState;
        this.savePluginState(id, newState);
        
        // Update UI if it exists
        this.updatePluginUI(id);
        
        // ADDED: Call state change callback
        if (this.onPluginStateChange && typeof this.onPluginStateChange === 'function') {
          this.onPluginStateChange(id, newState);
        }
        
        if (plugin.requiresReload) {
          alert(`The ${plugin.name} plugin requires a page reload to ${newState ? 'enable' : 'disable'} fully.`);
        }
        
        return true;
      },
      
      // Check if a plugin is enabled
      isPluginEnabled: function(id) {
        return this.plugins[id] && this.plugins[id].enabled;
      },
      
      // Initialize all enabled plugins
      initializeEnabledPlugins: function() {
        console.log('Initializing all enabled plugins');
        
        for (const id in this.plugins) {
          const plugin = this.plugins[id];
          if (plugin.enabled && plugin.initialize && typeof plugin.initialize === 'function') {
            console.log(`Initializing plugin: ${id}`);
            const success = plugin.initialize();
            if (!success) {
              console.warn(`Failed to initialize plugin "${id}"`);
            }
          }
        }
      },
      
      // Populate the plugin list in a container (for SettingsManager integration)
      populatePluginList: function(container) {
        // Group plugins by category
        const categories = {};
        
        for (const id in this.plugins) {
          const plugin = this.plugins[id];
          const category = plugin.category || 'general';
          
          if (!categories[category]) {
            categories[category] = [];
          }
          
          categories[category].push({id, ...plugin});
        }
        
        // Create a section for each category
        for (const category in categories) {
          const categorySection = document.createElement('div');
          categorySection.className = 'plugin-category';
          
          const categoryHeader = document.createElement('h3');
          categoryHeader.textContent = this.formatCategoryName(category);
          categorySection.appendChild(categoryHeader);
          
          // Add plugins in this category
          categories[category].forEach(plugin => {
            const pluginItem = document.createElement('div');
            pluginItem.className = 'plugin-item';
            pluginItem.dataset.id = plugin.id;
            
            const toggleSwitch = document.createElement('label');
            toggleSwitch.className = 'switch';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = plugin.enabled;
            checkbox.addEventListener('change', e => {
              this.togglePlugin(plugin.id, e.target.checked);
            });
            
            const slider = document.createElement('span');
            slider.className = 'slider round';
            
            toggleSwitch.appendChild(checkbox);
            toggleSwitch.appendChild(slider);
            
            const pluginInfo = document.createElement('div');
            pluginInfo.className = 'plugin-info';
            
            const pluginName = document.createElement('div');
            pluginName.className = 'plugin-name';
            pluginName.textContent = plugin.name || plugin.id;
            
            const pluginDesc = document.createElement('div');
            pluginDesc.className = 'plugin-description';
            pluginDesc.textContent = plugin.description || '';
            
            if (plugin.requiresReload) {
              const reloadNote = document.createElement('span');
              reloadNote.className = 'reload-required';
              reloadNote.textContent = ' (requires reload)';
              pluginName.appendChild(reloadNote);
            }
            
            pluginInfo.appendChild(pluginName);
            pluginInfo.appendChild(pluginDesc);
            
            pluginItem.appendChild(toggleSwitch);
            pluginItem.appendChild(pluginInfo);
            
            categorySection.appendChild(pluginItem);
          });
          
          container.appendChild(categorySection);
        }
      },
      
      // Update a specific plugin item in the UI
      updatePluginUI: function(id) {
        const pluginItem = document.querySelector(`.plugin-item[data-id="${id}"]`);
        if (!pluginItem) return;
        
        const checkbox = pluginItem.querySelector('input[type="checkbox"]');
        if (checkbox) {
          checkbox.checked = this.plugins[id].enabled;
        }
      },
      
      // Format category name for display
      formatCategoryName: function(category) {
        return category.charAt(0).toUpperCase() + category.slice(1);
      },
      
      // Get all plugins (for SettingsManager)
      getAllPlugins: function() {
        return this.plugins;
      },
      
      // Get plugins by category (for SettingsManager)
      getPluginsByCategory: function(category) {
        const plugins = {};
        for (const id in this.plugins) {
          if (this.plugins[id].category === category) {
            plugins[id] = this.plugins[id];
          }
        }
        return plugins;
      }
    };
    
    // Make it available globally
    window.PluginManager = PluginManager;
    
    // Auto-initialize when the DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
      console.log('DOM ready, initializing PluginManager');
      PluginManager.initialize();
    });
    
    // Also initialize immediately if the DOM is already loaded
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
      console.log('DOM already ready, initializing PluginManager immediately');
      PluginManager.initialize();
    }
  })();
  
  // Add a console message to confirm the script loaded
  console.log('PluginManager script loaded');