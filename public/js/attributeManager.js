/**
 * AttributeManager - Module for managing node attributes/metadata and querying nodes
 * Similar to Obsidian's Dataview plugin
 */
const AttributeManager = (function() {
  // Module state
  let currentLanguage = 'en';
  let attributeModal = null;
  let modalOverlay = null;
  let currentNodeId = null;
  let queryModal = null;
  let recentQueries = [];
  let isFullyInitialized = false;
  
  // Table view configuration state
  let tableViewConfig = {
    viewMode: 'original', // 'original' or 'table'
    visibleColumns: {
      node: true,
      // Dynamic attribute columns will be added here
      actions: true
    },
    columnWidths: {
      node: 200,
      // Dynamic attribute column widths will be added here
      actions: 120
    },
    // Column order - this is new!
    columnOrder: ['node'], // Will be populated with discovered attributes, then 'actions'
    // System columns that can be optionally shown
    systemColumns: {
      id: false,
      created_at: false,
      updated_at: false,
      sequence_id: false
    },
    systemColumnWidths: {
      id: 100,
      created_at: 120,
      updated_at: 120,
      sequence_id: 80
    }
  };
  
  // Store discovered attribute keys from current results
  let discoveredAttributes = [];
  
  // Common attribute keys for autocompletion
  const commonAttributes = [
    'type', 'source', 'author', 'rating', 'url', 'tags', 'category', 'status', 'priority', 'release_time', 'ranking', 'repeat', 'singer'
  ];
  
  // Initialize the module - only core functionality
  function initialize() {
    console.log('AttributeManager initialized (core only)');
    
    // Get the current language from I18n if available
    if (window.I18n) {
      currentLanguage = I18n.getCurrentLanguage();
    }
    
    // Load table view configuration
    loadTableViewConfig();
    
    // Only load recent queries, don't create modals yet
    loadRecentQueries();
    
    // Set up lazy button addition on hover
    setupLazyButtonAddition();
    
    // Set up hotkey support
    setupHotkeySupport();
    
    // Note that we're only partially initialized
    isFullyInitialized = false;
  }
  
  // Load table view configuration from localStorage
  function loadTableViewConfig() {
    const saved = localStorage.getItem('attributeTableViewConfig');
    if (saved) {
      try {
        const savedConfig = JSON.parse(saved);
        tableViewConfig = { ...tableViewConfig, ...savedConfig };
      } catch (e) {
        console.error('Error parsing table view config:', e);
      }
    }
  }
  
  // Save table view configuration to localStorage
  function saveTableViewConfig() {
    try {
      localStorage.setItem('attributeTableViewConfig', JSON.stringify(tableViewConfig));
    } catch (e) {
      console.error('Error saving table view config:', e);
    }
  }
  
  // Discover unique attributes from query results
  function discoverAttributesFromResults(results) {
    const attributeSet = new Set();
    
    results.forEach(node => {
      if (node.attributes && node.attributes.length > 0) {
        node.attributes.forEach(attr => {
          attributeSet.add(attr.key);
        });
      }
    });
    
    discoveredAttributes = Array.from(attributeSet).sort();
    
    // Initialize visibility and width settings for new attributes
    discoveredAttributes.forEach(attrKey => {
      if (!(attrKey in tableViewConfig.visibleColumns)) {
        tableViewConfig.visibleColumns[attrKey] = true; // Show new attributes by default
      }
      if (!(attrKey in tableViewConfig.columnWidths)) {
        tableViewConfig.columnWidths[attrKey] = 150; // Default width for attribute columns
      }
    });
    
    // Update column order to include new attributes
    updateColumnOrder();
    
    console.log('Discovered attributes:', discoveredAttributes);
  }
  
  // Update column order with discovered attributes
  function updateColumnOrder() {
    const currentOrder = tableViewConfig.columnOrder || [];
    const newOrder = ['node']; // Always start with node
    
    // Add existing attributes in their current order
    currentOrder.forEach(col => {
      if (discoveredAttributes.includes(col) && !newOrder.includes(col)) {
        newOrder.push(col);
      }
    });
    
    // Add any new attributes that weren't in the previous order
    discoveredAttributes.forEach(attr => {
      if (!newOrder.includes(attr)) {
        newOrder.push(attr);
      }
    });
    
    // Add actions at the end
    newOrder.push('actions');
    
    tableViewConfig.columnOrder = newOrder;
  }
  
  // Set up lazy button addition on hover
  function setupLazyButtonAddition() {
    // Add a global event listener for node hovering
    document.addEventListener('mouseover', event => {
      const nodeContent = event.target.closest('.node-content');
      if (nodeContent) {
        const node = nodeContent.closest('.node');
        if (node) {
          const nodeId = node.dataset.id;
          
          // Check if this node already has an attribute button
          const nodeActions = nodeContent.querySelector('.node-actions');
          if (nodeActions && !nodeActions.querySelector('.attribute-button')) {
            // Lazy-add the attribute button when hovering
            addAttributeButtonToNode(node, nodeId);
          }
        }
      }
    }, { passive: true });
  }
  
  // Set up hotkey support for attribute management
  function setupHotkeySupport() {
    document.addEventListener('keydown', event => {
      if (event.altKey && event.key.toLowerCase() === 'u') {
        event.preventDefault();
        
        // Find the currently focused or hovered node
        const focusedNode = document.querySelector('.node-text:focus');
        const hoveredNode = document.querySelector('.node:hover');
        
        if (focusedNode) {
          const node = focusedNode.closest('.node');
          if (node) {
            openModal(node.dataset.id);
          }
        } else if (hoveredNode) {
          openModal(hoveredNode.dataset.id);
        }
      }
    });
  }
  
  // Full initialization - create modals and UI elements
  function initializeFully() {
    try {
      if (isFullyInitialized) {
        return; // Already fully initialized
      }
    
    console.log('AttributeManager fully initializing...');
    
    // Verify document.body is available
    if (!document.body) {
      console.error('Document body not available during initialization');
      throw new Error('Document body not available');
    }
    
    // Create modals safely
    const modalsCreated = ensureModalsExist();
    if (!modalsCreated) {
      console.error('Failed to create modals during initialization');
      throw new Error('Modal creation failed');
    }
    
    isFullyInitialized = true;
    console.log('AttributeManager fully initialized');
  } catch (error) {
    console.error('Error during full initialization:', error);
    isFullyInitialized = false;
    throw error; // Re-throw to allow caller to handle
  }
}
  
  // Update language
  function updateLanguage(language) {
    currentLanguage = language;
    updateModalText();
    
    // Update any visible attribute buttons' tooltips
    document.querySelectorAll('.attribute-button').forEach(button => {
      button.title = I18n.t('nodeAttributes');
    });
  }
  
  // Create the attribute and query modals
  function createModals() {
    // Create modal overlay if it doesn't exist
    if (!modalOverlay) {
      modalOverlay = document.createElement('div');
      modalOverlay.className = 'modal-overlay';
      modalOverlay.style.display = 'none';
      document.body.appendChild(modalOverlay);
      
      // Close modal when clicking outside
      modalOverlay.addEventListener('click', function(e) {
        if (e.target === modalOverlay) {
          closeModal();
        }
      });
    }
    
    createAttributeModal();
    createQueryModal();
  }
  
  // Create attribute modal
  function createAttributeModal() {
    if (!attributeModal) {
      attributeModal = document.createElement('div');
      attributeModal.className = 'modal attribute-modal';
      
      // Modal header
      const modalHeader = document.createElement('div');
      modalHeader.className = 'modal-header';
      
      const modalTitle = document.createElement('h2');
      modalTitle.className = 'modal-title';
      modalTitle.id = 'attribute-modal-title';
      modalTitle.textContent = window.I18n ? I18n.t('nodeAttributes') : 'Node Attributes';
      
      const closeButton = document.createElement('button');
      closeButton.className = 'modal-close';
      closeButton.innerHTML = '&times;';
      closeButton.addEventListener('click', closeModal);
      
      modalHeader.appendChild(modalTitle);
      modalHeader.appendChild(closeButton);
      
      // Modal body
      const modalBody = document.createElement('div');
      modalBody.className = 'modal-body';
      
      // Attributes container
      const attributesContainer = document.createElement('div');
      attributesContainer.className = 'attributes-container';
      attributesContainer.id = 'attributes-container';
      
      // Add attribute form
      const addAttributeForm = document.createElement('div');
      addAttributeForm.className = 'add-attribute-form';
      
      const keyInput = document.createElement('input');
      keyInput.type = 'text';
      keyInput.className = 'attribute-key-input';
      keyInput.placeholder = 'Attribute Key';
      keyInput.id = 'new-attribute-key';
      keyInput.setAttribute('list', 'attribute-key-suggestions');
      
      // Add datalist for attribute key suggestions
      const keySuggestions = document.createElement('datalist');
      keySuggestions.id = 'attribute-key-suggestions';
      
      // Add common attribute keys as options
      commonAttributes.forEach(attr => {
        const option = document.createElement('option');
        option.value = attr;
        keySuggestions.appendChild(option);
      });
      
      addAttributeForm.appendChild(keySuggestions);
      
      const valueInput = document.createElement('input');
      valueInput.type = 'text';
      valueInput.className = 'attribute-value-input';
      valueInput.placeholder = 'Attribute Value';
      valueInput.id = 'new-attribute-value';
      
      const addButton = document.createElement('button');
      addButton.className = 'btn btn-primary';
      addButton.textContent = 'Add';
      addButton.addEventListener('click', addAttribute);
      
      addAttributeForm.appendChild(keyInput);
      addAttributeForm.appendChild(valueInput);
      addAttributeForm.appendChild(addButton);
      
      modalBody.appendChild(attributesContainer);
      modalBody.appendChild(addAttributeForm);
      
      // Add query button
      const queryButton = document.createElement('button');
      queryButton.className = 'btn btn-secondary query-button';
      queryButton.textContent = 'Query Nodes by Attributes';
      queryButton.addEventListener('click', openQueryModal);
      
      const modalFooter = document.createElement('div');
      modalFooter.className = 'modal-footer';
      modalFooter.appendChild(queryButton);
      
      // Assemble modal
      attributeModal.appendChild(modalHeader);
      attributeModal.appendChild(modalBody);
      attributeModal.appendChild(modalFooter);
      
      modalOverlay.appendChild(attributeModal);
    }
  }
  
  // Create query modal
  function createQueryModal() {
    try {
      // Verify document.body is available
      if (!document.body) {
        console.error('Document body not available, cannot create query modal');
        throw new Error('Document body not available');
      }
      
      // Verify modalOverlay is available
      if (!modalOverlay) {
        console.error('Modal overlay not available, cannot create query modal');
        throw new Error('Modal overlay not available');
      }

    if (!queryModal) {
      queryModal = document.createElement('div');
      queryModal.className = 'modal query-modal';
      queryModal.style.display = 'none';
      
      // Modal header
      const modalHeader = document.createElement('div');
      modalHeader.className = 'modal-header';
      
      const modalTitle = document.createElement('h2');
      modalTitle.className = 'modal-title';
      modalTitle.id = 'query-modal-title';
      modalTitle.textContent = window.I18n ? I18n.t('queryByAttributes') : 'Query Nodes by Attributes';
      
      const closeButton = document.createElement('button');
      closeButton.className = 'modal-close';
      closeButton.innerHTML = '&times;';
      closeButton.addEventListener('click', () => {
        queryModal.style.display = 'none';
        modalOverlay.style.display = 'none';
      });
      
      modalHeader.appendChild(modalTitle);
      modalHeader.appendChild(closeButton);
      
      // Modal body
      const modalBody = document.createElement('div');
      modalBody.className = 'modal-body';
      
      // Query builder section
      const queryBuilder = document.createElement('div');
      queryBuilder.className = 'query-builder';
      
      const queryInput = document.createElement('textarea');
      queryInput.className = 'query-input';
      queryInput.id = 'query-input';
      queryInput.placeholder = 'Enter query (e.g., type:"book" AND rating>4)';
      queryInput.rows = 3;
      
      const helpText = document.createElement('div');
      helpText.className = 'query-help';
      helpText.innerHTML = `
        <p>Query examples:</p>
        <ul>
          <li>type:"book" AND author:"Smith"</li>
          <li>rating>4</li>
          <li>status:"in-progress" OR status:"planned"</li>
        </ul>
      `;
      
      // Add sorting options section
      const sortingSection = document.createElement('div');
      sortingSection.className = 'sorting-section';
      
      const sortingTitle = document.createElement('h4');
      sortingTitle.textContent = 'Sort Results';
      
      const sortingControls = document.createElement('div');
      sortingControls.className = 'sorting-controls';
      
      // Sort by field input
      const sortByLabel = document.createElement('label');
      sortByLabel.textContent = 'Sort by:';
      
      const sortByInput = document.createElement('input');
      sortByInput.type = 'text';
      sortByInput.id = 'sort-by-field';
      sortByInput.className = 'sort-by-field';
      sortByInput.placeholder = 'Attribute key (e.g. ranking)';
      
      // Sort order select
      const sortOrderLabel = document.createElement('label');
      sortOrderLabel.textContent = 'Order:';
      
      const sortOrderSelect = document.createElement('select');
      sortOrderSelect.id = 'sort-order';
      sortOrderSelect.className = 'sort-order';
      
      const ascOption = document.createElement('option');
      ascOption.value = 'asc';
      ascOption.textContent = 'Ascending';
      
      const descOption = document.createElement('option');
      descOption.value = 'desc';
      descOption.textContent = 'Descending';
      
      sortOrderSelect.appendChild(ascOption);
      sortOrderSelect.appendChild(descOption);
      
      // Assemble sorting controls
      sortingControls.appendChild(sortByLabel);
      sortingControls.appendChild(sortByInput);
      sortingControls.appendChild(sortOrderLabel);
      sortingControls.appendChild(sortOrderSelect);
      
      sortingSection.appendChild(sortingTitle);
      sortingSection.appendChild(sortingControls);
      
      // Add sorting section before the execute button
      queryBuilder.appendChild(sortingSection);
      
      // Add table view controls section
      const tableViewSection = createTableViewControls();
      queryBuilder.appendChild(tableViewSection);
      
      // Recent queries section
      const recentQueriesSection = document.createElement('div');
      recentQueriesSection.className = 'recent-queries';
      
      const recentQueriesTitle = document.createElement('h3');
      recentQueriesTitle.textContent = 'Recent Queries';
      
      const recentQueriesList = document.createElement('ul');
      recentQueriesList.className = 'recent-queries-list';
      recentQueriesList.id = 'recent-queries-list';
      
      recentQueriesSection.appendChild(recentQueriesTitle);
      recentQueriesSection.appendChild(recentQueriesList);
      
      // Execute button
      const executeButton = document.createElement('button');
      executeButton.className = 'btn btn-primary';
      executeButton.textContent = 'Execute Query';
      executeButton.addEventListener('click', executeQuery);
      
      // Results section
      const resultsSection = document.createElement('div');
      resultsSection.className = 'query-results-section';
      
      const resultsTitle = document.createElement('h3');
      resultsTitle.textContent = 'Results';
      
      const resultsContainer = document.createElement('div');
      resultsContainer.className = 'query-results';
      resultsContainer.id = 'query-results';
      
      resultsSection.appendChild(resultsTitle);
      resultsSection.appendChild(resultsContainer);
      
      queryBuilder.appendChild(queryInput);
      queryBuilder.appendChild(executeButton);
      queryBuilder.appendChild(helpText);
      
      modalBody.appendChild(queryBuilder);
      modalBody.appendChild(recentQueriesSection);
      modalBody.appendChild(resultsSection);
      
      // Assemble modal
      queryModal.appendChild(modalHeader);
      queryModal.appendChild(modalBody);

      // Right before appending to modalOverlay, check it's still valid
      if (!modalOverlay || !document.body.contains(modalOverlay)) {
        console.error('Modal overlay not in document when trying to append query modal');
        
        // Try to recreate it as a last resort
        modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.style.display = 'none';
        document.body.appendChild(modalOverlay);
      }
      
      modalOverlay.appendChild(queryModal);
      console.log('Query modal successfully created and appended to overlay');
    }
      return queryModal;
    } catch (error) {
      console.error('Error creating query modal:', error);
      throw error; // Re-throw to allow caller to handle
    }
  }
  
  // Create table view controls
  function createTableViewControls() {
    const tableViewSection = document.createElement('div');
    tableViewSection.className = 'table-view-section';
    
    const tableViewTitle = document.createElement('h4');
    tableViewTitle.textContent = 'Table View Options';
    
    const tableViewControls = document.createElement('div');
    tableViewControls.className = 'table-view-controls';
    
    // View mode toggle
    const viewModeContainer = document.createElement('div');
    viewModeContainer.className = 'view-mode-container';
    
    const viewModeLabel = document.createElement('label');
    viewModeLabel.textContent = 'View Mode:';
    
    const viewModeSelect = document.createElement('select');
    viewModeSelect.id = 'view-mode-select';
    viewModeSelect.className = 'view-mode-select';
    
    const originalOption = document.createElement('option');
    originalOption.value = 'original';
    originalOption.textContent = 'Original View';
    
    const tableOption = document.createElement('option');
    tableOption.value = 'table';
    tableOption.textContent = 'Enhanced Table View';
    
    viewModeSelect.appendChild(originalOption);
    viewModeSelect.appendChild(tableOption);
    viewModeSelect.value = tableViewConfig.viewMode;
    
    viewModeSelect.addEventListener('change', (e) => {
      tableViewConfig.viewMode = e.target.value;
      saveTableViewConfig();
      updateTableViewControls();
    });
    
    viewModeContainer.appendChild(viewModeLabel);
    viewModeContainer.appendChild(viewModeSelect);
    
    // Column visibility controls container (will be populated dynamically)
    const columnVisibilityContainer = document.createElement('div');
    columnVisibilityContainer.className = 'column-visibility-container';
    columnVisibilityContainer.id = 'column-visibility-container';
    
    // Column width controls container (will be populated dynamically)
    const columnWidthContainer = document.createElement('div');
    columnWidthContainer.className = 'column-width-container';
    columnWidthContainer.id = 'column-width-container';
    
    tableViewControls.appendChild(viewModeContainer);
    tableViewControls.appendChild(columnVisibilityContainer);
    tableViewControls.appendChild(columnWidthContainer);
    
    tableViewSection.appendChild(tableViewTitle);
    tableViewSection.appendChild(tableViewControls);
    
    // Initially update visibility
    updateTableViewControls();
    
    return tableViewSection;
  }
  
  // Update table view controls with discovered attributes
  function updateTableViewControlsWithAttributes() {
    const columnVisibilityContainer = document.getElementById('column-visibility-container');
    const columnWidthContainer = document.getElementById('column-width-container');
    
    if (!columnVisibilityContainer || !columnWidthContainer) return;
    
    // Clear existing content
    columnVisibilityContainer.innerHTML = '';
    columnWidthContainer.innerHTML = '';
    
    // Column visibility controls
    const columnVisibilityTitle = document.createElement('h5');
    columnVisibilityTitle.textContent = 'Visible Columns (drag to reorder):';
    columnVisibilityContainer.appendChild(columnVisibilityTitle);
    
    const columnCheckboxes = document.createElement('div');
    columnCheckboxes.className = 'column-checkboxes';
    columnCheckboxes.id = 'column-checkboxes';
    
    // Create ordered list of all columns
    const allColumns = [];
    
    // Add columns in the configured order
    tableViewConfig.columnOrder.forEach(columnKey => {
      if (columnKey === 'node' || columnKey === 'actions') {
        allColumns.push({ key: columnKey, type: 'core' });
      } else if (discoveredAttributes.includes(columnKey)) {
        allColumns.push({ key: columnKey, type: 'attribute' });
      }
    });
    
    // Add system columns at the end
    Object.keys(tableViewConfig.systemColumns).forEach(columnKey => {
      allColumns.push({ key: columnKey, type: 'system' });
    });
    
    // Create draggable items for core and attribute columns
    allColumns.forEach((column, index) => {
      if (column.type !== 'system') {
        const checkboxContainer = createDraggableColumnItem(column, index);
        columnCheckboxes.appendChild(checkboxContainer);
      }
    });
    
    // Add separator for system columns
    const systemSeparator = document.createElement('div');
    systemSeparator.className = 'system-separator';
    systemSeparator.textContent = '— System Fields —';
    columnCheckboxes.appendChild(systemSeparator);
    
    // Add system columns (non-draggable)
    Object.keys(tableViewConfig.systemColumns).forEach(columnKey => {
      const checkboxContainer = document.createElement('div');
      checkboxContainer.className = 'checkbox-container';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `column-${columnKey}`;
      checkbox.checked = tableViewConfig.systemColumns[columnKey];
      checkbox.addEventListener('change', (e) => {
        tableViewConfig.systemColumns[columnKey] = e.target.checked;
        saveTableViewConfig();
      });
      
      const label = document.createElement('label');
      label.htmlFor = `column-${columnKey}`;
      label.textContent = formatColumnName(columnKey);
      label.className = 'system-column-label';
      
      checkboxContainer.appendChild(checkbox);
      checkboxContainer.appendChild(label);
      columnCheckboxes.appendChild(checkboxContainer);
    });
    
    columnVisibilityContainer.appendChild(columnCheckboxes);
    
    // Set up drag and drop
    setupColumnDragAndDrop();
    
    // Column width controls
    const columnWidthTitle = document.createElement('h5');
    columnWidthTitle.textContent = 'Column Widths:';
    columnWidthContainer.appendChild(columnWidthTitle);
    
    const columnWidthControls = document.createElement('div');
    columnWidthControls.className = 'column-width-controls';
    
    // Core columns width controls
    ['node', 'actions'].forEach(columnKey => {
      const widthContainer = document.createElement('div');
      widthContainer.className = 'width-container';
      
      const label = document.createElement('label');
      label.textContent = `${formatColumnName(columnKey)}:`;
      label.className = 'core-column-label';
      
      const widthInput = document.createElement('input');
      widthInput.type = 'number';
      widthInput.id = `width-${columnKey}`;
      widthInput.min = '50';
      widthInput.max = '500';
      widthInput.value = tableViewConfig.columnWidths[columnKey] || 150;
      widthInput.addEventListener('change', (e) => {
        tableViewConfig.columnWidths[columnKey] = parseInt(e.target.value);
        saveTableViewConfig();
      });
      
      const pxLabel = document.createElement('span');
      pxLabel.textContent = 'px';
      
      widthContainer.appendChild(label);
      widthContainer.appendChild(widthInput);
      widthContainer.appendChild(pxLabel);
      columnWidthControls.appendChild(widthContainer);
    });
    
    // Attribute columns width controls
    discoveredAttributes.forEach(attrKey => {
      const widthContainer = document.createElement('div');
      widthContainer.className = 'width-container';
      
      const label = document.createElement('label');
      label.textContent = `${attrKey}:`;
      label.className = 'attribute-column-label';
      
      const widthInput = document.createElement('input');
      widthInput.type = 'number';
      widthInput.id = `width-${attrKey}`;
      widthInput.min = '50';
      widthInput.max = '500';
      widthInput.value = tableViewConfig.columnWidths[attrKey] || 150;
      widthInput.addEventListener('change', (e) => {
        tableViewConfig.columnWidths[attrKey] = parseInt(e.target.value);
        saveTableViewConfig();
      });
      
      const pxLabel = document.createElement('span');
      pxLabel.textContent = 'px';
      
      widthContainer.appendChild(label);
      widthContainer.appendChild(widthInput);
      widthContainer.appendChild(pxLabel);
      columnWidthControls.appendChild(widthContainer);
    });
    
    // System columns width controls
    Object.keys(tableViewConfig.systemColumns).forEach(columnKey => {
      const widthContainer = document.createElement('div');
      widthContainer.className = 'width-container';
      
      const label = document.createElement('label');
      label.textContent = `${formatColumnName(columnKey)}:`;
      label.className = 'system-column-label';
      
      const widthInput = document.createElement('input');
      widthInput.type = 'number';
      widthInput.id = `width-${columnKey}`;
      widthInput.min = '50';
      widthInput.max = '500';
      widthInput.value = tableViewConfig.systemColumnWidths[columnKey] || 100;
      widthInput.addEventListener('change', (e) => {
        tableViewConfig.systemColumnWidths[columnKey] = parseInt(e.target.value);
        saveTableViewConfig();
      });
      
      const pxLabel = document.createElement('span');
      pxLabel.textContent = 'px';
      
      widthContainer.appendChild(label);
      widthContainer.appendChild(widthInput);
      widthContainer.appendChild(pxLabel);
      columnWidthControls.appendChild(widthContainer);
    });
    
    columnWidthContainer.appendChild(columnWidthControls);
  }
  
  // Create draggable column item
  function createDraggableColumnItem(column, index) {
    const checkboxContainer = document.createElement('div');
    checkboxContainer.className = 'checkbox-container';
    checkboxContainer.draggable = true;
    checkboxContainer.dataset.columnKey = column.key;
    checkboxContainer.dataset.columnType = column.type;
    
    // Drag handle
    const dragHandle = document.createElement('span');
    dragHandle.className = 'drag-handle';
    dragHandle.innerHTML = '⋮⋮';
    dragHandle.title = 'Drag to reorder';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `column-${column.key}`;
    checkbox.checked = tableViewConfig.visibleColumns[column.key] !== false;
    checkbox.addEventListener('change', (e) => {
      tableViewConfig.visibleColumns[column.key] = e.target.checked;
      saveTableViewConfig();
    });
    
    const label = document.createElement('label');
    label.htmlFor = `column-${column.key}`;
    label.textContent = column.type === 'attribute' ? column.key : formatColumnName(column.key);
    label.className = `${column.type}-column-label`;
    
    checkboxContainer.appendChild(dragHandle);
    checkboxContainer.appendChild(checkbox);
    checkboxContainer.appendChild(label);
    
    return checkboxContainer;
  }
  
  // Set up drag and drop for column reordering
  function setupColumnDragAndDrop() {
    const container = document.getElementById('column-checkboxes');
    if (!container) return;
    
    let draggedElement = null;
    
    container.addEventListener('dragstart', (e) => {
      if (e.target.classList.contains('checkbox-container') && e.target.dataset.columnKey) {
        draggedElement = e.target;
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.outerHTML);
      }
    });
    
    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      
      const afterElement = getDragAfterElement(container, e.clientY);
      const dragging = document.querySelector('.dragging');
      
      if (afterElement == null) {
        // Find the last non-separator element
        const items = [...container.querySelectorAll('.checkbox-container:not(.system-separator)')];
        const lastItem = items[items.length - 1];
        if (lastItem && lastItem !== dragging) {
          container.insertBefore(dragging, lastItem.nextSibling);
        }
      } else {
        container.insertBefore(dragging, afterElement);
      }
    });
    
    container.addEventListener('dragend', (e) => {
      if (e.target.classList.contains('checkbox-container')) {
        e.target.classList.remove('dragging');
        
        // Update the column order based on new DOM order
        updateColumnOrderFromDOM();
        saveTableViewConfig();
        
        draggedElement = null;
      }
    });
  }
  
  // Get the element after which the dragged element should be inserted
  function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.checkbox-container:not(.dragging):not(.system-separator)')];
    
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }
  
  // Update column order based on DOM order
  function updateColumnOrderFromDOM() {
    const container = document.getElementById('column-checkboxes');
    if (!container) return;
    
    const newOrder = [];
    const items = container.querySelectorAll('.checkbox-container[data-column-key]:not(.system-separator)');
    
    items.forEach(item => {
      const columnKey = item.dataset.columnKey;
      if (columnKey && columnKey !== 'system-separator') {
        newOrder.push(columnKey);
      }
    });
    
    tableViewConfig.columnOrder = newOrder;
    console.log('Updated column order:', newOrder);
  }
  
  // Update table view controls visibility
  function updateTableViewControls() {
    const columnVisibilityContainer = document.getElementById('column-visibility-container');
    const columnWidthContainer = document.getElementById('column-width-container');
    
    if (columnVisibilityContainer && columnWidthContainer) {
      const isTableView = tableViewConfig.viewMode === 'table';
      columnVisibilityContainer.style.display = isTableView ? 'block' : 'none';
      columnWidthContainer.style.display = isTableView ? 'block' : 'none';
    }
  }
  
  // Format column name for display
  function formatColumnName(columnKey) {
    const nameMap = {
      node: 'Node Content',
      id: 'Node ID',
      created_at: 'Created',
      updated_at: 'Updated',
      sequence_id: 'Sequence ID',
      actions: 'Actions'
    };
    return nameMap[columnKey] || columnKey;
  }
  
  // Update modal text based on language
  function updateModalText() {
    if (document.getElementById('attribute-modal-title')) {
      document.getElementById('attribute-modal-title').textContent = 
        window.I18n ? I18n.t('nodeAttributes') : 'Node Attributes';
    }
    
    if (document.getElementById('query-modal-title')) {
      document.getElementById('query-modal-title').textContent = 
        window.I18n ? I18n.t('queryByAttributes') : 'Query Nodes by Attributes';
    }
  }

  // Modify ensureModalsExist to be more robust with error handling
  function ensureModalsExist() {
    try {
      // Check if document.body is available
      if (!document.body) {
        console.error('Document body not available, cannot create modals');
        return false;
      }
      
      // Check if modalOverlay is in the document
      if (!modalOverlay || !document.body.contains(modalOverlay)) {
        console.log('Modal overlay not found in DOM, creating new one');
        
        // Save reference to existing modalOverlay if any
        const previousOverlay = modalOverlay;
        
        // Create new overlay
        modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.style.display = 'none';
        document.body.appendChild(modalOverlay);
        
        // Close modal when clicking outside
        modalOverlay.addEventListener('click', function(e) {
          if (e.target === modalOverlay) {
            closeModal();
          }
        });
        
        // If we had an existing overlay with child nodes, move them to the new one
        if (previousOverlay && previousOverlay.hasChildNodes()) {
          console.log('Moving modal elements from previous overlay');
          while (previousOverlay.firstChild) {
            modalOverlay.appendChild(previousOverlay.firstChild);
          }
        }
      }
      
      // Recreate attribute modal if needed
      if (!attributeModal || !modalOverlay.contains(attributeModal)) {
        console.log('Attribute modal not found in DOM, creating new one');
        try {
          createAttributeModal();
        } catch (error) {
          console.error('Failed to create attribute modal:', error);
          return false;
        }
      }
      
      // Recreate query modal if needed
      if (!queryModal || !modalOverlay.contains(queryModal)) {
        console.log('Query modal not found in DOM, creating new one');
        try {
          createQueryModal();
        } catch (error) {
          console.error('Failed to create query modal:', error);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error in ensureModalsExist:', error);
      return false;
    }
  }
  
  // Load attributes for a node
  async function loadAttributes(nodeId) {
    try {
      const response = await fetch(`/api/nodes/${nodeId}/attributes`);
      if (!response.ok) throw new Error('Failed to fetch attributes');
      
      const attributes = await response.json();
      return attributes;
    } catch (error) {
      console.error('Error loading attributes:', error);
      return [];
    }
  }
  
  // Render attributes in the modal
  function renderAttributes(attributes) {
    const container = document.getElementById('attributes-container');
    container.innerHTML = '';
    
    if (attributes.length === 0) {
      const noAttributes = document.createElement('div');
      noAttributes.className = 'no-attributes';
      noAttributes.textContent = window.I18n ? I18n.t('noAttributes') : 'No attributes defined for this node.';
      container.appendChild(noAttributes);
      return;
    }
    
    const table = document.createElement('table');
    table.className = 'attributes-table';
    
    // Table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    const keyHeader = document.createElement('th');
    keyHeader.textContent = window.I18n ? I18n.t('attributeKey') : 'Key';
    
    const valueHeader = document.createElement('th');
    valueHeader.textContent = window.I18n ? I18n.t('attributeValue') : 'Value';
    
    const actionsHeader = document.createElement('th');
    actionsHeader.textContent = window.I18n ? I18n.t('actions') : 'Actions';
    
    headerRow.appendChild(keyHeader);
    headerRow.appendChild(valueHeader);
    headerRow.appendChild(actionsHeader);
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Table body
    const tbody = document.createElement('tbody');
    
    attributes.forEach(attr => {
      const row = document.createElement('tr');
      row.dataset.id = attr.id;
      
      const keyCell = document.createElement('td');
      keyCell.className = 'attribute-key';
      keyCell.textContent = attr.key;
      
      const valueCell = document.createElement('td');
      valueCell.className = 'attribute-value';
      
      // Create editable value field
      const valueField = document.createElement('input');
      valueField.type = 'text';
      valueField.className = 'attribute-value-edit';
      valueField.value = attr.value;
      valueField.addEventListener('change', () => updateAttribute(attr.id, valueField.value));
      
      valueCell.appendChild(valueField);
      
      const actionsCell = document.createElement('td');
      actionsCell.className = 'attribute-actions';
      
      const deleteButton = document.createElement('button');
      deleteButton.className = 'btn-danger-small';
      deleteButton.innerHTML = '×';
      deleteButton.title = 'Delete attribute';
      deleteButton.addEventListener('click', () => deleteAttribute(attr.id));
      
      actionsCell.appendChild(deleteButton);
      
      row.appendChild(keyCell);
      row.appendChild(valueCell);
      row.appendChild(actionsCell);
      
      tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    container.appendChild(table);
  }
  
  // Open the attribute modal for a specific node
  // Modify openModal to handle initialization errors
  async function openModal(nodeId) {
    try {
      console.log('Opening attribute modal for node:', nodeId);
      // Ensure we're fully initialized before opening modal
      if (!isFullyInitialized) {
        try {
          initializeFully();
        } catch (initError) {
          console.error('Failed to initialize AttributeManager:', initError);
          alert('Error initializing modal system. Please try again.');
          return;
        }
      }
      
      // Verify key elements exist
      if (!document.body) {
        console.error('Document body not available, cannot open modal');
        return;
      }
      
      // Try to ensure modals exist, with error handling
      let modalsExist = false;
      try {
        modalsExist = ensureModalsExist();
      } catch (modalError) {
        console.error('Error ensuring modals exist:', modalError);
      }
      
      if (!modalsExist) {
        console.error('Failed to create required modals');
        alert('Error initializing attribute modals. Please refresh and try again.');
        return;
      }
      
      currentNodeId = nodeId;

      // Additional verification before proceeding
      if (!attributeModal || !modalOverlay) {
        console.error('Required modal elements not available:', {
          attributeModal: !!attributeModal,
          modalOverlay: !!modalOverlay
        });
        alert('Error: Modal elements are not available. Please refresh and try again.');
        return;
      }

      // Ensure the attribute modal is in the overlay
      if (!modalOverlay.contains(attributeModal)) {
        modalOverlay.appendChild(attributeModal);
      }
      
      // Check if the modal title element exists, recreate if not
      let modalTitle = document.getElementById('attribute-modal-title');
      if (!modalTitle) {
        console.log('Modal title element not found, recreating modal structure');
        
        // Clear the modal and recreate it
        attributeModal.innerHTML = '';
        
        // Modal header
        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        
        modalTitle = document.createElement('h2');
        modalTitle.className = 'modal-title';
        modalTitle.id = 'attribute-modal-title';
        
        const closeButton = document.createElement('button');
        closeButton.className = 'modal-close';
        closeButton.innerHTML = '&times;';
        closeButton.addEventListener('click', closeModal);
        
        modalHeader.appendChild(modalTitle);
        modalHeader.appendChild(closeButton);
        
        // Modal body
        const modalBody = document.createElement('div');
        modalBody.className = 'modal-body';
        
        // Attributes container
        const attributesContainer = document.createElement('div');
        attributesContainer.className = 'attributes-container';
        attributesContainer.id = 'attributes-container';
        
        // Add attribute form
        const addAttributeForm = document.createElement('div');
        addAttributeForm.className = 'add-attribute-form';
        
        const keyInput = document.createElement('input');
        keyInput.type = 'text';
        keyInput.className = 'attribute-key-input';
        keyInput.placeholder = 'Attribute Key';
        keyInput.id = 'new-attribute-key';
        keyInput.setAttribute('list', 'attribute-key-suggestions');
        
        // Add datalist for attribute key suggestions
        const keySuggestions = document.createElement('datalist');
        keySuggestions.id = 'attribute-key-suggestions';
        
        // Add common attribute keys as options
        commonAttributes.forEach(attr => {
          const option = document.createElement('option');
          option.value = attr;
          keySuggestions.appendChild(option);
        });
        
        addAttributeForm.appendChild(keySuggestions);
        
        const valueInput = document.createElement('input');
        valueInput.type = 'text';
        valueInput.className = 'attribute-value-input';
        valueInput.placeholder = 'Attribute Value';
        valueInput.id = 'new-attribute-value';
        
        const addButton = document.createElement('button');
        addButton.className = 'btn btn-primary';
        addButton.textContent = 'Add';
        addButton.addEventListener('click', addAttribute);
        
        addAttributeForm.appendChild(keyInput);
        addAttributeForm.appendChild(valueInput);
        addAttributeForm.appendChild(addButton);
        
        modalBody.appendChild(attributesContainer);
        modalBody.appendChild(addAttributeForm);
        
        // Add query button
        const queryButton = document.createElement('button');
        queryButton.className = 'btn btn-secondary query-button';
        queryButton.textContent = 'Query Nodes by Attributes';
        queryButton.addEventListener('click', openQueryModal);
        
        const modalFooter = document.createElement('div');
        modalFooter.className = 'modal-footer';
        modalFooter.appendChild(queryButton);
        
        // Assemble modal
        attributeModal.appendChild(modalHeader);
        attributeModal.appendChild(modalBody);
        attributeModal.appendChild(modalFooter);
      }
      
      // Fetch node data
      const [nodeResponse, attributesResponse] = await Promise.all([
        fetch(`/api/nodes/${nodeId}`),
        fetch(`/api/nodes/${nodeId}/attributes`)
      ]);
      
      if (!nodeResponse.ok) {
        throw new Error('Failed to fetch node data');
      }
      
      const node = await nodeResponse.json();
      const attributes = await attributesResponse.json();
      
      // Get a fresh reference to the modal title in case it was recreated
      modalTitle = document.getElementById('attribute-modal-title');
      if (modalTitle) {
        const content = currentLanguage === 'en' ? node.content : (node.content_zh || node.content);
        modalTitle.textContent = `${window.I18n ? I18n.t('nodeAttributes') : 'Node Attributes'}: ${content}`;
      } else {
        console.error('Modal title element still not available after recreation attempt');
      }
      
      // Get a fresh reference to the attributes container
      const container = document.getElementById('attributes-container');
      if (container) {
        renderAttributes(attributes);
      } else {
        console.error('Attributes container not available');
      }
      
      // Reset the add form
      const keyInput = document.getElementById('new-attribute-key');
      const valueInput = document.getElementById('new-attribute-value');
      if (keyInput) keyInput.value = '';
      if (valueInput) valueInput.value = '';
      
      // Show the attribute modal, hide the query modal
      attributeModal.style.display = 'block';
      if (queryModal) queryModal.style.display = 'none';
      modalOverlay.style.display = 'flex';
    } catch (error) {
      console.error('Error opening attribute modal:', error);
      alert('There was an error opening the attributes modal. Please try again.');
    }
  }
  
  // Close the modal
  function closeModal() {
    modalOverlay.style.display = 'none';
    attributeModal.style.display = 'none';
    if (queryModal) queryModal.style.display = 'none';
    currentNodeId = null;
  }
  
  // Add a new attribute
  async function addAttribute() {
    if (!currentNodeId) return;
    
    const keyInput = document.getElementById('new-attribute-key');
    const valueInput = document.getElementById('new-attribute-value');
    
    const key = keyInput.value.trim();
    const value = valueInput.value.trim();
    
    if (!key) {
      alert('Attribute key is required.');
      return;
    }
    
    try {
      const response = await fetch('/api/node-attributes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          node_id: currentNodeId,
          key,
          value
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add attribute');
      }
      
      // Clear the inputs
      keyInput.value = '';
      valueInput.value = '';
      
      // Reload attributes
      const attributes = await loadAttributes(currentNodeId);
      renderAttributes(attributes);
    } catch (error) {
      console.error('Error adding attribute:', error);
      alert(`Error adding attribute: ${error.message}`);
    }
  }
  
  // Update an attribute value
  async function updateAttribute(attributeId, newValue) {
    try {
      const response = await fetch(`/api/node-attributes/${attributeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          value: newValue
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update attribute');
      }
      
      console.log('Attribute updated successfully');
    } catch (error) {
      console.error('Error updating attribute:', error);
      alert(`Error updating attribute: ${error.message}`);
    }
  }
  
  // Delete an attribute
  async function deleteAttribute(attributeId) {
    if (!confirm('Are you sure you want to delete this attribute?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/node-attributes/${attributeId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete attribute');
      }
      
      // Remove the row from the table
      const row = document.querySelector(`.attributes-table tr[data-id="${attributeId}"]`);
      if (row) row.remove();
      
      // Check if there are any attributes left
      const tbody = document.querySelector('.attributes-table tbody');
      if (tbody && tbody.children.length === 0) {
        // No attributes left, show the "no attributes" message
        const container = document.getElementById('attributes-container');
        container.innerHTML = '';
        
        const noAttributes = document.createElement('div');
        noAttributes.className = 'no-attributes';
        noAttributes.textContent = window.I18n ? I18n.t('noAttributes') : 'No attributes defined for this node.';
        container.appendChild(noAttributes);
      }
    } catch (error) {
      console.error('Error deleting attribute:', error);
      alert(`Error deleting attribute: ${error.message}`);
    }
  }
  
  // Open the query modal - trigger full initialization
  function openQueryModal() {
    // Ensure full initialization
    if (!isFullyInitialized) {
      initializeFully();
    }
    
    if (queryModal) {
      // Refresh recent queries
      renderRecentQueries();
      
      // Hide attribute modal, show query modal
      attributeModal.style.display = 'none';
      queryModal.style.display = 'block';
    }
  }
  
  // Load recent queries from localStorage
  function loadRecentQueries() {
    const saved = localStorage.getItem('recentAttributeQueries');
    if (saved) {
      try {
        recentQueries = JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing recent queries:', e);
        recentQueries = [];
      }
    }
  }
  
  // Save recent queries to localStorage
  function saveRecentQueries() {
    try {
      localStorage.setItem('recentAttributeQueries', JSON.stringify(recentQueries));
    } catch (e) {
      console.error('Error saving recent queries:', e);
    }
  }
  
  // Render recent queries in the UI
  function renderRecentQueries() {
    const container = document.getElementById('recent-queries-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (recentQueries.length === 0) {
      const noQueries = document.createElement('li');
      noQueries.className = 'no-queries';
      noQueries.textContent = 'No recent queries';
      container.appendChild(noQueries);
      return;
    }
    
    recentQueries.forEach((query, index) => {
      const item = document.createElement('li');
      item.className = 'recent-query-item';
      
      const queryText = document.createElement('span');
      queryText.className = 'recent-query-text';
      queryText.textContent = query;
      queryText.title = 'Click to use this query';
      queryText.addEventListener('click', () => {
        document.getElementById('query-input').value = query;
      });
      
      const deleteButton = document.createElement('button');
      deleteButton.className = 'recent-query-delete';
      deleteButton.innerHTML = '×';
      deleteButton.title = 'Delete this query';
      deleteButton.addEventListener('click', (e) => {
        e.stopPropagation();
        removeRecentQuery(index);
      });
      
      item.appendChild(queryText);
      item.appendChild(deleteButton);
      container.appendChild(item);
    });
  }
  
  // Add a query to recent queries
  function addRecentQuery(query) {
    // Remove if already exists
    const existingIndex = recentQueries.indexOf(query);
    if (existingIndex !== -1) {
      recentQueries.splice(existingIndex, 1);
    }
    
    // Add to beginning
    recentQueries.unshift(query);
    
    // Limit to 10 recent queries
    if (recentQueries.length > 10) {
      recentQueries.pop();
    }
    
    saveRecentQueries();
    renderRecentQueries();
  }
  
  // Remove a query from recent queries
  function removeRecentQuery(index) {
    recentQueries.splice(index, 1);
    saveRecentQueries();
    renderRecentQueries();
  }
  
  // Execute a query
  async function executeQuery() {
    const queryInput = document.getElementById('query-input');
    const query = queryInput.value.trim();
    
    if (!query) {
      alert('Please enter a query.');
      return;
    }
    
    // Get the pagination parameters (default to page 1)
    const currentPage = parseInt(document.getElementById('current-page')?.value || 1);
    
    // Check that sort fields exist
    const sortByField = document.getElementById('sort-by-field');
    const sortOrder = document.getElementById('sort-order');
    
    // Get sorting parameters
    const sortByValue = sortByField ? sortByField.value.trim() : '';
    const sortOrderValue = sortOrder ? sortOrder.value : 'asc';
    
    console.log("Sending query:", {
      query: query,
      sortBy: sortByValue,
      sortOrder: sortOrderValue,
      page: currentPage,
      pageSize: 30 // Default page size
    });
    
    try {
      // Add to recent queries
      addRecentQuery(query);

      // Show loading indicator
      const resultsContainer = document.getElementById('query-results');
      resultsContainer.innerHTML = '<div class="loading-results">Loading results...</div>';
      
      const response = await fetch('/api/nodes/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          query: query,
          sortBy: sortByValue,
          sortOrder: sortOrderValue,
          page: currentPage,
          pageSize: 30
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Query execution failed');
      }
      
      const data = await response.json();
      console.log('Query results:', data);
      renderQueryResults(data.results, data.pagination, query, sortByValue, sortOrderValue);
    } catch (error) {
      console.error('Error executing query:', error);
      
      // Show error in results
      const resultsContainer = document.getElementById('query-results');
      resultsContainer.innerHTML = `
        <div class="query-error">
          <h4>Error</h4>
          <p>${error.message}</p>
        </div>
      `;
    }
  }
  
  // Render query results with pagination - enhanced with table view options
  function renderQueryResults(results, pagination, query, sortBy, sortOrder) {
    const resultsContainer = document.getElementById('query-results');
    resultsContainer.innerHTML = '';
    
    // Display pagination info at the top
    const paginationInfo = document.createElement('div');
    paginationInfo.className = 'pagination-info';
    
    if (pagination.totalResults === 0) {
      // No results case
      const noResults = document.createElement('div');
      noResults.className = 'no-query-results';
      noResults.textContent = 'No nodes match this query.';
      resultsContainer.appendChild(noResults);
      return;
    }
    
    paginationInfo.textContent = `Showing ${(pagination.page - 1) * pagination.pageSize + 1}-${Math.min(pagination.page * pagination.pageSize, pagination.totalResults)} of ${pagination.totalResults} results`;
    resultsContainer.appendChild(paginationInfo);
    
    // Discover attributes from results and update controls
    discoverAttributesFromResults(results);
    updateTableViewControlsWithAttributes();
    
    // Render based on view mode
    if (tableViewConfig.viewMode === 'table') {
      renderEnhancedTableView(results, resultsContainer);
    } else {
      renderOriginalTableView(results, resultsContainer);
    }
    
    // Add pagination controls at the bottom
    const paginationControls = document.createElement('div');
    paginationControls.className = 'pagination-controls';
    
    // Previous page button
    const prevButton = document.createElement('button');
    prevButton.className = 'btn-small pagination-prev';
    prevButton.textContent = '← Previous';
    prevButton.disabled = !pagination.hasPrevPage;
    prevButton.addEventListener('click', () => {
      changePage(pagination.page - 1, query, sortBy, sortOrder);
    });
    
    // Page number display and input
    const pageInfo = document.createElement('div');
    pageInfo.className = 'pagination-page-info';
    
    // Create text nodes instead of using innerHTML
    const pageTextBefore = document.createTextNode('Page ');
    const pageTextAfter = document.createTextNode(` of ${pagination.totalPages}`);

    const pageInput = document.createElement('input');
    pageInput.type = 'number';
    pageInput.min = 1;
    pageInput.max = pagination.totalPages;
    pageInput.value = pagination.page;
    pageInput.id = 'current-page';
    pageInput.className = 'pagination-page-input';
    pageInput.addEventListener('change', (e) => {
      const newPage = parseInt(e.target.value);
      if (newPage >= 1 && newPage <= pagination.totalPages) {
        changePage(newPage, query, sortBy, sortOrder);
      } else {
        e.target.value = pagination.page; // Reset to current page if invalid
      }
    });

    // Append elements in order
    pageInfo.appendChild(pageTextBefore);
    pageInfo.appendChild(pageInput);
    pageInfo.appendChild(pageTextAfter);
    
    // Next page button
    const nextButton = document.createElement('button');
    nextButton.className = 'btn-small pagination-next';
    nextButton.textContent = 'Next →';
    nextButton.disabled = !pagination.hasNextPage;
    nextButton.addEventListener('click', () => {
      changePage(pagination.page + 1, query, sortBy, sortOrder);
    });
    
    paginationControls.appendChild(prevButton);
    paginationControls.appendChild(pageInfo);
    paginationControls.appendChild(nextButton);
    
    resultsContainer.appendChild(paginationControls);
  }
  
  // Render original table view (preserve existing functionality)
  function renderOriginalTableView(results, container) {
    // Create the results table
    const table = document.createElement('table');
    table.className = 'query-results-table';
    
    // Table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    const contentHeader = document.createElement('th');
    contentHeader.textContent = 'Node';
    
    const attributesHeader = document.createElement('th');
    attributesHeader.textContent = 'Matching Attributes';
    
    const actionsHeader = document.createElement('th');
    actionsHeader.textContent = 'Actions';
    
    headerRow.appendChild(contentHeader);
    headerRow.appendChild(attributesHeader);
    headerRow.appendChild(actionsHeader);
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Table body
    const tbody = document.createElement('tbody');
    
    results.forEach(node => {
      const row = document.createElement('tr');
      row.dataset.id = node.id;
      
      const contentCell = document.createElement('td');
      contentCell.className = 'result-node-content';
      contentCell.textContent = currentLanguage === 'en' ? node.content : (node.content_zh || node.content);
      
      const attributesCell = document.createElement('td');
      attributesCell.className = 'result-node-attributes';
      
      if (node.attributes && node.attributes.length > 0) {
        const attrList = document.createElement('ul');
        attrList.className = 'attribute-list';
        
        node.attributes.forEach(attr => {
          const attrItem = document.createElement('li');
          attrItem.innerHTML = `<strong>${attr.key}:</strong> ${attr.value}`;
          attrList.appendChild(attrItem);
        });
        
        attributesCell.appendChild(attrList);
      } else {
        attributesCell.textContent = 'No attributes';
      }
      
      const actionsCell = document.createElement('td');
      actionsCell.className = 'result-node-actions';
      
      const viewButton = document.createElement('button');
      viewButton.className = 'btn-small';
      viewButton.textContent = 'View';
      viewButton.addEventListener('click', () => {
        closeModal();
        // If BreadcrumbManager exists, use it to focus on the node
        if (window.BreadcrumbManager) {
          BreadcrumbManager.focusOnNode(node.id);
        } else {
          // Otherwise, add some way to navigate to the node
          alert(`Node ID: ${node.id}\nImplement navigation to this node.`);
        }
      });
      
      const attrButton = document.createElement('button');
      attrButton.className = 'btn-small';
      attrButton.textContent = 'Edit';
      attrButton.addEventListener('click', () => {
        openModal(node.id);
      });
      
      actionsCell.appendChild(viewButton);
      actionsCell.appendChild(attrButton);
      
      row.appendChild(contentCell);
      row.appendChild(attributesCell);
      row.appendChild(actionsCell);
      
      tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    container.appendChild(table);
  }
  
  // Render enhanced table view with dynamic attribute columns
  function renderEnhancedTableView(results, container) {
    // Create the enhanced results table
    const table = document.createElement('table');
    table.className = 'query-results-table enhanced-table';
    
    // Table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    // Use the configured column order
    const columnsToShow = [];
    
    // Add columns in the configured order
    tableViewConfig.columnOrder.forEach(columnKey => {
      if (columnKey === 'node' || columnKey === 'actions') {
        if (tableViewConfig.visibleColumns[columnKey] !== false) {
          columnsToShow.push({ key: columnKey, type: 'core' });
        }
      } else if (discoveredAttributes.includes(columnKey)) {
        if (tableViewConfig.visibleColumns[columnKey] !== false) {
          columnsToShow.push({ key: columnKey, type: 'attribute' });
        }
      }
    });
    
    // Add system columns if enabled
    Object.keys(tableViewConfig.systemColumns).forEach(sysKey => {
      if (tableViewConfig.systemColumns[sysKey]) {
        columnsToShow.push({ key: sysKey, type: 'system' });
      }
    });
    
    // Create headers
    columnsToShow.forEach(column => {
      const header = document.createElement('th');
      header.textContent = column.type === 'attribute' ? column.key : formatColumnName(column.key);
      
      // Set width based on column type
      let width;
      if (column.type === 'attribute') {
        width = tableViewConfig.columnWidths[column.key] || 150;
      } else if (column.type === 'system') {
        width = tableViewConfig.systemColumnWidths[column.key] || 100;
      } else {
        width = tableViewConfig.columnWidths[column.key] || 150;
      }
      
      header.style.width = `${width}px`;
      header.className = `column-${column.key} column-type-${column.type}`;
      
      // Add resize handle
      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'column-resize-handle';
      resizeHandle.addEventListener('mousedown', (e) => {
        startColumnResize(e, column.key, header, column.type);
      });
      header.appendChild(resizeHandle);
      
      headerRow.appendChild(header);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Table body
    const tbody = document.createElement('tbody');
    
    results.forEach(node => {
      const row = document.createElement('tr');
      row.dataset.id = node.id;
      
      // Create a map of node attributes for quick lookup
      const nodeAttrMap = {};
      if (node.attributes) {
        node.attributes.forEach(attr => {
          nodeAttrMap[attr.key] = attr.value;
        });
      }
      
      // Add cells for each visible column
      columnsToShow.forEach(column => {
        const cell = document.createElement('td');
        cell.className = `column-${column.key} column-type-${column.type}`;
        
        // Set width
        let width;
        if (column.type === 'attribute') {
          width = tableViewConfig.columnWidths[column.key] || 150;
        } else if (column.type === 'system') {
          width = tableViewConfig.systemColumnWidths[column.key] || 100;
        } else {
          width = tableViewConfig.columnWidths[column.key] || 150;
        }
        cell.style.width = `${width}px`;
        
        // Populate cell based on column type
        if (column.type === 'attribute') {
          // This is an attribute column - show the attribute value
          const value = nodeAttrMap[column.key];
          if (value !== undefined) {
            cell.textContent = value;
            cell.title = `${column.key}: ${value}`;
          } else {
            cell.textContent = '—';
            cell.className += ' empty-attribute';
          }
        } else {
          // Handle core and system columns
          switch (column.key) {
            case 'node':
              cell.className += ' result-node-content';
              cell.textContent = currentLanguage === 'en' ? node.content : (node.content_zh || node.content);
              break;
              
            case 'id':
              cell.textContent = node.id;
              cell.style.fontFamily = 'monospace';
              cell.style.fontSize = '11px';
              break;
              
            case 'created_at':
              cell.textContent = node.created_at ? new Date(node.created_at).toLocaleDateString() : 'N/A';
              break;
              
            case 'updated_at':
              cell.textContent = node.updated_at ? new Date(node.updated_at).toLocaleDateString() : 'N/A';
              break;
              
            case 'sequence_id':
              cell.textContent = node.sequence_id || 'N/A';
              break;
              
            case 'actions':
              cell.className += ' result-node-actions';
              
              const viewButton = document.createElement('button');
              viewButton.className = 'btn-small';
              viewButton.textContent = 'View';
              viewButton.addEventListener('click', () => {
                closeModal();
                if (window.BreadcrumbManager) {
                  BreadcrumbManager.focusOnNode(node.id);
                } else {
                  alert(`Node ID: ${node.id}\nImplement navigation to this node.`);
                }
              });
              
              const attrButton = document.createElement('button');
              attrButton.className = 'btn-small';
              attrButton.textContent = 'Edit';
              attrButton.addEventListener('click', () => {
                openModal(node.id);
              });
              
              cell.appendChild(viewButton);
              cell.appendChild(attrButton);
              break;
          }
        }
        
        row.appendChild(cell);
      });
      
      tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    container.appendChild(table);
  }
  
  // Start column resize - updated to handle different column types
  function startColumnResize(e, columnKey, headerElement, columnType) {
    e.preventDefault();
    
    const startX = e.clientX;
    const startWidth = parseInt(getComputedStyle(headerElement).width);
    
    function doResize(e) {
      const newWidth = Math.max(50, startWidth + e.clientX - startX);
      headerElement.style.width = `${newWidth}px`;
      
      // Update all cells in this column
      const cells = document.querySelectorAll(`.column-${columnKey}`);
      cells.forEach(cell => {
        cell.style.width = `${newWidth}px`;
      });
      
      // Update config based on column type
      if (columnType === 'system') {
        tableViewConfig.systemColumnWidths[columnKey] = newWidth;
      } else {
        tableViewConfig.columnWidths[columnKey] = newWidth;
      }
      
      // Update the width input if it exists
      const widthInput = document.getElementById(`width-${columnKey}`);
      if (widthInput) {
        widthInput.value = newWidth;
      }
    }
    
    function stopResize() {
      document.removeEventListener('mousemove', doResize);
      document.removeEventListener('mouseup', stopResize);
      
      // Save the configuration
      saveTableViewConfig();
    }
    
    document.addEventListener('mousemove', doResize);
    document.addEventListener('mouseup', stopResize);
  }
  
  // Helper function to change the page
  function changePage(page, query, sortBy, sortOrder) {
    // Update the page input value
    const pageInput = document.getElementById('current-page');
    if (pageInput) {
      pageInput.value = page;
    }
    
    // Re-execute the query with the new page
    const queryInput = document.getElementById('query-input');
    if (queryInput) {
      queryInput.value = query;
    }
    
    // Make sure sorting is maintained
    const sortByField = document.getElementById('sort-by-field');
    const sortOrderSelect = document.getElementById('sort-order');
    
    if (sortByField && sortBy) {
      sortByField.value = sortBy;
    }
    
    if (sortOrderSelect && sortOrder) {
      sortOrderSelect.value = sortOrder;
    }
    
    // Execute the query with updated pagination
    executeQuery();
  }
  
  // Add attribute button to node actions - modified for lazy loading
  function addAttributeButtonToNode(nodeElement, nodeId) {
    // No need to log every button addition
    // console.log('Adding attribute button to node:', nodeId);
    
    // Check if nodeElement exists
    if (!nodeElement) {
      return;
    }
    
    // Try to find node-actions
    const nodeActions = nodeElement.querySelector('.node-actions');
    
    if (nodeActions) {
      // Check if button already exists to prevent duplicates
      const existingButton = nodeActions.querySelector('.attribute-button');
      if (existingButton) {
        return;
      }
      
      // Create and add the button
      const attributeButton = document.createElement('button');
      attributeButton.className = 'attribute-button';
      attributeButton.innerHTML = '📊';
      attributeButton.title = window.I18n ? 
        I18n.t('nodeAttributes') : 
        (currentLanguage === 'en' ? 'Manage attributes' : '管理属性');
        
      attributeButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // This will trigger full initialization when needed
        openModal(nodeId);
      });
      
      // Insert at the correct position - try multiple known positions
      const markdownButton = nodeActions.querySelector('.markdown-button');
      const linkButton = nodeActions.querySelector('.link-button');
      const moveButton = nodeActions.querySelector('.move-button');
      
      if (markdownButton) {
        nodeActions.insertBefore(attributeButton, markdownButton.nextSibling);
        console.log('Attribute button added after markdown button for node:', nodeId);
      } 
      else if (linkButton) {
        nodeActions.insertBefore(attributeButton, linkButton.nextSibling);
        console.log('Attribute button added after link button for node:', nodeId);
      }
      else if (moveButton) {
        nodeActions.insertBefore(attributeButton, moveButton.nextSibling);
        console.log('Attribute button added after move button for node:', nodeId);
      }
      else {
        // Fallback: append to the end
        nodeActions.appendChild(attributeButton);
        console.log('Attribute button appended to node actions for node:', nodeId);
      }
    } else {
      // If node-actions doesn't exist yet, retry after a short delay
      console.warn('Could not find node-actions for node:', nodeId, 'Will retry once');
      
      // Create the node-actions div if it doesn't exist
      setTimeout(() => {
        const nodeActionsRetry = nodeElement.querySelector('.node-actions');
        if (nodeActionsRetry) {
          console.log('Found node-actions on retry for node:', nodeId);
          // Call the function again with the same parameters
          addAttributeButtonToNode(nodeElement, nodeId);
        } else {
          // Create a new node-actions div if it still doesn't exist
          console.log('Creating node-actions div for node:', nodeId);
          const newNodeActions = document.createElement('div');
          newNodeActions.className = 'node-actions';
          
          const nodeContent = nodeElement.querySelector('.node-content');
          if (nodeContent) {
            nodeContent.appendChild(newNodeActions);
            
            // Now try to add the button again
            addAttributeButtonToNode(nodeElement, nodeId);
          } else {
            console.error('Cannot find node-content element for node:', nodeId);
          }
        }
      }, 100);
    }
  }
  
  // Public API
  return {
    initialize,
    initializeFully,
    updateLanguage,
    openModal,
    addAttributeButtonToNode,
    openQueryModal
  };
})();

// Make the module available globally
window.AttributeManager = AttributeManager; 