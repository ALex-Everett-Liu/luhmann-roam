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
    
    // Command usage tracking variables
    let commandUsageCounts = {};
    let recentCommands = [];
    const MAX_RECENT_COMMANDS = 10;
    
    /**
     * Load command usage counts from localStorage
     */
    function loadCommandUsageCounts() {
        try {
            const saved = localStorage.getItem('command_palette_usage_counts');
            if (saved) {
                commandUsageCounts = JSON.parse(saved);
                console.log('Loaded command usage counts:', commandUsageCounts);
            }
        } catch (error) {
            console.error('Error loading command usage counts:', error);
            commandUsageCounts = {};
        }
    }
    
    /**
     * Save command usage counts to localStorage
     */
    function saveCommandUsageCounts() {
        try {
            localStorage.setItem('command_palette_usage_counts', JSON.stringify(commandUsageCounts));
        } catch (error) {
            console.error('Error saving command usage counts:', error);
        }
    }
    
    /**
     * Load recent commands from localStorage
     */
    function loadRecentCommands() {
        try {
            const saved = localStorage.getItem('command_palette_recent_commands');
            if (saved) {
                recentCommands = JSON.parse(saved);
                console.log('Loaded recent commands:', recentCommands);
            }
        } catch (error) {
            console.error('Error loading recent commands:', error);
            recentCommands = [];
        }
    }
    
    /**
     * Save recent commands to localStorage
     */
    function saveRecentCommands() {
        try {
            localStorage.setItem('command_palette_recent_commands', JSON.stringify(recentCommands));
        } catch (error) {
            console.error('Error saving recent commands:', error);
        }
    }
    
    /**
     * Track command usage
     * @param {string} commandName - The name of the command to track
     */
    function trackCommandUsage(commandName) {
        // Increment usage count
        if (!commandUsageCounts[commandName]) {
            commandUsageCounts[commandName] = 0;
        }
        commandUsageCounts[commandName]++;
        console.log(`Incremented usage count for command "${commandName}" to ${commandUsageCounts[commandName]}`);
        
        // Add to recent commands (remove if already exists, then add to front)
        const existingIndex = recentCommands.indexOf(commandName);
        if (existingIndex !== -1) {
            recentCommands.splice(existingIndex, 1);
        }
        recentCommands.unshift(commandName);
        
        // Keep only the last MAX_RECENT_COMMANDS
        if (recentCommands.length > MAX_RECENT_COMMANDS) {
            recentCommands = recentCommands.slice(0, MAX_RECENT_COMMANDS);
        }
        
        console.log('Updated recent commands:', recentCommands);
        
        // Save to localStorage
        saveCommandUsageCounts();
        saveRecentCommands();
    }
    
    /**
     * Get recent commands that still exist in the current command list
     * @returns {Array} Array of recent command objects
     */
    function getValidRecentCommands() {
        return recentCommands
            .map(commandName => commands.find(cmd => cmd.name === commandName))
            .filter(cmd => cmd !== undefined)
            .slice(0, MAX_RECENT_COMMANDS);
    }
    
    /**
     * Initialize the Command Palette Manager
     */
    function initialize() {
        if (isInitialized) return;
        
        // Load usage tracking data
        loadCommandUsageCounts();
        loadRecentCommands();
        
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
        
        // Create a document fragment for better performance
        const fragment = document.createDocumentFragment();
        
        // Show recent commands section if search is empty and we have recent commands
        const query = searchInput.value.toLowerCase().trim();
        const validRecentCommands = getValidRecentCommands();
        
        if (!query && validRecentCommands.length > 0) {
            // Create recent commands section
            const recentSection = document.createElement('div');
            recentSection.className = 'command-palette-recent-section';
            
            const recentHeader = document.createElement('div');
            recentHeader.className = 'command-palette-section-header';
            recentHeader.textContent = 'Recently Used';
            recentSection.appendChild(recentHeader);
            
            // Add recent commands
            validRecentCommands.forEach((command, index) => {
                const item = createCommandItem(command, index);
                recentSection.appendChild(item);
            });
            
            fragment.appendChild(recentSection);
            
            // Update selectedCommandIndex to account for recent commands
            if (selectedCommandIndex < validRecentCommands.length) {
                // Selection is in recent commands
                filteredCommands = validRecentCommands.concat(commands.filter(cmd => 
                    !validRecentCommands.some(recent => recent.name === cmd.name)
                ));
            } else {
                // Adjust selection for the all commands section
                filteredCommands = validRecentCommands.concat(commands.filter(cmd => 
                    !validRecentCommands.some(recent => recent.name === cmd.name)
                ));
            }
            
            // Add separator and all commands section
            if (commands.length > validRecentCommands.length) {
                const separator = document.createElement('div');
                separator.className = 'command-palette-separator';
                fragment.appendChild(separator);
                
                const allSection = document.createElement('div');
                allSection.className = 'command-palette-all-section';
                
                const allHeader = document.createElement('div');
                allHeader.className = 'command-palette-section-header';
                allHeader.textContent = 'All Commands';
                allSection.appendChild(allHeader);
                
                // Add remaining commands (excluding recent ones)
                const remainingCommands = commands.filter(cmd => 
                    !validRecentCommands.some(recent => recent.name === cmd.name)
                );
                
                remainingCommands.forEach((command, index) => {
                    const actualIndex = validRecentCommands.length + index;
                    const item = createCommandItem(command, actualIndex);
                    allSection.appendChild(item);
                });
                
                fragment.appendChild(allSection);
            }
        } else {
            // Regular filtered commands display
            if (filteredCommands.length === 0) {
                const noResults = document.createElement('div');
                noResults.className = 'command-palette-no-results';
                noResults.textContent = 'No matching commands found';
                fragment.appendChild(noResults);
            } else {
                // Add each command to the list
                filteredCommands.forEach((command, index) => {
                    const item = createCommandItem(command, index);
                    fragment.appendChild(item);
                });
            }
        }
        
        // Add the commands to the list
        commandsList.appendChild(fragment);
        
        // Add keyboard shortcut info
        const infoElement = document.createElement('div');
        infoElement.className = 'command-palette-info';
        infoElement.textContent = 'Use ↑↓ to navigate, Enter to execute, Escape to close';
        commandsList.appendChild(infoElement);
    }
    
    /**
     * Create a command item element
     * @param {Object} command - The command object
     * @param {number} index - The index in the filtered commands
     * @returns {HTMLElement} The command item element
     */
    function createCommandItem(command, index) {
        const item = document.createElement('div');
        item.className = 'command-palette-item';
        if (index === selectedCommandIndex) {
            item.className += ' selected';
        }
        
        const leftSide = document.createElement('div');
        leftSide.className = 'command-palette-item-left';
        
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
        
        const rightSide = document.createElement('div');
        rightSide.className = 'command-palette-item-right';
        
        // Add usage count badge
        const usageCount = commandUsageCounts[command.name] || 0;
        if (usageCount > 0) {
            const usageBadge = document.createElement('div');
            usageBadge.className = 'command-palette-usage-count';
            usageBadge.textContent = usageCount.toString();
            usageBadge.title = `Used ${usageCount} times`;
            rightSide.appendChild(usageBadge);
        }
        
        if (command.shortcut) {
            const shortcutElement = document.createElement('div');
            shortcutElement.className = 'command-palette-item-shortcut';
            shortcutElement.textContent = command.shortcut;
            rightSide.appendChild(shortcutElement);
        }
        
        item.appendChild(rightSide);
        
        // Add click handler
        item.addEventListener('click', () => {
            executeCommand(command);
        });
        
        // Add mouse over handler to update selection
        item.addEventListener('mouseover', () => {
            selectedCommandIndex = index;
            renderCommandsList();
        });
        
        return item;
    }
    
    /**
     * Execute a command and close the palette
     * @param {Object} command - The command to execute
     */
    function executeCommand(command) {
        // Track command usage before execution
        trackCommandUsage(command.name);
        
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
     * Register all commands from all modules
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
        
        // Register DCIM Manager commands
        registerDcimManagerCommands();
        
        // Register Dev Test Panel commands
        registerDevTestPanelCommands();
        
        // Register Graph Management commands
        registerGraphManagementCommands();
        
        // Register Graph Analysis commands
        registerGraphAnalysisCommands();
        
        // Register other module commands
        registerModuleCommands();
        
        // Register Code Graph commands
        registerCodeGraphCommands();
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
        
        // Set current node as default focus
        registerCommand({
            name: 'Set Current Node as Default Focus',
            action: () => {
                const focusedNode = document.querySelector('.node-text:focus');
                if (focusedNode) {
                    const nodeId = focusedNode.closest('.node').dataset.id;
                    if (nodeId && window.setDefaultFocusNode) {
                        window.setDefaultFocusNode(nodeId);
                    } else {
                        alert('Please focus on a node first');
                    }
                } else {
                    alert('Please focus on a node first');
                }
            },
            category: 'Navigation',
            keywords: ['default', 'focus', 'startup', 'performance', 'initial']
        });
        
        // Clear default focus
        registerCommand({
            name: 'Clear Default Focus',
            action: () => {
                const vault = window.VaultManager?.getCurrentVault() || 'main';
                localStorage.removeItem(`${vault}_default_focus_node`);
                alert('Default focus cleared. All nodes will load on next startup.');
            },
            category: 'Navigation',
            keywords: ['clear', 'default', 'focus', 'startup', 'reset']
        });
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
        
        // Add translation visibility commands
        registerCommand({
            name: 'Toggle All Translations Visibility',
            action: () => {
                // Find the global toggle button and click it
                const globalToggleButton = document.getElementById('global-toggle-other-lang');
                if (globalToggleButton) {
                    globalToggleButton.click();
                } else if (window.toggleAllOtherLanguageContent) {
                    // Fallback to direct function call if available
                    window.toggleAllOtherLanguageContent();
                } else {
                    alert('Translation toggle function not available');
                }
            },
            category: 'Language',
            keywords: ['translation', 'hide', 'show', 'all', 'language', 'toggle', 'visibility']
        });

        registerCommand({
            name: 'Show All Translations',
            action: () => {
                const globalToggleButton = document.getElementById('global-toggle-other-lang');
                if (globalToggleButton) {
                    // Check if translations are currently hidden
                    if (globalToggleButton.textContent.includes('Show')) {
                        globalToggleButton.click();
                    }
                } else {
                    // Fallback: ensure global state is set to visible
                    if (window.globalOtherLanguageVisible === false) {
                        const toggleButton = document.getElementById('global-toggle-other-lang');
                        if (toggleButton) toggleButton.click();
                    }
                }
            },
            category: 'Language',
            keywords: ['translation', 'show', 'display', 'all', 'language', 'visible']
        });

        registerCommand({
            name: 'Hide All Translations',
            action: () => {
                const globalToggleButton = document.getElementById('global-toggle-other-lang');
                if (globalToggleButton) {
                    // Check if translations are currently shown
                    if (globalToggleButton.textContent.includes('Hide')) {
                        globalToggleButton.click();
                    }
                } else {
                    // Fallback: ensure global state is set to hidden
                    if (window.globalOtherLanguageVisible === true) {
                        const toggleButton = document.getElementById('global-toggle-other-lang');
                        if (toggleButton) toggleButton.click();
                    }
                }
            },
            category: 'Language',
            keywords: ['translation', 'hide', 'conceal', 'all', 'language', 'invisible']
        });

        // Add content copying commands for focused node
        registerCommand({
            name: 'Copy English to Chinese (Current Node)',
            action: async () => {
                const nodeId = getCurrentFocusedNodeId();
                console.log('Copy EN→ZH command executed, nodeId:', nodeId);
                
                if (nodeId) {
                    if (window.copyContentBetweenLanguages) {
                        try {
                            const success = await window.copyContentBetweenLanguages(nodeId, 'en-to-zh');
                            if (!success) {
                                console.error('Copy operation returned false');
                            }
                        } catch (error) {
                            console.error('Error during copy operation:', error);
                            alert(`Failed to copy content: ${error.message}`);
                        }
                    } else {
                        console.error('copyContentBetweenLanguages function not available on window object');
                        alert('Copy function not available. Please ensure the app is fully loaded.');
                    }
                } else {
                    alert('No node is currently focused. Please click on a node first.');
                }
            },
            category: 'Language',
            keywords: ['copy', 'english', 'chinese', 'content', 'translate', 'current', 'node', 'en', 'zh']
        });

        registerCommand({
            name: 'Copy Chinese to English (Current Node)',
            action: async () => {
                const nodeId = getCurrentFocusedNodeId();
                console.log('Copy ZH→EN command executed, nodeId:', nodeId);
                
                if (nodeId) {
                    if (window.copyContentBetweenLanguages) {
                        try {
                            const success = await window.copyContentBetweenLanguages(nodeId, 'zh-to-en');
                            if (!success) {
                                console.error('Copy operation returned false');
                            }
                        } catch (error) {
                            console.error('Error during copy operation:', error);
                            alert(`Failed to copy content: ${error.message}`);
                        }
                    } else {
                        console.error('copyContentBetweenLanguages function not available on window object');
                        alert('Copy function not available. Please ensure the app is fully loaded.');
                    }
                } else {
                    alert('No node is currently focused. Please click on a node first.');
                }
            },
            category: 'Language',
            keywords: ['copy', 'chinese', 'english', 'content', 'translate', 'current', 'node', 'zh', 'en']
        });

        // Add node size adjustment command
        registerCommand({
            name: 'Adjust Node Size (Current Node)',
            action: () => {
                const nodeId = getCurrentFocusedNodeId();
                if (nodeId && window.NodeSizeManager) {
                    window.NodeSizeManager.openNodeSizeModal(nodeId);
                } else if (!nodeId) {
                    alert('No node is currently focused. Please click on a node first.');
                } else {
                    alert('Node Size Manager not available');
                }
            },
            category: 'Nodes',
            keywords: ['size', 'adjust', 'resize', 'node', 'current', 'scale', 'dimension']
        });

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
        
        // Add Task Statistics commands if TaskStatisticsManager exists
        if (window.TaskStatisticsManager) {
            registerCommand({
                name: 'Open Task Statistics & Analysis',
                action: () => {
                    if (window.TaskStatisticsManager.open) {
                        window.TaskStatisticsManager.open();
                    }
                },
                category: 'Tasks',
                shortcut: 'Alt+T',
                keywords: ['task', 'statistics', 'analysis', 'stats', 'time', 'tracking', 'productivity']
            });
            
            registerCommand({
                name: 'Task Statistics - Overview',
                action: () => {
                    if (window.TaskStatisticsManager.open) {
                        window.TaskStatisticsManager.open();
                        // Switch to overview tab after modal opens
                        setTimeout(() => {
                            const overviewTab = document.querySelector('.tab-button[data-tab="overview"]');
                            if (overviewTab) {
                                overviewTab.click();
                            }
                        }, 300);
                    }
                },
                category: 'Tasks',
                keywords: ['task', 'overview', 'summary', 'statistics']
            });
            
            registerCommand({
                name: 'Task Statistics - Task Groups',
                action: () => {
                    if (window.TaskStatisticsManager.open) {
                        window.TaskStatisticsManager.open();
                        // Switch to task groups tab after modal opens
                        setTimeout(() => {
                            const taskGroupsTab = document.querySelector('.tab-button[data-tab="task-groups"]');
                            if (taskGroupsTab) {
                                taskGroupsTab.click();
                            }
                        }, 300);
                    }
                },
                category: 'Tasks',
                keywords: ['task', 'groups', 'categories', 'analysis']
            });
            
            registerCommand({
                name: 'Task Statistics - Categories',
                action: () => {
                    if (window.TaskStatisticsManager.open) {
                        window.TaskStatisticsManager.open();
                        // Switch to categories tab after modal opens
                        setTimeout(() => {
                            const categoriesTab = document.querySelector('.tab-button[data-tab="categories"]');
                            if (categoriesTab) {
                                categoriesTab.click();
                            }
                        }, 300);
                    }
                },
                category: 'Tasks',
                keywords: ['task', 'categories', 'chart', 'visualization']
            });
            
            registerCommand({
                name: 'Task Statistics - Daily Trends',
                action: () => {
                    if (window.TaskStatisticsManager.open) {
                        window.TaskStatisticsManager.open();
                        // Switch to daily tab after modal opens
                        setTimeout(() => {
                            const dailyTab = document.querySelector('.tab-button[data-tab="daily"]');
                            if (dailyTab) {
                                dailyTab.click();
                            }
                        }, 300);
                    }
                },
                category: 'Tasks',
                keywords: ['task', 'daily', 'trends', 'timeline', 'progress']
            });
            
            registerCommand({
                name: 'Manage Task Categories',
                action: () => {
                    if (window.TaskStatisticsManager.open) {
                        window.TaskStatisticsManager.open();
                        // Switch to manage tab after modal opens
                        setTimeout(() => {
                            const manageTab = document.querySelector('.tab-button[data-tab="manage"]');
                            if (manageTab) {
                                manageTab.click();
                            }
                        }, 300);
                    }
                },
                category: 'Tasks',
                keywords: ['task', 'categories', 'manage', 'create', 'edit']
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
        
        // Add Metro Map Visualizer commands if it exists
        if (window.MetroMapVisualizer) {
            registerCommand({
                name: 'Open Metro Map View',
                action: () => {
                    const nodeId = getCurrentNodeId();
                    if (nodeId) {
                        openMetroMapView(nodeId);
                    } else {
                        alert('Please select or focus on a node first');
                    }
                },
                category: 'Visualization',
                keywords: ['metro', 'subway', 'map', 'visualize', 'transit', 'diagram']
            });
            
            registerCommand({
                name: 'Open Metro Map View for Current Node',
                action: () => {
                    const focusedNode = document.querySelector('.node-text:focus');
                    if (focusedNode) {
                        const nodeId = focusedNode.closest('.node').dataset.id;
                        if (nodeId) {
                            openMetroMapView(nodeId);
                        }
                    } else {
                        alert('Please focus on a node first');
                    }
                },
                category: 'Visualization',
                keywords: ['metro', 'subway', 'map', 'current', 'focus', 'visualize']
            });
            
            registerCommand({
                name: 'Toggle Metro Map View',
                action: () => {
                    if (window.MetroMapVisualizer.isVisible()) {
                        window.MetroMapVisualizer.hide();
                    } else {
                        const nodeId = getCurrentNodeId();
                        if (nodeId) {
                            openMetroMapView(nodeId);
                        } else {
                            alert('Please select or focus on a node first');
                        }
                    }
                },
                category: 'Visualization',
                shortcut: 'Alt+M',
                keywords: ['metro', 'subway', 'map', 'toggle', 'visualize', 'hide', 'show']
            });
            
            // Helper function to open the metro map view
            function openMetroMapView(nodeId) {
                console.log('Opening Metro Map View for node:', nodeId);
                window.MetroMapVisualizer.show(nodeId);
            }
        }

        // Add Word Frequency commands if WordFrequencyManager exists
        if (window.WordFrequencyManager) {
            registerCommand({
                name: 'Open Word Frequency Analysis',
                action: () => {
                    if (window.WordFrequencyManager.openModal) {
                        window.WordFrequencyManager.openModal();
                    }
                },
                category: 'Analysis',
                shortcut: 'Alt+W',
                keywords: ['word', 'frequency', 'analysis', 'statistics', 'text', 'count', 'stem']
            });
            
            registerCommand({
                name: 'Word Frequency - Chart View',
                action: () => {
                    if (window.WordFrequencyManager.openModal) {
                        window.WordFrequencyManager.openModal();
                        
                        // Switch to chart expanded view after modal opens
                        setTimeout(() => {
                            const expandChartButton = document.getElementById('expand-chart');
                            if (expandChartButton) {
                                expandChartButton.click();
                            }
                        }, 500);
                    }
                },
                category: 'Analysis',
                keywords: ['word', 'frequency', 'chart', 'graph', 'visualization', 'bar']
            });
            
            registerCommand({
                name: 'Word Frequency - Table View',
                action: () => {
                    if (window.WordFrequencyManager.openModal) {
                        window.WordFrequencyManager.openModal();
                        
                        // Switch to table expanded view after modal opens
                        setTimeout(() => {
                            const expandTableButton = document.getElementById('expand-table');
                            if (expandTableButton) {
                                expandTableButton.click();
                            }
                        }, 500);
                    }
                },
                category: 'Analysis',
                keywords: ['word', 'frequency', 'table', 'list', 'data', 'detailed']
            });
            
            registerCommand({
                name: 'Refresh Word Frequency Analysis',
                action: () => {
                    if (window.WordFrequencyManager.openModal) {
                        window.WordFrequencyManager.openModal();
                        
                        // Click refresh button after modal opens
                        setTimeout(() => {
                            const refreshButton = document.getElementById('refresh-word-freq');
                            if (refreshButton) {
                                refreshButton.click();
                            }
                        }, 500);
                    }
                },
                category: 'Analysis',
                keywords: ['word', 'frequency', 'refresh', 'reload', 'update', 'analysis']
            });
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
                
                // FIX: Check if plugin.name exists and provide fallback
                const pluginName = plugin.name || id;
                
                registerCommand({
                    name: `${plugin.enabled ? 'Disable' : 'Enable'} ${pluginName}`,
                    action: () => {
                        window.PluginManager.togglePlugin(id);
                    },
                    category: 'Plugins',
                    keywords: [pluginName.toLowerCase(), 'enable', 'disable', 'toggle', 'plugin']
                });
            }
        }
    }
    
    /**
     * Register DCIM (Image) Manager commands
     */
    function registerDcimManagerCommands() {
        // Check if DcimManager exists
        if (window.DcimManager) {
            registerCommand({
                name: 'Open Image Manager',
                action: () => {
                    if (window.DcimManager.openManager) {
                        window.DcimManager.openManager();
                    }
                },
                category: 'Images',
                shortcut: 'Alt+M',
                keywords: ['image', 'photo', 'picture', 'dcim', 'manager', 'gallery']
            });
            
            // For the following commands, we need to ensure modal exists first
            registerCommand({
                name: 'Add New Image',
                action: () => {
                    // Ensure modal is open before interacting with it
                    if (window.DcimManager.openManager) {
                        window.DcimManager.openManager();
                        
                        // Use a longer delay to ensure modal is fully rendered
                        setTimeout(() => {
                            // Find and click the button directly
                            const addButton = document.getElementById('add-image');
                            if (addButton) {
                                addButton.click();
                            }
                        }, 500);
                    }
                },
                category: 'Images',
                keywords: ['add', 'upload', 'new', 'image', 'photo']
            });
            
            registerCommand({
                name: 'Image Settings',
                action: () => {
                    // Ensure modal is open before interacting with it
                    if (window.DcimManager.openManager) {
                        window.DcimManager.openManager();
                        
                        // Use a longer delay to ensure modal is fully rendered
                        setTimeout(() => {
                            // Find and click the button directly
                            const settingsButton = document.getElementById('show-settings');
                            if (settingsButton) {
                                settingsButton.click();
                            }
                        }, 500);
                    }
                },
                category: 'Images',
                keywords: ['settings', 'configuration', 'image', 'directory', 'storage']
            });
            
            registerCommand({
                name: 'WebP Image Converter',
                action: () => {
                    // Ensure modal is open before interacting with it
                    if (window.DcimManager.openManager) {
                        window.DcimManager.openManager();
                        
                        // Use a longer delay to ensure modal is fully rendered
                        setTimeout(() => {
                            // Find and click the button directly
                            const webpButton = document.getElementById('show-webp-converter');
                            if (webpButton) {
                                webpButton.click();
                            }
                        }, 500);
                    }
                },
                category: 'Images',
                keywords: ['webp', 'convert', 'optimize', 'compress', 'image']
            });
            
            registerCommand({
                name: 'Manage Custom Ranking Filters',
                action: () => {
                    // Ensure modal is open before interacting with it
                    if (window.DcimManager.openManager) {
                        window.DcimManager.openManager();
                        
                        // Use a longer delay to ensure modal is fully rendered
                        setTimeout(() => {
                            // Find and click the button directly
                            const customizeButton = document.getElementById('customize-ranking-filter');
                            if (customizeButton) {
                                customizeButton.click();
                            } else {
                                // Fallback: try to find via querySelector if ID approach fails
                                const filterButton = document.querySelector('.customize-icon')?.closest('button');
                                if (filterButton) {
                                    filterButton.click();
                                }
                            }
                        }, 500);
                    }
                },
                category: 'Images',
                keywords: ['ranking', 'filter', 'custom', 'range', 'image']
            });
        }
    }
    
    /**
     * Register Dev Test Panel Manager commands
     */
    function registerDevTestPanelCommands() {
        // Check if DevTestPanelManager exists
        if (window.DevTestPanelManager) {
            registerCommand({
                name: 'Open Dev Test Panel',
                action: () => {
                    window.DevTestPanelManager.openModal();
                },
                category: 'Development',
                shortcut: 'Alt+D',
                keywords: ['dev', 'test', 'panel', 'development', 'debug', 'statistics', 'code']
            });
            
            registerCommand({
                name: 'View Code Statistics',
                action: () => {
                    window.DevTestPanelManager.openModal();
                    
                    // Switch to statistics tab after modal opens
                    setTimeout(() => {
                        const statsTab = document.querySelector('.tab[data-tab="stats"]');
                        if (statsTab) {
                            statsTab.click();
                        }
                    }, 300);
                },
                category: 'Development',
                keywords: ['code', 'statistics', 'stats', 'analysis', 'metrics', 'functions', 'variables']
            });
            
            registerCommand({
                name: 'Refresh Code Statistics',
                action: () => {
                    if (window.DevTestPanelManager.loadStatistics) {
                        window.DevTestPanelManager.loadStatistics();
                    } else {
                        // Fallback: open modal and refresh
                        window.DevTestPanelManager.openModal();
                        setTimeout(() => {
                            const statsTab = document.querySelector('.tab[data-tab="stats"]');
                            if (statsTab) {
                                statsTab.click();
                                setTimeout(() => {
                                    const refreshButton = document.getElementById('refresh-statistics');
                                    if (refreshButton) {
                                        refreshButton.click();
                                    }
                                }, 100);
                            }
                        }, 300);
                    }
                },
                category: 'Development',
                keywords: ['refresh', 'reload', 'code', 'statistics', 'update', 'analysis']
            });
            
            registerCommand({
                name: 'View Test Entries',
                action: () => {
                    window.DevTestPanelManager.openModal();
                    
                    // Switch to entries tab after modal opens
                    setTimeout(() => {
                        const entriesTab = document.querySelector('.tab[data-tab="entries"]');
                        if (entriesTab) {
                            entriesTab.click();
                        }
                    }, 300);
                },
                category: 'Development',
                keywords: ['test', 'entries', 'functions', 'api', 'variables', 'testing']
            });
            
            registerCommand({
                name: 'Add New Test Entry',
                action: () => {
                    window.DevTestPanelManager.openModal();
                    
                    // Switch to add entry tab after modal opens
                    setTimeout(() => {
                        const addEntryTab = document.querySelector('.tab[data-tab="add-entry"]');
                        if (addEntryTab) {
                            addEntryTab.click();
                        }
                    }, 300);
                },
                category: 'Development',
                keywords: ['add', 'new', 'test', 'entry', 'function', 'api', 'variable', 'create']
            });
            
            registerCommand({
                name: 'Refresh Test Entries',
                action: () => {
                    if (window.DevTestPanelManager.loadEntries) {
                        window.DevTestPanelManager.loadEntries();
                    } else {
                        // Fallback: open modal and refresh
                        window.DevTestPanelManager.openModal();
                        setTimeout(() => {
                            const entriesTab = document.querySelector('.tab[data-tab="entries"]');
                            if (entriesTab) {
                                entriesTab.click();
                                setTimeout(() => {
                                    const refreshButton = document.getElementById('refresh-entries');
                                    if (refreshButton) {
                                        refreshButton.click();
                                    }
                                }, 100);
                            }
                        }, 300);
                    }
                },
                category: 'Development',
                keywords: ['refresh', 'reload', 'test', 'entries', 'update']
            });
        }
    }
    
    /**
     * Register Graph Management UI commands
     */
    function registerGraphManagementCommands() {
        // Check if GraphManagementUI exists
        if (window.GraphManagementUI) {
            registerCommand({
                name: 'Open Graph Management',
                action: () => {
                    window.GraphManagementUI.show();
                },
                category: 'Graph',
                shortcut: 'Alt+G',
                keywords: ['graph', 'management', 'vertices', 'edges', 'data', 'network']
            });
            
            registerCommand({
                name: 'Graph Management - Vertices Tab',
                action: () => {
                    window.GraphManagementUI.show();
                    
                    // Switch to vertices tab after modal opens
                    setTimeout(() => {
                        const verticesTab = document.querySelector('.tab-btn[data-tab="vertices"]');
                        if (verticesTab) {
                            verticesTab.click();
                        }
                    }, 300);
                },
                category: 'Graph',
                keywords: ['graph', 'vertices', 'nodes', 'management', 'create', 'edit']
            });
            
            registerCommand({
                name: 'Graph Management - Edges Tab',
                action: () => {
                    window.GraphManagementUI.show();
                    
                    // Switch to edges tab after modal opens
                    setTimeout(() => {
                        const edgesTab = document.querySelector('.tab-btn[data-tab="edges"]');
                        if (edgesTab) {
                            edgesTab.click();
                        }
                    }, 300);
                },
                category: 'Graph',
                keywords: ['graph', 'edges', 'relationships', 'connections', 'management', 'create']
            });
            
            registerCommand({
                name: 'Graph Management - Import Tab',
                action: () => {
                    window.GraphManagementUI.show();
                    
                    // Switch to import tab after modal opens
                    setTimeout(() => {
                        const importTab = document.querySelector('.tab-btn[data-tab="import"]');
                        if (importTab) {
                            importTab.click();
                        }
                    }, 300);
                },
                category: 'Graph',
                keywords: ['graph', 'import', 'nodes', 'outliner', 'convert', 'vertices']
            });
            
            registerCommand({
                name: 'Add New Graph Vertex',
                action: () => {
                    window.GraphManagementUI.show();
                    
                    // Open add vertex modal after management UI opens
                    setTimeout(() => {
                        const addVertexBtn = document.getElementById('add-vertex-btn');
                        if (addVertexBtn) {
                            addVertexBtn.click();
                        }
                    }, 500);
                },
                category: 'Graph',
                keywords: ['graph', 'vertex', 'node', 'add', 'create', 'new']
            });
            
            registerCommand({
                name: 'Add New Graph Edge',
                action: () => {
                    window.GraphManagementUI.show();
                    
                    // Switch to edges tab and open add edge modal
                    setTimeout(() => {
                        const edgesTab = document.querySelector('.tab-btn[data-tab="edges"]');
                        if (edgesTab) {
                            edgesTab.click();
                            
                            setTimeout(() => {
                                const addEdgeBtn = document.getElementById('add-edge-btn');
                                if (addEdgeBtn) {
                                    addEdgeBtn.click();
                                }
                            }, 200);
                        }
                    }, 300);
                },
                category: 'Graph',
                keywords: ['graph', 'edge', 'relationship', 'connection', 'add', 'create', 'new']
            });
            
            registerCommand({
                name: 'Refresh Graph Data',
                action: () => {
                    window.GraphManagementUI.show();
                    
                    // Refresh both vertices and edges
                    setTimeout(() => {
                        const refreshVerticesBtn = document.getElementById('refresh-vertices-btn');
                        const refreshEdgesBtn = document.getElementById('refresh-edges-btn');
                        
                        if (refreshVerticesBtn) {
                            refreshVerticesBtn.click();
                        }
                        
                        setTimeout(() => {
                            if (refreshEdgesBtn) {
                                refreshEdgesBtn.click();
                            }
                        }, 100);
                    }, 500);
                },
                category: 'Graph',
                keywords: ['graph', 'refresh', 'reload', 'update', 'data', 'vertices', 'edges']
            });
            
            registerCommand({
                name: 'Import Nodes to Graph',
                action: () => {
                    window.GraphManagementUI.show();
                    
                    // Switch to import tab and load nodes
                    setTimeout(() => {
                        const importTab = document.querySelector('.tab-btn[data-tab="import"]');
                        if (importTab) {
                            importTab.click();
                            
                            setTimeout(() => {
                                const loadNodesBtn = document.getElementById('load-nodes-btn');
                                if (loadNodesBtn) {
                                    loadNodesBtn.click();
                                }
                            }, 200);
                        }
                    }, 300);
                },
                category: 'Graph',
                keywords: ['graph', 'import', 'nodes', 'outliner', 'load', 'convert']
            });
        }
    }
    
    /**
     * Register Graph Analysis Visualizer commands
     */
    function registerGraphAnalysisCommands() {
        // Check if GraphAnalysisVisualizer exists
        if (window.GraphAnalysisVisualizer) {
            registerCommand({
                name: 'Open Graph Analysis Visualizer',
                action: () => {
                    window.GraphAnalysisVisualizer.show();
                },
                category: 'Graph Analysis',
                shortcut: 'Alt+V',
                keywords: ['graph', 'analysis', 'visualizer', 'network', 'cytoscape', 'visualization']
            });
            
            registerCommand({
                name: 'Toggle Graph Analysis Visualizer',
                action: () => {
                    if (window.GraphAnalysisVisualizer.isVisible()) {
                        window.GraphAnalysisVisualizer.hide();
                    } else {
                        window.GraphAnalysisVisualizer.show();
                    }
                },
                category: 'Graph Analysis',
                keywords: ['graph', 'analysis', 'toggle', 'visualizer', 'show', 'hide']
            });
            
            registerCommand({
                name: 'Apply Force-Directed Layout',
                action: () => {
                    window.GraphAnalysisVisualizer.show();
                    
                    // Apply cose layout after visualizer opens
                    setTimeout(() => {
                        const layoutSelector = document.getElementById('graph-layout-selector');
                        const applyLayoutBtn = document.getElementById('apply-graph-layout');
                        
                        if (layoutSelector && applyLayoutBtn) {
                            layoutSelector.value = 'cose';
                            applyLayoutBtn.click();
                        }
                    }, 500);
                },
                category: 'Graph Analysis',
                keywords: ['graph', 'layout', 'force', 'directed', 'cose', 'physics', 'spring']
            });
            
            registerCommand({
                name: 'Apply Circle Layout',
                action: () => {
                    window.GraphAnalysisVisualizer.show();
                    
                    // Apply circle layout after visualizer opens
                    setTimeout(() => {
                        const layoutSelector = document.getElementById('graph-layout-selector');
                        const applyLayoutBtn = document.getElementById('apply-graph-layout');
                        
                        if (layoutSelector && applyLayoutBtn) {
                            layoutSelector.value = 'circle';
                            applyLayoutBtn.click();
                        }
                    }, 500);
                },
                category: 'Graph Analysis',
                keywords: ['graph', 'layout', 'circle', 'circular', 'arrangement']
            });
            
            registerCommand({
                name: 'Apply Hierarchical Layout',
                action: () => {
                    window.GraphAnalysisVisualizer.show();
                    
                    // Apply breadthfirst layout after visualizer opens
                    setTimeout(() => {
                        const layoutSelector = document.getElementById('graph-layout-selector');
                        const applyLayoutBtn = document.getElementById('apply-graph-layout');
                        
                        if (layoutSelector && applyLayoutBtn) {
                            layoutSelector.value = 'breadthfirst';
                            applyLayoutBtn.click();
                        }
                    }, 500);
                },
                category: 'Graph Analysis',
                keywords: ['graph', 'layout', 'hierarchical', 'tree', 'breadth', 'first']
            });
            
            registerCommand({
                name: 'Calculate PageRank Centrality',
                action: () => {
                    window.GraphAnalysisVisualizer.show();
                    
                    // Run PageRank analysis after visualizer opens
                    setTimeout(() => {
                        const centralitySelector = document.getElementById('centrality-algorithm');
                        const runCentralityBtn = document.getElementById('run-centrality');
                        
                        if (centralitySelector && runCentralityBtn) {
                            centralitySelector.value = 'pagerank';
                            runCentralityBtn.click();
                        }
                    }, 500);
                },
                category: 'Graph Analysis',
                keywords: ['graph', 'pagerank', 'centrality', 'analysis', 'importance', 'ranking']
            });
            
            registerCommand({
                name: 'Calculate Betweenness Centrality',
                action: () => {
                    window.GraphAnalysisVisualizer.show();
                    
                    // Run Betweenness analysis after visualizer opens
                    setTimeout(() => {
                        const centralitySelector = document.getElementById('centrality-algorithm');
                        const runCentralityBtn = document.getElementById('run-centrality');
                        
                        if (centralitySelector && runCentralityBtn) {
                            centralitySelector.value = 'betweenness';
                            runCentralityBtn.click();
                        }
                    }, 500);
                },
                category: 'Graph Analysis',
                keywords: ['graph', 'betweenness', 'centrality', 'analysis', 'bridge', 'connector']
            });
            
            registerCommand({
                name: 'Calculate Closeness Centrality',
                action: () => {
                    window.GraphAnalysisVisualizer.show();
                    
                    // Run Closeness analysis after visualizer opens
                    setTimeout(() => {
                        const centralitySelector = document.getElementById('centrality-algorithm');
                        const runCentralityBtn = document.getElementById('run-centrality');
                        
                        if (centralitySelector && runCentralityBtn) {
                            centralitySelector.value = 'closeness';
                            runCentralityBtn.click();
                        }
                    }, 500);
                },
                category: 'Graph Analysis',
                keywords: ['graph', 'closeness', 'centrality', 'analysis', 'proximity', 'distance']
            });
            
            registerCommand({
                name: 'Detect Communities (Louvain)',
                action: () => {
                    window.GraphAnalysisVisualizer.show();
                    
                    // Run community detection after visualizer opens
                    setTimeout(() => {
                        const communitySelector = document.getElementById('community-algorithm');
                        const detectCommunitiesBtn = document.getElementById('detect-communities');
                        
                        if (communitySelector && detectCommunitiesBtn) {
                            communitySelector.value = 'louvain';
                            detectCommunitiesBtn.click();
                        }
                    }, 500);
                },
                category: 'Graph Analysis',
                keywords: ['graph', 'community', 'detection', 'louvain', 'clustering', 'groups']
            });
            
            registerCommand({
                name: 'View Graph Statistics',
                action: () => {
                    window.GraphAnalysisVisualizer.show();
                    
                    // Focus on the statistics section
                    setTimeout(() => {
                        const statsSection = document.getElementById('graph-stats');
                        if (statsSection) {
                            statsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }, 500);
                },
                category: 'Graph Analysis',
                keywords: ['graph', 'statistics', 'stats', 'metrics', 'density', 'vertices', 'edges']
            });
        }
    }
    
    /**
     * Helper function to check if a plugin is enabled
     * @param {string} pluginId - The plugin ID to check
     * @returns {boolean} Whether the plugin is enabled
     */
    function isPluginEnabled(pluginId) {
        return window.PluginManager && window.PluginManager.isPluginEnabled && window.PluginManager.isPluginEnabled(pluginId);
    }
    
    /**
     * Register Code Graph commands (with plugin checks)
     */
    function registerCodeGraphCommands() {
        // Check if Legacy CodeGraphManager exists AND plugin is enabled
        if (window.CodeGraphManager && isPluginEnabled('codeGraphManager')) {
            registerCommand({
                name: 'Open Code Graph Manager',
                action: () => {
                    if (isPluginEnabled('codeGraphManager')) {
                    window.CodeGraphManager.show();
                    } else {
                        alert('Code Graph (Legacy) plugin is disabled. Please enable it in Settings > Plugins.');
                    }
                },
                category: 'Code Analysis',
                shortcut: 'Alt+C',
                keywords: ['code', 'graph', 'entities', 'functions', 'classes', 'relationships', 'analysis']
            });
            
            // Register all other legacy code graph commands with the same plugin check
            registerCommand({
                name: 'Toggle Code Graph Manager',
                action: () => {
                    if (!isPluginEnabled('codeGraphManager')) {
                        alert('Code Graph (Legacy) plugin is disabled. Please enable it in Settings > Plugins.');
                        return;
                    }
                    if (window.CodeGraphManager.isVisible()) {
                        window.CodeGraphManager.hide();
                    } else {
                        window.CodeGraphManager.show();
                    }
                },
                category: 'Code Analysis',
                keywords: ['code', 'graph', 'toggle', 'show', 'hide']
            });
            
            // ... (add plugin checks to all other legacy commands)
            
        } else if (window.CodeGraphManager && !isPluginEnabled('codeGraphManager')) {
            // Don't register any commands if plugin is disabled
            console.log('Code Graph (Legacy) commands not registered - plugin is disabled');
        }
        
        // Check if New CodeGraphManager exists AND plugin is enabled
        if (window.NewCodeGraphManager && isPluginEnabled('newCodeGraphManager')) {
            registerCommand({
                name: 'Open New Code Graph (Simple)',
                action: () => {
                    if (isPluginEnabled('newCodeGraphManager')) {
                    window.NewCodeGraphManager.show();
                    } else {
                        alert('New Code Graph plugin is disabled. Please enable it in Settings > Plugins.');
                    }
                },
                category: 'Code Analysis',
                shortcut: 'Alt+N',
                keywords: ['new', 'code', 'graph', 'simple', 'clean', 'analysis']
            });
            
            registerCommand({
                name: 'New Code Graph - Analyze DCIM Example',
                action: () => {
                    if (!isPluginEnabled('newCodeGraphManager')) {
                        alert('New Code Graph plugin is disabled. Please enable it in Settings > Plugins.');
                        return;
                    }
                    window.NewCodeGraphManager.show();
                    setTimeout(() => {
                        window.NewCodeGraphManager.analyzeDcimExample();
                    }, 300);
                },
                category: 'Code Analysis',
                keywords: ['new', 'code', 'dcim', 'example', 'analyze', 'simple']
            });
            
            registerCommand({
                name: 'New Code Graph - Initialize Database',
                action: () => {
                    if (!isPluginEnabled('newCodeGraphManager')) {
                        alert('New Code Graph plugin is disabled. Please enable it in Settings > Plugins.');
                        return;
                    }
                    window.NewCodeGraphManager.show();
                    setTimeout(() => {
                        window.NewCodeGraphManager.initializeDatabase();
                    }, 300);
                },
                category: 'Code Analysis',
                keywords: ['new', 'code', 'database', 'initialize', 'setup']
            });
        } else if (window.NewCodeGraphManager && !isPluginEnabled('newCodeGraphManager')) {
            // Don't register any commands if plugin is disabled
            console.log('New Code Graph commands not registered - plugin is disabled');
        }

        // Check if Enhanced CodeGraphManager exists AND plugin is enabled
        if (window.EnhancedCodeGraphManager && isPluginEnabled('enhancedCodeGraphManager')) {
            registerCommand({
                name: 'Open Enhanced Code Graph (Full CRUD)',
                action: () => {
                    if (isPluginEnabled('enhancedCodeGraphManager')) {
                        window.EnhancedCodeGraphManager.show();
                    } else {
                        alert('Enhanced Code Graph plugin is disabled. Please enable it in Settings > Plugins.');
                    }
                },
                category: 'Code Analysis',
                shortcut: 'Alt+E',
                keywords: ['enhanced', 'code', 'graph', 'crud', 'projects', 'advanced', 'analysis']
            });
            
            registerCommand({
                name: 'Enhanced Code Graph - Project Overview',
                action: () => {
                    if (!isPluginEnabled('enhancedCodeGraphManager')) {
                        alert('Enhanced Code Graph plugin is disabled. Please enable it in Settings > Plugins.');
                        return;
                    }
                    window.EnhancedCodeGraphManager.show();
                    setTimeout(() => {
                        window.EnhancedCodeGraphManager.switchView('projects');
                    }, 300);
                },
                category: 'Code Analysis',
                keywords: ['enhanced', 'code', 'project', 'overview', 'statistics', 'dashboard']
            });
            
            registerCommand({
                name: 'Enhanced Code Graph - Create New Project',
                action: () => {
                    if (!isPluginEnabled('enhancedCodeGraphManager')) {
                        alert('Enhanced Code Graph plugin is disabled. Please enable it in Settings > Plugins.');
                        return;
                    }
                    window.EnhancedCodeGraphManager.show();
                    setTimeout(() => {
                        window.EnhancedCodeGraphManager.showCreateProjectModal();
                    }, 300);
                },
                category: 'Code Analysis',
                keywords: ['enhanced', 'code', 'create', 'new', 'project', 'add']
            });
            
            registerCommand({
                name: 'Enhanced Code Graph - Create DCIM Example',
                action: () => {
                    if (!isPluginEnabled('enhancedCodeGraphManager')) {
                        alert('Enhanced Code Graph plugin is disabled. Please enable it in Settings > Plugins.');
                        return;
                    }
                    window.EnhancedCodeGraphManager.show();
                    setTimeout(() => {
                        window.EnhancedCodeGraphManager.showTemplateModal();
                    }, 300);
                },
                category: 'Code Analysis',
                keywords: ['enhanced', 'code', 'dcim', 'example', 'template', 'create']
            });
            
            registerCommand({
                name: 'Enhanced Code Graph - Functions Management',
                action: () => {
                    if (!isPluginEnabled('enhancedCodeGraphManager')) {
                        alert('Enhanced Code Graph plugin is disabled. Please enable it in Settings > Plugins.');
                        return;
                    }
                    window.EnhancedCodeGraphManager.show();
                    setTimeout(() => {
                        window.EnhancedCodeGraphManager.switchView('functions');
                    }, 300);
                },
                category: 'Code Analysis',
                keywords: ['enhanced', 'code', 'functions', 'management', 'crud', 'edit']
            });
            
            registerCommand({
                name: 'Enhanced Code Graph - Variables Management',
                action: () => {
                    if (!isPluginEnabled('enhancedCodeGraphManager')) {
                        alert('Enhanced Code Graph plugin is disabled. Please enable it in Settings > Plugins.');
                        return;
                    }
                    window.EnhancedCodeGraphManager.show();
                    setTimeout(() => {
                        window.EnhancedCodeGraphManager.switchView('variables');
                    }, 300);
                },
                category: 'Code Analysis',
                keywords: ['enhanced', 'code', 'variables', 'management', 'crud', 'edit']
            });
            
            registerCommand({
                name: 'Enhanced Code Graph - Dependencies Management',
                action: () => {
                    if (!isPluginEnabled('enhancedCodeGraphManager')) {
                        alert('Enhanced Code Graph plugin is disabled. Please enable it in Settings > Plugins.');
                        return;
                    }
                    window.EnhancedCodeGraphManager.show();
                    setTimeout(() => {
                        window.EnhancedCodeGraphManager.switchView('dependencies');
                    }, 300);
                },
                category: 'Code Analysis',
                keywords: ['enhanced', 'code', 'dependencies', 'relationships', 'management', 'crud']
            });
            
            registerCommand({
                name: 'Enhanced Code Graph - View Graph Visualization',
                action: () => {
                    if (!isPluginEnabled('enhancedCodeGraphManager')) {
                        alert('Enhanced Code Graph plugin is disabled. Please enable it in Settings > Plugins.');
                        return;
                    }
                    window.EnhancedCodeGraphManager.show();
                    setTimeout(() => {
                        window.EnhancedCodeGraphManager.switchView('graph');
                    }, 300);
                },
                category: 'Code Analysis',
                keywords: ['enhanced', 'code', 'graph', 'visualization', 'view', 'd3', 'interactive']
            });
            
            registerCommand({
                name: 'Enhanced Code Graph - Initialize Database',
                action: () => {
                    if (!isPluginEnabled('enhancedCodeGraphManager')) {
                        alert('Enhanced Code Graph plugin is disabled. Please enable it in Settings > Plugins.');
                        return;
                    }
                    if (window.EnhancedCodeGraphManager.initializeDatabase) {
                        window.EnhancedCodeGraphManager.initializeDatabase();
                    } else {
                        alert('Initialize database function not available');
                    }
                },
                category: 'Code Analysis',
                keywords: ['enhanced', 'code', 'database', 'initialize', 'setup', 'tables']
            });
            
        } else if (window.EnhancedCodeGraphManager && !isPluginEnabled('enhancedCodeGraphManager')) {
            // Don't register any commands if plugin is disabled
            console.log('Enhanced Code Graph commands not registered - plugin is disabled');
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
    
    /**
     * Helper function to get the currently focused node ID
     * Uses multiple fallback methods to determine the "current" node
     */
    function getCurrentFocusedNodeId() {
        // Method 1: Try to get from DOM focus (works when not in command palette)
        const focusedNode = document.querySelector('.node-text:focus');
        if (focusedNode) {
            const nodeId = focusedNode.closest('.node').dataset.id;
            if (nodeId) return nodeId;
        }
        
        // Method 2: Try to get from BreadcrumbManager if available
        if (window.BreadcrumbManager && window.BreadcrumbManager.getCurrentFocusedNodeId) {
            const focusedNodeId = window.BreadcrumbManager.getCurrentFocusedNodeId();
            if (focusedNodeId) return focusedNodeId;
        }
        
        // Method 3: Use lastFocusedNodeId from app.js
        if (window.lastFocusedNodeId) {
            return window.lastFocusedNodeId;
        }
        
        // Method 4: Try to get from global app state if available
        if (window.currentModalNodeId) {
            return window.currentModalNodeId;
        }
        
        // Method 5: As a last resort, get the first visible node
        const firstVisibleNode = document.querySelector('.node');
        if (firstVisibleNode) {
            return firstVisibleNode.dataset.id;
        }
        
        return null;
    }
    
    // Public API
    return {
        initialize,
        registerCommand,
        registerCommands,
        openCommandPalette,
        closeCommandPalette,
        updateLanguage,
        // Expose for testing and debugging
        _getCommands: () => commands,
        _getUsageCounts: () => commandUsageCounts,
        _getRecentCommands: () => recentCommands,
        _resetUsageData: () => {
            commandUsageCounts = {};
            recentCommands = [];
            saveCommandUsageCounts();
            saveRecentCommands();
        }
    };
})();

// Export the module for use in other files
window.CommandPaletteManager = CommandPaletteManager;