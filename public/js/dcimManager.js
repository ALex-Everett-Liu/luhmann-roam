/**
 * DCIM (Digital Content Image Management) Manager Module
 * Handles image management functionality
 */
const DcimManager = (function() {
    // Private variables
    let modalElement = null;
    let currentImages = [];
    let currentFilters = {};
    let customRankingFilters = [];
    let currentPage = 1;
    let totalPages = 1;
    const imagesPerPage = 36;

    /**
     * Creates a debounced function that delays invoking func until after wait milliseconds
     * @param {Function} func - The function to debounce
     * @param {number} wait - The number of milliseconds to delay
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
     * Initialize the manager
     */
    function initialize() {
      // Check if modal already exists, don't create duplicate
      if (document.getElementById('dcim-modal')) {
        return;
      }
      
      // Add necessary styles
      addDcimStyles();
      
      // Create sidebar button for Image Manager
      createSidebarButton();
      
      // Add keyboard event listener for closing the modal when it's open
      document.addEventListener('keydown', (e) => {
        const modal = document.getElementById('dcim-modal');
        if (e.key === 'Escape' && modal && modal.style.display === 'block') {
          closeModal();
        }
      });
      
      // Make sure custom ranking filters are loaded
      if (!localStorage.getItem('customRankingFilters')) {
        localStorage.setItem('customRankingFilters', JSON.stringify([]));
      }
      
      // DO NOT create the modal or load images here
      // They will be created when openImageManager is called
    }
    
    /**
     * Add CSS styles for DCIM components
     */
    function addDcimStyles() {
      // Check if the CSS file link already exists
      if (document.querySelector('link[href*="dcim-manager.css"]')) return;
      
      // Add the link to the external CSS file
      const cssLink = document.createElement('link');
      cssLink.rel = 'stylesheet';
      cssLink.href = '/css/features/dcim-manager.css';
      document.head.appendChild(cssLink);
    }
    
    /**
     * Creates the DCIM modal if it doesn't exist
     * @returns {HTMLElement} The modal element
     */
    function createModal() {
      // Check if modal already exists
      if (document.getElementById('dcim-modal')) {
        return document.getElementById('dcim-modal');
      }
      
      const modalHTML = `
        <div id="dcim-modal" class="modal-overlay" style="display: none;">
          <div class="modal dcim-modal">
            <div class="modal-header">
              <h3 class="modal-title">Image Manager</h3>
              <button class="modal-close" id="close-dcim-modal">&times;</button>
            </div>
            <div class="modal-body" style="height: calc(90vh - 130px);">
              <div class="dcim-container">
                <div class="dcim-sidebar">
                  <div class="dcim-actions">
                    <button id="dcim-add-image" class="btn btn-primary">Add New Image</button>
                    <button id="dcim-settings" class="btn">Settings</button>
                    <button id="dcim-webp-converter" class="btn">WebP Converter</button>
                  </div>
                  <div class="dcim-filters">
                    <div class="dcim-filter-group">
                      <div class="dcim-filter-title">Sort By</div>
                      <select id="sort-method" class="dcim-select">
                        <option value="ranking_desc">Ranking (Highest First)</option>
                        <option value="ranking_asc">Ranking (Lowest First)</option>
                        <option value="rating_desc">Rating (Highest First)</option>
                        <option value="rating_asc">Rating (Lowest First)</option>
                        <option value="date_desc">Date (Newest First)</option>
                        <option value="date_asc">Date (Oldest First)</option>
                      </select>
                    </div>
                    <div class="dcim-filter-group">
                      <div class="dcim-filter-title">Filter By</div>
                      <div>
                        <label>Rating:</label>
                        <select id="filter-rating" class="dcim-select">
                          <option value="">All Ratings</option>
                          <option value="5">★★★★★</option>
                          <option value="4">★★★★+</option>
                          <option value="3">★★★+</option>
                          <option value="2">★★+</option>
                          <option value="1">★+</option>
                        </select>
                      </div>
                      <div>
                        <label>Ranking:</label>
                        <select id="filter-ranking" class="dcim-select">
                          <option value="">All Rankings</option>
                          <option value="800">800+</option>
                          <option value="600">600+</option>
                          <option value="400">400+</option>
                          <option value="200">200+</option>
                        </select>
                        <button id="customize-ranking-filter" class="btn btn-small customize-icon" title="Customize ranking filters">⚙️</button>
                      </div>
                      <div>
                        <label>Type:</label>
                        <input type="text" id="filter-type" class="dcim-input" placeholder="Filter by type...">
                      </div>
                      <div>
                        <label>Search:</label>
                        <input type="text" id="dcim-search" class="dcim-input" placeholder="Search images...">
                      </div>
                    </div>
                    <div class="dcim-filter-group">
                      <div class="dcim-filter-title">Tags</div>
                      <div class="dcim-tag-search">
                        <input type="text" id="dcim-tag-search" class="dcim-tag-search-input" placeholder="Search tags...">
                        <button id="dcim-tag-search-clear" class="dcim-tag-search-clear" title="Clear search">×</button>
                      </div>
                      <div class="dcim-tag-combination">
                        <div class="dcim-radio-group">
                          <input type="radio" id="tag-combo-and" name="tag-combo" value="AND" checked>
                          <label for="tag-combo-and">All tags (AND)</label>
                        </div>
                        <div class="dcim-radio-group">
                          <input type="radio" id="tag-combo-or" name="tag-combo" value="OR">
                          <label for="tag-combo-or">Any tag (OR)</label>
                        </div>
                      </div>
                      <div class="dcim-tag-actions">
                        <div class="dcim-tag-selected-count">
                          <span id="dcim-tag-selected-count">0</span> tags selected
                        </div>
                        <button id="dcim-tag-clear-all" class="dcim-tag-clear-all">Clear all</button>
                      </div>
                      <div id="dcim-tag-filters" class="dcim-tag-filters dcim-tag-filter-container"></div>
                    </div>
                    <div id="dcim-filter-count" class="dcim-filter-count"></div>
                    <div class="dcim-toggle-filter">
                      <label for="filter-major-only">Show:</label>
                      <div class="dcim-toggle-switch" id="toggle-switch-container">
                          <input type="checkbox" id="filter-major-only" class="dcim-toggle-checkbox">
                          <label for="filter-major-only" class="dcim-toggle-label" data-on="Major Only" data-off="All Images"></label>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="dcim-main">
                  <div id="dcim-image-grid" class="dcim-image-grid"></div>
                  <div id="dcim-detail-view" class="dcim-detail-view" style="display: none;"></div>
                  <div id="dcim-add-form" class="dcim-form" style="display: none;"></div>
                  <div id="dcim-settings-view" class="dcim-form" style="display: none;"></div>
                  <div id="dcim-converter-view" class="dcim-form" style="display: none;"></div>
                  <div id="dcim-viewer-container" class="viewer-container" style="display: none;"></div>
                  <div class="dcim-pagination">
                    <div class="dcim-pagination-info">
                      <span id="dcim-pagination-info">Page 1 of 1</span>
                    </div>
                    <div class="dcim-pagination-controls">
                      <button id="dcim-page-first" class="btn btn-small" disabled>&laquo;</button>
                      <button id="dcim-page-prev" class="btn btn-small" disabled>&lsaquo;</button>
                      <span id="dcim-page-current">1</span>
                      <button id="dcim-page-next" class="btn btn-small" disabled>&rsaquo;</button>
                      <button id="dcim-page-last" class="btn btn-small" disabled>&raquo;</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      // Add modal to DOM
      document.body.insertAdjacentHTML('beforeend', modalHTML);
      
      // Add event listeners
      document.getElementById('close-dcim-modal').addEventListener('click', closeModal);
      document.getElementById('dcim-add-image').addEventListener('click', showAddImageForm);
      document.getElementById('dcim-settings').addEventListener('click', showSettings);
      document.getElementById('dcim-webp-converter').addEventListener('click', showWebPConverter);
      document.getElementById('customize-ranking-filter').addEventListener('click', showCustomRankingFilterDialog);
      
      // Add filter change listeners
      document.getElementById('filter-rating').addEventListener('change', applyFilters);
      document.getElementById('filter-ranking').addEventListener('change', applyFilters);
      document.getElementById('filter-type').addEventListener('input', debounce(applyFilters, 300));
      document.getElementById('dcim-search').addEventListener('input', debounce(applyFilters, 300));
      document.getElementById('sort-method').addEventListener('change', applyFilters);
      
      // Add tag search and filter listeners
      document.getElementById('dcim-tag-search').addEventListener('input', debounce(filterTagList, 300));
      document.getElementById('dcim-tag-search-clear').addEventListener('click', clearTagSearch);
      document.getElementById('dcim-tag-clear-all').addEventListener('click', clearAllTags);
      document.getElementById('tag-combo-and').addEventListener('change', applyFilters);
      document.getElementById('tag-combo-or').addEventListener('change', applyFilters);
      
      // Initialize ranking filters
      populateRankingFilters();
      
      // Add major images toggle listener
      document.getElementById('filter-major-only').addEventListener('change', applyFilters);

      setupPaginationHandlers();

      // Add click handler for the toggle switch container for better UX
      document.getElementById('toggle-switch-container').addEventListener('click', (e) => {
        // Only handle clicks on the container itself, not on the checkbox
        if (e.target.id === 'toggle-switch-container') {
          const checkbox = document.getElementById('filter-major-only');
          checkbox.checked = !checkbox.checked;
          
          // Manually trigger change event
          const event = new Event('change');
          checkbox.dispatchEvent(event);
        }
      });
      
      return document.getElementById('dcim-modal');
    }
    
    /**
     * Opens the Image Manager modal
     */
    function openImageManager() {
        modalElement = createModal();
        modalElement.style.display = 'flex';
      
      // Load images
      loadImages();
    }
    
    /**
     * Closes the modal
     */
    function closeModal() {
      if (modalElement) {
        modalElement.style.display = 'none';
      }
    }
    
    /**
     * Loads images from the server
     */
    async function loadImages() {
      try {
        const response = await fetch('/api/dcim');
        currentImages = await response.json();
        
        // Populate tag filters
        populateTagFilters(currentImages);
        
        // Set default filter state (show all images)
        const majorOnlyFilter = document.getElementById('filter-major-only');
        if (majorOnlyFilter) {
          // Check localStorage for saved preference
          const savedPreference = localStorage.getItem('dcim-show-major-only');
          majorOnlyFilter.checked = savedPreference === 'true';
        }
        
        // Render the images
        renderImageGrid(currentImages);
      } catch (error) {
        console.error('Error loading images:', error);
        alert('Failed to load images');
      }
    }
    
    /**
     * Populates tag filters based on available tags
     * @param {Array} images - The array of image objects
     */
    function populateTagFilters(images) {
      const tagsContainer = document.getElementById('dcim-tag-filters');
      const allTags = new Set();
      const tagCounts = {};
      
      // Collect all unique tags and count occurrences
      images.forEach(img => {
        if (img.tags) {
          img.tags.split(',').forEach(tag => {
            const trimmedTag = tag.trim();
            if (trimmedTag) {
              allTags.add(trimmedTag);
              tagCounts[trimmedTag] = (tagCounts[trimmedTag] || 0) + 1;
            }
          });
        }
      });
      
      // Sort tags alphabetically
      const sortedTags = Array.from(allTags).sort();
      
      // Create tag filter checkboxes
      tagsContainer.innerHTML = '';
      
      sortedTags.forEach(tag => {
        const tagDiv = document.createElement('div');
        tagDiv.className = 'dcim-tag-filter';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `tag-${tag}`;
        checkbox.value = tag;
        checkbox.addEventListener('change', () => {
          updateSelectedTagCount();
          applyFilters();
        });
        
        const label = document.createElement('label');
        label.htmlFor = `tag-${tag}`;
        label.textContent = tag;
        
        // Add count indicator
        const countSpan = document.createElement('span');
        countSpan.className = 'dcim-tag-count';
        countSpan.textContent = `(${tagCounts[tag]})`;
        
        label.appendChild(countSpan);
        tagDiv.appendChild(checkbox);
        tagDiv.appendChild(label);
        tagsContainer.appendChild(tagDiv);
      });
      
      // Initialize the selected tag count
      updateSelectedTagCount();
    }

    /**
 * Loads custom ranking filters from localStorage
 * @returns {Array} Array of custom ranking filters
 */
function loadCustomRankingFilters() {
    const savedFilters = localStorage.getItem('dcim-custom-ranking-filters');
    return savedFilters ? JSON.parse(savedFilters) : [];
  }
  
  /**
   * Saves custom ranking filters to localStorage
   * @param {Array} filters - Array of custom ranking filters to save
   */
  function saveCustomRankingFilters(filters) {
    localStorage.setItem('dcim-custom-ranking-filters', JSON.stringify(filters));
  }
  
  /**
   * Populates the ranking filter dropdown including custom filters
   */
  function populateRankingFilters() {
    const rankingSelect = document.getElementById('filter-ranking');
    
    // Get custom filters
    const customFilters = loadCustomRankingFilters();
    
    // Save the currently selected value
    const currentValue = rankingSelect.value;
    
    // Clear the select and add default options
    rankingSelect.innerHTML = `
      <option value="">All Rankings</option>
      <option value="800">800+</option>
      <option value="600">600+</option>
      <option value="400">400+</option>
      <option value="200">200+</option>
    `;
    
    // Add separator if we have custom filters
    if (customFilters.length > 0) {
      const separator = document.createElement('option');
      separator.disabled = true;
      separator.textContent = '───────────────';
      rankingSelect.appendChild(separator);
      
      // Add custom filters
      customFilters.forEach(filter => {
        const option = document.createElement('option');
        option.value = JSON.stringify({min: filter.minValue, max: filter.maxValue});
        
        let displayText;
        if (filter.maxValue) {
          displayText = `${filter.name} (${filter.minValue}-${filter.maxValue})`;
        } else {
          displayText = `${filter.name} (${filter.minValue}+)`;
        }
        
        option.textContent = displayText;
        rankingSelect.appendChild(option);
      });
    }
    
    // Restore selected value if it exists
    if (currentValue) {
      rankingSelect.value = currentValue;
      // If the value doesn't exist anymore, select the first option
      if (rankingSelect.value !== currentValue) {
        rankingSelect.selectedIndex = 0;
      }
    }
  }
  
  /**
   * Shows the custom ranking filter dialog
   */
  function showCustomRankingFilterDialog() {
    // Create a modal dialog for adding custom filters
    const dialogHTML = `
      <div id="ranking-filter-dialog" class="modal-overlay" style="display: flex; z-index: 10000;">
        <div class="modal" style="width: 400px; max-width: 95%;">
          <div class="modal-header">
            <h3 class="modal-title">Custom Ranking Filter</h3>
            <button class="modal-close" id="close-ranking-dialog">&times;</button>
          </div>
          <div class="modal-body">
            <div style="margin-bottom: 15px;">
              <label for="filter-name">Filter Name:</label>
              <input type="text" id="filter-name" class="dcim-input" placeholder="e.g., Medium Tier" style="width: 100%;">
            </div>
            <div style="margin-bottom: 15px; display: flex; gap: 10px;">
              <div style="flex: 1;">
                <label for="filter-min-value">Min Ranking:</label>
                <input type="number" id="filter-min-value" class="dcim-input" min="1" max="1000" step="1" placeholder="e.g., 200" style="width: 100%;">
              </div>
              <div style="flex: 1;">
                <label for="filter-max-value">Max Ranking:</label>
                <input type="number" id="filter-max-value" class="dcim-input" min="1" max="1000" step="1" placeholder="e.g., 500" style="width: 100%;">
              </div>
            </div>
            <div style="margin-bottom: 15px; display: flex; justify-content: space-between;">
              <button id="save-custom-filter" class="btn btn-primary">Save Filter</button>
              <button id="cancel-custom-filter" class="btn">Cancel</button>
            </div>
            
            <div id="existing-filters" style="margin-top: 20px; border-top: 1px solid #ddd; padding-top: 15px;">
              <h4>Existing Custom Filters</h4>
              <div id="custom-filter-list" style="margin-top: 10px;">
                <!-- Custom filters will be listed here -->
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Add dialog to DOM
    document.body.insertAdjacentHTML('beforeend', dialogHTML);
    
    // Display existing custom filters
    displayExistingCustomFilters();
    
    // Add event listeners
    document.getElementById('close-ranking-dialog').addEventListener('click', closeCustomRankingFilterDialog);
    document.getElementById('cancel-custom-filter').addEventListener('click', closeCustomRankingFilterDialog);
    document.getElementById('save-custom-filter').addEventListener('click', saveCustomFilter);
  }
  
  /**
   * Displays existing custom filters in the dialog
   */
  function displayExistingCustomFilters() {
    const customFilters = loadCustomRankingFilters();
    const filterList = document.getElementById('custom-filter-list');
    
    if (customFilters.length === 0) {
      filterList.innerHTML = '<p>No custom filters yet.</p>';
      return;
    }
    
    filterList.innerHTML = '';
    
    customFilters.forEach((filter, index) => {
      const filterItem = document.createElement('div');
      filterItem.className = 'custom-filter-item';
      filterItem.style.display = 'flex';
      filterItem.style.justifyContent = 'space-between';
      filterItem.style.alignItems = 'center';
      filterItem.style.marginBottom = '8px';
      filterItem.style.padding = '6px';
      filterItem.style.backgroundColor = '#f9f9f9';
      filterItem.style.borderRadius = '4px';
      
      let rangeText;
      if (filter.maxValue) {
        rangeText = `(${filter.minValue}-${filter.maxValue})`;
      } else {
        rangeText = `(${filter.minValue}+)`;
      }
      
      filterItem.innerHTML = `
        <span>${filter.name} ${rangeText}</span>
        <button class="btn btn-danger delete-filter" data-index="${index}" style="padding: 2px 8px;">Delete</button>
      `;
      
      filterList.appendChild(filterItem);
    });
    
    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-filter').forEach(button => {
      button.addEventListener('click', function() {
        const index = parseInt(this.getAttribute('data-index'));
        deleteCustomFilter(index);
      });
    });
  }
  
  /**
   * Deletes a custom filter
   * @param {number} index - The index of the filter to delete
   */
  function deleteCustomFilter(index) {
    const customFilters = loadCustomRankingFilters();
    customFilters.splice(index, 1);
    saveCustomRankingFilters(customFilters);
    
    // Refresh the display
    displayExistingCustomFilters();
    
    // Refresh the ranking filter dropdown
    populateRankingFilters();
  }
  
  /**
   * Saves a new custom filter
   */
  function saveCustomFilter() {
    const nameInput = document.getElementById('filter-name');
    const minValueInput = document.getElementById('filter-min-value');
    const maxValueInput = document.getElementById('filter-max-value');
    
    const name = nameInput.value.trim();
    const minValue = parseInt(minValueInput.value);
    const maxValue = parseInt(maxValueInput.value);
    
    if (!name) {
      alert('Please enter a name for the filter');
      nameInput.focus();
      return;
    }
    
    if (isNaN(minValue) || minValue < 1 || minValue > 1000) {
      alert('Please enter a valid minimum ranking value between 1 and 1000');
      minValueInput.focus();
      return;
    }
    
    // Max value is optional but must be valid if provided
    if (maxValueInput.value && (isNaN(maxValue) || maxValue < 1 || maxValue > 1000)) {
      alert('Please enter a valid maximum ranking value between 1 and 1000');
      maxValueInput.focus();
      return;
    }
    
    // Ensure min <= max if max is provided
    if (maxValueInput.value && minValue > maxValue) {
      alert('Minimum value must be less than or equal to maximum value');
      minValueInput.focus();
      return;
    }
    
    // Load existing filters and add the new one
    const customFilters = loadCustomRankingFilters();
    customFilters.push({
      name,
      minValue,
      maxValue: maxValueInput.value ? maxValue : null
    });
    
    // Sort by minValue in descending order
    customFilters.sort((a, b) => b.minValue - a.minValue);
    
    // Save to localStorage
    saveCustomRankingFilters(customFilters);
    
    // Refresh the display
    displayExistingCustomFilters();
    
    // Clear the inputs
    nameInput.value = '';
    minValueInput.value = '';
    maxValueInput.value = '';
    
    // Refresh the ranking filter dropdown
    populateRankingFilters();
  }
  
  /**
   * Closes the custom ranking filter dialog
   */
  function closeCustomRankingFilterDialog() {
    const dialog = document.getElementById('ranking-filter-dialog');
    if (dialog) {
      dialog.remove();
    }
  }
  
  /**
   * Adds a button to customize ranking filters
   */
  function addCustomRankingFilterButton() {
    const filterGroup = document.querySelector('.dcim-filter-group:nth-child(3)');
    if (!filterGroup) return;
    
    const customizeButton = document.createElement('button');
    customizeButton.id = 'customize-ranking-filters';
    customizeButton.className = 'btn btn-small';
    customizeButton.textContent = 'Customize...';
    customizeButton.style.marginTop = '5px';
    customizeButton.style.fontSize = '12px';
    customizeButton.style.padding = '2px 8px';
    
    customizeButton.addEventListener('click', showCustomRankingFilterDialog);
    
    filterGroup.appendChild(customizeButton);
  }
    
    /**
     * Applies current filters and updates the image grid
     */
    function applyFilters() {
      const ratingFilter = document.getElementById('filter-rating').value;
      const rankingFilterValue = document.getElementById('filter-ranking').value;
      const searchFilter = document.getElementById('dcim-search').value.toLowerCase();
      const typeFilter = document.getElementById('filter-type').value.toLowerCase();
      const sortMethod = document.getElementById('sort-method').value;
      const tagCheckboxes = document.querySelectorAll('#dcim-tag-filters input:checked');
      const selectedTags = Array.from(tagCheckboxes).map(cb => cb.value);
      const tagCombination = document.querySelector('input[name="tag-combo"]:checked').value;
      
      // Parse ranking filter - could be a simple number or a JSON object with min/max
      let rankingMin = null;
      let rankingMax = null;
      
      if (rankingFilterValue) {
        try {
          // Try to parse as JSON (for custom range filters)
          const rangeObj = JSON.parse(rankingFilterValue);
          rankingMin = rangeObj.min;
          rankingMax = rangeObj.max;
        } catch (e) {
          // If not JSON, it's a simple threshold value (like "800")
          rankingMin = parseInt(rankingFilterValue);
        }
      }
      
      // Store current filters
      currentFilters = {
        rating: ratingFilter,
        ranking: rankingFilterValue,
        search: searchFilter,
        type: typeFilter,
        sortMethod: sortMethod,
        tags: selectedTags,
        tagCombination: tagCombination
      };
      
      // Apply filters (same as before)
      let typeFilteredImages = currentImages;
      if (typeFilter) {
        typeFilteredImages = currentImages.filter(img => {
          return img.type && img.type.toLowerCase().includes(typeFilter);
        });
      }
      
      // Apply major-only filter if enabled
      const showMajorOnly = document.getElementById('filter-major-only').checked;
      
      // Store user preference in localStorage
      localStorage.setItem('dcim-show-major-only', showMajorOnly);
      
      // Store in current filters
      currentFilters.showMajorOnly = showMajorOnly;
      
      // Apply all other filters
      let filteredImages = typeFilteredImages.filter(img => {
        // Rating filter
        if (ratingFilter && (!img.rating || img.rating < parseInt(ratingFilter))) {
          return false;
        }
        
        // Ranking filter (with support for ranges)
        if (rankingMin !== null) {
          // Handle case where image has no ranking
          if (!img.ranking) return false;
          
          // Check minimum value
          if (img.ranking < rankingMin) return false;
          
          // Check maximum value if set
          if (rankingMax !== null && img.ranking > rankingMax) return false;
        }
        
        // Search filter
        if (searchFilter) {
          const searchFields = [
            img.filename,
            img.tags,
            img.person,
            img.location
          ].filter(Boolean).join(' ').toLowerCase();
          
          if (!searchFields.includes(searchFilter)) {
            return false;
          }
        }
        
        // Tag filter with combination logic
        if (selectedTags.length > 0 && img.tags) {
          const imageTags = img.tags.split(',').map(t => t.trim());
          
          if (tagCombination === 'AND') {
            const hasAllSelectedTags = selectedTags.every(tag => imageTags.includes(tag));
            if (!hasAllSelectedTags) {
              return false;
            }
          } else {
            const hasAnySelectedTag = selectedTags.some(tag => imageTags.includes(tag));
            if (!hasAnySelectedTag) {
              return false;
            }
          }
        }
        
        // Apply major-only filter if enabled
        if (showMajorOnly) {
          return img.parent_id === null || img.parent_id === undefined;
        }
        
        return true;
      });
      
      // Apply sort method
      switch (sortMethod) {
        case 'ranking_desc':
          filteredImages.sort((a, b) => (b.ranking || 0) - (a.ranking || 0));
          break;
        case 'ranking_asc':
          filteredImages.sort((a, b) => (a.ranking || 0) - (b.ranking || 0));
          break;
        case 'date_desc':
          filteredImages.sort((a, b) => (b.creation_time || 0) - (a.creation_time || 0));
          break;
        case 'date_asc':
          filteredImages.sort((a, b) => (a.creation_time || 0) - (b.creation_time || 0));
          break;
        case 'rating_desc':
          filteredImages.sort((a, b) => (b.rating || 0) - (a.rating || 0));
          break;
        case 'rating_asc':
          filteredImages.sort((a, b) => (a.rating || 0) - (b.rating || 0));
          break;
        default:
          // Default sort by date newest first
          filteredImages.sort((a, b) => b.created_at - a.created_at);
      }
      
      // Calculate pagination
      totalPages = Math.ceil(filteredImages.length / imagesPerPage);
      
      // Reset to page 1 if current page is out of bounds
      if (currentPage > totalPages) {
        currentPage = 1;
      }
      
      // Update UI to show filter counts
      const countElement = document.getElementById('dcim-filter-count');
      if (countElement) {
        countElement.textContent = `Showing ${filteredImages.length} of ${currentImages.length} images`;
      }
      
      // Update pagination info
      updatePaginationControls(filteredImages.length);
      
      // Get current page of images
      const startIndex = (currentPage - 1) * imagesPerPage;
      const endIndex = startIndex + imagesPerPage;
      const paginatedImages = filteredImages.slice(startIndex, endIndex);
      
      // Render the filtered images for current page
      renderImageGrid(paginatedImages);
    }

    // Add this function to update pagination controls
    function updatePaginationControls(totalItems) {
      const pageInfoElement = document.getElementById('dcim-pagination-info');
      const currentPageElement = document.getElementById('dcim-page-current');
      const firstButton = document.getElementById('dcim-page-first');
      const prevButton = document.getElementById('dcim-page-prev');
      const nextButton = document.getElementById('dcim-page-next');
      const lastButton = document.getElementById('dcim-page-last');
      
      // Update page info
      pageInfoElement.textContent = `Page ${currentPage} of ${totalPages} (${totalItems} images)`;
      currentPageElement.textContent = currentPage;
      
      // Update button states
      firstButton.disabled = currentPage === 1;
      prevButton.disabled = currentPage === 1;
      nextButton.disabled = currentPage === totalPages || totalPages === 0;
      lastButton.disabled = currentPage === totalPages || totalPages === 0;
    }

    // Add pagination event handlers
    function setupPaginationHandlers() {
      document.getElementById('dcim-page-first').addEventListener('click', () => {
        if (currentPage !== 1) {
          currentPage = 1;
          applyFilters();
        }
      });
      
      document.getElementById('dcim-page-prev').addEventListener('click', () => {
        if (currentPage > 1) {
          currentPage--;
          applyFilters();
        }
      });
      
      document.getElementById('dcim-page-next').addEventListener('click', () => {
        if (currentPage < totalPages) {
          currentPage++;
          applyFilters();
        }
      });
      
      document.getElementById('dcim-page-last').addEventListener('click', () => {
        if (currentPage !== totalPages) {
          currentPage = totalPages;
          applyFilters();
        }
      });
    }

    /**
 * Debugs the toggle button interactions
 */
