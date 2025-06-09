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
            },
            
            'enhancedCodeGraphManager': {
                name: 'Enhanced Code Graph Manager',
                initialize: initializeEnhancedCodeGraphManager,
                pluginId: 'enhancedCodeGraphManager'
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
        if (!window.NodeGridVisualizer) {
            console.log('❌ NodeGridVisualizer not available');
            return false;
        }
        
        console.log('✅ Initializing NodeGridVisualizer');
        NodeGridVisualizer.initialize();
        
        // Hide the grid by default
        const container = document.getElementById('node-grid-container');
        if (container) {
            container.style.display = 'none';
        }
        
        // Add the button
        addNodeGridVisualizerButton();
        
        return true;
    }
    
    /**
     * Initialize Cosmic Node Visualizer only if plugin is enabled
     */
    function initializeCosmicNodeVisualizer() {
        if (!window.CosmicNodeVisualizer) {
            console.log('❌ CosmicNodeVisualizer not available');
            return false;
        }
        
        console.log('✅ Initializing CosmicNodeVisualizer');
        CosmicNodeVisualizer.initialize();
        
        // Also initialize 2D version if available
        if (window.CosmicNodeVisualizer2D) {
            console.log('✅ Initializing CosmicNodeVisualizer2D');
            CosmicNodeVisualizer2D.initialize();
        }
        
        // Add the buttons
        addCosmicVisualizerButtons();
        
        return true;
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
                console.error('Failed to initialize GraphManagementUI:', error);
            }
        }
    }
    
    /**
     * Initialize Graph Analysis Visualizer only if plugin is enabled
     */
    function initializeGraphAnalysisVisualizer() {
        if (window.GraphAnalysisVisualizer && !window.GraphAnalysisVisualizer.isInitialized) {
            try {
                GraphAnalysisVisualizer.initialize();
                addGraphAnalysisButton();
            } catch (error) {
                console.error('Failed to initialize GraphAnalysisVisualizer:', error);
            }
        }
    }
    
    /**
     * Initialize Enhanced Code Graph Manager only if plugin is enabled
     */
    function initializeEnhancedCodeGraphManager() {
        if (window.EnhancedCodeGraphManager && !window.EnhancedCodeGraphManager.isInitialized) {
            EnhancedCodeGraphManager.initialize();
            // Add sidebar button
            addEnhancedCodeGraphButton();
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
        // Check if addButtonToSidebar is available
        if (!window.addButtonToSidebar) {
            console.error('addButtonToSidebar not available, deferring button creation');
            setTimeout(() => addGraphManagementButton(), 100);
            return;
        }
        
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
        // Check if addButtonToSidebar is available
        if (!window.addButtonToSidebar) {
            console.error('addButtonToSidebar not available, deferring button creation');
            setTimeout(() => addGraphAnalysisButton(), 100);
            return;
        }
        
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
    
    function addNodeGridVisualizerButton() {
        // Add a toggle button for the grid visualizer
        const toggleGridButton = document.createElement('button');
        toggleGridButton.id = 'toggle-grid-view';
        toggleGridButton.className = 'feature-toggle';
        toggleGridButton.textContent = 'Grid View';
        toggleGridButton.title = 'View nodes in a grid layout';

        toggleGridButton.addEventListener('click', function() {
            if (window.PluginManager && !PluginManager.isPluginEnabled('nodeGridVisualizerManager')) {
                alert('Node Grid Visualizer plugin is disabled. Please enable it in Settings > Plugins.');
                return;
            }
            
            if (window.NodeGridVisualizer) {
                NodeGridVisualizer.toggleVisibility();
            }
        });

        window.addButtonToSidebar(toggleGridButton);
    }

    function addCosmicVisualizerButtons() {
        // Add a toggle button for the cosmic visualizer
        const toggleCosmicButton = document.createElement('button');
        toggleCosmicButton.id = 'toggle-cosmic-view';
        toggleCosmicButton.className = 'feature-toggle';
        toggleCosmicButton.textContent = 'Cosmic View';
        toggleCosmicButton.title = 'View nodes as a cosmic solar system';

        toggleCosmicButton.addEventListener('click', function() {
            if (window.PluginManager && !PluginManager.isPluginEnabled('cosmicNodeVisualizerManager')) {
                alert('Cosmic Node Visualizer plugin is disabled. Please enable it in Settings > Plugins.');
                return;
            }
            
            if (window.CosmicNodeVisualizer) {
                if (CosmicNodeVisualizer.isVisible()) {
                    CosmicNodeVisualizer.hide();
                } else {
                    let nodeToShow = window.lastFocusedNodeId;
                    
                    if (!nodeToShow && window.BreadcrumbManager && BreadcrumbManager.getCurrentFocusedNodeId) {
                        nodeToShow = BreadcrumbManager.getCurrentFocusedNodeId();
                    }
                    
                    if (!nodeToShow && window.nodes && window.nodes.length > 0) {
                        nodeToShow = window.nodes[0].id;
                    }
                    
                    CosmicNodeVisualizer.show(nodeToShow);
                }
            }
        });

        window.addButtonToSidebar(toggleCosmicButton);

        // Add a toggle button for the 2D cosmic visualizer
        const toggle2DCosmicButton = document.createElement('button');
        toggle2DCosmicButton.id = 'toggle-cosmic-2d-view';
        toggle2DCosmicButton.className = 'feature-toggle';
        toggle2DCosmicButton.textContent = '2D Cosmic View';
        toggle2DCosmicButton.title = 'View nodes as a 2D cosmic solar system (better performance)';

        toggle2DCosmicButton.addEventListener('click', function() {
            if (window.PluginManager && !PluginManager.isPluginEnabled('cosmicNodeVisualizerManager')) {
                alert('Cosmic Node Visualizer plugin is disabled. Please enable it in Settings > Plugins.');
                return;
            }
            
            if (window.CosmicNodeVisualizer2D) {
                const isCurrentlyVisible = CosmicNodeVisualizer2D.isVisible();
                
                if (isCurrentlyVisible) {
                    CosmicNodeVisualizer2D.hide();
                } else {
                    let nodeToShow = window.lastFocusedNodeId;
                    
                    if (!nodeToShow && window.BreadcrumbManager && BreadcrumbManager.getCurrentFocusedNodeId) {
                        nodeToShow = BreadcrumbManager.getCurrentFocusedNodeId();
                    }
                    
                    if (!nodeToShow && window.nodes && window.nodes.length > 0) {
                        nodeToShow = window.nodes[0].id;
                    }
                    
                    if (nodeToShow) {
                        CosmicNodeVisualizer2D.show(nodeToShow);
                    } else {
                        alert('Please select a node first');
                    }
                }
            }
        });

        window.addButtonToSidebar(toggle2DCosmicButton);
    }
    
    function addEnhancedCodeGraphButton() {
        const toggleEnhancedCodeGraphButton = document.createElement('button');
        toggleEnhancedCodeGraphButton.id = 'toggle-enhanced-code-graph';
        toggleEnhancedCodeGraphButton.className = 'feature-toggle';
        toggleEnhancedCodeGraphButton.textContent = 'Enhanced Code Graph';
        toggleEnhancedCodeGraphButton.title = 'Full CRUD code analysis with project management';
        
        toggleEnhancedCodeGraphButton.addEventListener('click', function() {
            if (window.PluginManager && !PluginManager.isPluginEnabled('enhancedCodeGraphManager')) {
                alert('Enhanced Code Graph plugin is disabled. Please enable it in Settings > Plugins.');
                return;
            }
            
            if (window.EnhancedCodeGraphManager) {
                if (EnhancedCodeGraphManager.isVisible()) {
                    EnhancedCodeGraphManager.hide();
                } else {
                    EnhancedCodeGraphManager.show();
                }
            }
        });
        
        window.addButtonToSidebar(toggleEnhancedCodeGraphButton);
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
                case 'nodeGridVisualizerManager':
                    initializeNodeGridVisualizer();
                    break;
                case 'cosmicNodeVisualizerManager':
                    initializeCosmicNodeVisualizer();
                    break;
                case 'newCodeGraphManager':
                    initializeNewCodeGraphManager();
                    break;
                case 'codeGraphManager':
                    initializeCodeGraphManager();
                    break;
                case 'graphManagementUI':
                    initializeGraphManagementUI();
                    break;
                case 'graphAnalysisVisualizer':
                    initializeGraphAnalysisVisualizer();
                    break;
                case 'enhancedCodeGraphManager':
                    initializeEnhancedCodeGraphManager();
                    break;
                default:
                    console.log(`No specific initialization handler for plugin: ${pluginId}`);
            }
        } else {
            // Handle plugin disable
            switch (pluginId) {
                case 'dragDropManager':
                    if (window.DragDropManager) {
                        DragDropManager.disable();
                    }
                    break;
                case 'nodeGridVisualizerManager':
                    if (window.NodeGridVisualizer) {
                        // Hide the grid if it's visible
                        const container = document.getElementById('node-grid-container');
                        if (container) {
                            container.style.display = 'none';
                        }
                    }
                    break;
                case 'cosmicNodeVisualizerManager':
                    if (window.CosmicNodeVisualizer) {
                        CosmicNodeVisualizer.hide();
                    }
                    if (window.CosmicNodeVisualizer2D) {
                        CosmicNodeVisualizer2D.hide();
                    }
                    break;
                case 'newCodeGraphManager':
                    if (window.NewCodeGraphManager) {
                        NewCodeGraphManager.hide();
                        NewCodeGraphManager.globalCleanup();
                    }
                    break;
                case 'codeGraphManager':
                    if (window.CodeGraphManager) {
                        CodeGraphManager.hide();
                        // Clean up global listeners that cause cursor issues
                        console.log('🧹 Cleaning up CodeGraphManager global listeners');
                    }
                    break;
                case 'enhancedCodeGraphManager':
                    if (window.EnhancedCodeGraphManager) {
                        EnhancedCodeGraphManager.hide();
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
        handlePluginStateChange
    };
})();

// Make available globally
window.PluginAwareInitializer = PluginAwareInitializer;