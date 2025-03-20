/**
 * Breadcrumb Manager Module
 * Displays a breadcrumb trail showing the hierarchy path to the focused node
 * and allows focusing on a specific node and its descendants
 */
const BreadcrumbManager = (function() {
  // Private variables
  let currentFocusedNodeId = null;
  let breadcrumbContainer = null;
  let currentLanguage = 'en';
  let isFocusMode = false;
  
  /**
   * Initializes the breadcrumb manager
   */
  function initialize() {
    // Get the initial language setting from I18n if available
    if (window.I18n) {
      currentLanguage = I18n.getCurrentLanguage();
    } else {
      currentLanguage = localStorage.getItem('preferredLanguage') || 'en';
    }
    console.log('BreadcrumbManager initialized with language:', currentLanguage);
    
    createBreadcrumbContainer();
  }
  
  /**
   * Creates the breadcrumb container in the DOM
   */
  function createBreadcrumbContainer() {
    // Create breadcrumb container
    breadcrumbContainer = document.createElement('div');
    breadcrumbContainer.className = 'breadcrumb-container';
    breadcrumbContainer.style.display = 'none'; // Initially hidden
    
    // Add breadcrumb container to the DOM, before the outliner container
    const outlinerContainer = document.getElementById('outliner-container');
    if (outlinerContainer) {
      const parent = outlinerContainer.parentNode;
      parent.insertBefore(breadcrumbContainer, outlinerContainer);
    }
  }
  
  /**
   * Sets focus on a specific node and updates the breadcrumb trail
   * @param {string} nodeId - The ID of the node to focus
   */
  async function focusOnNode(nodeId) {
    if (!nodeId) {
      clearFocus();
      return;
    }
    
    currentFocusedNodeId = nodeId;
    isFocusMode = true;
    
    // Update the breadcrumb trail
    await updateBreadcrumbTrail(nodeId);
    
    // Hide all nodes except the focused node and its descendants
    await filterToNodeAndDescendants(nodeId);
    
    // Highlight the focused node
    highlightFocusedNode(nodeId);
  }
  
  /**
   * Filters the view to show only the specified node and its descendants
   * @param {string} nodeId - The ID of the node to focus on
   */
  async function filterToNodeAndDescendants(nodeId) {
    const outlinerContainer = document.getElementById('outliner-container');
    const allNodes = outlinerContainer.querySelectorAll('.node');
    
    // First hide all nodes
    allNodes.forEach(node => {
      node.style.display = 'none';
    });
    
    try {
      // Get the node's ancestry path
      const ancestors = await getNodeAncestry(nodeId);
      
      // Show all ancestor nodes but collapse their children
      // (except for the direct path to our focused node)
      for (let i = 0; i < ancestors.length - 1; i++) {
        const ancestorId = ancestors[i].id;
        const ancestorNode = document.querySelector(`.node[data-id="${ancestorId}"]`);
        
        if (ancestorNode) {
          // Show this ancestor
          ancestorNode.style.display = '';
          
          // Find all its immediate children
          const childrenContainer = ancestorNode.querySelector('.children');
          if (childrenContainer) {
            // Hide all immediate children except the next node in our path
            const nextPathNodeId = ancestors[i + 1].id;
            const immediateChildren = childrenContainer.querySelectorAll(':scope > .node');
            
            immediateChildren.forEach(child => {
              if (child.dataset.id === nextPathNodeId) {
                child.style.display = '';
              } else {
                child.style.display = 'none';
              }
            });
          }
        }
      }
      
      // Now show the focused node and all its descendants
      const focusedNode = document.querySelector(`.node[data-id="${nodeId}"]`);
      if (focusedNode) {
        // Show the focused node
        focusedNode.style.display = '';
        
        // Show all descendants of the focused node
        showDescendants(focusedNode);
      }
      
      // Make sure our focused node is expanded
      const response = await fetch(`/api/nodes/${nodeId}`);
      const node = await response.json();
      if (!node.is_expanded) {
        await fetch(`/api/nodes/${nodeId}/toggle`, {
          method: 'POST'
        });
        
        // Refresh the outliner
        if (window.fetchNodes) {
          await window.fetchNodes();
          // Re-apply our focus filter after fetch
          setTimeout(() => filterToNodeAndDescendants(nodeId), 100);
        }
      }
    } catch (error) {
      console.error('Error filtering to node and descendants:', error);
    }
  }
  
  /**
   * Shows all descendant nodes of a given node
   * @param {HTMLElement} node - The parent node element
   */
  function showDescendants(node) {
    const children = node.querySelector('.children');
    if (!children) return;
    
    const childNodes = children.querySelectorAll(':scope > .node');
    childNodes.forEach(childNode => {
      childNode.style.display = '';
      showDescendants(childNode);
    });
  }
  
  /**
   * Updates the breadcrumb trail for a specific node
   * @param {string} nodeId - The ID of the node
   */
  async function updateBreadcrumbTrail(nodeId) {
    try {
      // Get the ancestry path
      const ancestors = await getNodeAncestry(nodeId);
      
      if (!ancestors || ancestors.length === 0) {
        hideBreadcrumbs();
        return;
      }
      
      // Show breadcrumb container
      breadcrumbContainer.style.display = 'flex';
      
      // Clear existing breadcrumbs
      breadcrumbContainer.innerHTML = '';
      
      // Add home/root icon
      const homeItem = document.createElement('div');
      homeItem.className = 'breadcrumb-item breadcrumb-home';
      homeItem.innerHTML = '🏠';
      homeItem.title = window.I18n ? I18n.t('returnToRoot') : 'Return to root level';
      homeItem.addEventListener('click', () => {
        clearFocus();
      });
      breadcrumbContainer.appendChild(homeItem);
      
      // Add each ancestor as a breadcrumb item
      ancestors.forEach((ancestor, index) => {
        // Add separator
        const separator = document.createElement('div');
        separator.className = 'breadcrumb-separator';
        separator.textContent = '>';
        breadcrumbContainer.appendChild(separator);
        
        // Add breadcrumb item
        const item = document.createElement('div');
        item.className = 'breadcrumb-item';
        item.dataset.id = ancestor.id;
        
        // Use appropriate language content
        const content = currentLanguage === 'en' ? 
          ancestor.content : 
          (ancestor.content_zh || ancestor.content);
        
        item.textContent = content;
        
        // Make last item (current node) appear active
        if (index === ancestors.length - 1) {
          item.classList.add('breadcrumb-active');
        } else {
          // Add click event for navigation to ancestor nodes
          item.addEventListener('click', () => {
            navigateToNode(ancestor.id);
          });
        }
        
        breadcrumbContainer.appendChild(item);
      });
    } catch (error) {
      console.error('Error updating breadcrumb trail:', error);
      hideBreadcrumbs();
    }
  }
  
  /**
   * Gets the ancestry path for a node (including the node itself)
   * @param {string} nodeId - The ID of the node
   * @returns {Promise<Array>} Array of ancestors ordered from root to the node
   */
  async function getNodeAncestry(nodeId) {
    // Since the /api/nodes/:id/ancestry endpoint doesn't exist in our server,
    // we'll directly use the manual ancestry building method
    return await buildNodeAncestry(nodeId);
    
    /* Original code with API attempt - commented out to avoid 404 errors
    try {
      const response = await fetch(`/api/nodes/${nodeId}/ancestry`);
      if (!response.ok) {
        // If the endpoint doesn't exist, fall back to manual ancestry building
        return await buildNodeAncestry(nodeId);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching node ancestry:', error);
      // Fall back to manual ancestry building
      return await buildNodeAncestry(nodeId);
    }
    */
  }
  
  /**
   * Manually builds the ancestry path by walking up the parent chain
   * @param {string} nodeId - The ID of the node
   * @returns {Promise<Array>} Array of ancestors ordered from root to the node
   */
  async function buildNodeAncestry(nodeId) {
    const ancestors = [];
    let currentId = nodeId;
    
    while (currentId) {
      try {
        const response = await fetch(`/api/nodes/${currentId}`);
        const node = await response.json();
        
        // Add to the beginning of the array (we're walking up from child to root)
        ancestors.unshift(node);
        
        // Move to parent
        currentId = node.parent_id;
      } catch (error) {
        console.error('Error building node ancestry:', error);
        break;
      }
    }
    
    return ancestors;
  }
  
  /**
   * Highlights the focused node in the UI
   * @param {string} nodeId - The ID of the node to highlight
   */
  function highlightFocusedNode(nodeId) {
    // Remove any existing highlights
    document.querySelectorAll('.node.focused-node').forEach(node => {
      node.classList.remove('focused-node');
    });
    
    // Add highlight to the focused node
    const nodeElement = document.querySelector(`.node[data-id="${nodeId}"]`);
    if (nodeElement) {
      nodeElement.classList.add('focused-node');
      
      // Scroll the node into view if needed
      nodeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
  
  /**
   * Navigates to a specific node
   * @param {string} nodeId - The ID of the node to navigate to
   */
  async function navigateToNode(nodeId) {
    try {
      // Ensure all parent nodes are expanded
      await expandParentNodes(nodeId);
      
      // Focus on the node
      focusOnNode(nodeId);
    } catch (error) {
      console.error('Error navigating to node:', error);
    }
  }
  
  /**
   * Expands all parent nodes of a given node
   * @param {string} nodeId - The ID of the node
   */
  async function expandParentNodes(nodeId) {
    try {
      const response = await fetch(`/api/nodes/${nodeId}`);
      const node = await response.json();
      
      if (node.parent_id) {
        // First expand the parent's parents recursively
        await expandParentNodes(node.parent_id);
        
        // Then expand the parent itself if it's not already expanded
        const parentNode = await fetch(`/api/nodes/${node.parent_id}`).then(res => res.json());
        if (!parentNode.is_expanded) {
          await fetch(`/api/nodes/${node.parent_id}/toggle`, {
            method: 'POST'
          });
          
          // Refresh the outliner to reflect the expanded state
          if (window.fetchNodes) {
            await window.fetchNodes();
          }
        }
      }
    } catch (error) {
      console.error('Error expanding parent nodes:', error);
    }
  }
  
  /**
   * Clears the current focus
   */
  function clearFocus() {
    if (!isFocusMode) return;
    
    currentFocusedNodeId = null;
    isFocusMode = false;
    
    // Hide breadcrumbs
    hideBreadcrumbs();
    
    // Remove highlighted focus from any nodes
    document.querySelectorAll('.node.focused-node').forEach(node => {
      node.classList.remove('focused-node');
    });
    
    // Show all nodes again
    const allNodes = document.querySelectorAll('.node');
    allNodes.forEach(node => {
      node.style.display = '';
    });
    
    // Reapply any filters if the FilterManager is active
    if (window.FilterManager) {
      window.FilterManager.applyFilters();
    }
  }
  
  /**
   * Hides the breadcrumb trail
   */
  function hideBreadcrumbs() {
    if (breadcrumbContainer) {
      breadcrumbContainer.style.display = 'none';
    }
  }
  
  /**
   * Updates the language for breadcrumb display
   * @param {string} language - The language code ('en' or 'zh')
   */
  function updateLanguage(language) {
    currentLanguage = language;
    console.log('BreadcrumbManager language updated to:', language);
    
    // Update the home icon tooltip
    const homeItem = document.querySelector('.breadcrumb-home');
    if (homeItem) {
      homeItem.title = window.I18n ? I18n.t('returnToRoot') : 'Return to root level';
    }
    
    // Update breadcrumb trail if there's a focused node
    if (currentFocusedNodeId && isFocusMode) {
      // Store the current focused node ID
      const nodeToFocus = currentFocusedNodeId;
      
      // Update the breadcrumb trail with the new language
      updateBreadcrumbTrail(nodeToFocus);
      
      // After the language switch and data refresh, reapply the focus
      setTimeout(() => {
        // Re-highlight the focused node
        highlightFocusedNode(nodeToFocus);
      }, 300);
    }
  }
  
  /**
   * Handles click events on nodes to focus them
   * @param {HTMLElement} nodeElement - The node element
   * @param {string} nodeId - The ID of the node
   */
  function addNodeFocusHandler(nodeElement, nodeId) {
    // Add double-click handler for node focus
    nodeElement.addEventListener('dblclick', (e) => {
      // Prevent default behavior and propagation
      e.preventDefault();
      e.stopPropagation();
      
      // Focus on the node
      focusOnNode(nodeId);
    });
  }
  
  /**
   * Restores focus state after a data refresh
   * Should be called after fetchNodes() completes
   */
  function restoreFocusState() {
    if (isFocusMode && currentFocusedNodeId) {
      console.log(`Restoring focus to node: ${currentFocusedNodeId}`);
      
      // Re-apply focus filtering and highlighting
      setTimeout(() => {
        filterToNodeAndDescendants(currentFocusedNodeId);
        highlightFocusedNode(currentFocusedNodeId);
      }, 100);
    }
  }
  
  /**
   * Gets the currently focused node ID
   * @returns {string|null} The ID of the focused node, or null if no node is focused
   */
  function getCurrentFocusedNodeId() {
    return currentFocusedNodeId;
  }
  
  // Public API
  return {
    initialize: initialize,
    focusOnNode: focusOnNode,
    clearFocus: clearFocus,
    updateLanguage: updateLanguage,
    addNodeFocusHandler: addNodeFocusHandler,
    restoreFocusState: restoreFocusState,
    getCurrentFocusedNodeId: getCurrentFocusedNodeId,
    // Check if currently in focus mode
    isInFocusMode: function() { return isFocusMode; }
  };
})();

// Export the module for use in other files
window.BreadcrumbManager = BreadcrumbManager; 