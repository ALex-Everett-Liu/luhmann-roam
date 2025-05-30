/**
 * Graph Data Management UI
 * Interface for creating and managing vertices and edges
 */
const GraphManagementUI = (function() {
    let container;
    let verticesData = [];
    let edgesData = [];
    let sourceVertexSelector = null;
    let targetVertexSelector = null;
    
    // Pagination and search state
    let verticesState = {
      currentPage: 1,
      itemsPerPage: 20,
      searchTerm: '',
      filteredData: []
    };
    
    let edgesState = {
      currentPage: 1,
      itemsPerPage: 20,
      searchTerm: '',
      filteredData: []
    };
    
    function initialize() {
      createContainer();
      setupEventHandlers();
    }
    
    function createContainer() {
      container = document.createElement('div');
      container.id = 'graph-management-container';
      container.className = 'graph-management-container';
      container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: #f8f9fa;
        z-index: 1000;
        display: none;
      `;
      
      container.innerHTML = `
        <div class="graph-management-header">
          <h2>Graph Data Management</h2>
          <button id="close-graph-management" class="close-btn">×</button>
        </div>
        
        <div class="graph-management-content">
          <div class="management-section">
            <div class="section-tabs">
              <button class="tab-btn active" data-tab="vertices">Vertices</button>
              <button class="tab-btn" data-tab="edges">Edges</button>
              <button class="tab-btn" data-tab="import">Import</button>
            </div>
            
            <!-- Vertices Tab -->
            <div id="vertices-tab" class="tab-content active">
              <div class="action-bar">
                <button id="add-vertex-btn" class="primary-btn">Add Vertex</button>
                <button id="refresh-vertices-btn" class="secondary-btn">Refresh</button>
              </div>
              
              <!-- Search and Filter Bar for Vertices -->
              <div class="search-filter-bar">
                <div class="search-container">
                  <input type="text" id="vertices-search" placeholder="Search vertices by label, type, or Chinese name..." class="search-input">
                  <button id="clear-vertices-search" class="clear-search-btn">×</button>
                </div>
                <div class="filter-container">
                  <select id="vertices-type-filter" class="filter-select">
                    <option value="">All Types</option>
                    <option value="concept">Concept</option>
                    <option value="entity">Entity</option>
                    <option value="event">Event</option>
                    <option value="location">Location</option>
                    <option value="person">Person</option>
                    <option value="custom">Custom</option>
                  </select>
                  <select id="vertices-per-page" class="filter-select">
                    <option value="10">10 per page</option>
                    <option value="20" selected>20 per page</option>
                    <option value="50">50 per page</option>
                    <option value="100">100 per page</option>
                  </select>
                </div>
              </div>
              
              <!-- Results Info -->
              <div id="vertices-results-info" class="results-info"></div>
              
              <div id="vertices-list" class="data-list"></div>
              
              <!-- Pagination -->
              <div id="vertices-pagination" class="pagination-container"></div>
            </div>
            
            <!-- Edges Tab -->
            <div id="edges-tab" class="tab-content">
              <div class="action-bar">
                <button id="add-edge-btn" class="primary-btn">Add Edge</button>
                <button id="refresh-edges-btn" class="secondary-btn">Refresh</button>
              </div>
              
              <!-- Search and Filter Bar for Edges -->
              <div class="search-filter-bar">
                <div class="search-container">
                  <input type="text" id="edges-search" placeholder="Search edges by source, target, or relationship..." class="search-input">
                  <button id="clear-edges-search" class="clear-search-btn">×</button>
                </div>
                <div class="filter-container">
                  <select id="edges-relationship-filter" class="filter-select">
                    <option value="">All Relationships</option>
                    <option value="relates_to">Relates To</option>
                    <option value="depends_on">Depends On</option>
                    <option value="part_of">Part Of</option>
                    <option value="causes">Causes</option>
                    <option value="similar_to">Similar To</option>
                    <option value="opposite_of">Opposite Of</option>
                    <option value="custom">Custom</option>
                  </select>
                  <select id="edges-direction-filter" class="filter-select">
                    <option value="">All Directions</option>
                    <option value="directed">Directed</option>
                    <option value="undirected">Undirected</option>
                  </select>
                  <select id="edges-per-page" class="filter-select">
                    <option value="10">10 per page</option>
                    <option value="20" selected>20 per page</option>
                    <option value="50">50 per page</option>
                    <option value="100">100 per page</option>
                  </select>
                </div>
              </div>
              
              <!-- Results Info -->
              <div id="edges-results-info" class="results-info"></div>
              
              <div id="edges-list" class="data-list"></div>
              
              <!-- Pagination -->
              <div id="edges-pagination" class="pagination-container"></div>
            </div>
            
            <!-- Import Tab -->
            <div id="import-tab" class="tab-content">
              <div class="import-section">
                <h3>Import from Outliner Nodes</h3>
                <p>Select nodes from your outliner to create graph vertices:</p>
                <button id="load-nodes-btn" class="secondary-btn">Load Available Nodes</button>
                <div id="nodes-for-import" class="nodes-list"></div>
                <button id="import-selected-btn" class="primary-btn" style="display: none;">Import Selected</button>
              </div>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(container);
      
      // Create modals separately at body level for better centering
      createModals();
    }
    
    function createModals() {
      // Vertex Modal
      const vertexModal = document.createElement('div');
      vertexModal.id = 'vertex-modal';
      vertexModal.className = 'graph-modal';
      vertexModal.innerHTML = `
        <div class="graph-modal-content">
          <h3 id="vertex-modal-title">Add Vertex</h3>
          <form id="vertex-form">
            <label>Label (English)*:</label>
            <input type="text" id="vertex-label" required>
            
            <label>Label (Chinese):</label>
            <input type="text" id="vertex-label-zh">
            
            <label>Type:</label>
            <select id="vertex-type">
              <option value="concept">Concept</option>
              <option value="entity">Entity</option>
              <option value="event">Event</option>
              <option value="location">Location</option>
              <option value="person">Person</option>
              <option value="custom">Custom</option>
            </select>
            
            <label>Color:</label>
            <input type="color" id="vertex-color" value="#666666">
            
            <label>Size:</label>
            <input type="number" id="vertex-size" min="0.1" max="5" step="0.1" value="1.0">
            
            <div class="modal-actions">
              <button type="submit" class="primary-btn">Save</button>
              <button type="button" id="cancel-vertex" class="secondary-btn">Cancel</button>
            </div>
          </form>
        </div>
      `;
      document.body.appendChild(vertexModal);
      
      // Edge Modal
      const edgeModal = document.createElement('div');
      edgeModal.id = 'edge-modal';
      edgeModal.className = 'graph-modal';
      edgeModal.innerHTML = `
        <div class="graph-modal-content">
          <h3 id="edge-modal-title">Add Edge</h3>
          <form id="edge-form">
            <label>Source Vertex*:</label>
            <div class="vertex-selector-container">
              <input type="text" id="edge-source-search" placeholder="Search source vertex..." class="vertex-search-input">
              <div id="edge-source-dropdown" class="vertex-dropdown">
                <div class="vertex-dropdown-content">
                  <div class="vertex-option" data-value="">Select source vertex...</div>
                </div>
              </div>
              <input type="hidden" id="edge-source" required>
            </div>
            
            <label>Target Vertex*:</label>
            <div class="vertex-selector-container">
              <input type="text" id="edge-target-search" placeholder="Search target vertex..." class="vertex-search-input">
              <div id="edge-target-dropdown" class="vertex-dropdown">
                <div class="vertex-dropdown-content">
                  <div class="vertex-option" data-value="">Select target vertex...</div>
                </div>
              </div>
              <input type="hidden" id="edge-target" required>
            </div>
            
            <label>Relationship Type:</label>
            <select id="edge-relationship">
              <option value="relates_to">Relates To</option>
              <option value="depends_on">Depends On</option>
              <option value="part_of">Part Of</option>
              <option value="causes">Causes</option>
              <option value="similar_to">Similar To</option>
              <option value="opposite_of">Opposite Of</option>
              <option value="custom">Custom</option>
            </select>
            
            <label>Weight:</label>
            <input type="number" id="edge-weight" min="0.1" max="10" step="0.1" value="1.0">
            
            <label>Direction:</label>
            <select id="edge-direction">
              <option value="directed">Directed (A → B)</option>
              <option value="undirected">Undirected (A ↔ B)</option>
            </select>
            
            <div class="modal-actions">
              <button type="submit" class="primary-btn">Save</button>
              <button type="button" id="cancel-edge" class="secondary-btn">Cancel</button>
            </div>
          </form>
        </div>
      `;
      document.body.appendChild(edgeModal);
    }
    
    function setupEventHandlers() {
      // Close button
      document.getElementById('close-graph-management').addEventListener('click', hide);
      
      // Tab switching
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', switchTab);
      });
      
      // Action buttons
      document.getElementById('add-vertex-btn').addEventListener('click', () => openVertexModal());
      document.getElementById('add-edge-btn').addEventListener('click', () => openEdgeModal());
      document.getElementById('refresh-vertices-btn').addEventListener('click', loadVertices);
      document.getElementById('refresh-edges-btn').addEventListener('click', loadEdges);
      
      // Search and filter handlers for vertices
      document.getElementById('vertices-search').addEventListener('input', handleVerticesSearch);
      document.getElementById('clear-vertices-search').addEventListener('click', clearVerticesSearch);
      document.getElementById('vertices-type-filter').addEventListener('change', handleVerticesFilter);
      document.getElementById('vertices-per-page').addEventListener('change', handleVerticesPerPageChange);
      
      // Search and filter handlers for edges
      document.getElementById('edges-search').addEventListener('input', handleEdgesSearch);
      document.getElementById('clear-edges-search').addEventListener('click', clearEdgesSearch);
      document.getElementById('edges-relationship-filter').addEventListener('change', handleEdgesFilter);
      document.getElementById('edges-direction-filter').addEventListener('change', handleEdgesFilter);
      document.getElementById('edges-per-page').addEventListener('change', handleEdgesPerPageChange);
      
      // Modal handling
      document.getElementById('vertex-form').addEventListener('submit', saveVertex);
      document.getElementById('edge-form').addEventListener('submit', saveEdge);
      document.getElementById('cancel-vertex').addEventListener('click', closeVertexModal);
      document.getElementById('cancel-edge').addEventListener('click', closeEdgeModal);
      
      // Import functionality
      document.getElementById('load-nodes-btn').addEventListener('click', loadNodesForImport);
      document.getElementById('import-selected-btn').addEventListener('click', importSelectedNodes);
      
      // Initialize vertex selectors after modal is created
      initializeVertexSelectors();
    }
    
    function initializeVertexSelectors() {
      sourceVertexSelector = new VertexSelector('edge-source');
      targetVertexSelector = new VertexSelector('edge-target');
    }
    
    function switchTab(e) {
      const targetTab = e.target.dataset.tab;
      
      // Update tab buttons
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      
      // Update tab content
      document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
      document.getElementById(`${targetTab}-tab`).classList.add('active');
      
      // Load data if needed
      if (targetTab === 'vertices') {
        loadVertices();
      } else if (targetTab === 'edges') {
        loadEdges();
      }
    }
    
    // Search and filter functions for vertices
    function handleVerticesSearch(e) {
      verticesState.searchTerm = e.target.value.toLowerCase();
      verticesState.currentPage = 1;
      filterAndRenderVertices();
    }
    
    function clearVerticesSearch() {
      document.getElementById('vertices-search').value = '';
      verticesState.searchTerm = '';
      verticesState.currentPage = 1;
      filterAndRenderVertices();
    }
    
    function handleVerticesFilter() {
      verticesState.currentPage = 1;
      filterAndRenderVertices();
    }
    
    function handleVerticesPerPageChange(e) {
      verticesState.itemsPerPage = parseInt(e.target.value);
      verticesState.currentPage = 1;
      filterAndRenderVertices();
    }
    
    function filterAndRenderVertices() {
      const typeFilter = document.getElementById('vertices-type-filter').value;
      
      verticesState.filteredData = verticesData.filter(vertex => {
        const matchesSearch = !verticesState.searchTerm || 
          (vertex.label || '').toLowerCase().includes(verticesState.searchTerm) ||
          (vertex.label_zh || '').toLowerCase().includes(verticesState.searchTerm) ||
          (vertex.type || '').toLowerCase().includes(verticesState.searchTerm);
        
        const matchesType = !typeFilter || vertex.type === typeFilter;
        
        return matchesSearch && matchesType;
      });
      
      renderVerticesList();
      renderVerticesPagination();
      updateVerticesResultsInfo();
    }
    
    // Search and filter functions for edges
    function handleEdgesSearch(e) {
      edgesState.searchTerm = e.target.value.toLowerCase();
      edgesState.currentPage = 1;
      filterAndRenderEdges();
    }
    
    function clearEdgesSearch() {
      document.getElementById('edges-search').value = '';
      edgesState.searchTerm = '';
      edgesState.currentPage = 1;
      filterAndRenderEdges();
    }
    
    function handleEdgesFilter() {
      edgesState.currentPage = 1;
      filterAndRenderEdges();
    }
    
    function handleEdgesPerPageChange(e) {
      edgesState.itemsPerPage = parseInt(e.target.value);
      edgesState.currentPage = 1;
      filterAndRenderEdges();
    }
    
    function filterAndRenderEdges() {
      const relationshipFilter = document.getElementById('edges-relationship-filter').value;
      const directionFilter = document.getElementById('edges-direction-filter').value;
      
      edgesState.filteredData = edgesData.filter(edge => {
        const matchesSearch = !edgesState.searchTerm || 
          (edge.source_label || '').toLowerCase().includes(edgesState.searchTerm) ||
          (edge.target_label || '').toLowerCase().includes(edgesState.searchTerm) ||
          (edge.relationship_type || '').toLowerCase().includes(edgesState.searchTerm);
        
        const matchesRelationship = !relationshipFilter || edge.relationship_type === relationshipFilter;
        const matchesDirection = !directionFilter || edge.direction === directionFilter;
        
        return matchesSearch && matchesRelationship && matchesDirection;
      });
      
      renderEdgesList();
      renderEdgesPagination();
      updateEdgesResultsInfo();
    }
    
    async function loadVertices() {
      try {
        const response = await fetch('/api/graph-management/vertices');
        verticesData = await response.json();
        verticesState.currentPage = 1;
        filterAndRenderVertices();
      } catch (error) {
        console.error('Error loading vertices:', error);
        alert('Error loading vertices');
      }
    }
    
    async function loadEdges() {
      try {
        const response = await fetch('/api/graph-management/edges');
        edgesData = await response.json();
        edgesState.currentPage = 1;
        filterAndRenderEdges();
      } catch (error) {
        console.error('Error loading edges:', error);
        alert('Error loading edges');
      }
    }
    
    function renderVerticesList() {
      const listContainer = document.getElementById('vertices-list');
      
      if (verticesState.filteredData.length === 0) {
        listContainer.innerHTML = '<p class="empty-message">No vertices found matching your criteria.</p>';
        return;
      }
      
      const startIndex = (verticesState.currentPage - 1) * verticesState.itemsPerPage;
      const endIndex = startIndex + verticesState.itemsPerPage;
      const pageData = verticesState.filteredData.slice(startIndex, endIndex);
      
      listContainer.innerHTML = pageData.map(vertex => `
        <div class="data-item" data-id="${vertex.id}">
          <div class="item-info">
            <div class="item-title">${vertex.label}</div>
            <div class="item-meta">
              Type: ${vertex.type} | 
              ${vertex.label_zh ? `Chinese: ${vertex.label_zh} | ` : ''}
              Created: ${new Date(vertex.created_at).toLocaleDateString()}
            </div>
          </div>
          <div class="item-actions">
            <button onclick="GraphManagementUI.editVertex('${vertex.id}')" class="edit-btn">Edit</button>
            <button onclick="GraphManagementUI.deleteVertex('${vertex.id}')" class="delete-btn">Delete</button>
          </div>
        </div>
      `).join('');
    }
    
    function renderEdgesList() {
      const listContainer = document.getElementById('edges-list');
      
      if (edgesState.filteredData.length === 0) {
        listContainer.innerHTML = '<p class="empty-message">No edges found matching your criteria.</p>';
        return;
      }
      
      const startIndex = (edgesState.currentPage - 1) * edgesState.itemsPerPage;
      const endIndex = startIndex + edgesState.itemsPerPage;
      const pageData = edgesState.filteredData.slice(startIndex, endIndex);
      
      listContainer.innerHTML = pageData.map(edge => `
        <div class="data-item" data-id="${edge.id}">
          <div class="item-info">
            <div class="item-title">${edge.source_label} → ${edge.target_label}</div>
            <div class="item-meta">
              Relationship: ${edge.relationship_type} | 
              Weight: ${edge.weight} | 
              Direction: ${edge.direction}
            </div>
          </div>
          <div class="item-actions">
            <button onclick="GraphManagementUI.editEdge('${edge.id}')" class="edit-btn">Edit</button>
            <button onclick="GraphManagementUI.deleteEdge('${edge.id}')" class="delete-btn">Delete</button>
          </div>
        </div>
      `).join('');
    }
    
    function renderVerticesPagination() {
      const container = document.getElementById('vertices-pagination');
      const totalPages = Math.ceil(verticesState.filteredData.length / verticesState.itemsPerPage);
      
      if (totalPages <= 1) {
        container.innerHTML = '';
        return;
      }
      
      let paginationHTML = '<div class="pagination">';
      
      // Previous button
      if (verticesState.currentPage > 1) {
        paginationHTML += `<button class="page-btn" onclick="GraphManagementUI.goToVerticesPage(${verticesState.currentPage - 1})">‹ Previous</button>`;
      }
      
      // Page numbers
      const startPage = Math.max(1, verticesState.currentPage - 2);
      const endPage = Math.min(totalPages, verticesState.currentPage + 2);
      
      if (startPage > 1) {
        paginationHTML += `<button class="page-btn" onclick="GraphManagementUI.goToVerticesPage(1)">1</button>`;
        if (startPage > 2) {
          paginationHTML += '<span class="page-ellipsis">...</span>';
        }
      }
      
      for (let i = startPage; i <= endPage; i++) {
        const isActive = i === verticesState.currentPage ? 'active' : '';
        paginationHTML += `<button class="page-btn ${isActive}" onclick="GraphManagementUI.goToVerticesPage(${i})">${i}</button>`;
      }
      
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          paginationHTML += '<span class="page-ellipsis">...</span>';
        }
        paginationHTML += `<button class="page-btn" onclick="GraphManagementUI.goToVerticesPage(${totalPages})">${totalPages}</button>`;
      }
      
      // Next button
      if (verticesState.currentPage < totalPages) {
        paginationHTML += `<button class="page-btn" onclick="GraphManagementUI.goToVerticesPage(${verticesState.currentPage + 1})">Next ›</button>`;
      }
      
      paginationHTML += '</div>';
      container.innerHTML = paginationHTML;
    }
    
    function renderEdgesPagination() {
      const container = document.getElementById('edges-pagination');
      const totalPages = Math.ceil(edgesState.filteredData.length / edgesState.itemsPerPage);
      
      if (totalPages <= 1) {
        container.innerHTML = '';
        return;
      }
      
      let paginationHTML = '<div class="pagination">';
      
      // Previous button
      if (edgesState.currentPage > 1) {
        paginationHTML += `<button class="page-btn" onclick="GraphManagementUI.goToEdgesPage(${edgesState.currentPage - 1})">‹ Previous</button>`;
      }
      
      // Page numbers
      const startPage = Math.max(1, edgesState.currentPage - 2);
      const endPage = Math.min(totalPages, edgesState.currentPage + 2);
      
      if (startPage > 1) {
        paginationHTML += `<button class="page-btn" onclick="GraphManagementUI.goToEdgesPage(1)">1</button>`;
        if (startPage > 2) {
          paginationHTML += '<span class="page-ellipsis">...</span>';
        }
      }
      
      for (let i = startPage; i <= endPage; i++) {
        const isActive = i === edgesState.currentPage ? 'active' : '';
        paginationHTML += `<button class="page-btn ${isActive}" onclick="GraphManagementUI.goToEdgesPage(${i})">${i}</button>`;
      }
      
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          paginationHTML += '<span class="page-ellipsis">...</span>';
        }
        paginationHTML += `<button class="page-btn" onclick="GraphManagementUI.goToEdgesPage(${totalPages})">${totalPages}</button>`;
      }
      
      // Next button
      if (edgesState.currentPage < totalPages) {
        paginationHTML += `<button class="page-btn" onclick="GraphManagementUI.goToEdgesPage(${edgesState.currentPage + 1})">Next ›</button>`;
      }
      
      paginationHTML += '</div>';
      container.innerHTML = paginationHTML;
    }
    
    function updateVerticesResultsInfo() {
      const container = document.getElementById('vertices-results-info');
      const total = verticesState.filteredData.length;
      const totalOriginal = verticesData.length;
      
      if (total === 0) {
        container.innerHTML = `<span class="results-text">No vertices found</span>`;
      } else {
        const startIndex = (verticesState.currentPage - 1) * verticesState.itemsPerPage + 1;
        const endIndex = Math.min(startIndex + verticesState.itemsPerPage - 1, total);
        
        let text = `Showing ${startIndex}-${endIndex} of ${total} vertices`;
        if (total !== totalOriginal) {
          text += ` (filtered from ${totalOriginal} total)`;
        }
        
        container.innerHTML = `<span class="results-text">${text}</span>`;
      }
    }
    
    function updateEdgesResultsInfo() {
      const container = document.getElementById('edges-results-info');
      const total = edgesState.filteredData.length;
      const totalOriginal = edgesData.length;
      
      if (total === 0) {
        container.innerHTML = `<span class="results-text">No edges found</span>`;
      } else {
        const startIndex = (edgesState.currentPage - 1) * edgesState.itemsPerPage + 1;
        const endIndex = Math.min(startIndex + edgesState.itemsPerPage - 1, total);
        
        let text = `Showing ${startIndex}-${endIndex} of ${total} edges`;
        if (total !== totalOriginal) {
          text += ` (filtered from ${totalOriginal} total)`;
        }
        
        container.innerHTML = `<span class="results-text">${text}</span>`;
      }
    }
    
    function goToVerticesPage(page) {
      verticesState.currentPage = page;
      renderVerticesList();
      renderVerticesPagination();
      updateVerticesResultsInfo();
    }
    
    function goToEdgesPage(page) {
      edgesState.currentPage = page;
      renderEdgesList();
      renderEdgesPagination();
      updateEdgesResultsInfo();
    }
    
    function openVertexModal(vertexId = null) {
      const modal = document.getElementById('vertex-modal');
      const title = document.getElementById('vertex-modal-title');
      const form = document.getElementById('vertex-form');
      
      if (vertexId) {
        // Edit mode
        const vertex = verticesData.find(v => v.id === vertexId);
        title.textContent = 'Edit Vertex';
        document.getElementById('vertex-label').value = vertex.label;
        document.getElementById('vertex-label-zh').value = vertex.label_zh || '';
        document.getElementById('vertex-type').value = vertex.type;
        document.getElementById('vertex-color').value = vertex.color;
        document.getElementById('vertex-size').value = vertex.size;
        form.dataset.vertexId = vertexId;
      } else {
        // Add mode
        title.textContent = 'Add Vertex';
        form.reset();
        delete form.dataset.vertexId;
      }
      
      // Show modal with animation
      modal.classList.add('show');
      modal.style.display = 'flex';
    }
    
    function closeVertexModal() {
      const modal = document.getElementById('vertex-modal');
      modal.classList.remove('show');
      // Small delay to allow animation
      setTimeout(() => {
        modal.style.display = 'none';
      }, 200);
    }
    
    async function openEdgeModal(edgeId = null) {
      // Load vertices for dropdowns
      await loadVertices();
      
      // Initialize vertex selectors if not already done
      if (!sourceVertexSelector) {
        try {
          sourceVertexSelector = new VertexSelector('edge-source');
          targetVertexSelector = new VertexSelector('edge-target');
        } catch (error) {
          console.error('Error initializing vertex selectors:', error);
          setupSimpleDropdowns();
          return;
        }
      }
      
      // Update vertex selectors with current data
      sourceVertexSelector.updateVertices(verticesData);
      targetVertexSelector.updateVertices(verticesData);
      
      const modal = document.getElementById('edge-modal');
      const title = document.getElementById('edge-modal-title');
      const form = document.getElementById('edge-form');
      
      if (edgeId) {
        // Edit mode
        const edge = edgesData.find(e => e.id === edgeId);
        title.textContent = 'Edit Edge';
        
        // Set vertex selections
        sourceVertexSelector.setSelection(edge.source_vertex_id);
        targetVertexSelector.setSelection(edge.target_vertex_id);
        
        document.getElementById('edge-relationship').value = edge.relationship_type;
        document.getElementById('edge-weight').value = edge.weight;
        document.getElementById('edge-direction').value = edge.direction;
        form.dataset.edgeId = edgeId;
      } else {
        // Add mode
        title.textContent = 'Add Edge';
        form.reset();
        sourceVertexSelector.clearSelection();
        targetVertexSelector.clearSelection();
        delete form.dataset.edgeId;
      }
      
      // Show modal with animation
      modal.classList.add('show');
      modal.style.display = 'flex';
    }
    
    function closeEdgeModal() {
      const modal = document.getElementById('edge-modal');
      modal.classList.remove('show');
      // Small delay to allow animation
      setTimeout(() => {
        modal.style.display = 'none';
      }, 200);
    }
    
    async function saveVertex(e) {
      e.preventDefault();
      
      const form = e.target;
      const isEdit = !!form.dataset.vertexId;
      
      const data = {
        label: document.getElementById('vertex-label').value,
        label_zh: document.getElementById('vertex-label-zh').value,
        type: document.getElementById('vertex-type').value,
        color: document.getElementById('vertex-color').value,
        size: parseFloat(document.getElementById('vertex-size').value)
      };
      
      try {
        const url = isEdit 
          ? `/api/graph-management/vertices/${form.dataset.vertexId}`
          : '/api/graph-management/vertices';
        
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        if (!response.ok) {
          throw new Error('Failed to save vertex');
        }
        
        closeVertexModal();
        loadVertices();
        alert(isEdit ? 'Vertex updated successfully!' : 'Vertex created successfully!');
      } catch (error) {
        console.error('Error saving vertex:', error);
        alert('Error saving vertex');
      }
    }
    
    async function saveEdge(e) {
      e.preventDefault();
      
      const form = e.target;
      const isEdit = !!form.dataset.edgeId;
      
      const data = {
        source_vertex_id: document.getElementById('edge-source').value,
        target_vertex_id: document.getElementById('edge-target').value,
        relationship_type: document.getElementById('edge-relationship').value,
        weight: parseFloat(document.getElementById('edge-weight').value),
        direction: document.getElementById('edge-direction').value
      };
      
      try {
        const url = isEdit 
          ? `/api/graph-management/edges/${form.dataset.edgeId}`
          : '/api/graph-management/edges';
        
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        if (!response.ok) {
          throw new Error('Failed to save edge');
        }
        
        closeEdgeModal();
        loadEdges();
        alert(isEdit ? 'Edge updated successfully!' : 'Edge created successfully!');
      } catch (error) {
        console.error('Error saving edge:', error);
        alert('Error saving edge');
      }
    }
    
    async function deleteVertex(vertexId) {
      if (!confirm('Are you sure you want to delete this vertex? This will also delete all connected edges.')) {
        return;
      }
      
      try {
        const response = await fetch(`/api/graph-management/vertices/${vertexId}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          throw new Error('Failed to delete vertex');
        }
        
        loadVertices();
        alert('Vertex deleted successfully!');
      } catch (error) {
        console.error('Error deleting vertex:', error);
        alert('Error deleting vertex');
      }
    }
    
    async function deleteEdge(edgeId) {
      if (!confirm('Are you sure you want to delete this edge?')) {
        return;
      }
      
      try {
        const response = await fetch(`/api/graph-management/edges/${edgeId}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          throw new Error('Failed to delete edge');
        }
        
        loadEdges();
        alert('Edge deleted successfully!');
      } catch (error) {
        console.error('Error deleting edge:', error);
        alert('Error deleting edge');
      }
    }
    
    async function loadNodesForImport() {
      try {
        const response = await fetch('/api/nodes');
        const nodes = await response.json();
        
        const container = document.getElementById('nodes-for-import');
        container.innerHTML = nodes.map(node => `
          <div class="import-node-item">
            <input type="checkbox" id="node-${node.id}" value="${node.id}">
            <label for="node-${node.id}">${node.content || 'Untitled'}</label>
          </div>
        `).join('');
        
        document.getElementById('import-selected-btn').style.display = 'block';
      } catch (error) {
        console.error('Error loading nodes:', error);
        alert('Error loading nodes');
      }
    }
    
    async function importSelectedNodes() {
      const checkedBoxes = document.querySelectorAll('#nodes-for-import input[type="checkbox"]:checked');
      const nodeIds = Array.from(checkedBoxes).map(cb => cb.value);
      
      if (nodeIds.length === 0) {
        alert('Please select at least one node to import');
        return;
      }
      
      try {
        const response = await fetch('/api/graph-management/import/nodes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ node_ids: nodeIds })
        });
        
        const result = await response.json();
        
        if (result.success) {
          alert(`Successfully imported ${result.imported_count} nodes as vertices!`);
          loadVertices();
        } else {
          throw new Error('Import failed');
        }
      } catch (error) {
        console.error('Error importing nodes:', error);
        alert('Error importing nodes');
      }
    }
    
    function show() {
      container.style.display = 'block';
      loadVertices();
    }
    
    function hide() {
      container.style.display = 'none';
    }
    
    function isVisible() {
      return container && container.style.display !== 'none';
    }
    
    // Public API
    return {
      initialize,
      show,
      hide,
      isVisible,
      editVertex: (id) => openVertexModal(id),
      editEdge: (id) => openEdgeModal(id),
      deleteVertex,
      deleteEdge,
      goToVerticesPage,
      goToEdgesPage
    };
  })();
  
  window.GraphManagementUI = GraphManagementUI;

