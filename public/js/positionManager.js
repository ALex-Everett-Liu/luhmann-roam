// PositionManager - Handles node position adjustment functionality
const PositionManager = (function() {
  // Private variables
  let currentLanguage = 'en';
  let currentModalNodeId = null;
  
  // Initialize the manager
  function initialize() {
    // Get the initial language setting from I18n if available
    if (window.I18n) {
      currentLanguage = I18n.getCurrentLanguage();
    } else {
      currentLanguage = localStorage.getItem('preferredLanguage') || 'en';
    }
    console.log('PositionManager initialized with language:', currentLanguage);
  }
  
  // Update language setting
  function updateLanguage(language) {
    currentLanguage = language;
    console.log('PositionManager language updated to:', currentLanguage);
  }
  
  // Create position adjustment modal
  function createPositionAdjustModal(nodeId) {
    // Create overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    
    // Create modal container
    const modal = document.createElement('div');
    modal.className = 'modal';
    
    // Create modal header
    const modalHeader = document.createElement('div');
    modalHeader.className = 'modal-header';
    
    const modalTitle = document.createElement('div');
    modalTitle.className = 'modal-title';
    modalTitle.textContent = window.I18n ? I18n.t('adjustPosition') : 'Adjust Node Position';
    
    const closeButton = document.createElement('button');
    closeButton.className = 'modal-close';
    closeButton.innerHTML = '&times;';
    closeButton.addEventListener('click', closeModal);
    
    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeButton);
    
    // Create modal body
    const modalBody = document.createElement('div');
    modalBody.className = 'modal-body';
    
    // Current position info
    const currentPositionInfo = document.createElement('div');
    currentPositionInfo.className = 'current-position-info';
    currentPositionInfo.innerHTML = `<p>${window.I18n ? I18n.t('loadingPositionInfo') : 'Loading position information...'}</p>`;
    modalBody.appendChild(currentPositionInfo);
    
    // Position input
    const positionLabel = document.createElement('label');
    positionLabel.textContent = window.I18n ? I18n.t('newPosition') : 'New Position (0-based index):';
    modalBody.appendChild(positionLabel);
    
    const positionInput = document.createElement('input');
    positionInput.type = 'number';
    positionInput.min = '0';
    positionInput.className = 'position-input';
    positionInput.placeholder = window.I18n ? I18n.t('enterNewPosition') : 'Enter new position';
    modalBody.appendChild(positionInput);
    
    // Create modal footer
    const modalFooter = document.createElement('div');
    modalFooter.className = 'modal-footer';
    
    const applyButton = document.createElement('button');
    applyButton.className = 'btn btn-primary';
    applyButton.textContent = window.I18n ? I18n.t('apply') : 'Apply';
    applyButton.addEventListener('click', () => {
      const newPosition = parseInt(positionInput.value, 10);
      adjustNodePosition(nodeId, newPosition);
    });
    
    const cancelButton = document.createElement('button');
    cancelButton.className = 'btn btn-secondary';
    cancelButton.textContent = window.I18n ? I18n.t('cancel') : 'Cancel';
    cancelButton.addEventListener('click', closeModal);
    
    modalFooter.appendChild(cancelButton);
    modalFooter.appendChild(applyButton);
    
    // Assemble the modal
    modal.appendChild(modalHeader);
    modal.appendChild(modalBody);
    modal.appendChild(modalFooter);
    modalOverlay.appendChild(modal);
    
    return { modalOverlay, positionInput, currentPositionInfo };
  }
  
  // Open position adjustment modal
  async function openPositionAdjustModal(nodeId) {
    const { modalOverlay, positionInput, currentPositionInfo } = createPositionAdjustModal(nodeId);
    document.body.appendChild(modalOverlay);
    
    currentModalNodeId = nodeId;
    
    try {
      // Get current node info
      const response = await fetch(`/api/nodes/${nodeId}`);
      const node = await response.json();
      
      // Get sibling nodes to show total count
      let siblings = [];
      if (node.parent_id) {
        const siblingsResponse = await fetch(`/api/nodes/${node.parent_id}/children`);
        siblings = await siblingsResponse.json();
      } else {
        // Root node - get all root nodes
        const rootsResponse = await fetch('/api/nodes');
        siblings = await rootsResponse.json();
      }
      
      // Set current position in the input
      positionInput.value = node.position;
      positionInput.max = siblings.length - 1;
      
      // Update position info using I18n
      const nodeContent = currentLanguage === 'en' ? 
        node.content : (node.content_zh || node.content);
      
      let parentInfoText;
      if (node.parent_id) {
        const parentNodeContent = currentLanguage === 'en' ? 
          siblings[0].content : (siblings[0].content_zh || siblings[0].content);
          
        if (window.I18n) {
          parentInfoText = I18n.t('underParent', { parent: parentNodeContent });
        } else {
          parentInfoText = `under parent node "${parentNodeContent}"`;
        }
      } else {
        parentInfoText = window.I18n ? I18n.t('atRootLevel') : 'at root level';
      }
      
      const currentPosText = window.I18n ? 
        I18n.t('currentPosition', { position: node.position }) : 
        `Current position: <strong>${node.position}</strong>`;
        
      const totalSiblingsText = window.I18n ? 
        I18n.t('totalSiblings', { count: siblings.length, validPositions: `0-${siblings.length - 1}` }) : 
        `Total siblings: <strong>${siblings.length}</strong> (Valid positions: 0-${siblings.length - 1})`;
      
      currentPositionInfo.innerHTML = `
        <p>${currentPosText} ${parentInfoText}</p>
        <p>${totalSiblingsText}</p>
      `;
      
      // Focus the input
      setTimeout(() => {
        positionInput.focus();
        positionInput.select();
      }, 100);
    } catch (error) {
      console.error('Error getting node info:', error);
      currentPositionInfo.innerHTML = `<p class="error">${window.I18n ? I18n.t('errorLoadingPositionInfo') : 'Error loading position information'}</p>`;
    }
  }
  
  // Close modal
  function closeModal() {
    const modalOverlay = document.querySelector('.modal-overlay');
    if (modalOverlay) {
      document.body.removeChild(modalOverlay);
    }
    currentModalNodeId = null;
  }
  
  // Adjust node position
  async function adjustNodePosition(nodeId, newPosition) {
    try {
      // Get the node to find its parent
      const response = await fetch(`/api/nodes/${nodeId}`);
      const node = await response.json();
      
      if (node.position === newPosition) {
        // No change needed
        closeModal();
        return;
      }
      
      // Use the reorder API to move the node
      await fetch('/api/nodes/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nodeId: nodeId,
          newParentId: node.parent_id, // Keep the same parent
          newPosition: newPosition
        })
      });
      
      // OPTIMIZATION: Use refreshSubtree or refresh relevant parent subtree
      if (window.NodeOperationsManager && window.NodeOperationsManager.refreshSubtree) {
        if (node.parent_id) {
          // Refresh the parent's subtree if node has a parent
          await window.NodeOperationsManager.refreshSubtree(node.parent_id);
        } else {
          // For root nodes, we need to refresh the whole tree
          // since there's no single parent to refresh
          await window.fetchNodes();
        }
      } else {
        // Fallback to full refresh
        if (window.fetchNodes) {
          await window.fetchNodes();
        }
      }
      closeModal();
    } catch (error) {
      console.error(`Error adjusting position for node ${nodeId}:`, error);
      alert(window.I18n ? I18n.t('errorAdjustingPosition') : 'Error adjusting node position');
    }
  }
  
  // Create move node modal
  function createMoveNodeModal(nodeId) {
    // Create overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    
    // Create modal container
    const modal = document.createElement('div');
    modal.className = 'modal';
    
    // Create modal header
    const modalHeader = document.createElement('div');
    modalHeader.className = 'modal-header';
    
    const modalTitle = document.createElement('div');
    modalTitle.className = 'modal-title';
    modalTitle.textContent = window.I18n ? I18n.t('moveNode') : 'Move Node';
    
    const closeButton = document.createElement('button');
    closeButton.className = 'modal-close';
    closeButton.innerHTML = '&times;';
    closeButton.addEventListener('click', closeModal);
    
    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeButton);
    
    // Create modal body
    const modalBody = document.createElement('div');
    modalBody.className = 'modal-body';
    
    // Search container
    const searchContainer = document.createElement('div');
    searchContainer.className = 'position-search-container';
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'position-search-input';
    searchInput.placeholder = window.I18n ? I18n.t('searchParentNodePlaceholder') : 'Type to search for a parent node...';
    
    const searchResults = document.createElement('div');
    searchResults.className = 'position-search-results';
    
    searchContainer.appendChild(searchInput);
    searchContainer.appendChild(searchResults);
    
    // Hidden input to store the selected node ID
    const selectedNodeInput = document.createElement('input');
    selectedNodeInput.type = 'hidden';
    selectedNodeInput.id = 'selected-parent-id';
    
    // Selected node display
    const selectedNodeDisplay = document.createElement('div');
    selectedNodeDisplay.className = 'selected-node';
    selectedNodeDisplay.innerHTML = `<span class="no-selection">${window.I18n ? I18n.t('noParentSelected') : 'No parent node selected (will become a root node)'}</span>`;
    
    // Add search functionality
    searchInput.addEventListener('input', debounce(async (e) => {
      const query = e.target.value.trim();
      if (query.length < 2) {
        searchResults.innerHTML = '';
        return;
      }
      
      try {
        const response = await fetch(`/api/nodes/search?q=${encodeURIComponent(query)}&excludeId=${nodeId}`);
        const results = await response.json();
        
        searchResults.innerHTML = '';
        
        if (results.length === 0) {
          searchResults.innerHTML = `<div class="position-no-results">${window.I18n ? I18n.t('noMatchingNodes') : 'No matching nodes found'}</div>`;
          return;
        }
        
        results.forEach(node => {
          const resultItem = document.createElement('div');
          resultItem.className = 'position-search-result-item';
          resultItem.dataset.id = node.id;
          
          const nodeContent = currentLanguage === 'en' ? node.content : (node.content_zh || node.content);
          resultItem.textContent = nodeContent;
          
          resultItem.addEventListener('click', () => {
            // Set the selected node
            selectedNodeInput.value = node.id;
            selectedNodeDisplay.innerHTML = `<div class="selected-node-content">${nodeContent}</div>`;
            searchResults.innerHTML = '';
            searchInput.value = '';
          });
          
          searchResults.appendChild(resultItem);
        });
      } catch (error) {
        console.error('Error searching nodes:', error);
        searchResults.innerHTML = `<div class="position-search-error">${window.I18n ? I18n.t('errorSearchingNodes') : 'Error searching nodes'}</div>`;
      }
    }, 300));
    
    // Position selection
    const positionLabel = document.createElement('label');
    positionLabel.textContent = window.I18n ? I18n.t('position') : 'Position:';
    
    const positionInput = document.createElement('input');
    positionInput.type = 'number';
    positionInput.min = '0';
    positionInput.value = '0';
    positionInput.className = 'position-input';
    positionInput.placeholder = window.I18n ? I18n.t('positionPlaceholder') : 'Position (0 = first child)';
    
    // Move button
    const moveButton = document.createElement('button');
    moveButton.className = 'btn btn-primary';
    moveButton.textContent = window.I18n ? I18n.t('moveNode') : 'Move Node';
    moveButton.addEventListener('click', () => {
      moveNodeToParent(nodeId, selectedNodeInput.value, parseInt(positionInput.value, 10));
    });
    
    // Make root node button
    const makeRootButton = document.createElement('button');
    makeRootButton.className = 'btn btn-secondary';
    makeRootButton.textContent = window.I18n ? I18n.t('makeRootNode') : 'Make Root Node';
    makeRootButton.addEventListener('click', () => {
      moveNodeToParent(nodeId, null, parseInt(positionInput.value, 10));
    });
    
    const searchLabel = document.createElement('label');
    searchLabel.textContent = window.I18n ? I18n.t('searchForParentNode') : 'Search for a parent node:';
    modalBody.appendChild(searchLabel);
    modalBody.appendChild(searchContainer);
    
    const selectedLabel = document.createElement('label');
    selectedLabel.textContent = window.I18n ? I18n.t('selectedParent') : 'Selected parent:';
    modalBody.appendChild(selectedLabel);
    modalBody.appendChild(selectedNodeDisplay);
    modalBody.appendChild(selectedNodeInput);
    modalBody.appendChild(positionLabel);
    modalBody.appendChild(positionInput);
    
    // Create modal footer
    const modalFooter = document.createElement('div');
    modalFooter.className = 'modal-footer';
    
    const cancelButton = document.createElement('button');
    cancelButton.className = 'btn btn-secondary';
    cancelButton.textContent = window.I18n ? I18n.t('cancel') : 'Cancel';
    cancelButton.addEventListener('click', closeModal);
    
    modalFooter.appendChild(makeRootButton);
    modalFooter.appendChild(cancelButton);
    modalFooter.appendChild(moveButton);
    
    // Assemble the modal
    modal.appendChild(modalHeader);
    modal.appendChild(modalBody);
    modal.appendChild(modalFooter);
    modalOverlay.appendChild(modal);
    
    return { modalOverlay, selectedNodeInput, positionInput };
  }
  
  // Open move node modal
  async function openMoveNodeModal(nodeId) {
    const { modalOverlay, selectedNodeInput, positionInput } = createMoveNodeModal(nodeId);
    document.body.appendChild(modalOverlay);
    
    currentModalNodeId = nodeId;
    
    // Get current node info to set default values
    try {
      const response = await fetch(`/api/nodes/${nodeId}`);
      const node = await response.json();
      
      if (node.parent_id) {
        // If it has a parent, get parent info
        const parentResponse = await fetch(`/api/nodes/${node.parent_id}`);
        const parentNode = await parentResponse.json();
        
        // Set the parent as the default selected node
        selectedNodeInput.value = parentNode.id;
        const parentContent = currentLanguage === 'en' ? parentNode.content : (parentNode.content_zh || parentNode.content);
        const selectedNodeDisplay = document.querySelector('.selected-node');
        selectedNodeDisplay.innerHTML = `<div class="selected-node-content">${parentContent}</div>`;
        
        // Set current position
        positionInput.value = node.position;
      } else {
        // It's a root node, set position
        positionInput.value = node.position;
      }
    } catch (error) {
      console.error('Error getting node info:', error);
    }
  }
  
  // Move node to new parent
  async function moveNodeToParent(nodeId, parentId, position) {
    try {
      // Get the original node data before moving
      const nodeResponse = await fetch(`/api/nodes/${nodeId}`);
      const originalNode = await nodeResponse.json();
      const originalParentId = originalNode.parent_id;
      
      await fetch('/api/nodes/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nodeId: nodeId,
          newParentId: parentId,
          newPosition: position
        })
      });
      
      // If moving to a parent, ensure the parent is expanded
      if (parentId) {
        await fetch(`/api/nodes/${parentId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            is_expanded: true
          })
        });
      }
      
      // OPTIMIZATION: Use refreshSubtree for affected subtrees
      if (window.NodeOperationsManager && window.NodeOperationsManager.refreshSubtree) {
        const refreshPromises = [];
        
        // Refresh original parent's subtree if it exists
        if (originalParentId) {
          refreshPromises.push(window.NodeOperationsManager.refreshSubtree(originalParentId));
        }
        
        // Refresh new parent's subtree if it exists and is different
        if (parentId && parentId !== originalParentId) {
          refreshPromises.push(window.NodeOperationsManager.refreshSubtree(parentId));
        }
        
        // If both parents are null (moving between root nodes), refresh everything
        if (!originalParentId && !parentId) {
          await window.fetchNodes();
        } else {
          // Wait for all refreshes to complete
          await Promise.all(refreshPromises);
        }
      } else {
        // Fallback to full refresh
        if (window.fetchNodes) {
          await window.fetchNodes();
        }
      }
      closeModal();
    } catch (error) {
      console.error('Error moving node:', error);
      alert(window.I18n ? I18n.t('errorMovingNode') : 'Error moving node');
    }
  }
  
  // Fix node positions
  async function fixNodePositions(nodeId) {
    try {
      console.log(`Fixing positions for siblings of node ${nodeId}...`);
      
      // Get the node to find its parent
      const response = await fetch(`/api/nodes/${nodeId}`);
      const node = await response.json();
      console.log('Current node:', node);
      
      // Get all siblings (including the node itself)
      let siblings;
      if (node.parent_id) {
        console.log(`Getting children of parent ${node.parent_id}`);
        const siblingsResponse = await fetch(`/api/nodes/${node.parent_id}/children`);
        siblings = await siblingsResponse.json();
      } else {
        console.log('Node is a root node, getting all root nodes');
        const rootsResponse = await fetch('/api/nodes');
        siblings = await rootsResponse.json();
      }
      
      console.log('All siblings before fix:', siblings);
      
      // Check for duplicate positions
      const positionCounts = {};
      siblings.forEach(sibling => {
        positionCounts[sibling.position] = (positionCounts[sibling.position] || 0) + 1;
      });
      
      const hasDuplicates = Object.values(positionCounts).some(count => count > 1);
      
      if (hasDuplicates) {
        console.log('Duplicate positions detected:', positionCounts);
        console.log('Will normalize all positions...');
        
        // Sort siblings by ID to maintain a consistent order
        siblings.sort((a, b) => a.id.localeCompare(b.id));
        
        // Update each sibling with consecutive positions
        for (let i = 0; i < siblings.length; i++) {
          const sibling = siblings[i];
          console.log(`Setting node ${sibling.id} position from ${sibling.position} to ${i}`);
          
          await fetch(`/api/nodes/${sibling.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              position: i
            })
          });
        }
        
        console.log('Position fix completed, refreshing data...');
        
        // OPTIMIZATION: Use refreshSubtree if possible
        if (window.NodeOperationsManager && window.NodeOperationsManager.refreshSubtree && node.parent_id) {
          // If node has a parent, refresh that parent's subtree
          await window.NodeOperationsManager.refreshSubtree(node.parent_id);
        } else if (window.fetchNodes) {
          // Otherwise refresh all nodes with forced cache bust
          await window.fetchNodes(true);
        }
        
        return { fixed: true, siblings };
      } else {
        console.log('No duplicate positions found, no fix needed');
        return { fixed: false, siblings };
      }
    } catch (error) {
      console.error('Error fixing node positions:', error);
      return { error: error.message };
    }
  }
  
  // Simple debounce function to prevent too many API calls
  function debounce(func, wait) {
    let timeout;
    return function(...args) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  }
  
  // Public API
  return {
    initialize,
    updateLanguage,
    openPositionAdjustModal,
    openMoveNodeModal,
    fixNodePositions
  };
})();

// Make it available globally
window.PositionManager = PositionManager; 