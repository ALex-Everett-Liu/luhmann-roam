/**
 * Hotkey Manager Module
 * Provides keyboard shortcut functionality with visual hints
 * triggered by the Alt key, similar to Vimium and other keyboard
 * navigation tools.
 */
const HotkeyManager = (function() {
    // Private variables
    let isHotkeyModeActive = false;
    let hintElements = [];
    let hotkeys = {};
    let globalHotkeys = {};
    let isInitialized = false;
    let isModalOpen = false;
    let mutationObserver = null;
    
    /**
     * Initialize the Hotkey Manager
     */
    function initialize() {
      if (isInitialized) return;
      
      // Set up event listeners
      document.addEventListener('keydown', handleKeyDown);
      
      // Register built-in hotkeys
      registerGlobalHotkeys();
      
      // We'll only set up the MutationObserver when needed, not initially
      
      isInitialized = true;
      console.log('HotkeyManager initialized');
      
      // Add status indicator to the page
      createStatusIndicator();
    }
    
    /**
     * Create a status indicator element to show when hotkey mode is active
     */
    function createStatusIndicator() {
      const indicator = document.createElement('div');
      indicator.id = 'hotkey-mode-indicator';
      indicator.textContent = 'HOTKEY MODE';
      indicator.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background-color: rgba(255, 87, 34, 0.8);
        color: white;
        padding: 5px 10px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
        z-index: 10000;
        display: none;
        pointer-events: none;
      `;
      document.body.appendChild(indicator);
    }
    
    /**
     * Show or hide the hotkey mode indicator
     * @param {boolean} show - Whether to show the indicator
     */
    function toggleHotkeyModeIndicator(show) {
      const indicator = document.getElementById('hotkey-mode-indicator');
      if (indicator) {
        indicator.style.display = show ? 'block' : 'none';
      }
    }
    
    /**
     * Set up MutationObserver to handle dynamically added elements
     */
    function setupMutationObserver() {
      if (mutationObserver) return; // Don't create multiple observers
      
      mutationObserver = new MutationObserver((mutations) => {
        let shouldRefresh = false;
        
        // Only check for specific mutations to avoid feedback loops
        mutations.forEach(mutation => {
          // Ignore mutations from our own hint elements
          if (mutation.target && mutation.target.classList && 
              (mutation.target.classList.contains('hotkey-hint') || 
               mutation.target.closest('.hotkey-hint'))) {
            return;
          }
          
          // Also ignore mutations inside modal content
          if (mutation.target && mutation.target.closest('.modal-body, .modal-header, .modal-footer')) {
            return;
          }
          
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            shouldRefresh = true;
          }
        });
        
        if (shouldRefresh && isHotkeyModeActive && !isModalOpen) {
          // If hotkey mode is active and DOM changed, refresh hints
          // Use setTimeout to break potential recursion
          setTimeout(() => {
            removeHints();
            showHints();
          }, 0);
        }
      });
      
      // Only observe the document body with minimal configuration
      mutationObserver.observe(document.body, { 
        childList: true, 
        subtree: true,
        attributes: false,
        characterData: false
      });
    }
    
    /**
     * Stop and disconnect the MutationObserver
     */
    function stopMutationObserver() {
      if (mutationObserver) {
        mutationObserver.disconnect();
        mutationObserver = null;
      }
    }
    
    /**
     * Handle keydown events
     * @param {KeyboardEvent} e - The keyboard event
     */
    function handleKeyDown(e) {
      // Don't process if a modal is already open
      if (isModalOpen) return;
      
      // Check if Alt key was pressed to enter hotkey mode
      if (e.key === 'Alt' && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
        if (!isHotkeyModeActive) {
          enterHotkeyMode();
          e.preventDefault(); // Prevent default Alt behavior
        }
        return;
      }
      
      // In hotkey mode, check if a valid hotkey was pressed
      if (isHotkeyModeActive) {
        const key = e.key.toLowerCase();
        
        // Check if this key combination is registered
        if (hotkeys[key]) {
          e.preventDefault();
          // Execute the action and exit hotkey mode
          executeHotkeyAction(hotkeys[key].action);
          return;
        }
        
        // Check global hotkeys
        if (globalHotkeys[key]) {
          e.preventDefault();
          // Execute the action and exit hotkey mode
          executeHotkeyAction(globalHotkeys[key].action);
          return;
        }
        
        // If Escape is pressed, exit hotkey mode without doing anything
        if (e.key === 'Escape') {
          exitHotkeyMode();
          e.preventDefault();
        }
      }
    }
    
    /**
     * Enter hotkey mode
     */
    function enterHotkeyMode() {
      isHotkeyModeActive = true;
      setupMutationObserver();
      showHints();
      toggleHotkeyModeIndicator(true);
      console.log('Entered hotkey mode');
    }
    
    /**
     * Exit hotkey mode
     */
    function exitHotkeyMode() {
      isHotkeyModeActive = false;
      removeHints();
      stopMutationObserver();
      toggleHotkeyModeIndicator(false);
      console.log('Exited hotkey mode');
    }
    
    /**
     * Execute a hotkey action and exit hotkey mode
     * @param {Function} action - The action to execute
     */
    function executeHotkeyAction(action) {
      // First exit hotkey mode
      exitHotkeyMode();
      
      // Then execute the action
      if (typeof action === 'function') {
        try {
          action();
        } catch (error) {
          console.error('Error executing hotkey action:', error);
        }
      }
    }
    
    /**
     * Show hotkey hints for all registered elements
     */
    function showHints() {
      // Clear existing hotkeys to avoid duplicates
      hotkeys = {};
      
      // Register hotkeys for visible elements
      registerStaticHotkeys();
      registerNodeActionHotkeys();
      
      // Create hints for all registered hotkeys
      Object.keys(hotkeys).forEach(key => {
        const element = hotkeys[key].element;
        if (element && isElementVisible(element)) {
          createHintElement(element, key);
        }
      });
    }
    
    /**
     * Check if an element is currently visible
     * @param {HTMLElement} element - The element to check
     * @returns {boolean} True if the element is visible
     */
    function isElementVisible(element) {
      // Better visibility check
      if (!element) return false;
      
      // Check if element is in the DOM
      if (!document.body.contains(element)) return false;
      
      const rect = element.getBoundingClientRect();
      
      // Check if element has size and is within viewport
      return (rect.width > 0 && 
              rect.height > 0 && 
              rect.top < window.innerHeight &&
              rect.left < window.innerWidth &&
              rect.bottom > 0 &&
              rect.right > 0 &&
              window.getComputedStyle(element).visibility !== 'hidden' &&
              window.getComputedStyle(element).display !== 'none');
    }
    
    /**
     * Remove all hint elements
     */
    function removeHints() {
      hintElements.forEach(hint => {
        if (hint && hint.parentNode) {
          hint.parentNode.removeChild(hint);
        }
      });
      hintElements = [];
    }
    
    /**
     * Create a hint element for a given target element
     * @param {HTMLElement} element - The target element
     * @param {string} key - The hotkey
     */
    function createHintElement(element, key) {
      // Safety check - don't create hints for invalid elements
      if (!element || !document.body.contains(element)) return;
      
      const rect = element.getBoundingClientRect();
      
      // Skip elements that are off-screen or have zero size
      if (rect.top < 0 || rect.bottom > window.innerHeight || 
          rect.left < 0 || rect.right > window.innerWidth || 
          rect.width <= 0 || rect.height <= 0) {
        return;
      }
      
      const hint = document.createElement('div');
      hint.className = 'hotkey-hint';
      hint.textContent = key.toUpperCase();
      hint.style.cssText = `
        position: fixed;
        top: ${rect.top - 5}px;
        left: ${rect.left - 5}px;
        background-color: #ff5722;
        color: white;
        border-radius: 3px;
        padding: 2px 4px;
        font-size: 12px;
        font-weight: bold;
        z-index: 10000;
        pointer-events: none;
        box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      `;
      
      document.body.appendChild(hint);
      hintElements.push(hint);
    }
    
    /**
     * Register hotkeys for static UI elements
     */
    function registerStaticHotkeys() {
      // Register sidebar buttons
      registerElementHotkey('add-root-node', 'a', 'Add root node');
      registerElementHotkey('save-changes', 's', 'Save changes');
      registerElementHotkey('language-toggle', 'l', 'Toggle language');
      registerElementHotkey('search-nodes-button', 'f', 'Search nodes');
      
      // Register any filter buttons
      const filterButton = document.querySelector('.filter-button');
      if (filterButton) {
        registerHotkey('i', filterButton, () => filterButton.click(), 'Filter');
      }
    }
    
    /**
     * Register hotkeys for node action buttons
     * These appear when hovering over nodes
     */
    function registerNodeActionHotkeys() {
      // Find visible node actions (only register for the node that's being hovered)
      const visibleNodeActions = Array.from(document.querySelectorAll('.node-content:hover .node-actions'));
      
      if (visibleNodeActions.length > 0) {
        const actions = visibleNodeActions[0];
        
        // Register hotkeys for each button in the visible actions
        const buttons = Array.from(actions.querySelectorAll('button'));
        
        // Define specific hotkeys for common actions
        const actionMapping = {
          'position-button': 'p',      // Position
          'timestamp-button': 't',     // Timestamp
          'link-button': 'k',          // Link (using k for "link")
          'move-button': 'm',          // Move
          'sibling-button': 'b',       // Before/after sibling
          'markdown-button': 'd',      // Markdown (using d for "document")
          'attribute-button': 'u',     // Attributes
          '+': 'c',                    // Add child
          '×': 'x'                     // Delete
        };
        
        buttons.forEach((button, index) => {
          // Find the appropriate key based on the button
          let key;
          let desc = button.title || button.innerHTML;
          
          // Check if this is a known button type with a predefined hotkey
          for (const [className, hotkey] of Object.entries(actionMapping)) {
            if (button.classList.contains(className) || button.innerHTML === className) {
              key = hotkey;
              break;
            }
          }
          
          // If no predefined key, use index as a fallback
          if (!key) {
            // Use numbers for fallback (1-9)
            key = (index + 1).toString();
            if (index >= 9) return; // Skip if we run out of single digits
          }
          
          // Register the hotkey
          registerHotkey(key, button, () => button.click(), desc);
        });
      }
    }
    
    /**
     * Register a hotkey for an element by ID
     * @param {string} elementId - The ID of the element
     * @param {string} key - The key to use (should be a single character)
     * @param {string} description - Description of what the hotkey does
     */
    function registerElementHotkey(elementId, key, description) {
      const element = document.getElementById(elementId);
      if (element) {
        registerHotkey(key, element, () => element.click(), description);
      }
    }
    
    /**
     * Register a hotkey
     * @param {string} key - The key to use (should be a single character)
     * @param {HTMLElement} element - The element to associate with the hotkey
     * @param {Function} action - The function to call when the hotkey is pressed
     * @param {string} description - Description of what the hotkey does
     */
    function registerHotkey(key, element, action, description) {
      key = key.toLowerCase();
      hotkeys[key] = {
        element: element,
        action: action,
        description: description
      };
    }
    
    /**
     * Register global hotkeys that work throughout the application
     */
    function registerGlobalHotkeys() {
      // Register Ctrl+F equivalent with Alt+F
      globalHotkeys['f'] = {
        description: 'Search',
        action: () => {
          if (window.SearchManager) {
            window.SearchManager.openSearchModal();
          }
        }
      };
      
      // Add other global hotkeys as needed
      globalHotkeys['h'] = {
        description: 'Show Hotkey Help',
        action: showHelpModal
      };
      
      globalHotkeys['r'] = {
        description: 'Refresh',
        action: () => {
          if (window.fetchNodes) {
            window.fetchNodes(true);
          }
        }
      };
      
      // Alt+Z to focus on the last focused node
      globalHotkeys['z'] = {
        description: 'Focus Last Node',
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
        }
      };
      
      // Add an Escape hotkey that can be used to exit hotkey mode
      globalHotkeys['escape'] = {
        description: 'Exit Hotkey Mode',
        action: exitHotkeyMode
      };
    }
    
    /**
     * Show help modal with all available hotkeys
     */
    function showHelpModal() {
      // Set modal open flag to prevent hotkey interference
      isModalOpen = true;
      
      // Create overlay
      const modalOverlay = document.createElement('div');
      modalOverlay.className = 'modal-overlay';
      
      // Create modal container
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.style.maxWidth = '600px';
      
      // Create modal header
      const modalHeader = document.createElement('div');
      modalHeader.className = 'modal-header';
      
      const modalTitle = document.createElement('div');
      modalTitle.className = 'modal-title';
      modalTitle.textContent = 'Keyboard Shortcuts';
      
      const closeButton = document.createElement('button');
      closeButton.className = 'modal-close';
      closeButton.innerHTML = '&times;';
      closeButton.addEventListener('click', () => {
        document.body.removeChild(modalOverlay);
        isModalOpen = false;
      });
      
      modalHeader.appendChild(modalTitle);
      modalHeader.appendChild(closeButton);
      
      // Create modal body
      const modalBody = document.createElement('div');
      modalBody.className = 'modal-body';
      
      modalBody.innerHTML = `
        <div style="margin-bottom: 20px;">
          <h3>Using Keyboard Shortcuts</h3>
          <p>Press the <kbd>Alt</kbd> key once to enter hotkey mode. The "HOTKEY MODE" indicator will appear
          in the top-right corner. Then press a key to activate the corresponding action.</p>
          <p>Press <kbd>Esc</kbd> to exit hotkey mode without performing any action.</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3>Global Shortcuts</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">Shortcut</th>
                <th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${Object.keys(globalHotkeys).map(key => {
                if (key === 'escape') return ''; // Skip escape in the list
                return `
                  <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;"><kbd>${key.toUpperCase()}</kbd></td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">${globalHotkeys[key].description}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3>Node Editing Shortcuts</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">Shortcut</th>
                <th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;"><kbd>Enter</kbd></td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">Add child node</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;"><kbd>Tab</kbd></td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">Indent node</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;"><kbd>Shift</kbd> + <kbd>Tab</kbd></td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">Outdent node</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;"><kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>↑</kbd></td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">Move node up</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;"><kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>↓</kbd></td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">Move node down</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;"><kbd>Alt</kbd> + <kbd>M</kbd></td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">Open move node modal</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;"><kbd>Alt</kbd> + <kbd>#</kbd></td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">Open position adjustment modal</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div>
          <p><strong>Tip:</strong> When a node is hovered, press <kbd>Alt</kbd> to see available actions for that node.</p>
        </div>
      `;
      
      // Create modal footer
      const modalFooter = document.createElement('div');
      modalFooter.className = 'modal-footer';
      
      const closeModalButton = document.createElement('button');
      closeModalButton.className = 'btn btn-secondary';
      closeModalButton.textContent = 'Close';
      closeModalButton.addEventListener('click', () => {
        document.body.removeChild(modalOverlay);
        isModalOpen = false;
      });
      
      modalFooter.appendChild(closeModalButton);
      
      // Assemble the modal
      modal.appendChild(modalHeader);
      modal.appendChild(modalBody);
      modal.appendChild(modalFooter);
      modalOverlay.appendChild(modal);
      
      // Add to document
      document.body.appendChild(modalOverlay);
      
      // Close on escape
      modalOverlay.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          document.body.removeChild(modalOverlay);
          isModalOpen = false;
        }
      });
    }
    
    /**
     * Update hotkey hints when language changes
     * @param {string} language - The new language
     */
    function updateLanguage(language) {
      // If hints are currently showing, refresh them
      if (isHotkeyModeActive) {
        removeHints();
        showHints();
      }
    }
    
    // Public API
    return {
      initialize: initialize,
      updateLanguage: updateLanguage,
      enterHotkeyMode: enterHotkeyMode,
      exitHotkeyMode: exitHotkeyMode
    };
  })();
  
  // Export the module for use in other files
  window.HotkeyManager = HotkeyManager;