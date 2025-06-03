/**
 * Search Manager Module
 * Handles searching and navigating to nodes in the outliner
 */
const SearchManager = (function() {
  // Private variables
  let currentLanguage = 'en';
  let searchModalElement = null;
  let recentSearches = [];
  let currentSearchResults = { nodes: [], markdown: [] }; // Store current results for sorting
  
  // Define constant for localStorage key
  const STORAGE_KEY = 'luhmann_roam_recent_searches';
  
  /**
   * Format timestamp to readable date/time
   * @param {number} timestamp - Unix timestamp in milliseconds
   * @returns {string} Formatted date string
   */
  function formatTimestamp(timestamp) {
    if (!timestamp) return 'N/A';
    
    const date = new Date(timestamp);
    
    // Format: YYYY-MM-DD HH:MM:SS
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  /**
   * Create sorting controls for search results
   * @returns {HTMLElement} The sorting controls container
   */
  function createSortingControls() {
    const sortingContainer = document.createElement('div');
    sortingContainer.className = 'search-sorting-controls';
    sortingContainer.style.display = 'flex';
    sortingContainer.style.gap = '10px';
    sortingContainer.style.alignItems = 'center';
    sortingContainer.style.marginBottom = '10px';
    sortingContainer.style.padding = '8px';
    sortingContainer.style.backgroundColor = '#f8f9fa';
    sortingContainer.style.borderRadius = '4px';
    sortingContainer.style.border = '1px solid #e9ecef';
    
    // Sort by label
    const sortLabel = document.createElement('span');
    sortLabel.textContent = window.I18n ? I18n.t('sortBy') : 'Sort by:';
    sortLabel.style.fontWeight = 'bold';
    sortLabel.style.fontSize = '14px';
    
    // Sort by dropdown
    const sortBySelect = document.createElement('select');
    sortBySelect.className = 'search-sort-by';
    sortBySelect.style.padding = '4px 8px';
    sortBySelect.style.borderRadius = '4px';
    sortBySelect.style.border = '1px solid #ddd';
    
    const sortOptions = [
      { value: 'relevance', text: window.I18n ? I18n.t('relevance') : 'Relevance' },
      { value: 'created', text: window.I18n ? I18n.t('creationTime') : 'Creation Time' },
      { value: 'updated', text: window.I18n ? I18n.t('lastModified') : 'Last Modified' },
      { value: 'content', text: window.I18n ? I18n.t('content') : 'Content' }
    ];
    
    sortOptions.forEach(option => {
      const optionElement = document.createElement('option');
      optionElement.value = option.value;
      optionElement.textContent = option.text;
      sortBySelect.appendChild(optionElement);
    });
    
    // Sort order dropdown
    const sortOrderSelect = document.createElement('select');
    sortOrderSelect.className = 'search-sort-order';
    sortOrderSelect.style.padding = '4px 8px';
    sortOrderSelect.style.borderRadius = '4px';
    sortOrderSelect.style.border = '1px solid #ddd';
    
    const orderOptions = [
      { value: 'desc', text: window.I18n ? I18n.t('descending') : 'Newest First' },
      { value: 'asc', text: window.I18n ? I18n.t('ascending') : 'Oldest First' }
    ];
    
    orderOptions.forEach(option => {
      const optionElement = document.createElement('option');
      optionElement.value = option.value;
      optionElement.textContent = option.text;
      sortOrderSelect.appendChild(optionElement);
    });
    
    // Add event listeners for sorting
    const handleSort = () => {
      const sortBy = sortBySelect.value;
      const sortOrder = sortOrderSelect.value;
      applySorting(sortBy, sortOrder);
    };
    
    sortBySelect.addEventListener('change', handleSort);
    sortOrderSelect.addEventListener('change', handleSort);
    
    // Assemble controls
    sortingContainer.appendChild(sortLabel);
    sortingContainer.appendChild(sortBySelect);
    sortingContainer.appendChild(sortOrderSelect);
    
    return sortingContainer;
  }

  /**
   * Apply sorting to current search results
   * @param {string} sortBy - What to sort by ('relevance', 'created', 'updated', 'content')
   * @param {string} sortOrder - Sort order ('asc' or 'desc')
   */
  function applySorting(sortBy, sortOrder) {
    const sortFunction = (a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'created':
          aValue = a.created_at || 0;
          bValue = b.created_at || 0;
          break;
        case 'updated':
          aValue = a.updated_at || 0;
          bValue = b.updated_at || 0;
          break;
        case 'content':
          const currentLang = currentLanguage;
          aValue = (currentLang === 'en' ? a.content : (a.content_zh || a.content)) || '';
          bValue = (currentLang === 'en' ? b.content : (b.content_zh || b.content)) || '';
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
          break;
        default: // 'relevance' - keep original order
          return 0;
      }
      
      if (sortBy === 'content') {
        // For text, use string comparison
        if (sortOrder === 'asc') {
          return aValue.localeCompare(bValue);
        } else {
          return bValue.localeCompare(aValue);
        }
      } else {
        // For timestamps, use numeric comparison
        if (sortOrder === 'asc') {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      }
    };
    
    // Sort both nodes and markdown results
    currentSearchResults.nodes.sort(sortFunction);
    currentSearchResults.markdown.sort(sortFunction);
    
    // Re-render the search results
    renderSearchResults();
  }

  /**
   * Render search results to the DOM
   */
  function renderSearchResults() {
    const searchResults = searchModalElement.querySelector('.search-results');
    if (!searchResults) return;
    
    searchResults.innerHTML = '';
    
    const totalResults = (currentSearchResults.nodes.length || 0) + (currentSearchResults.markdown.length || 0);
    
    if (totalResults === 0) {
      searchResults.innerHTML = `<div class="no-results">${window.I18n ? I18n.t('noSearchResults') : 'No matching results found'}</div>`;
      return;
    }
    
    // Add sorting controls
    const sortingControls = createSortingControls();
    searchResults.appendChild(sortingControls);
    
    // Add a header showing result counts
    const headerDiv = document.createElement('div');
    headerDiv.className = 'search-results-header';
    headerDiv.innerHTML = `
      <div class="results-summary">
        <span class="total-count">${totalResults} total results</span>
        <span class="node-count">${currentSearchResults.nodes.length} nodes</span>
        <span class="markdown-count">${currentSearchResults.markdown.length} markdown files</span>
      </div>
    `;
    searchResults.appendChild(headerDiv);
    
    // Display node results
    if (currentSearchResults.nodes && currentSearchResults.nodes.length > 0) {
      const nodeHeader = document.createElement('div');
      nodeHeader.className = 'result-category-header';
      nodeHeader.innerHTML = `<h4>📝 Node Content (${currentSearchResults.nodes.length})</h4>`;
      searchResults.appendChild(nodeHeader);
      
      currentSearchResults.nodes.forEach(node => {
        const resultItem = createNodeResultItem(node);
        searchResults.appendChild(resultItem);
      });
    }
    
    // Display markdown results
    if (currentSearchResults.markdown && currentSearchResults.markdown.length > 0) {
      const markdownHeader = document.createElement('div');
      markdownHeader.className = 'result-category-header';
      markdownHeader.innerHTML = `<h4>📄 Markdown Files (${currentSearchResults.markdown.length})</h4>`;
      searchResults.appendChild(markdownHeader);
      
      currentSearchResults.markdown.forEach(markdownResult => {
        const resultItem = createMarkdownResultItem(markdownResult);
        searchResults.appendChild(resultItem);
      });
    }
  }

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
    
    // Add advanced search toggle
    const advancedSearchContainer = document.createElement('div');
    advancedSearchContainer.className = 'advanced-search-container';
    advancedSearchContainer.style.marginBottom = '10px';
    advancedSearchContainer.style.display = 'flex';
    advancedSearchContainer.style.alignItems = 'center';
    advancedSearchContainer.style.gap = '10px';
    
    // Advanced search toggle checkbox
    const advancedSearchToggle = document.createElement('input');
    advancedSearchToggle.type = 'checkbox';
    advancedSearchToggle.id = 'advanced-search-toggle';
    advancedSearchToggle.className = 'advanced-search-toggle';
    
    const advancedSearchLabel = document.createElement('label');
    advancedSearchLabel.htmlFor = 'advanced-search-toggle';
    advancedSearchLabel.textContent = window.I18n ? I18n.t('advancedSearch') : 'Advanced Search';
    
    // Advanced search help icon
    const advancedSearchHelp = document.createElement('span');
    advancedSearchHelp.className = 'advanced-search-help';
    advancedSearchHelp.innerHTML = '?';
    advancedSearchHelp.title = window.I18n ? I18n.t('advancedSearchHelp') : 
      'Use operators AND, OR, NOT, and parentheses. Examples:\n' +
      '• term1 AND term2: Find nodes containing both terms\n' +
      '• term1 OR term2: Find nodes containing either term\n' +
      '• term1 NOT term2: Find nodes with term1 but not term2\n' +
      '• "exact phrase": Find nodes with the exact phrase\n' +
      '• word*: Use * as a wildcard for prefix search\n' +
      '• w:word: Match whole word only (not part of another word)';
    advancedSearchHelp.style.marginLeft = '5px';
    advancedSearchHelp.style.cursor = 'help';
    advancedSearchHelp.style.display = 'inline-block';
    advancedSearchHelp.style.width = '16px';
    advancedSearchHelp.style.height = '16px';
    advancedSearchHelp.style.lineHeight = '16px';
    advancedSearchHelp.style.textAlign = 'center';
    advancedSearchHelp.style.borderRadius = '50%';
    advancedSearchHelp.style.backgroundColor = '#f0f0f0';
    advancedSearchHelp.style.color = '#666';
    
    advancedSearchContainer.appendChild(advancedSearchToggle);
    advancedSearchContainer.appendChild(advancedSearchLabel);
    advancedSearchContainer.appendChild(advancedSearchHelp);
    
    // Advanced search options container (initially hidden)
    const advancedSearchOptions = document.createElement('div');
    advancedSearchOptions.className = 'advanced-search-options';
    advancedSearchOptions.style.display = 'none';
    advancedSearchOptions.style.marginBottom = '10px';
    advancedSearchOptions.style.padding = '10px';
    advancedSearchOptions.style.border = '1px solid #ddd';
    advancedSearchOptions.style.borderRadius = '4px';
    
    // Common search patterns
    const commonPatternsContainer = document.createElement('div');
    commonPatternsContainer.className = 'common-patterns-container';
    commonPatternsContainer.style.marginBottom = '10px';
    
    const commonPatternsTitle = document.createElement('h5');
    commonPatternsTitle.textContent = window.I18n ? I18n.t('commonPatterns') : 'Common Search Patterns';
    commonPatternsTitle.style.marginTop = '0';
    commonPatternsTitle.style.marginBottom = '5px';
    
    const commonPatternsList = document.createElement('div');
    commonPatternsList.className = 'common-patterns-list';
    commonPatternsList.style.display = 'flex';
    commonPatternsList.style.flexWrap = 'wrap';
    commonPatternsList.style.gap = '5px';
    
    // Define common patterns
    const patterns = [
      { name: 'word1 AND word2', description: 'Contains both terms' },
      { name: 'word1 OR word2', description: 'Contains either term' },
      { name: 'word1 NOT word2', description: 'Contains first but not second term' },
      { name: 'w:word', description: 'Whole word only (not part of another word)' },
      { name: '"exact phrase"', description: 'Contains exact phrase' },
      { name: 'word*', description: 'Prefix search with wildcard' }
    ];
    
    patterns.forEach(pattern => {
      const patternBtn = document.createElement('button');
      patternBtn.className = 'pattern-btn';
      patternBtn.textContent = pattern.name;
      patternBtn.title = pattern.description;
      patternBtn.style.border = '1px solid #ddd';
      patternBtn.style.borderRadius = '4px';
      patternBtn.style.padding = '5px 10px';
      patternBtn.style.backgroundColor = '#f5f5f5';
      patternBtn.style.cursor = 'pointer';
      
      patternBtn.addEventListener('click', () => {
        searchInput.value = pattern.name;
        searchInput.focus();
        
        // Trigger the search
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      });
      
      commonPatternsList.appendChild(patternBtn);
    });
    
    // Specific edge cases
    const edgeCasesContainer = document.createElement('div');
    edgeCasesContainer.className = 'edge-cases-container';
    edgeCasesContainer.style.marginTop = '10px';
    
    const edgeCasesTitle = document.createElement('h5');
    edgeCasesTitle.textContent = window.I18n ? I18n.t('edgeCases') : 'Common Edge Cases';
    edgeCasesTitle.style.marginTop = '0';
    edgeCasesTitle.style.marginBottom = '5px';
    
    const edgeCasesList = document.createElement('div');
    edgeCasesList.className = 'edge-cases-list';
    edgeCasesList.style.display = 'flex';
    edgeCasesList.style.flexWrap = 'wrap';
    edgeCasesList.style.gap = '5px';
    
    // Define edge cases
    const edgeCases = [
      { name: 'w:import NOT important', description: 'Find "import" but not "important"' },
      { name: 'w:class NOT className', description: 'Find "class" but not "className"' },
      { name: 'w:event NOT eventHandler', description: 'Find "event" but not "eventHandler"' },
      { name: 'w:function NOT functionality', description: 'Find "function" but not "functionality"' }
    ];
    
    edgeCases.forEach(edgeCase => {
      const edgeCaseBtn = document.createElement('button');
      edgeCaseBtn.className = 'edge-case-btn';
      edgeCaseBtn.textContent = edgeCase.name;
      edgeCaseBtn.title = edgeCase.description;
      edgeCaseBtn.style.border = '1px solid #ddd';
      edgeCaseBtn.style.borderRadius = '4px';
      edgeCaseBtn.style.padding = '5px 10px';
      edgeCaseBtn.style.backgroundColor = '#f5f5f5';
      edgeCaseBtn.style.cursor = 'pointer';
      
      edgeCaseBtn.addEventListener('click', () => {
        searchInput.value = edgeCase.name;
        searchInput.focus();
        
        // Trigger the search
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      });
      
      edgeCasesList.appendChild(edgeCaseBtn);
    });
    
    // Assemble the advanced search options
    commonPatternsContainer.appendChild(commonPatternsTitle);
    commonPatternsContainer.appendChild(commonPatternsList);
    
    edgeCasesContainer.appendChild(edgeCasesTitle);
    edgeCasesContainer.appendChild(edgeCasesList);
    
    advancedSearchOptions.appendChild(commonPatternsContainer);
    advancedSearchOptions.appendChild(edgeCasesContainer);
    
    // Toggle advanced search options visibility
    advancedSearchToggle.addEventListener('change', () => {
      advancedSearchOptions.style.display = advancedSearchToggle.checked ? 'block' : 'none';
    });
    
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
    
    // Add the search input and advanced search elements to the modal body
    modalBody.appendChild(searchInputContainer);
    modalBody.appendChild(advancedSearchContainer);
    modalBody.appendChild(advancedSearchOptions);
    modalBody.appendChild(twoPanel);
    
    // Add search functionality with advanced features
    // Create a separate debounced function for saving to recent searches (5 seconds)
    const debouncedSaveSearch = debounce((query) => {
      addRecentSearch(query);
    }, 5000);

    searchInput.addEventListener('input', debounce(async (e) => {
      const query = e.target.value.trim();
      if (query.length < 2) {
        searchResults.innerHTML = '';
        currentSearchResults = { nodes: [], markdown: [] };
        return;
      }
      
      try {
        // Only trigger the delayed save to recent searches (5 seconds after user stops typing)
        debouncedSaveSearch(query);
        
        // Include the current language in the search request
        const advancedMode = advancedSearchToggle.checked;
        
        // Get combined results (nodes + markdown)
        const response = await fetch(
          `/api/search/combined?q=${encodeURIComponent(query)}&lang=${currentLanguage}&advanced=${advancedMode}`
        );
        const data = await response.json();
        
        // Store current results for sorting
        currentSearchResults = {
          nodes: data.nodes || [],
          markdown: data.markdown || []
        };
        
        // Render the results
        renderSearchResults();
        
      } catch (error) {
        console.error('Error searching:', error);
        searchResults.innerHTML = `<div class="search-error">${window.I18n ? I18n.t('searchError') : 'Error performing search'}</div>`;
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
   * Create a result item for node search results
   */
  function createNodeResultItem(node) {
    const resultItem = document.createElement('div');
    resultItem.className = 'search-result-item node-result';
    resultItem.dataset.id = node.id;
    
    const nodeContent = currentLanguage === 'en' ? node.content : (node.content_zh || node.content);
    
    // Create a breadcrumb path for the node if it has a parent
    let breadcrumb = '';
    if (node.parent_id) {
      breadcrumb = `<div class="search-result-path">${getNodePath(node)}</div>`;
    }
    
    // Create timestamp information
    const timestampInfo = document.createElement('div');
    timestampInfo.className = 'search-result-timestamps';
    timestampInfo.style.display = 'flex';
    timestampInfo.style.justifyContent = 'space-between';
    timestampInfo.style.fontSize = '12px';
    timestampInfo.style.color = '#6c757d';
    timestampInfo.style.marginTop = '8px';
    timestampInfo.style.padding = '6px 8px';
    timestampInfo.style.backgroundColor = '#f8f9fa';
    timestampInfo.style.borderRadius = '4px';
    timestampInfo.style.border = '1px solid #e9ecef';
    
    const createdInfo = document.createElement('span');
    createdInfo.innerHTML = `<strong>Created:</strong> ${formatTimestamp(node.created_at)}`;
    
    const updatedInfo = document.createElement('span');
    updatedInfo.innerHTML = `<strong>Updated:</strong> ${formatTimestamp(node.updated_at)}`;
    
    timestampInfo.appendChild(createdInfo);
    timestampInfo.appendChild(updatedInfo);
    
    resultItem.innerHTML = `
      <div class="result-type-badge node-badge">Node</div>
      <div class="search-result-content">${nodeContent}</div>
      ${breadcrumb}
    `;
    
    // Add timestamp info after the main content
    resultItem.appendChild(timestampInfo);
    
    resultItem.addEventListener('click', () => {
      // Get the search input value from the DOM when clicked
      const searchInput = searchModalElement?.querySelector('.node-search');
      if (searchInput && searchInput.value.trim()) {
        // Save the search immediately when user clicks a result
        addRecentSearch(searchInput.value.trim());
      }
      
      navigateToNode(node.id);
      closeSearchModal();
    });
    
    return resultItem;
  }
  
  /**
   * Create a result item for markdown search results
   */
  function createMarkdownResultItem(markdownResult) {
    const resultItem = document.createElement('div');
    resultItem.className = 'search-result-item markdown-result';
    resultItem.dataset.id = markdownResult.id;
    
    const nodeContent = markdownResult.nodeContent;
    const matchContext = markdownResult.matchContext;
    
    // Create breadcrumb if there's a parent
    let breadcrumb = '';
    if (markdownResult.parent_content) {
      breadcrumb = `<div class="search-result-path">Parent: ${markdownResult.parent_content}</div>`;
    }
    
    // Create timestamp information for markdown results
    const timestampInfo = document.createElement('div');
    timestampInfo.className = 'search-result-timestamps';
    timestampInfo.style.display = 'flex';
    timestampInfo.style.justifyContent = 'space-between';
    timestampInfo.style.fontSize = '12px';
    timestampInfo.style.color = '#6c757d';
    timestampInfo.style.marginTop = '8px';
    timestampInfo.style.padding = '6px 8px';
    timestampInfo.style.backgroundColor = '#f8f9fa';
    timestampInfo.style.borderRadius = '4px';
    timestampInfo.style.border = '1px solid #e9ecef';
    
    const createdInfo = document.createElement('span');
    createdInfo.innerHTML = `<strong>Created:</strong> ${formatTimestamp(markdownResult.created_at)}`;
    
    const updatedInfo = document.createElement('span');
    updatedInfo.innerHTML = `<strong>Updated:</strong> ${formatTimestamp(markdownResult.updated_at)}`;
    
    timestampInfo.appendChild(createdInfo);
    timestampInfo.appendChild(updatedInfo);
    
    resultItem.innerHTML = `
      <div class="result-type-badge markdown-badge">Markdown</div>
      <div class="search-result-node-title">${nodeContent}</div>
      <div class="search-result-markdown-context">${matchContext}</div>
      ${breadcrumb}
      <div class="search-result-meta">
        <span class="file-info">📄 ${markdownResult.filename}</span>
        <span class="content-length">${Math.round(markdownResult.contentLength / 1000)}k chars</span>
      </div>
    `;
    
    // Add timestamp info after the main content
    resultItem.appendChild(timestampInfo);
    
    resultItem.addEventListener('click', () => {
      // Get the search input value from the DOM when clicked
      const searchInput = searchModalElement?.querySelector('.node-search');
      if (searchInput && searchInput.value.trim()) {
        // Save the search immediately when user clicks a result
        addRecentSearch(searchInput.value.trim());
      }
      
      // Navigate to the node and open its markdown
      navigateToNode(markdownResult.id);
      
      // Open markdown modal after a short delay to ensure navigation completes
      setTimeout(() => {
        if (window.MarkdownManager) {
          MarkdownManager.openModal(markdownResult.id);
        }
      }, 300);
      
      closeSearchModal();
    });
    
    return resultItem;
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