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
    
    try {
      // Check if the node exists in the current vault
      const response = await fetch(`/api/nodes/${nodeId}`);
      if (response.status === 404) {
        console.log(`Node ${nodeId} not found in current vault, clearing focus`);
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
    } catch (error) {
      console.error('Error focusing on node:', error);
      clearFocus();
    }
  }
  
  /**
   * Filters the view to show only the specified node and its descendants
   * @param {string} nodeId - The ID of the node to focus on
   */
  async function filterToNodeAndDescendants(nodeId) {
    console.log('Focusing on node:', nodeId);
    
    try {
      // Get the node's ancestry path
      const ancestors = await getNodeAncestry(nodeId);
      console.log('Ancestors:', ancestors);
      
      // Get the focused node data
      const response = await fetch(`/api/nodes/${nodeId}`);
      const focusedNode = await response.json();
      
      // Get children of focused node
      const childrenResponse = await fetch(`/api/nodes/${nodeId}/children`);
      const children = await childrenResponse.json();
      console.log('Children of focused node:', children);
      
      // Get the outliner container
      const outlinerContainer = document.getElementById('outliner-container');
      
      // DEBUGGING: Let's output what's in the container before we modify it
      console.log('Current container children count:', outlinerContainer.childNodes.length);
      
      // Save the current container content
      if (!outlinerContainer._originalContent) {
        outlinerContainer._originalContent = outlinerContainer.innerHTML;
      }
      
      // Clear the container
      outlinerContainer.innerHTML = '';
      
      // Use createNodeElement to create a fully-featured node element
      // This ensures all action buttons and their event handlers are included
      if (window.createNodeElement) {
        const nodeElement = await window.createNodeElement(focusedNode);
        outlinerContainer.appendChild(nodeElement);
        
        // Setup any additional event handlers or drag-drop functionality
        if (window.DragDropManager) {
          window.DragDropManager.setupDragAndDrop();
        }
        
        console.log('Focus view created with complete node element');
      } else {
        console.error('window.createNodeElement not available - fallback to simple view');
        // Fallback to simpler node creation (should not happen in normal cases)
        // ... [simplified fallback code]
      }
      
      // Highlight the focused node
      highlightFocusedNode(nodeId);
      
    } catch (error) {
      console.error('Error applying focus view:', error);
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
      
      // First, determine if the node has children
      const childrenContainer = nodeElement.querySelector('.children');
      const hasChildren = childrenContainer !== null;
      
      console.log(`Node ${nodeId} has children: ${hasChildren}`);
      
      if (hasChildren) {
        // For nodes with children, we want to scroll to the bottom
        console.log('Node has children, scrolling to bottom of hierarchy');
        
        // DEBUG: Measure heights for better understanding
        const viewportHeight = window.innerHeight;
        const nodeRect = nodeElement.getBoundingClientRect();
        console.log(`Viewport height: ${viewportHeight}px, Node height: ${nodeRect.height}px`);
        
        // Use a more aggressive approach to get to the bottom:
        // 1. First fully scroll to the parent node
        nodeElement.scrollIntoView({ behavior: 'auto', block: 'start' });
        console.log('Scrolled to parent node (start position)');
        
        // 2. Wait a moment for rendering to complete
        setTimeout(() => {
          // Calculate total height of the node and its descendants
          const allNodesInHierarchy = nodeElement.querySelectorAll('.node');
          console.log(`Total nodes in hierarchy: ${allNodesInHierarchy.length}`);
          
          if (allNodesInHierarchy.length > 1) {
            // Get the last node in the DOM (should be the deepest descendant)
            const lastNode = allNodesInHierarchy[allNodesInHierarchy.length - 1];
            console.log(`Found last node in hierarchy: ${lastNode.dataset.id}`);
            
            // Scroll directly to the last node
            lastNode.scrollIntoView({ behavior: 'auto', block: 'end' });
            console.log('Scrolled to last node in hierarchy (end position)');
            
            // Add debug info about the final position
            setTimeout(() => {
              const lastNodeRect = lastNode.getBoundingClientRect();
              console.log(`Last node position: top=${lastNodeRect.top}px, bottom=${lastNodeRect.bottom}px`);
              console.log(`Viewport bottom: ${window.innerHeight}px`);
              
              // Check if we need to adjust further
              if (lastNodeRect.bottom < window.innerHeight - 50) {
                console.log('Last node not at bottom, forcing additional scroll');
                window.scrollBy({
                  top: window.innerHeight - lastNodeRect.bottom - 20,
                  behavior: 'auto'
                });
              }
            }, 50);
          } else {
            // If there are no children visible yet, scroll to the bottom of the container
            const contentHeight = Math.max(
              document.body.scrollHeight,
              document.documentElement.scrollHeight
            );
            console.log(`Scrolling to content bottom: ${contentHeight}px`);
            window.scrollTo({
              top: contentHeight,
              behavior: 'auto'
            });
          }
        }, 100);
      } else {
        // For nodes without children, center them in the viewport
        nodeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        console.log('Node without children centered in viewport');
      }
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
          
          // OPTIMIZATION: Use refreshSubtree instead of full DOM refresh
          if (window.NodeOperationsManager && window.NodeOperationsManager.refreshSubtree) {
            await window.NodeOperationsManager.refreshSubtree(node.parent_id);
          } else if (window.fetchNodes) {
            // Fallback to full refresh
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
    
    console.log('Clearing focus mode');
    currentFocusedNodeId = null;
    isFocusMode = false;
    
    // Hide breadcrumbs
    hideBreadcrumbs();
    
    // Remove highlighted focus from any nodes
    document.querySelectorAll('.node.focused-node').forEach(node => {
      node.classList.remove('focused-node');
    });
    
    // Restore original content if saved
    const outlinerContainer = document.getElementById('outliner-container');
    if (outlinerContainer && outlinerContainer._originalContent) {
      outlinerContainer.innerHTML = outlinerContainer._originalContent;
      delete outlinerContainer._originalContent;
      
      // Reattach event handlers that might have been lost
      if (window.DragDropManager) {
        window.DragDropManager.setupDragAndDrop();
      }
      
      console.log('Restored original content');
    } else {
      // If original content wasn't saved, refresh nodes
      if (window.fetchNodes) {
        window.fetchNodes();
        console.log('Refreshing nodes from server');
      }
    }
    
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
    
  // Rebuild the breadcrumb trail with the new language
  if (breadcrumbContainer && breadcrumbContainer.style.display !== 'none') {
    // Get the currently displayed breadcrumbs
    const breadcrumbItems = breadcrumbContainer.querySelectorAll('.breadcrumb-item');
    if (breadcrumbItems.length > 0) {
      // Get the ID of the last (current) node in the breadcrumb
      const lastItem = breadcrumbItems[breadcrumbItems.length - 1];
      if (lastItem && lastItem.dataset.id) {
        // Update the breadcrumb trail with this node ID
        updateBreadcrumbTrail(lastItem.dataset.id);
      }
    }
  }
  
  // Also update if in focus mode (existing code)
  if (currentFocusedNodeId && isFocusMode) {
    const nodeToFocus = currentFocusedNodeId;
    updateBreadcrumbTrail(nodeToFocus);
    
    setTimeout(() => {
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
  
  /**
   * Updates the breadcrumb display
   * This should be called whenever the focused node changes or language changes
   * no use, just delete it
   */
  function updateBreadcrumbs(nodeId) {
    // Clear existing breadcrumbs
    breadcrumbContainer.innerHTML = '';
    
    // Add home link
    const homeLink = document.createElement('a');
    homeLink.href = '#';
    homeLink.innerHTML = '<span class="breadcrumb-home">🏠</span>';
    homeLink.addEventListener('click', (e) => {
      e.preventDefault();
      exitFocusMode();
    });
    breadcrumbContainer.appendChild(homeLink);
    
    if (!nodeId) return;
    
    // Get the node path and create breadcrumbs
    getNodePath(nodeId).then(path => {
      if (path.length === 0) return;
      
      path.forEach((node, index) => {
        // Add separator
        const separator = document.createElement('span');
        separator.className = 'breadcrumb-separator';
        separator.textContent = ' > ';
        breadcrumbContainer.appendChild(separator);
        
        // Add node link
        const nodeLink = document.createElement('a');
        nodeLink.href = '#';
        nodeLink.className = 'breadcrumb-node';
        nodeLink.dataset.id = node.id;
        
        // Use appropriate language content based on current language
        const currentLanguage = I18n.getCurrentLanguage();
        const displayContent = currentLanguage === 'en' ? node.content : (node.content_zh || node.content);
        
        nodeLink.textContent = displayContent;
        
        if (index < path.length - 1) {
          nodeLink.addEventListener('click', (e) => {
            e.preventDefault();
            focusOnNode(node.id);
          });
        }
        
        breadcrumbContainer.appendChild(nodeLink);
      });
    });
  }
  
  // Add a new direct node expansion function that doesn't require full DOM refresh
  async function expandNodeDirectly(nodeId) {
    try {
      const nodeElement = document.querySelector(`.node[data-id="${nodeId}"]`);
      if (!nodeElement) return false;
      
      const response = await fetch(`/api/nodes/${nodeId}`);
      const node = await response.json();
      
      if (!node.is_expanded) {
        // Toggle the node on the server
        await fetch(`/api/nodes/${nodeId}/toggle`, {
          method: 'POST'
        });
        
        // Use refreshSubtree for efficient DOM update
        if (window.NodeOperationsManager && window.NodeOperationsManager.refreshSubtree) {
          return await window.NodeOperationsManager.refreshSubtree(nodeId);
        }
      }
      
      return true;
    } catch (error) {
      console.error(`Error expanding node ${nodeId} directly:`, error);
      return false;
    }
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
    expandNodeDirectly: expandNodeDirectly,
    isInFocusMode: function() { return isFocusMode; }
  };
})();

// Export the module for use in other files
window.BreadcrumbManager = BreadcrumbManager; 