function debugToggleButton() {
    const checkbox = document.getElementById('filter-major-only');
    if (!checkbox) return;
    
    console.log('Setting up toggle debug...');
    
    // Add visual indicator for clicks
    const toggleSwitch = document.getElementById('toggle-switch-container');
    if (toggleSwitch) {
      toggleSwitch.addEventListener('click', () => {
        console.log('Toggle container clicked');
        // Add visual flash to show click registered
        toggleSwitch.style.outline = '2px solid red';
        setTimeout(() => {
          toggleSwitch.style.outline = '';
        }, 300);
      });
    }
    
    // Monitor checkbox state changes
    checkbox.addEventListener('change', () => {
      console.log('Checkbox state changed to:', checkbox.checked);
      
      // Add UI notification for easier debugging
      const notification = document.createElement('div');
      notification.textContent = `Toggle changed: ${checkbox.checked ? 'Major Only' : 'All Images'}`;
      notification.style.position = 'fixed';
      notification.style.bottom = '20px';
      notification.style.right = '20px';
      notification.style.padding = '10px';
      notification.style.backgroundColor = 'rgba(0,0,0,0.7)';
      notification.style.color = 'white';
      notification.style.borderRadius = '4px';
      notification.style.zIndex = '9999';
      
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.remove();
      }, 2000);
    });
  }
  
  // Call this in the openImageManager function, right after loadImages()
  // loadImages();
  // debugToggleButton();
  
  
    
    /**
     * Renders the image grid with given images
     * @param {Array} images - The array of image objects to render
     */
    function renderImageGrid(images) {
      const gridContainer = document.getElementById('dcim-image-grid');
      const viewerContainer = document.getElementById('dcim-viewer-container');
      
      // Show grid, hide viewer container
      gridContainer.style.display = 'grid';
      if (viewerContainer) {
        viewerContainer.style.display = 'none';
      }
      
      // Clear grid and render images
      gridContainer.innerHTML = '';
      
      if (images.length === 0) {
        gridContainer.innerHTML = `
          <div class="dcim-empty-state">
            <p>No images found. Add your first image to get started.</p>
          </div>
        `;
        return;
      }
      
      images.forEach(image => {
        const card = document.createElement('div');
        card.className = 'dcim-image-card';
        card.dataset.id = image.id;
        
        // Show address type indicator
        let addressIndicator = '';
        if (image.url && image.file_path) {
          addressIndicator = '<span class="dcim-address-indicator" title="Has both URL and local path">🔗</span>';
        } else if (image.url) {
          addressIndicator = '<span class="dcim-address-indicator" title="Has URL">🌐</span>';
        } else if (image.file_path) {
          addressIndicator = '<span class="dcim-address-indicator" title="Has local path">📁</span>';
        }

        // Show subsidiary indicator if the image has a parent
        let subsidiaryIndicator = '';
        if (image.parent_id) {
          subsidiaryIndicator = '<span class="dcim-subsidiary-badge" title="Subsidiary Image">Subsidiary</span>';
        }

        card.innerHTML = `
          <img src="${image.thumbnail_path || image.url}" alt="${image.filename}" class="dcim-thumbnail" onerror="this.src='/images/default-thumbnail.jpg'">
          ${subsidiaryIndicator}
          <div class="dcim-image-info">
            <div class="dcim-image-title">${image.filename} ${addressIndicator}</div>
            <div class="dcim-image-meta">
              <span>${formatFileSize(image.file_size || 0)}</span>
              <span>${'★'.repeat(image.rating || 0)}</span>
            </div>
          </div>
        `;

        card.addEventListener('click', () => {
          showImageDetail(image.id);
        });

        gridContainer.appendChild(card);
      });
    }
    
    /**
     * Shows the detail view for a specific image
     * @param {string} imageId - The ID of the image to display
     */
    async function showImageDetail(imageId) {
      try {
        const response = await fetch(`/api/dcim/${imageId}`);
        const image = await response.json();
        
        // Create the detail view container if it doesn't exist
        let detailView = document.getElementById('dcim-detail-view');
        if (!detailView) {
          detailView = document.createElement('div');
          detailView.id = 'dcim-detail-view';
          detailView.style.display = 'none';
          document.querySelector('.modal-body').appendChild(detailView);
        }
        
        // Show detail view, hide other views
        document.getElementById('dcim-image-grid').style.display = 'none';
        
        // Hide other containers if they exist
        const viewerContainer = document.getElementById('dcim-viewer-container');
        if (viewerContainer) viewerContainer.style.display = 'none';
        
        const addForm = document.getElementById('dcim-add-form');
        if (addForm) addForm.style.display = 'none';
        
        const settingsView = document.getElementById('dcim-settings-view');
        if (settingsView) settingsView.style.display = 'none';
        
        const converterView = document.getElementById('dcim-converter-view');
        if (converterView) converterView.style.display = 'none';
        
        detailView.style.display = 'flex';
        
        // Render detail view
        detailView.innerHTML = `
          <div class="dcim-detail-header">
            <h3>${image.filename}</h3>
            <div>
              <button id="dcim-view-full-image" class="btn btn-primary">View Full Image</button>
              <button id="dcim-back-button" class="btn">Back to Gallery</button>
            </div>
          </div>
          <div class="dcim-address-fields">
            <div class="dcim-form-group">
              <label for="dcim-title">Filename:</label>
              <input type="text" id="dcim-filename" class="dcim-input" value="${image.filename || ''}">
            </div>
            <div class="dcim-form-group">
              <label for="dcim-url">URL:</label>
              <input type="text" id="dcim-url" class="dcim-input" value="${image.url || ''}" placeholder="Web URL (optional if local file exists)">
            </div>
            <div class="dcim-form-group">
              <label for="dcim-file-path">Local File Path:</label>
              <input type="text" id="dcim-file-path" class="dcim-input" value="${image.file_path || ''}" placeholder="Local file path (optional if URL exists)">
            </div>
          </div>
          <div class="dcim-detail-form">
            <div class="dcim-form-group">
              <label>File Size</label>
              <input type="text" value="${formatFileSize(image.file_size)}" readonly class="dcim-input">
            </div>
            <div class="dcim-form-group">
              <label>Ranking (1-1000)</label>
              <input type="number" id="edit-ranking" value="${image.ranking || ''}" min="1" max="1000" step="0.1" class="dcim-input">
            </div>
            <div class="dcim-form-group">
              <label>Rating</label>
              <div class="dcim-rating" id="edit-rating">
                <span class="dcim-star ${image.rating >= 1 ? 'active' : ''}" data-value="1">★</span>
                <span class="dcim-star ${image.rating >= 2 ? 'active' : ''}" data-value="2">★</span>
                <span class="dcim-star ${image.rating >= 3 ? 'active' : ''}" data-value="3">★</span>
                <span class="dcim-star ${image.rating >= 4 ? 'active' : ''}" data-value="4">★</span>
                <span class="dcim-star ${image.rating >= 5 ? 'active' : ''}" data-value="5">★</span>
              </div>
            </div>
            <div class="dcim-form-group">
              <label>Tags (comma separated)</label>
              <input type="text" id="edit-tags" value="${image.tags || ''}" class="dcim-input">
            </div>
            <div class="dcim-form-group">
              <label>Person</label>
              <input type="text" id="edit-person" value="${image.person || ''}" class="dcim-input">
            </div>
            <div class="dcim-form-group">
              <label>Location</label>
              <input type="text" id="edit-location" value="${image.location || ''}" class="dcim-input">
            </div>
            <div class="dcim-form-group">
              <label>Type</label>
              <input type="text" id="edit-type" value="${image.type || ''}" class="dcim-input">
            </div>
            <div class="dcim-form-group">
              <label>Creation Time</label>
              <input type="datetime-local" id="edit-creation-time" 
                value="${image.creation_time ? formatDateTimeForInput(parseInt(image.creation_time)) : ''}"
                class="dcim-input">
            </div>
          </div>
          <div class="dcim-detail-actions">
            <div>
              <button id="dcim-save-image" class="btn btn-primary">Save Changes</button>
              <button id="dcim-convert-webp" class="btn">Convert to WebP</button>
            </div>
            <button id="dcim-delete-image" class="btn btn-danger">Delete Image</button>
          </div>
          <div class="dcim-subsidiary-images">
            <div class="dcim-subsidiary-header">
                <h4>Subsidiary Images</h4>
                <div>
                <button id="dcim-add-subsidiary" class="btn">Add Subsidiary Image</button>
                <button id="dcim-manage-subsidiaries" class="btn">Manage Subsidiaries</button>
                </div>
            </div>
            <div id="dcim-subsidiary-grid" class="dcim-subsidiary-grid">
                <div class="dcim-loading">Loading subsidiary images...</div>
            </div>
          </div>
        `;

        // Load and display subsidiary images using the SubsidiaryImageManager
        SubsidiaryImageManager.loadSubsidiaryImages(image.id);

        // Add event listeners for subsidiary buttons
        document.getElementById('dcim-add-subsidiary').addEventListener('click', () => SubsidiaryImageManager.showAddSubsidiaryForm(image.id));
        document.getElementById('dcim-manage-subsidiaries').addEventListener('click', () => SubsidiaryImageManager.showManageSubsidiariesDialog(image.id));
        
        // Add event listeners
        document.getElementById('dcim-back-button').addEventListener('click', () => {
          document.getElementById('dcim-image-grid').style.display = 'grid';
          detailView.style.display = 'none';
        });
        
        document.getElementById('dcim-save-image').addEventListener('click', () => saveImageChanges(image.id));
        document.getElementById('dcim-delete-image').addEventListener('click', () => deleteImage(image.id));
        document.getElementById('dcim-convert-webp').addEventListener('click', () => convertToWebP(image.id));
        
        // Star rating functionality
        const stars = document.querySelectorAll('.dcim-star');
        stars.forEach(star => {
          star.addEventListener('click', function() {
            const value = parseInt(this.getAttribute('data-value'));
            
            // Toggle off if already active
            const newRating = (image.rating === value) ? 0 : value;
            
            // Update UI
            stars.forEach(s => {
              const starValue = parseInt(s.getAttribute('data-value'));
              if (starValue <= newRating) {
                s.classList.add('active');
              } else {
                s.classList.remove('active');
              }
            });
            
            // Update image object
            image.rating = newRating;
          });
        });
        
        // Add an event listener for the view full image button
        document.getElementById('dcim-view-full-image').addEventListener('click', () => {
          showImageViewer(image);
        });
        
        // Preload ViewerJS library if not loaded
        if (!window.Viewer) {
          const viewerCss = document.createElement('link');
          viewerCss.rel = 'stylesheet';
          viewerCss.href = 'https://cdnjs.cloudflare.com/ajax/libs/viewerjs/1.11.3/viewer.min.css';
          document.head.appendChild(viewerCss);
          
          const viewerScript = document.createElement('script');
          viewerScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/viewerjs/1.11.3/viewer.min.js';
          document.head.appendChild(viewerScript);
        }
        
      } catch (error) {
        console.error('Error loading image details:', error);
        alert('Failed to load image details');
      }
    }
    
    /**
     * Shows a full image viewer with zoom and rotation controls
     * @param {Object} image - The image object to display
     */
    function showImageViewer(image) {
      const gridContainer = document.getElementById('dcim-image-grid');
      const detailView = document.getElementById('dcim-detail-view');
      const addForm = document.getElementById('dcim-add-form');
      const settingsView = document.getElementById('dcim-settings-view');
      const converterView = document.getElementById('dcim-converter-view');
      const viewerContainer = document.getElementById('dcim-viewer-view') || createViewerContainer();
      
      // Hide other views, show the viewer
      gridContainer.style.display = 'none';
      detailView.style.display = 'none';
      addForm.style.display = 'none';
      settingsView.style.display = 'none';
      converterView.style.display = 'none';
      viewerContainer.style.display = 'flex';
      
      // Set image source - prefer the original URL over file path
      const imageSrc = image.url || image.file_path;
      if (!imageSrc) {
        alert('No image source available');
        return;
      }
      
      // Set the image content
      const viewerImage = document.getElementById('dcim-viewer-image');
      viewerImage.src = imageSrc;
      viewerImage.dataset.imageId = image.id;
      
      // Update title
      document.getElementById('dcim-viewer-title').textContent = image.filename;
      
      // Ensure the ViewerJS is initialized
      if (window.Viewer && !viewerImage._viewer) {
        viewerImage._viewer = new Viewer(viewerImage, {
          inline: true,
          navbar: false,
          title: false,
          toolbar: false,
          tooltip: false,
          movable: true,
          zoomable: true,
          rotatable: true,
          scalable: true,
          transition: true,
          fullscreen: false,
          keyboard: true,
          backdrop: false,
          container: document.getElementById('dcim-viewer-container')
        });
      }
    }
    
    /**
     * Creates the viewer container if it doesn't exist
     * @returns {HTMLElement} The viewer container element
     */
    function createViewerContainer() {
      const viewerHTML = `
        <div id="dcim-viewer-view" class="dcim-viewer-view" style="display: none; flex-direction: column; height: 100%;">
          <div class="dcim-viewer-toolbar" style="padding: 10px; background-color: #333; color: white; display: flex; justify-content: space-between; align-items: center; z-index: 2001;">
            <div>
              <button id="dcim-viewer-back" class="btn">Back to Details</button>
            </div>
            <h3 id="dcim-viewer-title">Image Viewer</h3>
            <div class="dcim-viewer-controls">
              <button id="dcim-viewer-zoom-in" class="btn">Zoom In</button>
              <button id="dcim-viewer-zoom-out" class="btn">Zoom Out</button>
              <div class="dcim-viewer-zoom-control" style="display: inline-flex; align-items: center; margin: 0 8px;">
                <input type="number" id="dcim-viewer-zoom-percent" style="width: 60px;" min="10" max="1000" value="100">
                <span style="margin: 0 4px; color: white;">%</span>
                <button id="dcim-viewer-apply-zoom" class="btn">Apply</button>
              </div>
              <button id="dcim-viewer-rotate-left" class="btn">Rotate Left</button>
              <button id="dcim-viewer-rotate-right" class="btn">Rotate Right</button>
              <button id="dcim-viewer-fullscreen" class="btn">Fullscreen</button>
              <button id="dcim-viewer-save-settings" class="btn btn-primary">Save Settings</button>
            </div>
          </div>
          <div id="dcim-viewer-container" class="dcim-viewer-container" style="flex-grow: 1; display: flex; justify-content: center; align-items: center; overflow: hidden; background-color: #1e1e1e;">
            <img id="dcim-viewer-image" src="" alt="Image View" style="max-width: 100%; max-height: 100%; object-fit: contain;">
          </div>
        </div>
        
        <!-- Fullscreen container that covers the entire browser window -->
        <div id="dcim-fullscreen-viewer" class="dcim-fullscreen-viewer" style="display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: rgba(0, 0, 0, 0.9); z-index: 9000;">
          <div class="dcim-viewer-toolbar" style="padding: 10px; background-color: #333; color: white; display: flex; justify-content: space-between; align-items: center; z-index: 9001;">
            <div>
              <button id="dcim-fs-exit" class="btn">Exit Fullscreen</button>
            </div>
            <h3 id="dcim-fs-title">Image Viewer</h3>
            <div class="dcim-viewer-controls">
              <button id="dcim-fs-zoom-in" class="btn">Zoom In</button>
              <button id="dcim-fs-zoom-out" class="btn">Zoom Out</button>
              <div class="dcim-viewer-zoom-control" style="display: inline-flex; align-items: center; margin: 0 8px;">
                <input type="number" id="dcim-fs-zoom-percent" style="width: 60px;" min="10" max="1000" value="100">
                <span style="margin: 0 4px; color: white;">%</span>
                <button id="dcim-fs-apply-zoom" class="btn">Apply</button>
              </div>
              <button id="dcim-fs-rotate-left" class="btn">Rotate Left</button>
              <button id="dcim-fs-rotate-right" class="btn">Rotate Right</button>
              <button id="dcim-fs-save-settings" class="btn btn-primary">Save Settings</button>
            </div>
          </div>
          <div id="dcim-fs-container" class="dcim-fs-container" style="width: 100%; height: calc(100% - 60px); overflow: auto; display: flex; justify-content: center; align-items: center; position: relative;">
            <!-- Image will be positioned absolutely within this container -->
            <div id="dcim-fs-image-wrapper" style="position: absolute; transform-origin: center center;">
              <img id="dcim-fs-image" src="" alt="Fullscreen Image" style="display: block;">
            </div>
          </div>
        </div>
      `;
      
      // Add container to DOM
      const mainContainer = document.querySelector('.dcim-main');
      mainContainer.insertAdjacentHTML('beforeend', viewerHTML);
      
      // Set up event listeners for the regular viewer
      document.getElementById('dcim-viewer-back').addEventListener('click', () => {
        document.getElementById('dcim-viewer-view').style.display = 'none';
        document.getElementById('dcim-detail-view').style.display = 'flex';
      });
      
      document.getElementById('dcim-viewer-zoom-in').addEventListener('click', () => {
        const viewer = document.getElementById('dcim-viewer-image')._viewer;
        if (viewer) {
          viewer.zoom(0.1);
          updateViewerZoomPercentage(viewer);
        }
      });
      
      document.getElementById('dcim-viewer-zoom-out').addEventListener('click', () => {
        const viewer = document.getElementById('dcim-viewer-image')._viewer;
        if (viewer) {
          viewer.zoom(-0.1);
          updateViewerZoomPercentage(viewer);
        }
      });
      
      document.getElementById('dcim-viewer-rotate-left').addEventListener('click', () => {
        const viewer = document.getElementById('dcim-viewer-image')._viewer;
        if (viewer) {
          viewer.rotate(-90);
        }
      });
      
      document.getElementById('dcim-viewer-rotate-right').addEventListener('click', () => {
        const viewer = document.getElementById('dcim-viewer-image')._viewer;
        if (viewer) {
          viewer.rotate(90);
        }
      });
      
      document.getElementById('dcim-viewer-apply-zoom').addEventListener('click', () => {
        const viewer = document.getElementById('dcim-viewer-image')._viewer;
        if (!viewer) return;
        
        const zoomPercent = parseInt(document.getElementById('dcim-viewer-zoom-percent').value);
        if (!isNaN(zoomPercent) && zoomPercent >= 10 && zoomPercent <= 1000) {
          // Calculate the ratio to apply based on current zoom
          const currentZoom = viewer.imageData.ratio;
          const targetZoom = zoomPercent / 100;
          const zoomRatio = targetZoom / currentZoom - 1;
          
          viewer.zoom(zoomRatio);
        }
      });
      
      document.getElementById('dcim-viewer-save-settings').addEventListener('click', () => {
        const viewer = document.getElementById('dcim-viewer-image')._viewer;
        if (!viewer || !viewer.imageData) return;
        
        const zoomPercent = Math.round(viewer.imageData.ratio * 100);
        const rotation = viewer.imageData.rotate || 0;
        const imageId = document.getElementById('dcim-viewer-image').dataset.imageId;
        
        if (!imageId) {
          alert('Cannot save settings: No image ID found');
          return;
        }
        
        saveImageViewerSettings(imageId, { zoom: zoomPercent, rotation: rotation });
      });
      
      // Add fullscreen toggle button listener
      document.getElementById('dcim-viewer-fullscreen').addEventListener('click', () => {
        showFullscreenViewer();
      });
      
      // Set up event listeners for the fullscreen viewer
      document.getElementById('dcim-fs-exit').addEventListener('click', () => {
        hideFullscreenViewer();
      });
      
      // Fullscreen viewer state
      let fsScale = 1;
      let fsRotation = 0;
      let isDragging = false;
      let dragStart = { x: 0, y: 0 };
      let initialPosition = { x: 0, y: 0 };
      let currentPosition = { x: 0, y: 0 };
      
      // Fullscreen zoom controls
      document.getElementById('dcim-fs-zoom-in').addEventListener('click', () => {
        fsScale += 0.1;
        updateFullscreenTransform();
        document.getElementById('dcim-fs-zoom-percent').value = Math.round(fsScale * 100);
      });
      
      document.getElementById('dcim-fs-zoom-out').addEventListener('click', () => {
        fsScale = Math.max(0.1, fsScale - 0.1);
        updateFullscreenTransform();
        document.getElementById('dcim-fs-zoom-percent').value = Math.round(fsScale * 100);
      });
      
      document.getElementById('dcim-fs-apply-zoom').addEventListener('click', () => {
        const zoomPercent = parseInt(document.getElementById('dcim-fs-zoom-percent').value);
        if (!isNaN(zoomPercent) && zoomPercent >= 10 && zoomPercent <= 1000) {
          fsScale = zoomPercent / 100;
          updateFullscreenTransform();
        }
      });
      
      document.getElementById('dcim-fs-rotate-left').addEventListener('click', () => {
        fsRotation -= 90;
        updateFullscreenTransform();
      });
      
      document.getElementById('dcim-fs-rotate-right').addEventListener('click', () => {
        fsRotation += 90;
        updateFullscreenTransform();
      });
      
      document.getElementById('dcim-fs-save-settings').addEventListener('click', () => {
        const imageId = document.getElementById('dcim-fs-image').dataset.imageId;
        
        if (!imageId) {
          alert('Cannot save settings: No image ID found');
          return;
        }
        
        saveImageViewerSettings(imageId, { 
          zoom: Math.round(fsScale * 100), 
          rotation: fsRotation 
        });
      });
      
      // Fullscreen image pan/drag functionality
      const imageWrapper = document.getElementById('dcim-fs-image-wrapper');
      
      // Mouse events for dragging
      imageWrapper.addEventListener('mousedown', (e) => {
        isDragging = true;
        dragStart = { x: e.clientX, y: e.clientY };
        initialPosition = { ...currentPosition };
        
        // Prevent text selection during drag
        e.preventDefault();
        
        // Apply grabbing cursor
        imageWrapper.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
      });
      
      document.getElementById('dcim-fs-container').addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        
        currentPosition = {
          x: initialPosition.x + dx,
          y: initialPosition.y + dy
        };
        
        updateFullscreenTransform();
      });
      
      document.getElementById('dcim-fs-container').addEventListener('mouseup', () => {
        if (isDragging) {
          isDragging = false;
          imageWrapper.style.cursor = 'grab';
          document.body.style.userSelect = '';
        }
      });
      
      // Double click to reset position
      imageWrapper.addEventListener('dblclick', () => {
        fsScale = 1;
        fsRotation = 0;
        currentPosition = { x: 0, y: 0 };
        updateFullscreenTransform();
        document.getElementById('dcim-fs-zoom-percent').value = 100;
      });
      
      // Mouse wheel for zooming
      document.getElementById('dcim-fs-container').addEventListener('wheel', (e) => {
        e.preventDefault();
        
        // Determine zoom direction
        const delta = e.deltaY < 0 ? 0.1 : -0.1;
        fsScale = Math.max(0.1, fsScale + delta);
        
        updateFullscreenTransform();
        document.getElementById('dcim-fs-zoom-percent').value = Math.round(fsScale * 100);
      });
      
      // Function to update the transform of the fullscreen image
      function updateFullscreenTransform() {
        const wrapper = document.getElementById('dcim-fs-image-wrapper');
        wrapper.style.transform = `translate(${currentPosition.x}px, ${currentPosition.y}px) scale(${fsScale}) rotate(${fsRotation}deg)`;
      }
      
      // Function to show the fullscreen viewer
      function showFullscreenViewer() {
        const currentImage = document.getElementById('dcim-viewer-image');
        const fsImage = document.getElementById('dcim-fs-image');
        const fsViewer = document.getElementById('dcim-fullscreen-viewer');
        const fsTitle = document.getElementById('dcim-fs-title');
        
        // Get image data
        const imageSrc = currentImage.src;
        const imageId = currentImage.dataset.imageId;
        const imageTitle = document.getElementById('dcim-viewer-title').textContent;
        
        // Set fullscreen image data
        fsImage.src = imageSrc;
        fsImage.dataset.imageId = imageId;
        fsTitle.textContent = imageTitle;
        
        // Reset transform values
        fsScale = 1;
        fsRotation = 0;
        currentPosition = { x: 0, y: 0 };
        document.getElementById('dcim-fs-zoom-percent').value = 100;
        updateFullscreenTransform();
        
        // Show the fullscreen viewer
        fsViewer.style.display = 'block';
        
        // Set cursor style for dragging
        document.getElementById('dcim-fs-image-wrapper').style.cursor = 'grab';
        
        // Try to get the ViewerJS zoom and rotation values
        const viewer = currentImage._viewer;
        if (viewer && viewer.imageData) {
          fsScale = viewer.imageData.ratio;
          fsRotation = viewer.imageData.rotate || 0;
          document.getElementById('dcim-fs-zoom-percent').value = Math.round(fsScale * 100);
          updateFullscreenTransform();
        }
      }
      
      // Function to hide the fullscreen viewer
      function hideFullscreenViewer() {
        document.getElementById('dcim-fullscreen-viewer').style.display = 'none';
      }
      
      // Expose these functions for use in other parts of the code
      window.showFullscreenViewer = showFullscreenViewer;
      window.hideFullscreenViewer = hideFullscreenViewer;
      
      // Add this to the event listeners in the viewer container
      document.addEventListener('keydown', (e) => {
        // Don't intercept Ctrl/Cmd key combinations (used by DevTools)
        if (e.ctrlKey || e.metaKey) {
          return;
        }
        
        // Only handle keyboard events when the fullscreen viewer is visible
        const fullscreenViewer = document.getElementById('dcim-fullscreen-viewer');
        if (!fullscreenViewer || fullscreenViewer.style.display === 'none') {
          return;
        }
        
        // Handle ESC key to exit fullscreen
        if (e.key === 'Escape') {
          hideFullscreenViewer();
        }
      });
      
      return document.getElementById('dcim-viewer-view');
    }
    
    /**
     * Updates the zoom percentage display in the viewer
     * @param {Object} viewer - The ViewerJS instance
     */
    function updateViewerZoomPercentage(viewer) {
      setTimeout(() => {
        if (viewer && viewer.imageData) {
          const zoomPercent = Math.round(viewer.imageData.ratio * 100);
          document.getElementById('dcim-viewer-zoom-percent').value = zoomPercent;
        }
      }, 50);
    }
    
    /**
     * Saves image viewer settings for an image
     * @param {string} imageId - The ID of the image
     * @param {Object} settings - The settings to save
     */
    async function saveImageViewerSettings(imageId, settings) {
      try {
        // Show saving indicator
        const saveStatus = document.createElement('div');
        saveStatus.textContent = 'Saving...';
        saveStatus.style.position = 'fixed';
        saveStatus.style.top = '10px';
        saveStatus.style.right = '10px';
        saveStatus.style.padding = '5px 10px';
        saveStatus.style.backgroundColor = 'rgba(0,0,0,0.7)';
        saveStatus.style.color = 'white';
        saveStatus.style.borderRadius = '3px';
        saveStatus.style.zIndex = '10000';
        document.body.appendChild(saveStatus);
        
        const response = await fetch(`/api/dcim/${imageId}/settings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ settings })
        });
        
        if (response.ok) {
          saveStatus.textContent = 'Settings saved!';
        } else {
          throw new Error('Failed to save settings');
        }
        
        // Fade out and remove the status indicator
        setTimeout(() => {
          saveStatus.style.opacity = '0';
          saveStatus.style.transition = 'opacity 0.5s';
          setTimeout(() => saveStatus.remove(), 500);
        }, 1500);
      } catch (error) {
        console.error('Error saving image viewer settings:', error);
        alert('Failed to save settings: ' + error.message);
      }
    }
    
    /**
     * Loads image viewer settings for an image
     * @param {string} imageId - The ID of the image
     * @param {Object} viewer - The ViewerJS instance
     */
    async function loadImageViewerSettings(imageId, viewer) {
      try {
        const response = await fetch(`/api/dcim/${imageId}/settings`);
        const data = await response.json();
        
        if (data && data.settings) {
          console.log('Loaded viewer settings:', data.settings);
          
          // Apply zoom if available
          if (data.settings.zoom && viewer && viewer.imageData) {
            const targetZoom = data.settings.zoom / 100;
            const currentZoom = viewer.imageData.ratio || 1;
            const zoomRatio = targetZoom / currentZoom - 1;
            
            // Apply the zoom after a short delay to ensure viewer is ready
            setTimeout(() => {
              viewer.zoom(zoomRatio);
              document.getElementById('dcim-viewer-zoom-percent').value = data.settings.zoom;
            }, 500);
          }
          
          // Apply rotation if available
          if (data.settings.rotation && viewer) {
            // Calculate how much to rotate to reach the saved rotation
            const currentRotation = viewer.imageData ? (viewer.imageData.rotate || 0) : 0;
            const rotationNeeded = data.settings.rotation - currentRotation;
            
            if (rotationNeeded !== 0) {
              setTimeout(() => {
                viewer.rotate(rotationNeeded);
              }, 500);
            }
          }
        }
      } catch (error) {
        console.error('Error loading image viewer settings:', error);
      }
    }
    
    /**
     * Saves changes to an image
     * @param {string} imageId - The ID of the image to update
     *
     * IMPORTANT: All available image fields must be collected from the form and included in updatedData:
     * - Basic info: filename, url, file_path
     * - Metadata: ranking, rating, creation_time
     * - Content tags: tags, person, location, type
     * 
     * Any field not included in updatedData will NOT be saved to the database!
     */
    async function saveImageChanges(imageId) {
      try {
        const filename = document.getElementById('dcim-filename').value.trim();
        const url = document.getElementById('dcim-url').value.trim();
        const filePath = document.getElementById('dcim-file-path').value.trim();
        
        // Validate that at least one address is provided
        if (!url && !filePath) {
          alert('Please provide either a URL or a local file path');
          return;
        }
        
        // Get the ranking value
        const rankingInput = document.getElementById('edit-ranking');
        let ranking = null;
        if (rankingInput && rankingInput.value) {
          ranking = parseFloat(rankingInput.value);
          // Validate ranking value
          if (isNaN(ranking) || ranking < 1 || ranking > 1000) {
            alert('Ranking must be a number between 1 and 1000');
            return;
          }
          // Round to one decimal place
          ranking = Math.round(ranking * 10) / 10;
        }
        
        // IMPORTANT: Collect ALL form fields to prevent silent data loss
        const updatedData = {
          filename,
          url,
          file_path: filePath,
          // Metadata
          ranking: ranking,
          rating: document.querySelector('.dcim-star.active:last-of-type') ? 
                 parseInt(document.querySelector('.dcim-star.active:last-of-type').getAttribute('data-value')) : 0,
          // Add these missing fields:
          // Content tags - all must be included to prevent data loss!
          tags: document.getElementById('edit-tags').value.trim(),
          person: document.getElementById('edit-person').value.trim(),
          location: document.getElementById('edit-location').value.trim(),
          type: document.getElementById('edit-type').value.trim()
        };
        
        const creationTime = document.getElementById('edit-creation-time').value;
        if (creationTime) {
            // Ensure we're working with local time interpretation
            const [datePart, timePart] = creationTime.split('T');
            const [year, month, day] = datePart.split('-').map(Number);
            const [hours, minutes] = timePart.split(':').map(Number);
            
            // Create date using local time components
            const localDate = new Date(year, month-1, day, hours, minutes);
            updatedData.creation_time = localDate.getTime();
            
            console.log('Saving date:', {
                input: creationTime,
                components: { year, month, day, hours, minutes },
                timestamp: localDate.getTime(),
                localString: localDate.toString()
            });
        }
        
        const response = await fetch(`/api/dcim/${imageId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedData)
        });
        
        if (response.ok) {
          alert('Image updated successfully');
          
          // Refresh image data
          const updatedImg = await response.json();
          
          // Update in current images array
          const index = currentImages.findIndex(img => img.id === imageId);
          if (index !== -1) {
            currentImages[index] = updatedImg;
          }
          
          // Reapply filters and refresh the view
          applyFilters();
        } else {
          alert('Failed to update image');
        }
      } catch (error) {
        console.error('Error saving image changes:', error);
        alert('Failed to save changes');
      }
    }

    /**
     * Deletes an image
     * @param {string} imageId - The ID of the image to delete
     */
    async function deleteImage(imageId) {
      if (!confirm('Are you sure you want to delete this image? This cannot be undone.')) {
        return;
      }
      
      try {
        const response = await fetch(`/api/dcim/${imageId}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          alert('Image deleted successfully');
          
          // Remove from current images array
          currentImages = currentImages.filter(img => img.id !== imageId);
          
          // Go back to grid view
          document.getElementById('dcim-image-grid').style.display = 'grid';
          document.getElementById('dcim-detail-view').style.display = 'none';
          
          // Reapply filters and refresh the view
          applyFilters();
        } else {
          alert('Failed to delete image');
        }
      } catch (error) {
        console.error('Error deleting image:', error);
        alert('Failed to delete image');
      }
    }
    
    /**
     * Converts an image to WebP format
     * @param {string} imageId - The ID of the image to convert
     */
    async function convertToWebP(imageId) {
      try {
        const quality = prompt('Enter WebP quality (1-100):', '80');
        if (!quality) return;
        
        const qualityNum = parseInt(quality);
        if (isNaN(qualityNum) || qualityNum < 1 || qualityNum > 100) {
          alert('Please enter a valid quality number between 1 and 100');
          return;
        }
        
        const response = await fetch(`/api/dcim/${imageId}/convert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quality: qualityNum })
        });
        
        if (response.ok) {
          const updatedImg = await response.json();
          alert('Image converted to WebP successfully');
          
          // Update in current images array
          const index = currentImages.findIndex(img => img.id === imageId);
          if (index !== -1) {
            currentImages[index] = updatedImg;
          }
          
          // Refresh the detail view with the updated image
          showImageDetail(imageId);
        } else {
          alert('Failed to convert image');
        }
      } catch (error) {
        console.error('Error converting image:', error);
        alert('Failed to convert image');
      }
    }
    
    /**
     * Shows the add image form
     */
    function showAddImageForm() {
      const gridContainer = document.getElementById('dcim-image-grid');
      const detailView = document.getElementById('dcim-detail-view');
      const addForm = document.getElementById('dcim-add-form');
      const settingsView = document.getElementById('dcim-settings-view');
      
      // Show add form, hide other views
      gridContainer.style.display = 'none';
      detailView.style.display = 'none';
      settingsView.style.display = 'none';
      addForm.style.display = 'block';
      
      // Render the add form
      addForm.innerHTML = `
        <div class="dcim-form-header">
          <h3>Add New Image</h3>
          <button id="dcim-back-from-add" class="btn">Back to Gallery</button>
        </div>
        <form id="dcim-add-image-form">
          <div class="dcim-form-group">
            <label for="dcim-file-input">Upload Image File:</label>
            <input type="file" id="dcim-file-input" accept="image/*" class="dcim-input">
          </div>
          <div class="dcim-form-group">
            <label for="dcim-url-input">OR Image URL:</label>
            <input type="text" id="dcim-url-input" placeholder="https://example.com/image.jpg" class="dcim-input">
          </div>
          <div class="dcim-form-group">
            <label for="dcim-file-path-input">OR Local File Path:</label>
            <input type="text" id="dcim-file-path-input" placeholder="/path/to/local/image.jpg" class="dcim-input">
          </div>
          <div class="dcim-form-group">
            <label>Filename (optional, will use original filename if not provided)</label>
            <input type="text" id="add-image-filename" class="dcim-input">
          </div>
          <div class="dcim-form-group">
            <label>Ranking (1-1000)</label>
            <input type="number" id="add-image-ranking" min="1" max="1000" step="0.1" class="dcim-input">
          </div>
          <div class="dcim-form-group">
            <label>Rating</label>
            <div class="dcim-rating" id="add-rating">
              <span class="dcim-star" data-value="1">★</span>
              <span class="dcim-star" data-value="2">★</span>
              <span class="dcim-star" data-value="3">★</span>
              <span class="dcim-star" data-value="4">★</span>
              <span class="dcim-star" data-value="5">★</span>
            </div>
          </div>
          <div class="dcim-form-group">
            <label>Tags (comma separated)</label>
            <input type="text" id="add-image-tags" class="dcim-input">
          </div>
          <div class="dcim-form-group">
            <label>Person</label>
            <input type="text" id="add-image-person" class="dcim-input">
          </div>
          <div class="dcim-form-group">
            <label>Location</label>
            <input type="text" id="add-image-location" class="dcim-input">
          </div>
          <div class="dcim-form-group">
            <label>Type</label>
            <input type="text" id="add-image-type" class="dcim-input">
          </div>
          <div class="dcim-form-group">
            <label>Creation Time</label>
            <input type="datetime-local" id="add-image-creation-time" class="dcim-input">
          </div>
          <div class="dcim-form-actions">
            <button type="submit" class="btn btn-primary">Add Image</button>
          </div>
        </form>
      `;
      
      // Add event listeners
      document.getElementById('dcim-back-from-add').addEventListener('click', () => {
        gridContainer.style.display = 'grid';
        addForm.style.display = 'none';
      });
      
      document.getElementById('dcim-add-image-form').addEventListener('submit', function(e) {
        e.preventDefault();
        addNewImage();
      });
      
      // Add star rating functionality
      const stars = document.querySelectorAll('#add-rating .dcim-star');
      let selectedRating = 0;
      
      stars.forEach(star => {
        star.addEventListener('click', function() {
          const value = parseInt(this.getAttribute('data-value'));
          
          // Toggle off if already selected
          selectedRating = (selectedRating === value) ? 0 : value;
          
          // Update UI
          stars.forEach(s => {
            const starValue = parseInt(s.getAttribute('data-value'));
            if (starValue <= selectedRating) {
              s.classList.add('active');
            } else {
              s.classList.remove('active');
            }
          });
        });
      });
    }
    
    /**
     * Adds a new image
     */
    async function addNewImage() {
      try {
        const fileInput = document.getElementById('dcim-file-input');
        const urlInput = document.getElementById('dcim-url-input').value.trim();
        const filePathInput = document.getElementById('dcim-file-path-input').value.trim();
        
        // Validate that at least one address is provided
        if (!fileInput.files.length && !urlInput && !filePathInput) {
          alert('Please provide a file, URL, or local file path');
          return;
        }
        
        // Create FormData for the request
        const formData = new FormData();
        
        // Add file if it exists
        if (fileInput.files.length > 0) {
          formData.append('image', fileInput.files[0]);
        }
        
        // Add URL if provided
        if (urlInput) {
          formData.append('url', urlInput);
        }
        
        // Add file path if provided
        if (filePathInput) {
          formData.append('file_path', filePathInput);
        }
        
        // Rest of the form data fields
        formData.append('filename', document.getElementById('add-image-filename').value);
        formData.append('tags', document.getElementById('add-image-tags').value);
        formData.append('person', document.getElementById('add-image-person').value);
        formData.append('location', document.getElementById('add-image-location').value);
        formData.append('type', document.getElementById('add-image-type').value);
        
        // Get ranking
        const rankingInput = document.getElementById('add-image-ranking');
        let ranking = null;
        if (rankingInput && rankingInput.value) {
          ranking = parseFloat(rankingInput.value);
          if (isNaN(ranking) || ranking < 1 || ranking > 1000) {
            alert('Ranking must be a number between 1 and 1000');
            return;
          }
          // Round to one decimal place
          ranking = Math.round(ranking * 10) / 10;
        }
        
        if (ranking !== null) {
          formData.append('ranking', ranking);
        }
        
        // Get rating
        const selectedRating = document.querySelector('#add-rating .dcim-star.active:last-of-type');
        if (selectedRating) {
          formData.append('rating', selectedRating.getAttribute('data-value'));
        }
        
        // Get creation time
        const creationTime = document.getElementById('add-image-creation-time').value;
        if (creationTime) {
            // Ensure we're working with local time interpretation
            const [datePart, timePart] = creationTime.split('T');
            const [year, month, day] = datePart.split('-').map(Number);
            const [hours, minutes] = timePart.split(':').map(Number);
            
            // Create date using local time components
            const localDate = new Date(year, month-1, day, hours, minutes);
            formData.append('creation_time', localDate.getTime().toString());
            
            console.log('Adding date:', {
                input: creationTime,
                components: { year, month, day, hours, minutes },
                timestamp: localDate.getTime(),
                localString: localDate.toString()
            });
        }
        
        // Send the request
        const response = await fetch('/api/dcim', {
          method: 'POST',
          body: formData
        });
        
        if (response.ok) {
          const newImage = await response.json();
          alert('Image added successfully');
          
          // Add to current images array
          currentImages.unshift(newImage);
          
          // Go back to grid view
          document.getElementById('dcim-image-grid').style.display = 'grid';
          document.getElementById('dcim-add-form').style.display = 'none';
          
          // Reapply filters and refresh the view
          applyFilters();
        } else {
          alert('Failed to add image');
        }
      } catch (error) {
        console.error('Error adding image:', error);
        alert('Failed to add image');
      }
    }
    
    /**
     * Shows the settings view
     */
    function showSettings() {
      const gridContainer = document.getElementById('dcim-image-grid');
      const detailView = document.getElementById('dcim-detail-view');
      const addForm = document.getElementById('dcim-add-form');
      const settingsView = document.getElementById('dcim-settings-view');
      
      // Show settings view, hide other views
      gridContainer.style.display = 'none';
      detailView.style.display = 'none';
      addForm.style.display = 'none';
      settingsView.style.display = 'block';
      
      // Render the settings view
      settingsView.innerHTML = `
        <div class="dcim-form-header">
          <h3>DCIM Settings</h3>
          <button id="dcim-back-from-settings" class="btn">Back to Gallery</button>
        </div>
        <form id="dcim-settings-form" class="dcim-settings-form">
          <div class="dcim-form-group">
            <label>Asset Directory</label>
            <input type="text" id="asset-dir" placeholder="Path to assets directory" class="dcim-input">
          </div>
          <div class="dcim-form-group">
            <label>Thumbnail Directory</label>
            <input type="text" id="thumbnail-dir" placeholder="Path to thumbnails directory" class="dcim-input">
          </div>
          <div class="dcim-form-actions">
            <button type="submit" class="btn btn-primary">Save Settings</button>
          </div>
        </form>
      `;
      
      // Add event listeners
      document.getElementById('dcim-back-from-settings').addEventListener('click', () => {
        gridContainer.style.display = 'grid';
        settingsView.style.display = 'none';
      });
      
      // Fetch current directory settings
      fetchDirectorySettings();
      
      // Add form submit handler
      document.getElementById('dcim-settings-form').addEventListener('submit', function(e) {
        e.preventDefault();
        saveDirectorySettings();
      });
    }
    
    /**
     * Fetches the current directory settings
     */
    async function fetchDirectorySettings() {
      try {
        const response = await fetch('/api/dcim/directories');
        const directories = await response.json();
        
        // Check if directories is an array
        if (Array.isArray(directories)) {
          // Find asset and thumbnail directories
          const assetDir = directories.find(dir => dir.type === 'asset');
          const thumbnailDir = directories.find(dir => dir.type === 'thumbnail');
          
          // Set values in form
          if (assetDir) {
            document.getElementById('asset-dir').value = assetDir.path;
          }
          
          if (thumbnailDir) {
            document.getElementById('thumbnail-dir').value = thumbnailDir.path;
          }
        } else {
          console.log('Directory data is not an array:', directories);
        }
      } catch (error) {
        console.error('Error fetching directory settings:', error);
        alert('Failed to load directory settings');
      }
    }
    
    /**
     * Saves the directory settings
     */
    async function saveDirectorySettings() {
      try {
        const assetDir = document.getElementById('asset-dir').value;
        const thumbnailDir = document.getElementById('thumbnail-dir').value;
        
        const response = await fetch('/api/dcim/directories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assetDir, thumbnailDir })
        });
        
        if (response.ok) {
          alert('Settings saved successfully');
        } else {
          alert('Failed to save settings');
        }
      } catch (error) {
        console.error('Error saving directory settings:', error);
        alert('Failed to save settings');
      }
    }
    
    /**
     * Formats file size in a human-readable format
     * @param {number} size - The file size in bytes
     * @returns {string} Formatted file size
     */
    function formatFileSize(size) {
      if (!size) return 'Unknown';
      
      if (size < 1024) return size + ' B';
      if (size < 1024 * 1024) return (size / 1024).toFixed(2) + ' KB';
      return (size / (1024 * 1024)).toFixed(2) + ' MB';
    }
    
    /**
     * Shows the WebP converter view
     */
    function showWebPConverter() {
      const gridContainer = document.getElementById('dcim-image-grid');
      const detailView = document.getElementById('dcim-detail-view');
      const addForm = document.getElementById('dcim-add-form');
      const settingsView = document.getElementById('dcim-settings-view');
      const converterView = document.getElementById('dcim-converter-view');
      
      // Show converter view, hide other views
      gridContainer.style.display = 'none';
      detailView.style.display = 'none';
      addForm.style.display = 'none';
      settingsView.style.display = 'none';
      converterView.style.display = 'block';
      
      // Render the converter form
      converterView.innerHTML = `
        <div class="dcim-form-header">
          <h3>WebP Image Converter</h3>
          <button id="dcim-back-from-converter" class="btn">Back to Gallery</button>
        </div>
        <div class="dcim-converter-container">
          <form id="dcim-convert-form">
            <div class="dcim-form-group">
              <label for="convert-image-file">Select Image (PNG/JPG):</label>
              <input type="file" id="convert-image-file" name="image" accept="image/png,image/jpeg" required class="dcim-input">
            </div>
            <div class="dcim-form-group">
              <label for="convert-quality">Quality (1-100):</label>
              <input type="number" id="convert-quality" name="quality" min="1" max="100" value="60" class="dcim-input">
            </div>
            <div class="dcim-form-actions">
              <button type="submit" class="btn btn-primary">Convert to WebP</button>
            </div>
          </form>

          <div id="dcim-conversion-result" style="display: none; margin-top: 20px;">
            <h4>Conversion Result</h4>
            
            <div class="dcim-stats-container" style="display: flex; justify-content: space-between; margin-bottom: 15px;">
              <div class="dcim-stat-box" style="flex: 1; padding: 10px; background-color: #f5f5f5; border-radius: 5px; margin-right: 5px; text-align: center;">
                <div>Original Size</div>
                <strong id="dcim-original-size">-</strong>
              </div>
              <div class="dcim-stat-box" style="flex: 1; padding: 10px; background-color: #f5f5f5; border-radius: 5px; margin-right: 5px; text-align: center;">
                <div>Converted Size</div>
                <strong id="dcim-converted-size">-</strong>
              </div>
              <div class="dcim-stat-box" style="flex: 1; padding: 10px; background-color: #f5f5f5; border-radius: 5px; text-align: center;">
                <div>Space Saved</div>
                <strong id="dcim-space-saved">-</strong>
              </div>
            </div>
            
            <div class="dcim-preview-container" style="display: flex; justify-content: space-between;">
              <div class="dcim-preview" style="flex: 1; margin-right: 10px; text-align: center;">
                <h5>Original Image</h5>
                <img id="dcim-original-preview" src="" alt="Original Preview" style="max-width: 100%; max-height: 200px; border: 1px solid #ddd;">
                <p id="dcim-original-filename">-</p>
              </div>
              <div class="dcim-preview" style="flex: 1; text-align: center;">
                <h5>Converted WebP</h5>
                <img id="dcim-converted-preview" src="" alt="Converted Preview" style="max-width: 100%; max-height: 200px; border: 1px solid #ddd;">
                <p id="dcim-converted-filename">-</p>
              </div>
            </div>
            
            <div style="margin-top: 15px; text-align: center;">
              <a id="dcim-download-webp" href="#" download class="btn btn-primary">Download WebP Image</a>
            </div>
          </div>
        </div>
      `;
      
      // Add event listeners
      document.getElementById('dcim-back-from-converter').addEventListener('click', () => {
        gridContainer.style.display = 'grid';
        converterView.style.display = 'none';
      });
      
      document.getElementById('dcim-convert-form').addEventListener('submit', function(e) {
        e.preventDefault();
        convertImageToWebP();
      });
    }
    
    /**
     * Handles converting an image to WebP format
     */
    async function convertImageToWebP() {
      const fileInput = document.getElementById('convert-image-file');
      const qualityInput = document.getElementById('convert-quality');
      
      if (!fileInput.files.length) {
        alert('Please select an image to convert');
        return;
      }
      
      const quality = parseInt(qualityInput.value);
      if (isNaN(quality) || quality < 1 || quality > 100) {
        alert('Quality must be a number between 1 and 100');
        return;
      }
      
      try {
        // Prepare the form data
        const formData = new FormData();
        formData.append('image', fileInput.files[0]);
        formData.append('quality', quality);
        
        // Show loading indicator
        document.getElementById('dcim-convert-form').innerHTML += '<div class="dcim-loading">Converting image...</div>';
        
        // Send the request to convert the image
        const response = await fetch('/api/dcim/convert', {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          throw new Error('Image conversion failed');
        }
        
        const result = await response.json();
        
        // Update the conversion result display
        document.getElementById('dcim-original-size').textContent = result.originalSize;
        document.getElementById('dcim-converted-size').textContent = result.convertedSize;
        document.getElementById('dcim-space-saved').textContent = result.savingsPercent + '%';
        
        document.getElementById('dcim-original-filename').textContent = result.originalFile;
        document.getElementById('dcim-converted-filename').textContent = result.convertedFile;
        
        // Set up preview images
        // For original image (using FileReader)
        if (fileInput.files && fileInput.files[0]) {
          const reader = new FileReader();
          reader.onload = function(e) {
            document.getElementById('dcim-original-preview').src = e.target.result;
          };
          reader.readAsDataURL(fileInput.files[0]);
        }
        
        // For converted image
        document.getElementById('dcim-converted-preview').src = result.outputPath;
        
        // Set download link
        const downloadLink = document.getElementById('dcim-download-webp');
        downloadLink.href = result.outputPath;
        downloadLink.download = result.convertedFile;
        
        // Remove loading indicator
        const loadingElement = document.querySelector('.dcim-loading');
        if (loadingElement) {
          loadingElement.remove();
        }
        
        // Show the result container
        document.getElementById('dcim-conversion-result').style.display = 'block';
        
      } catch (error) {
        console.error('Error converting image:', error);
        alert('Failed to convert image: ' + error.message);
        
        // Remove loading indicator
        const loadingElement = document.querySelector('.dcim-loading');
        if (loadingElement) {
          loadingElement.remove();
        }
      }
    }
    
    /**
     * Formats a timestamp for datetime-local input
     * Properly handles local timezone
     * @param {number} timestamp - The timestamp to format
     * @returns {string} Formatted date string
     */
    function formatDateTimeForInput(timestamp) {
      const date = new Date(timestamp);
      
      // Get year, month and day
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      // Get hours and minutes
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      // Return formatted string (YYYY-MM-DDThh:mm)
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    
    // Utility to ensure all form fields are being captured
    function validateAllFieldsCollected() {
      const requiredFields = ['dcim-filename', 'dcim-url', 'dcim-file-path', 
                              'edit-ranking', 'edit-tags', 'edit-person', 
                              'edit-location', 'edit-type', 'edit-creation-time'];
      
      const missingFields = requiredFields.filter(field => 
        !document.getElementById(field) && console.warn(`Missing field: ${field}`)
      );
      
      if (missingFields.length > 0) {
        console.error('Some form fields could not be collected!', missingFields);
      }
    }
    
    // Move these functions inside the DcimManager module closure, right before the return statement
    // Around line ~2117 (before the "// Public API" comment)

    /**
     * Filters the tag list based on search input
     */
    function filterTagList() {
      const searchText = document.getElementById('dcim-tag-search').value.toLowerCase();
      const tagElements = document.querySelectorAll('.dcim-tag-filter');
      
      let matchCount = 0;
      
      tagElements.forEach(tagElement => {
        const labelText = tagElement.querySelector('label').textContent.toLowerCase();
        
        if (searchText === '' || labelText.includes(searchText)) {
          tagElement.classList.remove('hidden');
          matchCount++;
        } else {
          tagElement.classList.add('hidden');
        }
      });
      
      // Show message if no matches
      const noMatchesElement = document.getElementById('no-tag-matches');
      if (matchCount === 0 && searchText !== '') {
        if (!noMatchesElement) {
          const message = document.createElement('div');
          message.id = 'no-tag-matches';
          message.className = 'dcim-empty-state';
          message.style.padding = '10px';
          message.textContent = 'No matching tags found';
          document.getElementById('dcim-tag-filters').appendChild(message);
        }
      } else if (noMatchesElement) {
        noMatchesElement.remove();
      }
    }

    /**
     * Clears the tag search input
     */
    function clearTagSearch() {
      document.getElementById('dcim-tag-search').value = '';
      filterTagList();
    }

    /**
     * Clears all selected tags
     */
    function clearAllTags() {
      const tagCheckboxes = document.querySelectorAll('#dcim-tag-filters input[type="checkbox"]');
      tagCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
      });
      
      updateSelectedTagCount();
      applyFilters();
    }

    /**
     * Updates the count of selected tags
     */
    function updateSelectedTagCount() {
      const selectedCount = document.querySelectorAll('#dcim-tag-filters input[type="checkbox"]:checked').length;
      document.getElementById('dcim-tag-selected-count').textContent = selectedCount;
    }
    
    // Public API
    return {
      initialize: initialize,
      openManager: openImageManager,
      showImageDetail: showImageDetail
    };
})();

