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
    
    // Add a root node with optimized DOM update
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
        
        // OPTIMIZATION: Add the new node directly to the DOM instead of refreshing
        if (window.createNodeElement) {
          const outlinerContainer = document.getElementById('outliner-container');
          if (outlinerContainer) {
            const newNodeElement = await window.createNodeElement(newNode);
            outlinerContainer.appendChild(newNodeElement);
            
            // Setup drag and drop for the new node
            if (window.DragDropManager) {
              window.DragDropManager.setupDragAndDrop();
            }
            
            return newNode;
          }
        }
        
        // Fallback to full refresh if direct DOM manipulation isn't possible
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
    
    // Delete a node with optimized DOM update
    async function deleteNode(nodeId) {
      if (confirm(I18n.t('confirmDeleteNode'))) {
        try {
          await fetch(`/api/nodes/${nodeId}`, {
            method: 'DELETE'
          });
          
          // OPTIMIZATION: Remove the node directly from the DOM
          const nodeElement = document.querySelector(`.node[data-id="${nodeId}"]`);
          if (nodeElement) {
            // Get the parent node element to check if we need to update parent UI elements
            const parentElement = nodeElement.parentElement;
            
            // Remove the node from the DOM
            nodeElement.remove();
            
            // If this was the last child of a parent, update parent's expand/collapse UI
            if (parentElement && parentElement.classList.contains('children')) {
              const remainingChildren = parentElement.querySelectorAll('.node');
              if (remainingChildren.length === 0) {
                const parentNodeElement = parentElement.parentElement;
                if (parentNodeElement && parentNodeElement.classList.contains('node')) {
                  // Find the collapse icon and replace it with a bullet
                  const collapseIcon = parentNodeElement.querySelector('.collapse-icon');
                  if (collapseIcon) {
                    const bullet = document.createElement('span');
                    bullet.className = 'bullet';
                    bullet.innerHTML = '•';
                    collapseIcon.parentNode.replaceChild(bullet, collapseIcon);
                  }
                  
                  // Remove the empty children container
                  parentElement.remove();
                }
              }
            }
            
            return true;
          }
          
          // Fallback to full refresh
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
    
    // Indent a node with optimized refresh
    async function indentNode(nodeId) {
      try {
        // Save relevant info before the operation
        const nodeElement = document.querySelector(`.node[data-id="${nodeId}"]`);
        let parentId = null;
        
        if (nodeElement) {
          const parentElement = nodeElement.parentElement;
          if (parentElement && parentElement.classList.contains('children')) {
            const parentNodeElement = parentElement.parentElement;
            if (parentNodeElement && parentNodeElement.classList.contains('node')) {
              parentId = parentNodeElement.dataset.id;
            }
          }
        }
        
        // Perform the indent operation
        const response = await fetch(`/api/nodes/${nodeId}/indent`, {
          method: 'POST'
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error(errorData.error);
          return false;
        }
        
        // Get the grandparent ID if we can, otherwise fallback to full refresh
        if (parentId) {
          // Refresh only the necessary subtree
          await refreshSubtree(parentId);
          return true;
        }
        
        // Fallback to full refresh if we couldn't determine the parent
        if (window.fetchNodes) {
          await window.fetchNodes();
        }
        return true;
      } catch (error) {
        console.error(`Error indenting node ${nodeId}:`, error);
        return false;
      }
    }
    
    // Outdent a node with optimized refresh
    async function outdentNode(nodeId) {
      try {
        // Save relevant info before the operation
        const nodeElement = document.querySelector(`.node[data-id="${nodeId}"]`);
        let grandparentId = null;
        
        if (nodeElement) {
          const parentElement = nodeElement.parentElement;
          if (parentElement && parentElement.classList.contains('children')) {
            const parentNodeElement = parentElement.parentElement;
            if (parentNodeElement && parentNodeElement.classList.contains('node')) {
              const grandparentElement = parentNodeElement.parentElement;
              if (grandparentElement && grandparentElement.classList.contains('children')) {
                const grandparentNodeElement = grandparentElement.parentElement;
                if (grandparentNodeElement && grandparentNodeElement.classList.contains('node')) {
                  grandparentId = grandparentNodeElement.dataset.id;
                }
              }
            }
          }
        }
        
        // Perform the outdent operation
        const response = await fetch(`/api/nodes/${nodeId}/outdent`, {
          method: 'POST'
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error(errorData.error);
          return false;
        }
        
        // Get the grandparent ID if we can, otherwise fallback to full refresh
        if (grandparentId) {
          // Refresh only the necessary subtree
          await refreshSubtree(grandparentId);
          return true;
        }
        
        // Fallback to full refresh if we couldn't determine the grandparent
        if (window.fetchNodes) {
          await window.fetchNodes();
        }
        return true;
      } catch (error) {
        console.error(`Error outdenting node ${nodeId}:`, error);
        return false;
      }
    }
    
    // Move node up with optimized refresh
    async function moveNodeUp(nodeId) {
      try {
        // Save parent info before the operation
        const nodeElement = document.querySelector(`.node[data-id="${nodeId}"]`);
        let parentId = null;
        
        if (nodeElement) {
          const parentElement = nodeElement.parentElement;
          if (parentElement && parentElement.classList.contains('children')) {
            const parentNodeElement = parentElement.parentElement;
            if (parentNodeElement && parentNodeElement.classList.contains('node')) {
              parentId = parentNodeElement.dataset.id;
            }
          }
        }
        
        // Perform the move up operation
        const response = await fetch(`/api/nodes/${nodeId}/move-up`, {
          method: 'POST'
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error(errorData.error);
          return false;
        }
        
        // If we have parent ID, refresh just that subtree
        if (parentId) {
          await refreshSubtree(parentId);
          return true;
        } else if (nodeElement && nodeElement.parentElement.id === 'outliner-container') {
          // This is a root level node, refresh all root nodes
          if (window.fetchNodes) {
            await window.fetchNodes();
          }
        } else {
          // Fallback to full refresh
          if (window.fetchNodes) {
            await window.fetchNodes();
          }
        }
        
        return true;
      } catch (error) {
        console.error(`Error moving node ${nodeId} up:`, error);
        return false;
      }
    }
    
    // Move node down with optimized refresh
    async function moveNodeDown(nodeId) {
      try {
        // Save parent info before the operation
        const nodeElement = document.querySelector(`.node[data-id="${nodeId}"]`);
        let parentId = null;
        
        if (nodeElement) {
          const parentElement = nodeElement.parentElement;
          if (parentElement && parentElement.classList.contains('children')) {
            const parentNodeElement = parentElement.parentElement;
            if (parentNodeElement && parentNodeElement.classList.contains('node')) {
              parentId = parentNodeElement.dataset.id;
            }
          }
        }
        
        // Perform the move down operation
        const response = await fetch(`/api/nodes/${nodeId}/move-down`, {
          method: 'POST'
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error(errorData.error);
          return false;
        }
        
        // If we have parent ID, refresh just that subtree
        if (parentId) {
          await refreshSubtree(parentId);
          return true;
        } else if (nodeElement && nodeElement.parentElement.id === 'outliner-container') {
          // This is a root level node, refresh all root nodes
          if (window.fetchNodes) {
            await window.fetchNodes();
          }
        } else {
          // Fallback to full refresh
          if (window.fetchNodes) {
            await window.fetchNodes();
          }
        }
        
        return true;
      } catch (error) {
        console.error(`Error moving node ${nodeId} down:`, error);
        return false;
      }
    }
    
    // Add a sibling node with optimized DOM update
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
        
        // First update positions of existing nodes to make room for the new node
        // For 'before', shift all nodes at or after this position
        // For 'after', shift all nodes after this position
        const shiftPositionResponse = await fetch('/api/nodes/reorder/shift', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            parentId: node.parent_id,
            position: newPosition,
            shift: 1  // Shift positions by +1
          })
        });
        
        if (!shiftPositionResponse.ok) {
          throw new Error('Failed to update node positions');
        }
        
        // Use the I18n system for default content
        const defaultContent = I18n.getCurrentLanguage() === 'en' ? I18n.t('newNode') : I18n.t('newNode');
        
        // Create the new node at the desired position
        const newNodeResponse = await fetch('/api/nodes', {
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
        
        if (!newNodeResponse.ok) {
          throw new Error('Failed to create sibling node');
        }
        
        const newNode = await newNodeResponse.json();
        
        // OPTIMIZATION: Add the new sibling directly to the DOM
        if (window.createNodeElement) {
          // Refresh subtree to ensure correct ordering
          if (node.parent_id) {
            await refreshSubtree(node.parent_id);
          } else {
            // For root level nodes, do a full refresh
            if (window.fetchNodes) {
              await window.fetchNodes();
            }
          }
          
          // Focus on the newly created node after refresh
          setTimeout(() => {
            const newNodeElement = document.querySelector(`.node[data-id="${newNode.id}"]`);
            if (newNodeElement) {
              const nodeText = newNodeElement.querySelector('.node-text');
              if (nodeText) {
                nodeText.focus();
              }
            }
          }, 100);
        } else {
          // Fallback to full refresh if direct DOM manipulation isn't possible
          if (window.fetchNodes) {
            await window.fetchNodes();
          }
        }
        
        return true;
      } catch (error) {
        console.error(`Error adding sibling node to ${nodeId}:`, error);
        return false;
      }
    }
    
    // Helper function to refresh a specific subtree
    async function refreshSubtree(nodeId) {
      try {
        // Get the node and its children from the server
        const nodeResponse = await fetch(`/api/nodes/${nodeId}`);
        const node = await nodeResponse.json();
        
        const nodeElement = document.querySelector(`.node[data-id="${nodeId}"]`);
        if (!nodeElement) {
          console.warn(`Node element with ID ${nodeId} not found in DOM`);
          return false;
        }
        
        // Find the children container
        let childrenContainer = nodeElement.querySelector('.children');
        
        // Remove existing children container if it exists
        if (childrenContainer) {
          nodeElement.removeChild(childrenContainer);
        }
        
        // Get fresh children data
        const childrenResponse = await fetch(`/api/nodes/${nodeId}/children?_=${Date.now()}`);
        const children = await childrenResponse.json();
        
        // Create new children container if we have children
        if (children.length > 0) {
          childrenContainer = document.createElement('div');
          childrenContainer.className = 'children';
          
          // Make sure the collapse icon shows the correct state
          const collapseIcon = nodeElement.querySelector('.collapse-icon');
          if (collapseIcon) {
            collapseIcon.innerHTML = node.is_expanded ? '▼' : '►';
          } else if (node.is_expanded) {
            // If there's no collapse icon but we have children, add one
            const nodeContent = nodeElement.querySelector('.node-content');
            if (nodeContent) {
              const bullet = nodeContent.querySelector('.bullet');
              if (bullet) {
                const newCollapseIcon = document.createElement('span');
                newCollapseIcon.className = 'collapse-icon';
                newCollapseIcon.innerHTML = '▼';
                newCollapseIcon.addEventListener('click', () => {
                  if (window.toggleNode) {
                    window.toggleNode(nodeId);
                  }
                });
                nodeContent.replaceChild(newCollapseIcon, bullet);
              }
            }
          }
          
          // Only create children elements if the node is expanded
          if (node.is_expanded) {
            // Create and append child elements
            for (const child of children) {
              if (window.createNodeElement) {
                const childElement = await window.createNodeElement(child);
                childrenContainer.appendChild(childElement);
              }
            }
            
            nodeElement.appendChild(childrenContainer);
            
            // Setup drag and drop for the refreshed nodes
            if (window.DragDropManager) {
              window.DragDropManager.setupDragAndDrop();
            }
          }
        } else {
          // No children, make sure we show a bullet instead of collapse icon
          const collapseIcon = nodeElement.querySelector('.collapse-icon');
          if (collapseIcon) {
            const bullet = document.createElement('span');
            bullet.className = 'bullet';
            bullet.innerHTML = '•';
            collapseIcon.parentNode.replaceChild(bullet, collapseIcon);
          }
        }
        
        return true;
      } catch (error) {
        console.error(`Error refreshing subtree for node ${nodeId}:`, error);
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
      addSiblingNode,
      refreshSubtree
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