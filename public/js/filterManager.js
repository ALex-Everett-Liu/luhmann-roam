/**
 * Filter Manager Module
 * Handles filtering nodes in the outliner
 */
const FilterManager = (function() {
  // Private variables
  let activeFilters = [];
  let filterBookmarks = JSON.parse(localStorage.getItem('filterBookmarks') || '[]');
  let currentLanguage = 'en';
  
  /**
   * Initialize the manager
   */
  function initialize() {
    // Get the initial language setting from I18n if available
    if (window.I18n) {
      currentLanguage = I18n.getCurrentLanguage();
    } else {
      currentLanguage = localStorage.getItem('preferredLanguage') || 'en';
    }
    console.log('FilterManager initialized with language:', currentLanguage);
    
    // Create the UI
    createFilterUI();
  }
  
  /**
   * Creates the filter UI in the sidebar
   */
  function createFilterUI() {
    const sidebar = document.querySelector('.sidebar');
    
    // Create filter section
    const filterSection = document.createElement('div');
    filterSection.className = 'filter-section';
    
    const filterTitle = document.createElement('h3');
    filterTitle.textContent = window.I18n ? I18n.t('filters') : 'Filters';
    filterSection.appendChild(filterTitle);
    
    // Add search functionality
    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container filter-search-container';
    searchContainer.style.position = 'relative';
    searchContainer.style.zIndex = '5';
    searchContainer.style.marginBottom = '10px';
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'node-search';
    searchInput.placeholder = window.I18n ? I18n.t('searchNodesForFilter') : 'Search for nodes to filter...';
    
    const searchResults = document.createElement('div');
    searchResults.className = 'search-results filter-search-results';
    searchResults.style.position = 'absolute';
    searchResults.style.top = '100%';
    searchResults.style.left = '0';
    searchResults.style.right = '0';
    searchResults.style.maxHeight = '200px';
    searchResults.style.overflowY = 'auto';
    searchResults.style.background = 'white';
    searchResults.style.border = '1px solid #ddd';
    searchResults.style.borderRadius = '0 0 4px 4px';
    searchResults.style.zIndex = '10';
    
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
          searchResults.innerHTML = `<div class="no-results">${window.I18n ? I18n.t('noSearchResults') : 'No matching nodes found'}</div>`;
          return;
        }
        
        results.forEach(node => {
          const resultItem = document.createElement('div');
          resultItem.className = 'search-result-item';
          resultItem.dataset.id = node.id;
          
          const nodeContent = currentLanguage === 'en' ? node.content : (node.content_zh || node.content);
          resultItem.textContent = nodeContent;
          
          // Add filter icon
          const filterIcon = document.createElement('span');
          filterIcon.className = 'filter-search-icon';
          filterIcon.innerHTML = '🔍';
          resultItem.prepend(filterIcon);
          
          resultItem.addEventListener('click', () => {
            addFilter(node.id);
            searchResults.innerHTML = '';
            searchInput.value = '';
          });
          
          searchResults.appendChild(resultItem);
        });
      } catch (error) {
        console.error('Error searching nodes:', error);
        searchResults.innerHTML = `<div class="search-error">${window.I18n ? I18n.t('searchError') : 'Error searching nodes'}</div>`;
      }
    }, 300));
    
    filterSection.appendChild(searchContainer);
    
    // Active filters container
    const activeFiltersContainer = document.createElement('div');
    activeFiltersContainer.className = 'active-filters';
    activeFiltersContainer.innerHTML = `<p class="no-filters">${window.I18n ? I18n.t('noActiveFilters') : 'No active filters'}</p>`;
    filterSection.appendChild(activeFiltersContainer);
    
    // Create filter actions
    const filterActions = document.createElement('div');
    filterActions.className = 'filter-actions';
    
    const clearFiltersButton = document.createElement('button');
    clearFiltersButton.className = 'btn-secondary filter-button';
    clearFiltersButton.textContent = window.I18n ? I18n.t('clearFilters') : 'Clear Filters';
    clearFiltersButton.addEventListener('click', clearFilters);
    
    const saveBookmarkButton = document.createElement('button');
    saveBookmarkButton.className = 'btn-secondary filter-button';
    saveBookmarkButton.textContent = window.I18n ? I18n.t('saveAsBookmark') : 'Save as Bookmark';
    saveBookmarkButton.addEventListener('click', addFilterBookmark);
    
    filterActions.appendChild(clearFiltersButton);
    filterActions.appendChild(saveBookmarkButton);
    filterSection.appendChild(filterActions);
    
    // Bookmarks section
    const bookmarksContainer = document.createElement('div');
    bookmarksContainer.className = 'filter-bookmarks';
    
    const bookmarksTitle = document.createElement('h4');
    bookmarksTitle.textContent = window.I18n ? I18n.t('bookmarks') : 'Bookmarks';
    bookmarksContainer.appendChild(bookmarksTitle);
    
    const bookmarksList = document.createElement('div');
    bookmarksList.className = 'bookmarks-list';
    bookmarksContainer.appendChild(bookmarksList);
    
    filterSection.appendChild(bookmarksContainer);
    
    // Insert the filter section before the language toggle
    const languageToggle = document.getElementById('language-toggle');
    sidebar.insertBefore(filterSection, languageToggle);
    
    // Initial load of bookmarks
    updateBookmarksList();
  }
  
  /**
   * Adds a new node filter
   * @param {string} nodeId - The ID of the node to filter on
   */
  async function addFilter(nodeId) {
    if (!nodeId || activeFilters.includes(nodeId)) return;
    
    // Get the node info
    try {
      const response = await fetch(`/api/nodes/${nodeId}`);
      const node = await response.json();
      
      // Add to active filters
      activeFilters.push(nodeId);
      
      // Update the UI
      updateActiveFiltersDisplay();
      
      // Apply the filter
      applyFilters();
    } catch (error) {
      console.error('Error adding filter:', error);
    }
  }
  
  /**
   * Removes a node filter
   * @param {string} nodeId - The ID of the node to remove from filters
   */
  function removeFilter(nodeId) {
    const index = activeFilters.indexOf(nodeId);
    if (index === -1) return;
    
    // Remove from active filters
    activeFilters.splice(index, 1);
    
    // Update the UI
    updateActiveFiltersDisplay();
    
    // Apply the filters
    applyFilters();
  }
  
  /**
   * Applies all active filters to the outliner
   */
  async function applyFilters() {
    const outlinerContainer = document.getElementById('outliner-container');
    const allNodes = outlinerContainer.querySelectorAll('.node');
    
    if (activeFilters.length === 0) {
      // Show all nodes if no filters are active
      allNodes.forEach(node => {
        node.style.display = '';
      });
      return;
    }
    
    // First, hide all nodes
    allNodes.forEach(node => {
      node.style.display = 'none';
    });
    
    // Then, for each filter, show the node and all its descendants
    for (const filterId of activeFilters) {
      // Show the filtered node
      const filteredNode = document.querySelector(`.node[data-id="${filterId}"]`);
      if (filteredNode) {
        filteredNode.style.display = '';
        
        // Show all descendants
        showDescendants(filteredNode);
      }
    }
  }
  
  /**
   * Shows all descendant nodes of a given node
   * @param {HTMLElement} node - The parent node element
   */
  function showDescendants(node) {
    const children = node.querySelector('.children');
    if (!children) return;
    
    const childNodes = children.querySelectorAll('.node');
    childNodes.forEach(childNode => {
      childNode.style.display = '';
      showDescendants(childNode);
    });
  }
  
  /**
   * Clears all active filters
   */
  function clearFilters() {
    if (activeFilters.length === 0) return;
    
    activeFilters = [];
    updateActiveFiltersDisplay();
    applyFilters();
  }
  
  /**
   * Updates the display of active filters
   */
  async function updateActiveFiltersDisplay() {
    const activeFiltersContainer = document.querySelector('.active-filters');
    
    if (activeFilters.length === 0) {
      activeFiltersContainer.innerHTML = `<p class="no-filters">${window.I18n ? I18n.t('noActiveFilters') : 'No active filters'}</p>`;
      return;
    }
    
    activeFiltersContainer.innerHTML = '';
    
    // Create filter badge for each active filter
    for (const nodeId of activeFilters) {
      try {
        const response = await fetch(`/api/nodes/${nodeId}`);
        const node = await response.json();
        
        const filterBadge = document.createElement('div');
        filterBadge.className = 'filter-badge';
        
        const nodeContent = currentLanguage === 'en' ? node.content : (node.content_zh || node.content);
        filterBadge.innerHTML = `
          <span class="filter-text">${nodeContent}</span>
          <button class="filter-remove" data-id="${nodeId}">&times;</button>
        `;
        
        // Add event listener to remove button
        filterBadge.querySelector('.filter-remove').addEventListener('click', (e) => {
          const id = e.target.dataset.id;
          removeFilter(id);
        });
        
        activeFiltersContainer.appendChild(filterBadge);
      } catch (error) {
        console.error('Error fetching node details:', error);
      }
    }
  }
  
  /**
   * Adds the current filter configuration as a bookmark
   */
  function addFilterBookmark() {
    if (activeFilters.length === 0) {
      alert(window.I18n ? I18n.t('noFiltersToBookmark') : 'No active filters to bookmark');
      return;
    }
    
    // Create a custom modal for bookmark name input
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.maxWidth = '400px';
    
    // Create modal header
    const modalHeader = document.createElement('div');
    modalHeader.className = 'modal-header';
    
    const modalTitle = document.createElement('div');
    modalTitle.className = 'modal-title';
    modalTitle.textContent = window.I18n ? I18n.t('saveFilterBookmark') : 'Save Filter Bookmark';
    
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
    
    const nameLabel = document.createElement('label');
    nameLabel.textContent = window.I18n ? I18n.t('enterBookmarkName') : 'Enter a name for this filter bookmark:';
    nameLabel.style.display = 'block';
    nameLabel.style.marginBottom = '8px';
    
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'node-search';
    nameInput.style.width = '100%';
    nameInput.placeholder = window.I18n ? I18n.t('bookmarkNamePlaceholder') : 'Bookmark name';
    
    modalBody.appendChild(nameLabel);
    modalBody.appendChild(nameInput);
    
    // Create modal footer
    const modalFooter = document.createElement('div');
    modalFooter.className = 'modal-footer';
    
    const cancelButton = document.createElement('button');
    cancelButton.className = 'btn btn-secondary';
    cancelButton.textContent = window.I18n ? I18n.t('cancel') : 'Cancel';
    cancelButton.addEventListener('click', () => {
      document.body.removeChild(modalOverlay);
    });
    
    const saveButton = document.createElement('button');
    saveButton.className = 'btn btn-primary';
    saveButton.textContent = window.I18n ? I18n.t('save') : 'Save';
    saveButton.addEventListener('click', () => {
      const bookmarkName = nameInput.value.trim();
      if (!bookmarkName) {
        // Highlight the input field if empty
        nameInput.style.borderColor = '#dc3545';
        return;
      }
      
      // Create bookmark object
      const bookmark = {
        id: Date.now().toString(),
        name: bookmarkName,
        filters: [...activeFilters]
      };
      
      // Add to bookmarks
      filterBookmarks.push(bookmark);
      
      // Save to localStorage
      saveBookmarks();
      
      // Update bookmarks display
      updateBookmarksList();
      
      // Close the modal
      document.body.removeChild(modalOverlay);
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
    
    // Focus the input
    setTimeout(() => {
      nameInput.focus();
    }, 100);
    
    // Allow Enter key to save
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        saveButton.click();
      }
    });
  }
  
  /**
   * Updates the list of filter bookmarks in the UI
   */
  function updateBookmarksList() {
    const bookmarksList = document.querySelector('.bookmarks-list');
    
    if (filterBookmarks.length === 0) {
      bookmarksList.innerHTML = `<p class="no-bookmarks">${window.I18n ? I18n.t('noSavedBookmarks') : 'No saved bookmarks'}</p>`;
      return;
    }
    
    bookmarksList.innerHTML = '';
    
    // Create a list item for each bookmark
    filterBookmarks.forEach(bookmark => {
      const bookmarkItem = document.createElement('div');
      bookmarkItem.className = 'bookmark-item';
      
      bookmarkItem.innerHTML = `
        <span class="bookmark-name">${bookmark.name}</span>
        <div class="bookmark-actions">
          <button class="bookmark-load" data-id="${bookmark.id}">${window.I18n ? I18n.t('load') : 'Load'}</button>
          <button class="bookmark-delete" data-id="${bookmark.id}">&times;</button>
        </div>
      `;
      
      // Add event listeners
      bookmarkItem.querySelector('.bookmark-load').addEventListener('click', () => {
        loadBookmark(bookmark.id);
      });
      
      bookmarkItem.querySelector('.bookmark-delete').addEventListener('click', () => {
        deleteBookmark(bookmark.id);
      });
      
      bookmarksList.appendChild(bookmarkItem);
    });
  }
  
  /**
   * Loads a filter bookmark
   * @param {string} bookmarkId - The ID of the bookmark to load
   */
  function loadBookmark(bookmarkId) {
    const bookmark = filterBookmarks.find(b => b.id === bookmarkId);
    if (!bookmark) return;
    
    // Clear current filters
    activeFilters = [];
    
    // Add bookmark filters
    activeFilters = [...bookmark.filters];
    
    // Update UI
    updateActiveFiltersDisplay();
    
    // Apply filters
    applyFilters();
  }
  
  /**
   * Deletes a filter bookmark
   * @param {string} bookmarkId - The ID of the bookmark to delete
   */
  function deleteBookmark(bookmarkId) {
    const index = filterBookmarks.findIndex(b => b.id === bookmarkId);
    if (index === -1) return;
    
    // Remove the bookmark
    filterBookmarks.splice(index, 1);
    
    // Save changes
    saveBookmarks();
    
    // Update UI
    updateBookmarksList();
  }
  
  /**
   * Saves bookmarks to localStorage
   */
  function saveBookmarks() {
    localStorage.setItem('filterBookmarks', JSON.stringify(filterBookmarks));
  }
  
  /**
   * Adds the filter button to each node
   * @param {HTMLElement} nodeElement - The node element
   * @param {string} nodeId - The ID of the node
   */
  function addFilterButtonToNode(nodeElement, nodeId) {
    // Find the node-actions div within the provided node element
    const nodeActions = nodeElement.querySelector('.node-actions');
    
    if (nodeActions) {
      // Create the filter button
      const filterButton = document.createElement('button');
      filterButton.className = 'filter-button';
      filterButton.innerHTML = '🔍';
      filterButton.title = window.I18n ? I18n.t('filterOnNode') : 'Filter on this node';
      
      // Add click event listener
      filterButton.addEventListener('click', (e) => {
        e.stopPropagation();
        addFilter(nodeId);
      });
      
      // Insert the filter button at the beginning of the node actions
      nodeActions.insertBefore(filterButton, nodeActions.firstChild);
    }
  }
  
  /**
   * Updates the current language
   * @param {string} language - The language code ('en' or 'zh')
   */
  function updateLanguage(language) {
    currentLanguage = language;
    console.log('FilterManager language updated to:', language);
    
    // Update UI elements with new language
    const filterTitle = document.querySelector('.filter-section h3');
    if (filterTitle) {
      filterTitle.textContent = window.I18n ? I18n.t('filters') : 'Filters';
    }
    
    const searchInput = document.querySelector('.filter-section .node-search');
    if (searchInput) {
      searchInput.placeholder = window.I18n ? I18n.t('searchNodesForFilter') : 'Search for nodes to filter...';
    }
    
    const clearFiltersButton = document.querySelector('.filter-actions button:first-child');
    if (clearFiltersButton) {
      clearFiltersButton.textContent = window.I18n ? I18n.t('clearFilters') : 'Clear Filters';
    }
    
    const saveBookmarkButton = document.querySelector('.filter-actions button:last-child');
    if (saveBookmarkButton) {
      saveBookmarkButton.textContent = window.I18n ? I18n.t('saveAsBookmark') : 'Save as Bookmark';
    }
    
    const bookmarksTitle = document.querySelector('.filter-bookmarks h4');
    if (bookmarksTitle) {
      bookmarksTitle.textContent = window.I18n ? I18n.t('bookmarks') : 'Bookmarks';
    }
    
    // Update active filters display with new language
    updateActiveFiltersDisplay();
    
    // Update bookmarks display with new language
    updateBookmarksList();
    
    // Update filter buttons on nodes
    const filterButtons = document.querySelectorAll('.filter-button');
    filterButtons.forEach(button => {
      button.title = window.I18n ? I18n.t('filterOnNode') : 'Filter on this node';
    });
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
  
  // Public API
  return {
    initialize: initialize,
    addFilter: addFilter,
    removeFilter: removeFilter,
    applyFilters: applyFilters,
    clearFilters: clearFilters,
    addFilterBookmark: addFilterBookmark,
    saveBookmarks: saveBookmarks,
    updateLanguage: updateLanguage,
    addFilterButtonToNode: addFilterButtonToNode
  };
})();

// Export the module for use in other files
window.FilterManager = FilterManager; 