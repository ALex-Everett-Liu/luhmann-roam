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
    
    // Toggle node expansion with focus preservation
    async function toggleNode(nodeId) {
      try {
        // Store the currently focused element and cursor info BEFORE any operations
        const focusedElement = document.activeElement;
        const wasTextFocused = focusedElement && focusedElement.classList.contains('node-text');
        
        let cursorPosition = 0;
        let textContent = '';
        let focusedNodeId = null;
        
        if (wasTextFocused) {
          const focusedNodeElement = focusedElement.closest('.node');
          if (focusedNodeElement) {
            focusedNodeId = focusedNodeElement.dataset.id;
            textContent = focusedElement.textContent || '';
            
            // Get cursor position more safely
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              
              // Calculate the cursor position relative to the text content
              let offset = 0;
              const walker = document.createTreeWalker(
                focusedElement,
                NodeFilter.SHOW_TEXT,
                null,
                false
              );
              
              let node;
              while (node = walker.nextNode()) {
                if (node === range.startContainer) {
                  offset += range.startOffset;
                  break;
                }
                offset += node.textContent.length;
              }
              
              cursorPosition = offset;
            }
          }
        }
        
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
            await fetchAndAppendChildren(nodeId, nodeElement);
          }
          
          // Restore focus and cursor position after DOM manipulation
          if (wasTextFocused && focusedNodeId) {
            // Add a small delay to ensure DOM is settled
            setTimeout(() => {
              const targetNodeElement = document.querySelector(`.node[data-id="${focusedNodeId}"]`);
              if (targetNodeElement) {
                const targetTextElement = targetNodeElement.querySelector('.node-text');
                if (targetTextElement) {
                  targetTextElement.focus();
                  
                  // Only try to restore cursor position if the text content is the same
                  if (targetTextElement.textContent === textContent) {
                    safelyRestoreCursorPosition(targetTextElement, cursorPosition);
                  }
                }
              }
            }, 10);
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
    
    // Helper function to safely restore cursor position (same as in NodeOperationsManager)
    function safelyRestoreCursorPosition(textElement, cursorPosition) {
      try {
        const selection = window.getSelection();
        const range = document.createRange();
        
        // Find the text node to place cursor in
        let targetNode = null;
        let targetOffset = cursorPosition;
        
        // Check if there are child nodes (text nodes)
        if (textElement.childNodes.length > 0) {
          // Find the appropriate text node
          let currentOffset = 0;
          for (let i = 0; i < textElement.childNodes.length; i++) {
            const node = textElement.childNodes[i];
            if (node.nodeType === Node.TEXT_NODE) {
              const nodeLength = node.textContent.length;
              if (currentOffset + nodeLength >= targetOffset) {
                // This is the node containing our target position
                targetNode = node;
                targetOffset = targetOffset - currentOffset;
                break;
              }
              currentOffset += nodeLength;
            }
          }
          
          // If we didn't find a suitable text node, use the first text node
          if (!targetNode) {
            for (let i = 0; i < textElement.childNodes.length; i++) {
              if (textElement.childNodes[i].nodeType === Node.TEXT_NODE) {
                targetNode = textElement.childNodes[i];
                targetOffset = Math.min(targetOffset, targetNode.textContent.length);
                break;
              }
            }
          }
        }
        
        // If we still don't have a target node, create one or use the element itself
        if (!targetNode) {
          if (textElement.textContent) {
            // There's text content but no text nodes, create a text node
            const textNode = document.createTextNode(textElement.textContent);
            textElement.innerHTML = '';
            textElement.appendChild(textNode);
            targetNode = textNode;
            targetOffset = Math.min(cursorPosition, textNode.textContent.length);
          } else {
            // No text content, place cursor at the beginning of the element
            range.setStart(textElement, 0);
            range.setEnd(textElement, 0);
            selection.removeAllRanges();
            selection.addRange(range);
            return;
          }
        }
        
        // Ensure offset is within bounds
        if (targetNode && targetNode.textContent) {
          targetOffset = Math.min(targetOffset, targetNode.textContent.length);
          targetOffset = Math.max(0, targetOffset);
          
          range.setStart(targetNode, targetOffset);
          range.setEnd(targetNode, targetOffset);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      } catch (error) {
        console.warn('Could not restore cursor position:', error);
        // Fallback: just focus the element without setting cursor position
        try {
          textElement.focus();
        } catch (focusError) {
          console.warn('Could not focus element:', focusError);
        }
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