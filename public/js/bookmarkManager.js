/**
 * Bookmark Manager Module
 * Manages node bookmarks for quick access from the sidebar
 */
const BookmarkManager = (function() {
    // Private variables
    let bookmarks = [];
    const STORAGE_KEY = 'luhmann_roam_bookmarks';
    let bookmarksContainer = null;
    
    /**
     * Initializes the bookmark manager
     */
    function initialize() {
      loadBookmarks();
      createBookmarksSection();
      
      // Add hotkey for bookmarking/unbookmarking the current node (Alt+B)
      document.addEventListener('keydown', (e) => {
        if (e.altKey && e.key === 'b') {
          e.preventDefault();
          toggleBookmarkForFocusedNode();
        }
      });
      
      // Verify initialization is complete
      console.log('BookmarkManager initialized, current bookmarks:', bookmarks);

      // Run a storage test to verify localStorage is working
      try {
        const testKey = 'bookmark_storage_test';
        localStorage.setItem(testKey, 'test');
        const testValue = localStorage.getItem(testKey);
        localStorage.removeItem(testKey);
        
        if (testValue === 'test') {
          console.log('LocalStorage test passed - storage is working correctly');
        } else {
          console.error('LocalStorage test failed - storage is not working correctly');
        }
      } catch (e) {
        console.error('LocalStorage test failed with exception:', e);
      }
    }
    
    /**
     * Creates the bookmarks section in the sidebar
     */
    function createBookmarksSection() {
      const sidebar = document.querySelector('.sidebar');
      if (!sidebar) return;
      
      // Set initial collapsed state
      const isCollapsed = localStorage.getItem('bookmarks_collapsed') === 'true';
      
      // Create bookmarks section container
      const section = document.createElement('div');
      section.className = 'bookmarks-section';
      section.style.marginTop = '20px';
      
      // Create header with title and collapsible toggle
      const header = document.createElement('div');
      header.className = 'bookmarks-header';
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      header.style.alignItems = 'center';
      header.style.marginBottom = '8px';
      header.style.borderBottom = '1px solid #ddd';
      header.style.paddingBottom = '4px';
      
      const title = document.createElement('h3');
      title.textContent = window.I18n ? I18n.t('bookmarks') : 'Bookmarks';
      title.style.margin = '0';
      title.style.fontSize = '16px';
      
      const toggleIcon = document.createElement('span');
      toggleIcon.className = 'bookmark-toggle-icon';
      toggleIcon.innerHTML = '▼';
      toggleIcon.style.cursor = 'pointer';
      toggleIcon.addEventListener('click', toggleBookmarksVisibility);
      
      header.appendChild(title);
      header.appendChild(toggleIcon);
      
      // Create bookmarks list container with fixed dimensions and attributes
      bookmarksContainer = document.createElement('div');
      bookmarksContainer.className = 'bookmarks-container';
      bookmarksContainer.style.maxHeight = '500px';
      bookmarksContainer.style.overflowY = 'auto';
      bookmarksContainer.style.display = 'block'; // Ensure it's visible
      bookmarksContainer.style.border = '1px solid #eee'; // Optional: add a border to see the container
      bookmarksContainer.style.padding = '4px'; // Add some padding
      bookmarksContainer.setAttribute('data-height', '500px'); // Add an attribute for debugging
      
      section.appendChild(header);
      section.appendChild(bookmarksContainer);
      
      // Add to sidebar after the search button
      const searchButton = document.getElementById('search-nodes-button');
      if (searchButton) {
        sidebar.insertBefore(section, searchButton.nextSibling);
      } else {
        sidebar.appendChild(section);
      }
      
      // Apply initial collapsed state
      if (isCollapsed) {
        bookmarksContainer.style.display = 'none';
        toggleIcon.innerHTML = '►';
      } else {
        bookmarksContainer.style.display = 'block';
        toggleIcon.innerHTML = '▼';
      }
      
      renderBookmarks();
    }
    
    /**
     * Toggles visibility of the bookmarks container
     */
    function toggleBookmarksVisibility(e) {
      const icon = e.target;
      const container = icon.parentElement.nextElementSibling;
      
      if (container.style.display === 'none') {
        container.style.display = 'block';
        icon.innerHTML = '▼';
        localStorage.setItem('bookmarks_collapsed', 'false');
      } else {
        container.style.display = 'none';
        icon.innerHTML = '►';
        localStorage.setItem('bookmarks_collapsed', 'true');
      }
    }
    
    /**
     * Loads bookmarks from localStorage
     */
    function loadBookmarks() {
      try {
        // Log localStorage keys for debugging
        console.log('All localStorage keys:', Object.keys(localStorage));
        const saved = localStorage.getItem(STORAGE_KEY);
        console.log(`Raw localStorage data for ${STORAGE_KEY}:`, saved);
        
        if (saved && saved !== 'undefined' && saved !== 'null') {
          try {
            bookmarks = JSON.parse(saved);
            console.log('Successfully loaded bookmarks from localStorage:', bookmarks);
          } catch (e) {
            console.error('Error parsing bookmarks JSON:', e);
            console.error('Raw bookmark data that failed to parse:', saved);
            bookmarks = [];
          }
        } else {
          console.log(`No bookmarks found in localStorage with key ${STORAGE_KEY}`);
          bookmarks = [];
        }
      } catch (e) {
        console.error('Error accessing localStorage:', e);
        bookmarks = [];
      }
      
      // Validate bookmarks format
      if (!Array.isArray(bookmarks)) {
        console.error('Bookmarks is not an array, resetting to empty array');
        bookmarks = [];
      }
    }
    
    /**
     * Saves bookmarks to localStorage
     */
    function saveBookmarks() {
      try {
        if (!Array.isArray(bookmarks)) {
          console.error('Cannot save bookmarks: not an array');
          return false;
        }
        
        const bookmarksJson = JSON.stringify(bookmarks);
        localStorage.setItem(STORAGE_KEY, bookmarksJson);
        console.log('Saved bookmarks to localStorage:', bookmarks);
        console.log('Raw saved data:', bookmarksJson);
        
        // Verify save was successful
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData !== bookmarksJson) {
          console.error('Verification failed! Saved data does not match:', savedData);
        } else {
          console.log('Verification successful - localStorage contains the correct data');
        }
        
        return true;
      } catch (e) {
        console.error('Error saving bookmarks:', e);
        return false;
      }
    }
    
    /**
     * Renders the bookmarks in the sidebar - final version
     */
    function renderBookmarks() {
      if (!bookmarksContainer) {
        console.error('bookmarksContainer is null, cannot render bookmarks');
        return;
      }
      
      // Clear the container
      bookmarksContainer.innerHTML = '';
      
      if (!Array.isArray(bookmarks) || bookmarks.length === 0) {
        const noBookmarks = document.createElement('div');
        noBookmarks.className = 'no-bookmarks';
        noBookmarks.textContent = window.I18n ? I18n.t('noBookmarks') : 'No bookmarked nodes';
        noBookmarks.style.color = '#999';
        noBookmarks.style.fontStyle = 'italic';
        noBookmarks.style.padding = '8px 0';
        bookmarksContainer.appendChild(noBookmarks);
        return;
      }
      
      // Create a list for the bookmarks
      const list = document.createElement('ul');
      list.className = 'bookmarks-list';
      list.style.listStyle = 'none';
      list.style.padding = '0';
      list.style.margin = '0';
      
      bookmarks.forEach((bookmark, index) => {
        // Create bookmark item
        const item = document.createElement('li');
        item.className = 'bookmark-item';
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.padding = '6px 0';
        item.style.borderBottom = '1px solid #f0f0f0';
        
        // Create icon
        const icon = document.createElement('span');
        icon.className = 'bookmark-icon';
        icon.innerHTML = '📌';
        icon.style.marginRight = '8px';
        
        // Create the bookmark text
        const text = document.createElement('span');
        text.className = 'bookmark-text';
        text.textContent = bookmark.title || `Bookmark ${index}`;
        text.style.flex = '1';
        text.style.overflow = 'hidden';
        text.style.textOverflow = 'ellipsis';
        text.style.whiteSpace = 'nowrap';
        text.style.cursor = 'pointer';
        text.title = 'Click to focus on this node';
        
        // Add click handler to focus on the node
        text.addEventListener('click', () => {
          focusOnNode(bookmark.id);
        });
        
        // Create delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'bookmark-delete';
        deleteBtn.innerHTML = '×';
        deleteBtn.title = 'Remove bookmark';
        deleteBtn.style.background = 'none';
        deleteBtn.style.border = 'none';
        deleteBtn.style.color = '#999';
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.style.fontSize = '16px';
        deleteBtn.style.padding = '0 4px';
        
        // Add delete handler
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          removeBookmark(index);
        });
        
        // Assemble the item
        item.appendChild(icon);
        item.appendChild(text);
        item.appendChild(deleteBtn);
        list.appendChild(item);
      });
      
      bookmarksContainer.appendChild(list);
    }
    
    /**
     * Adds a bookmark for a node
     * @param {string} nodeId - The ID of the node to bookmark
     */
    async function addBookmark(nodeId) {
      try {
        console.log(`Adding bookmark for node ${nodeId}`);
        
        // Fetch the node data to get the title
        const response = await fetch(`/api/nodes/${nodeId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch node ${nodeId}`);
        }
        
        const node = await response.json();
        const currentLanguage = window.I18n ? I18n.getCurrentLanguage() : 'en';
        const nodeTitle = currentLanguage === 'en' ? node.content : (node.content_zh || node.content);
        
        // Check if this node is already bookmarked
        const existingIndex = bookmarks.findIndex(b => b.id === nodeId);
        if (existingIndex !== -1) {
          console.log(`Node ${nodeId} is already bookmarked`);
          return false; // Already bookmarked
        }
        
        console.log(`Creating bookmark with title "${nodeTitle}"`);
        
        // Add to bookmarks
        const newBookmark = {
          id: nodeId,
          title: nodeTitle,
          addedAt: Date.now()
        };
        
        bookmarks.push(newBookmark);
        console.log('Updated bookmarks array:', bookmarks);
        
        const success = saveBookmarks();
        console.log('Save result:', success);
        
        renderBookmarks();
        
        return true;
      } catch (error) {
        console.error('Error adding bookmark:', error);
        return false;
      }
    }
    
    /**
     * Removes a bookmark by index
     * @param {number} index - The index of the bookmark to remove
     */
    function removeBookmark(index) {
      if (index >= 0 && index < bookmarks.length) {
        bookmarks.splice(index, 1);
        saveBookmarks();
        renderBookmarks();
        return true;
      }
      return false;
    }
    
    /**
     * Removes a bookmark by node ID
     * @param {string} nodeId - The ID of the node to remove from bookmarks
     */
    function removeBookmarkByNodeId(nodeId) {
      const index = bookmarks.findIndex(b => b.id === nodeId);
      if (index !== -1) {
        return removeBookmark(index);
      }
      return false;
    }
    
    /**
     * Checks if a node is bookmarked
     * @param {string} nodeId - The ID of the node to check
     * @returns {boolean} True if the node is bookmarked
     */
    function isNodeBookmarked(nodeId) {
      return bookmarks.some(b => b.id === nodeId);
    }
    
    /**
     * Focuses on a bookmarked node
     * @param {string} nodeId - The ID of the node to focus on
     */
    async function focusOnNode(nodeId) {
      try {
        // Use BreadcrumbManager if available
        if (window.BreadcrumbManager) {
          await window.BreadcrumbManager.focusOnNode(nodeId);
        } else {
          // Fallback to manual navigation
          await expandParentNodes(nodeId);
          
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
              }
            }
          }, 300);
        }
      } catch (error) {
        console.error('Error focusing on node:', error);
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
            
            if (window.NodeOperationsManager && window.NodeOperationsManager.refreshSubtree) {
              await window.NodeOperationsManager.refreshSubtree(node.parent_id);
            } else if (window.fetchNodes) {
              await window.fetchNodes();
            }
          }
        }
      } catch (error) {
        console.error('Error expanding parent nodes:', error);
      }
    }
    
    /**
     * Toggles bookmark status for the currently focused node
     */
    function toggleBookmarkForFocusedNode() {
      // Get the currently focused node ID
      const focusedNodeId = window.lastFocusedNodeId;
      
      if (!focusedNodeId) {
        console.log('No focused node to bookmark');
        return;
      }
      
      if (isNodeBookmarked(focusedNodeId)) {
        removeBookmarkByNodeId(focusedNodeId);
        console.log(`Removed bookmark for node ${focusedNodeId}`);
        
        // Update the bookmark button for this node if it exists
        const nodeElement = document.querySelector(`.node[data-id="${focusedNodeId}"]`);
        if (nodeElement) {
          const bookmarkButton = nodeElement.querySelector('.bookmark-button');
          if (bookmarkButton) {
            bookmarkButton.innerHTML = '📎';
            bookmarkButton.title = 'Add bookmark';
          }
        }
      } else {
        addBookmark(focusedNodeId);
        console.log(`Added bookmark for node ${focusedNodeId}`);
        
        // Update the bookmark button for this node if it exists
        const nodeElement = document.querySelector(`.node[data-id="${focusedNodeId}"]`);
        if (nodeElement) {
          const bookmarkButton = nodeElement.querySelector('.bookmark-button');
          if (bookmarkButton) {
            bookmarkButton.innerHTML = '📌';
            bookmarkButton.title = 'Remove bookmark';
          }
        }
      }
    }
    
    /**
     * Adds a bookmark button to node actions
     * @param {HTMLElement} nodeActions - The node actions element
     * @param {string} nodeId - The ID of the node
     */
    function addBookmarkButtonToNode(nodeActions, nodeId) {
      if (!nodeActions) return;
      
      // Check if button already exists
      if (nodeActions.querySelector('.bookmark-button')) return;
      
      // Create bookmark button
      const bookmarkButton = document.createElement('button');
      bookmarkButton.className = 'bookmark-button';
      bookmarkButton.title = isNodeBookmarked(nodeId) ? 
        'Remove bookmark' : 'Add bookmark';
      bookmarkButton.innerHTML = isNodeBookmarked(nodeId) ? '📌' : '📎';
      
      bookmarkButton.addEventListener('click', async (e) => {
        e.stopPropagation();
        
        if (isNodeBookmarked(nodeId)) {
          removeBookmarkByNodeId(nodeId);
          bookmarkButton.innerHTML = '📎';
          bookmarkButton.title = 'Add bookmark';
        } else {
          await addBookmark(nodeId);
          bookmarkButton.innerHTML = '📌';
          bookmarkButton.title = 'Remove bookmark';
        }
      });
      
      // Insert before timestamp button if it exists
      const timestampButton = nodeActions.querySelector('.timestamp-button');
      if (timestampButton) {
        nodeActions.insertBefore(bookmarkButton, timestampButton);
      } else {
        // Otherwise insert at the beginning
        nodeActions.insertBefore(bookmarkButton, nodeActions.firstChild);
      }
    }
    
    /**
     * Updates the bookmark list after language change
     */
    function updateLanguage() {
      const headerTitle = document.querySelector('.bookmarks-header h3');
      if (headerTitle) {
        headerTitle.textContent = window.I18n ? I18n.t('bookmarks') : 'Bookmarks';
      }
      
      const noBookmarks = document.querySelector('.no-bookmarks');
      if (noBookmarks) {
        noBookmarks.textContent = window.I18n ? I18n.t('noBookmarks') : 'No bookmarked nodes';
      }
      
      // Update bookmark titles based on current language
      refreshBookmarkTitles();
    }
    
    /**
     * Refreshes the titles of bookmarks based on current language
     */
    async function refreshBookmarkTitles() {
      if (!window.I18n) return;
      
      const currentLanguage = I18n.getCurrentLanguage();
      
      for (let i = 0; i < bookmarks.length; i++) {
        try {
          const response = await fetch(`/api/nodes/${bookmarks[i].id}`);
          if (response.ok) {
            const node = await response.json();
            bookmarks[i].title = currentLanguage === 'en' ? 
              node.content : (node.content_zh || node.content);
          }
        } catch (error) {
          console.error(`Error refreshing bookmark title for ${bookmarks[i].id}:`, error);
        }
      }
      
      saveBookmarks();
      renderBookmarks();
    }
    
    // Public API
    return {
      initialize,
      addBookmark,
      removeBookmark,
      isNodeBookmarked,
      focusOnNode,
      addBookmarkButtonToNode,
      updateLanguage,
      toggleBookmarkForFocusedNode,
      // Add these debug methods
      debug: {
        forceRender: renderBookmarks,
        getBookmarks: () => bookmarks,
        getContainer: () => bookmarksContainer
      }
    };
  })();
  
  // Export the module for use in other files
  window.BookmarkManager = BookmarkManager;