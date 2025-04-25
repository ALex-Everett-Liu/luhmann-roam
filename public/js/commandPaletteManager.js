/**
 * Command Palette Manager Module
 * Provides a searchable command palette for executing commands
 * similar to VS Code or Obsidian's command palette.
 */
const CommandPaletteManager = (function() {
    // Private variables
    let isCommandPaletteOpen = false;
    let commands = [];
    let filteredCommands = [];
    let selectedCommandIndex = 0;
    let paletteElement = null;
    let searchInput = null;
    let commandsList = null;
    let isInitialized = false;
    
    /**
     * Initialize the Command Palette Manager
     */
    function initialize() {
        if (isInitialized) return;
        
        // Setup keyboard shortcut for opening the command palette (Ctrl+P)
        document.addEventListener('keydown', function(e) {
            // Check for Ctrl+P (or Cmd+P on Mac)
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
                e.preventDefault(); // it prevents the default action (which would normally trigger the browser's print dialog)
                toggleCommandPalette();
            }
            
            // Handle keyboard navigation when palette is open; navigation within the command palette using the keyboard
            if (isCommandPaletteOpen) {
                handleKeyboardNavigation(e);
            }
        });
        
        // Create the command palette UI elements
        createCommandPaletteUI();
        
        // Register commands from all modules
        registerAllCommands();
        
        isInitialized = true;
        console.log('CommandPaletteManager initialized');
    }
    
    /**
     * Create the command palette UI
     */
    function createCommandPaletteUI() {
        // Create modal overlay
        paletteElement = document.createElement('div');
        paletteElement.className = 'command-palette-overlay';
        paletteElement.style.display = 'none'; // meaning the overlay is hidden by default until the command palette is opened.
        
        // Create the command palette container
        const palette = document.createElement('div'); // the main container for the command palette UI, it will hold the search input and the list of commands.
        palette.className = 'command-palette';
        
        // Create search input
        searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'command-palette-search';
        searchInput.placeholder = 'Type a command...';
        searchInput.addEventListener('input', handleSearchInput);
        
        // Create commands list container
        commandsList = document.createElement('div');
        commandsList.className = 'command-palette-list';
        
        // Assemble the UI
        palette.appendChild(searchInput);
        palette.appendChild(commandsList);
        paletteElement.appendChild(palette); // the palette container is appended to the overlay. creates a structured hierarchy of elements for the command palette UI.
        
        // Add click handler to close when clicking outside
        paletteElement.addEventListener('click', function(e) {
            if (e.target === paletteElement) {
                closeCommandPalette();
            }
        });
        
        // Add to document
        document.body.appendChild(paletteElement);
    }
    
    /**
     * Toggle the command palette open/closed
     */
    function toggleCommandPalette() {
        if (isCommandPaletteOpen) {
            closeCommandPalette();
        } else {
            openCommandPalette();
        }
    }
    
    /**
     * Open the command palette
     */
    function openCommandPalette() {
        // Update commands in case new ones have been registered
        registerAllCommands();
        
        // Reset state
        filteredCommands = [...commands]; // creating a shallow copy of the commands array.
        selectedCommandIndex = 0; // resets the index of the currently selected command to the first command in the list.
        
        // Show the palette
        paletteElement.style.display = 'flex';
        searchInput.value = '';
        
        // Focus the search input
        setTimeout(() => {
            searchInput.focus();
            renderCommandsList();
        }, 50);
        
        isCommandPaletteOpen = true;
    }
    
    /**
     * Close the command palette
     */
    function closeCommandPalette() {
        paletteElement.style.display = 'none';
        isCommandPaletteOpen = false;
    }
    
    /**
     * Handle search input changes
     * @param {Event} e - Input event
     */
    function handleSearchInput(e) {
        const query = e.target.value.toLowerCase().trim();
        
        if (!query) {
            filteredCommands = [...commands];
        } else {
            // Filter commands based on search query
            filteredCommands = commands.filter(command => {
                // Match by name, category, or keywords
                return (
                    command.name.toLowerCase().includes(query) ||
                    (command.category && command.category.toLowerCase().includes(query)) ||
                    (command.keywords && command.keywords.some(keyword => 
                        keyword.toLowerCase().includes(query)
                    ))
                );
            });
            
            // Sort by relevance: exact matches first, then starts with, then includes
            filteredCommands.sort((a, b) => {
                const aName = a.name.toLowerCase();
                const bName = b.name.toLowerCase();
                
                // Exact matches first
                if (aName === query && bName !== query) return -1;
                if (bName === query && aName !== query) return 1;
                
                // Then starts with
                if (aName.startsWith(query) && !bName.startsWith(query)) return -1;
                if (bName.startsWith(query) && !aName.startsWith(query)) return 1;
                
                // Default to original order
                return 0;
            });
        }
        
        // Reset selection
        selectedCommandIndex = filteredCommands.length > 0 ? 0 : -1;
        
        // Update the UI
        renderCommandsList();
    }
    
    /**
     * Handle keyboard navigation within the command palette
     * @param {KeyboardEvent} e - Keyboard event
     */
    function handleKeyboardNavigation(e) {
        if (e.key === 'Escape') {
            e.preventDefault();
            closeCommandPalette();
            return;
        }
        
        if (filteredCommands.length === 0) return;
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedCommandIndex = (selectedCommandIndex + 1) % filteredCommands.length;
            renderCommandsList();
            scrollToSelectedCommand();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedCommandIndex = (selectedCommandIndex - 1 + filteredCommands.length) % filteredCommands.length;
            renderCommandsList();
            scrollToSelectedCommand();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedCommandIndex >= 0 && selectedCommandIndex < filteredCommands.length) {
                executeCommand(filteredCommands[selectedCommandIndex]);
            }
        }
    }
    
    /**
     * Scroll to make the selected command visible
     */
    function scrollToSelectedCommand() {
        const selectedElement = commandsList.querySelector('.command-palette-item.selected');
        if (selectedElement) {
            selectedElement.scrollIntoView({ block: 'nearest' });
        }
    }
    
    /**
     * Render the list of filtered commands
     */
    function renderCommandsList() {
        // Clear the list
        commandsList.innerHTML = '';
        
        if (filteredCommands.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'command-palette-no-results';
            noResults.textContent = 'No matching commands found';
            commandsList.appendChild(noResults);
            return;
        }
        
        // Create a document fragment for better performance
        const fragment = document.createDocumentFragment();
        
        // Add each command to the list
        filteredCommands.forEach((command, index) => {
            const item = document.createElement('div');
            item.className = 'command-palette-item';
            if (index === selectedCommandIndex) {
                item.className += ' selected';
            }
            
            const leftSide = document.createElement('div');
            
            const nameElement = document.createElement('div');
            nameElement.className = 'command-palette-item-name';
            nameElement.textContent = command.name;
            leftSide.appendChild(nameElement);
            
            if (command.category) {
                const categoryElement = document.createElement('div');
                categoryElement.className = 'command-palette-item-category';
                categoryElement.textContent = command.category;
                leftSide.appendChild(categoryElement);
            }
            
            item.appendChild(leftSide);
            
            if (command.shortcut) {
                const shortcutElement = document.createElement('div');
                shortcutElement.className = 'command-palette-item-shortcut';
                shortcutElement.textContent = command.shortcut;
                item.appendChild(shortcutElement);
            }
            
            // Add click handler
            item.addEventListener('click', () => {
                executeCommand(command);
            });
            
            // Add mouse over handler to update selection
            item.addEventListener('mouseover', () => {
                selectedCommandIndex = index;
                renderCommandsList();
            });
            
            fragment.appendChild(item);
        });
        
        // Add the commands to the list
        commandsList.appendChild(fragment);
        
        // Add keyboard shortcut info
        const infoElement = document.createElement('div');
        infoElement.className = 'command-palette-info';
        infoElement.textContent = 'Use ↑↓ to navigate, Enter to execute, Escape to close';
        commandsList.appendChild(infoElement);
    }
    
    /**
     * Execute a command and close the palette
     * @param {Object} command - The command to execute
     */
    function executeCommand(command) {
        // Close the command palette first
        closeCommandPalette();
        
        // Execute the command
        if (typeof command.action === 'function') {
            try {
                command.action();
            } catch (error) {
                console.error('Error executing command:', command.name, error);
            }
        }
    }
    
    /**
     * Register a new command
     * @param {Object} command - Command object with name, action, etc.
     */
    function registerCommand(command) {
        // Ensure required properties
        if (!command.name || typeof command.action !== 'function') {
            console.error('Invalid command:', command);
            return;
        }
        
        // Check if command already exists
        const existingCommandIndex = commands.findIndex(cmd => cmd.name === command.name);
        
        if (existingCommandIndex !== -1) {
            // Update existing command
            commands[existingCommandIndex] = command;
        } else {
            // Add new command
            commands.push(command);
        }
        
        // Sort commands alphabetically by name
        commands.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    /**
     * Register a batch of commands
     * @param {Array} commandsArray - Array of command objects
     */
    function registerCommands(commandsArray) {
        if (!Array.isArray(commandsArray)) {
            console.error('registerCommands expects an array');
            return;
        }
        
        commandsArray.forEach(command => {
            registerCommand(command);
        });
    }
    
    /**
     * Collect and register commands from all modules
     */
    function registerAllCommands() {
        // Clear existing commands to start fresh
        commands = [];
        
        // Register commands from HotkeyManager
        registerHotkeyCommands();
        
        // Register node operations
        registerNodeCommands();
        
        // Register app-level commands
        registerAppCommands();
        
        // Register navigation commands
        registerNavigationCommands();
        
        // Register Plugin Manager commands
        registerPluginManagerCommands();
        
        // Register other module commands
        registerModuleCommands();
    }
    
    /**
     * Register commands from HotkeyManager
     */
    function registerHotkeyCommands() {
        // Check if HotkeyManager exists and has global hotkeys
        if (window.HotkeyManager && window.HotkeyManager._getGlobalHotkeys) {
            const globalHotkeys = window.HotkeyManager._getGlobalHotkeys();
            
            Object.keys(globalHotkeys).forEach(key => {
                if (key === 'escape') return; // Skip escape key
                
                const hotkey = globalHotkeys[key];
                registerCommand({
                    name: hotkey.description,
                    action: hotkey.action,
                    category: 'Global',
                    shortcut: `Alt+${key.toUpperCase()}`,
                    keywords: ['hotkey', 'shortcut']
                });
            });
        } else {
            // Fallback for simple commands if HotkeyManager doesn't expose its hotkeys
            registerCommand({
                name: 'Toggle Hotkey Help',
                action: () => {
                    if (window.HotkeyManager) {
                        window.HotkeyManager.enterHotkeyMode();
                        // Simulate 'h' keypress
                        const event = new KeyboardEvent('keydown', { key: 'h' });
                        document.dispatchEvent(event);
                    }
                },
                category: 'Help',
                shortcut: 'Alt+H',
                keywords: ['hotkey', 'keyboard', 'shortcuts', 'help']
            });
        }
    }
    
    /**
     * Register node operation commands
     */
    function registerNodeCommands() {
        // Add node commands
        registerCommand({
            name: 'Add Root Node',
            action: () => {
                if (window.addRootNode) {
                    window.addRootNode();
                }
            },
            category: 'Nodes',
            shortcut: 'Alt+A',
            keywords: ['create', 'new', 'root', 'node', 'add']
        });
        
        // Check if NodeOperationsManager exists
        if (window.NodeOperationsManager) {
            registerCommand({
                name: 'Add Child Node',
                action: () => {
                    const focusedNode = document.querySelector('.node-text:focus');
                    if (focusedNode) {
                        const nodeId = focusedNode.closest('.node').dataset.id;
                        if (nodeId && window.addChildNode) {
                            window.addChildNode(nodeId);
                        }
                    }
                },
                category: 'Nodes',
                shortcut: 'Enter',
                keywords: ['create', 'new', 'child', 'node', 'add']
            });
            
            registerCommand({
                name: 'Delete Node',
                action: () => {
                    const focusedNode = document.querySelector('.node-text:focus');
                    if (focusedNode) {
                        const nodeId = focusedNode.closest('.node').dataset.id;
                        if (nodeId && window.deleteNode) {
                            if (confirm(window.I18n ? window.I18n.t('confirmDeleteNode') : 'Are you sure you want to delete this node and all its children?')) {
                                window.deleteNode(nodeId);
                            }
                        }
                    }
                },
                category: 'Nodes',
                shortcut: 'Alt+X',
                keywords: ['remove', 'delete', 'node']
            });
            
            registerCommand({
                name: 'Indent Node',
                action: () => {
                    const focusedNode = document.querySelector('.node-text:focus');
                    if (focusedNode) {
                        const nodeId = focusedNode.closest('.node').dataset.id;
                        if (nodeId && window.indentNode) {
                            window.indentNode(nodeId);
                        }
                    }
                },
                category: 'Nodes',
                shortcut: 'Tab',
                keywords: ['indent', 'node', 'child']
            });
            
            registerCommand({
                name: 'Outdent Node',
                action: () => {
                    const focusedNode = document.querySelector('.node-text:focus');
                    if (focusedNode) {
                        const nodeId = focusedNode.closest('.node').dataset.id;
                        if (nodeId && window.outdentNode) {
                            window.outdentNode(nodeId);
                        }
                    }
                },
                category: 'Nodes',
                shortcut: 'Shift+Tab',
                keywords: ['outdent', 'node', 'parent']
            });
        }
    }
    
    /**
     * Register app-level commands
     */
    function registerAppCommands() {
        registerCommand({
            name: 'Save Changes',
            action: () => {
                if (window.saveChanges) {
                    window.saveChanges();
                }
            },
            category: 'App',
            shortcut: 'Alt+S',
            keywords: ['save', 'store', 'persist']
        });
        
        registerCommand({
            name: 'Toggle Language',
            action: () => {
                if (window.I18n && window.I18n.toggleLanguage) {
                    window.I18n.toggleLanguage();
                }
            },
            category: 'App',
            shortcut: 'Alt+L',
            keywords: ['language', 'english', 'chinese', 'toggle', 'switch']
        });
        
        registerCommand({
            name: 'Refresh Data',
            action: () => {
                if (window.fetchNodes) {
                    window.fetchNodes(true);
                }
            },
            category: 'App',
            shortcut: 'Alt+R',
            keywords: ['refresh', 'reload', 'update']
        });
        
        // Add backup command if BackupManager exists
        if (window.BackupManager) {
            registerCommand({
                name: 'Backup Database',
                action: () => {
                    if (window.BackupManager && window.BackupManager.createBackup) {
                        window.BackupManager.createBackup();
                    } else {
                        const backupButton = document.getElementById('backup-database');
                        if (backupButton) backupButton.click();
                    }
                },
                category: 'App',
                keywords: ['backup', 'save', 'export', 'database']
            });
        }
    }
    
    /**
     * Register navigation commands
     */
    function registerNavigationCommands() {
        // Add breadcrumb navigation if BreadcrumbManager exists
        if (window.BreadcrumbManager) {
            registerCommand({
                name: 'Return to Root Level',
                action: () => {
                    if (window.BreadcrumbManager.clearFocus) {
                        window.BreadcrumbManager.clearFocus();
                    }
                },
                category: 'Navigation',
                shortcut: 'Alt+B0',
                keywords: ['home', 'root', 'clear focus', 'navigation']
            });
            
            // Add command to focus on previously focused node
            registerCommand({
                name: 'Focus Last Node',
                action: () => {
                    if (window.lastFocusedNodeId) {
                        const nodeElement = document.querySelector(`.node[data-id="${window.lastFocusedNodeId}"]`);
                        if (nodeElement) {
                            const nodeText = nodeElement.querySelector('.node-text');
                            if (nodeText) {
                                nodeText.focus();
                            }
                        }
                    }
                },
                category: 'Navigation',
                shortcut: 'Alt+Z',
                keywords: ['last', 'previous', 'focus', 'node']
            });
        }
        
        // Add search command
        if (window.SearchManager) {
            registerCommand({
                name: 'Search Nodes',
                action: () => {
                    if (window.SearchManager.openSearchModal) {
                        window.SearchManager.openSearchModal();
                    }
                },
                category: 'Navigation',
                shortcut: 'Alt+F',
                keywords: ['search', 'find', 'lookup']
            });
        }
    }
    
    /**
     * Register commands from other modules
     */
    function registerModuleCommands() {
        // Add Filter commands if FilterManager exists
        if (window.FilterManager) {
            registerCommand({
                name: 'Open Filters',
                action: () => {
                    if (window.FilterManager.openFilterModal) {
                        window.FilterManager.openFilterModal();
                    }
                },
                category: 'Filters',
                shortcut: 'Alt+I',
                keywords: ['filter', 'search', 'narrow']
            });
            
            registerCommand({
                name: 'Clear Filters',
                action: () => {
                    if (window.FilterManager.clearFilters) {
                        window.FilterManager.clearFilters();
                    }
                },
                category: 'Filters',
                keywords: ['clear', 'reset', 'filters']
            });
        }
        
        // Add Bookmark commands if BookmarkManager exists
        if (window.BookmarkManager) {
            registerCommand({
                name: 'Toggle Bookmark for Focused Node',
                action: () => {
                    if (window.BookmarkManager.toggleBookmarkForFocusedNode) {
                        window.BookmarkManager.toggleBookmarkForFocusedNode();
                    }
                },
                category: 'Bookmarks',
                shortcut: 'Alt+B',
                keywords: ['bookmark', 'save', 'favorite']
            });
            
            if (window.BookmarkManager.openBookmarksPanel) {
                registerCommand({
                    name: 'Open Bookmarks Panel',
                    action: () => {
                        window.BookmarkManager.openBookmarksPanel();
                    },
                    category: 'Bookmarks',
                    keywords: ['bookmarks', 'favorites', 'saved']
                });
            }
        }
        
        // Add task commands if TaskManager exists
        if (window.TaskManager) {
            registerCommand({
                name: 'Open Task Manager',
                action: () => {
                    if (window.TaskManager.openTaskManager) {
                        window.TaskManager.openTaskManager();
                    }
                },
                category: 'Tasks',
                keywords: ['tasks', 'todo', 'manage']
            });
        }
        
        // Add Blog Manager commands if BlogManager exists
        if (window.BlogManager) {
            registerCommand({
                name: 'Open Blog Manager',
                action: () => {
                    if (window.BlogManager.openModal) {
                        window.BlogManager.openModal();
                    }
                },
                category: 'Blog',
                keywords: ['blog', 'publish', 'html', 'markdown', 'convert']
            });
            
            // Add command to quickly create a blog from the current focused node
            registerCommand({
                name: 'Create Blog from Current Node',
                action: () => {
                    const focusedNode = document.querySelector('.node-text:focus');
                    if (focusedNode) {
                        const nodeId = focusedNode.closest('.node').dataset.id;
                        if (nodeId) {
                            // Open Blog Manager
                            window.BlogManager.openModal();
                            
                            // Set a small timeout to allow modal to fully initialize
                            setTimeout(() => {
                                // Find and set the node selector to the current node
                                const nodeSelector = document.getElementById('node-selector');
                                if (nodeSelector) {
                                    // Look for the option with the matching nodeId
                                    const option = Array.from(nodeSelector.options).find(opt => opt.value === nodeId);
                                    if (option) {
                                        nodeSelector.value = nodeId;
                                        
                                        // Trigger a change event to update the preview
                                        const event = new Event('change', { bubbles: true });
                                        nodeSelector.dispatchEvent(event);
                                        
                                        // Find and click the preview button
                                        const previewBtn = document.getElementById('preview-markdown-btn');
                                        if (previewBtn) {
                                            previewBtn.click();
                                        }
                                    }
                                }
                            }, 300);
                        }
                    } else {
                        alert('Please focus on a node first');
                    }
                },
                category: 'Blog',
                keywords: ['blog', 'current', 'node', 'publish', 'quick']
            });
            
            // Add command to view all published blogs
            registerCommand({
                name: 'View Published Blogs',
                action: () => {
                    if (window.BlogManager.openModal) {
                        window.BlogManager.openModal();
                        
                        // Set timeout to allow modal to initialize
                        setTimeout(() => {
                            // Switch to manage tab
                            const manageTabBtn = document.getElementById('manage-tab-btn');
                            if (manageTabBtn) {
                                manageTabBtn.click();
                            }
                        }, 300);
                    }
                },
                category: 'Blog',
                keywords: ['blog', 'published', 'list', 'manage']
            });
        }
        
        // Add 2D Cosmic Visualizer commands if CosmicNodeVisualizer2D exists
        if (window.CosmicNodeVisualizer2D) {
            registerCommand({
                name: 'Open 2D Cosmic View',
                action: () => {
                    const nodeId = getCurrentNodeId();
                    if (nodeId) {
                        openCosmicView2D(nodeId);
                    } else {
                        alert('Please select or focus on a node first');
                    }
                },
                category: 'Visualization',
                keywords: ['cosmic', '2d', 'visualize', 'solar', 'system', 'graph']
            });
            
            registerCommand({
                name: 'Open 2D Cosmic View for Current Node',
                action: () => {
                    const focusedNode = document.querySelector('.node-text:focus');
                    if (focusedNode) {
                        const nodeId = focusedNode.closest('.node').dataset.id;
                        if (nodeId) {
                            openCosmicView2D(nodeId);
                        }
                    } else {
                        alert('Please focus on a node first');
                    }
                },
                category: 'Visualization',
                keywords: ['cosmic', '2d', 'current', 'focus', 'visualize']
            });
            
            registerCommand({
                name: 'Open 2D Cosmic View for Root Node',
                action: async () => {
                    try {
                        // Get all root nodes
                        const response = await fetch('/api/nodes?limit=1');
                        const nodes = await response.json();
                        
                        if (nodes && nodes.length > 0) {
                            openCosmicView2D(nodes[0].id);
                        } else {
                            alert('No root nodes found');
                        }
                    } catch (error) {
                        console.error('Error fetching root node:', error);
                        alert('Failed to fetch root node');
                    }
                },
                category: 'Visualization',
                keywords: ['cosmic', '2d', 'root', 'visualize', 'overview']
            });
            
            registerCommand({
                name: 'Toggle 2D Cosmic View',
                action: () => {
                    if (window.CosmicNodeVisualizer2D.isVisible()) {
                        window.CosmicNodeVisualizer2D.hide();
                    } else {
                        const nodeId = getCurrentNodeId();
                        if (nodeId) {
                            openCosmicView2D(nodeId);
                        } else {
                            alert('Please select or focus on a node first');
                        }
                    }
                },
                category: 'Visualization',
                shortcut: 'Alt+C',
                keywords: ['cosmic', '2d', 'toggle', 'visualize', 'hide', 'show']
            });
            
            // Helper function to open the cosmic view
            function openCosmicView2D(nodeId) {
                console.log('Opening 2D Cosmic View for node:', nodeId);
                window.CosmicNodeVisualizer2D.show(nodeId);
            }
            
            // Helper function to get the current node ID
            function getCurrentNodeId() {
                // First try to get focused node from DOM
                const focusedNode = document.querySelector('.node-text:focus');
                if (focusedNode) {
                    const nodeId = focusedNode.closest('.node').dataset.id;
                    if (nodeId) return nodeId;
                }
                
                // Then try to get from BreadcrumbManager if available
                if (window.BreadcrumbManager && window.BreadcrumbManager.getCurrentFocusedNodeId) {
                    const focusedNodeId = window.BreadcrumbManager.getCurrentFocusedNodeId();
                    if (focusedNodeId) return focusedNodeId;
                }
                
                // Otherwise try to get from lastFocusedNodeId
                if (window.lastFocusedNodeId) {
                    return window.lastFocusedNodeId;
                }
                
                // Finally, if all else fails, try to get the first visible node
                const firstVisibleNode = document.querySelector('.node');
                if (firstVisibleNode) {
                    return firstVisibleNode.dataset.id;
                }
                
                return null;
            }
        }
    }
    
    /**
     * Register Plugin Manager commands
     */
    function registerPluginManagerCommands() {
        // Check if PluginManager exists
        if (window.PluginManager) {
            registerCommand({
                name: 'Open Plugin Manager',
                action: () => {
                    window.PluginManager.openPluginModal();
                },
                category: 'App',
                shortcut: 'Alt+P',
                keywords: ['plugin', 'manager', 'settings', 'features', 'toggle', 'modules']
            });
            
            // Also register commands for enabling/disabling specific plugins
            for (const id in window.PluginManager.plugins) {
                const plugin = window.PluginManager.plugins[id];
                
                registerCommand({
                    name: `${plugin.enabled ? 'Disable' : 'Enable'} ${plugin.name}`,
                    action: () => {
                        window.PluginManager.togglePlugin(id);
                    },
                    category: 'Plugins',
                    keywords: [plugin.name.toLowerCase(), 'enable', 'disable', 'toggle', 'plugin']
                });
            }
        }
    }
    
    /**
     * Update translations for command palette
     * @param {string} language - The language code
     */
    function updateLanguage(language) {
        if (searchInput) {
            if (language === 'zh') {
                searchInput.placeholder = '输入命令...';
            } else {
                searchInput.placeholder = 'Type a command...';
            }
        }
        
        // Update commands that might have translated names
        registerAllCommands();
        
        // Update the UI if open
        if (isCommandPaletteOpen) {
            renderCommandsList();
        }
    }
    
    // Public API
    return {
        initialize,
        registerCommand,
        registerCommands,
        openCommandPalette,
        closeCommandPalette,
        updateLanguage,
        // Expose for testing only
        _getCommands: () => commands
    };
})();

// Export the module for use in other files
window.CommandPaletteManager = CommandPaletteManager;