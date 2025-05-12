/**
 * Tag Manager Module
 * Responsible for managing tag filtering functionality
 */
const TagManager = (function() {
    // Private variables
    let currentTagPage = 1;
    let totalTagPages = 1;
    const tagsPerPage = 30; // Adjust this number to fit your UI
    
    /**
     * Populates tag filters based on available tags with pagination
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
      
      // Calculate pagination for tags
      totalTagPages = Math.ceil(sortedTags.length / tagsPerPage);
      
      // Reset to page 1 if current page is out of bounds
      if (currentTagPage > totalTagPages) {
        currentTagPage = 1;
      }
      
      // Get current page of tags
      const startIndex = (currentTagPage - 1) * tagsPerPage;
      const endIndex = startIndex + tagsPerPage;
      const paginatedTags = sortedTags.slice(startIndex, endIndex);
      
      // Create tag filter checkboxes
      tagsContainer.innerHTML = '';
      
      paginatedTags.forEach(tag => {
        const tagDiv = document.createElement('div');
        tagDiv.className = 'dcim-tag-filter';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `tag-${tag}`;
        checkbox.value = tag;
        checkbox.addEventListener('change', () => {
          updateSelectedTagCount();
          window.DcimManager.applyFilters();
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
      
      // Add pagination controls for tags
      addTagPaginationControls(sortedTags.length);
      
      // Initialize the selected tag count
      updateSelectedTagCount();
    }
    
    /**
     * Filters the tag list based on search input while maintaining pagination
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
      window.DcimManager.applyFilters();
    }

    /**
     * Updates the count of selected tags
     */
    function updateSelectedTagCount() {
      const selectedCount = document.querySelectorAll('#dcim-tag-filters input[type="checkbox"]:checked').length;
      document.getElementById('dcim-tag-selected-count').textContent = selectedCount;
    }

    /**
     * Adds pagination controls for the tag filters
     * @param {number} totalTags - The total number of tags
     */
    function addTagPaginationControls(totalTags) {
      const tagsContainer = document.getElementById('dcim-tag-filters');
      
      // Create pagination container if it doesn't exist
      let tagPagination = document.getElementById('dcim-tag-pagination');
      if (!tagPagination) {
        tagPagination = document.createElement('div');
        tagPagination.id = 'dcim-tag-pagination';
        tagPagination.className = 'dcim-tag-pagination';
        
        // Add after the tags container
        tagsContainer.parentNode.insertBefore(tagPagination, tagsContainer.nextSibling);
      }
      
      // Update pagination info and controls
      tagPagination.innerHTML = `
        <div class="dcim-tag-pagination-info">
          Page ${currentTagPage} of ${totalTagPages} (${totalTags} tags)
        </div>
        <div class="dcim-tag-pagination-controls">
          <button id="dcim-tag-page-first" class="btn btn-small" ${currentTagPage === 1 ? 'disabled' : ''}>&laquo;</button>
          <button id="dcim-tag-page-prev" class="btn btn-small" ${currentTagPage === 1 ? 'disabled' : ''}>&lsaquo;</button>
          <span id="dcim-tag-page-current">${currentTagPage}</span>
          <button id="dcim-tag-page-next" class="btn btn-small" ${currentTagPage === totalTagPages || totalTagPages === 0 ? 'disabled' : ''}>&rsaquo;</button>
          <button id="dcim-tag-page-last" class="btn btn-small" ${currentTagPage === totalTagPages || totalTagPages === 0 ? 'disabled' : ''}>&raquo;</button>
        </div>
      `;
      
      // Add event listeners for tag pagination buttons
      document.getElementById('dcim-tag-page-first').addEventListener('click', () => {
        if (currentTagPage !== 1) {
          currentTagPage = 1;
          populateTagFilters(window.DcimManager.getCurrentImages());
        }
      });
      
      document.getElementById('dcim-tag-page-prev').addEventListener('click', () => {
        if (currentTagPage > 1) {
          currentTagPage--;
          populateTagFilters(window.DcimManager.getCurrentImages());
        }
      });
      
      document.getElementById('dcim-tag-page-next').addEventListener('click', () => {
        if (currentTagPage < totalTagPages) {
          currentTagPage++;
          populateTagFilters(window.DcimManager.getCurrentImages());
        }
      });
      
      document.getElementById('dcim-tag-page-last').addEventListener('click', () => {
        if (currentTagPage !== totalTagPages) {
          currentTagPage = totalTagPages;
          populateTagFilters(window.DcimManager.getCurrentImages());
        }
      });
    }
    
    /**
     * Gets the selected tags and combination method
     * @returns {Object} Object containing selected tags and combination method
     */
    function getSelectedTags() {
      const tagCheckboxes = document.querySelectorAll('#dcim-tag-filters input:checked');
      const selectedTags = Array.from(tagCheckboxes).map(cb => cb.value);
      const tagCombination = document.querySelector('input[name="tag-combo"]:checked').value;
      
      return {
        tags: selectedTags,
        combination: tagCombination
      };
    }
  
    // Public API
    return {
      populateTagFilters: populateTagFilters,
      filterTagList: filterTagList,
      clearTagSearch: clearTagSearch,
      clearAllTags: clearAllTags,
      updateSelectedTagCount: updateSelectedTagCount,
      addTagPaginationControls: addTagPaginationControls,
      getSelectedTags: getSelectedTags
    };
})();

// Export the module for use in other files
window.TagManager = TagManager;