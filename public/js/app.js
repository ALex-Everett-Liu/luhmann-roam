document.addEventListener('DOMContentLoaded', () => {
  // ================================================================
  // MOVE THIS TO THE TOP - Make addButtonToSidebar available globally early
  // ================================================================
  
  // Define this function at the top of the file, after other variable declarations
  function addButtonToSidebar(button) {
    const sidebarElement = document.querySelector('.sidebar');
    if (sidebarElement) {
      sidebarElement.appendChild(button);
    }
  }
  
  // Make it available globally immediately
  window.addButtonToSidebar = addButtonToSidebar;

  // ================================================================
  // ALL APPLICATION CODE AND FUNCTIONS SHOULD BE DEFINED INSIDE HERE
  // =
  const outlinerContainer = document.getElementById('outliner-container');
  const addRootNodeButton = document.getElementById('add-root-node');
  const languageToggle = document.getElementById('language-toggle');
  
  // Variables and state
  let nodes = [];
  let currentModalNodeId = null;
  let lastFocusedNodeId = null; // Add this variable to track the currently focused node
  let isInitialLoading = true; // Flag to indicate initial loading
  let globalOtherLanguageVisible = false; // Global state for other language visibility
  
  // Application functions
  // Update language toggle button text
  function updateLanguageToggle() {
    const toggleButton = document.getElementById('language-toggle');
    toggleButton.textContent = I18n.t('switchToLanguage');
  }
  
  // Add this function to save the current focus as default
  function setDefaultFocusNode(nodeId) {
    const vault = window.VaultManager?.getCurrentVault() || 'main';
    localStorage.setItem(`${vault}_default_focus_node`, nodeId);
    alert('This node is now set as the default focus on startup.');
  }
  
  // Fetch top-level nodes
  async function fetchNodes(forceFresh = false) {
    const scrollPosition = window.scrollY;
    console.log(`Saving scroll position: ${scrollPosition}px`);
    
    try {
      // Get default focus node if initial loading
      const vault = window.VaultManager?.getCurrentVault() || 'main';
      const defaultFocusNodeId = localStorage.getItem(`${vault}_default_focus_node`);
      
      // If we have a default focus node and this is initial loading, only load that subtree
      if (isInitialLoading && defaultFocusNodeId && window.BreadcrumbManager) {
        console.log(`Loading with default focus on node: ${defaultFocusNodeId}`);
        
        try {
          // Try to get the focused node and its children
          const focusNodeResponse = await fetch(`/api/nodes/${defaultFocusNodeId}?lang=${I18n.getCurrentLanguage()}${forceFresh ? `&_=${Date.now()}` : ''}`);
          
          // Check if node exists in this vault
          if (focusNodeResponse.status === 404) {
            console.log(`Default focus node ${defaultFocusNodeId} not found in vault ${vault}, loading all nodes instead`);
            // Load all nodes instead
            const allNodesResponse = await fetch(`/api/nodes?lang=${I18n.getCurrentLanguage()}${forceFresh ? `&_=${Date.now()}` : ''}`);
            nodes = await allNodesResponse.json();
            await renderOutliner();
            isInitialLoading = false;
            return;
          }
          
          const focusNode = await focusNodeResponse.json();
          
          // Empty the nodes array and just add this node
          nodes = [focusNode];
          
          // Render the outliner with just this node
          await renderOutliner();
          
          // Focus on this node after rendering
          setTimeout(() => {
            window.BreadcrumbManager.focusOnNode(defaultFocusNodeId);
            isInitialLoading = false;
          }, 100);
          
          return;
        } catch (error) {
          console.error('Error loading default focus node, falling back to all nodes:', error);
          // Fall back to loading all nodes
        }
      }
      
      // Normal loading without focus
      const cacheBuster = forceFresh ? `&_=${Date.now()}` : '';
      const currentLanguage = I18n.getCurrentLanguage();
      console.log(`Fetching nodes with lang=${currentLanguage}${forceFresh ? ' (forced fresh load)' : ''}`);
      const response = await fetch(`/api/nodes?lang=${currentLanguage}${cacheBuster}`);
      nodes = await response.json();
      await renderOutliner();
      
      // Set initial loading to false after first load
      isInitialLoading = false;
      
      // Reapply filters after rendering
      if (window.FilterManager) {
        FilterManager.applyFilters();
      }
      
      // Restore scroll position
      setTimeout(() => {
        console.log(`Restoring scroll position to: ${scrollPosition}px`);
        window.scrollTo(0, scrollPosition);
      }, 10);
    } catch (error) {
      console.error('Error fetching nodes:', error);
      isInitialLoading = false;
    }
  }
  
  // Fetch children for a node
  async function fetchChildren(nodeId, forceFresh = false) {
    try {
      // Add cache-busting parameter to prevent stale data
      const cacheBuster = forceFresh ? `&_=${Date.now()}` : '';
      const currentLanguage = I18n.getCurrentLanguage();
      const response = await fetch(`/api/nodes/${nodeId}/children?lang=${currentLanguage}${cacheBuster}`);
      return await response.json();
    } catch (error) {
      console.error(`Error fetching children for node ${nodeId}:`, error);
      return [];
    }
  }
  
  // Render the outliner
  async function renderOutliner() {
    const scrollPosition = window.scrollY;
    console.log(`Saving scroll position: ${scrollPosition}px`);
    
    outlinerContainer.innerHTML = '';
    
    for (const node of nodes) {
      const nodeElement = await createNodeElement(node);
      outlinerContainer.appendChild(nodeElement);
    }
    
    // Use DragDropManager instead of local function - ONLY if plugin is enabled
    if (window.DragDropManager && window.PluginManager && PluginManager.isPluginEnabled('dragDropManager')) {
      DragDropManager.setupDragAndDrop();
    }

    // Refresh size highlights if enabled
    if (window.NodeSizeHighlightManager && window.NodeSizeHighlightManager.getEnabled()) {
      NodeSizeHighlightManager.refreshHighlights();
    }
    
    // Try to restore scroll position
    setTimeout(() => {
      // First try to find and scroll to the last focused node
      if (lastFocusedNodeId) {
        const focusedElement = document.querySelector(`.node[data-id="${lastFocusedNodeId}"]`);
        if (focusedElement) {
          console.log(`Scrolling to last focused node: ${lastFocusedNodeId}`);
          focusedElement.scrollIntoView({ behavior: 'auto', block: 'center' });
          
          // Add a brief highlight effect
          focusedElement.classList.add('highlight-focus');
          setTimeout(() => {
            focusedElement.classList.remove('highlight-focus');
          }, 1000);
          
          return;
        }
      }
      
      // Fall back to the saved scroll position if we can't find the focused node
      console.log(`Restoring scroll position to: ${scrollPosition}px`);
      window.scrollTo(0, scrollPosition);
    }, 10);
  }
  
  // Add this function to detect Chinese text
  function hasChineseText(text) {
    return /[\u4E00-\u9FFF]/.test(text);
  }
  
  // Modify your createNodeElement function to set the lang attribute correctly
  async function createNodeElement(node) {
    const nodeDiv = document.createElement('div');
    nodeDiv.className = 'node';
    nodeDiv.dataset.id = node.id;
    
    // Node content
    const nodeContent = document.createElement('div');
    nodeContent.className = 'node-content';
    
    // Add 'has-markdown' class if node has markdown
    if (node.has_markdown) {
      nodeContent.classList.add('has-markdown');
    }
    
    // Drag handle
    const dragHandle = document.createElement('span');
    dragHandle.className = 'drag-handle';
    dragHandle.innerHTML = '⋮⋮';
    dragHandle.draggable = true;
    dragHandle.dataset.id = node.id;
    nodeContent.appendChild(dragHandle);
    
    // Collapse/expand button
    const children = await fetchChildren(node.id);
    if (children.length > 0) {
      const collapseIcon = document.createElement('span');
      collapseIcon.className = 'collapse-icon';
      collapseIcon.innerHTML = node.is_expanded ? '▼' : '►';
      collapseIcon.addEventListener('click', () => toggleNode(node.id));
      nodeContent.appendChild(collapseIcon);
    } else {
      const bullet = document.createElement('span');
      bullet.className = 'bullet';
      bullet.innerHTML = '•';
      nodeContent.appendChild(bullet);
    }
    
    // Node text (editable)
    const nodeText = document.createElement('div');
    nodeText.className = 'node-text';
    nodeText.contentEditable = true;
    
    const currentLanguage = I18n.getCurrentLanguage();
    let displayContent, otherLangContent, otherLangCode;

    if (currentLanguage === 'en') {
      displayContent = node.content;
      otherLangContent = node.content_zh;
      otherLangCode = 'zh';
    } else {
      displayContent = node.content_zh || node.content; // Fallback to EN if ZH is empty
      otherLangContent = node.content;
      otherLangCode = 'en';
    }
    
    // Make sure displayContent is never undefined or null for the editable field
    nodeText.textContent = displayContent || ''; // Use empty string if null/undefined

    // Styling for the editable field (already done in previous steps)
    nodeText.style.whiteSpace = 'pre-wrap';
    nodeText.style.wordWrap = 'break-word';
    nodeText.style.overflowWrap = 'break-word';

    // Set language attribute for the editable field
    if (currentLanguage === 'zh' || hasChineseText(nodeText.textContent)) {
      nodeText.setAttribute('lang', 'zh');
    } else {
      nodeText.removeAttribute('lang');
    }

    // ADD FOCUS TRACKING TO NODE TEXT
    nodeText.addEventListener('focus', function() {
        updateGlobalLastFocusedNodeId(node.id);
        console.log(`Node ${node.id} focused, updating lastFocusedNodeId`);
    });

    // ADD THE MISSING BLUR EVENT HANDLER HERE
    nodeText.addEventListener('blur', async function() {
        // Keep the lastFocusedNodeId even after blur so commands can still use it
        // Only clear it if we're focusing on a different node
        
        const currentContent = nodeText.innerText; // Use innerText to preserve line breaks
        const originalContent = currentLanguage === 'en' ? (node.content || '') : (node.content_zh || node.content || '');
        
        console.log(`Blur event for node ${node.id}:`);
        console.log(`- Current content: "${currentContent}"`);
        console.log(`- Original content: "${originalContent}"`);
        
        // Convert line breaks to \n for storage
        const savedContent = currentContent.replace(/\n/g, '\\n');
        const normalizedOriginal = originalContent.replace(/\\n/g, '\n');
        
        console.log(`- Saved content (with \\n): "${savedContent}"`);
        console.log(`- Normalized original: "${normalizedOriginal}"`);
        
        if (currentContent !== normalizedOriginal) {
            console.log(`Content changed for node ${node.id}, saving...`);
            
            let success;
            if (currentLanguage === 'en') {
                success = await updateNodeContent(node.id, savedContent, undefined);
            } else {
                success = await updateNodeContent(node.id, undefined, savedContent);
            }
            
            if (success) {
                console.log(`Successfully saved content for node ${node.id}`);
                // Update the local node data
                if (currentLanguage === 'en') {
                    node.content = currentContent;
                } else {
                    node.content_zh = currentContent;
                }
            } else {
                console.error(`Failed to save content for node ${node.id}`);
            }
        } else {
            console.log(`No content change detected for node ${node.id}`);
        }
    });

    // ADD KEYBOARD EVENT HANDLER FOR TAB/SHIFT+TAB AND ENTER
    nodeText.addEventListener('keydown', function(e) {
      if (e.key === 'Tab') {
        e.preventDefault(); // Prevent default tab behavior
        
        if (e.shiftKey) {
          // Shift+Tab: Outdent node
          console.log(`Shift+Tab pressed on node ${node.id}, outdenting...`);
          outdentNode(node.id);
        } else {
          // Tab: Indent node
          console.log(`Tab pressed on node ${node.id}, indenting...`);
          indentNode(node.id);
        }
      } else if (e.key === 'Enter') {
        if (e.shiftKey) {
          // Shift+Enter: Allow default behavior (add newline)
          console.log(`Shift+Enter pressed on node ${node.id}, adding newline...`);
          // Don't prevent default - let the browser add a newline
          return;
        } else {
          // Enter: Add child node
          e.preventDefault(); // Prevent default enter behavior (which would add a line break)
          console.log(`Enter pressed on node ${node.id}, adding child...`);
          addChildNode(node.id);
        }
      }
    });

    nodeContent.appendChild(nodeText); // Add the editable text field

    // Read-only view for the OTHER language (moved below and made toggleable)
    if (otherLangContent) { // Only show if there's content in the other language
      // Create toggle button
      const toggleOtherLangButton = document.createElement('button');
      toggleOtherLangButton.className = 'toggle-other-lang-button';
      toggleOtherLangButton.innerHTML = `👁️ ${otherLangCode.toUpperCase()}`;
      toggleOtherLangButton.title = `Toggle ${otherLangCode === 'zh' ? 'Chinese' : 'English'} content`;
      toggleOtherLangButton.style.fontSize = '11px';
      toggleOtherLangButton.style.padding = '2px 6px';
      toggleOtherLangButton.style.marginLeft = '8px';
      toggleOtherLangButton.style.backgroundColor = '#f0f0f0';
      toggleOtherLangButton.style.border = '1px solid #ccc';
      toggleOtherLangButton.style.borderRadius = '3px';
      toggleOtherLangButton.style.cursor = 'pointer';
      
      // Create the other language content container
      const otherLanguageContainer = document.createElement('div');
      otherLanguageContainer.className = 'node-text-other-language-container';
      otherLanguageContainer.style.display = 'none'; // Hidden by default
      otherLanguageContainer.style.marginTop = '8px';
      otherLanguageContainer.style.paddingLeft = '20px'; // Indent to show it's related
      
      const otherLanguageText = document.createElement('div');
      otherLanguageText.className = 'node-text-other-language';
      otherLanguageText.textContent = otherLangContent.replace(/\\n/g, '\n'); // Ensure newlines are displayed

      // Improved styling for read-only view
      otherLanguageText.style.fontSize = '0.9em';
      otherLanguageText.style.color = '#555';
      otherLanguageText.style.backgroundColor = '#f8f9fa';
      otherLanguageText.style.padding = '8px';
      otherLanguageText.style.border = '1px dashed #ddd';
      otherLanguageText.style.borderRadius = '4px';
      otherLanguageText.style.whiteSpace = 'pre-wrap';
      otherLanguageText.style.wordWrap = 'break-word';
      otherLanguageText.style.overflowWrap = 'break-word';
      otherLanguageText.style.lineHeight = '1.5';
      otherLanguageText.style.maxHeight = '200px'; // Limit height for very long content
      otherLanguageText.style.overflowY = 'auto'; // Add scrolling for long content
      
      // Set lang attribute for the read-only field
      if (otherLangCode === 'zh' || hasChineseText(otherLanguageText.textContent)) {
        otherLanguageText.setAttribute('lang', 'zh');
        } else {
        otherLanguageText.removeAttribute('lang');
      }

      // Add a small header to indicate what language this is
      const languageHeader = document.createElement('div');
      languageHeader.style.fontSize = '0.8em';
      languageHeader.style.color = '#888';
      languageHeader.style.marginBottom = '4px';
      languageHeader.style.fontWeight = 'bold';
      languageHeader.textContent = otherLangCode === 'zh' ? '中文内容:' : 'English Content:';
      
      otherLanguageContainer.appendChild(languageHeader);
      otherLanguageContainer.appendChild(otherLanguageText);
      
      // Toggle functionality
      toggleOtherLangButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event bubbling
        const isVisible = otherLanguageContainer.style.display !== 'none';
        
        if (isVisible) {
          otherLanguageContainer.style.display = 'none';
          toggleOtherLangButton.innerHTML = `👁️ ${otherLangCode.toUpperCase()}`;
          toggleOtherLangButton.style.backgroundColor = '#f0f0f0';
        } else {
          otherLanguageContainer.style.display = 'block';
          toggleOtherLangButton.innerHTML = `🙈 ${otherLangCode.toUpperCase()}`;
          toggleOtherLangButton.style.backgroundColor = '#e8f0fe';
        }
      });
      
      // Set initial state based on global preference
      if (globalOtherLanguageVisible) {
        otherLanguageContainer.style.display = 'block';
        toggleOtherLangButton.innerHTML = `🙈 ${otherLangCode.toUpperCase()}`;
        toggleOtherLangButton.style.backgroundColor = '#e8f0fe';
      } else {
        otherLanguageContainer.style.display = 'none';
        toggleOtherLangButton.innerHTML = `👁️ ${otherLangCode.toUpperCase()}`;
        toggleOtherLangButton.style.backgroundColor = '#f0f0f0';
      }
      
      // Add the toggle button to the node actions area (we'll add it later)
      // Store reference for later use
      nodeContent._toggleOtherLangButton = toggleOtherLangButton;
      nodeContent._otherLanguageContainer = otherLanguageContainer;
    }
    
    // Node actions
    const nodeActions = document.createElement('div');
    nodeActions.className = 'node-actions';
    
    // Add the toggle button to node actions if it exists
    if (nodeContent._toggleOtherLangButton) {
      nodeActions.appendChild(nodeContent._toggleOtherLangButton);
    }
    
    // Position button
    const positionButton = document.createElement('button');
    positionButton.className = 'position-button';
    positionButton.innerHTML = '#';
    positionButton.title = 'Adjust position';
    positionButton.addEventListener('click', () => PositionManager.openPositionAdjustModal(node.id));
    nodeActions.appendChild(positionButton);
    
    // Timestamp button
    const timestampButton = document.createElement('button');
    timestampButton.className = 'timestamp-button';
    timestampButton.innerHTML = '🕒';
    timestampButton.title = 'View timestamps';
    timestampButton.addEventListener('click', () => TimestampManager.openModal(node.id));
    nodeActions.appendChild(timestampButton);
    
    // Link button
    const linkButton = document.createElement('button');
    linkButton.className = 'link-button';
    linkButton.innerHTML = '🔗';
    linkButton.title = 'Manage links';
    linkButton.addEventListener('click', () => LinkManager.openModal(node.id));
    nodeActions.appendChild(linkButton);
    
    // Move node button
    const moveNodeButton = document.createElement('button');
    moveNodeButton.className = 'move-button';
    moveNodeButton.innerHTML = '📍';
    moveNodeButton.title = 'Move node';
    moveNodeButton.addEventListener('click', () => PositionManager.openMoveNodeModal(node.id));
    nodeActions.appendChild(moveNodeButton);
    
    // Add sibling before button
    const addSiblingBeforeButton = document.createElement('button');
    addSiblingBeforeButton.className = 'sibling-button';
    addSiblingBeforeButton.innerHTML = '↑+';
    addSiblingBeforeButton.title = 'Add sibling before';
    addSiblingBeforeButton.addEventListener('click', () => addSiblingNode(node.id, 'before'));
    nodeActions.appendChild(addSiblingBeforeButton);
    
    // Add sibling after button
    const addSiblingAfterButton = document.createElement('button');
    addSiblingAfterButton.className = 'sibling-button';
    addSiblingAfterButton.innerHTML = '↓+';
    addSiblingAfterButton.title = 'Add sibling after';
    addSiblingAfterButton.addEventListener('click', () => addSiblingNode(node.id, 'after'));
    nodeActions.appendChild(addSiblingAfterButton);
    
    // Markdown button
    const markdownButton = document.createElement('button');
    markdownButton.className = 'markdown-button';
    markdownButton.innerHTML = '📝';
    markdownButton.title = 'Edit markdown notes';
    markdownButton.addEventListener('click', () => MarkdownManager.openModal(node.id));
    nodeActions.appendChild(markdownButton);
    
    // Size button
    const sizeButton = document.createElement('button');
    sizeButton.className = 'size-button';
    sizeButton.innerHTML = '⚙️';
    sizeButton.title = 'Adjust node size in grid view';
    sizeButton.addEventListener('click', () => {
      if (window.NodeSizeManager) {
        NodeSizeManager.openNodeSizeModal(node.id);
      } else {
        console.error('NodeSizeManager not available');
      }
    });
    nodeActions.appendChild(sizeButton);
    
    const addButton = document.createElement('button');
    addButton.innerHTML = '+';
    addButton.title = 'Add child node';
    addButton.addEventListener('click', () => addChildNode(node.id));
    nodeActions.appendChild(addButton);
    
    const deleteButton = document.createElement('button');
    deleteButton.innerHTML = '×';
    deleteButton.title = 'Delete node';
    deleteButton.addEventListener('click', () => deleteNode(node.id));
    nodeActions.appendChild(deleteButton);
    
    // Position fixer button
    const positionFixerButton = document.createElement('button');
    positionFixerButton.className = 'position-fixer-button';
    positionFixerButton.innerHTML = '🛠️';
    positionFixerButton.title = 'Check/fix position conflicts';
    positionFixerButton.addEventListener('click', async (e) => {
      e.stopPropagation();
      const result = await NodeOperationsManager.fixNodePositions(node.id);
      
      if (result.error) {
        alert(`Error checking positions: ${result.error}`);
        return;
      }
      
      if (result.fixed) {
        alert(`Fixed ${result.conflicts.length} position conflicts!`);
      } else {
        alert('No position conflicts found at this level.');
      }
    });
    nodeActions.appendChild(positionFixerButton);
    
    // Add bookmark button to node actions
    if (window.BookmarkManager) {
      BookmarkManager.addBookmarkButtonToNode(nodeActions, node.id);
    }

    // Focus button (replaces double-click functionality)
    const focusButton = document.createElement('button');
    focusButton.className = 'focus-button';
    focusButton.innerHTML = '🎯';
    focusButton.title = 'Focus on this node (Alt+F when hovering)';
    focusButton.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.BreadcrumbManager) {
        window.BreadcrumbManager.focusOnNode(node.id);
      }
    });
    nodeActions.appendChild(focusButton);
    
    // Default focus button
    const defaultFocusButton = document.createElement('button');
    defaultFocusButton.className = 'default-focus-button';
    defaultFocusButton.innerHTML = '🔍';
    defaultFocusButton.title = 'Set as default focus node on startup';
    defaultFocusButton.addEventListener('click', () => setDefaultFocusNode(node.id));
    nodeActions.appendChild(defaultFocusButton);
    
    // Export tree button
    if (window.DatabaseExportImportManager && DatabaseExportImportManager.addExportTreeButtonToNodeActions) {
      DatabaseExportImportManager.addExportTreeButtonToNodeActions(nodeActions, node.id);
    }
    
    // Copy content buttons (only show if there's content to copy)
    if (node.content && node.content.trim() !== '' && node.content !== I18n.t('newNode')) {
      const copyToChineseButton = document.createElement('button');
      copyToChineseButton.className = 'copy-content-button';
      copyToChineseButton.innerHTML = 'EN→中';
      copyToChineseButton.title = 'Copy English content to Chinese';
      copyToChineseButton.style.fontSize = '10px';
      copyToChineseButton.style.padding = '2px 4px';
      copyToChineseButton.style.marginLeft = '3px';
      copyToChineseButton.style.backgroundColor = '#e8f5e8';
      copyToChineseButton.style.border = '1px solid #4CAF50';
      copyToChineseButton.style.borderRadius = '3px';
      copyToChineseButton.style.cursor = 'pointer';
      copyToChineseButton.style.color = '#2E7D32';
      copyToChineseButton.addEventListener('click', async (e) => {
        e.stopPropagation();
        await copyContentBetweenLanguages(node.id, 'en-to-zh');
      });
      nodeActions.appendChild(copyToChineseButton);
    }
    
    if (node.content_zh && node.content_zh.trim() !== '' && node.content_zh !== I18n.t('newNode')) {
      const copyToEnglishButton = document.createElement('button');
      copyToEnglishButton.className = 'copy-content-button';
      copyToEnglishButton.innerHTML = '中→EN';
      copyToEnglishButton.title = 'Copy Chinese content to English';
      copyToEnglishButton.style.fontSize = '10px';
      copyToEnglishButton.style.padding = '2px 4px';
      copyToEnglishButton.style.marginLeft = '3px';
      copyToEnglishButton.style.backgroundColor = '#e3f2fd';
      copyToEnglishButton.style.border = '1px solid #2196F3';
      copyToEnglishButton.style.borderRadius = '3px';
      copyToEnglishButton.style.cursor = 'pointer';
      copyToEnglishButton.style.color = '#1565C0';
      copyToEnglishButton.addEventListener('click', async (e) => {
        e.stopPropagation();
        await copyContentBetweenLanguages(node.id, 'zh-to-en');
      });
      nodeActions.appendChild(copyToEnglishButton);
    }
    
    nodeContent.appendChild(nodeActions);
    nodeDiv.appendChild(nodeContent);
    
    // Add the other language container after the main node content
    if (nodeContent._otherLanguageContainer) {
      nodeDiv.appendChild(nodeContent._otherLanguageContainer);
    }
    
    // Children container
    if (children.length > 0 && node.is_expanded) {
      const childrenDiv = document.createElement('div');
      childrenDiv.className = 'children';
      
      for (const child of children) {
        const childElement = await createNodeElement(child);
        childrenDiv.appendChild(childElement);
      }
      
      nodeDiv.appendChild(childrenDiv);
    }
    
    // After creating the node element and before returning it
    if (window.BreadcrumbManager) {
      BreadcrumbManager.addNodeFocusHandler(nodeDiv, node.id);
    }
    
    return nodeDiv;
  }
  
  // Add a root node
  async function addRootNode() {
    if (window.NodeOperationsManager) {
      // Just call the manager function and let it handle the refresh
      await NodeOperationsManager.addRootNode(nodes);
    } else {
      console.error('NodeOperationsManager not available');
    }
  }
  
  // Add a child node
  async function addChildNode(parentId) {
    try {
      // Store whether we're in focus mode before the operation
      const wasInFocusMode = window.BreadcrumbManager && window.BreadcrumbManager.isInFocusMode();
      const currentFocusedNodeId = wasInFocusMode && window.BreadcrumbManager ? 
        window.BreadcrumbManager.getCurrentFocusedNodeId() : null;
      
      if (window.NodeOperationsManager) {
        // Just create the node without changing focus
        await NodeOperationsManager.addChildNode(parentId);
        
        // No focus restoration needed - we want to maintain the current focus state
        // REMOVED: code that was restoring focus to parentId
      } else {
        console.error('NodeOperationsManager not available');
      }
    } catch (error) {
      console.error('Error adding child node:', error);
    }
  }
  
  // Update node content
  async function updateNodeContent(nodeId, content, content_zh) {
    try {
      console.log(`updateNodeContent called for ${nodeId} with:`, { content_param: content, content_zh_param: content_zh });
      
      // Simple approach: just pass the content as-is since the blur handler already formatted it correctly
      const updateData = {};
      
      if (content !== undefined) {
          updateData.content = content;
        }
      if (content_zh !== undefined) {
          updateData.content_zh = content_zh;
      }
      
      console.log(`Sending update request for node ${nodeId} with data:`, updateData);
      
      const response = await fetch(`/api/nodes/${nodeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error(`Error saving node ${nodeId}:`, errorData);
        return false;
      }
      
      const updatedNodeFromServer = await response.json();
      console.log(`Successfully saved node ${nodeId}:`, updatedNodeFromServer);
      
      // Update the node in our local data structure (nodes array) to ensure consistency
      // The updatedNodeFromServer contains \\n, so we need to process it for local display cache
      const processedUpdateForLocalCache = {
          content: updatedNodeFromServer.content ? updatedNodeFromServer.content.replace(/\\n/g, '\n') : updatedNodeFromServer.content,
          content_zh: updatedNodeFromServer.content_zh ? updatedNodeFromServer.content_zh.replace(/\\n/g, '\n') : updatedNodeFromServer.content_zh,
      };
      updateLocalNodeData(nodeId, processedUpdateForLocalCache);
      
      return true;
    } catch (error) {
      console.error(`Error updating node ${nodeId}:`, error);
      return false;
    }
  }
  
  // Helper function to update local node data after a successful save
  function updateLocalNodeData(nodeId, updateData) {
    // Update in the top-level nodes array if present
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === nodeId) {
        if (updateData.content !== undefined) {
          nodes[i].content = updateData.content;
        }
        if (updateData.content_zh !== undefined) {
          nodes[i].content_zh = updateData.content_zh;
        }
        console.log(`Updated local data for top-level node ${nodeId}`);
        return;
      }
    }
    
    // If not found at top level, it might be a child node
    // We'll handle this in a future update if needed
    console.log(`Node ${nodeId} not found in top-level nodes, may be a child node`);
  }
  
  // Helper function to find a node by ID in our local data structure
  function findNodeById(nodeId) {
    // First check top-level nodes
    for (const node of nodes) {
      if (node.id === nodeId) {
        return node;
      }
      
      // Recursively check children if the node has any
      if (node.children) {
        const found = findNodeInChildren(node.children, nodeId);
        if (found) return found;
      }
    }
    
    // Node not found in our local data
    return null;
  }
  
  // Helper function to recursively search for a node in children
  function findNodeInChildren(children, nodeId) {
    if (!children || children.length === 0) return null;
    
    for (const child of children) {
      if (child.id === nodeId) {
        return child;
      }
      
      if (child.children) {
        const found = findNodeInChildren(child.children, nodeId);
        if (found) return found;
      }
    }
    
    return null;
  }
  
  // Delete a node
  async function deleteNode(nodeId) {
    if (window.NodeOperationsManager) {
      return NodeOperationsManager.deleteNode(nodeId);
    } else {
      console.error('NodeOperationsManager not available');
      return false;
    }
  }
  
  // Toggle node expansion
  async function toggleNode(nodeId) {
    if (window.NodeExpansionManager) {
      await preserveFocusState(async () => {
        return NodeExpansionManager.toggleNode(nodeId);
      });
    } else {
      console.error('NodeExpansionManager not available');
      return false;
    }
  }
  
  // Indent a node (make it a child of the node above)
  async function indentNode(nodeId) {
    if (window.NodeOperationsManager) {
      await preserveFocusState(async () => {
        return NodeOperationsManager.indentNode(nodeId);
      }, true); // Keep focus restoration for indentation
    } else {
      console.error('NodeOperationsManager not available');
      return false;
    }
  }
  
  // Outdent a node (make it a sibling of its parent)
  async function outdentNode(nodeId) {
    if (window.NodeOperationsManager) {
      await preserveFocusState(async () => {
        return NodeOperationsManager.outdentNode(nodeId);
      });
    } else {
      console.error('NodeOperationsManager not available');
      return false;
    }
  }
  
  // Move node up
  async function moveNodeUp(nodeId) {
    if (window.NodeOperationsManager) {
      await preserveFocusState(async () => {
        return NodeOperationsManager.moveNodeUp(nodeId);
      });
    } else {
      console.error('NodeOperationsManager not available');
      return false;
    }
  }
  
  // Move node down
  async function moveNodeDown(nodeId) {
    if (window.NodeOperationsManager) {
      await preserveFocusState(async () => {
        return NodeOperationsManager.moveNodeDown(nodeId);
      });
    } else {
      console.error('NodeOperationsManager not available');
      return false;
    }
  }
  
  // Add a sibling node
  async function addSiblingNode(nodeId, position) {
    if (window.NodeOperationsManager) {
      // Instead of using preserveFocusState, just call the operation directly
      // to avoid any focus manipulation
      try {
        return await NodeOperationsManager.addSiblingNode(nodeId, position);
      } catch (error) {
        console.error(`Error adding sibling node to ${nodeId}:`, error);
        return false;
      }
    } else {
      console.error('NodeOperationsManager not available');
      return false;
    }
  }
  
  // ===================================================================
  // FEATURE: Move Node Modal
  // LOCATION: Inside DOMContentLoaded event listener
  // DEPENDENCIES: fetchNodes, debounce, currentLanguage
  // ===================================================================
  // Create move node modal
 
  // Add this right after the fixNodePositions function definition
  window.fixNodePositions = function(nodeId) {
    if (window.PositionManager) {
      return PositionManager.fixNodePositions(nodeId);
    } else {
      console.error('PositionManager not available');
      return Promise.resolve({ error: 'PositionManager not available' });
    }
  };
  
  // Save changes function - provides visual feedback
  function saveChanges() {
    const saveButton = document.getElementById('save-changes');
    const originalText = saveButton.textContent;
    
    // Change button text to show saving in progress
    saveButton.textContent = 'Saving...';
    saveButton.disabled = true;
    
    // Actually try to manually save by refreshing data from server
    console.log('Save button clicked, forcing fresh data load from server');
    fetchNodes(true).then(() => {
      console.log('Data refreshed from server with forced fresh load');
      
      saveButton.textContent = 'Saved!';
      
      // Reset button after 2 seconds
      setTimeout(() => {
        saveButton.textContent = originalText;
        saveButton.disabled = false;
      }, 2000);
    }).catch(error => {
      console.error('Error refreshing data:', error);
      saveButton.textContent = 'Error!';
      
      setTimeout(() => {
        saveButton.textContent = originalText;
        saveButton.disabled = false;
      }, 2000);
    });
  }

  // Add this function to check container settings
  function checkContainerSettings() {
    const contentContainer = document.querySelector('.content');
    if (contentContainer) {
      const styles = window.getComputedStyle(contentContainer);
      console.log('Content container settings:');
      console.log(`- Height: ${styles.height}`);
      console.log(`- Max Height: ${styles.maxHeight}`);
      console.log(`- Overflow: ${styles.overflow}`);
      console.log(`- Overflow-Y: ${styles.overflowY}`);
      
      // If the container doesn't have proper overflow settings, fix them
      if (styles.overflowY !== 'auto' && styles.overflowY !== 'scroll') {
        console.log('Fixing container overflow settings');
        contentContainer.style.overflowY = 'auto';
      }
    }
  }
  
  // Add this function to set up the resizable sidebar
  function setupResizableSidebar() {
    const appContainer = document.querySelector('.app-container'); // selecting the main application container; public/css/core/layout.css
    const sidebar = document.querySelector('.sidebar');
    const content = document.querySelector('.content');
    
    // Create the resize handle with a visible grip
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'resize-handle';
    resizeHandle.innerHTML = '<div class="resize-grip"></div>'; // users can click and drag to resize the sidebar
    
    // Insert the handle into the DOM between sidebar and content area
    appContainer.insertBefore(resizeHandle, content);
    
    // Get the initial sidebar width from localStorage or use default
    const savedWidth = localStorage.getItem('sidebarWidth');
    if (savedWidth) {
      sidebar.style.width = savedWidth + 'px';
      // Also update the handle position
      resizeHandle.style.left = `${parseInt(savedWidth)}px`;
    }
    
    // Variables for tracking resize state
    let isResizing = false;
    
    // Mouse down event on the resize handle
    resizeHandle.addEventListener('mousedown', (e) => {
      isResizing = true;
      
      // Add a class to the body during resize to prevent text selection
      document.body.classList.add('resizing');
      
      // Prevent text selection during resize
      e.preventDefault();
    });
    
    // Mouse move event for resizing
    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      
      // Calculate new width based on mouse position
      const newWidth = Math.max(200, Math.min(e.clientX, window.innerWidth * 0.8));
      
      // Update sidebar width
      sidebar.style.width = `${newWidth}px`;
      
      // Update handle position
      resizeHandle.style.left = `${newWidth}px`;
      
      // Save the width to localStorage
      localStorage.setItem('sidebarWidth', newWidth);
    });
    
    // Mouse up event to stop resizing
    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        document.body.classList.remove('resizing');
      }
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
      // Make sure sidebar doesn't exceed max width when window is resized
      const currentWidth = parseInt(getComputedStyle(sidebar).width);
      const maxWidth = window.innerWidth * 0.8;
      
      if (currentWidth > maxWidth) {
        sidebar.style.width = maxWidth + 'px';
        resizeHandle.style.left = `${maxWidth}px`;
        localStorage.setItem('sidebarWidth', maxWidth);
      }
    });
  }
  
  // Event listeners
  addRootNodeButton.addEventListener('click', addRootNode);
  languageToggle.addEventListener('click', I18n.toggleLanguage);
  
  // Add event listener for save changes button
  const saveChangesButton = document.getElementById('save-changes');
  saveChangesButton.addEventListener('click', saveChanges);
  
  // Initial setup
  updateLanguageToggle();

  // Call this function during initialization
  checkContainerSettings();
  
  // Set up resizable sidebar
  setupResizableSidebar();

  // Add clear default focus button (just once)
  const clearDefaultFocusButton = document.createElement('button');
  clearDefaultFocusButton.id = 'clear-default-focus';
  clearDefaultFocusButton.className = 'feature-toggle';
  clearDefaultFocusButton.textContent = 'Clear Default Focus';
  clearDefaultFocusButton.title = 'Clear the default focus node setting';
  clearDefaultFocusButton.addEventListener('click', () => {
    const vault = window.VaultManager?.getCurrentVault() || 'main';
    localStorage.removeItem(`${vault}_default_focus_node`);
    alert('Default focus cleared. All nodes will load on next startup.');
  });

  // Add to sidebar using helper function
  addButtonToSidebar(clearDefaultFocusButton);

  // Initialize the FilterManager - make sure it's after I18n initialization
  function initializeFilterManager() {
    if (window.FilterManager) {
      console.log('Setting up FilterManager initialization from app.js');
      
      // Make sure language is properly set first
      if (window.I18n && I18n.getCurrentLanguage) {
        FilterManager.updateLanguage(I18n.getCurrentLanguage());
      }
      
      FilterManager.initialize();
    } else {
      console.error('FilterManager is not available - check script loading order');
      
      // Try again in a moment in case scripts are still loading
      setTimeout(() => {
        if (window.FilterManager) {
          console.log('FilterManager now available, initializing');
          FilterManager.initialize();
        }
      }, 100);
    }
  }

  // Call this function at the right time
  initializeFilterManager();

  // Initialize the SearchManager
  SearchManager.initialize();

  // Initialize the BookmarkManager
  if (window.BookmarkManager) {
    console.log('Setting up BookmarkManager initialization from app.js');
    
    // Only initialize once when the DOM is fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        BookmarkManager.initialize();
      });
    } else {
      // DOM already loaded, initialize now
      BookmarkManager.initialize();
    }
  }

  // Initialize the BackupManager
  if (window.BackupManager) {
    console.log('Setting up BackupManager initialization from app.js');
    BackupManager.initialize();
  }

  // Initialize the BreadcrumbManager
  if (window.BreadcrumbManager) {
    BreadcrumbManager.initialize();
  }

  // Initialize the PositionManager
  if (window.PositionManager) {
    PositionManager.initialize();
  }

  // Initialize the TimestampManager
  if (window.TimestampManager) {
    TimestampManager.initialize();
  }

  // Initialize the TaskManager
  if (window.TaskManager) {
    TaskManager.initialize();
  }

  // Initialize the StyleSettingsManager
  if (window.StyleSettingsManager) {
    console.log('Setting up StyleSettingsManager initialization from app.js');
    StyleSettingsManager.initialize();
  }

  // Initialize the AttributeManager
  if (window.AttributeManager) {
    // Only initialize the manager itself, not the node buttons
    AttributeManager.initialize();
    
    // Don't apply attributes to all nodes immediately
    // Remove or comment out any code that adds attribute buttons at startup
  }

  // Initialize the HotkeyManager
  if (window.HotkeyManager) {
    HotkeyManager.initialize();
  }

  // Initialize the PersistentTooltipManager
  if (window.PersistentTooltipManager) {
    PersistentTooltipManager.initialize();
  }

  // Add this to the initialization code
  if (window.CommandPaletteManager) {
    CommandPaletteManager.initialize();
  }

  // Initialize the CodeAnalyzerManager
  if (window.CodeAnalyzerManager) {
    CodeAnalyzerManager.initialize();
  }

  // Initialize the DevTestPanelManager
  if (window.DevTestPanelManager) {
    DevTestPanelManager.initialize();
  }

  // Add this to the initialization section in app.js where other managers are initialized
  if (window.DatabaseExportImportManager) {
    DatabaseExportImportManager.initialize();
  }

  if (window.VaultManager) {
    VaultManager.initialize();
  }

  // Initialize the WordFrequencyManager
  if (window.WordFrequencyManager) {
    console.log('Setting up WordFrequencyManager initialization from app.js');
    WordFrequencyManager.initialize();
  }

  // Make fetchNodes available globally for the SearchManager
  window.fetchNodes = fetchNodes;


  // Add a toggle button for the 2D cosmic visualizer
  const toggle2DCosmicButton = document.createElement('button');
  toggle2DCosmicButton.id = 'toggle-cosmic-2d-view';
  toggle2DCosmicButton.className = 'feature-toggle';
  toggle2DCosmicButton.textContent = '2D Cosmic View';
  toggle2DCosmicButton.title = 'View nodes as a 2D cosmic solar system (better performance)';

  /**
   * IMPORTANT INTEGRATION NOTES:
   * 
   * 1. Module Availability:
   *    - We first check if window.CosmicNodeVisualizer2D exists
   *    - This depends on the module being assigned to the window object in its file
   *    - Without this window assignment, the module won't be available here
   * 
   * 2. Event Flow:
   *    - Button click → Check module exists → Check visibility state → Show/hide
   *    - We carefully handle the case where the module doesn't exist
   * 
   * 3. Node ID Fallback Logic:
   *    - Try lastFocusedNodeId first
   *    - Fall back to BreadcrumbManager if available
   *    - Use first available node as last resort
   */
  toggle2DCosmicButton.addEventListener('click', function() {
    console.log('2D Cosmic View button clicked');
    console.log('CosmicNodeVisualizer2D exists:', !!window.CosmicNodeVisualizer2D);
    
    if (window.CosmicNodeVisualizer2D) {
        const isCurrentlyVisible = CosmicNodeVisualizer2D.isVisible();
        console.log('Is currently visible:', isCurrentlyVisible);
        
        if (isCurrentlyVisible) {
            console.log('Hiding 2D cosmic view');
            CosmicNodeVisualizer2D.hide();
        } else {
            // Add debug logging
            console.log('Opening 2D Cosmic View with node ID:', lastFocusedNodeId);
            
            // If lastFocusedNodeId is not available, try to get it from BreadcrumbManager
            let nodeToShow = lastFocusedNodeId;
            console.log('Initial nodeToShow:', nodeToShow);
            
            if (!nodeToShow && window.BreadcrumbManager && BreadcrumbManager.getCurrentFocusedNodeId) {
                nodeToShow = BreadcrumbManager.getCurrentFocusedNodeId();
                console.log('Got nodeId from BreadcrumbManager:', nodeToShow);
            }
            
            // If still no node ID, get the first visible node
            if (!nodeToShow && nodes.length > 0) {
                nodeToShow = nodes[0].id;
                console.log('Falling back to first visible node:', nodeToShow);
            }
            
            console.log('Final nodeToShow:', nodeToShow);
            
            // Show visualization with the determined node ID
            if (nodeToShow) {
                try {
                    console.log('Calling CosmicNodeVisualizer2D.show()');
                    CosmicNodeVisualizer2D.show(nodeToShow);
                } catch (error) {
                    console.error('Error calling show():', error);
                }
            } else {
                console.warn('No node selected');
                alert('Please select a node first');
            }
        }
    } else {
        console.error('CosmicNodeVisualizer2D is not available');
    }
  });

  // Add to sidebar using helper function
  addButtonToSidebar(toggle2DCosmicButton);

  // Initialize the EnhancedCodeGraphManager
  if (window.EnhancedCodeGraphManager) {
    console.log('Setting up EnhancedCodeGraphManager initialization from app.js');
    EnhancedCodeGraphManager.initialize();
  }

  // Add a toggle button for the enhanced code graph manager
  const toggleEnhancedCodeGraphButton = document.createElement('button');
  toggleEnhancedCodeGraphButton.id = 'toggle-enhanced-code-graph';
  toggleEnhancedCodeGraphButton.className = 'feature-toggle';
  toggleEnhancedCodeGraphButton.textContent = 'Enhanced Code Graph';
  toggleEnhancedCodeGraphButton.title = 'Manage persistent code graphs with full CRUD operations';

  toggleEnhancedCodeGraphButton.addEventListener('click', function() {
    console.log('Enhanced Code Graph button clicked');
    
    if (window.EnhancedCodeGraphManager) {
      const isCurrentlyVisible = EnhancedCodeGraphManager.isVisible();
      console.log('Is currently visible:', isCurrentlyVisible);
      
      if (isCurrentlyVisible) {
        console.log('Hiding enhanced code graph manager');
        EnhancedCodeGraphManager.hide();
      } else {
        console.log('Showing enhanced code graph manager');
        EnhancedCodeGraphManager.show();
      }
    } else {
      console.error('EnhancedCodeGraphManager is not available');
      alert('Enhanced Code Graph Manager is not loaded. Please check the console for errors.');
    }
  });

  // Add to sidebar using helper function
  addButtonToSidebar(toggleEnhancedCodeGraphButton);

  // Initialize the BlogManager
  if (window.BlogManager) {
    console.log('Setting up BlogManager initialization from app.js');
    BlogManager.initialize();
  }

  // Just call fetchNodes by itself
  fetchNodes();

  // ================================================================
  // END OF APPLICATION CODE - DO NOT ADD FUNCTIONS BELOW THIS LINE
  // ================================================================

  // Helper function to preserve focus state across operations
  async function preserveFocusState(operation, shouldRestoreFocus = true) {
    // Store whether we're in focus mode before the operation
    const wasInFocusMode = window.BreadcrumbManager && window.BreadcrumbManager.isInFocusMode();
    // Store the currently focused node ID if in focus mode
    const focusedNodeId = wasInFocusMode && window.BreadcrumbManager ? 
      currentModalNodeId || lastFocusedNodeId : null;
    
    try {
      // Run the provided operation
      await operation();
      
      // Restore focus state if requested and we were in focus mode
      if (shouldRestoreFocus && wasInFocusMode && window.BreadcrumbManager && focusedNodeId) {
        window.BreadcrumbManager.focusOnNode(focusedNodeId);
      }
    } catch (error) {
      console.error('Operation failed:', error);
      throw error;
    }
  }

  // Initialize I18n before other components
  I18n.initialize();

  // Initialize the NodeExpansionManager
  if (window.NodeExpansionManager) {
    NodeExpansionManager.initialize();
  }

  // Make createNodeElement available globally for direct DOM manipulation
  window.createNodeElement = createNodeElement;

  // Make toggleNode available globally for direct DOM manipulation
  window.toggleNode = toggleNode;

  // Make fetchChildren available globally for the NodeGridVisualizer
  window.fetchChildren = fetchChildren;

  // Initialize the Font Manager
  if (window.FontManager) {
    FontManager.initialize();
  }

  // Initialize the CosmicNodeVisualizer2D
  if (window.CosmicNodeVisualizer2D) {
    CosmicNodeVisualizer2D.initialize();
  }

  // Initialize the TaskStatisticsManager
  if (window.TaskStatisticsManager) {
    console.log('Setting up TaskStatisticsManager initialization from app.js');
    TaskStatisticsManager.initialize();
  }

  // Add a toggle button for the metro map visualizer
  const toggleMetroMapButton = document.createElement('button');
  toggleMetroMapButton.id = 'toggle-metro-map';
  toggleMetroMapButton.className = 'feature-toggle';
  toggleMetroMapButton.textContent = 'Metro Map View';
  toggleMetroMapButton.title = 'View nodes as a metro/subway map';

  toggleMetroMapButton.addEventListener('click', function() {
    console.log('Metro Map button clicked');
    console.log('MetroMapVisualizer exists:', !!window.MetroMapVisualizer);
    
    if (window.MetroMapVisualizer) {
      const isVisible = MetroMapVisualizer.isVisible();
      console.log('Is currently visible:', isVisible);
      
      if (isVisible) {
        console.log('Hiding metro map');
        MetroMapVisualizer.hide();
      } else {
        // Get current node ID using similar logic to 2D cosmic view
        let nodeToShow = lastFocusedNodeId;
        console.log('Initial nodeToShow:', nodeToShow);
        
        if (!nodeToShow && window.BreadcrumbManager && BreadcrumbManager.getCurrentFocusedNodeId) {
          nodeToShow = BreadcrumbManager.getCurrentFocusedNodeId();
          console.log('Got nodeId from BreadcrumbManager:', nodeToShow);
        }
        
        // If still no node ID, get the first visible node
        if (!nodeToShow && nodes.length > 0) {
          nodeToShow = nodes[0].id;
          console.log('Falling back to first visible node:', nodeToShow);
        }
        
        console.log('Final nodeToShow:', nodeToShow);
        
        if (nodeToShow) {
          try {
            console.log('Calling MetroMapVisualizer.show()');
            MetroMapVisualizer.show(nodeToShow);
          } catch (error) {
            console.error('Error calling show():', error);
          }
        } else {
          console.warn('No node selected');
          alert('Please select a node first');
        }
      }
    } else {
      console.error('MetroMapVisualizer is not available');
    }
  });

  // Add to sidebar using helper function
  addButtonToSidebar(toggleMetroMapButton);

  // Add this function after the other helper functions
  function toggleAllOtherLanguageContent() {
    globalOtherLanguageVisible = !globalOtherLanguageVisible;
    
    // Update all existing other language containers
    const allContainers = document.querySelectorAll('.node-text-other-language-container');
    const allToggleButtons = document.querySelectorAll('.toggle-other-lang-button');
    
    allContainers.forEach(container => {
      container.style.display = globalOtherLanguageVisible ? 'block' : 'none';
    });
    
    allToggleButtons.forEach(button => {
      const langCode = button.innerHTML.includes('ZH') ? 'zh' : 'en';
      if (globalOtherLanguageVisible) {
        button.innerHTML = `🙈 ${langCode.toUpperCase()}`;
        button.style.backgroundColor = '#e8f0fe';
      } else {
        button.innerHTML = `👁️ ${langCode.toUpperCase()}`;
        button.style.backgroundColor = '#f0f0f0';
      }
    });
    
    // Update the global toggle button
    const globalToggleButton = document.getElementById('global-toggle-other-lang');
    if (globalToggleButton) {
      if (globalOtherLanguageVisible) {
        globalToggleButton.textContent = '🙈 Hide All Translations';
        globalToggleButton.classList.add('active');
      } else {
        globalToggleButton.textContent = '👁️ Show All Translations';
        globalToggleButton.classList.remove('active');
      }
    }
    
    // Save preference to localStorage
    localStorage.setItem('globalOtherLanguageVisible', globalOtherLanguageVisible.toString());
  }

  // Add this after the other sidebar buttons (around line 820 where other buttons are added)
    // Add global toggle for other language content
    const globalToggleOtherLangButton = document.createElement('button');
    globalToggleOtherLangButton.id = 'global-toggle-other-lang';
    globalToggleOtherLangButton.className = 'feature-toggle';
    globalToggleOtherLangButton.textContent = '👁️ Show All Translations';
    globalToggleOtherLangButton.title = 'Toggle visibility of all other language content';
    globalToggleOtherLangButton.addEventListener('click', toggleAllOtherLanguageContent);

    // Add to sidebar using helper function
    addButtonToSidebar(globalToggleOtherLangButton);

  // Add this near the initialization code to restore the saved preference
    // Restore global other language visibility preference
    const savedGlobalOtherLanguageVisible = localStorage.getItem('globalOtherLanguageVisible');
    if (savedGlobalOtherLanguageVisible === 'true') {
      globalOtherLanguageVisible = true;
      const globalToggleButton = document.getElementById('global-toggle-other-lang');
      if (globalToggleButton) {
        globalToggleButton.textContent = '🙈 Hide All Translations';
        globalToggleButton.classList.add('active');
      }
    }

  // Add this function after the other helper functions
  async function copyContentBetweenLanguages(nodeId, direction) {
    try {
      // Get the current node data
      const response = await fetch(`/api/nodes/${nodeId}`);
      const nodeData = await response.json();
      
      let sourceContent, targetField, successMessage;
      
      if (direction === 'en-to-zh') {
        sourceContent = nodeData.content || '';
        targetField = 'content_zh';
        successMessage = 'English content copied to Chinese';
      } else if (direction === 'zh-to-en') {
        sourceContent = nodeData.content_zh || '';
        targetField = 'content';
        successMessage = 'Chinese content copied to English';
      } else {
        console.error('Invalid direction:', direction);
        return false;
      }
      
      if (!sourceContent || sourceContent.trim() === '') {
        alert('Source content is empty, nothing to copy');
        return false;
      }
      
      console.log(`Copying content for node ${nodeId}:`);
      console.log(`- Direction: ${direction}`);
      console.log(`- Source content: "${sourceContent}"`);
      
      // Update the node with the copied content
      const updateData = {};
      updateData[targetField] = sourceContent;
      
      const updateResponse = await fetch(`/api/nodes/${nodeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      
      if (!updateResponse.ok) {
        throw new Error('Failed to update node');
      }
      
      console.log(`Successfully copied content for node ${nodeId}`);
      
      // CHANGED: Instead of full refresh, just update the local node data
      // Find and update the node in the local nodes array
      updateLocalNodeData(nodeId, updateData);
      
      // Update the DOM element directly if it exists
      const nodeElement = document.querySelector(`.node[data-id="${nodeId}"]`);
      if (nodeElement) {
        // Find the other language container and update it
        const otherLangContainer = nodeElement.querySelector('.node-text-other-language');
        if (otherLangContainer) {
          const newContent = sourceContent.replace(/\\n/g, '\n');
          otherLangContainer.textContent = newContent;
          console.log(`Updated DOM for node ${nodeId} with new content`);
        }
      }
      
      // Show success message
      const notification = document.createElement('div');
      notification.className = 'content-copy-notification';
      notification.textContent = successMessage;
      document.body.appendChild(notification);
      
      // Remove notification after 2 seconds
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 2000);
      
      return true;
    } catch (error) {
      console.error('Error copying content between languages:', error);
      alert('Failed to copy content. Please try again.');
      return false;
    }
  }

  // Make copyContentBetweenLanguages available globally for command palette and other modules
  window.copyContentBetweenLanguages = copyContentBetweenLanguages;

  // Make lastFocusedNodeId available globally for command palette and other modules
  window.lastFocusedNodeId = lastFocusedNodeId;

  // Update the global reference whenever lastFocusedNodeId changes
  function updateGlobalLastFocusedNodeId(nodeId) {
    lastFocusedNodeId = nodeId;
    window.lastFocusedNodeId = nodeId;
  }

  // Initialize the SettingsManager (add this after other manager initializations)
  if (window.SettingsManager) {
    console.log('Setting up SettingsManager initialization from app.js');
    SettingsManager.initialize();
  }

  

  // Initialize the NodeSizeHighlightManager (remove duplicate initialization)
  // The manager initializes itself, so we don't need to do it here
  // Just check if it exists
  if (window.NodeSizeHighlightManager) {
    console.log('NodeSizeHighlightManager is available');
  } else {
    console.error('NodeSizeHighlightManager not found on window object');
  }

  // Add a toggle button for the node size highlight feature
  const toggleSizeHighlightButton = document.createElement('button');
  toggleSizeHighlightButton.id = 'toggle-size-highlight';
  toggleSizeHighlightButton.className = 'feature-toggle';
  toggleSizeHighlightButton.textContent = 'Enable Size Highlights';
  toggleSizeHighlightButton.title = 'Highlight nodes with the largest size in their family group';

  toggleSizeHighlightButton.addEventListener('click', function() {
    console.log('Size Highlight button clicked');
    if (window.NodeSizeHighlightManager) {
      NodeSizeHighlightManager.toggle();
      
      // Update button text
      const isEnabled = NodeSizeHighlightManager.getEnabled();
      toggleSizeHighlightButton.textContent = isEnabled ? 'Disable Size Highlights' : 'Enable Size Highlights';
      
      // Show notification
      const notification = document.createElement('div');
      notification.className = 'size-highlight-notification';
      notification.textContent = isEnabled ? 
          'Size highlights enabled!' :
          'Size highlights disabled.';
      
      document.body.appendChild(notification);
      
      // Remove notification after 3 seconds
      setTimeout(() => {
          if (document.body.contains(notification)) {
              document.body.removeChild(notification);
          }
      }, 3000);
    } else {
      console.error('NodeSizeHighlightManager not available');
    }
  });

  console.log('About to add Size Highlight button to sidebar');
  addButtonToSidebar(toggleSizeHighlightButton);
  console.log('Size Highlight button added to sidebar');

  // Initialize PluginManager first
  if (window.PluginManager) {
    console.log('Initializing PluginManager...');
    PluginManager.initialize();
    
    // Set up plugin state change listener
    PluginManager.onPluginStateChange = function(pluginId, enabled) {
      if (window.PluginAwareInitializer) {
        PluginAwareInitializer.handlePluginStateChange(pluginId, enabled);
      }
    };
  }
  

});



