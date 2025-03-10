/**
 * Search Manager Module
 * Handles searching and navigating to nodes in the outliner
 */
const SearchManager = (function() {
  // Private variables
  let currentLanguage = localStorage.getItem('preferredLanguage') || 'en';
  let searchModalElement = null;
  
  /**
   * Creates and opens the search modal
   */
  function openSearchModal() {
    // Create overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    
    // Create modal container
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.maxWidth = '600px';
    
    // Create modal header
    const modalHeader = document.createElement('div');
    modalHeader.className = 'modal-header';
    
    const modalTitle = document.createElement('div');
    modalTitle.className = 'modal-title';
    modalTitle.textContent = 'Search Nodes';
    
    const closeButton = document.createElement('button');
    closeButton.className = 'modal-close';
    closeButton.innerHTML = '&times;';
    closeButton.addEventListener('click', closeSearchModal);
    
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
    searchInput.placeholder = 'Type to search for nodes...';
    searchInput.autofocus = true;
    
    const searchResults = document.createElement('div');
    searchResults.className = 'search-results search-results-scrollable';
    
    searchContainer.appendChild(searchInput);
    searchContainer.appendChild(searchResults);
    
    // Add search functionality
    searchInput.addEventListener('input', debounce(async (e) => {
      const query = e.target.value.trim();
      if (query.length < 2) {
        searchResults.innerHTML = '';
        return;
      }
      
      try {
        const response = await fetch(`/api/nodes/search?q=${encodeURIComponent(query)}`);
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
          
          // Create a breadcrumb path for the node if it has a parent
          let breadcrumb = '';
          if (node.parent_id) {
            breadcrumb = `<div class="search-result-path">${getNodePath(node)}</div>`;
          }
          
          resultItem.innerHTML = `
            <div class="search-result-content">${nodeContent}</div>
            ${breadcrumb}
          `;
          
          resultItem.addEventListener('click', () => {
            navigateToNode(node.id);
            closeSearchModal();
          });
          
          searchResults.appendChild(resultItem);
        });
      } catch (error) {
        console.error('Error searching nodes:', error);
        searchResults.innerHTML = '<div class="search-error">Error searching nodes</div>';
      }
    }, 300));
    
    modalBody.appendChild(searchContainer);
    
    // Create modal footer
    const modalFooter = document.createElement('div');
    modalFooter.className = 'modal-footer';
    
    const closeModalButton = document.createElement('button');
    closeModalButton.className = 'btn btn-secondary';
    closeModalButton.textContent = 'Close';
    closeModalButton.addEventListener('click', closeSearchModal);
    
    modalFooter.appendChild(closeModalButton);
    
    // Assemble the modal
    modal.appendChild(modalHeader);
    modal.appendChild(modalBody);
    modal.appendChild(modalFooter);
    modalOverlay.appendChild(modal);
    
    // Add to document
    document.body.appendChild(modalOverlay);
    searchModalElement = modalOverlay;
    
    // Focus the input
    setTimeout(() => {
      searchInput.focus();
    }, 100);
    
    // Add keyboard shortcut to close modal
    modalOverlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeSearchModal();
      }
    });
  }
  
  /**
   * Closes the search modal
   */
  function closeSearchModal() {
    if (searchModalElement) {
      document.body.removeChild(searchModalElement);
      searchModalElement = null;
    }
  }
  
  /**
   * Gets a simplified path representation for a node
   * @param {Object} node - The node object
   * @returns {string} A string representation of the node's path
   */
  function getNodePath(node) {
    // This is a placeholder - in a real implementation, you would
    // fetch the parent chain and create a proper breadcrumb
    return node.parent_id ? `Parent: ${node.parent_id.substring(0, 8)}...` : 'Root level';
  }
  
  /**
   * Navigates to a specific node
   * @param {string} nodeId - The ID of the node to navigate to
   */
  async function navigateToNode(nodeId) {
    try {
      // First, ensure all parent nodes are expanded
      await expandParentNodes(nodeId);
      
      // Then scroll to and highlight the node
      setTimeout(() => {
        const nodeElement = document.querySelector(`.node[data-id="${nodeId}"]`);
        if (nodeElement) {
          // Scroll the node into view
          nodeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Add a highlight effect
          nodeElement.classList.add('highlight-focus');
          setTimeout(() => {
            nodeElement.classList.remove('highlight-focus');
          }, 2000);
          
          // Set focus to the node text
          const nodeText = nodeElement.querySelector('.node-text');
          if (nodeText) {
            nodeText.focus();
          }
        }
      }, 300); // Give time for the DOM to update after expanding parents
    } catch (error) {
      console.error('Error navigating to node:', error);
    }
  }
  
  /**
   * Expands all parent nodes of a given node
   * @param {string} nodeId - The ID of the node
   */
  async function expandParentNodes(nodeId) {
    try {
      const response = await fetch(`/api/nodes/${nodeId}`);
      const node = await response.json();
      
      if (node.parent_id) {
        // First expand the parent's parents recursively
        await expandParentNodes(node.parent_id);
        
        // Then expand the parent itself if it's not already expanded
        const parentNode = await fetch(`/api/nodes/${node.parent_id}`).then(res => res.json());
        if (!parentNode.is_expanded) {
          await fetch(`/api/nodes/${node.parent_id}/toggle`, {
            method: 'POST'
          });
          
          // Refresh the outliner to reflect the expanded state
          if (window.fetchNodes) {
            await window.fetchNodes();
          }
        }
      }
    } catch (error) {
      console.error('Error expanding parent nodes:', error);
    }
  }
  
  /**
   * Updates the current language
   * @param {string} language - The language code ('en' or 'zh')
   */
  function updateLanguage(language) {
    currentLanguage = language;
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
   * Adds a search button to the sidebar
   */
  function initialize() {
    const sidebar = document.querySelector('.sidebar');
    
    // Create search button
    const searchButton = document.createElement('button');
    searchButton.id = 'search-nodes-button';
    searchButton.className = 'search-button';
    searchButton.textContent = 'Search Nodes';
    searchButton.addEventListener('click', openSearchModal);
    
    // Add keyboard shortcut info
    searchButton.title = 'Search for nodes (Ctrl+F)';
    
    // Insert the search button after the "Add Root Node" button
    const addRootNodeButton = document.getElementById('add-root-node');
    if (addRootNodeButton && sidebar) {
      sidebar.insertBefore(searchButton, addRootNodeButton.nextSibling);
    }
    
    // Add global keyboard shortcut (Ctrl+F)
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        // Prevent the browser's default search
        e.preventDefault();
        openSearchModal();
      }
    });
  }
  
  // Public API
  return {
    initialize: initialize,
    openSearchModal: openSearchModal,
    closeSearchModal: closeSearchModal,
    updateLanguage: updateLanguage
  };
})();

// Export the module for use in other files
window.SearchManager = SearchManager; 