class VertexSelector {
  constructor(fieldId) {
    this.fieldId = fieldId;
    
    // Check if elements exist
    this.searchInput = document.getElementById(`${fieldId}-search`);
    this.dropdown = document.getElementById(`${fieldId}-dropdown`);
    this.hiddenInput = document.getElementById(fieldId);
    
    if (!this.searchInput || !this.dropdown || !this.hiddenInput) {
      throw new Error(`VertexSelector: Required elements not found for ${fieldId}`);
    }
    
    this.dropdownContent = this.dropdown.querySelector('.vertex-dropdown-content');
    if (!this.dropdownContent) {
      throw new Error(`VertexSelector: Dropdown content not found for ${fieldId}`);
    }
    
    this.vertices = [];
    this.filteredVertices = [];
    this.selectedVertex = null;
    this.highlightedIndex = -1;
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Search input events
    this.searchInput.addEventListener('input', (e) => this.handleSearch(e));
    this.searchInput.addEventListener('focus', () => this.handleFocus());
    this.searchInput.addEventListener('keydown', (e) => this.handleKeydown(e));
    
    // Click outside to close
    document.addEventListener('click', (e) => {
      if (!this.searchInput.contains(e.target) && !this.dropdown.contains(e.target)) {
        this.hideDropdown();
      }
    });
  }
  
