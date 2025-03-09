document.addEventListener('DOMContentLoaded', () => {
  // ================================================================
  // ALL APPLICATION CODE AND FUNCTIONS SHOULD BE DEFINED INSIDE HERE
  // =
  const outlinerContainer = document.getElementById('outliner-container');
  const addRootNodeButton = document.getElementById('add-root-node');
  const languageToggle = document.getElementById('language-toggle');
  
  // Variables and state
  let nodes = [];
  let currentLanguage = localStorage.getItem('preferredLanguage') || 'en';
  let currentModalNodeId = null;
  
  // Add link-related state
  let currentNodeLinks = { outgoing: [], incoming: [] };
  
  // Add this variable to track the currently focused node
  let lastFocusedNodeId = null;
  
  // Application functions
  // Update language toggle button text
  function updateLanguageToggle() {
    languageToggle.textContent = currentLanguage === 'en' ? 'Switch to Chinese' : '切换到英文';
  }
  
  // Toggle language
  function toggleLanguage() {
    currentLanguage = currentLanguage === 'en' ? 'zh' : 'en';
    localStorage.setItem('preferredLanguage', currentLanguage);
    updateLanguageToggle();
    console.log(`Language switched to ${currentLanguage}, forcing fresh data load`);
    fetchNodes(true); // Pass true to force fresh data
  }
  
  // Create modal elements
  function createModal() {
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
    modalTitle.textContent = 'Markdown Notes';
    
    const closeButton = document.createElement('button');
    closeButton.className = 'modal-close';
    closeButton.innerHTML = '&times;';
    closeButton.addEventListener('click', closeModal);
    
    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeButton);
    
    // Create modal body
    const modalBody = document.createElement('div');
    modalBody.className = 'modal-body';
    
    const textarea = document.createElement('textarea');
    textarea.className = 'markdown-editor';
    textarea.placeholder = 'Write your markdown notes here...';
    modalBody.appendChild(textarea);
    
    // Create modal footer
    const modalFooter = document.createElement('div');
    modalFooter.className = 'modal-footer';
    
    const saveButton = document.createElement('button');
    saveButton.className = 'btn btn-primary';
    saveButton.textContent = 'Save';
    saveButton.addEventListener('click', saveMarkdown);
    
    const deleteButton = document.createElement('button');
    deleteButton.className = 'btn btn-danger';
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', deleteMarkdown);
    
    const cancelButton = document.createElement('button');
    cancelButton.className = 'btn btn-secondary';
    cancelButton.textContent = 'Cancel';
    cancelButton.addEventListener('click', closeModal);
    
    modalFooter.appendChild(deleteButton);
    modalFooter.appendChild(cancelButton);
    modalFooter.appendChild(saveButton);
    
    // Assemble the modal
    modal.appendChild(modalHeader);
    modal.appendChild(modalBody);
    modal.appendChild(modalFooter);
    modalOverlay.appendChild(modal);
    
    return { modalOverlay, textarea };
  }
  
  
  // Close modal
  function closeModal() {
    const modalOverlay = document.querySelector('.modal-overlay');
    if (modalOverlay) {
      document.body.removeChild(modalOverlay);
    }
    currentModalNodeId = null;
  }
  
  
  // Fetch top-level nodes
  async function fetchNodes(forceFresh = false) {
    // Save scroll position before updating
    const scrollPosition = window.scrollY;
    console.log(`Saving scroll position: ${scrollPosition}px`);
    
    try {
      // Add cache-busting parameter to prevent stale data
      const cacheBuster = forceFresh ? `&_=${Date.now()}` : '';
      console.log(`Fetching nodes with lang=${currentLanguage}${forceFresh ? ' (forced fresh load)' : ''}`);
      const response = await fetch(`/api/nodes?lang=${currentLanguage}${cacheBuster}`);
      nodes = await response.json();
      await renderOutliner();
      
      // Restore scroll position after rendering is complete
      setTimeout(() => {
        console.log(`Restoring scroll position to: ${scrollPosition}px`);
        window.scrollTo(0, scrollPosition);
        
        // Verify the scroll position was actually set
        setTimeout(() => {
          console.log(`Current scroll position after restore: ${window.scrollY}px`);
        }, 50);
      }, 10);
    } catch (error) {
      console.error('Error fetching nodes:', error);
    }
  }
  
  // Fetch children for a node
  async function fetchChildren(nodeId, forceFresh = false) {
    try {
      // Add cache-busting parameter to prevent stale data
      const cacheBuster = forceFresh ? `&_=${Date.now()}` : '';
      const response = await fetch(`/api/nodes/${nodeId}/children?lang=${currentLanguage}${cacheBuster}`);
      return await response.json();
    } catch (error) {
      console.error(`Error fetching children for node ${nodeId}:`, error);
      return [];
    }
  }
  
  // Render the outliner
  async function renderOutliner() {
    const scrollPosition = window.scrollY;
    console.log(`Saving scroll position: ${scrollPosition}px`);
    
    outlinerContainer.innerHTML = '';
    
    for (const node of nodes) {
      const nodeElement = await createNodeElement(node);
      outlinerContainer.appendChild(nodeElement);
    }
    
    setupDragAndDrop();
    
    // Try to restore scroll position
    setTimeout(() => {
      // First try to find and scroll to the last focused node
      if (lastFocusedNodeId) {
        const focusedElement = document.querySelector(`.node[data-id="${lastFocusedNodeId}"]`);
        if (focusedElement) {
          console.log(`Scrolling to last focused node: ${lastFocusedNodeId}`);
          focusedElement.scrollIntoView({ behavior: 'auto', block: 'center' });
          
          // Add a brief highlight effect
          focusedElement.classList.add('highlight-focus');
          setTimeout(() => {
            focusedElement.classList.remove('highlight-focus');
          }, 1000);
          
          return;
        }
      }
      
      // Fall back to the saved scroll position if we can't find the focused node
      console.log(`Restoring scroll position to: ${scrollPosition}px`);
      window.scrollTo(0, scrollPosition);
    }, 10);
  }
  
  // Create a node element
  async function createNodeElement(node) {
    const nodeDiv = document.createElement('div');
    nodeDiv.className = 'node';
    nodeDiv.dataset.id = node.id;
    
    // Node content
    const nodeContent = document.createElement('div');
    nodeContent.className = 'node-content';
    
    // Add 'has-markdown' class if node has markdown
    if (node.has_markdown) {
      nodeContent.classList.add('has-markdown');
    }
    
    // Drag handle
    const dragHandle = document.createElement('span');
    dragHandle.className = 'drag-handle';
    dragHandle.innerHTML = '⋮⋮';
    dragHandle.draggable = true;
    dragHandle.dataset.id = node.id;
    nodeContent.appendChild(dragHandle);
    
    // Collapse/expand button
    const children = await fetchChildren(node.id);
    if (children.length > 0) {
      const collapseIcon = document.createElement('span');
      collapseIcon.className = 'collapse-icon';
      collapseIcon.innerHTML = node.is_expanded ? '▼' : '►';
      collapseIcon.addEventListener('click', () => toggleNode(node.id));
      nodeContent.appendChild(collapseIcon);
    } else {
      const bullet = document.createElement('span');
      bullet.className = 'bullet';
      bullet.innerHTML = '•';
      nodeContent.appendChild(bullet);
    }
    
    // Node text
    const nodeText = document.createElement('div');
    nodeText.className = 'node-text';
    nodeText.contentEditable = true;
    
    // Display content based on current language
    const displayContent = currentLanguage === 'en' ? node.content : (node.content_zh || node.content);
    nodeText.textContent = displayContent;
    
    // Add link count if the node has links
    if (node.link_count && node.link_count > 0) {
      const linkCount = document.createElement('sup');
      linkCount.className = 'link-count';
      linkCount.textContent = node.link_count;
      nodeText.appendChild(linkCount);
    }
    
    // Add focus tracking to the node text
    nodeText.addEventListener('focus', () => {
      lastFocusedNodeId = node.id;
      console.log(`Node ${node.id} focused`);
    });
    
    nodeText.addEventListener('blur', async () => {
      console.log(`Node ${node.id} blur event triggered`);
      let originalContent = currentLanguage === 'en' ? node.content : node.content_zh;
      let savedContent = nodeText.textContent;
      
      // Handle removing the link count from the content if present
      const linkCountElement = nodeText.querySelector('.link-count');
      if (linkCountElement) {
        savedContent = nodeText.textContent.replace(linkCountElement.textContent, '');
      }
      
      // Only save if content has actually changed
      if (originalContent !== savedContent) {
        console.log(`Content changed from "${originalContent}" to "${savedContent}"`);
        
        let success;
        if (currentLanguage === 'en') {
          success = await updateNodeContent(node.id, savedContent, node.content_zh);
        } else {
          success = await updateNodeContent(node.id, node.content, savedContent);
        }
        
        if (!success) {
          console.error(`Failed to save node ${node.id}`);
          // Optionally show an error message to the user
        }
      } else {
        console.log(`No content change detected for node ${node.id}`);
      }
    });
    nodeText.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addChildNode(node.id);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
          // Outdent - Shift+Tab
          outdentNode(node.id);
        } else {
          // Indent - Tab
          indentNode(node.id);
        }
      } else if (e.key === 'ArrowUp' && e.altKey && e.shiftKey) {
        e.preventDefault();
        moveNodeUp(node.id);
      } else if (e.key === 'ArrowDown' && e.altKey && e.shiftKey) {
        e.preventDefault();
        moveNodeDown(node.id);
      } else if (e.key === 'm' && e.altKey) {
        // Alt+M to open move node modal
        e.preventDefault();
        openMoveNodeModal(node.id);
      } else if (e.key === '#' && e.altKey) {
        // Alt+# to open position adjustment modal
        e.preventDefault();
        openPositionAdjustModal(node.id);
      }
    });
    nodeContent.appendChild(nodeText);
    
    // Node actions
    const nodeActions = document.createElement('div');
    nodeActions.className = 'node-actions';
    
    // Position button
    const positionButton = document.createElement('button');
    positionButton.className = 'position-button';
    positionButton.innerHTML = '#';
    positionButton.title = 'Adjust position';
    positionButton.addEventListener('click', () => openPositionAdjustModal(node.id));
    nodeActions.appendChild(positionButton);
    
    // Link button
    const linkButton = document.createElement('button');
    linkButton.className = 'link-button';
    linkButton.innerHTML = '🔗';
    linkButton.title = 'Manage links';
    linkButton.addEventListener('click', () => openLinkModal(node.id));
    nodeActions.appendChild(linkButton);
    
    // Move node button
    const moveNodeButton = document.createElement('button');
    moveNodeButton.className = 'move-button';
    moveNodeButton.innerHTML = '📍';
    moveNodeButton.title = 'Move node';
    moveNodeButton.addEventListener('click', () => openMoveNodeModal(node.id));
    nodeActions.appendChild(moveNodeButton);
    
    // Add sibling before button
    const addSiblingBeforeButton = document.createElement('button');
    addSiblingBeforeButton.className = 'sibling-button';
    addSiblingBeforeButton.innerHTML = '↑+';
    addSiblingBeforeButton.title = 'Add sibling before';
    addSiblingBeforeButton.addEventListener('click', () => addSiblingNode(node.id, 'before'));
    nodeActions.appendChild(addSiblingBeforeButton);
    
    // Add sibling after button
    const addSiblingAfterButton = document.createElement('button');
    addSiblingAfterButton.className = 'sibling-button';
    addSiblingAfterButton.innerHTML = '↓+';
    addSiblingAfterButton.title = 'Add sibling after';
    addSiblingAfterButton.addEventListener('click', () => addSiblingNode(node.id, 'after'));
    nodeActions.appendChild(addSiblingAfterButton);
    
    // Markdown button
    const markdownButton = document.createElement('button');
    markdownButton.className = 'markdown-button';
    markdownButton.innerHTML = '📝';
    markdownButton.title = 'Edit markdown notes';
    markdownButton.addEventListener('click', () => MarkdownManager.openModal(node.id));
    nodeActions.appendChild(markdownButton);
    
    const addButton = document.createElement('button');
    addButton.innerHTML = '+';
    addButton.title = 'Add child node';
    addButton.addEventListener('click', () => addChildNode(node.id));
    nodeActions.appendChild(addButton);
    
    const deleteButton = document.createElement('button');
    deleteButton.innerHTML = '×';
    deleteButton.title = 'Delete node';
    deleteButton.addEventListener('click', () => deleteNode(node.id));
    nodeActions.appendChild(deleteButton);
    
    nodeContent.appendChild(nodeActions);
    nodeDiv.appendChild(nodeContent);
    
    // Children container
    if (children.length > 0 && node.is_expanded) {
      const childrenDiv = document.createElement('div');
      childrenDiv.className = 'children';
      
      for (const child of children) {
        const childElement = await createNodeElement(child);
        childrenDiv.appendChild(childElement);
      }
      
      nodeDiv.appendChild(childrenDiv);
    }
    
    return nodeDiv;
  }
  
  // Add a root node
  async function addRootNode() {
    try {
      // Get the highest position
      const maxPosition = nodes.length > 0 ? Math.max(...nodes.map(n => n.position)) + 1 : 0;
      
      const response = await fetch('/api/nodes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: currentLanguage === 'en' ? 'New node' : '',
          content_zh: currentLanguage === 'zh' ? '新节点' : '',
          parent_id: null,
          position: maxPosition
        })
      });
      
      const newNode = await response.json();
      nodes.push(newNode);
      renderOutliner();
    } catch (error) {
      console.error('Error adding root node:', error);
    }
  }
  
  // Add a child node
  async function addChildNode(parentId) {
    try {
      // Get all children of this parent
      const children = await fetchChildren(parentId);
      const maxPosition = children.length > 0 ? Math.max(...children.map(n => n.position)) + 1 : 0;
      
      const response = await fetch('/api/nodes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: currentLanguage === 'en' ? 'New node' : '',
          content_zh: currentLanguage === 'zh' ? '新节点' : '',
          parent_id: parentId,
          position: maxPosition
        })
      });
      
      await response.json();
      
      // Make sure the parent is expanded
      await fetch(`/api/nodes/${parentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          is_expanded: true
        })
      });
      
      // Refresh the outliner
      fetchNodes();
    } catch (error) {
      console.error(`Error adding child node to ${parentId}:`, error);
    }
  }
  
  // Update node content
  async function updateNodeContent(nodeId, content, content_zh) {
    try {
        console.log(`Saving node ${nodeId}:`, { content, content_zh });
        const updateData = {};
        
        if (content !== null) {
          updateData.content = content;
        }
        
        if (content_zh !== null) {
          updateData.content_zh = content_zh;
        }
        
        console.log(`Sending update request for node ${nodeId} with data:`, updateData);
        
        const response = await fetch(`/api/nodes/${nodeId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error(`Error saving node ${nodeId}:`, errorData);
          return false;
        }
        
        const updatedNode = await response.json();
        console.log(`Successfully saved node ${nodeId}:`, updatedNode);
        
        // Update the node in our local data structure to ensure consistency
        updateLocalNodeData(nodeId, updateData);
        
        return true;
      } catch (error) {
        console.error(`Error updating node ${nodeId}:`, error);
        return false;
      }
    }
    
    // Helper function to update local node data after a successful save
    function updateLocalNodeData(nodeId, updateData) {
      // Update in the top-level nodes array if present
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].id === nodeId) {
          if (updateData.content !== undefined) {
            nodes[i].content = updateData.content;
          }
          if (updateData.content_zh !== undefined) {
            nodes[i].content_zh = updateData.content_zh;
          }
          console.log(`Updated local data for top-level node ${nodeId}`);
          return;
        }
      }
      
      // If not found at top level, it might be a child node
      // We'll handle this in a future update if needed
      console.log(`Node ${nodeId} not found in top-level nodes, may be a child node`);
    }
  
  // Delete a node
  async function deleteNode(nodeId) {
    if (confirm('Are you sure you want to delete this node and all its children?')) {
      try {
        await fetch(`/api/nodes/${nodeId}`, {
          method: 'DELETE'
        });
        
        // Refresh the outliner
        fetchNodes();
      } catch (error) {
        console.error(`Error deleting node ${nodeId}:`, error);
      }
    }
  }
  
  // Toggle node expansion
  async function toggleNode(nodeId) {
    try {
      await fetch(`/api/nodes/${nodeId}/toggle`, {
        method: 'POST'
      });
      
      // Refresh the outliner
      fetchNodes();
    } catch (error) {
      console.error(`Error toggling node ${nodeId}:`, error);
    }
  }
  
  // Set up drag and drop
  function setupDragAndDrop() {
    const dragHandles = document.querySelectorAll('.drag-handle');
    const dropTargets = document.querySelectorAll('.node');
    
    let draggedNodeId = null;
    
    dragHandles.forEach(handle => {
      handle.addEventListener('dragstart', (e) => {
        draggedNodeId = handle.dataset.id;
        e.dataTransfer.setData('text/plain', draggedNodeId);
        
        // Add a delay to prevent the dragged element from disappearing immediately
        setTimeout(() => {
          handle.parentElement.parentElement.style.opacity = '0.4';
        }, 0);
      });
      
      handle.addEventListener('dragend', () => {
        handle.parentElement.parentElement.style.opacity = '1';
      });
    });
    
    dropTargets.forEach(target => {
      target.addEventListener('dragover', (e) => {
        e.preventDefault();
        
        const rect = target.getBoundingClientRect();
        const y = e.clientY - rect.top;
        
        if (y < rect.height / 3) {
          // Drop above
          target.style.borderTop = '2px solid #4285f4';
          target.style.borderBottom = '';
        } else if (y > rect.height * 2 / 3) {
          // Drop below
          target.style.borderBottom = '2px solid #4285f4';
          target.style.borderTop = '';
        } else {
          // Drop as child
          target.style.backgroundColor = '#e8f0fe';
          target.style.borderTop = '';
          target.style.borderBottom = '';
        }
      });
      
      target.addEventListener('dragleave', () => {
        target.style.borderTop = '';
        target.style.borderBottom = '';
        target.style.backgroundColor = '';
      });
      
      target.addEventListener('drop', async (e) => {
        e.preventDefault();
        
        const targetNodeId = target.dataset.id;
        if (draggedNodeId === targetNodeId) return;
        
        target.style.borderTop = '';
        target.style.borderBottom = '';
        target.style.backgroundColor = '';
        
        const rect = target.getBoundingClientRect();
        const y = e.clientY - rect.top;
        
        try {
          if (y < rect.height / 3) {
            // Drop above
            const targetNode = await (await fetch(`/api/nodes/${targetNodeId}`)).json();
            
            await fetch('/api/nodes/reorder', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                nodeId: draggedNodeId,
                newParentId: targetNode.parent_id,
                newPosition: targetNode.position
              })
            });
          } else if (y > rect.height * 2 / 3) {
            // Drop below
            const targetNode = await (await fetch(`/api/nodes/${targetNodeId}`)).json();
            
            await fetch('/api/nodes/reorder', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                nodeId: draggedNodeId,
                newParentId: targetNode.parent_id,
                newPosition: targetNode.position + 1
              })
            });
          } else {
            // Drop as child
            const children = await fetchChildren(targetNodeId);
            const maxPosition = children.length > 0 ? Math.max(...children.map(n => n.position)) + 1 : 0;
            
            await fetch('/api/nodes/reorder', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                nodeId: draggedNodeId,
                newParentId: targetNodeId,
                newPosition: maxPosition
              })
            });
            
            // Ensure the target is expanded
            await fetch(`/api/nodes/${targetNodeId}`, {
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
          fetchNodes();
        } catch (error) {
          console.error('Error reordering nodes:', error);
        }
      });
    });
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
        return;
      }
      
      // Refresh the outliner
      fetchNodes();
    } catch (error) {
      console.error(`Error indenting node ${nodeId}:`, error);
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
        return;
      }
      
      // Refresh the outliner
      fetchNodes();
    } catch (error) {
      console.error(`Error outdenting node ${nodeId}:`, error);
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
        return;
      }
      
      // Refresh the outliner
      fetchNodes();
    } catch (error) {
      console.error(`Error moving node ${nodeId} up:`, error);
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
        return;
      }
      
      // Refresh the outliner
      fetchNodes();
    } catch (error) {
      console.error(`Error moving node ${nodeId} down:`, error);
    }
  }
  
  // Create link modal
  function createLinkModal(nodeId) {
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
    modalTitle.textContent = 'Manage Links';
    
    const closeButton = document.createElement('button');
    closeButton.className = 'modal-close';
    closeButton.innerHTML = '&times;';
    closeButton.addEventListener('click', closeLinkModal);
    
    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeButton);
    
    // Create modal body
    const modalBody = document.createElement('div');
    modalBody.className = 'modal-body';
    
    // Create tabs
    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'tabs-container';
    
    const createTab = document.createElement('div');
    createTab.className = 'tab active';
    createTab.textContent = 'Create Link';
    createTab.dataset.tab = 'create';
    
    const manageTab = document.createElement('div');
    manageTab.className = 'tab';
    manageTab.textContent = 'Manage Links';
    manageTab.dataset.tab = 'manage';
    
    tabsContainer.appendChild(createTab);
    tabsContainer.appendChild(manageTab);
    
    // Create tab content
    const tabContent = document.createElement('div');
    tabContent.className = 'tab-content';
    
    // Create Link tab content
    const createTabContent = document.createElement('div');
    createTabContent.className = 'tab-pane active';
    createTabContent.dataset.tab = 'create';
    
    // Replace dropdown with search input
    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'node-search';
    searchInput.placeholder = 'Type to search for nodes...';
    
    const searchResults = document.createElement('div');
    searchResults.className = 'search-results';
    
    searchContainer.appendChild(searchInput);
    searchContainer.appendChild(searchResults);
    
    // Hidden input to store the selected node ID
    const selectedNodeInput = document.createElement('input');
    selectedNodeInput.type = 'hidden';
    selectedNodeInput.id = 'selected-node-id';
    
    // Selected node display
    const selectedNodeDisplay = document.createElement('div');
    selectedNodeDisplay.className = 'selected-node';
    selectedNodeDisplay.innerHTML = '<span class="no-selection">No node selected</span>';
    
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
    
    const weightInput = document.createElement('input');
    weightInput.type = 'number';
    weightInput.min = '0';
    weightInput.step = '0.1';
    weightInput.value = '1.0';
    weightInput.className = 'weight-input';
    weightInput.placeholder = 'Link weight (0.1-10)';
    
    const descriptionInput = document.createElement('textarea');
    descriptionInput.className = 'description-input';
    descriptionInput.placeholder = 'Link description (optional)';
    
    const createLinkButton = document.createElement('button');
    createLinkButton.className = 'btn btn-primary';
    createLinkButton.textContent = 'Create Link';
    createLinkButton.addEventListener('click', () => {
      createLink(nodeId, selectedNodeInput.value, parseFloat(weightInput.value), descriptionInput.value);
    });
    
    createTabContent.appendChild(document.createElement('label')).textContent = 'Search for a node:';
    createTabContent.appendChild(searchContainer);
    createTabContent.appendChild(document.createElement('label')).textContent = 'Selected node:';
    createTabContent.appendChild(selectedNodeDisplay);
    createTabContent.appendChild(selectedNodeInput);
    createTabContent.appendChild(document.createElement('label')).textContent = 'Link Weight:';
    createTabContent.appendChild(weightInput);
    createTabContent.appendChild(document.createElement('label')).textContent = 'Description:';
    createTabContent.appendChild(descriptionInput);
    createTabContent.appendChild(createLinkButton);
    
    // Manage Links tab content
    const manageTabContent = document.createElement('div');
    manageTabContent.className = 'tab-pane';
    manageTabContent.dataset.tab = 'manage';
    
    const linksContainer = document.createElement('div');
    linksContainer.className = 'links-container';
    
    // Outgoing links section
    const outgoingLinksSection = document.createElement('div');
    outgoingLinksSection.className = 'links-section';
    outgoingLinksSection.innerHTML = '<h3>Outgoing Links</h3>';
    
    const outgoingLinksList = document.createElement('ul');
    outgoingLinksList.className = 'links-list outgoing-links';
    outgoingLinksSection.appendChild(outgoingLinksList);
    
    // Incoming links section
    const incomingLinksSection = document.createElement('div');
    incomingLinksSection.className = 'links-section';
    incomingLinksSection.innerHTML = '<h3>Incoming Links</h3>';
    
    const incomingLinksList = document.createElement('ul');
    incomingLinksList.className = 'links-list incoming-links';
    incomingLinksSection.appendChild(incomingLinksList);
    
    linksContainer.appendChild(outgoingLinksSection);
    linksContainer.appendChild(incomingLinksSection);
    manageTabContent.appendChild(linksContainer);
    
    // Add tab content to modal
    tabContent.appendChild(createTabContent);
    tabContent.appendChild(manageTabContent);
    
    // Add tab switching functionality
    createTab.addEventListener('click', () => {
      createTab.classList.add('active');
      manageTab.classList.remove('active');
      createTabContent.classList.add('active');
      manageTabContent.classList.remove('active');
    });
    
    manageTab.addEventListener('click', () => {
      manageTab.classList.add('active');
      createTab.classList.remove('active');
      manageTabContent.classList.add('active');
      createTabContent.classList.remove('active');
      
      // Refresh links when switching to manage tab
      fetchNodeLinks(nodeId);
    });
    
    modalBody.appendChild(tabsContainer);
    modalBody.appendChild(tabContent);
    
    // Create modal footer
    const modalFooter = document.createElement('div');
    modalFooter.className = 'modal-footer';
    
    const closeModalButton = document.createElement('button');
    closeModalButton.className = 'btn btn-secondary';
    closeModalButton.textContent = 'Close';
    closeModalButton.addEventListener('click', closeLinkModal);
    
    modalFooter.appendChild(closeModalButton);
    
    // Assemble the modal
    modal.appendChild(modalHeader);
    modal.appendChild(modalBody);
    modal.appendChild(modalFooter);
    modalOverlay.appendChild(modal);
    
    return { modalOverlay, selectedNodeInput, weightInput, descriptionInput };
  }
  
  // Open link modal
  async function openLinkModal(nodeId) {
    const { modalOverlay } = createLinkModal(nodeId);
    document.body.appendChild(modalOverlay);
    
    currentModalNodeId = nodeId;
    
    // Fetch links for this node
    await fetchNodeLinks(nodeId);
  }
  
  // Close link modal
  function closeLinkModal() {
    const modalOverlay = document.querySelector('.modal-overlay');
    if (modalOverlay) {
      document.body.removeChild(modalOverlay);
    }
    currentModalNodeId = null;
    currentNodeLinks = { outgoing: [], incoming: [] };
  }
  
  // Fetch links for a node
  async function fetchNodeLinks(nodeId) {
    try {
      const response = await fetch(`/api/nodes/${nodeId}/links`);
      currentNodeLinks = await response.json();
      
      // Update the links lists
      updateLinksList();
    } catch (error) {
      console.error('Error fetching node links:', error);
    }
  }
  
  // Update links list in the modal
  function updateLinksList() {
    const outgoingLinksList = document.querySelector('.outgoing-links');
    const incomingLinksList = document.querySelector('.incoming-links');
    
    if (!outgoingLinksList || !incomingLinksList) return;
    
    // Clear existing lists
    outgoingLinksList.innerHTML = '';
    incomingLinksList.innerHTML = '';
    
    // Add outgoing links
    if (currentNodeLinks.outgoing.length === 0) {
      outgoingLinksList.innerHTML = '<li class="no-links">No outgoing links</li>';
    } else {
      currentNodeLinks.outgoing.forEach(link => {
        const li = document.createElement('li');
        li.className = 'link-item';
        
        const nodeContent = currentLanguage === 'en' ? link.content : (link.content_zh || link.content);
        
        li.innerHTML = `
          <div class="link-info">
            <div class="link-target">${nodeContent}</div>
            <div class="link-weight">Weight: ${link.weight}</div>
            <div class="link-description">${link.description || 'No description'}</div>
          </div>
          <div class="link-actions">
            <button class="link-edit" data-id="${link.id}">Edit</button>
            <button class="link-delete" data-id="${link.id}">Delete</button>
          </div>
        `;
        
        // Add event listeners
        li.querySelector('.link-edit').addEventListener('click', () => {
          editLink(link.id, link.weight, link.description);
        });
        
        li.querySelector('.link-delete').addEventListener('click', () => {
          deleteLink(link.id);
        });
        
        outgoingLinksList.appendChild(li);
      });
    }
    
    // Add incoming links
    if (currentNodeLinks.incoming.length === 0) {
      incomingLinksList.innerHTML = '<li class="no-links">No incoming links</li>';
    } else {
      currentNodeLinks.incoming.forEach(link => {
        const li = document.createElement('li');
        li.className = 'link-item';
        
        const nodeContent = currentLanguage === 'en' ? link.content : (link.content_zh || link.content);
        
        li.innerHTML = `
          <div class="link-info">
            <div class="link-source">${nodeContent}</div>
            <div class="link-weight">Weight: ${link.weight}</div>
            <div class="link-description">${link.description || 'No description'}</div>
          </div>
        `;
        
        incomingLinksList.appendChild(li);
      });
    }
  }
  
  // Create a new link
  async function createLink(fromNodeId, toNodeId, weight, description) {
    if (!toNodeId) {
      alert('Please select a target node');
      return;
    }
    
    try {
      const response = await fetch('/api/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from_node_id: fromNodeId,
          to_node_id: toNodeId,
          weight,
          description
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || 'Error creating link');
        return;
      }
      
      // Refresh links
      await fetchNodeLinks(fromNodeId);
      
      // Switch to manage tab
      document.querySelector('.tab[data-tab="manage"]').click();
      
      // Clear form
      document.querySelector('.node-search').value = '';
      document.querySelector('.weight-input').value = '1.0';
      document.querySelector('.description-input').value = '';
    } catch (error) {
      console.error('Error creating link:', error);
      alert('Error creating link');
    }
  }
  
  // Edit a link
  async function editLink(linkId, currentWeight, currentDescription) {
    // Create edit link modal
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    
    // Create modal header
    const modalHeader = document.createElement('div');
    modalHeader.className = 'modal-header';
    
    const modalTitle = document.createElement('div');
    modalTitle.className = 'modal-title';
    modalTitle.textContent = 'Edit Link';
    
    const closeButton = document.createElement('button');
    closeButton.className = 'modal-close';
    closeButton.innerHTML = '&times;';
    closeButton.addEventListener('click', () => {
      document.body.removeChild(modalOverlay);
    });
    
    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeButton);
    
    // Create modal body
    const modalBody = document.createElement('div');
    modalBody.className = 'modal-body';
    
    // Weight input
    const weightLabel = document.createElement('label');
    weightLabel.textContent = 'Link Weight:';
    modalBody.appendChild(weightLabel);
    
    const weightInput = document.createElement('input');
    weightInput.type = 'number';
    weightInput.min = '0';
    weightInput.step = '0.1';
    weightInput.value = currentWeight;
    weightInput.className = 'weight-input';
    modalBody.appendChild(weightInput);
    
    // Description input
    const descriptionLabel = document.createElement('label');
    descriptionLabel.textContent = 'Description:';
    modalBody.appendChild(descriptionLabel);
    
    const descriptionInput = document.createElement('textarea');
    descriptionInput.className = 'description-input';
    descriptionInput.value = currentDescription || '';
    modalBody.appendChild(descriptionInput);
    
    // Create modal footer
    const modalFooter = document.createElement('div');
    modalFooter.className = 'modal-footer';
    
    const cancelButton = document.createElement('button');
    cancelButton.className = 'btn btn-secondary';
    cancelButton.textContent = 'Cancel';
    cancelButton.addEventListener('click', () => {
      document.body.removeChild(modalOverlay);
    });
    
    const saveButton = document.createElement('button');
    saveButton.className = 'btn btn-primary';
    saveButton.textContent = 'Save';
    saveButton.addEventListener('click', async () => {
      try {
        const response = await fetch(`/api/links/${linkId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            weight: parseFloat(weightInput.value),
            description: descriptionInput.value
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          alert(errorData.error || 'Error updating link');
          return;
        }
        
        // Refresh links
        await fetchNodeLinks(currentModalNodeId);
        
        // Close modal
        document.body.removeChild(modalOverlay);
      } catch (error) {
        console.error('Error updating link:', error);
        alert('Error updating link');
      }
    });
    
    modalFooter.appendChild(cancelButton);
    modalFooter.appendChild(saveButton);
    
    // Assemble the modal
    modal.appendChild(modalHeader);
    modal.appendChild(modalBody);
    modal.appendChild(modalFooter);
    modalOverlay.appendChild(modal);
    
    // Add to document
    document.body.appendChild(modalOverlay);
    
    // Focus the weight input
    setTimeout(() => {
      weightInput.focus();
    }, 100);
  }
  
  // Delete a link
  async function deleteLink(linkId) {
    if (!confirm('Are you sure you want to delete this link?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/links/${linkId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || 'Error deleting link');
        return;
      }
      
      // Refresh links
      await fetchNodeLinks(currentModalNodeId);
    } catch (error) {
      console.error('Error deleting link:', error);
      alert('Error deleting link');
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
      
      // Create the new node
      await fetch('/api/nodes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: currentLanguage === 'en' ? 'New node' : '',
          content_zh: currentLanguage === 'zh' ? '新节点' : '',
          parent_id: node.parent_id,
          position: newPosition
        })
      });
      
      // Refresh the outliner
      fetchNodes();
    } catch (error) {
      console.error(`Error adding sibling node to ${nodeId}:`, error);
    }
  }
  
  // ===================================================================
  // FEATURE: Move Node Modal
  // LOCATION: Inside DOMContentLoaded event listener
  // DEPENDENCIES: fetchNodes, debounce, currentLanguage
  // ===================================================================
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
    closeButton.addEventListener('click', closeMoveNodeModal);
    
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
    cancelButton.addEventListener('click', closeMoveNodeModal);
    
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
  
  // Close move node modal
  function closeMoveNodeModal() {
    const modalOverlay = document.querySelector('.modal-overlay');
    if (modalOverlay) {
      document.body.removeChild(modalOverlay);
    }
    currentModalNodeId = null;
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
      fetchNodes();
      closeMoveNodeModal();
    } catch (error) {
      console.error('Error moving node:', error);
      alert('Error moving node');
    }
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
    closeButton.addEventListener('click', closePositionAdjustModal);
    
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
    cancelButton.addEventListener('click', closePositionAdjustModal);
    
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
  
  // Close position adjustment modal
  function closePositionAdjustModal() {
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
        closePositionAdjustModal();
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
      fetchNodes();
      closePositionAdjustModal();
    } catch (error) {
      console.error(`Error adjusting position for node ${nodeId}:`, error);
      alert('Error adjusting node position');
    }
  }
  
  // Test and fix node positions
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
        // (or you could use another criterion like creation date if available)
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
        await fetchNodes(true);
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

  // Add this right after the fixNodePositions function definition
  window.fixNodePositions = fixNodePositions;
  
  // Save changes function - provides visual feedback
  function saveChanges() {
    const saveButton = document.getElementById('save-changes');
    const originalText = saveButton.textContent;
    
    // Change button text to show saving in progress
    saveButton.textContent = 'Saving...';
    saveButton.disabled = true;
    
    // Actually try to manually save by refreshing data from server
    console.log('Save button clicked, forcing fresh data load from server');
    fetchNodes(true).then(() => {
      console.log('Data refreshed from server with forced fresh load');
      
      saveButton.textContent = 'Saved!';
      
      // Reset button after 2 seconds
      setTimeout(() => {
        saveButton.textContent = originalText;
        saveButton.disabled = false;
      }, 2000);
    }).catch(error => {
      console.error('Error refreshing data:', error);
      saveButton.textContent = 'Error!';
      
      setTimeout(() => {
        saveButton.textContent = originalText;
        saveButton.disabled = false;
      }, 2000);
    });
  }

  // Add this function to check container settings
  function checkContainerSettings() {
    const contentContainer = document.querySelector('.content');
    if (contentContainer) {
      const styles = window.getComputedStyle(contentContainer);
      console.log('Content container settings:');
      console.log(`- Height: ${styles.height}`);
      console.log(`- Max Height: ${styles.maxHeight}`);
      console.log(`- Overflow: ${styles.overflow}`);
      console.log(`- Overflow-Y: ${styles.overflowY}`);
      
      // If the container doesn't have proper overflow settings, fix them
      if (styles.overflowY !== 'auto' && styles.overflowY !== 'scroll') {
        console.log('Fixing container overflow settings');
        contentContainer.style.overflowY = 'auto';
      }
    }
  }
  
  // Event listeners
  addRootNodeButton.addEventListener('click', addRootNode);
  languageToggle.addEventListener('click', toggleLanguage);
  
  // Add event listener for save changes button
  const saveChangesButton = document.getElementById('save-changes');
  saveChangesButton.addEventListener('click', saveChanges);
  
  // Initial setup
  updateLanguageToggle();

  // Call this function during initialization
  // Add this right before fetchNodes() in the initialization section
  checkContainerSettings();


  fetchNodes();

  // ================================================================
  // END OF APPLICATION CODE - DO NOT ADD FUNCTIONS BELOW THIS LINE
  // ================================================================


}); 