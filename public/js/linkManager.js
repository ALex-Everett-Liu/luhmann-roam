/**
 * Link Manager Module
 * Handles all link-related functionality for nodes
 */
const LinkManager = (function() {
  // Private variables
  let modalElement = null;
  let currentNodeId = null;
  let currentNodeLinks = { outgoing: [], incoming: [] };
  let currentLanguage = localStorage.getItem('preferredLanguage') || 'en';
  
  /**
   * Creates the link modal
   * @param {string} nodeId - The ID of the node
   * @returns {Object} Modal elements
   */
  function createModal(nodeId) {
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
    closeButton.addEventListener('click', closeModal);
    
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
    closeModalButton.addEventListener('click', closeModal);
    
    modalFooter.appendChild(closeModalButton);
    
    // Assemble the modal
    modal.appendChild(modalHeader);
    modal.appendChild(modalBody);
    modal.appendChild(modalFooter);
    modalOverlay.appendChild(modal);
    
    return { modalOverlay, selectedNodeInput, weightInput, descriptionInput };
  }
  
  /**
   * Opens the link modal for a specific node
   * @param {string} nodeId - The ID of the node
   */
  async function openLinkModal(nodeId) {
    currentNodeId = nodeId;
    const { modalOverlay } = createModal(nodeId);
    modalElement = modalOverlay;
    document.body.appendChild(modalOverlay);
    
    // Fetch links for this node
    await fetchNodeLinks(nodeId);
  }
  
  /**
   * Closes the link modal
   */
  function closeModal() {
    if (modalElement) {
      document.body.removeChild(modalElement);
      modalElement = null;
    }
    currentNodeId = null;
    currentNodeLinks = { outgoing: [], incoming: [] };
  }
  
  /**
   * Fetches links for a node
   * @param {string} nodeId - The ID of the node
   */
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
  
  /**
   * Updates the links list in the modal
   */
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
  
  /**
   * Creates a new link
   * @param {string} fromNodeId - The source node ID
   * @param {string} toNodeId - The target node ID
   * @param {number} weight - The link weight
   * @param {string} description - The link description
   */
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
      
      // Refresh the main UI to reflect changes
      if (window.fetchNodes) {
        window.fetchNodes();
      }
    } catch (error) {
      console.error('Error creating link:', error);
      alert('Error creating link');
    }
  }
  
  /**
   * Edits an existing link
   * @param {string} linkId - The ID of the link
   * @param {number} currentWeight - The current weight
   * @param {string} currentDescription - The current description
   */
  async function editLink(linkId, currentWeight, currentDescription) {
    // Create edit link modal
    const editModalOverlay = document.createElement('div');
    editModalOverlay.className = 'modal-overlay';
    
    const editModal = document.createElement('div');
    editModal.className = 'modal';
    
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
      document.body.removeChild(editModalOverlay);
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
      document.body.removeChild(editModalOverlay);
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
        await fetchNodeLinks(currentNodeId);
        
        // Close modal
        document.body.removeChild(editModalOverlay);
        
        // Refresh the main UI to reflect changes
        if (window.fetchNodes) {
          window.fetchNodes();
        }
      } catch (error) {
        console.error('Error updating link:', error);
        alert('Error updating link');
      }
    });
    
    modalFooter.appendChild(cancelButton);
    modalFooter.appendChild(saveButton);
    
    // Assemble the modal
    editModal.appendChild(modalHeader);
    editModal.appendChild(modalBody);
    editModal.appendChild(modalFooter);
    editModalOverlay.appendChild(editModal);
    
    // Add to document
    document.body.appendChild(editModalOverlay);
    
    // Focus the weight input
    setTimeout(() => {
      weightInput.focus();
    }, 100);
  }
  
  /**
   * Deletes a link
   * @param {string} linkId - The ID of the link
   */
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
      await fetchNodeLinks(currentNodeId);
      
      // Refresh the main UI to reflect changes
      if (window.fetchNodes) {
        window.fetchNodes();
      }
    } catch (error) {
      console.error('Error deleting link:', error);
      alert('Error deleting link');
    }
  }
  
  /**
   * Simple debounce function to prevent too many API calls
   * @param {Function} func - The function to debounce
   * @param {number} wait - The debounce wait time in milliseconds
   * @returns {Function} The debounced function
   */
  function debounce(func, wait) {
    let timeout;
    return function(...args) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  }
  
  /**
   * Updates the current language
   * @param {string} language - The language code ('en' or 'zh')
   */
  function updateLanguage(language) {
    currentLanguage = language;
  }
  
  // Public API
  return {
    openModal: openLinkModal,
    closeModal: closeModal,
    updateLanguage: updateLanguage
  };
})();

// Export the module for use in other files
window.LinkManager = LinkManager; 