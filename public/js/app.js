document.addEventListener('DOMContentLoaded', () => {
  // Basic UI element references
  const outlinerContainer = document.getElementById('outliner-container');
  const addRootNodeButton = document.getElementById('add-root-node');
  const languageToggle = document.getElementById('language-toggle');

  // Variables and state
  let nodes = [];
  let lastFocusedNodeId = null;
  let isInitialLoading = true;
  let globalOtherLanguageVisible = false;

  // Language management
  function getVault() {
    return 'main'; // Default vault for minimal version
  }

  // Update language toggle button text
  function updateLanguageToggle() {
    const toggleButton = document.getElementById('language-toggle');
    if (toggleButton && I18n) {
      toggleButton.textContent = I18n.t('switchToLanguage');
    }
  }

  // Fetch top-level nodes
  async function fetchNodes(forceFresh = false) {
    try {
      const currentLanguage = I18n ? I18n.getCurrentLanguage() : 'en';
      const cacheBuster = forceFresh ? `&_=${Date.now()}` : '';
      const response = await fetch(`/api/nodes?lang=${currentLanguage}${cacheBuster}`);
      nodes = await response.json();
      await renderOutliner();

      // Set initial loading to false after first load
      isInitialLoading = false;

    } catch (error) {
      console.error('Error fetching nodes:', error);
    }
  }

  // Render the outliner
  async function renderOutliner() {
    outlinerContainer.innerHTML = '';

    if (nodes.length === 0) {
      outlinerContainer.innerHTML = '<div class="no-nodes">No nodes found. Click "Add Root Node" to get started.</div>';
      return;
    }

    // Render root nodes
    for (const node of nodes) {
      const nodeElement = await createNodeElement(node);
      outlinerContainer.appendChild(nodeElement);
    }

    // Setup drag and drop if available
    if (window.DragDropManager && window.PluginManager && PluginManager.isPluginEnabled('dragDropManager')) {
      DragDropManager.setupDragAndDrop();
    }
  }

  // Create node element
  async function createNodeElement(node) {
    const nodeDiv = document.createElement('div');
    nodeDiv.className = 'node';
    nodeDiv.dataset.id = node.id;

    const currentLanguage = I18n ? I18n.getCurrentLanguage() : 'en';
    const displayContent = currentLanguage === 'en' || !node.content_zh ? node.content : node.content_zh;
    const otherContent = currentLanguage === 'en' && node.content_zh ? node.content_zh :
                        (currentLanguage === 'zh' && node.content ? node.content : '');

    const nodeContent = document.createElement('div');
    nodeContent.className = 'node-content';

    // Expand/Collapse button
    const expandButton = document.createElement('button');
    expandButton.className = 'expand-button';
    if (node.is_expanded) {
      expandButton.innerHTML = '▼';
    } else {
      expandButton.innerHTML = '►';
    }
    expandButton.addEventListener('click', () => toggleNode(node.id));
    nodeContent.appendChild(expandButton);

    // Node text
    const nodeText = document.createElement('div');
    nodeText.className = 'node-text';
    nodeText.innerHTML = escapeHtml(displayContent) || 'Empty node';
    nodeText.contentEditable = 'true';
    nodeText.addEventListener('blur', (e) => updateNodeContent(node.id, e.target.textContent));
    nodeContent.appendChild(nodeText);

    // Link button
    const linkButton = document.createElement('button');
    linkButton.className = 'link-button';
    linkButton.innerHTML = '🔗';
    linkButton.title = 'Manage links';
    linkButton.addEventListener('click', () => {
      if (window.LinkManager) {
        LinkManager.openModal(node.id);
      } else {
        // Fallback: simple alert for minimal version
        alert('Link Manager not available in minimal version');
      }
    });
    nodeContent.appendChild(linkButton);

    // Add action buttons
    const nodeActions = document.createElement('div');
    nodeActions.className = 'node-actions';

    // Add Child button
    const addChildButton = document.createElement('button');
    addChildButton.className = 'add-child-button';
    addChildButton.innerHTML = '+';
    addChildButton.title = 'Add child node';
    addChildButton.addEventListener('click', () => {
      if (window.NodeOperationsManager) {
        NodeOperationsManager.addChildNode(node.id);
      }
    });
    nodeActions.appendChild(addChildButton);

    // Delete button
    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-button';
    deleteButton.innerHTML = '🗑️';
    deleteButton.title = 'Delete this node and its children';
    deleteButton.addEventListener('click', () => {
      if (window.NodeOperationsManager) {
        NodeOperationsManager.deleteNode(node.id);
      }
    });
    nodeActions.appendChild(deleteButton);

    nodeContent.appendChild(nodeActions);
    nodeDiv.appendChild(nodeContent);

    // Children container
    if (node.is_expanded) {
      const childrenDiv = document.createElement('div');
      childrenDiv.className = 'children';

      // Fetch and render children
      try {
        const childrenResponse = await fetch(`/api/nodes/${node.id}/children`);
        const children = await childrenResponse.json();

        for (const child of children) {
          const childElement = await createNodeElement(child);
          childrenDiv.appendChild(childElement);
        }
      } catch (error) {
        console.error('Error fetching children:', error);
      }

      nodeDiv.appendChild(childrenDiv);
    }

    return nodeDiv;
  }

  // Toggle node expansion
  async function toggleNode(nodeId) {
    try {
      await fetch(`/api/nodes/${nodeId}/toggle`, {
        method: 'POST'
      });

      // Refresh the node to get updated state
      fetchNodes(true);
    } catch (error) {
      console.error('Error toggling node:', error);
    }
  }

  // Update node content
  async function updateNodeContent(nodeId, content) {
    try {
      await fetch(`/api/nodes/${nodeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: content,
          content_zh: '' // Keep content_zh empty for minimal version
        })
      });
    } catch (error) {
      console.error('Error updating node:', error);
    }
  }

  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Add root node
  async function addRootNode() {
    if (window.NodeOperationsManager) {
      await NodeOperationsManager.addRootNode(nodes);
    }
  }

  // Handle language toggle
  function handleLanguageToggle() {
    if (I18n) {
      const currentLang = I18n.getCurrentLanguage();
      const newLang = currentLang === 'zh' ? 'en' : 'zh';
      I18n.setLanguage(newLang);

      // Update language for all managers
      if (window.SearchManager) SearchManager.updateLanguage(newLang);
      if (window.NodeOperationsManager) NodeOperationsManager.updateLanguage(newLang);
      if (window.LinkManager) LinkManager.updateLanguage(newLang);

      updateLanguageToggle();
      fetchNodes(); // Re-fetch nodes with new language
    }
  }

  // Handle search
  function handleSearch() {
    if (window.SearchManager) {
      SearchManager.openSearchModal();
    } else {
      alert('Search not available in minimal version');
    }
  }

  // Initialize the application
  function initializeApp() {
    console.log('Initializing minimal outliner application...');

    // Initialize I18n if available
    if (I18n) {
      I18n.initialize('en');
      updateLanguageToggle();
    }

    // Initialize SearchManager if available
    if (window.SearchManager) {
      SearchManager.initialize();
    }

    // Add event listeners
    if (addRootNodeButton) {
      addRootNodeButton.addEventListener('click', addRootNode);
    }

    if (languageToggle) {
      languageToggle.addEventListener('click', handleLanguageToggle);
    }

    // Add search functionality
    const searchButton = document.getElementById('search-nodes-button');
    if (searchButton) {
      searchButton.addEventListener('click', handleSearch);
    }

    // Add keyboard shortcut
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        handleSearch();
      }
    });

    // Load initial nodes
    fetchNodes();

    console.log('Minimal outliner application initialized');
  }

  // Startup the application
  initializeApp();

  // Export global functions
  window.fetchNodes = fetchNodes;
  window.createNodeElement = createNodeElement;
});