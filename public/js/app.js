document.addEventListener('DOMContentLoaded', () => {
  // ================================================================
  // ALL APPLICATION CODE AND FUNCTIONS SHOULD BE DEFINED INSIDE HERE
  // =
  const outlinerContainer = document.getElementById('outliner-container');
  const addRootNodeButton = document.getElementById('add-root-node');
  const languageToggle = document.getElementById('language-toggle');
  
  // Variables and state
  let nodes = [];
  let currentModalNodeId = null;
  
  // Add this variable to track the currently focused node
  let lastFocusedNodeId = null;
  
  // Application functions
  // Update language toggle button text
  function updateLanguageToggle() {
    const toggleButton = document.getElementById('language-toggle');
    toggleButton.textContent = I18n.t('switchToLanguage');
  }
  
  // Toggle language
  function toggleLanguage() {
    I18n.toggleLanguage();
  }
  
  
  // Fetch top-level nodes
  async function fetchNodes(forceFresh = false) {
    // Save scroll position before updating
    const scrollPosition = window.scrollY;
    console.log(`Saving scroll position: ${scrollPosition}px`);
    
    try {
      // Add cache-busting parameter to prevent stale data
      const cacheBuster = forceFresh ? `&_=${Date.now()}` : '';
      const currentLanguage = I18n.getCurrentLanguage();
      console.log(`Fetching nodes with lang=${currentLanguage}${forceFresh ? ' (forced fresh load)' : ''}`);
      const response = await fetch(`/api/nodes?lang=${currentLanguage}${cacheBuster}`);
      nodes = await response.json();
      await renderOutliner();
      
      // Reapply filters after rendering
      if (window.FilterManager) {
        FilterManager.applyFilters();
      }
      
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
      const currentLanguage = I18n.getCurrentLanguage();
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
    
    // Use DragDropManager instead of local function
    if (window.DragDropManager) {
      DragDropManager.setupDragAndDrop();
    }
    
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
    
    // Display content based on current language from I18n
    const currentLanguage = I18n.getCurrentLanguage();
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
      
      // Fetch the latest node data to ensure we have current values
      const nodeResponse = await fetch(`/api/nodes/${node.id}`);
      const currentNode = await nodeResponse.json();
      
      const currentLanguage = I18n.getCurrentLanguage();
      let originalContent = currentLanguage === 'en' ? currentNode.content : currentNode.content_zh;
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
          success = await updateNodeContent(node.id, savedContent, currentNode.content_zh);
        } else {
          success = await updateNodeContent(node.id, currentNode.content, savedContent);
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
        PositionManager.openMoveNodeModal(node.id);
      } else if (e.key === '#' && e.altKey) {
        // Alt+# to open position adjustment modal
        e.preventDefault();
        PositionManager.openPositionAdjustModal(node.id);
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
    positionButton.addEventListener('click', () => PositionManager.openPositionAdjustModal(node.id));
    nodeActions.appendChild(positionButton);
    
    // Timestamp button
    const timestampButton = document.createElement('button');
    timestampButton.className = 'timestamp-button';
    timestampButton.innerHTML = '🕒';
    timestampButton.title = 'View timestamps';
    timestampButton.addEventListener('click', () => TimestampManager.openModal(node.id));
    nodeActions.appendChild(timestampButton);
    
    // Link button
    const linkButton = document.createElement('button');
    linkButton.className = 'link-button';
    linkButton.innerHTML = '🔗';
    linkButton.title = 'Manage links';
    linkButton.addEventListener('click', () => LinkManager.openModal(node.id));
    nodeActions.appendChild(linkButton);
    
    // Move node button
    const moveNodeButton = document.createElement('button');
    moveNodeButton.className = 'move-button';
    moveNodeButton.innerHTML = '📍';
    moveNodeButton.title = 'Move node';
    moveNodeButton.addEventListener('click', () => PositionManager.openMoveNodeModal(node.id));
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
    
    // Add attribute button directly in the action buttons creation flow
    if (window.AttributeManager) {
      const attributeButton = document.createElement('button');
      attributeButton.className = 'attribute-button';
      attributeButton.innerHTML = '📊';
      attributeButton.title = 'Manage attributes';
      attributeButton.addEventListener('click', () => AttributeManager.openModal(node.id));
      nodeActions.appendChild(attributeButton);
    }
    
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
    
    // After creating the node element and before returning it
    if (window.BreadcrumbManager) {
      BreadcrumbManager.addNodeFocusHandler(nodeDiv, node.id);
    }
    
    return nodeDiv;
  }
  
  // Add a root node
  async function addRootNode() {
    try {
      // Get the highest position
      const maxPosition = nodes.length > 0 ? Math.max(...nodes.map(n => n.position)) + 1 : 0;
      
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
      // Store whether we're in focus mode before the operation
      const wasInFocusMode = window.BreadcrumbManager && window.BreadcrumbManager.isInFocusMode();
      
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
      
      // Make sure parent is expanded
      if (!parentNode.is_expanded) {
        await fetch(`/api/nodes/${parentId}/toggle`, {
          method: 'POST'
        });
      }
      
      // Refresh the outliner
      await fetchNodes(true);
      
      // Restore focus state if we were in focus mode
      if (wasInFocusMode && window.BreadcrumbManager) {
        window.BreadcrumbManager.focusOnNode(parentId);
      }
      
      // Set this as the last focused node
      lastFocusedNodeId = parentId;
    } catch (error) {
      console.error('Error adding child node:', error);
    }
  }
  
  // Update node content
  async function updateNodeContent(nodeId, content, content_zh) {
    try {
      console.log(`Saving node ${nodeId}:`, { content, content_zh });
      const updateData = {};
      
      // Check if this is the first edit of a default node
      let isFirstEdit = false;
      
      // Fetch the current node data directly from the server to ensure accuracy
      console.log(`Fetching current node data for ${nodeId} to check if it's a first edit`);
      const nodeResponse = await fetch(`/api/nodes/${nodeId}`);
      const node = await nodeResponse.json();
      
      console.log(`Current node data:`, node);
      
      // Define default content values using I18n
      const defaultEnContent = I18n.t('newNode');
      const defaultZhContent = I18n.t('newNode');
      
      // Check if the node still has default content in either language field
      if ((node.content === defaultEnContent || node.content === defaultZhContent) && 
          (node.content_zh === defaultEnContent || node.content_zh === defaultZhContent)) {
        isFirstEdit = true;
        console.log(`First edit detected for node ${nodeId} - will update both language fields`);
      }
      
      // For first edit, update both language fields with the same content
      if (isFirstEdit) {
        // Use I18n.getCurrentLanguage() instead of currentLanguage
        const currentLanguage = I18n.getCurrentLanguage();
        const editedContent = currentLanguage === 'en' ? content : content_zh;
        console.log(`Using ${currentLanguage} content for both fields: "${editedContent}"`);
        
        updateData.content = editedContent;
        updateData.content_zh = editedContent;
      } else {
        // Use I18n.getCurrentLanguage() instead of currentLanguage
        const currentLanguage = I18n.getCurrentLanguage();
        console.log(`Not first edit, only updating ${currentLanguage} content`);
        if (content !== null) {
          updateData.content = content;
        }
        
        if (content_zh !== null) {
          updateData.content_zh = content_zh;
        }
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
  
  // Helper function to find a node by ID in our local data structure
  function findNodeById(nodeId) {
    // First check top-level nodes
    for (const node of nodes) {
      if (node.id === nodeId) {
        return node;
      }
      
      // Recursively check children if the node has any
      if (node.children) {
        const found = findNodeInChildren(node.children, nodeId);
        if (found) return found;
      }
    }
    
    // Node not found in our local data
    return null;
  }
  
  // Helper function to recursively search for a node in children
  function findNodeInChildren(children, nodeId) {
    if (!children || children.length === 0) return null;
    
    for (const child of children) {
      if (child.id === nodeId) {
        return child;
      }
      
      if (child.children) {
        const found = findNodeInChildren(child.children, nodeId);
        if (found) return found;
      }
    }
    
    return null;
  }
  
  // Delete a node
  async function deleteNode(nodeId) {
    if (confirm(I18n.t('confirmDeleteNode'))) {
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
      await preserveFocusState(async () => {
        await fetch(`/api/nodes/${nodeId}/toggle`, {
          method: 'POST'
        });
        
        // Refresh the outliner
        await fetchNodes();
        
        // Reapply filters after the nodes are refreshed
        if (window.FilterManager) {
          FilterManager.applyFilters();
        }
      });
    } catch (error) {
      console.error(`Error toggling node ${nodeId}:`, error);
    }
  }
  
  // Indent a node (make it a child of the node above)
  async function indentNode(nodeId) {
    try {
      await preserveFocusState(async () => {
        const response = await fetch(`/api/nodes/${nodeId}/indent`, {
          method: 'POST'
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error(errorData.error);
          return;
        }
        
        // Refresh the outliner
        await fetchNodes();
      });
    } catch (error) {
      console.error(`Error indenting node ${nodeId}:`, error);
    }
  }
  
  // Outdent a node (make it a sibling of its parent)
  async function outdentNode(nodeId) {
    try {
      await preserveFocusState(async () => {
        const response = await fetch(`/api/nodes/${nodeId}/outdent`, {
          method: 'POST'
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error(errorData.error);
          return;
        }
        
        // Refresh the outliner
        await fetchNodes();
      });
    } catch (error) {
      console.error(`Error outdenting node ${nodeId}:`, error);
    }
  }
  
  // Move node up
  async function moveNodeUp(nodeId) {
    try {
      await preserveFocusState(async () => {
        const response = await fetch(`/api/nodes/${nodeId}/move-up`, {
          method: 'POST'
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error(errorData.error);
          return;
        }
        
        // Refresh the outliner
        await fetchNodes();
      });
    } catch (error) {
      console.error(`Error moving node ${nodeId} up:`, error);
    }
  }
  
  // Move node down
  async function moveNodeDown(nodeId) {
    try {
      await preserveFocusState(async () => {
        const response = await fetch(`/api/nodes/${nodeId}/move-down`, {
          method: 'POST'
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error(errorData.error);
          return;
        }
        
        // Refresh the outliner
        await fetchNodes();
      });
    } catch (error) {
      console.error(`Error moving node ${nodeId} down:`, error);
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
      await preserveFocusState(async () => {
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
        await fetchNodes();
      });
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
 
  // Add this right after the fixNodePositions function definition
  window.fixNodePositions = function(nodeId) {
    if (window.PositionManager) {
      return PositionManager.fixNodePositions(nodeId);
    } else {
      console.error('PositionManager not available');
      return Promise.resolve({ error: 'PositionManager not available' });
    }
  };
  
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
  
  // Add this function to set up the resizable sidebar
  function setupResizableSidebar() {
    const appContainer = document.querySelector('.app-container');
    const sidebar = document.querySelector('.sidebar');
    const content = document.querySelector('.content');
    
    // Create the resize handle with a visible grip
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'resize-handle';
    resizeHandle.innerHTML = '<div class="resize-grip"></div>';
    
    // Insert the handle between sidebar and content
    appContainer.insertBefore(resizeHandle, content);
    
    // Get the initial sidebar width from localStorage or use default
    const savedWidth = localStorage.getItem('sidebarWidth');
    if (savedWidth) {
      sidebar.style.width = savedWidth + 'px';
      // Also update the handle position
      resizeHandle.style.left = `${parseInt(savedWidth)}px`;
    }
    
    // Variables for tracking resize state
    let isResizing = false;
    
    // Mouse down event on the resize handle
    resizeHandle.addEventListener('mousedown', (e) => {
      isResizing = true;
      
      // Add a class to the body during resize to prevent text selection
      document.body.classList.add('resizing');
      
      // Prevent text selection during resize
      e.preventDefault();
    });
    
    // Mouse move event for resizing
    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      
      // Calculate new width based on mouse position
      const newWidth = Math.max(200, Math.min(e.clientX, window.innerWidth * 0.8));
      
      // Update sidebar width
      sidebar.style.width = `${newWidth}px`;
      
      // Update handle position
      resizeHandle.style.left = `${newWidth}px`;
      
      // Save the width to localStorage
      localStorage.setItem('sidebarWidth', newWidth);
    });
    
    // Mouse up event to stop resizing
    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        document.body.classList.remove('resizing');
      }
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
      // Make sure sidebar doesn't exceed max width when window is resized
      const currentWidth = parseInt(getComputedStyle(sidebar).width);
      const maxWidth = window.innerWidth * 0.8;
      
      if (currentWidth > maxWidth) {
        sidebar.style.width = maxWidth + 'px';
        resizeHandle.style.left = `${maxWidth}px`;
        localStorage.setItem('sidebarWidth', maxWidth);
      }
    });
  }
  
  // Event listeners
  addRootNodeButton.addEventListener('click', addRootNode);
  languageToggle.addEventListener('click', I18n.toggleLanguage);
  
  // Add event listener for save changes button
  const saveChangesButton = document.getElementById('save-changes');
  saveChangesButton.addEventListener('click', saveChanges);
  
  // Initial setup
  updateLanguageToggle();

  // Call this function during initialization
  checkContainerSettings();
  
  // Set up resizable sidebar
  setupResizableSidebar();

  // Initialize the FilterManager
  FilterManager.initialize();

  // Initialize the SearchManager
  SearchManager.initialize();

  // Initialize the BreadcrumbManager
  if (window.BreadcrumbManager) {
    BreadcrumbManager.initialize();
  }

  // Initialize the PositionManager
  if (window.PositionManager) {
    PositionManager.initialize();
  }

  // Initialize the TimestampManager
  if (window.TimestampManager) {
    TimestampManager.initialize();
  }

  // Initialize the TaskManager
  if (window.TaskManager) {
    TaskManager.initialize();
  }

  // Initialize the DragDropManager
  if (window.DragDropManager) {
    DragDropManager.initialize();
  }

  // Initialize the AttributeManager
  if (window.AttributeManager) {
    AttributeManager.initialize();
  }

  // Make fetchNodes available globally for the SearchManager
  window.fetchNodes = fetchNodes;

  fetchNodes();

  // ================================================================
  // END OF APPLICATION CODE - DO NOT ADD FUNCTIONS BELOW THIS LINE
  // ================================================================

  // Helper function to preserve focus state across operations
  async function preserveFocusState(operation) {
    // Store whether we're in focus mode before the operation
    const wasInFocusMode = window.BreadcrumbManager && window.BreadcrumbManager.isInFocusMode();
    // Store the currently focused node ID if in focus mode
    const focusedNodeId = wasInFocusMode && window.BreadcrumbManager ? 
      currentModalNodeId || lastFocusedNodeId : null;
    
    try {
      // Run the provided operation
      await operation();
      
      // Restore focus state if we were in focus mode
      if (wasInFocusMode && window.BreadcrumbManager && focusedNodeId) {
        window.BreadcrumbManager.focusOnNode(focusedNodeId);
      }
    } catch (error) {
      console.error('Operation failed:', error);
      throw error;
    }
  }

  // Initialize I18n before other components
  I18n.initialize();

}); 