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
    let isRefreshingHints = false;
    
    // Track whether Alt is down and if other keys were pressed with it
    let isAltDown = false;
    let otherKeyPressedWithAlt = false;
    
    // Add a variable to track the first digit in a two-digit sequence
    let firstDigitPressed = null;
    let firstDigitTimeout = null;
    
    /**
     * Initialize the Hotkey Manager
     */
    function initialize() {
      if (isInitialized) return;
      
      // Set up event listeners differently
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('keyup', handleKeyUp);
      
      // Track Alt key and other keys pressed with Alt
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      // Register built-in hotkeys
      registerGlobalHotkeys();
      
      // We'll only set up the MutationObserver when needed, not initially
      
      isInitialized = true;
      console.log('HotkeyManager initialized');
      
      // Add status indicator to the page
      createStatusIndicator();
      
      // Add stylesheet for hints
      addHintStyles();
    }
    
    /**
     * Add stylesheet for hint elements to avoid inline styles which can cause reflows
     */
    function addHintStyles() {
      const style = document.createElement('style');
      style.textContent = `
        .hotkey-hint {
          position: fixed;
          background-color: #ff5722;
          color: white;
          border-radius: 3px;
          padding: 2px 4px;
          font-size: 12px;
          font-weight: bold;
          z-index: 10000;
          pointer-events: none;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
        
        .node-number-hint {
          background-color: #4CAF50 !important;
          color: white;
          font-size: 14px;
          padding: 3px 6px;
          border-radius: 50%;
          z-index: 10002; /* Higher than other hints */
        }
        
        .two-digit-hint {
          background-color: #2196F3 !important;
          border-radius: 3px !important;
          font-size: 12px !important;
          min-width: 18px;
          text-align: center;
        }
        
        .breadcrumb-hint {
          background-color: #FF9800 !important;
          color: white;
          font-size: 12px;
          padding: 3px 6px;
          border-radius: 4px;
          z-index: 10003; /* Higher than node number hints */
        }
        
        #hotkey-mode-indicator {
          position: fixed;
          top: 10px;
          right: 10px;
          background-color: rgba(255, 87, 34, 0.9);
          color: white;
          padding: 5px 10px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
          z-index: 10001;
          pointer-events: none;
          display: none;
        }
      `;
      document.head.appendChild(style);
    }
    
    /**
     * Create a status indicator element to show when hotkey mode is active
     */
    function createStatusIndicator() {
      const indicator = document.createElement('div');
      indicator.id = 'hotkey-mode-indicator';
      indicator.textContent = 'HOTKEY MODE';
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
        // If we're already in the process of refreshing hints, ignore mutations
        if (isRefreshingHints) return;
        
        // Check only for node additions that may need a hint
        let shouldRefresh = false;
        
        mutations.forEach(mutation => {
          // Ignore mutations from hint elements completely
          if (mutation.target.classList && mutation.target.classList.contains('hotkey-hint')) {
            return;
          }
          
          if (mutation.target.closest('.hotkey-hint')) {
            return;
          }
          
          // Also ignore mutations inside modal content
          if (mutation.target.closest && mutation.target.closest('.modal-body, .modal-header, .modal-footer')) {
            return;
          }
          
          // Only care about added nodes that could be buttons or actionable elements
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            for (let i = 0; i < mutation.addedNodes.length; i++) {
              const node = mutation.addedNodes[i];
              if (node.nodeType === Node.ELEMENT_NODE) {
                // Check if the added node is a button or contains buttons
                if (node.tagName === 'BUTTON' || node.querySelector('button')) {
                  shouldRefresh = true;
                  break;
                }
              }
            }
          }
        });
        
        if (shouldRefresh && isHotkeyModeActive && !isModalOpen) {
          // Use a flag to prevent recursive mutations
          refreshHintsWithDebounce();
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
    
    // Debounce the hint refresh to avoid excessive updates
    let refreshHintsTimeout = null;
    function refreshHintsWithDebounce() {
      if (refreshHintsTimeout) {
        clearTimeout(refreshHintsTimeout);
      }
      
      refreshHintsTimeout = setTimeout(() => {
        isRefreshingHints = true;
        
        // First remove all hints
        removeHints();
        
        // Then add them again
        showHints();
        
        // Reset the flag when done
        setTimeout(() => {
          isRefreshingHints = false;
        }, 100);
      }, 200); // Debounce time of 200ms
    }
    
    /**
     * Stop and disconnect the MutationObserver
     */
    function stopMutationObserver() {
      if (mutationObserver) {
        mutationObserver.disconnect();
        mutationObserver = null;
      }
      
      // Also clear any pending refresh
      if (refreshHintsTimeout) {
        clearTimeout(refreshHintsTimeout);
        refreshHintsTimeout = null;
      }
    }
    
    /**
     * Handle keydown events
     * @param {KeyboardEvent} e - The keyboard event
     */
    function handleKeyDown(e) {
      // Don't process if a modal is already open
      if (isModalOpen) return;
      
      // If we're in hotkey mode, handle hotkey actions
      if (isHotkeyModeActive) {
        const key = e.key.toLowerCase();
        
        // Track if we've entered the "b" prefix for breadcrumb navigation
        if (key === 'b') {
          // Set a state to indicate we're waiting for a digit to complete the breadcrumb command
          firstDigitPressed = 'b';
          firstDigitTimeout = setTimeout(() => {
            firstDigitPressed = null;
          }, 2500); // Wait 2.5 seconds for the second part
          e.preventDefault();
          return;
        }
        
        // Check if we're in the middle of a breadcrumb sequence (b + number)
        if (firstDigitPressed === 'b' && /^[0-9]$/.test(key)) {
          e.preventDefault();
          
          // Combine to make the breadcrumb key (b + digit)
          const combinedKey = 'b' + key;
          
          // Clear the first part state
          clearTimeout(firstDigitTimeout);
          firstDigitPressed = null;
          
          // Check if we have a hotkey for this combination
          if (hotkeys[combinedKey]) {
            // Execute the action and exit hotkey mode
            executeHotkeyAction(hotkeys[combinedKey].action);
          }
          return;
        }
        
        // Check if we're in the middle of a two-digit sequence for node navigation
        if (firstDigitPressed !== null && firstDigitPressed !== 'b') {
          // If the second key is a digit
          if (/^[0-9]$/.test(key)) {
            e.preventDefault();
            
            // Combine the two digits
            const combinedKey = firstDigitPressed + key;
            
            // Clear the first digit state
            clearTimeout(firstDigitTimeout);
            firstDigitPressed = null;
            
            // Check if we have a hotkey for this combination
            if (hotkeys[combinedKey]) {
              // Execute the action and exit hotkey mode
              executeHotkeyAction(hotkeys[combinedKey].action);
            }
            return;
          } else {
            // If the second key is not a digit, clear the first digit
            clearTimeout(firstDigitTimeout);
            firstDigitPressed = null;
          }
        }
        
        // Handle single-digit numbers: if key is 1-9, we might be starting a two-digit sequence
        if (/^[1-9]$/.test(key)) {
          // Check if there are any two-digit hotkeys that start with this digit
          const hasTwoDigitHotkeys = Object.keys(hotkeys).some(k => 
            k.length === 2 && k.startsWith(key) && hotkeys[k].isTwoDigit
          );
          
          if (hasTwoDigitHotkeys) {
            e.preventDefault();
            // Store the first digit and set a timeout to clear it
            firstDigitPressed = key;
            firstDigitTimeout = setTimeout(() => {
              firstDigitPressed = null;
            }, 2500); // Wait 2.5 seconds for the second digit
            
            // Don't execute anything yet, wait for the second digit
            return;
          }
        }
        
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
        
        return;
      }
      
      // Not in hotkey mode yet, track Alt key state
      if (e.key === 'Alt') {
        isAltDown = true;
        otherKeyPressedWithAlt = false;
      } else if (isAltDown) {
        // If any other key is pressed while Alt is down, we're not doing a "clean" Alt press
        otherKeyPressedWithAlt = true;
      }
    }
    
    /**
     * Handle keyup events
     * @param {KeyboardEvent} e - The keyboard event
     */
    function handleKeyUp(e) {
      // If Alt key is released
      if (e.key === 'Alt') {
        // Only enter hotkey mode if:
        // 1. Alt was pressed down
        // 2. No other keys were pressed while Alt was down
        // 3. We're not already in hotkey mode
        if (isAltDown && !otherKeyPressedWithAlt && !isHotkeyModeActive) {
          enterHotkeyMode();
          e.preventDefault();
        }
        
        // Reset Alt tracking state
        isAltDown = false;
        otherKeyPressedWithAlt = false;
      }
    }
    
    /**
     * Handle when the tab/window visibility changes
     * This prevents hotkey mode from activating when switching back to the app
     */
    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        // Reset Alt tracking state when switching away from the app
        isAltDown = false;
        otherKeyPressedWithAlt = false;
      }
    }
    
    /**
     * Enter hotkey mode
     */
    function enterHotkeyMode() {
      isHotkeyModeActive = true;
      
      // Prepare to track hint refreshes
      isRefreshingHints = true;
      
      // Show hints first before setting up observer
      showHints();
      
      // Now set up the observer
      setupMutationObserver();
      
      // Show the indicator
      toggleHotkeyModeIndicator(true);
      
      // Reset the refresh tracking flag
      setTimeout(() => {
        isRefreshingHints = false;
      }, 100);
      
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
     * Register hotkeys for node navigation using numbers
     * Adds numbered hints to navigate directly to nodes
     */
    function registerNodeNavigationHotkeys() {
      // Check if we're in a focused view by looking for visible breadcrumbs
      const isFocusedView = document.querySelector('.breadcrumb-container') && 
                            document.querySelector('.breadcrumb-container').style.display !== 'none';
      
      let nodesToNumber = [];
      
      if (isFocusedView) {
        // In focused view: find all visible nodes
        // Use a more specific selector to ensure we're getting the correct visible nodes
        nodesToNumber = Array.from(document.querySelectorAll('.node')).filter(node => {
          // Check if the node is actually visible (not hidden by CSS or parent nodes)
          const style = window.getComputedStyle(node);
          return style.display !== 'none';
        });
        
        console.log(`Found ${nodesToNumber.length} visible nodes in focused view`);
      } else {
        // At root level: only show first node
        nodesToNumber = Array.from(document.querySelectorAll('#outliner-container > .node'));
        // For root level, just show the first node (per user request)
        if (!isFocusedView) {
          nodesToNumber = nodesToNumber.slice(0, 1);
        }
        console.log(`Found ${nodesToNumber.length} root nodes, showing ${nodesToNumber.length} numbered hints`);
      }
      
      // Limit to 99 nodes (for single and double digit keys 1-99)
      const maxNodes = Math.min(nodesToNumber.length, 99);
      console.log(`Registering ${maxNodes} nodes for number hotkeys`);
      
      for (let i = 0; i < maxNodes; i++) {
        const node = nodesToNumber[i];
        const nodeId = node.dataset.id;
        // Use 1-99 keys (as strings)
        const key = (i + 1).toString(); 
        
        // Find the node text to get its content
        const nodeText = node.querySelector('.node-text');
        const content = nodeText ? nodeText.textContent.trim() : `Node ${nodeId}`;
        
        // Use the bullet or collapse icon as the anchor point for the hint
        const bulletOrIcon = node.querySelector('.bullet, .collapse-icon');
        
        // For nodes > 9, we need special handling in the UI and keypress handling
        const isTwoDigit = i >= 9;
        
        // Register a hotkey that will navigate to this node when pressed
        // and also put it in editing mode with cursor at the end
        registerHotkey(key, bulletOrIcon || node, () => {
          if (window.BreadcrumbManager) {
            // First focus on the node to ensure it's in view
            window.BreadcrumbManager.focusOnNode(nodeId);
            
            // Then find the node-text element and put it in editing mode
            setTimeout(() => {
              const nodeElement = document.querySelector(`.node[data-id="${nodeId}"]`);
              if (nodeElement) {
                const nodeTextElement = nodeElement.querySelector('.node-text');
                if (nodeTextElement) {
                  // Focus on the text element
                  nodeTextElement.focus();
                  
                  // If this is a contenteditable element, position cursor at the end
                  if (nodeTextElement.isContentEditable) {
                    // Create a range at the end of the text content
                    const range = document.createRange();
                    range.selectNodeContents(nodeTextElement);
                    range.collapse(false); // false means collapse to end
                    
                    // Apply the range selection
                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
                  }
                }
              }
            }, 100); // Short delay to ensure DOM is updated after focusOnNode
          }
        }, `Focus on: ${content.substring(0, 20)}${content.length > 20 ? '...' : ''}`, isTwoDigit);
      }
    }
    
    /**
     * Register hotkeys for breadcrumb navigation
     * Adds numbered hints to breadcrumb items for quick navigation to previous focus levels
     */
    function registerBreadcrumbHotkeys() {
      // Get all breadcrumb items except the home icon (we'll handle that separately)
      const breadcrumbItems = Array.from(document.querySelectorAll('.breadcrumb-item:not(.breadcrumb-home):not(.breadcrumb-active)'));
      
      if (breadcrumbItems.length === 0) return;
      
      console.log(`Found ${breadcrumbItems.length} breadcrumb items for hotkeys`);
      
      // Use B+number for breadcrumb navigation (B for Breadcrumb)
      // This avoids conflicts with the regular node numbering
      breadcrumbItems.forEach((item, index) => {
        const key = `b${index + 1}`;
        const nodeId = item.dataset.id;
        
        if (!nodeId) return;
        
        const content = item.textContent.trim();
        
        registerHotkey(key, item, () => {
          if (window.BreadcrumbManager) {
            window.BreadcrumbManager.focusOnNode(nodeId);
          }
        }, `Navigate to: ${content.substring(0, 20)}${content.length > 20 ? '...' : ''}`);
      });
      
      // Register the home icon with 'b0' (breadcrumb level 0)
      const homeIcon = document.querySelector('.breadcrumb-home');
      if (homeIcon) {
        registerHotkey('b0', homeIcon, () => {
          if (window.BreadcrumbManager) {
            window.BreadcrumbManager.clearFocus();
          }
        }, 'Return to root level');
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
      
      // Add number hotkeys for node navigation
      registerNodeNavigationHotkeys();
      
      // Add hotkeys for breadcrumb navigation
      registerBreadcrumbHotkeys();
      
      // First, create a document fragment to batch DOM operations
      const fragment = document.createDocumentFragment();
      const hintPositions = [];
      
      // Create hints for all registered hotkeys
      Object.keys(hotkeys).forEach(key => {
        const element = hotkeys[key].element;
        const isTwoDigit = hotkeys[key].isTwoDigit;
        
        if (element && isElementVisible(element)) {
          const rect = element.getBoundingClientRect();
          
          // Skip elements that are off-screen or have zero size
          if (rect.top < 0 || rect.bottom > window.innerHeight || 
              rect.left < 0 || rect.right > window.innerWidth || 
              rect.width <= 0 || rect.height <= 0) {
            return;
          }
          
          // Special handling for node navigation hints (numbered keys)
          let left = rect.left - 5;
          let top = rect.top - 5;
          let isNodeNumber = /^\d+$/.test(key); // Matches any digit sequence
          let isBreadcrumb = /^b\d+$/.test(key); // Matches 'b' followed by digits
          
          // If this is a number key, position the hint differently
          if (isNodeNumber) {
            // Position to the left of the bullet/collapse icon
            left = Math.max(5, rect.left - 20);
            top = rect.top + (rect.height / 2) - 8; // Center vertically
          }
          
          // If this is a breadcrumb key, position it over the breadcrumb item
          if (isBreadcrumb) {
            left = rect.left + (rect.width / 2) - 10; // Center horizontally
            top = rect.top + (rect.height / 2) - 10; // Center vertically
          }
          
          // Store position for hint placement
          hintPositions.push({
            key: key,
            top: top,
            left: left,
            isNodeNumber: isNodeNumber,
            isTwoDigit: isTwoDigit,
            isBreadcrumb: isBreadcrumb
          });
        }
      });
      
      // Now create all hints at once and add to fragment
      hintPositions.forEach(pos => {
        const hint = document.createElement('div');
        hint.className = 'hotkey-hint';
        
        // Add special class for node number hints
        if (pos.isNodeNumber) {
          hint.className += ' node-number-hint';
          // Make node number hints more visible
          hint.style.backgroundColor = '#4CAF50';
          hint.style.fontWeight = 'bold';
          
          // For two-digit numbers, add a special class
          if (pos.isTwoDigit) {
            hint.className += ' two-digit-hint';
            // Make two-digit hints a bit wider and different color
            hint.style.backgroundColor = '#2196F3';
            hint.style.fontSize = '12px';
            hint.style.padding = '3px 4px';
          }
        }
        
        // Add special class for breadcrumb hints
        if (pos.isBreadcrumb) {
          hint.className += ' breadcrumb-hint';
          hint.style.backgroundColor = '#FF9800'; // Orange color for breadcrumb hints
          hint.style.borderRadius = '4px';
          hint.style.zIndex = '10003'; // Higher than node hints
        }
        
        hint.textContent = pos.key.toUpperCase();
        hint.style.top = `${pos.top}px`;
        hint.style.left = `${pos.left}px`;
        
        fragment.appendChild(hint);
        hintElements.push(hint);
      });
      
      // Append all hints to document in one operation
      document.body.appendChild(fragment);
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
          'sibling-button': 'i',       // Before/after sibling
          'markdown-button': 'd',      // Markdown (using d for "document")
          'attribute-button': 'u',     // Attributes
          'size-button': 'g',          // Node size (using g for "grid size")
          'bookmark-button': 'b',      // Bookmark (using b for "bookmark")
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
    function registerHotkey(key, element, action, description, isTwoDigit = false) {
      key = key.toLowerCase();
      hotkeys[key] = {
        element: element,
        action: action,
        description: description,
        isTwoDigit: isTwoDigit
      };
    }
    
    /**
     * Register global hotkeys that work throughout the application
     */
    function registerGlobalHotkeys() {
      // Register focus hotkey - Alt+F to focus on hovered node or open search
      globalHotkeys['f'] = {
        description: 'Focus on Hovered Node / Search',
        action: () => {
          // Check if there's a hovered node
          if (window.hoveredNodeId) {
            if (window.BreadcrumbManager) {
              window.BreadcrumbManager.focusOnNode(window.hoveredNodeId);
            }
          } else {
            // Fallback to search if no node is hovered
            if (window.SearchManager) {
              window.SearchManager.openSearchModal();
            }
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
      
      // Add bookmark hotkey
      globalHotkeys['b'] = {
        description: 'Bookmark Current Node',
        action: () => {
          if (window.BookmarkManager) {
            window.BookmarkManager.toggleBookmarkForFocusedNode();
          }
        }
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
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;"><kbd>Ctrl</kbd> + <kbd>T</kbd></td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">Pin/unpin node tooltip (when hovering over a node)</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3>Persistent Tooltips</h3>
          <p>When hovering over a node, press <kbd>Ctrl</kbd> + <kbd>T</kbd> to pin the tooltip. 
          Pinned tooltips can be dragged to any position and remain visible until closed.</p>
          <p>Press <kbd>Escape</kbd> to close all persistent tooltips at once.</p>
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
    
    /**
     * Set modal open state to prevent hotkey conflicts
     * @param {boolean} modalOpen - Whether a modal is open
     */
    function setModalState(modalOpen) {
      isModalOpen = modalOpen;
      
      // If a modal is opening and hotkey mode is active, exit it
      if (modalOpen && isHotkeyModeActive) {
        exitHotkeyMode();
      }
    }
    
    // Public API
    return {
      initialize: initialize,
      updateLanguage: updateLanguage,
      enterHotkeyMode: enterHotkeyMode,
      exitHotkeyMode: exitHotkeyMode,
      setModalState: setModalState
    };
  })();
  
  // Export the module for use in other files
  window.HotkeyManager = HotkeyManager;
