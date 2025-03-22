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
  
  // Common attribute keys for autocompletion
  const commonAttributes = [
    'type', 'source', 'author', 'rating', 'url', 'tags', 'category', 'status', 'priority'
  ];
  
  // Initialize the module
  function initialize() {
    console.log('AttributeManager initialized');
    
    // Get the current language from I18n if available
    if (window.I18n) {
      currentLanguage = I18n.getCurrentLanguage();
    }
    
    ensureModalsExist(); // Use this instead of createModals()
    loadRecentQueries();
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
      
      modalOverlay.appendChild(queryModal);
    }
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

  function ensureModalsExist() {
    // Check if modalOverlay is in the document
    if (!modalOverlay || !document.body.contains(modalOverlay)) {
      console.log('Modal overlay not found in DOM, creating new one');
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
    
    // Recreate attribute modal if needed
    if (!attributeModal || !modalOverlay.contains(attributeModal)) {
      console.log('Attribute modal not found in DOM, creating new one');
      createAttributeModal();
    }
    
    // Recreate query modal if needed
    if (!queryModal || !modalOverlay.contains(queryModal)) {
      console.log('Query modal not found in DOM, creating new one');
      createQueryModal();
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
  async function openModal(nodeId) {
    try {
      currentNodeId = nodeId;

      // Ensure modals exist before trying to use them
      ensureModalsExist();
      
      // Make sure the modal is created if it doesn't exist
      // if (!attributeModal) {
      //   createAttributeModal();
      // }
      
      // Ensure the modal overlay is in the document
      // if (!document.body.contains(modalOverlay)) {
      //   document.body.appendChild(modalOverlay);
      // }
      
      // Ensure the attribute modal is in the overlay
      // if (!modalOverlay.contains(attributeModal)) {
      //   modalOverlay.appendChild(attributeModal);
      // }
      
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
  
  // Open the query modal
  function openQueryModal() {
    // Ensure modals exist before trying to use them
    ensureModalsExist();
    
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
    
    try {
      // Add to recent queries
      addRecentQuery(query);
      
      const response = await fetch('/api/nodes/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Query execution failed');
      }
      
      const results = await response.json();
      renderQueryResults(results);
    } catch (error) {
      console.error('Error executing query:', error);
      alert(`Error executing query: ${error.message}`);
      
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
  
  // Render query results
  function renderQueryResults(results) {
    const resultsContainer = document.getElementById('query-results');
    resultsContainer.innerHTML = '';
    
    if (results.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'no-query-results';
      noResults.textContent = 'No nodes match this query.';
      resultsContainer.appendChild(noResults);
      return;
    }
    
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
      attrButton.textContent = 'Attributes';
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
    resultsContainer.appendChild(table);
  }
  
  // Add attribute button to node actions
  function addAttributeButtonToNode(nodeElement, nodeId) {
    // Add console logging to debug the issue
    console.log('Adding attribute button to node:', nodeId);
    console.log('Node element exists:', !!nodeElement);
    
    // Check if nodeElement exists
    if (!nodeElement) {
      console.warn('Node element is null or undefined for node:', nodeId);
      return;
    }
    
    // Try to find node-actions
    const nodeActions = nodeElement.querySelector('.node-actions');
    
    if (nodeActions) {
      // Check if button already exists to prevent duplicates
      const existingButton = nodeActions.querySelector('.attribute-button');
      if (existingButton) {
        console.log('Attribute button already exists for node:', nodeId);
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
    updateLanguage,
    openModal,
    addAttributeButtonToNode,
    openQueryModal
  };
})();

// Make the module available globally
window.AttributeManager = AttributeManager; 