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
        
        // Create the plugin management UI
        this.createPluginUI();
        
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
          description: 'Allows nodes to be rearranged via drag and drop',
          defaultEnabled: false,
          requiresReload: false,
          category: 'interface',
          initialize: function() {
            if (window.DragDropManager) {
              console.log('Initializing DragDropManager plugin');
              DragDropManager.initialize();
              return true;
            }
            return false;
          },
          cleanup: function() {
            if (window.DragDropManager) {
              console.log('Cleaning up DragDropManager plugin');
              DragDropManager.removeAllEventListeners();
              return true;
            }
            return false;
          },
          toggle: function(enabled) {
            if (window.DragDropManager) {
              if (enabled) {
                DragDropManager.setupDragAndDrop();
              } else {
                DragDropManager.removeAllEventListeners();
              }
              return true;
            }
            return false;
          }
        });
        
        // Register NodeGridVisualizer
        this.registerPlugin('nodeGridVisualizer', {
          name: 'Grid View',
          description: 'Allows visualizing nodes in a grid layout',
          defaultEnabled: false,
          category: 'visualization'
        });
        
        // Register CosmicNodeVisualizer
        this.registerPlugin('cosmicNodeVisualizer', {
          name: 'Cosmic View',
          description: 'Visualizes nodes as a cosmic solar system',
          defaultEnabled: false,
          category: 'visualization'
        });
        
        // Register CosmicNodeVisualizer2D
        this.registerPlugin('cosmicNodeVisualizer2D', {
          name: '2D Cosmic View',
          description: 'Visualizes nodes as a 2D cosmic solar system (better performance)',
          defaultEnabled: false,
          category: 'visualization'
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
          name: 'Bookmarks',
          description: 'Allows bookmarking favorite nodes',
          defaultEnabled: true,
          category: 'utility'
        });
        
        // Register AttributeManager
        this.registerPlugin('attributeManager', {
          name: 'Attributes',
          description: 'Allows adding custom attributes to nodes',
          defaultEnabled: true,
          category: 'data'
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
        
        // Update UI
        this.updatePluginUI(id);
        
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
      
      // Create UI for managing plugins
      createPluginUI: function() {
        // Create plugin manager button for sidebar
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;
        
        const pluginManagerButton = document.createElement('button');
        pluginManagerButton.id = 'plugin-manager-button';
        pluginManagerButton.className = 'feature-toggle';
        pluginManagerButton.textContent = 'Plugin Manager';
        pluginManagerButton.title = 'Manage application plugins and features';
        
        pluginManagerButton.addEventListener('click', () => {
          this.openPluginModal();
        });
        
        sidebar.appendChild(pluginManagerButton);
      },
      
      // Open the plugin management modal
      openPluginModal: function() {
        // Create modal if it doesn't exist
        let pluginModal = document.getElementById('plugin-manager-modal');
        
        if (!pluginModal) {
          pluginModal = document.createElement('div');
          pluginModal.id = 'plugin-manager-modal';
          pluginModal.className = 'modal';
          
          const pluginModalContent = document.createElement('div');
          pluginModalContent.className = 'modal-content';
          
          // Modal header
          const modalHeader = document.createElement('div');
          modalHeader.className = 'modal-header';
          
          const modalTitle = document.createElement('h2');
          modalTitle.textContent = 'Plugin Manager';
          
          const closeButton = document.createElement('span');
          closeButton.className = 'close-button';
          closeButton.innerHTML = '&times;';
          closeButton.addEventListener('click', () => {
            pluginModal.style.display = 'none';
          });
          
          modalHeader.appendChild(modalTitle);
          modalHeader.appendChild(closeButton);
          
          // Modal body
          const modalBody = document.createElement('div');
          modalBody.className = 'modal-body';
          modalBody.id = 'plugin-list-container';
          
          // Create plugin list by category
          this.populatePluginList(modalBody);
          
          // Modal footer
          const modalFooter = document.createElement('div');
          modalFooter.className = 'modal-footer';
          
          const saveButton = document.createElement('button');
          saveButton.textContent = 'Close';
          saveButton.addEventListener('click', () => {
            pluginModal.style.display = 'none';
          });
          
          modalFooter.appendChild(saveButton);
          
          // Assemble modal
          pluginModalContent.appendChild(modalHeader);
          pluginModalContent.appendChild(modalBody);
          pluginModalContent.appendChild(modalFooter);
          pluginModal.appendChild(pluginModalContent);
          
          // Add modal to document
          document.body.appendChild(pluginModal);
        } else {
          // Update plugin list
          const pluginListContainer = document.getElementById('plugin-list-container');
          if (pluginListContainer) {
            pluginListContainer.innerHTML = '';
            this.populatePluginList(pluginListContainer);
          }
        }
        
        // Show the modal
        pluginModal.style.display = 'block';
      },
      
      // Populate the plugin list in the modal
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