document.addEventListener('DOMContentLoaded', () => {
  const outlinerContainer = document.getElementById('outliner-container');
  const addRootNodeButton = document.getElementById('add-root-node');
  const languageToggle = document.getElementById('language-toggle');
  
  let nodes = [];
  let currentLanguage = localStorage.getItem('preferredLanguage') || 'en';
  let currentModalNodeId = null;
  
  // Add link-related state
  let currentNodeLinks = { outgoing: [], incoming: [] };
  
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
  
  // Open markdown modal
  async function openMarkdownModal(nodeId) {
    const { modalOverlay, textarea } = createModal();
    document.body.appendChild(modalOverlay);
    
    currentModalNodeId = nodeId;
    
    try {
      const response = await fetch(`/api/nodes/${nodeId}/markdown`);
      const data = await response.json();
      textarea.value = data.content;
      
      // Focus the textarea
      setTimeout(() => {
        textarea.focus();
      }, 100);
    } catch (error) {
      console.error('Error loading markdown:', error);
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
  
  // Save markdown
  async function saveMarkdown() {
    if (!currentModalNodeId) return;
    
    const textarea = document.querySelector('.markdown-editor');
    const content = textarea.value;
    
    try {
      await fetch(`/api/nodes/${currentModalNodeId}/markdown`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      });
      
      // Update UI
      fetchNodes();
      closeModal();
    } catch (error) {
      console.error('Error saving markdown:', error);
    }
  }
  
  // Delete markdown
  async function deleteMarkdown() {
    if (!currentModalNodeId) return;
    
    if (confirm('Are you sure you want to delete this markdown note?')) {
      try {
        await fetch(`/api/nodes/${currentModalNodeId}/markdown`, {
          method: 'DELETE'
        });
        
        // Update UI
        fetchNodes();
        closeModal();
      } catch (error) {
        console.error('Error deleting markdown:', error);
      }
    }
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
      }
    });
    nodeContent.appendChild(nodeText);
    
    // Node actions
    const nodeActions = document.createElement('div');
    nodeActions.className = 'node-actions';
    
    // Link button
    const linkButton = document.createElement('button');
    linkButton.className = 'link-button';
    linkButton.innerHTML = '🔗';
    linkButton.title = 'Manage links';
    linkButton.addEventListener('click', () => openLinkModal(node.id));
    nodeActions.appendChild(linkButton);
    
    // Markdown button
    const markdownButton = document.createElement('button');
    markdownButton.className = 'markdown-button';
    markdownButton.innerHTML = '📝';
    markdownButton.title = 'Edit markdown notes';
    markdownButton.addEventListener('click', () => openMarkdownModal(node.id));
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
    
    const nodeSelector = document.createElement('select');
    nodeSelector.className = 'node-selector';
    nodeSelector.innerHTML = '<option value="">Select a node to link to...</option>';
    
    // Populate node selector
    nodes.forEach(node => {
      if (node.id !== nodeId) {
        const option = document.createElement('option');
        option.value = node.id;
        option.textContent = node.content || node.content_zh || 'Untitled';
        nodeSelector.appendChild(option);
      }
    });
    
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
      createLink(nodeId, nodeSelector.value, parseFloat(weightInput.value), descriptionInput.value);
    });
    
    createTabContent.appendChild(document.createElement('label')).textContent = 'Target Node:';
    createTabContent.appendChild(nodeSelector);
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
    
    return { modalOverlay, nodeSelector, weightInput, descriptionInput };
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
      document.querySelector('.node-selector').value = '';
      document.querySelector('.weight-input').value = '1.0';
      document.querySelector('.description-input').value = '';
    } catch (error) {
      console.error('Error creating link:', error);
      alert('Error creating link');
    }
  }
  
  // Edit a link
  async function editLink(linkId, currentWeight, currentDescription) {
    const weight = prompt('Enter new weight:', currentWeight);
    if (weight === null) return;
    
    const description = prompt('Enter new description:', currentDescription || '');
    if (description === null) return;
    
    try {
      const response = await fetch(`/api/links/${linkId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          weight: parseFloat(weight),
          description
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || 'Error updating link');
        return;
      }
      
      // Refresh links
      await fetchNodeLinks(currentModalNodeId);
    } catch (error) {
      console.error('Error updating link:', error);
      alert('Error updating link');
    }
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
  
  // Event listeners
  addRootNodeButton.addEventListener('click', addRootNode);
  languageToggle.addEventListener('click', toggleLanguage);
  
  // Initial setup
  updateLanguageToggle();
  fetchNodes();
}); 