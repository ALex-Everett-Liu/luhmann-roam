// NodeExpansionManager - Handles node expansion and collapse functionality
const NodeExpansionManager = (function() {
    // Private variables
    let currentLanguage = 'en';
    let isInitialized = false;
    
    // Initialize the manager
    function initialize() {
      if (isInitialized) {
        console.log('NodeExpansionManager already initialized, skipping');
        return;
      }
      
      // Get the initial language setting from I18n if available
      if (window.I18n) {
        currentLanguage = I18n.getCurrentLanguage();
      } else {
        currentLanguage = localStorage.getItem('preferredLanguage') || 'en';
      }
      
      console.log('NodeExpansionManager initialized with language:', currentLanguage);
      isInitialized = true;
    }
    
    // Update language setting
    function updateLanguage(language) {
      currentLanguage = language;
      console.log('NodeExpansionManager language updated to:', currentLanguage);
    }
    
    // Toggle node expansion with optimized DOM update
    async function toggleNode(nodeId) {
      try {
        // Get the current node data before toggle
        const nodeResponse = await fetch(`/api/nodes/${nodeId}`);
        const node = await nodeResponse.json();
        const wasExpanded = node.is_expanded;
        
        // Toggle on the server
        const response = await fetch(`/api/nodes/${nodeId}/toggle`, {
          method: 'POST'
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error(errorData.error);
          return false;
        }
        
        // OPTIMIZATION: Update the DOM directly instead of a full refresh
        const nodeElement = document.querySelector(`.node[data-id="${nodeId}"]`);
        if (nodeElement) {
          const collapseIcon = nodeElement.querySelector('.collapse-icon');
          if (collapseIcon) {
            // Toggle the icon
            collapseIcon.innerHTML = wasExpanded ? '►' : '▼';
          }
          
          if (wasExpanded) {
            // Node was expanded, now collapse it - remove children container
            const childrenContainer = nodeElement.querySelector('.children');
            if (childrenContainer) {
              nodeElement.removeChild(childrenContainer);
            }
          } else {
            // Node was collapsed, now expand it - fetch children and add them
            fetchAndAppendChildren(nodeId, nodeElement);
          }
          
          // Reapply filters after the nodes are updated
          if (window.FilterManager) {
            FilterManager.applyFilters();
          }
          
          return true;
        }
        
        // Fallback to full refresh if direct DOM manipulation isn't possible
        if (window.fetchNodes) {
          await window.fetchNodes();
        }
        
        return true;
      } catch (error) {
        console.error(`Error toggling node ${nodeId}:`, error);
        return false;
      }
    }
    
    // Helper function to fetch children and append them to the node element
    async function fetchAndAppendChildren(nodeId, nodeElement) {
      try {
        // Use the existing fetchChildren function if available in the global scope
        let children;
        if (window.fetchChildren) {
          children = await window.fetchChildren(nodeId, true);
        } else {
          // Fallback if fetchChildren is not available
          const currentLanguage = I18n.getCurrentLanguage();
          const childrenResponse = await fetch(`/api/nodes/${nodeId}/children?lang=${currentLanguage}&_=${Date.now()}`);
          children = await childrenResponse.json();
        }
        
        if (children.length > 0) {
          // Create children container
          const childrenContainer = document.createElement('div');
          childrenContainer.className = 'children';
          
          // Create and append child elements
          if (window.createNodeElement) {
            for (const child of children) {
              const childElement = await window.createNodeElement(child);
              childrenContainer.appendChild(childElement);
            }
            
            nodeElement.appendChild(childrenContainer);
            
            // Setup drag and drop for the new nodes
            if (window.DragDropManager) {
              window.DragDropManager.setupDragAndDrop();
            }
          } else {
            // If createNodeElement is not available, we can't add children this way
            // Fall back to full refresh
            if (window.fetchNodes) {
              await window.fetchNodes();
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching and appending children for node ${nodeId}:`, error);
      }
    }
    
    // Expand a node if it's not already expanded
    async function expandNode(nodeId) {
      try {
        // Get the current node data
        const response = await fetch(`/api/nodes/${nodeId}`);
        const node = await response.json();
        
        // Only toggle if the node is not already expanded
        if (!node.is_expanded) {
          return await toggleNode(nodeId);
        }
        
        return true;
      } catch (error) {
        console.error(`Error expanding node ${nodeId}:`, error);
        return false;
      }
    }
    
    // Collapse a node if it's expanded
    async function collapseNode(nodeId) {
      try {
        // Get the current node data
        const response = await fetch(`/api/nodes/${nodeId}`);
        const node = await response.json();
        
        // Only toggle if the node is expanded
        if (node.is_expanded) {
          return await toggleNode(nodeId);
        }
        
        return true;
      } catch (error) {
        console.error(`Error collapsing node ${nodeId}:`, error);
        return false;
      }
    }
    
    // Expand all nodes from root
    async function expandAll() {
      try {
        const response = await fetch('/api/nodes/expand-all', {
          method: 'POST'
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error(errorData.error);
          return false;
        }
        
        // Refresh the outliner
        if (window.fetchNodes) {
          await window.fetchNodes(true);
        }
        
        return true;
      } catch (error) {
        console.error('Error expanding all nodes:', error);
        return false;
      }
    }
    
    // Collapse all nodes to root level
    async function collapseAll() {
      try {
        const response = await fetch('/api/nodes/collapse-all', {
          method: 'POST'
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error(errorData.error);
          return false;
        }
        
        // Refresh the outliner
        if (window.fetchNodes) {
          await window.fetchNodes(true);
        }
        
        return true;
      } catch (error) {
        console.error('Error collapsing all nodes:', error);
        return false;
      }
    }
    
    // Public API
    return {
      initialize,
      updateLanguage,
      toggleNode,
      expandNode,
      collapseNode,
      expandAll,
      collapseAll
    };
  })();
  
  // Make it available globally
  window.NodeExpansionManager = NodeExpansionManager;
  
  // Auto-initialize when the DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM ready, initializing NodeExpansionManager');
    NodeExpansionManager.initialize();
  });
  
  // Also initialize immediately if the DOM is already loaded
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    console.log('DOM already ready, initializing NodeExpansionManager immediately');
    NodeExpansionManager.initialize();
  }
  
  // Add a console message to confirm the script loaded
  console.log('NodeExpansionManager script loaded');