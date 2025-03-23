// NodeOperationsManager - Handles basic node operations like create, delete, indent, outdent, move up/down
const NodeOperationsManager = (function() {
    // Private variables
    let currentLanguage = 'en';
    let isInitialized = false;
    
    // Initialize the manager
    function initialize() {
      if (isInitialized) {
        console.log('NodeOperationsManager already initialized, skipping');
        return;
      }
      
      // Get the initial language setting from I18n if available
      if (window.I18n) {
        currentLanguage = I18n.getCurrentLanguage();
      } else {
        currentLanguage = localStorage.getItem('preferredLanguage') || 'en';
      }
      
      console.log('NodeOperationsManager initialized with language:', currentLanguage);
      isInitialized = true;
    }
    
    // Update language setting
    function updateLanguage(language) {
      currentLanguage = language;
      console.log('NodeOperationsManager language updated to:', currentLanguage);
    }
    
    // Add a root node
    async function addRootNode(nodesArray) {
      try {
        // Get the highest position
        const maxPosition = nodesArray && nodesArray.length > 0 
          ? Math.max(...nodesArray.map(n => n.position)) + 1 
          : 0;
        
        // Use the I18n system for default content
        const defaultContent = I18n.getCurrentLanguage() === 'en' ? I18n.t('newNode') : I18n.t('newNode');
        
        const response = await fetch('/api/nodes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content: defaultContent,
            content_zh: defaultContent,
            parent_id: null,
            position: maxPosition
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to create root node');
        }
        
        const newNode = await response.json();
        
        // Refresh the outliner
        if (window.fetchNodes) {
          await window.fetchNodes();
        }
        
        return newNode;
      } catch (error) {
        console.error('Error adding root node:', error);
        return null;
      }
    }
    
    // Add a child node with optimized DOM update
    async function addChildNode(parentId) {
      try {
        // Get the current parent node data
        const response = await fetch(`/api/nodes/${parentId}`);
        const parentNode = await response.json();
        
        // Get count of existing children to determine position
        const childrenResponse = await fetch(`/api/nodes/${parentId}/children`);
        const children = await childrenResponse.json();
        const position = children.length;
        
        // Use the I18n system for default content
        const defaultContent = I18n.getCurrentLanguage() === 'en' ? I18n.t('newNode') : I18n.t('newNode');
        
        // Create the new node
        const newNodeResponse = await fetch('/api/nodes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: defaultContent,
            content_zh: defaultContent,
            parent_id: parentId,
            position: position
          }),
        });
        
        if (!newNodeResponse.ok) {
          throw new Error('Failed to create child node');
        }
        
        const newNode = await newNodeResponse.json();
        
        // Make sure parent is expanded
        let parentWasExpanded = parentNode.is_expanded;
        if (!parentWasExpanded) {
          await fetch(`/api/nodes/${parentId}/toggle`, {
            method: 'POST'
          });
          
          // Update the parent node's expanded state locally
          const parentElement = document.querySelector(`.node[data-id="${parentId}"]`);
          if (parentElement) {
            const collapseIcon = parentElement.querySelector('.collapse-icon');
            if (collapseIcon) {
              collapseIcon.innerHTML = '▼'; // Update the collapse icon
            }
          }
        }
        
        // OPTIMIZATION: Instead of refreshing the entire DOM, just add the new node
        if (window.createNodeElement) {
          const parentElement = document.querySelector(`.node[data-id="${parentId}"]`);
          if (parentElement) {
            // Find or create the children container
            let childrenContainer = parentElement.querySelector('.children');
            if (!childrenContainer) {
              childrenContainer = document.createElement('div');
              childrenContainer.className = 'children';
              parentElement.appendChild(childrenContainer);
            }
            
            // Create the new node element and append it to the children container
            const newNodeElement = await window.createNodeElement(newNode);
            childrenContainer.appendChild(newNodeElement);
            
            // Setup drag and drop for the new node
            if (window.DragDropManager) {
              window.DragDropManager.setupDragAndDrop();
            }
            
            return newNode;
          }
        }
        
        // Fallback to full refresh if direct DOM manipulation isn't possible
        if (window.fetchNodes) {
          await window.fetchNodes(true);
        }
        
        return newNode;
      } catch (error) {
        console.error('Error adding child node:', error);
        return null;
      }
    }
    
    // Delete a node
    async function deleteNode(nodeId) {
      if (confirm(I18n.t('confirmDeleteNode'))) {
        try {
          await fetch(`/api/nodes/${nodeId}`, {
            method: 'DELETE'
          });
          
          // Refresh the outliner
          if (window.fetchNodes) {
            window.fetchNodes();
          }
          return true;
        } catch (error) {
          console.error(`Error deleting node ${nodeId}:`, error);
          return false;
        }
      }
      return false;
    }
    
    // Indent a node (make it a child of the node above)
    async function indentNode(nodeId) {
      try {
        const response = await fetch(`/api/nodes/${nodeId}/indent`, {
          method: 'POST'
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error(errorData.error);
          return false;
        }
        
        // Refresh the outliner
        if (window.fetchNodes) {
          await window.fetchNodes();
        }
        return true;
      } catch (error) {
        console.error(`Error indenting node ${nodeId}:`, error);
        return false;
      }
    }
    
    // Outdent a node (make it a sibling of its parent)
    async function outdentNode(nodeId) {
      try {
        const response = await fetch(`/api/nodes/${nodeId}/outdent`, {
          method: 'POST'
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error(errorData.error);
          return false;
        }
        
        // Refresh the outliner
        if (window.fetchNodes) {
          await window.fetchNodes();
        }
        return true;
      } catch (error) {
        console.error(`Error outdenting node ${nodeId}:`, error);
        return false;
      }
    }
    
    // Move node up
    async function moveNodeUp(nodeId) {
      try {
        const response = await fetch(`/api/nodes/${nodeId}/move-up`, {
          method: 'POST'
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error(errorData.error);
          return false;
        }
        
        // Refresh the outliner
        if (window.fetchNodes) {
          await window.fetchNodes();
        }
        return true;
      } catch (error) {
        console.error(`Error moving node ${nodeId} up:`, error);
        return false;
      }
    }
    
    // Move node down
    async function moveNodeDown(nodeId) {
      try {
        const response = await fetch(`/api/nodes/${nodeId}/move-down`, {
          method: 'POST'
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error(errorData.error);
          return false;
        }
        
        // Refresh the outliner
        if (window.fetchNodes) {
          await window.fetchNodes();
        }
        return true;
      } catch (error) {
        console.error(`Error moving node ${nodeId} down:`, error);
        return false;
      }
    }
    
    // Add a sibling node
    async function addSiblingNode(nodeId, position) {
      try {
        // Get the node to find its parent and position
        const response = await fetch(`/api/nodes/${nodeId}`);
        const node = await response.json();
        
        // Calculate new position
        let newPosition = node.position;
        if (position === 'after') {
          newPosition += 1;
        }
        
        // Use the I18n system for default content
        const defaultContent = I18n.getCurrentLanguage() === 'en' ? I18n.t('newNode') : I18n.t('newNode');
        
        // Create the new node
        await fetch('/api/nodes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content: defaultContent,
            content_zh: defaultContent,
            parent_id: node.parent_id,
            position: newPosition
          })
        });
        
        // Refresh the outliner
        if (window.fetchNodes) {
          await window.fetchNodes();
        }
        return true;
      } catch (error) {
        console.error(`Error adding sibling node to ${nodeId}:`, error);
        return false;
      }
    }
    
    // Public API
    return {
      initialize,
      updateLanguage,
      addRootNode,
      addChildNode,
      deleteNode,
      indentNode,
      outdentNode,
      moveNodeUp,
      moveNodeDown,
      addSiblingNode
    };
  })();
  
  // Make it available globally
  window.NodeOperationsManager = NodeOperationsManager;
  
  // Auto-initialize when the DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM ready, initializing NodeOperationsManager');
    NodeOperationsManager.initialize();
  });
  
  // Also initialize immediately if the DOM is already loaded
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    console.log('DOM already ready, initializing NodeOperationsManager immediately');
    NodeOperationsManager.initialize();
  }
  
  // Add a console message to confirm the script loaded
  console.log('NodeOperationsManager script loaded');