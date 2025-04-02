/**
 * Filter Manager Module
 * Handles node filtering and saving filter presets (collections of filters)
 * Note: Filter presets are different from node bookmarks managed by BookmarkManager
 */
const FilterManager = (function() {
  // Private variables
  let activeFilters = [];
  let filterBookmarks = JSON.parse(localStorage.getItem('filterBookmarks') || '[]');
  let currentLanguage = 'en';
  let filterModalElement = null;
  
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
    
    // Create just the filter button in the sidebar
    createFilterButton();
  }
  
  /**
   * Creates the filter button in the sidebar
   */
  function createFilterButton() {
    const sidebar = document.querySelector('.sidebar');
    
    // Create filter button for sidebar
    const filterButton = document.createElement('button');
    filterButton.id = 'filter-nodes-button';
    filterButton.className = 'filter-button';
    filterButton.textContent = window.I18n ? I18n.t('filters') : 'Filters';
    filterButton.addEventListener('click', openFilterModal);
    
    // Add badge to show number of active filters if any
    const badgeSpan = document.createElement('span');
    badgeSpan.id = 'filter-badge';
    badgeSpan.className = 'filter-badge-count';
    badgeSpan.style.display = 'none'; // Hide initially
    filterButton.appendChild(badgeSpan);
    
    // Insert the filter button after the search button
    const searchButton = document.getElementById('search-nodes-button');
    if (searchButton && sidebar) {
      sidebar.insertBefore(filterButton, searchButton.nextSibling);
    } else {
      sidebar.appendChild(filterButton);
    }
    
    // Update badge if we have active filters
    updateFilterBadge();
  }
  
  /**
   * Updates the filter badge count
   */
  function updateFilterBadge() {
    const badge = document.getElementById('filter-badge');
    if (!badge) return;
    
    if (activeFilters.length > 0) {
      badge.textContent = activeFilters.length;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }
  
  /**
   * Opens the filter modal
   */
  function openFilterModal() {
    // Create overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    
    // Create modal container
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.maxWidth = '600px';
    modal.style.minHeight = '500px';
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';
    
    // Create modal header
    const modalHeader = document.createElement('div');
    modalHeader.className = 'modal-header';
    
    const modalTitle = document.createElement('div');
    modalTitle.className = 'modal-title';
    modalTitle.textContent = window.I18n ? I18n.t('filters') : 'Filters';
    
    const closeButton = document.createElement('button');
    closeButton.className = 'modal-close';
    closeButton.innerHTML = '&times;';
    closeButton.addEventListener('click', closeFilterModal);
    
    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeButton);
    
    // Create modal body
    const modalBody = document.createElement('div');
    modalBody.className = 'modal-body';
    modalBody.style.flex = '1';
    modalBody.style.display = 'flex';
    modalBody.style.flexDirection = 'column';
    
    // Add search functionality
    const searchContainer = document.createElement('div');
    searchContainer.className = 'filter-search-container';
    searchContainer.style.marginBottom = '16px';
    searchContainer.style.position = 'relative';
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'filter-search-input';
    searchInput.placeholder = window.I18n ? I18n.t('searchNodesForFilter') : 'Search for nodes to filter...';
    
    const searchResults = document.createElement('div');
    searchResults.className = 'filter-search-results';
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
    searchResults.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    
    searchContainer.appendChild(searchInput);
    searchContainer.appendChild(searchResults);
    modalBody.appendChild(searchContainer);
    
    // Active filters container
    const activeFiltersTitle = document.createElement('h4');
    activeFiltersTitle.textContent = window.I18n ? I18n.t('activeFilters') : 'Active Filters';
    activeFiltersTitle.style.marginTop = '16px';
    activeFiltersTitle.style.marginBottom = '8px';
    modalBody.appendChild(activeFiltersTitle);
    
    const activeFiltersContainer = document.createElement('div');
    activeFiltersContainer.className = 'active-filters';
    activeFiltersContainer.style.minHeight = '100px';
    activeFiltersContainer.style.border = '1px solid #ddd';
    activeFiltersContainer.style.borderRadius = '4px';
    activeFiltersContainer.style.padding = '10px';
    activeFiltersContainer.style.marginBottom = '16px';
    activeFiltersContainer.innerHTML = `<p class="no-filters">${window.I18n ? I18n.t('noActiveFilters') : 'No active filters'}</p>`;
    modalBody.appendChild(activeFiltersContainer);
    
    // Create filter actions
    const filterActions = document.createElement('div');
    filterActions.className = 'filter-actions';
    filterActions.style.display = 'flex';
    filterActions.style.gap = '8px';
    filterActions.style.marginBottom = '16px';
    
    const clearFiltersButton = document.createElement('button');
    clearFiltersButton.className = 'btn-secondary filter-action-button';
    clearFiltersButton.textContent = window.I18n ? I18n.t('clearFilters') : 'Clear Filters';
    clearFiltersButton.addEventListener('click', clearFilters);
    
    const savePresetButton = document.createElement('button');
    savePresetButton.className = 'btn-secondary filter-action-button';
    savePresetButton.textContent = window.I18n ? I18n.t('saveAsPreset') : 'Save as Preset';
    savePresetButton.addEventListener('click', saveFilterPreset);
    
    filterActions.appendChild(clearFiltersButton);
    filterActions.appendChild(savePresetButton);
    modalBody.appendChild(filterActions);
    
    // Filter presets section
    const presetsTitle = document.createElement('h4');
    presetsTitle.textContent = window.I18n ? I18n.t('savedFilterPresets') : 'Saved Filter Presets';
    presetsTitle.style.marginTop = '16px';
    presetsTitle.style.marginBottom = '8px';
    modalBody.appendChild(presetsTitle);
    
    const presetsList = document.createElement('div');
    presetsList.className = 'filter-presets-list';
    presetsList.style.border = '1px solid #ddd';
    presetsList.style.borderRadius = '4px';
    presetsList.style.padding = '10px';
    presetsList.style.maxHeight = '200px';
    presetsList.style.overflowY = 'auto';
    modalBody.appendChild(presetsList);
    
    // Create modal footer
    const modalFooter = document.createElement('div');
    modalFooter.className = 'modal-footer';
    
    const closeModalButton = document.createElement('button');
    closeModalButton.className = 'btn btn-secondary';
    closeModalButton.textContent = window.I18n ? I18n.t('close') : 'Close';
    closeModalButton.addEventListener('click', closeFilterModal);
    
    modalFooter.appendChild(closeModalButton);
    
    // Add search functionality
    searchInput.addEventListener('input', debounce(async (e) => {
      const query = e.target.value.trim();
      if (query.length < 2) {
        searchResults.innerHTML = '';
        searchResults.style.display = 'none';
        return;
      }
      
      try {
        const response = await fetch(`/api/nodes/search?q=${encodeURIComponent(query)}`);
        const results = await response.json();
        
        searchResults.innerHTML = '';
        searchResults.style.display = 'block';
        
        if (results.length === 0) {
          searchResults.innerHTML = `<div class="no-results" style="padding: 8px;">${window.I18n ? I18n.t('noSearchResults') : 'No matching nodes found'}</div>`;
          return;
        }
        
        results.forEach(node => {
          const resultItem = document.createElement('div');
          resultItem.className = 'filter-result-item';
          resultItem.style.padding = '10px';
          resultItem.style.borderBottom = '1px solid #eee';
          resultItem.style.cursor = 'pointer';
          resultItem.dataset.id = node.id;
          
          const nodeContent = currentLanguage === 'en' ? node.content : (node.content_zh || node.content);
          
          resultItem.innerHTML = `
            <div style="display: flex; align-items: center;">
              <span style="margin-right: 8px;">🔍</span>
              <span>${nodeContent}</span>
            </div>
          `;
          
          resultItem.addEventListener('click', () => {
            addFilter(node.id);
            searchResults.innerHTML = '';
            searchResults.style.display = 'none';
            searchInput.value = '';
          });
          
          searchResults.appendChild(resultItem);
        });
      } catch (error) {
        console.error('Error searching nodes:', error);
        searchResults.innerHTML = `<div class="search-error" style="padding: 8px;">${window.I18n ? I18n.t('searchError') : 'Error searching nodes'}</div>`;
      }
    }, 300));
    
    // Initial state of search results - hidden
    searchResults.style.display = 'none';
    
    // Assemble the modal
    modal.appendChild(modalHeader);
    modal.appendChild(modalBody);
    modal.appendChild(modalFooter);
    modalOverlay.appendChild(modal);
    
    // Add to document
    document.body.appendChild(modalOverlay);
    filterModalElement = modalOverlay;
    
    // Update filter displays
    updateActiveFiltersDisplay();
    updateBookmarksList();
    
    // Focus the search input
    setTimeout(() => {
      searchInput.focus();
    }, 100);
    
    // Add keyboard shortcut to close modal
    modalOverlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeFilterModal();
      }
    });
  }
  
  /**
   * Closes the filter modal
   */
  function closeFilterModal() {
    if (filterModalElement) {
      document.body.removeChild(filterModalElement);
      filterModalElement = null;
    }
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
    if (!activeFiltersContainer) return;
    
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
        filterBadge.style.display = 'flex';
        filterBadge.style.justifyContent = 'space-between';
        filterBadge.style.alignItems = 'center';
        filterBadge.style.padding = '8px';
        filterBadge.style.backgroundColor = '#f1f3f4';
        filterBadge.style.borderRadius = '4px';
        filterBadge.style.marginBottom = '5px';
        
        const nodeContent = currentLanguage === 'en' ? node.content : (node.content_zh || node.content);
        
        const filterText = document.createElement('span');
        filterText.className = 'filter-text';
        filterText.textContent = nodeContent;
        filterText.style.flex = '1';
        
        const removeButton = document.createElement('button');
        removeButton.className = 'filter-remove';
        removeButton.innerHTML = '&times;';
        removeButton.dataset.id = nodeId;
        removeButton.style.background = 'none';
        removeButton.style.border = 'none';
        removeButton.style.cursor = 'pointer';
        removeButton.style.fontSize = '18px';
        removeButton.style.color = '#777';
        removeButton.addEventListener('click', (e) => {
          const id = e.target.dataset.id;
          removeFilter(id);
        });
        
        filterBadge.appendChild(filterText);
        filterBadge.appendChild(removeButton);
        activeFiltersContainer.appendChild(filterBadge);
      } catch (error) {
        console.error('Error fetching node details:', error);
      }
    }
    
    // Update the filter badge in the sidebar
    updateFilterBadge();
  }
  
  /**
   * Saves the current active filters as a named preset for later reuse
   * Note: This is different from bookmarking individual nodes (see BookmarkManager)
   */
  function saveFilterPreset() {
    if (activeFilters.length === 0) {
      alert(window.I18n ? I18n.t('noFiltersToSave') : 'No active filters to save');
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
   * Updates the list of filter presets in the UI
   */
  function updateBookmarksList() {
    // Only update if the filter modal is currently open
    if (!filterModalElement) return;
    
    // Use a more specific selector that only targets elements within the filter modal
    const presetsList = filterModalElement.querySelector('.filter-presets-list');
    
    // If the element doesn't exist, don't attempt to update
    if (!presetsList) return;
    
    if (filterBookmarks.length === 0) {
      presetsList.innerHTML = `<p class="no-presets">${window.I18n ? I18n.t('noSavedPresets') : 'No saved filter presets'}</p>`;
      return;
    }
    
    presetsList.innerHTML = '';
    
    // Create a list item for each bookmark
    filterBookmarks.forEach(bookmark => {
      const presetItem = document.createElement('div');
      presetItem.className = 'filter-preset-item';
      
      presetItem.innerHTML = `
        <span class="filter-preset-name">${bookmark.name}</span>
        <div class="filter-preset-actions">
          <button class="filter-preset-load" data-id="${bookmark.id}">${window.I18n ? I18n.t('load') : 'Load'}</button>
          <button class="filter-preset-delete" data-id="${bookmark.id}">&times;</button>
        </div>
      `;
      
      // Add event listeners
      presetItem.querySelector('.filter-preset-load').addEventListener('click', () => {
        loadBookmark(bookmark.id);
      });
      
      presetItem.querySelector('.filter-preset-delete').addEventListener('click', () => {
        deleteBookmark(bookmark.id);
      });
      
      presetsList.appendChild(presetItem);
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
    
    const savePresetButton = document.querySelector('.filter-actions button:last-child');
    if (savePresetButton) {
      savePresetButton.textContent = window.I18n ? I18n.t('saveAsPreset') : 'Save as Preset';
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
  
  /**
   * Adds the filter button to each node
   * @param {HTMLElement} nodeActions - The node actions element
   * @param {string} nodeId - The ID of the node
   */
  function addFilterButtonToNode(nodeActions, nodeId) {
    if (nodeActions) {
      // Create the filter button
      const filterButton = document.createElement('button');
      filterButton.className = 'node-filter-button';
      filterButton.innerHTML = '🔍';
      filterButton.title = window.I18n ? I18n.t('filterOnNode') : 'Filter on this node';
      
      // Add click event listener
      filterButton.addEventListener('click', (e) => {
        e.stopPropagation();
        addFilter(nodeId);
        // Open the filter modal to show the applied filter
        openFilterModal();
      });
      
      // Insert the filter button at the beginning of the node actions
      nodeActions.insertBefore(filterButton, nodeActions.firstChild);
    }
  }
  
  // Public API
  return {
    initialize: initialize,
    addFilter: addFilter,
    removeFilter: removeFilter,
    applyFilters: applyFilters,
    clearFilters: clearFilters,
    addFilterBookmark: saveFilterPreset,
    saveBookmarks: saveBookmarks,
    updateLanguage: updateLanguage,
    addFilterButtonToNode: addFilterButtonToNode
  };
})();

// Export the module for use in other files
window.FilterManager = FilterManager; 