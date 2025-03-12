// PositionManager - Handles node position adjustment functionality
const PositionManager = (function() {
  // Private variables
  let currentLanguage = 'en';
  let currentModalNodeId = null;
  
  // Initialize the manager
  function initialize() {
    // Get the initial language setting
    currentLanguage = localStorage.getItem('preferredLanguage') || 'en';
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
    modalTitle.textContent = 'Adjust Node Position';
    
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
    currentPositionInfo.innerHTML = '<p>Loading position information...</p>';
    modalBody.appendChild(currentPositionInfo);
    
    // Position input
    const positionLabel = document.createElement('label');
    positionLabel.textContent = 'New Position (0-based index):';
    modalBody.appendChild(positionLabel);
    
    const positionInput = document.createElement('input');
    positionInput.type = 'number';
    positionInput.min = '0';
    positionInput.className = 'position-input';
    positionInput.placeholder = 'Enter new position';
    modalBody.appendChild(positionInput);
    
    // Create modal footer
    const modalFooter = document.createElement('div');
    modalFooter.className = 'modal-footer';
    
    const applyButton = document.createElement('button');
    applyButton.className = 'btn btn-primary';
    applyButton.textContent = 'Apply';
    applyButton.addEventListener('click', () => {
      const newPosition = parseInt(positionInput.value, 10);
      adjustNodePosition(nodeId, newPosition);
    });
    
    const cancelButton = document.createElement('button');
    cancelButton.className = 'btn btn-secondary';
    cancelButton.textContent = 'Cancel';
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
      
      // Update position info
      const parentInfo = node.parent_id 
        ? `under parent node "${currentLanguage === 'en' 
            ? siblings[0].content 
            : (siblings[0].content_zh || siblings[0].content)}"`
        : 'at root level';
      
      currentPositionInfo.innerHTML = `
        <p>Current position: <strong>${node.position}</strong> ${parentInfo}</p>
        <p>Total siblings: <strong>${siblings.length}</strong> (Valid positions: 0-${siblings.length - 1})</p>
      `;
      
      // Focus the input
      setTimeout(() => {
        positionInput.focus();
        positionInput.select();
      }, 100);
    } catch (error) {
      console.error('Error getting node info:', error);
      currentPositionInfo.innerHTML = '<p class="error">Error loading position information</p>';
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
      
      // Refresh the outliner
      if (window.fetchNodes) {
        await window.fetchNodes();
      }
      closeModal();
    } catch (error) {
      console.error(`Error adjusting position for node ${nodeId}:`, error);
      alert('Error adjusting node position');
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
    modalTitle.textContent = 'Move Node';
    
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
    searchContainer.className = 'search-container';
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'node-search';
    searchInput.placeholder = 'Type to search for a parent node...';
    
    const searchResults = document.createElement('div');
    searchResults.className = 'search-results';
    
    searchContainer.appendChild(searchInput);
    searchContainer.appendChild(searchResults);
    
    // Hidden input to store the selected node ID
    const selectedNodeInput = document.createElement('input');
    selectedNodeInput.type = 'hidden';
    selectedNodeInput.id = 'selected-parent-id';
    
    // Selected node display
    const selectedNodeDisplay = document.createElement('div');
    selectedNodeDisplay.className = 'selected-node';
    selectedNodeDisplay.innerHTML = '<span class="no-selection">No parent node selected (will become a root node)</span>';
    
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
          searchResults.innerHTML = '<div class="no-results">No matching nodes found</div>';
          return;
        }
        
        results.forEach(node => {
          const resultItem = document.createElement('div');
          resultItem.className = 'search-result-item';
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
        searchResults.innerHTML = '<div class="search-error">Error searching nodes</div>';
      }
    }, 300));
    
    // Position selection
    const positionLabel = document.createElement('label');
    positionLabel.textContent = 'Position:';
    
    const positionInput = document.createElement('input');
    positionInput.type = 'number';
    positionInput.min = '0';
    positionInput.value = '0';
    positionInput.className = 'position-input';
    positionInput.placeholder = 'Position (0 = first child)';
    
    // Move button
    const moveButton = document.createElement('button');
    moveButton.className = 'btn btn-primary';
    moveButton.textContent = 'Move Node';
    moveButton.addEventListener('click', () => {
      moveNodeToParent(nodeId, selectedNodeInput.value, parseInt(positionInput.value, 10));
    });
    
    // Make root node button
    const makeRootButton = document.createElement('button');
    makeRootButton.className = 'btn btn-secondary';
    makeRootButton.textContent = 'Make Root Node';
    makeRootButton.addEventListener('click', () => {
      moveNodeToParent(nodeId, null, parseInt(positionInput.value, 10));
    });
    
    modalBody.appendChild(document.createElement('label')).textContent = 'Search for a parent node:';
    modalBody.appendChild(searchContainer);
    modalBody.appendChild(document.createElement('label')).textContent = 'Selected parent:';
    modalBody.appendChild(selectedNodeDisplay);
    modalBody.appendChild(selectedNodeInput);
    modalBody.appendChild(positionLabel);
    modalBody.appendChild(positionInput);
    
    // Create modal footer
    const modalFooter = document.createElement('div');
    modalFooter.className = 'modal-footer';
    
    const cancelButton = document.createElement('button');
    cancelButton.className = 'btn btn-secondary';
    cancelButton.textContent = 'Cancel';
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
      
      // Refresh the outliner
      if (window.fetchNodes) {
        await window.fetchNodes();
      }
      closeModal();
    } catch (error) {
      console.error('Error moving node:', error);
      alert('Error moving node');
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
        if (window.fetchNodes) {
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