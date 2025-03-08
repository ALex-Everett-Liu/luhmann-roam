document.addEventListener('DOMContentLoaded', () => {
  const outlinerContainer = document.getElementById('outliner-container');
  const addRootNodeButton = document.getElementById('add-root-node');
  const languageToggle = document.getElementById('language-toggle');
  
  let nodes = [];
  let currentLanguage = localStorage.getItem('preferredLanguage') || 'en';
  
  // Update language toggle button text
  function updateLanguageToggle() {
    languageToggle.textContent = currentLanguage === 'en' ? 'Switch to Chinese' : '切换到英文';
  }
  
  // Toggle language
  function toggleLanguage() {
    currentLanguage = currentLanguage === 'en' ? 'zh' : 'en';
    localStorage.setItem('preferredLanguage', currentLanguage);
    updateLanguageToggle();
    renderOutliner();
  }
  
  // Fetch top-level nodes
  async function fetchNodes() {
    try {
      const response = await fetch(`/api/nodes?lang=${currentLanguage}`);
      nodes = await response.json();
      renderOutliner();
    } catch (error) {
      console.error('Error fetching nodes:', error);
    }
  }
  
  // Fetch children for a node
  async function fetchChildren(nodeId) {
    try {
      const response = await fetch(`/api/nodes/${nodeId}/children?lang=${currentLanguage}`);
      return await response.json();
    } catch (error) {
      console.error(`Error fetching children for node ${nodeId}:`, error);
      return [];
    }
  }
  
  // Render the outliner
  async function renderOutliner() {
    outlinerContainer.innerHTML = '';
    
    for (const node of nodes) {
      const nodeElement = await createNodeElement(node);
      outlinerContainer.appendChild(nodeElement);
    }
    
    setupDragAndDrop();
  }
  
  // Create a node element
  async function createNodeElement(node) {
    const nodeDiv = document.createElement('div');
    nodeDiv.className = 'node';
    nodeDiv.dataset.id = node.id;
    
    // Node content
    const nodeContent = document.createElement('div');
    nodeContent.className = 'node-content';
    
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
    
    nodeText.addEventListener('blur', () => {
      if (currentLanguage === 'en') {
        updateNodeContent(node.id, nodeText.textContent, node.content_zh);
      } else {
        updateNodeContent(node.id, node.content, nodeText.textContent);
      }
    });
    nodeText.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addChildNode(node.id);
      }
    });
    nodeContent.appendChild(nodeText);
    
    // Node actions
    const nodeActions = document.createElement('div');
    nodeActions.className = 'node-actions';
    
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
      const updateData = { content, content_zh };
      
      await fetch(`/api/nodes/${nodeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
    } catch (error) {
      console.error(`Error updating node ${nodeId}:`, error);
    }
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
  
  // Event listeners
  addRootNodeButton.addEventListener('click', addRootNode);
  languageToggle.addEventListener('click', toggleLanguage);
  
  // Initial setup
  updateLanguageToggle();
  fetchNodes();
}); 