// Initialize the DCIM Manager when the document is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Only initialize, don't open
  DcimManager.initialize();
  
  // Look for an image manager button and add click handler if it exists
  const imageManagerButton = document.getElementById('image-manager-button');
  if (imageManagerButton) {
    imageManagerButton.addEventListener('click', function() {
      DcimManager.openManager();
    });
  }
});

// Export the module for use in other files
window.DcimManager = DcimManager;

/**
 * Creates an Image Manager button in the sidebar
 * Adds it after the backup database button and before the plugin manager button
 */
function createSidebarButton() {
  // Check if button already exists
  if (document.getElementById('image-manager-button')) return;
  
  // Get sidebar element
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;
  
  // Create the image manager button
  const imageManagerButton = document.createElement('button');
  imageManagerButton.id = 'image-manager-button';
  imageManagerButton.className = 'feature-toggle';
  imageManagerButton.textContent = 'Image Manager';
  imageManagerButton.title = 'Manage images and media';
  
  // Add click event
  imageManagerButton.addEventListener('click', () => {
    DcimManager.openManager();
  });
  
  // Find the backup button and plugin manager button
  const backupButton = document.getElementById('backup-database');
  const pluginManagerButton = document.getElementById('plugin-manager-button');
  
  // Insert after backup button if it exists, otherwise at the end of sidebar
  if (backupButton && backupButton.nextSibling) {
    sidebar.insertBefore(imageManagerButton, backupButton.nextSibling);
  } else if (pluginManagerButton) {
    // If no backup button but plugin manager exists, insert before plugin manager
    sidebar.insertBefore(imageManagerButton, pluginManagerButton);
  } else {
    // Just append to sidebar if neither button exists
    sidebar.appendChild(imageManagerButton);
  }
}

