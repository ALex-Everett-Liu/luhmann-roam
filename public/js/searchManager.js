/**
 * Search Manager Module
 * Handles searching and navigating to nodes in the outliner
 */
const SearchManager = (function() {
  // Private variables
  let currentLanguage = 'en';
  let searchModalElement = null;
  let recentSearches = [];
  
  // Define constant for localStorage key
  const STORAGE_KEY = 'luhmann_roam_recent_searches';
  
  /**
   * Creates and opens the search modal
   */
  function openSearchModal() {
    // Load the latest searches from localStorage first
    loadRecentSearches();
    console.log("Opening search modal with recent searches:", recentSearches);
    
    // Create overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    
    // Create modal container with better height handling
    const modal = document.createElement('div');
    modal.className = 'modal search-modal-container';
    modal.style.maxWidth = '1200px';
    modal.style.maxHeight = '95vh';
    modal.style.minHeight = '500px';
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';
    
    // Create modal header
    const modalHeader = document.createElement('div');
    modalHeader.className = 'modal-header';
    
    const modalTitle = document.createElement('div');
    modalTitle.className = 'modal-title';
    modalTitle.textContent = window.I18n ? I18n.t('searchNodes') : 'Search Nodes';
    
    const closeButton = document.createElement('button');
    closeButton.className = 'modal-close';
    closeButton.innerHTML = '&times;';
    closeButton.addEventListener('click', closeSearchModal);
    
    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeButton);
    
    // Create modal body with two-panel layout
    const modalBody = document.createElement('div');
    modalBody.className = 'modal-body';
    modalBody.style.flex = '1';
    modalBody.style.display = 'flex';
    modalBody.style.flexDirection = 'column';
    modalBody.style.overflow = 'hidden'; // Changed from auto to hidden
    
    // Search input container (stays at the top)
    const searchInputContainer = document.createElement('div');
    searchInputContainer.className = 'search-input-container';
    searchInputContainer.style.marginBottom = '10px';
    searchInputContainer.style.flex = '0 0 auto';
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'node-search';
    searchInput.placeholder = window.I18n ? I18n.t('searchPlaceholder') : 'Type to search for nodes...';
    searchInput.autofocus = true;
    
    searchInputContainer.appendChild(searchInput);
    
    // Two-panel container (for recent searches and results)
    const twoPanel = document.createElement('div');
    twoPanel.className = 'search-two-panel';
    twoPanel.style.display = 'flex';
    twoPanel.style.flex = '1 1 auto';
    twoPanel.style.minHeight = '400px'; // Increased minimum height
    twoPanel.style.height = 'calc(100% - 50px)'; // Take most of available height
    twoPanel.style.gap = '10px';
    
    // Recent searches panel (left)
    const recentSearchesPanel = document.createElement('div');
    recentSearchesPanel.className = 'recent-searches-panel';
    recentSearchesPanel.style.flex = '0 0 350px'; // Increased from 300px to 350px
    recentSearchesPanel.style.display = 'flex';
    recentSearchesPanel.style.flexDirection = 'column';
    recentSearchesPanel.style.border = '1px solid #ddd';
    recentSearchesPanel.style.borderRadius = '4px';
    recentSearchesPanel.style.padding = '10px';
    recentSearchesPanel.style.overflow = 'hidden';
    recentSearchesPanel.style.height = '100%'; // Ensure it takes full available height
    
    const recentSearchesTitle = document.createElement('h4');
    recentSearchesTitle.textContent = window.I18n ? I18n.t('recentSearches') : 'Recent Searches';
    recentSearchesTitle.style.marginTop = '0';
    recentSearchesTitle.style.marginBottom = '8px';
    recentSearchesTitle.style.flex = '0 0 auto';
    
    const recentSearchesList = document.createElement('div');
    recentSearchesList.className = 'recent-searches-list';
    recentSearchesList.id = 'recent-searches-list';
    recentSearchesList.style.flex = '1 1 auto';
    recentSearchesList.style.overflowY = 'auto';
    recentSearchesList.style.minHeight = '300px'; // Set a minimum height to match search results
    recentSearchesList.style.height = '100%'; // Take full height of parent
    
    recentSearchesPanel.appendChild(recentSearchesTitle);
    recentSearchesPanel.appendChild(recentSearchesList);
    
    // Search results panel (right)
    const searchResultsPanel = document.createElement('div');
    searchResultsPanel.className = 'search-results-panel';
    searchResultsPanel.style.flex = '1 1 auto'; // This will make it take the remaining space
    searchResultsPanel.style.display = 'flex';
    searchResultsPanel.style.flexDirection = 'column';
    searchResultsPanel.style.border = '1px solid #ddd';
    searchResultsPanel.style.borderRadius = '4px';
    searchResultsPanel.style.padding = '10px';
    searchResultsPanel.style.overflow = 'hidden';
    
    const searchResultsTitle = document.createElement('h4');
    searchResultsTitle.textContent = window.I18n ? I18n.t('searchResults') : 'Search Results';
    searchResultsTitle.style.marginTop = '0';
    searchResultsTitle.style.marginBottom = '8px';
    searchResultsTitle.style.flex = '0 0 auto';
    
    const searchResults = document.createElement('div');
    searchResults.className = 'search-results search-results-scrollable';
    searchResults.style.flex = '1 1 auto';
    searchResults.style.overflowY = 'auto';
    searchResults.style.border = '1px solid #eee';
    searchResults.style.borderRadius = '4px';
    
    searchResultsPanel.appendChild(searchResultsTitle);
    searchResultsPanel.appendChild(searchResults);
    
    // Add the panels to the two-panel container
    twoPanel.appendChild(recentSearchesPanel);
    twoPanel.appendChild(searchResultsPanel);
    
    // Add the search input and two-panel to the modal body
    modalBody.appendChild(searchInputContainer);
    modalBody.appendChild(twoPanel);
    
    // Add search functionality
    searchInput.addEventListener('input', debounce(async (e) => {
      const query = e.target.value.trim();
      if (query.length < 2) {
        searchResults.innerHTML = '';
        return;
      }
      
      try {
        // Add to recent searches if query is executed
        addRecentSearch(query);
        
        // Include the current language in the search request
        const response = await fetch(`/api/nodes/search?q=${encodeURIComponent(query)}&lang=${currentLanguage}`);
        const results = await response.json();
        
        searchResults.innerHTML = '';
        
        if (results.length === 0) {
          searchResults.innerHTML = `<div class="no-results">${window.I18n ? I18n.t('noSearchResults') : 'No matching nodes found'}</div>`;
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
        searchResults.innerHTML = `<div class="search-error">${window.I18n ? I18n.t('searchError') : 'Error searching nodes'}</div>`;
      }
    }, 300));
    
    // Create modal footer with sticky position
    const modalFooter = document.createElement('div');
    modalFooter.className = 'modal-footer';
    modalFooter.style.position = 'sticky';
    modalFooter.style.bottom = '0';
    modalFooter.style.backgroundColor = 'white';
    modalFooter.style.zIndex = '10';
    modalFooter.style.flex = '0 0 auto';
    
    const closeModalButton = document.createElement('button');
    closeModalButton.className = 'btn btn-secondary';
    closeModalButton.textContent = window.I18n ? I18n.t('close') : 'Close';
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
    
    // Render the recent searches right away
    setTimeout(() => {
      renderRecentSearches();
    }, 0);
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
    if (node.parent_id) {
      // Use the parent content from the server response based on current language
      const parentContent = currentLanguage === 'en' 
        ? (node.parent_content || '(Unknown)')
        : (node.parent_content_zh || node.parent_content || '(Unknown)');
      
      return `${window.I18n ? I18n.t('parent') : 'Parent'}: ${parentContent}`;
    } else {
      return window.I18n ? I18n.t('rootLevel') : 'Root level';
    }
  }
  
  /**
   * Navigates to a specific node
   * @param {string} nodeId - The ID of the node to navigate to
   */
  async function navigateToNode(nodeId) {
    try {
      console.log(`Search navigating to node: ${nodeId}`);
      
      // Check if BreadcrumbManager is available and use it directly
      if (window.BreadcrumbManager) {
        // This will handle all the expansion and focusing
        await window.BreadcrumbManager.focusOnNode(nodeId);
        
        // Track this as the last focused node
        if (window.lastFocusedNodeId !== undefined) {
          window.lastFocusedNodeId = nodeId;
          console.log(`Search set focus to node: ${nodeId}`);
        }
      } else {
        // Fallback to the original approach if BreadcrumbManager isn't available
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
            
            // Track this as the last focused node
            if (window.lastFocusedNodeId !== undefined) {
              window.lastFocusedNodeId = nodeId;
              console.log(`Search set focus to node: ${nodeId}`);
            }
          }
        }, 300); // Give time for the DOM to update after expanding parents
      }
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
          
          // OPTIMIZATION: Use refreshSubtree instead of full DOM refresh
          if (window.NodeOperationsManager && window.NodeOperationsManager.refreshSubtree) {
            await window.NodeOperationsManager.refreshSubtree(node.parent_id);
          } else if (window.fetchNodes) {
            // Fallback to full refresh if refreshSubtree is not available
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
    
    // Update any open search modal
    if (searchModalElement) {
      const modalTitle = searchModalElement.querySelector('.modal-title');
      if (modalTitle) {
        modalTitle.textContent = window.I18n ? I18n.t('searchNodes') : 'Search Nodes';
      }
      
      const searchInput = searchModalElement.querySelector('.node-search');
      if (searchInput) {
        searchInput.placeholder = window.I18n ? I18n.t('searchPlaceholder') : 'Type to search for nodes...';
      }
      
      const closeButton = searchModalElement.querySelector('.btn-secondary');
      if (closeButton) {
        closeButton.textContent = window.I18n ? I18n.t('close') : 'Close';
      }
    }
    
    // Update the search button text in the sidebar
    const searchButton = document.getElementById('search-nodes-button');
    if (searchButton) {
      searchButton.textContent = window.I18n ? I18n.t('searchNodes') : 'Search Nodes';
      searchButton.title = window.I18n ? 
        I18n.t('searchShortcutHint') : 
        'Search for nodes (Ctrl+F)';
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
   * Loads recent searches from localStorage
   */
  function loadRecentSearches() {
    const saved = localStorage.getItem(STORAGE_KEY);
    console.log("Loading recent searches from localStorage:", saved);
    
    if (saved) {
      try {
        recentSearches = JSON.parse(saved);
        console.log("Parsed recent searches:", recentSearches);
      } catch (e) {
        console.error('Error parsing recent searches:', e);
        recentSearches = [];
      }
    } else {
      console.log("No recent searches found in localStorage");
      recentSearches = [];
    }
  }
  
  /**
   * Saves recent searches to localStorage
   */
  function saveRecentSearches() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentSearches));
      console.log("Saved recent searches to localStorage:", JSON.stringify(recentSearches));
    } catch (e) {
      console.error('Error saving recent searches:', e);
    }
  }
  
  /**
   * Adds a search query to recent searches
   * @param {string} query - The search query
   */
  function addRecentSearch(query) {
    // Don't add empty queries
    if (!query.trim()) return;
    
    // Remove if already exists
    const existingIndex = recentSearches.indexOf(query);
    if (existingIndex !== -1) {
      recentSearches.splice(existingIndex, 1);
    }
    
    // Add to beginning
    recentSearches.unshift(query);
    
    // Limit to 30 recent searches
    if (recentSearches.length > 30) {
      recentSearches.pop();
    }
    
    saveRecentSearches();
    renderRecentSearches();
  }
  
  /**
   * Removes a search from recent searches
   * @param {number} index - The index of the search to remove
   */
  function removeRecentSearch(index) {
    recentSearches.splice(index, 1);
    saveRecentSearches();
    renderRecentSearches();
  }
  
  /**
   * Renders recent searches in the UI
   */
  function renderRecentSearches() {
    const container = document.getElementById('recent-searches-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (recentSearches.length === 0) {
      const noSearches = document.createElement('div');
      noSearches.className = 'no-searches';
      noSearches.textContent = window.I18n ? I18n.t('noRecentSearches') : 'No recent searches';
      noSearches.style.padding = '10px';
      noSearches.style.color = '#888';
      noSearches.style.fontStyle = 'italic';
      container.appendChild(noSearches);
      return;
    }
    
    recentSearches.forEach((search, index) => {
      const item = document.createElement('div');
      item.className = 'recent-search-item';
      item.style.display = 'flex';
      item.style.justifyContent = 'space-between';
      item.style.alignItems = 'center';
      item.style.padding = '8px';
      item.style.borderBottom = '1px solid #eee';
      item.style.cursor = 'pointer'; // Make the entire item appear clickable
      
      // Add click handler to the entire item
      item.addEventListener('click', (e) => {
        // Don't trigger if clicking the delete button
        if (e.target.className !== 'recent-search-delete') {
          const searchInput = searchModalElement.querySelector('.node-search');
          if (searchInput) {
            searchInput.value = search;
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            searchInput.focus();
          }
        }
      });
      
      const searchText = document.createElement('span');
      searchText.className = 'recent-search-text';
      searchText.textContent = search;
      searchText.style.flex = '1';
      searchText.style.overflow = 'hidden';
      searchText.style.textOverflow = 'ellipsis';
      searchText.style.whiteSpace = 'nowrap';
      
      const deleteButton = document.createElement('button');
      deleteButton.className = 'recent-search-delete';
      deleteButton.innerHTML = '×';
      deleteButton.title = 'Delete this search';
      deleteButton.style.marginLeft = '8px';
      deleteButton.style.background = 'none';
      deleteButton.style.border = 'none';
      deleteButton.style.cursor = 'pointer';
      deleteButton.style.fontSize = '18px';
      deleteButton.style.color = '#999';
      deleteButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent triggering the item click
        removeRecentSearch(index);
      });
      
      item.appendChild(searchText);
      item.appendChild(deleteButton);
      container.appendChild(item);
    });
  }
  
  /**
   * Adds a search button to the sidebar
   */
  function initialize() {
    // Get the current language from I18n if available
    if (window.I18n) {
      currentLanguage = I18n.getCurrentLanguage();
    }
    
    // Load recent searches
    loadRecentSearches();
    
    const sidebar = document.querySelector('.sidebar');
    
    // Create search button
    const searchButton = document.createElement('button');
    searchButton.id = 'search-nodes-button';
    searchButton.className = 'search-button';
    searchButton.textContent = window.I18n ? I18n.t('searchNodes') : 'Search Nodes';
    searchButton.addEventListener('click', openSearchModal);
    
    // Add keyboard shortcut info
    searchButton.title = window.I18n ? 
      I18n.t('searchShortcutHint') : 
      'Search for nodes (Ctrl+F)';
    
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
    updateLanguage: updateLanguage,
    addRecentSearch: addRecentSearch,
    removeRecentSearch: removeRecentSearch
  };
})();

// Export the module for use in other files
window.SearchManager = SearchManager; 