  updateVertices(vertices) {
    this.vertices = vertices || [];
    this.filteredVertices = []; // Don't show all initially
    // Clear dropdown content initially
    this.dropdownContent.innerHTML = '<div class="no-vertices-message">Start typing to search vertices...</div>';
  }
  
  handleFocus() {
    // Only show dropdown if there's already a search term or selection
    if (this.searchInput.value.trim()) {
      this.handleSearch({ target: this.searchInput });
    } else {
      // Show a hint message
      this.dropdownContent.innerHTML = '<div class="no-vertices-message">Start typing to search vertices...</div>';
      this.showDropdown();
    }
  }
  
  handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    if (!searchTerm) {
      this.filteredVertices = [];
      this.dropdownContent.innerHTML = '<div class="no-vertices-message">Start typing to search vertices...</div>';
      this.showDropdown();
      return;
    }
    
    // Only search if user typed at least 1 character
    this.filteredVertices = this.vertices.filter(vertex => {
      const label = (vertex.label || '').toLowerCase();
      const labelZh = (vertex.label_zh || '').toLowerCase();
      const type = (vertex.type || '').toLowerCase();
      return label.includes(searchTerm) || labelZh.includes(searchTerm) || type.includes(searchTerm);
    });
    
    this.highlightedIndex = -1;
    this.renderOptions();
    this.showDropdown();
  }
  
  renderOptions() {
    if (!this.dropdownContent) return;
    
    if (this.filteredVertices.length === 0) {
      this.dropdownContent.innerHTML = '<div class="no-vertices-message">No vertices found matching your search</div>';
      return;
    }
    
    // Limit results to prevent performance issues
    const maxResults = 50;
    const displayVertices = this.filteredVertices.slice(0, maxResults);
    
    let html = displayVertices.map((vertex, index) => `
      <div class="vertex-option" data-vertex-id="${vertex.id}" data-index="${index}">
        <div class="vertex-option-label">${vertex.label || 'Untitled'}</div>
        <div class="vertex-option-meta">${vertex.type || 'unknown'}${vertex.label_zh ? ` | ${vertex.label_zh}` : ''}</div>
      </div>
    `).join('');
    
    // Show message if there are more results
    if (this.filteredVertices.length > maxResults) {
      html += `<div class="no-vertices-message">Showing ${maxResults} of ${this.filteredVertices.length} results. Type more to narrow down.</div>`;
    }
    
    this.dropdownContent.innerHTML = html;
    
    // Add click handlers
    this.dropdownContent.querySelectorAll('.vertex-option').forEach(option => {
      option.addEventListener('click', () => {
        const vertexId = option.dataset.vertexId;
        const vertex = this.vertices.find(v => v.id === vertexId);
        if (vertex) {
          this.selectVertex(vertex);
        }
      });
    });
  }
  
  handleKeydown(e) {
    if (!this.dropdown.classList.contains('show')) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.highlightedIndex = Math.min(this.highlightedIndex + 1, this.filteredVertices.length - 1);
        this.updateHighlight();
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.highlightedIndex = Math.max(this.highlightedIndex - 1, -1);
        this.updateHighlight();
        break;
      case 'Enter':
        e.preventDefault();
        if (this.highlightedIndex >= 0) {
          this.selectVertex(this.filteredVertices[this.highlightedIndex]);
        }
        break;
      case 'Escape':
        this.hideDropdown();
        break;
    }
  }
  
  updateHighlight() {
    this.dropdownContent.querySelectorAll('.vertex-option').forEach((option, index) => {
      option.classList.toggle('highlighted', index === this.highlightedIndex);
    });
  }
  
  selectVertex(vertex) {
    this.selectedVertex = vertex;
    this.searchInput.value = vertex.label;
    this.searchInput.classList.add('has-selection');
    this.hiddenInput.value = vertex.id;
    this.hideDropdown();
  }
  
  setSelection(vertexId) {
    const vertex = this.vertices.find(v => v.id === vertexId);
    if (vertex) {
      this.selectVertex(vertex);
    }
  }
  
  clearSelection() {
    this.selectedVertex = null;
    this.searchInput.value = '';
    this.searchInput.classList.remove('has-selection');
    this.hiddenInput.value = '';
  }
  
  showDropdown() {
    this.dropdown.classList.add('show');
  }
  
  hideDropdown() {
    this.dropdown.classList.remove('show');
    this.highlightedIndex = -1;
  }
}