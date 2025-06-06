/**
 * Bookmark Manager Module
 * Handles bookmarking individual nodes for quick access
 * Using database for persistence instead of localStorage
 * Note: Node bookmarks are different from filter presets managed by FilterManager
 */
const BookmarkManager = (function() {
    // Private variables
    let bookmarks = [];
    let bookmarksContainer = null;
    
    /**
     * Initializes the bookmark manager
     */
    function initialize() {
      console.log('BookmarkManager initialization started (DB version)');
      
      // Check if DOM is ready for UI creation
      if (!document.querySelector('.sidebar')) {
        console.log('Sidebar not found, delaying BookmarkManager initialization');
        setTimeout(() => {
          console.log('Retrying BookmarkManager initialization');
          initialize();
        }, 500);
        return;
      }
      
      // IMPORTANT: First, remove any existing bookmark sections to prevent duplicates
      const existingBookmarkSections = document.querySelectorAll('.bookmarks-section');
      console.log(`Found ${existingBookmarkSections.length} existing bookmark sections, cleaning up`);
      existingBookmarkSections.forEach(section => {
        section.remove();
      });
      
      // Create UI first
      const success = createBookmarksSection();
      
      if (!success) {
        console.error('Failed to create bookmarks section, retrying in 500ms');
        setTimeout(initialize, 500);
        return;
      }
      
      // Then load and render bookmarks
      loadBookmarks().then(() => {
        // After loading, load click counts from localStorage
        loadClickCounts();
        
        // After loading, render bookmarks
        renderBookmarks();
        
        // UI created successfully, set up event handlers
        document.addEventListener('keydown', (e) => {
          if (e.altKey && e.key === 'b') {
            e.preventDefault();
            toggleBookmarkForFocusedNode();
          }
        });
        
        console.log('BookmarkManager initialization complete, bookmarks:', bookmarks);
      }).catch(error => {
        console.error('Error loading bookmarks:', error);
      });
    }
    
    /**
     * Creates the bookmarks section in the sidebar
     */
    function createBookmarksSection() {
      const sidebar = document.querySelector('.sidebar');
      if (!sidebar) {
        console.error('Cannot create bookmarks section: sidebar not found in DOM');
        return false;
      }
      
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
      
      // Add sort toggle button
      const sortToggle = document.createElement('span');
      sortToggle.className = 'bookmark-sort-toggle';
      sortToggle.textContent = '📊';
      sortToggle.title = 'Sort by click count';
      sortToggle.style.cursor = 'pointer';
      sortToggle.style.marginRight = '10px';
      sortToggle.addEventListener('click', toggleSortByClicks);
      
      const toggleIcon = document.createElement('span');
      toggleIcon.className = 'bookmark-toggle-icon';
      toggleIcon.innerHTML = '▼';
      toggleIcon.style.cursor = 'pointer';
      toggleIcon.addEventListener('click', toggleBookmarksVisibility);
      
      header.appendChild(title);
      header.appendChild(sortToggle);
      header.appendChild(toggleIcon);
      
      // Create bookmarks list container with fixed height
      bookmarksContainer = document.createElement('div');
      bookmarksContainer.className = 'bookmarks-container';
      bookmarksContainer.style.height = '500px'; // Fixed height instead of maxHeight
      bookmarksContainer.style.overflowY = 'auto';
      bookmarksContainer.style.display = 'block';
      bookmarksContainer.style.border = '1px solid #44f';
      bookmarksContainer.style.padding = '8px';
      bookmarksContainer.style.boxSizing = 'border-box';
      
      section.appendChild(header);
      section.appendChild(bookmarksContainer);
      
      // Find the correct insertion point - right after task-manager but before anything else
      const taskManager = document.querySelector('.task-manager');
      if (taskManager) {
        // Get h1 element for the outliner title
        const outlinerTitle = document.getElementById('app-title');
        
        // Insert bookmark section right after task manager
        // Check if task manager is the last element
        if (taskManager.nextElementSibling) {
          sidebar.insertBefore(section, taskManager.nextElementSibling);
        } else {
          // If task manager is the last element, just append
          sidebar.appendChild(section);
        }
      } else {
        // Fallback: Insert at a specific position relative to app-title if present
        const appTitle = document.getElementById('app-title');
        if (appTitle) {
          // Insert after app-title
          if (appTitle.nextElementSibling) {
            sidebar.insertBefore(section, appTitle.nextElementSibling);
          } else {
            sidebar.appendChild(section);
          }
        } else {
          // Last resort: just append to sidebar
          sidebar.appendChild(section);
        }
      }
      
      // Apply initial collapsed state
      if (isCollapsed) {
        bookmarksContainer.style.display = 'none';
        toggleIcon.innerHTML = '►';
      } else {
        bookmarksContainer.style.display = 'block';
        toggleIcon.innerHTML = '▼';
      }
      
      console.log('Bookmarks section created, container:', bookmarksContainer);
      
      // Just return true if the container was created successfully
      if (bookmarksContainer) {
        return true;
      }
      
      return false;
    }
    
    // Track click counts for each bookmark
    let clickCounts = {};
    let sortByClicks = false;
    
    /**
     * Load click counts from localStorage
     */
    function loadClickCounts() {
      try {
        const saved = localStorage.getItem('bookmark_click_counts');
        if (saved) {
          clickCounts = JSON.parse(saved);
          console.log('Loaded bookmark click counts:', clickCounts);
        }
      } catch (error) {
        console.error('Error loading bookmark click counts:', error);
        clickCounts = {};
      }
    }
    
    /**
     * Save click counts to localStorage
     */
    function saveClickCounts() {
      try {
        localStorage.setItem('bookmark_click_counts', JSON.stringify(clickCounts));
      } catch (error) {
        console.error('Error saving bookmark click counts:', error);
      }
    }
    
    /**
     * Increment the click count for a bookmark
     * @param {string} nodeId - The ID of the node
     */
    function incrementClickCount(nodeId) {
      if (!clickCounts[nodeId]) {
        clickCounts[nodeId] = 0;
      }
      clickCounts[nodeId]++;
      console.log(`Incremented click count for node ${nodeId} to ${clickCounts[nodeId]}`);
      saveClickCounts();
    }
    
    /**
     * Toggle sorting by click count
     */
    function toggleSortByClicks() {
      sortByClicks = !sortByClicks;
      renderBookmarks();
      
      // Update toggle button appearance
      const sortToggle = document.querySelector('.bookmark-sort-toggle');
      if (sortToggle) {
        sortToggle.style.color = sortByClicks ? '#4285f4' : '';
        sortToggle.title = sortByClicks ? 'Sort by added time' : 'Sort by click count';
      }
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
     * Loads bookmarks from database
     */
    async function loadBookmarks() {
      try {
        const response = await fetch('/api/bookmarks');
        if (!response.ok) {
          throw new Error(`Failed to load bookmarks: ${response.statusText}`);
        }
        
        bookmarks = await response.json();
        console.log('Successfully loaded bookmarks from database:', bookmarks);
        return bookmarks;
      } catch (error) {
        console.error('Error loading bookmarks from database:', error);
        bookmarks = [];
        return [];
      }
    }
    
    /**
     * Adds a bookmark for a node
     * @param {string} nodeId - The ID of the node to bookmark
     */
    async function addBookmark(nodeId) {
      try {
        console.log(`Adding bookmark for node ${nodeId}`);
        
        // Check if already bookmarked in our local cache
        if (bookmarks.some(b => b.node_id === nodeId)) {
          console.log(`Node ${nodeId} is already bookmarked`);
          return false; // Already bookmarked
        }
        
        // Fetch the node data to get the title
        const nodeResponse = await fetch(`/api/nodes/${nodeId}`);
        if (!nodeResponse.ok) {
          throw new Error(`Failed to fetch node ${nodeId}`);
        }
        
        const node = await nodeResponse.json();
        const currentLanguage = window.I18n ? I18n.getCurrentLanguage() : 'en';
        const nodeTitle = currentLanguage === 'en' ? node.content : (node.content_zh || node.content);
        
        // Create bookmark in database
        const response = await fetch('/api/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            node_id: nodeId,
            title: nodeTitle
          })
        });
        
        if (!response.ok) {
          // Handle 409 (already exists) as a success case
          if (response.status === 409) {
            console.log(`Node ${nodeId} is already bookmarked in database`);
            return true;
          }
          throw new Error(`Failed to create bookmark: ${response.statusText}`);
        }
        
        // Add to local cache
        const newBookmark = await response.json();
        bookmarks.push(newBookmark);
        
        // Initialize click count for the new bookmark
        if (!clickCounts[nodeId]) {
          clickCounts[nodeId] = 0;
        }
        
        // Update UI
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
    async function removeBookmark(index) {
      if (index < 0 || index >= bookmarks.length) {
        return false;
      }
      
      try {
        const bookmarkId = bookmarks[index].id;
        const nodeId = bookmarks[index].node_id;
        
        // Delete from database
        const response = await fetch(`/api/bookmarks/${bookmarkId}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          throw new Error(`Failed to delete bookmark: ${response.statusText}`);
        }
        
        // Remove from local cache
        bookmarks.splice(index, 1);
        
        // Remove click count
        if (clickCounts[nodeId]) {
          delete clickCounts[nodeId];
          saveClickCounts();
        }
        
        // Update UI
        renderBookmarks();
        
        return true;
      } catch (error) {
        console.error('Error removing bookmark:', error);
        return false;
      }
    }
    
    /**
     * Removes a bookmark by node ID
     * @param {string} nodeId - The ID of the node to remove from bookmarks
     */
    async function removeBookmarkByNodeId(nodeId) {
      try {
        // Delete from database
        const response = await fetch(`/api/bookmarks/node/${nodeId}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          throw new Error(`Failed to delete bookmark: ${response.statusText}`);
        }
        
        // Remove from local cache
        const index = bookmarks.findIndex(b => b.node_id === nodeId);
        if (index !== -1) {
          bookmarks.splice(index, 1);
        }
        
        // Remove click count
        if (clickCounts[nodeId]) {
          delete clickCounts[nodeId];
          saveClickCounts();
        }
        
        // Update UI
        renderBookmarks();
        
        return true;
      } catch (error) {
        console.error('Error removing bookmark:', error);
        return false;
      }
    }
    
    /**
     * Checks if a node is bookmarked
     * @param {string} nodeId - The ID of the node to check
     * @returns {boolean} True if the node is bookmarked
     */
    function isNodeBookmarked(nodeId) {
      return bookmarks.some(b => b.node_id === nodeId);
    }
    
    /**
     * Focuses on a node
     * @param {string} nodeId - The ID of the node to focus on
     */
    async function focusOnNode(nodeId) {
      try {
        console.log(`Focusing on node: ${nodeId}`);
        
        // Increment click count
        incrementClickCount(nodeId);
        
        // Refresh bookmarks list if sorted by clicks
        if (sortByClicks) {
          renderBookmarks();
        }
        
        // Verify the node exists before attempting to focus on it
        try {
          const nodeResponse = await fetch(`/api/nodes/${nodeId}`);
          if (nodeResponse.status === 404) {
            console.error(`Node ${nodeId} no longer exists`);
            
            // Show error to user
            alert(`The bookmarked node no longer exists. The bookmark will be removed.`);
            
            // Remove the stale bookmark
            await removeBookmarkByNodeId(nodeId);
            return;
          }
          
          if (!nodeResponse.ok) {
            throw new Error(`Failed to fetch node ${nodeId}: ${nodeResponse.statusText}`);
          }
          
          // Node exists, now focus on it
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
              } else {
                console.error(`Node element for ${nodeId} not found in DOM after expanding parents`);
              }
            }, 300);
          }
        } catch (error) {
          console.error(`Error checking if node ${nodeId} exists:`, error);
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
        if (!response.ok) {
          if (response.status === 404) {
            console.error(`Node ${nodeId} not found, cannot expand its parents`);
            return false;
          }
          throw new Error(`Failed to fetch node ${nodeId}: ${response.statusText}`);
        }
        
        const node = await response.json();
        
        if (node.parent_id) {
          // First expand the parent's parents recursively
          const parentExpanded = await expandParentNodes(node.parent_id);
          
          // If parent expansion failed, stop here
          if (parentExpanded === false) {
            return false;
          }
          
          // Then expand the parent itself if it's not already expanded
          try {
            const parentResponse = await fetch(`/api/nodes/${node.parent_id}`);
            if (!parentResponse.ok) {
              throw new Error(`Failed to fetch parent node ${node.parent_id}`);
            }
            
            const parentNode = await parentResponse.json();
            if (!parentNode.is_expanded) {
              const toggleResponse = await fetch(`/api/nodes/${node.parent_id}/toggle`, {
                method: 'POST'
              });
              
              if (!toggleResponse.ok) {
                throw new Error(`Failed to toggle parent node ${node.parent_id}`);
              }
              
              if (window.NodeOperationsManager && window.NodeOperationsManager.refreshSubtree) {
                await window.NodeOperationsManager.refreshSubtree(node.parent_id);
              } else if (window.fetchNodes) {
                await window.fetchNodes();
              }
            }
          } catch (error) {
            console.error('Error expanding parent node:', error);
            return false;
          }
        }
        
        return true;
      } catch (error) {
        console.error('Error expanding parent nodes:', error);
        return false;
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
      loadBookmarks().then(() => renderBookmarks());
    }
    
    /**
     * Renders the bookmarks in the sidebar
     */
    function renderBookmarks() {
      // Check if bookmarksContainer exists
      if (!bookmarksContainer) {
        console.error('bookmarksContainer is null, cannot render bookmarks');
        // Instead of trying to recreate here, we'll wait for the next initialization cycle
        return;
      }
      
      console.log('Rendering bookmarks to container:', bookmarksContainer);
      
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
        console.log('Added "no bookmarks" message to container');
        return;
      }
      
      // Create a list for the bookmarks
      const list = document.createElement('ul');
      list.className = 'bookmarks-list';
      list.style.listStyle = 'none';
      list.style.padding = '0';
      list.style.margin = '0';
      list.style.maxHeight = 'none'; // Remove any height limit
      list.style.height = 'auto';    // Let it grow with content
      list.style.overflowY = 'visible'; // No scrolling in the list itself
      
      // Sort bookmarks by click count if enabled
      let sortedBookmarks = [...bookmarks];
      if (sortByClicks) {
        sortedBookmarks.sort((a, b) => {
          const countA = clickCounts[a.node_id] || 0;
          const countB = clickCounts[b.node_id] || 0;
          return countB - countA; // Sort by descending click count
        });
      }
      
      sortedBookmarks.forEach((bookmark, index) => {
        // Get click count
        const clickCount = clickCounts[bookmark.node_id] || 0;
        
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
        
        // Add click count badge
        const clickBadge = document.createElement('span');
        clickBadge.className = 'bookmark-click-count';
        clickBadge.textContent = clickCount.toString();
        clickBadge.style.marginLeft = '8px';
        clickBadge.style.marginRight = '8px';
        clickBadge.style.backgroundColor = clickCount > 0 ? '#e8f0fe' : '#f5f5f5';
        clickBadge.style.color = clickCount > 0 ? '#4285f4' : '#999';
        clickBadge.style.borderRadius = '12px';
        clickBadge.style.padding = '1px 6px';
        clickBadge.style.fontSize = '11px';
        clickBadge.style.fontWeight = 'bold';
        clickBadge.title = `Clicked ${clickCount} times`;
        
        // Add click handler to focus on the node
        text.addEventListener('click', () => {
          focusOnNode(bookmark.node_id);
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
        item.appendChild(clickBadge);
        item.appendChild(deleteBtn);
        list.appendChild(item);
      });
      
      bookmarksContainer.appendChild(list);
    }
    
    // Add this function to the public API's debug object
    function testContainerHeight() {
      if (!bookmarksContainer) {
        console.error('Bookmarks container not found');
        return;
      }
      
      console.log('Bookmarks container properties:');
      console.log('- offsetHeight:', bookmarksContainer.offsetHeight);
      console.log('- clientHeight:', bookmarksContainer.clientHeight);
      console.log('- scrollHeight:', bookmarksContainer.scrollHeight);
      console.log('- style.maxHeight:', bookmarksContainer.style.maxHeight);
      console.log('- computed maxHeight:', window.getComputedStyle(bookmarksContainer).maxHeight);
      
      // Add a visual indicator of the container dimensions
      const dimensions = document.createElement('div');
      dimensions.textContent = `Container: ${bookmarksContainer.offsetWidth}×${bookmarksContainer.offsetHeight}px | Content: ${bookmarksContainer.scrollHeight}px`;
      dimensions.style.backgroundColor = '#f44336';
      dimensions.style.color = 'white';
      dimensions.style.padding = '4px';
      dimensions.style.fontSize = '12px';
      dimensions.style.marginBottom = '8px';
      
      // Insert at the top of the container
      bookmarksContainer.insertBefore(dimensions, bookmarksContainer.firstChild);
      
      // Add dummy items to test scrolling
      if (bookmarksContainer.scrollHeight < 500) {
        const dummies = document.createElement('div');
        dummies.style.backgroundColor = '#e0e0e0';
        dummies.style.padding = '8px';
        dummies.style.marginTop = '16px';
        dummies.innerHTML = '<h4>Test Items (500px)</h4>';
        
        for (let i = 0; i < 20; i++) {
          const item = document.createElement('div');
          item.style.padding = '10px';
          item.style.margin = '5px 0';
          item.style.backgroundColor = '#f0f0f0';
          item.style.border = '1px solid #ddd';
          item.textContent = `Test item ${i+1} to verify scrolling`;
          dummies.appendChild(item);
        }
        
        bookmarksContainer.appendChild(dummies);
      }
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
      debug: {
        forceRender: renderBookmarks,
        getBookmarks: () => bookmarks,
        getContainer: () => bookmarksContainer,
        testContainerHeight: testContainerHeight,
        reloadBookmarks: loadBookmarks,
        getClickCounts: () => clickCounts,
        resetClickCounts: () => {
          clickCounts = {};
          saveClickCounts();
          renderBookmarks();
        }
      }
    };
})();

// Export the module for use in other files
window.BookmarkManager = BookmarkManager;