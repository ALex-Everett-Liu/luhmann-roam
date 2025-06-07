/**
 * Plugin-Aware Initializer
 * Only initializes modules whose plugins are enabled
 */
const PluginAwareInitializer = (function() {
    
    /**
     * Initialize all enabled plugins and their modules
     */
    function initializeEnabledModules() {
        console.log('🚀 Starting plugin-aware module initialization...');
        
        // Wait for PluginManager to be ready
        if (!window.PluginManager) {
            console.warn('PluginManager not available, deferring initialization');
            setTimeout(initializeEnabledModules, 100);
            return;
        }
        
        // ADDED: Wait for PluginManager to be fully initialized
        if (!window.PluginManager.isInitialized) {
            console.warn('PluginManager not fully initialized, deferring initialization');
            setTimeout(initializeEnabledModules, 100);
            return;
        }
        
        // Initialize modules based on plugin states
        const moduleInitializers = {
            // Core modules (always enabled)
            'core': {
                name: 'Core Modules',
                initialize: initializeCoreModules,
                enabled: true
            },
            
            // Plugin-dependent modules
            'dragDropManager': {
                name: 'Drag & Drop Manager',
                initialize: initializeDragDropManager,
                pluginId: 'dragDropManager'
            },
            
            'newCodeGraphManager': {
                name: 'New Code Graph Manager',
                initialize: initializeNewCodeGraphManager,
                pluginId: 'newCodeGraphManager'
            },
            
            'codeGraphManager': {
                name: 'Code Graph Manager (Legacy)',
                initialize: initializeCodeGraphManager,
                pluginId: 'codeGraphManager'
            },
            
            'nodeGridVisualizer': {
                name: 'Node Grid Visualizer',
                initialize: initializeNodeGridVisualizer,
                pluginId: 'nodeGridVisualizerManager'
            },
            
            'cosmicNodeVisualizer': {
                name: 'Cosmic Node Visualizer',
                initialize: initializeCosmicNodeVisualizer,
                pluginId: 'cosmicNodeVisualizerManager'
            },
            
            'graphManagementUI': {
                name: 'Graph Management UI',
                initialize: initializeGraphManagementUI,
                pluginId: 'graphManagementUI'
            },
            
            'graphAnalysisVisualizer': {
                name: 'Graph Analysis Visualizer',
                initialize: initializeGraphAnalysisVisualizer,
                pluginId: 'graphAnalysisVisualizer'
            }
        };
        
        // Initialize each module if its plugin is enabled
        for (const [moduleId, config] of Object.entries(moduleInitializers)) {
            const isEnabled = config.enabled || 
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
        
        console.log('🎉 Plugin-aware initialization complete');
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
        if (window.CommandPaletteManager && !window.CommandPaletteManager.isInitialized) {
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
     * Initialize New Code Graph Manager only if plugin is enabled
     */
    function initializeNewCodeGraphManager() {
        if (window.NewCodeGraphManager && !window.NewCodeGraphManager.isInitialized) {
            NewCodeGraphManager.initialize();
            // Add sidebar button
            addNewCodeGraphButton();
        }
    }
    
    /**
     * Initialize Code Graph Manager (Legacy) only if plugin is enabled
     */
    function initializeCodeGraphManager() {
        if (window.CodeGraphManager && !window.CodeGraphManager.isInitialized) {
            CodeGraphManager.initialize();
            // Add sidebar button
            addCodeGraphButton();
        }
    }
    
    /**
     * Initialize Node Grid Visualizer only if plugin is enabled
     */
    function initializeNodeGridVisualizer() {
        if (window.NodeGridVisualizer && !window.NodeGridVisualizer.isInitialized) {
            NodeGridVisualizer.initialize();
        }
    }
    
    /**
     * Initialize Cosmic Node Visualizer only if plugin is enabled
     */
    function initializeCosmicNodeVisualizer() {
        if (window.CosmicNodeVisualizer && !window.CosmicNodeVisualizer.isInitialized) {
            CosmicNodeVisualizer.initialize();
        }
    }
    
    /**
     * Initialize Graph Management UI only if plugin is enabled
     */
    function initializeGraphManagementUI() {
        if (window.GraphManagementUI && !window.GraphManagementUI.isInitialized) {
            GraphManagementUI.initialize();
            addGraphManagementButton();
        }
    }
    
    /**
     * Initialize Graph Analysis Visualizer only if plugin is enabled
     */
    function initializeGraphAnalysisVisualizer() {
        if (window.GraphAnalysisVisualizer && !window.GraphAnalysisVisualizer.isInitialized) {
            GraphAnalysisVisualizer.initialize();
            addGraphAnalysisButton();
        }
    }
    
    /**
     * Helper functions to add sidebar buttons
     */
    function addCodeGraphButton() {
        const toggleCodeGraphButton = document.createElement('button');
        toggleCodeGraphButton.id = 'toggle-code-graph';
        toggleCodeGraphButton.className = 'feature-toggle';
        toggleCodeGraphButton.textContent = 'Code Graph';
        toggleCodeGraphButton.title = 'Manage code entities and relationships';
        
        toggleCodeGraphButton.addEventListener('click', function() {
            if (window.PluginManager && !PluginManager.isPluginEnabled('codeGraphManager')) {
                alert('Code Graph (Legacy) plugin is disabled. Please enable it in Settings > Plugins.');
                return;
            }
            
            if (window.CodeGraphManager) {
                if (CodeGraphManager.isVisible()) {
                    CodeGraphManager.hide();
                } else {
                    CodeGraphManager.show();
                }
            }
        });
        
        window.addButtonToSidebar(toggleCodeGraphButton);
    }
    
    function addNewCodeGraphButton() {
        const toggleNewCodeGraphButton = document.createElement('button');
        toggleNewCodeGraphButton.id = 'toggle-new-code-graph';
        toggleNewCodeGraphButton.className = 'feature-toggle';
        toggleNewCodeGraphButton.textContent = 'New Code Graph';
        toggleNewCodeGraphButton.title = 'Simple, clean code analysis and visualization';
        
        toggleNewCodeGraphButton.addEventListener('click', function() {
            if (window.PluginManager && !PluginManager.isPluginEnabled('newCodeGraphManager')) {
                alert('New Code Graph plugin is disabled. Please enable it in Settings > Plugins.');
                return;
            }
            
            if (window.NewCodeGraphManager) {
                if (NewCodeGraphManager.isVisible()) {
                    NewCodeGraphManager.hide();
                } else {
                    NewCodeGraphManager.show();
                }
            }
        });
        
        window.addButtonToSidebar(toggleNewCodeGraphButton);
    }
    
    function addGraphManagementButton() {
        const toggleGraphManagementButton = document.createElement('button');
        toggleGraphManagementButton.id = 'toggle-graph-management';
        toggleGraphManagementButton.className = 'feature-toggle';
        toggleGraphManagementButton.textContent = 'Graph Management';
        toggleGraphManagementButton.title = 'Manage graph vertices and edges';
        
        toggleGraphManagementButton.addEventListener('click', function() {
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
        const toggleGraphAnalysisButton = document.createElement('button');
        toggleGraphAnalysisButton.id = 'toggle-graph-analysis';
        toggleGraphAnalysisButton.className = 'feature-toggle';
        toggleGraphAnalysisButton.textContent = 'Graph Analysis';
        toggleGraphAnalysisButton.title = 'Open advanced graph analysis and visualization';
        
        toggleGraphAnalysisButton.addEventListener('click', function() {
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
        const toggleDragDropButton = document.createElement('button');
        toggleDragDropButton.id = 'toggle-drag-drop';
        toggleDragDropButton.className = 'feature-toggle';
        toggleDragDropButton.textContent = DragDropManager.isEnabled() ? 'Disable Drag & Drop' : 'Enable Drag & Drop';
        toggleDragDropButton.classList.toggle('active', DragDropManager.isEnabled());
        toggleDragDropButton.title = 'Toggle drag and drop functionality (improves performance when disabled)';
        
        toggleDragDropButton.addEventListener('click', () => {
            if (window.PluginManager && !PluginManager.isPluginEnabled('dragDropManager')) {
                alert('Drag & Drop plugin is disabled. Please enable it in Settings > Plugins.');
                return;
            }
            DragDropManager.toggle();
            // Update button text
            const isEnabled = DragDropManager.isEnabled();
            toggleDragDropButton.textContent = isEnabled ? 'Disable Drag & Drop' : 'Enable Drag & Drop';
            toggleDragDropButton.classList.toggle('active', isEnabled);
        });
        
        window.addButtonToSidebar(toggleDragDropButton);
    }
    
    /**
     * Handle plugin state changes (when user enables/disables plugins)
     */
    function handlePluginStateChange(pluginId, enabled) {
        console.log(`Plugin ${pluginId} ${enabled ? 'enabled' : 'disabled'}`);
        
        if (enabled) {
            // Initialize the module if it wasn't already
            switch (pluginId) {
                case 'dragDropManager':
                    initializeDragDropManager();
                    break;
                case 'newCodeGraphManager':
                    initializeNewCodeGraphManager();
                    break;
                case 'codeGraphManager':
                    initializeCodeGraphManager();
                    break;
                case 'nodeGridVisualizerManager':
                    initializeNodeGridVisualizer();
                    break;
                case 'cosmicNodeVisualizerManager':
                    initializeCosmicNodeVisualizer();
                    break;
                case 'graphManagementUI':
                    initializeGraphManagementUI();
                    break;
                case 'graphAnalysisVisualizer':
                    initializeGraphAnalysisVisualizer();
                    break;
            }
        } else {
            // Clean up the module
            switch (pluginId) {
                case 'dragDropManager':
                    if (window.DragDropManager && window.DragDropManager.cleanup) {
                        DragDropManager.cleanup();
                    }
                    // Remove sidebar button
                    const dragDropBtn = document.getElementById('toggle-drag-drop');
                    if (dragDropBtn) dragDropBtn.remove();
                    break;
                case 'newCodeGraphManager':
                    if (window.NewCodeGraphManager && window.NewCodeGraphManager.globalCleanup) {
                        NewCodeGraphManager.globalCleanup();
                    }
                    // Remove sidebar button
                    const newCodeGraphBtn = document.getElementById('toggle-new-code-graph');
                    if (newCodeGraphBtn) newCodeGraphBtn.remove();
                    break;
                case 'codeGraphManager':
                    if (window.CodeGraphManager && window.CodeGraphManager.hide) {
                        CodeGraphManager.hide();
                    }
                    // Remove sidebar button
                    const codeGraphBtn = document.getElementById('toggle-code-graph');
                    if (codeGraphBtn) codeGraphBtn.remove();
                    break;
            }
        }
    }
    
    // Public API
    return {
        initializeEnabledModules,
        handlePluginStateChange
    };
})();

// Make available globally
window.PluginAwareInitializer = PluginAwareInitializer;