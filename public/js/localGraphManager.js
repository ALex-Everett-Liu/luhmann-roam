/**
 * Local Graph Manager UI
 * Distance-based graph visualization centered around a specific node
 */
const LocalGraphManager = (function() {
    let container;
    let centerNodeId = null;
    let graphData = null;
    let maxDistance = 5;
    let maxDepth = 3;
    let isInitialized = false;
    let nodePoolStatus = new Map(); // Track which nodes are in pool
    let currentEditingNode = null; // Track the node being edited
    let currentNodeLinks = { outgoing: [], incoming: [] }; // Track links for editing
    let currentLayoutMode = 'circular'; // 'circular', 'distance-based', or 'manual'
    let manualPlacementState = {
        isActive: false,
        phase: 'initial', // 'initial', 'adjusting', 'placing'
        placedNodes: new Set(),
        nodesToPlace: [],
        currentNodeIndex: 0,
        initialNodes: new Set(), // nodes placed in initial phase (depth 1-2)
        nodePositions: {} // store positions during manual placement
    };
    
    function initialize() {
        if (isInitialized) {
            console.log('LocalGraphManager already initialized');
            return;
        }
        
        try {
            createContainer();
            setupEventHandlers();
            isInitialized = true;
            console.log('LocalGraphManager initialized successfully');
        } catch (error) {
            console.error('Error initializing LocalGraphManager:', error);
        }
    }
    
    function createContainer() {
        container = document.createElement('div');
        container.id = 'local-graph-container';
        container.className = 'local-graph-container';
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
            <div class="local-graph-header">
                <h2>Local Graph Explorer</h2>
                <button id="close-local-graph" class="close-btn">×</button>
            </div>
            
            <div class="local-graph-content">
                <!-- Empty State Phase -->
                <div id="empty-state-phase" class="phase-content">
                    <div class="empty-state-container">
                        <div class="empty-state-icon">🌱</div>
                        <h3>No Nodes Found</h3>
                        <p>Your knowledge graph is empty. To use the Local Graph Explorer, you need to create some nodes first.</p>
                        
                        <div class="empty-state-actions">
                            <button id="create-first-node-btn" class="primary-btn">Create Your First Node</button>
                            <button id="go-to-outliner-btn" class="secondary-btn">Go to Main Outliner</button>
                            <button id="check-nodes-again-btn" class="secondary-btn">Check Again</button>
                        </div>
                        
                        <div class="empty-state-help">
                            <h4>Getting Started:</h4>
                            <ol>
                                <li>Create at least 2-3 nodes in your outliner</li>
                                <li>Add some links between nodes using the Graph Management tool</li>
                                <li>Return here to explore local neighborhoods around any node</li>
                            </ol>
                        </div>
                    </div>
                </div>
                
                <!-- Center Node Selection Phase -->
                <div id="center-selection-phase" class="phase-content">
                    <div class="center-selection-container">
                        <h3>Select Center Node</h3>
                        <p>Choose a node from your Local Graph pool to explore its neighborhood:</p>
                        
                        <!-- Quick Access Section -->
                        <div class="quick-access-section">
                            <div class="quick-access-header">
                                <h4>Quick Access</h4>
                                <span class="quick-access-subtitle">Recently used center nodes</span>
                            </div>
                            <div id="quick-access-list" class="quick-access-list">
                                <!-- Will be populated with quick access nodes -->
                            </div>
                        </div>
                        
                        <div class="search-section">
                            <h4>Search Pool Nodes</h4>
                            <div class="node-search-container">
                                <input type="text" id="center-node-search" placeholder="Search pool nodes..." class="node-search-input">
                                <div id="center-node-dropdown" class="node-dropdown">
                                    <div class="node-dropdown-content">
                                        <div class="no-results-message">Start typing to search pool nodes...</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="distance-controls">
                            <div class="control-group">
                                <label>Max Distance:</label>
                                <input type="number" id="max-distance-input" min="1" max="20" step="0.5" value="5">
                                <span class="control-help">Maximum total link weight distance</span>
                            </div>
                            <div class="control-group">
                                <label>Max Depth:</label>
                                <input type="number" id="max-depth-input" min="1" max="10" value="3">
                                <span class="control-help">Maximum number of hops from center</span>
                            </div>
                        </div>
                        
                        <button id="explore-graph-btn" class="primary-btn" disabled>Explore Graph</button>
                    </div>
                </div>
                
                <!-- Graph Visualization Phase -->
                <div id="graph-visualization-phase" class="phase-content">
                    <div class="graph-controls">
                        <div class="control-row">
                            <div class="center-info">
                                <strong>Center:</strong> <span id="current-center-node">None</span>
                                <button id="change-center-btn" class="secondary-btn">Change Center</button>
                                <button id="save-to-quick-access-btn" class="secondary-btn" title="Save to Quick Access">⭐</button>
                            </div>
                            <div class="distance-info">
                                <span id="distance-display">Distance: 5, Depth: 3</span>
                                <button id="adjust-distance-btn" class="secondary-btn">Adjust</button>
                            </div>
                            <div class="layout-controls">
                                <label>Layout:</label>
                                <select id="layout-mode-select" class="layout-select">
                                    <option value="circular">Circular</option>
                                    <option value="distance-based">Distance-Based</option>
                                    <option value="hybrid">Hybrid Concentric</option>
                                    <option value="manual">Manual Placement</option>
                                </select>
                            </div>
                            <div class="graph-actions">
                                <button id="add-node-btn" class="primary-btn">Add Node</button>
                                <button id="refresh-graph-btn" class="secondary-btn">Refresh</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="graph-main-area">
                        <div class="graph-sidebar" id="local-graph-sidebar">
                            <div class="sidebar-section">
                                <h4>Search in Graph</h4>
                                <div class="local-graph-search-container">
                                    <input type="text" id="graph-node-search" placeholder="Search nodes in current graph..." class="local-graph-search-input">
                                    <div id="graph-search-results" class="local-graph-search-results">
                                        <!-- Search results will appear here -->
                                    </div>
                                </div>
                            </div>
                            
                            <div class="sidebar-section">
                                <h4>Graph Statistics</h4>
                                <div id="graph-stats">
                                    <div class="stat-item">
                                        <span class="stat-label">Nodes:</span>
                                        <span id="nodes-count">0</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">Links:</span>
                                        <span id="links-count">0</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="sidebar-section">
                                <h4>Distance Levels</h4>
                                <div id="distance-levels"></div>
                            </div>
                            
                            <div class="sidebar-section">
                                <h4>Selected Node</h4>
                                <div id="selected-node-info">Click a node to see details</div>
                            </div>
                        </div>
                        
                        <!-- Resize Handle -->
                        <div class="local-graph-resize-handle" id="local-graph-resize-handle">
                            <div class="local-graph-resize-grip"></div>
                        </div>
                        
                        <div class="graph-canvas-area" id="local-graph-canvas-area">
                            <div id="manual-placement-controls" class="manual-placement-controls" style="display: none;">
                                <div class="manual-placement-header">
                                    <h4 id="manual-placement-title">Manual Node Placement</h4>
                                    <div class="manual-placement-progress">
                                        <span id="manual-progress-text">Step 1 of 3</span>
                                        <div class="progress-bar">
                                            <div id="manual-progress-fill" class="progress-fill"></div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div id="manual-phase-initial" class="manual-phase">
                                    <div class="manual-instructions">
                                        <p>Initial nodes (depth 1-2) have been placed automatically using distance-based layout.</p>
                                        <p>You can drag them to adjust their positions, or proceed to place the remaining nodes.</p>
                                    </div>
                                    <div class="manual-actions">
                                        <button id="manual-proceed-btn" class="primary-btn">Proceed to Manual Placement</button>
                                        <button id="manual-reset-positions-btn" class="secondary-btn">Reset to Auto Positions</button>
                                    </div>
                                </div>
                                
                                <div id="manual-phase-placing" class="manual-phase" style="display: none;">
                                    <div class="manual-instructions">
                                        <p>Click anywhere on the canvas to place: <strong id="current-node-name">Node Name</strong></p>
                                        <p id="remaining-nodes-count">Remaining: 5 nodes</p>
                                    </div>
                                    <div class="manual-actions">
                                        <button id="manual-skip-node-btn" class="secondary-btn">Skip This Node</button>
                                        <button id="manual-auto-place-remaining-btn" class="secondary-btn">Auto-place Remaining</button>
                                        <button id="manual-cancel-btn" class="secondary-btn">Cancel Manual Mode</button>
                                    </div>
                                </div>
                                
                                <div id="manual-phase-complete" class="manual-phase" style="display: none;">
                                    <div class="manual-instructions">
                                        <p>✅ Manual placement complete! All nodes have been positioned.</p>
                                    </div>
                                    <div class="manual-actions">
                                        <button id="manual-finish-btn" class="primary-btn">Finish</button>
                                    </div>
                                </div>
                            </div>
                            
                            <div id="local-graph-canvas"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(container);
        
        // Create modals
        createModals();
        
        // Setup resizable sidebar after container is created
        setupResizableGraphSidebar();
    }
    
    function createModals() {
        // Distance adjustment modal
        const distanceModal = document.createElement('div');
        distanceModal.id = 'distance-adjustment-modal';
        distanceModal.className = 'local-graph-modal';
        distanceModal.innerHTML = `
            <div class="local-graph-modal-content">
                <h3>Adjust Distance Parameters</h3>
                <form id="distance-adjustment-form">
                    <div class="form-group">
                        <label>Maximum Distance:</label>
                        <input type="number" id="modal-max-distance" min="0.5" max="50" step="0.5" value="5">
                        <small>Total link weight distance from center node</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Maximum Depth:</label>
                        <input type="number" id="modal-max-depth" min="1" max="15" value="3">
                        <small>Maximum number of hops (links) from center node</small>
                    </div>
                    
                    <div class="modal-actions">
                        <button type="submit" class="primary-btn">Apply</button>
                        <button type="button" id="cancel-distance-adjustment" class="secondary-btn">Cancel</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(distanceModal);
        
        // Add node modal
        const addNodeModal = document.createElement('div');
        addNodeModal.id = 'add-node-modal';
        addNodeModal.className = 'local-graph-modal';
        addNodeModal.innerHTML = `
            <div class="local-graph-modal-content">
                <h3>Add New Node</h3>
                <form id="add-node-form">
                    <div class="form-group">
                        <label>Content (English)*:</label>
                        <textarea id="node-content" required placeholder="Enter node content..."></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label>Content (Chinese):</label>
                        <textarea id="node-content-zh" placeholder="输入中文内容..."></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label>Place in Outliner (from pool):</label>
                        <div class="parent-node-search-container">
                            <input type="text" id="parent-node-search" placeholder="Search pool nodes or leave empty for root..." class="node-search-input">
                            <div id="parent-node-dropdown" class="node-dropdown">
                                <div class="dropdown-content">
                                    <div class="no-results-message">Start typing to search pool nodes or leave empty to create as root node...</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="create-links" checked>
                            Create links to other nodes
                        </label>
                    </div>
                    
                    <div id="link-options" class="form-group">
                        <div class="link-targets-container">
                            <div class="link-target-item">
                                <div class="link-target-search">
                                    <input type="text" class="link-target-input" placeholder="Search for node to link to..." data-index="0">
                                    <div class="link-target-dropdown" data-index="0">
                                        <div class="dropdown-content">
                                            <div class="no-results-message">Start typing to search nodes...</div>
                                        </div>
                                    </div>
                                </div>
                                <div class="link-options-row">
                                    <input type="number" class="link-weight-input" min="0.1" max="100" step="0.1" value="1.0" placeholder="Weight">
                                    <input type="text" class="link-description-input" placeholder="Optional description...">
                                    <button type="button" class="remove-link-btn" style="display: none;">×</button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="link-actions">
                            <button type="button" id="add-another-link" class="secondary-btn">+ Add Another Link</button>
                            <button type="button" id="link-to-center-quick" class="secondary-btn">Quick Link to Center</button>
                        </div>
                        
                        <div class="link-suggestions">
                            <label>Quick suggestions:</label>
                            <div id="link-suggestions-list">
                                <!-- Will be populated with current graph nodes -->
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-actions">
                        <button type="submit" class="primary-btn">Create Node</button>
                        <button type="button" id="cancel-add-node" class="secondary-btn">Cancel</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(addNodeModal);

        // Edit node modal
        const editNodeModal = document.createElement('div');
        editNodeModal.id = 'edit-node-modal';
        editNodeModal.className = 'local-graph-modal';
        editNodeModal.innerHTML = `
            <div class="local-graph-modal-content">
                <h3>Edit Node</h3>
                <form id="edit-node-form">
                    <div class="form-group">
                        <label>Content (English)*:</label>
                        <textarea id="edit-node-content" required placeholder="Enter node content..."></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label>Content (Chinese):</label>
                        <textarea id="edit-node-content-zh" placeholder="输入中文内容..."></textarea>
                    </div>
                    
                    <div class="form-group">
                        <h4>Manage Links</h4>
                        <div class="tabs-container">
                            <div class="tab active" data-tab="outgoing">Outgoing Links</div>
                            <div class="tab" data-tab="incoming">Incoming Links</div>
                            <div class="tab" data-tab="add-new">Add New Link</div>
                        </div>
                        
                        <div class="tab-content">
                            <div class="tab-pane active" data-tab="outgoing">
                                <div id="outgoing-links-list" class="links-list">
                                    <!-- Will be populated with outgoing links -->
                                </div>
                            </div>
                            
                            <div class="tab-pane" data-tab="incoming">
                                <div id="incoming-links-list" class="links-list">
                                    <!-- Will be populated with incoming links -->
                                </div>
                            </div>
                            
                            <div class="tab-pane" data-tab="add-new">
                                <div class="add-link-section">
                                    <div class="form-group">
                                        <label>Link to Node:</label>
                                        <div class="link-target-search">
                                            <input type="text" id="new-link-target" placeholder="Search for node to link to..." class="node-search-input">
                                            <div id="new-link-dropdown" class="node-dropdown">
                                                <div class="dropdown-content">
                                                    <div class="no-results-message">Start typing to search pool nodes...</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label>Weight:</label>
                                        <input type="number" id="new-link-weight" min="0.1" max="100" step="0.1" value="1.0" class="form-control">
                                    </div>
                                    
                                    <div class="form-group">
                                        <label>Description:</label>
                                        <input type="text" id="new-link-description" placeholder="Optional description..." class="form-control">
                                    </div>
                                    
                                    <button type="button" id="add-new-link-btn" class="primary-btn">Add Link</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-actions">
                        <button type="submit" class="primary-btn">Save Changes</button>
                        <button type="button" id="cancel-edit-node" class="secondary-btn">Cancel</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(editNodeModal);

        // Edit link modal
        const editLinkModal = document.createElement('div');
        editLinkModal.id = 'edit-link-modal';
        editLinkModal.className = 'local-graph-modal';
        editLinkModal.innerHTML = `
            <div class="local-graph-modal-content">
                <h3>Edit Link</h3>
                <form id="edit-link-form">
                    <div class="form-group">
                        <label>Weight:</label>
                        <input type="number" id="edit-link-weight" min="0.1" max="100" step="0.1" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Description:</label>
                        <input type="text" id="edit-link-description" placeholder="Optional description...">
                    </div>
                    
                    <div class="modal-actions">
                        <button type="submit" class="primary-btn">Save Changes</button>
                        <button type="button" id="cancel-edit-link" class="secondary-btn">Cancel</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(editLinkModal);
    }
    
    function setupEventHandlers() {
        // Add null checks for all DOM elements
        const closeBtn = document.getElementById('close-local-graph');
        const createFirstBtn = document.getElementById('create-first-node-btn');
        const goToOutlinerBtn = document.getElementById('go-to-outliner-btn');
        const checkAgainBtn = document.getElementById('check-nodes-again-btn');
        const centerSearch = document.getElementById('center-node-search');
        const exploreBtn = document.getElementById('explore-graph-btn');
        const changeCenterBtn = document.getElementById('change-center-btn');
        const adjustDistanceBtn = document.getElementById('adjust-distance-btn');
        const addNodeBtn = document.getElementById('add-node-btn');
        const refreshBtn = document.getElementById('refresh-graph-btn');
        const distanceForm = document.getElementById('distance-adjustment-form');
        const cancelDistanceBtn = document.getElementById('cancel-distance-adjustment');
        const addNodeForm = document.getElementById('add-node-form');
        const cancelAddNodeBtn = document.getElementById('cancel-add-node');
        const linkToCenterCheckbox = document.getElementById('link-to-center');
        const maxDistanceInput = document.getElementById('max-distance-input');
        const maxDepthInput = document.getElementById('max-depth-input');
        const saveToQuickAccessBtn = document.getElementById('save-to-quick-access-btn');
        
        // Only add event listeners if elements exist
        if (closeBtn) closeBtn.addEventListener('click', hide);
        if (createFirstBtn) createFirstBtn.addEventListener('click', createFirstNode);
        if (goToOutlinerBtn) goToOutlinerBtn.addEventListener('click', goToOutliner);
        if (checkAgainBtn) checkAgainBtn.addEventListener('click', checkNodesAgain);
        if (centerSearch) centerSearch.addEventListener('input', handleCenterNodeSearch);
        if (exploreBtn) exploreBtn.addEventListener('click', exploreGraph);
        if (changeCenterBtn) changeCenterBtn.addEventListener('click', changeCenterNode);
        if (adjustDistanceBtn) adjustDistanceBtn.addEventListener('click', openDistanceModal);
        if (addNodeBtn) addNodeBtn.addEventListener('click', openAddNodeModal);
        if (refreshBtn) refreshBtn.addEventListener('click', refreshGraph);
        if (distanceForm) distanceForm.addEventListener('submit', applyDistanceAdjustment);
        if (cancelDistanceBtn) cancelDistanceBtn.addEventListener('click', closeDistanceModal);
        if (addNodeForm) addNodeForm.addEventListener('submit', createNewNode);
        if (cancelAddNodeBtn) cancelAddNodeBtn.addEventListener('click', closeAddNodeModal);
        if (saveToQuickAccessBtn) saveToQuickAccessBtn.addEventListener('click', saveCurrentCenterToQuickAccess);
        
        if (linkToCenterCheckbox) {
            linkToCenterCheckbox.addEventListener('change', function(e) {
                const linkOptions = document.getElementById('link-options');
                if (linkOptions) {
                    linkOptions.style.display = e.target.checked ? 'block' : 'none';
                }
            });
        }
        
        if (maxDistanceInput) maxDistanceInput.addEventListener('change', updateDistanceFromInput);
        if (maxDepthInput) maxDepthInput.addEventListener('change', updateDepthFromInput);
        
        // Add these new functions to handle flexible linking
        setupLinkingHandlers();
        
        // Add graph search handler
        const graphSearchInput = document.getElementById('graph-node-search');
        if (graphSearchInput) {
            graphSearchInput.addEventListener('input', handleGraphNodeSearch);
        }
        
        // Edit node modal handlers
        const editNodeForm = document.getElementById('edit-node-form');
        const cancelEditNodeBtn = document.getElementById('cancel-edit-node');
        const addNewLinkBtn = document.getElementById('add-new-link-btn');
        
        if (editNodeForm) editNodeForm.addEventListener('submit', saveNodeEdits);
        if (cancelEditNodeBtn) cancelEditNodeBtn.addEventListener('click', closeEditNodeModal);
        if (addNewLinkBtn) addNewLinkBtn.addEventListener('click', addNewLink);
        
        // Add new event handler for layout mode
        const layoutModeSelect = document.getElementById('layout-mode-select');
        if (layoutModeSelect) {
            layoutModeSelect.addEventListener('change', handleLayoutModeChange);
        }
        
        // Edit link modal handlers
        const editLinkForm = document.getElementById('edit-link-form');
        const cancelEditLinkBtn = document.getElementById('cancel-edit-link');
        
        if (editLinkForm) editLinkForm.addEventListener('submit', saveEditedLink);
        if (cancelEditLinkBtn) cancelEditLinkBtn.addEventListener('click', closeEditLinkModal);
        
        // Setup manual placement handlers
        setupManualPlacementHandlers();
    }
    
    function handleLayoutModeChange(e) {
        const newMode = e.target.value;
        
        if (newMode === 'manual' && currentLayoutMode !== 'manual') {
            // Switching to manual mode
            if (graphData) {
                startManualPlacement();
            }
        } else if (currentLayoutMode === 'manual' && newMode !== 'manual') {
            // Switching away from manual mode
            exitManualPlacement();
        }
        
        currentLayoutMode = newMode;
        
        if (graphData && currentLayoutMode !== 'manual') {
            renderGraph(); // Re-render with new layout
        }
    }
    
    async function handleCenterNodeSearch(e) {
        const query = e.target.value.trim();
        const dropdown = document.getElementById('center-node-dropdown');
        const dropdownContent = dropdown.querySelector('.node-dropdown-content');
        
        if (query.length < 2) {
            dropdownContent.innerHTML = '<div class="no-results-message">Start typing to search pool nodes...</div>';
            dropdown.classList.remove('show');
            return;
        }
        
        try {
            // CHANGED: Search only within pool nodes instead of all nodes
            const response = await fetch(`/api/local-graph/pool/search?q=${encodeURIComponent(query)}&limit=10`);
            const results = await response.json();
            
            if (results.length === 0) {
                dropdownContent.innerHTML = `
                    <div class="no-results-message">No nodes found in pool matching "${query}"</div>
                    <div class="create-node-suggestion">
                        <button onclick="LocalGraphManager.createNodeFromSearch('${query.replace(/'/g, '\\\'')}')" class="create-suggestion-btn">
                            Create node: "${query}" and add to pool
                        </button>
                    </div>
                `;
            } else {
                dropdownContent.innerHTML = results.map(node => `
                    <div class="node-option" data-node-id="${node.id}">
                        <div class="node-option-content">${node.content || 'Untitled'}</div>
                        ${node.content_zh ? `<div class="node-option-content-zh">${node.content_zh}</div>` : ''}
                        <div class="node-option-meta">In pool since ${new Date(node.added_at).toLocaleDateString()}</div>
                    </div>
                `).join('');
                
                // Add click handlers
                dropdownContent.querySelectorAll('.node-option').forEach(option => {
                    option.addEventListener('click', function() {
                        selectCenterNode(this.dataset.nodeId, this.querySelector('.node-option-content').textContent);
                    });
                });
            }
            
            dropdown.classList.add('show');
        } catch (error) {
            console.error('Error searching pool nodes:', error);
            dropdownContent.innerHTML = '<div class="error-message">Error searching pool nodes</div>';
        }
    }
    
    function selectCenterNode(nodeId, nodeContent) {
        centerNodeId = nodeId;
        
        const centerSearch = document.getElementById('center-node-search');
        const dropdown = document.getElementById('center-node-dropdown');
        const exploreBtn = document.getElementById('explore-graph-btn');
        
        if (centerSearch) centerSearch.value = nodeContent;
        if (dropdown) dropdown.classList.remove('show');
        if (exploreBtn) exploreBtn.disabled = false;
    }
    
    function updateDistanceFromInput(e) {
        maxDistance = parseFloat(e.target.value) || 5;
    }
    
    function updateDepthFromInput(e) {
        maxDepth = parseInt(e.target.value) || 3;
    }
    
    async function exploreGraph() {
        if (!centerNodeId) {
            alert('Please select a center node first');
            return;
        }
        
        try {
            const response = await fetch(`/api/local-graph/center/${centerNodeId}?maxDistance=${maxDistance}&maxDepth=${maxDepth}`);
            graphData = await response.json();
            
            // Update UI
            document.getElementById('current-center-node').textContent = graphData.centerNode.content || 'Untitled';
            document.getElementById('distance-display').textContent = `Distance: ${maxDistance}, Depth: ${maxDepth}`;
            
            // Switch to visualization phase
            document.getElementById('center-selection-phase').classList.remove('active');
            document.getElementById('graph-visualization-phase').classList.add('active');
            
            // Render graph
            renderGraph();
            updateStats();
            updateDistanceLevels();
            
            // Load pool status for all nodes
            if (graphData && graphData.nodes) {
                graphData.nodes.forEach(node => checkNodePoolStatus(node.id));
            }
            
        } catch (error) {
            console.error('Error exploring graph:', error);
            alert('Error loading graph data');
        }
    }
    
    function renderGraph() {
        if (currentLayoutMode === 'manual' && manualPlacementState.isActive) {
            renderManualGraph();
            return;
        }
        
        const canvasArea = document.getElementById('local-graph-canvas');
        
        const nodes = graphData.nodes || [];
        const links = graphData.links || [];
        const distances = graphData.distances || {};
        
        // Clear canvas
        canvasArea.innerHTML = '';
        
        // Create SVG with zoom and pan capabilities
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.style.background = '#fff';
        svg.style.cursor = 'grab';
        
        // Create main group for zoom/pan transformations
        const mainGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        mainGroup.setAttribute('id', 'main-graph-group');
        
        // Zoom and pan state
        let currentZoom = 1;
        let currentPanX = 0;
        let currentPanY = 0;
        let isPanning = false;
        let panStartX = 0;
        let panStartY = 0;
        let panStartPanX = 0;
        let panStartPanY = 0;
        
        // Node dragging state
        let draggedNode = null;
        let dragStartX = 0;
        let dragStartY = 0;
        let dragOffsetX = 0;
        let dragOffsetY = 0;
        let hasDragged = false;
        
        // Zoom constraints
        const MIN_ZOOM = 0.2;
        const MAX_ZOOM = 5;
        
        // Add gradient definitions for elegant styling
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        
        // Silver gradient for pool rings
        const silverGradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        silverGradient.setAttribute('id', 'silverGradient');
        silverGradient.setAttribute('x1', '0%');
        silverGradient.setAttribute('y1', '0%');
        silverGradient.setAttribute('x2', '100%');
        silverGradient.setAttribute('y2', '100%');
        
        const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop1.setAttribute('offset', '0%');
        stop1.setAttribute('stop-color', '#f8fafc');
        stop1.setAttribute('stop-opacity', '1');
        
        const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop2.setAttribute('offset', '50%');
        stop2.setAttribute('stop-color', '#cbd5e1');
        stop2.setAttribute('stop-opacity', '1');
        
        const stop3 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop3.setAttribute('offset', '100%');
        stop3.setAttribute('stop-color', '#94a3b8');
        stop3.setAttribute('stop-opacity', '1');
        
        silverGradient.appendChild(stop1);
        silverGradient.appendChild(stop2);
        silverGradient.appendChild(stop3);
        defs.appendChild(silverGradient);
        
        // Subtle glow filter for pool nodes
        const glowFilter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
        glowFilter.setAttribute('id', 'poolGlow');
        glowFilter.setAttribute('x', '-50%');
        glowFilter.setAttribute('y', '-50%');
        glowFilter.setAttribute('width', '200%');
        glowFilter.setAttribute('height', '200%');
        
        const feGaussianBlur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
        feGaussianBlur.setAttribute('stdDeviation', '2');
        feGaussianBlur.setAttribute('result', 'coloredBlur');
        
        const feMerge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
        const feMergeNode1 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
        feMergeNode1.setAttribute('in', 'coloredBlur');
        const feMergeNode2 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
        feMergeNode2.setAttribute('in', 'SourceGraphic');
        
        feMerge.appendChild(feMergeNode1);
        feMerge.appendChild(feMergeNode2);
        glowFilter.appendChild(feGaussianBlur);
        glowFilter.appendChild(feMerge);
        defs.appendChild(glowFilter);
        
        svg.appendChild(defs);
        
        // Canvas dimensions
        const centerX = 400;
        const centerY = 300;
        const maxRadius = 250;
        
        // Choose layout algorithm based on current mode
        const nodePositions = currentLayoutMode === 'distance-based' 
            ? calculateDistanceBasedLayout(nodes, links, distances, centerX, centerY, maxRadius)
            : currentLayoutMode === 'hybrid'
            ? calculateHybridLayout(nodes, links, distances, centerX, centerY, maxRadius)
            : calculateCircularLayout(nodes, distances, centerX, centerY, maxRadius);
        
        // Add quadrant divider lines for distance-based layout
        if (currentLayoutMode === 'distance-based') {
            addQuadrantDividers(mainGroup, centerX, centerY);
        } else if (currentLayoutMode === 'hybrid') {
            addConcentricCircleGuides(mainGroup, centerX, centerY, nodes, links);
        }
        
        // Create links group
        const linksGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        linksGroup.setAttribute('id', 'links-group');
        
        // Create nodes group
        const nodesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        nodesGroup.setAttribute('id', 'nodes-group');
        
        // Draw links with distance labels
        const linkElements = [];
        links.forEach(link => {
            let sourcePos = nodePositions[link.from_node_id];
            let targetPos = nodePositions[link.to_node_id];
            
            // CRITICAL FIX: Validate positions before creating links
            if (!sourcePos || !targetPos) {
                console.error(`Missing positions for link ${link.from_node_id} -> ${link.to_node_id}`);
                return; // Skip this link
            }
            
            // Validate and fix positions if they contain NaN
            if (!isFinite(sourcePos.x) || !isFinite(sourcePos.y)) {
                console.error(`Invalid source position for link ${link.from_node_id} -> ${link.to_node_id}:`, sourcePos);
                sourcePos = { x: 400, y: 300 }; // Safe fallback
            }
            
            if (!isFinite(targetPos.x) || !isFinite(targetPos.y)) {
                console.error(`Invalid target position for link ${link.from_node_id} -> ${link.to_node_id}:`, targetPos);
                targetPos = { x: 450, y: 350 }; // Safe fallback
            }
            
            const linkData = createLinkElement(link, sourcePos, targetPos, currentLayoutMode);
            linksGroup.appendChild(linkData.linkGroup);
            linkElements.push(linkData);
        });
        
        // Draw nodes with drag functionality
        const nodeElements = [];
        nodes.forEach(node => {
            const pos = nodePositions[node.id];
            if (!pos) {
                console.error(`No position found for node ${node.id}`);
                return;
            }
            
            // CRITICAL FIX: Validate position before creating node element
            if (!isFinite(pos.x) || !isFinite(pos.y)) {
                console.error(`Invalid position for node ${node.id}:`, pos);
                // Create a safe fallback position
                const fallbackAngle = Math.random() * 2 * Math.PI;
                const fallbackRadius = 200;
                pos.x = centerX + Math.cos(fallbackAngle) * fallbackRadius;
                pos.y = centerY + Math.sin(fallbackAngle) * fallbackRadius;
                console.log(`Using fallback position for node ${node.id}:`, pos);
            }
            
            const nodeData = createNodeElement(node, pos, distances);
            nodeElements.push(nodeData);
            nodesGroup.appendChild(nodeData.element);
        });
        
        // Add groups to main group
        mainGroup.appendChild(linksGroup);
        mainGroup.appendChild(nodesGroup);
        svg.appendChild(mainGroup);
        
        // Function to update transform
        function updateTransform(mainGroup, currentPanX, currentPanY, currentZoom) {
            mainGroup.setAttribute('transform', 
                `translate(${currentPanX}, ${currentPanY}) scale(${currentZoom})`
            );
        }
        
        // Function to update link positions
        function updateLinks(linkElements, nodeElements) {
            linkElements.forEach(linkData => {
                const fromNode = nodeElements.find(n => n.nodeId === linkData.fromNodeId);
                const toNode = nodeElements.find(n => n.nodeId === linkData.toNodeId);
                
                if (fromNode && toNode) {
                    const fromPos = fromNode.position;
                    const toPos = toNode.position;
                    
                    // CRITICAL FIX: Validate positions before updating link
                    const safeFromX = isFinite(fromPos.x) ? fromPos.x : 400;
                    const safeFromY = isFinite(fromPos.y) ? fromPos.y : 300;
                    const safeToX = isFinite(toPos.x) ? toPos.x : 450;
                    const safeToY = isFinite(toPos.y) ? toPos.y : 350;
                    
                    // Update line position
                    linkData.element.setAttribute('x1', safeFromX);
                    linkData.element.setAttribute('y1', safeFromY);
                    linkData.element.setAttribute('x2', safeToX);
                    linkData.element.setAttribute('y2', safeToY);
                    
                    // Update label position
                    const midX = (safeFromX + safeToX) / 2;
                    const midY = (safeFromY + safeToY) / 2;
                    
                    // Update label background position
                    const labelText = linkData.weight % 1 === 0 ? linkData.weight.toString() : linkData.weight.toFixed(1);
                    const textWidth = labelText.length * 6 + 4;
                    const textHeight = 12;
                    
                    linkData.labelBg.setAttribute('x', midX - textWidth / 2);
                    linkData.labelBg.setAttribute('y', midY - textHeight / 2);
                    
                    // Update label text position
                    linkData.labelText.setAttribute('x', midX);
                    linkData.labelText.setAttribute('y', midY + 3);
                }
            });
        }
        
        // Function to update node visual position
        function updateNodePosition(nodeData) {
            const pos = nodeData.position;
            
            // CRITICAL FIX: Validate position before updating SVG attributes
            const safeX = isFinite(pos.x) ? pos.x : 400;
            const safeY = isFinite(pos.y) ? pos.y : 300;
            
            // Update circle position
            nodeData.circle.setAttribute('cx', safeX);
            nodeData.circle.setAttribute('cy', safeY);
            
            // Update text position
            const isCenter = nodeData.nodeId === centerNodeId;
            nodeData.text.setAttribute('x', safeX);
            nodeData.text.setAttribute('y', safeY - (isCenter ? 20 : 16));
            
            // Update pool indicators if they exist
            nodeData.poolRings.forEach(ring => {
                ring.setAttribute('cx', safeX);
                ring.setAttribute('cy', safeY);
            });
            
            // Update the stored position to the safe values
            nodeData.position.x = safeX;
            nodeData.position.y = safeY;
        }
        
        // Function to convert screen coordinates to SVG coordinates
        function screenToSVG(screenX, screenY, svg, currentPanX, currentPanY, currentZoom) {
            const rect = svg.getBoundingClientRect();
            const svgX = (screenX - rect.left - currentPanX) / currentZoom;
            const svgY = (screenY - rect.top - currentPanY) / currentZoom;
            return { x: svgX, y: svgY };
        }
        
        // Mouse event handlers
        svg.addEventListener('mousedown', (e) => {
            e.preventDefault();
            
            // Check if we clicked on a node
            const target = e.target.closest('g[data-node-id]');
            if (target) {
                // Start node dragging
                const nodeId = target.getAttribute('data-node-id');
                draggedNode = nodeElements.find(n => n.nodeId === nodeId);
                
                if (draggedNode) {
                    const svgCoords = screenToSVG(e.clientX, e.clientY, svg, currentPanX, currentPanY, currentZoom);
                    dragStartX = e.clientX;
                    dragStartY = e.clientY;
                    dragOffsetX = svgCoords.x - draggedNode.position.x;
                    dragOffsetY = svgCoords.y - draggedNode.position.y;
                    hasDragged = false;
                    
                    draggedNode.element.style.cursor = 'grabbing';
                    
                    // Bring node to front
                    nodesGroup.appendChild(draggedNode.element);
                }
            } else {
                // Start canvas panning
                isPanning = true;
                svg.style.cursor = 'grabbing';
                
                panStartX = e.clientX;
                panStartY = e.clientY;
                panStartPanX = currentPanX;
                panStartPanY = currentPanY;
            }
        });
        
        svg.addEventListener('mousemove', (e) => {
            if (draggedNode) {
                // Handle node dragging
                const deltaX = e.clientX - dragStartX;
                const deltaY = e.clientY - dragStartY;
                
                // Check if we've moved enough to consider this a drag
                if (!hasDragged && (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3)) {
                    hasDragged = true;
                }
                
                if (hasDragged) {
                    const svgCoords = screenToSVG(e.clientX, e.clientY, svg, currentPanX, currentPanY, currentZoom);
                    draggedNode.position.x = svgCoords.x - dragOffsetX;
                    draggedNode.position.y = svgCoords.y - dragOffsetY;
                    
                    updateNodePosition(draggedNode);
                    updateLinks(linkElements, nodeElements);
                }
            } else if (isPanning) {
                // Handle canvas panning
                const deltaX = e.clientX - panStartX;
                const deltaY = e.clientY - panStartY;
                
                currentPanX = panStartPanX + deltaX;
                currentPanY = panStartPanY + deltaY;
                
                updateTransform(mainGroup, currentPanX, currentPanY, currentZoom);
            }
        });
        
        svg.addEventListener('mouseup', (e) => {
            if (draggedNode) {
                draggedNode.element.style.cursor = 'move';
                
                // If we didn't drag, treat it as a click
                if (!hasDragged) {
                    selectNode(draggedNode.node);
                }
                
                draggedNode = null;
                hasDragged = false;
            }
            
            if (isPanning) {
                isPanning = false;
                svg.style.cursor = 'grab';
            }
        });
        
        // Add right-click context menu to nodes
        nodeElements.forEach(nodeData => {
            nodeData.element.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                showNodeContextMenu(e, nodeData.node);
            });
        });
        
        // Zoom functionality
        svg.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            const rect = svg.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Calculate zoom
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentZoom * zoomFactor));
            
            if (newZoom !== currentZoom) {
                // Zoom towards mouse position
                const zoomRatio = newZoom / currentZoom;
                
                currentPanX = mouseX - (mouseX - currentPanX) * zoomRatio;
                currentPanY = mouseY - (mouseY - currentPanY) * zoomRatio;
                currentZoom = newZoom;
                
                updateTransform(mainGroup, currentPanX, currentPanY, currentZoom);
                updateZoomInfo();
            }
        });
        
        // Touch support for mobile
        let touchStartDistance = 0;
        let touchStartZoom = 1;
        let touchStartPan = { x: 0, y: 0 };
        
        svg.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                // Pinch zoom start
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                touchStartDistance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                );
                touchStartZoom = currentZoom;
                touchStartPan = { x: currentPanX, y: currentPanY };
            }
        });
        
        svg.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                const currentDistance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                );
                
                if (touchStartDistance > 0) {
                    const zoomRatio = currentDistance / touchStartDistance;
                    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, touchStartZoom * zoomRatio));
                    
                    if (newZoom !== currentZoom) {
                        currentZoom = newZoom;
                        updateTransform(mainGroup, currentPanX, currentPanY, currentZoom);
                        updateZoomInfo();
                    }
                }
            }
        });
        
        // Function to update zoom info in UI
        function updateZoomInfo() {
            const zoomPercent = Math.round(currentZoom * 100);
            const distanceDisplay = document.getElementById('distance-display');
            if (distanceDisplay) {
                const originalText = distanceDisplay.textContent.split(' | ')[0];
                distanceDisplay.textContent = `${originalText} | Zoom: ${zoomPercent}%`;
            }
        }
        
        // Add zoom controls to the UI
        addZoomControls();
        
        // Initial transform
        updateTransform(mainGroup, currentPanX, currentPanY, currentZoom);
        updateZoomInfo();
        
        canvasArea.appendChild(svg);
        
        // Add zoom controls function
        function addZoomControls() {
            const graphActions = document.querySelector('.graph-actions');
            if (!graphActions) return;
            
            // Check if zoom controls already exist
            if (graphActions.querySelector('.zoom-controls')) return;
            
            const zoomControls = document.createElement('div');
            zoomControls.className = 'zoom-controls';
            zoomControls.style.cssText = `
                display: flex;
                gap: 5px;
                align-items: center;
                margin-left: 10px;
            `;
            
            const zoomInBtn = document.createElement('button');
            zoomInBtn.className = 'secondary-btn';
            zoomInBtn.textContent = '+';
            zoomInBtn.title = 'Zoom In';
            zoomInBtn.style.cssText = `
                width: 30px;
                height: 30px;
                padding: 0;
                font-size: 16px;
                font-weight: bold;
            `;
            
            const zoomOutBtn = document.createElement('button');
            zoomOutBtn.className = 'secondary-btn';
            zoomOutBtn.textContent = '−';
            zoomOutBtn.title = 'Zoom Out';
            zoomOutBtn.style.cssText = `
                width: 30px;
                height: 30px;
                padding: 0;
                font-size: 16px;
                font-weight: bold;
            `;
            
            const resetBtn = document.createElement('button');
            resetBtn.className = 'secondary-btn';
            resetBtn.textContent = '⌂';
            resetBtn.title = 'Reset View';
            resetBtn.style.cssText = `
                width: 30px;
                height: 30px;
                padding: 0;
                font-size: 14px;
            `;
            
            // Event handlers
            zoomInBtn.addEventListener('click', () => {
                const newZoom = Math.min(MAX_ZOOM, currentZoom * 1.2);
                if (newZoom !== currentZoom) {
                    currentZoom = newZoom;
                    updateTransform(mainGroup, currentPanX, currentPanY, currentZoom);
                    updateZoomInfo();
                }
            });
            
            zoomOutBtn.addEventListener('click', () => {
                const newZoom = Math.max(MIN_ZOOM, currentZoom / 1.2);
                if (newZoom !== currentZoom) {
                    currentZoom = newZoom;
                    updateTransform(mainGroup, currentPanX, currentPanY, currentZoom);
                    updateZoomInfo();
                }
            });
            
            resetBtn.addEventListener('click', () => {
                currentZoom = 1;
                currentPanX = 0;
                currentPanY = 0;
                updateTransform(mainGroup, currentPanX, currentPanY, currentZoom);
                updateZoomInfo();
            });
            
            zoomControls.appendChild(zoomOutBtn);
            zoomControls.appendChild(resetBtn);
            zoomControls.appendChild(zoomInBtn);
            
            graphActions.appendChild(zoomControls);
        }
    }
    
    function calculateCircularLayout(nodes, distances, centerX, centerY, maxRadius) {
        // Group nodes by distance
        const nodesByDistance = {};
        nodes.forEach(node => {
            const distance = distances[node.id] || 0;
            if (!nodesByDistance[distance]) {
                nodesByDistance[distance] = [];
            }
            nodesByDistance[distance].push(node);
        });
        
        // Position nodes in circular layout
        const nodePositions = {};
        Object.keys(nodesByDistance).forEach(distance => {
            const dist = parseFloat(distance);
            const nodesAtDistance = nodesByDistance[distance];
            const radius = (dist / maxDistance) * maxRadius;
            
            nodesAtDistance.forEach((node, index) => {
                if (dist === 0) {
                    // Center node
                    nodePositions[node.id] = { x: centerX, y: centerY };
                } else {
                    // Arrange in circle
                    const angle = (index / nodesAtDistance.length) * 2 * Math.PI;
                    nodePositions[node.id] = {
                        x: centerX + Math.cos(angle) * radius,
                        y: centerY + Math.sin(angle) * radius
                    };
                }
            });
        });
        
        return nodePositions;
    }
    
    function calculateDistanceBasedLayout(nodes, links, distances, centerX, centerY, maxRadius) {
        const nodePositions = {};
        const BASE_EDGE_SCALE_FACTOR = 40; // Base scale factor to convert edge weights to pixels
        
        // Function to get scale factor based on depth
        function getScaleFactorForDepth(depth) {
            // For nodes at depth 1 and 2 hops, use 3x multiplier to push them away
            if (depth <= 2) {
                return BASE_EDGE_SCALE_FACTOR * 3; // 120 pixels per weight unit
            }
            // For nodes at depth > 2, use normal multiplier
            return BASE_EDGE_SCALE_FACTOR; // 40 pixels per weight unit
        }
        
        // Start with center node at origin
        nodePositions[centerNodeId] = { x: centerX, y: centerY };
        
        // Build adjacency list with weights
        const adjacencyList = new Map();
        links.forEach(link => {
            if (!adjacencyList.has(link.from_node_id)) {
                adjacencyList.set(link.from_node_id, []);
            }
            if (!adjacencyList.has(link.to_node_id)) {
                adjacencyList.set(link.to_node_id, []);
            }
            
            adjacencyList.get(link.from_node_id).push({
                nodeId: link.to_node_id,
                weight: link.weight || 1.0,
                linkId: link.id
            });
            adjacencyList.get(link.to_node_id).push({
                nodeId: link.from_node_id,
                weight: link.weight || 1.0,
                linkId: link.id
            });
        });
        
        // Track which nodes have been positioned and their depths
        const positioned = new Set([centerNodeId]);
        const nodeDepths = new Map();
        nodeDepths.set(centerNodeId, 0);
        const toPosition = [];
        
        // Start with direct neighbors of center node
        const centerNeighbors = adjacencyList.get(centerNodeId) || [];
        centerNeighbors.forEach(neighbor => {
            toPosition.push({
                nodeId: neighbor.nodeId,
                fromNodeId: centerNodeId,
                edgeWeight: neighbor.weight,
                priority: 1 // Distance from center in hops
            });
        });
        
        // Sort by priority (closer to center first) and then by edge weight
        toPosition.sort((a, b) => {
            if (a.priority !== b.priority) return a.priority - b.priority;
            return a.edgeWeight - b.edgeWeight;
        });
        
        // Assign quadrants to minimize edge crossings
        const quadrantAssignments = {};
        quadrantAssignments[centerNodeId] = -1; // Center node has no quadrant
        let currentQuadrant = 0;
        
        // Process nodes level by level to maintain edge length constraints
        while (toPosition.length > 0) {
            const current = toPosition.shift();
            
            if (positioned.has(current.nodeId)) continue;
            
            const fromPos = nodePositions[current.fromNodeId];
            if (!fromPos) continue; // Skip if parent not positioned yet
            
            // Store the depth for this node
            nodeDepths.set(current.nodeId, current.priority);
            
            // Calculate desired distance based on edge weight and dynamic scaling
            const scaleFactorForThisDepth = getScaleFactorForDepth(current.priority);
            const desiredDistance = current.edgeWeight * scaleFactorForThisDepth;
            
            // Find best angle to minimize conflicts and avoid quadrant line crossings
            let bestAngle = findBestAngleForNode(
                current.nodeId,
                fromPos,
                desiredDistance,
                nodePositions,
                links,
                positioned,
                centerX,
                centerY
            );
            
            // Position the node
            const newPos = {
                x: fromPos.x + Math.cos(bestAngle) * desiredDistance,
                y: fromPos.y + Math.sin(bestAngle) * desiredDistance
            };
            
            nodePositions[current.nodeId] = newPos;
            positioned.add(current.nodeId);
            
            // Assign quadrant based on position relative to center
            quadrantAssignments[current.nodeId] = getQuadrantForPosition(newPos, centerX, centerY);
            
            // Add unpositioned neighbors of this node to the queue
            const neighbors = adjacencyList.get(current.nodeId) || [];
            neighbors.forEach(neighbor => {
                if (!positioned.has(neighbor.nodeId) && 
                    !toPosition.some(item => item.nodeId === neighbor.nodeId)) {
                    toPosition.push({
                        nodeId: neighbor.nodeId,
                        fromNodeId: current.nodeId,
                        edgeWeight: neighbor.weight,
                        priority: current.priority + 1
                    });
                }
            });
            
            // Re-sort queue by priority
            toPosition.sort((a, b) => {
                if (a.priority !== b.priority) return a.priority - b.priority;
                return a.edgeWeight - b.edgeWeight;
            });
        }
        
        // Apply force-directed refinement to improve layout while preserving edge lengths
        refineEdgeLengthLayoutWithDynamicScaling(nodePositions, links, adjacencyList, nodeDepths, getScaleFactorForDepth, centerNodeId, centerX, centerY);
        
        return nodePositions;
    }
    
    function refineEdgeLengthLayoutWithDynamicScaling(nodePositions, links, adjacencyList, nodeDepths, getScaleFactorForDepth, centerNodeId, centerX, centerY) {
        const MAX_ITERATIONS = 50;
        const STEP_SIZE = 0.5;
        
        for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
            const forces = {};
            
            // Initialize forces
            Object.keys(nodePositions).forEach(nodeId => {
                forces[nodeId] = { x: 0, y: 0 };
            });
            
            // Apply forces based on edge length constraints with dynamic scaling
            links.forEach(link => {
                const pos1 = nodePositions[link.from_node_id];
                const pos2 = nodePositions[link.to_node_id];
                
                if (!pos1 || !pos2) return;
                
                const currentDistance = Math.sqrt(
                    Math.pow(pos2.x - pos1.x, 2) + 
                    Math.pow(pos2.y - pos1.y, 2)
                );
                
                // Determine which node's depth to use for scaling
                // Use the target node's depth (the one further from center)
                const fromDepth = nodeDepths.get(link.from_node_id) || 0;
                const toDepth = nodeDepths.get(link.to_node_id) || 0;
                const edgeDepth = Math.max(fromDepth, toDepth); // Use the deeper node's depth
                
                const scaleFactor = getScaleFactorForDepth(edgeDepth);
                const desiredDistance = (link.weight || 1.0) * scaleFactor;
                const difference = currentDistance - desiredDistance;
                
                if (Math.abs(difference) > 1) { // Only adjust if significant difference
                    const forceStrength = difference * 0.1;
                    
                    const dx = pos2.x - pos1.x;
                    const dy = pos2.y - pos1.y;
                    
                    if (currentDistance > 0) {
                        const unitX = dx / currentDistance;
                        const unitY = dy / currentDistance;
                        
                        const forceX = unitX * forceStrength;
                        const forceY = unitY * forceStrength;
                        
                        // Don't move the center node
                        if (link.from_node_id !== centerNodeId) {
                            forces[link.from_node_id].x += forceX;
                            forces[link.from_node_id].y += forceY;
                        }
                        if (link.to_node_id !== centerNodeId) {
                            forces[link.to_node_id].x -= forceX;
                            forces[link.to_node_id].y -= forceY;
                        }
                    }
                }
            });
            
            // Apply forces with damping
            let maxForce = 0;
            Object.keys(forces).forEach(nodeId => {
                if (nodeId === centerNodeId) return; // Don't move center node
                
                const force = forces[nodeId];
                const forceMagnitude = Math.sqrt(force.x * force.x + force.y * force.y);
                maxForce = Math.max(maxForce, forceMagnitude);
                
                nodePositions[nodeId].x += force.x * STEP_SIZE;
                nodePositions[nodeId].y += force.y * STEP_SIZE;
            });
            
            // Stop if forces are small enough
            if (maxForce < 0.1) break;
        }
    }
    
    function findBestAngleForNode(nodeId, fromPos, desiredDistance, existingPositions, links, positioned, centerX, centerY) {
        const candidateAngles = [];
        
        // Generate candidate angles
        for (let i = 0; i < 16; i++) {
            candidateAngles.push((i * Math.PI * 2) / 16);
        }
        
        let bestAngle = 0;
        let bestScore = -Infinity;
        
        for (const angle of candidateAngles) {
            const candidatePos = {
                x: fromPos.x + Math.cos(angle) * desiredDistance,
                y: fromPos.y + Math.sin(angle) * desiredDistance
            };
            
            let score = 0;
            
            // Score based on:
            // 1. Distance from other nodes (avoid overlaps)
            for (const [otherId, otherPos] of Object.entries(existingPositions)) {
                if (positioned.has(otherId)) {
                    const dist = Math.sqrt(
                        Math.pow(candidatePos.x - otherPos.x, 2) + 
                        Math.pow(candidatePos.y - otherPos.y, 2)
                    );
                    score += Math.min(dist / 50, 2); // Reward distance, cap benefit
                }
            }
            
            // 2. Avoid crossing quadrant dividers with shortest path edge
            const crossesDivider = checkIfEdgeCrossesQuadrantDivider(
                fromPos, candidatePos, centerX, centerY
            );
            if (crossesDivider) {
                score -= 5; // Heavy penalty for crossing quadrant lines
            }
            
            // 3. Prefer positions that keep graph compact
            const distanceFromCenter = Math.sqrt(
                Math.pow(candidatePos.x - centerX, 2) + 
                Math.pow(candidatePos.y - centerY, 2)
            );
            score -= distanceFromCenter / 100; // Small penalty for being far from center
            
            if (score > bestScore) {
                bestScore = score;
                bestAngle = angle;
            }
        }
        
        return bestAngle;
    }
    
    function checkIfEdgeCrossesQuadrantDivider(pos1, pos2, centerX, centerY) {
        // Check if line from pos1 to pos2 crosses vertical or horizontal divider through center
        
        // Vertical divider (x = centerX)
        if ((pos1.x < centerX && pos2.x > centerX) || (pos1.x > centerX && pos2.x < centerX)) {
            // Line crosses vertical divider, check if it's at the center region
            const t = (centerX - pos1.x) / (pos2.x - pos1.x);
            const intersectionY = pos1.y + t * (pos2.y - pos1.y);
            if (Math.abs(intersectionY - centerY) < 100) { // Within 100px of center
                return true;
            }
        }
        
        // Horizontal divider (y = centerY)
        if ((pos1.y < centerY && pos2.y > centerY) || (pos1.y > centerY && pos2.y < centerY)) {
            // Line crosses horizontal divider, check if it's at the center region
            const t = (centerY - pos1.y) / (pos2.y - pos1.y);
            const intersectionX = pos1.x + t * (pos2.x - pos1.x);
            if (Math.abs(intersectionX - centerX) < 100) { // Within 100px of center
                return true;
            }
        }
        
        return false;
    }
    
    function getQuadrantForPosition(pos, centerX, centerY) {
        if (pos.x >= centerX && pos.y <= centerY) return 0; // Top-right
        if (pos.x < centerX && pos.y <= centerY) return 1;  // Top-left
        if (pos.x < centerX && pos.y > centerY) return 2;   // Bottom-left
        return 3; // Bottom-right
    }
    
    function addQuadrantDividers(mainGroup, centerX, centerY) {
        // Create very light dotted lines for quadrant division
        const dividerStyle = {
            stroke: '#e5e7eb',
            strokeWidth: '1',
            strokeDasharray: '2,3',
            opacity: '0.4'
        };
        
        // Vertical divider line
        const verticalLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        verticalLine.setAttribute('x1', centerX);
        verticalLine.setAttribute('y1', centerY - 400);
        verticalLine.setAttribute('x2', centerX);
        verticalLine.setAttribute('y2', centerY + 400);
        Object.entries(dividerStyle).forEach(([key, value]) => {
            verticalLine.setAttribute(key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`), value);
        });
        
        // Horizontal divider line
        const horizontalLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        horizontalLine.setAttribute('x1', centerX - 400);
        horizontalLine.setAttribute('y1', centerY);
        horizontalLine.setAttribute('x2', centerX + 400);
        horizontalLine.setAttribute('y2', centerY);
        Object.entries(dividerStyle).forEach(([key, value]) => {
            horizontalLine.setAttribute(key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`), value);
        });
        
        // Add lines to the beginning so they appear behind nodes
        mainGroup.insertBefore(verticalLine, mainGroup.firstChild);
        mainGroup.insertBefore(horizontalLine, mainGroup.firstChild);
    }
    
    function createLinkElement(link, sourcePos, targetPos, layoutMode) {
        // CRITICAL FIX: Validate source and target positions
        if (!sourcePos || !targetPos || 
            !isFinite(sourcePos.x) || !isFinite(sourcePos.y) ||
            !isFinite(targetPos.x) || !isFinite(targetPos.y)) {
            
            console.error(`Invalid positions for link ${link.from_node_id} -> ${link.to_node_id}:`, 
                         { sourcePos, targetPos });
            
            // Use safe fallback positions
            sourcePos = sourcePos && isFinite(sourcePos.x) && isFinite(sourcePos.y) 
                ? sourcePos 
                : { x: 400, y: 300 };
            targetPos = targetPos && isFinite(targetPos.x) && isFinite(targetPos.y) 
                ? targetPos 
                : { x: 450, y: 350 };
        }
        
        // Calculate actual distance between nodes
        const actualDistance = Math.sqrt(
            Math.pow(targetPos.x - sourcePos.x, 2) + 
            Math.pow(targetPos.y - sourcePos.y, 2)
        );
        
        // In distance-based mode, check if visual distance matches weight with dynamic scaling
        const weight = link.weight || 1.0;
        let visuallyCorrect = true;
        let expectedDistance = weight * 40; // Default scale factor
        
        if (layoutMode === 'distance-based') {
            // We need to determine the expected distance based on the nodes' depths
            // For this, we need access to the graphData.depths
            const fromDepth = graphData.depths[link.from_node_id] || 0;
            const toDepth = graphData.depths[link.to_node_id] || 0;
            const edgeDepth = Math.max(fromDepth, toDepth);
            
            // Use the same scaling logic as in layout calculation
            const scaleFactor = edgeDepth <= 2 ? 120 : 40;
            expectedDistance = weight * scaleFactor;
            
            const tolerance = expectedDistance * 0.2; // 20% tolerance
            visuallyCorrect = Math.abs(actualDistance - expectedDistance) < tolerance;
        }
        
        // Create link line with visual feedback
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        
        // CRITICAL FIX: Use safe coordinates for line attributes
        const safeX1 = isFinite(sourcePos.x) ? sourcePos.x : 400;
        const safeY1 = isFinite(sourcePos.y) ? sourcePos.y : 300;
        const safeX2 = isFinite(targetPos.x) ? targetPos.x : 450;
        const safeY2 = isFinite(targetPos.y) ? targetPos.y : 350;
        
        line.setAttribute('x1', safeX1);
        line.setAttribute('y1', safeY1);
        line.setAttribute('x2', safeX2);
        line.setAttribute('y2', safeY2);
        
        // IMPROVED: Calculate line width based on connection strength (inverse of distance)
        // Smaller distance = stronger connection = thicker line
        function calculateLineWidth(weight) {
            // Base configuration
            const minWidth = 0.5;  // Minimum line width for very weak connections
            const maxWidth = 4.0;  // Maximum line width for very strong connections
            const baseWeight = 1.0; // Reference weight for normal connections
            
            // Calculate connection strength (inverse of distance)
            // For weight = 0.5 (close): strength = 2.0 (thick line)
            // For weight = 1.0 (normal): strength = 1.0 (medium line) 
            // For weight = 2.0 (far): strength = 0.5 (thin line)
            const connectionStrength = baseWeight / weight;
            
            // Map connection strength to line width with smooth scaling
            // Use logarithmic scaling to handle extreme values gracefully
            const scaledStrength = Math.log(connectionStrength + 1) / Math.log(2);
            const lineWidth = minWidth + (maxWidth - minWidth) * Math.min(1, Math.max(0, scaledStrength / 2));
            
            return Math.round(lineWidth * 10) / 10; // Round to 1 decimal place
        }
        
        const lineWidth = calculateLineWidth(weight);
        const hoverLineWidth = Math.min(lineWidth + 1.5, 6.0); // Cap hover width
        
        // Color coding for distance-based mode
        if (layoutMode === 'distance-based') {
            line.setAttribute('stroke', visuallyCorrect ? '#22c55e' : '#ef4444'); // Green if correct, red if not
            line.setAttribute('stroke-width', lineWidth);
        } else {
            line.setAttribute('stroke', '#e2e8f0');
            line.setAttribute('stroke-width', lineWidth);
        }
        
        line.setAttribute('opacity', '0.7');
        line.setAttribute('data-from-node', link.from_node_id);
        line.setAttribute('data-to-node', link.to_node_id);
        
        // Create distance label with improved positioning
        const midX = (safeX1 + safeX2) / 2;
        const midY = (safeY1 + safeY2) / 2;
        
        // Create background rectangle for better readability
        const labelBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        const labelText = weight % 1 === 0 ? weight.toString() : weight.toFixed(1);
        
        // Calculate label dimensions
        const textWidth = labelText.length * 7 + 6;
        const textHeight = 14;
        
        labelBg.setAttribute('x', midX - textWidth / 2);
        labelBg.setAttribute('y', midY - textHeight / 2);
        labelBg.setAttribute('width', textWidth);
        labelBg.setAttribute('height', textHeight);
        labelBg.setAttribute('fill', layoutMode === 'distance-based' 
            ? (visuallyCorrect ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)') 
            : 'rgba(255, 255, 255, 0.9)');
        labelBg.setAttribute('stroke', layoutMode === 'distance-based' 
            ? (visuallyCorrect ? '#16a34a' : '#dc2626') 
            : '#d1d5da');
        labelBg.setAttribute('stroke-width', '0.5');
        labelBg.setAttribute('rx', '3');
        labelBg.setAttribute('ry', '3');
        
        // Create distance text
        const distanceText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        distanceText.setAttribute('x', midX);
        distanceText.setAttribute('y', midY + 4);
        distanceText.setAttribute('text-anchor', 'middle');
        distanceText.setAttribute('font-size', '10');
        distanceText.setAttribute('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif');
        distanceText.setAttribute('font-weight', '700');
        distanceText.setAttribute('fill', layoutMode === 'distance-based' 
            ? 'white' 
            : '#374151');
        distanceText.textContent = labelText;
        distanceText.style.pointerEvents = 'none';
        distanceText.style.userSelect = 'none';
        
        // Add actual distance display for distance-based mode with dynamic scaling info
        if (layoutMode === 'distance-based') {
            const actualDistanceText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            actualDistanceText.setAttribute('x', midX);
            actualDistanceText.setAttribute('y', midY + 25);
            actualDistanceText.setAttribute('text-anchor', 'middle');
            actualDistanceText.setAttribute('font-size', '8');
            actualDistanceText.setAttribute('font-family', 'monospace');
            actualDistanceText.setAttribute('font-weight', '600');
            actualDistanceText.setAttribute('fill', visuallyCorrect ? '#16a34a' : '#dc2626');
            
            // Show the scaled distance with indication of which scaling was used
            const fromDepth = graphData.depths[link.from_node_id] || 0;
            const toDepth = graphData.depths[link.to_node_id] || 0;
            const edgeDepth = Math.max(fromDepth, toDepth);
            const scaleFactor = edgeDepth <= 2 ? 120 : 40;
            const scaledDistance = actualDistance / scaleFactor;
            const scaleIndicator = edgeDepth <= 2 ? '×3' : '×1';
            
            actualDistanceText.textContent = `${scaledDistance.toFixed(1)}${scaleIndicator}`;
            actualDistanceText.style.pointerEvents = 'none';
            actualDistanceText.style.userSelect = 'none';
            actualDistanceText.style.opacity = '0.8';
        }
        
        // Create link group
        const linkGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        linkGroup.setAttribute('class', 'link-group');
        linkGroup.appendChild(line);
        linkGroup.appendChild(labelBg);
        linkGroup.appendChild(distanceText);
        
        if (layoutMode === 'distance-based') {
            const actualDistanceText = linkGroup.querySelector('text:last-child');
            if (actualDistanceText) {
                linkGroup.appendChild(actualDistanceText);
            }
        }
        
        // Add hover effects with improved line width calculation
        linkGroup.addEventListener('mouseenter', () => {
            line.setAttribute('stroke-width', hoverLineWidth);
            line.setAttribute('opacity', '1');
            labelBg.setAttribute('stroke-width', '1');
        });
        
        linkGroup.addEventListener('mouseleave', () => {
            line.setAttribute('stroke-width', lineWidth);
            line.setAttribute('opacity', '0.7');
            labelBg.setAttribute('stroke-width', '0.5');
        });
        
        return {
            element: line,
            labelBg: labelBg,
            labelText: distanceText,
            linkGroup: linkGroup,
            fromNodeId: link.from_node_id,
            toNodeId: link.to_node_id,
            weight: weight
        };
    }
    
    function createNodeElement(node, pos, distances) {
        // CRITICAL FIX: Validate position at the start of function
        if (!pos || !isFinite(pos.x) || !isFinite(pos.y)) {
            console.error(`Invalid position passed to createNodeElement for node ${node.id}:`, pos);
            // Use a safe default position
            pos = { x: 400, y: 300 }; // Center position as fallback
        }
        
        const isCenter = node.id === centerNodeId;
        const distance = distances[node.id] || 0;
        const depth = graphData.depths[node.id] || 0;
        const isInPool = nodePoolStatus.get(node.id) || false;
        
        // Create node group for easier dragging
        const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        nodeGroup.setAttribute('data-node-id', node.id);
        nodeGroup.style.cursor = 'move';
        
        // Node circle with improved styling
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        
        // CRITICAL FIX: Ensure coordinates are valid numbers before setting attributes
        const safeX = isFinite(pos.x) ? pos.x : 400;
        const safeY = isFinite(pos.y) ? pos.y : 300;
        
        circle.setAttribute('cx', safeX);
        circle.setAttribute('cy', safeY);
        circle.setAttribute('r', isCenter ? 14 : 10);
        circle.setAttribute('class', 'main-node-circle');
        
        // Improved color scheme
        if (isCenter) {
            circle.setAttribute('fill', '#6366f1');
            circle.setAttribute('stroke', '#4f46e5');
            circle.setAttribute('stroke-width', '3');
        } else {
            circle.setAttribute('fill', getDistanceColor(distance));
            circle.setAttribute('stroke', isInPool ? '#94a3b8' : '#64748b');
            circle.setAttribute('stroke-width', isInPool ? '2' : '1.5');
            if (isInPool) {
                circle.setAttribute('filter', 'url(#poolGlow)');
            }
        }
        
        circle.style.transition = 'all 0.2s ease';
        
        // Add hover effects (removed draggedNode reference)
        circle.addEventListener('mouseenter', () => {
            circle.setAttribute('stroke-width', '4');
            circle.style.filter = 'brightness(1.1)';
        });
        
        circle.addEventListener('mouseleave', () => {
            circle.setAttribute('stroke-width', isCenter ? '3' : (isInPool ? '2' : '1.5'));
            circle.style.filter = isInPool ? 'url(#poolGlow)' : 'none';
        });
        
        nodeGroup.appendChild(circle);
        
        // Add pool indicators and other node elements...
        // (keeping the existing pool ring code)
        
        // Node label with improved styling
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', safeX);
        text.setAttribute('y', safeY - (isCenter ? 20 : 16));
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', isCenter ? '11' : '9');
        text.setAttribute('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif');
        text.setAttribute('font-weight', isCenter ? '600' : '500');
        text.setAttribute('fill', '#1e293b');
        text.textContent = (node.content || 'Untitled').substring(0, 20) + (node.content?.length > 20 ? '...' : '');
        text.style.pointerEvents = 'none';
        
        nodeGroup.appendChild(text);
        
        return {
            element: nodeGroup,
            circle: circle,
            text: text,
            nodeId: node.id,
            position: { x: safeX, y: safeY }, // Use safe coordinates
            node: node,
            poolRings: [] // Would contain pool ring elements
        };
    }
    
    function getDistanceColor(distance) {
        // Improved color scheme - softer, more professional
        const normalizedDistance = Math.min(distance / maxDistance, 1);
        
        // Use a more sophisticated color palette
        if (normalizedDistance < 0.3) {
            return '#10b981'; // Emerald for close nodes
        } else if (normalizedDistance < 0.6) {
            return '#3b82f6'; // Blue for medium distance
        } else if (normalizedDistance < 0.8) {
            return '#8b5cf6'; // Purple for far nodes
        } else {
            return '#ef4444'; // Red for very far nodes
        }
    }
    
    function selectNode(node) {
        const infoDiv = document.getElementById('selected-node-info');
        const distance = graphData.distances[node.id] || 0;
        const depth = graphData.depths[node.id] || 0; // Get depth from graphData
        const isInPool = nodePoolStatus.get(node.id) || false;
        
        infoDiv.innerHTML = `
            <div class="selected-node">
                <h5>${node.content || 'Untitled'}</h5>
                ${node.content_zh ? `<p class="node-content-zh">${node.content_zh}</p>` : ''}
                <div class="node-metrics">
                    <p class="node-distance">Distance: ${distance.toFixed(2)}</p>
                    <p class="node-depth">Depth: ${depth} hops</p>
                </div>
                <p class="node-pool-status" style="color: ${isInPool ? '#6366f1' : '#666'}; font-size: 12px; margin: 5px 0;">
                    ${isInPool ? '✓ In Local Graph Pool' : '○ Not in Pool'}
                </p>
                <div class="node-actions">
                    <button onclick="LocalGraphManager.editNode('${node.id}')" class="primary-btn" style="margin-right: 8px; padding: 6px 12px; font-size: 12px;">
                        Edit Node
                    </button>
                    <button onclick="LocalGraphManager.focusInOutliner('${node.id}')" class="focus-btn">
                        Focus in Outliner
                    </button>
                    <button onclick="LocalGraphManager.${isInPool ? 'removeNodeFromPool' : 'addNodeToPool'}('${node.id}')" 
                            class="${isInPool ? 'secondary-btn' : 'primary-btn'}" 
                            style="margin-left: 8px; padding: 6px 12px; font-size: 12px;">
                        ${isInPool ? 'Remove from Pool' : 'Add to Pool'}
                    </button>
                </div>
            </div>
        `;
    }
    
    function updateStats() {
        const stats = graphData.stats || {};
        document.getElementById('nodes-count').textContent = stats.nodeCount || 0;
        document.getElementById('links-count').textContent = stats.linkCount || 0;
    }
    
    function updateDistanceLevels() {
        const levelsDiv = document.getElementById('distance-levels');
        const distances = graphData.distances || {};
        const depths = graphData.depths || {}; // Get depths from response
        
        // Group nodes by depth (integer)
        const depthGroups = {};
        Object.entries(depths).forEach(([nodeId, depth]) => {
            if (!depthGroups[depth]) {
                depthGroups[depth] = 0;
            }
            depthGroups[depth]++;
        });
        
        // Group nodes by distance (decimal, rounded to nearest 0.1)
        const distanceGroups = {};
        Object.entries(distances).forEach(([nodeId, distance]) => {
            const level = Math.round(distance * 10) / 10; // Round to nearest 0.1
            if (!distanceGroups[level]) {
                distanceGroups[level] = 0;
            }
            distanceGroups[level]++;
        });
        
        const sortedDepths = Object.keys(depthGroups).sort((a, b) => parseInt(a) - parseInt(b));
        const sortedDistances = Object.keys(distanceGroups).sort((a, b) => parseFloat(a) - parseFloat(b));
        
        // Create depth levels section
        const depthLevelsHtml = `
            <div class="levels-section">
                <h5 style="margin: 0 0 8px 0; color: #24292e; font-size: 14px; font-weight: 600;">
                    Depth Levels (Hops)
                </h5>
                <div class="depth-levels">
                    ${sortedDepths.map(depth => `
                        <div class="distance-level">
                            <span class="level-label">${depth}:</span>
                            <span class="level-count">${depthGroups[depth]} nodes</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        // Create distance levels section with collapsible functionality
        const showTop = 10;
        const visibleDistances = sortedDistances.slice(0, showTop);
        const hiddenDistances = sortedDistances.slice(showTop);
        
        const distanceLevelsHtml = `
            <div class="levels-section" style="margin-top: 20px;">
                <h5 style="margin: 0 0 8px 0; color: #24292e; font-size: 14px; font-weight: 600;">
                    Distance Levels (Weights)
                </h5>
                <div class="distance-levels">
                    ${visibleDistances.map(distance => `
                        <div class="distance-level">
                            <span class="level-label">${distance}:</span>
                            <span class="level-count">${distanceGroups[distance]} nodes</span>
                        </div>
                    `).join('')}
                    
                    ${hiddenDistances.length > 0 ? `
                        <div id="hidden-distance-levels" style="display: none;">
                            ${hiddenDistances.map(distance => `
                                <div class="distance-level">
                                    <span class="level-label">${distance}:</span>
                                    <span class="level-count">${distanceGroups[distance]} nodes</span>
                                </div>
                            `).join('')}
                        </div>
                        <button id="toggle-distance-levels" class="secondary-btn" style="
                            width: 100%; 
                            margin-top: 8px; 
                            padding: 4px 8px; 
                            font-size: 12px;
                            text-align: center;
                        ">
                            Show ${hiddenDistances.length} More
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
        
        levelsDiv.innerHTML = depthLevelsHtml + distanceLevelsHtml;
        
        // Add click handler for toggle button
        const toggleBtn = document.getElementById('toggle-distance-levels');
        const hiddenLevels = document.getElementById('hidden-distance-levels');
        
        if (toggleBtn && hiddenLevels) {
            let isExpanded = false;
            toggleBtn.addEventListener('click', () => {
                isExpanded = !isExpanded;
                if (isExpanded) {
                    hiddenLevels.style.display = 'block';
                    toggleBtn.textContent = 'Show Less';
                } else {
                    hiddenLevels.style.display = 'none';
                    toggleBtn.textContent = `Show ${hiddenDistances.length} More`;
                }
            });
        }
    }
    
    function changeCenterNode() {
        // Reset to selection phase
        centerNodeId = null;
        graphData = null;
        
        document.getElementById('graph-visualization-phase').classList.remove('active');
        document.getElementById('center-selection-phase').classList.add('active');
        document.getElementById('center-node-search').value = '';
        document.getElementById('explore-graph-btn').disabled = true;
    }
    
    function openDistanceModal() {
        const modal = document.getElementById('distance-adjustment-modal');
        document.getElementById('modal-max-distance').value = maxDistance;
        document.getElementById('modal-max-depth').value = maxDepth;
        modal.classList.add('show');
        modal.style.display = 'flex';
    }
    
    function closeDistanceModal() {
        const modal = document.getElementById('distance-adjustment-modal');
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 200);
    }
    
    async function applyDistanceAdjustment(e) {
        e.preventDefault();
        
        maxDistance = parseFloat(document.getElementById('modal-max-distance').value) || 5;
        maxDepth = parseInt(document.getElementById('modal-max-depth').value) || 3;
        
        closeDistanceModal();
        
        // Update input fields
        document.getElementById('max-distance-input').value = maxDistance;
        document.getElementById('max-depth-input').value = maxDepth;
        
        // Reload graph with new parameters
        await exploreGraph();
    }
    
    async function openAddNodeModal() {
        const modal = document.getElementById('add-node-modal');
        
        // Setup parent node search functionality
        setupParentNodeSearch();
        
        // Populate quick suggestions from pool
        await populateQuickSuggestions();
        
        modal.classList.add('show');
        modal.style.display = 'flex';
        
        // Focus on content field
        setTimeout(() => document.getElementById('node-content').focus(), 100);
    }
    
    function closeAddNodeModal() {
        const modal = document.getElementById('add-node-modal');
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 200);
        
        // Reset form
        document.getElementById('add-node-form').reset();
        
        // Reset the create-links checkbox to checked
        const createLinksCheckbox = document.getElementById('create-links');
        if (createLinksCheckbox) {
            createLinksCheckbox.checked = true;
        }
        
        // Make sure link options are visible
        const linkOptions = document.getElementById('link-options');
        if (linkOptions) {
            linkOptions.style.display = 'block';
        }
        
        // Reset parent node search
        const parentSearch = document.getElementById('parent-node-search');
        const parentDropdown = document.getElementById('parent-node-dropdown');
        if (parentSearch) {
            parentSearch.value = '';
            parentSearch.dataset.selectedNodeId = '';
        }
        if (parentDropdown) {
            parentDropdown.classList.remove('show');
        }
    }
    
    async function createNewNode(e) {
        e.preventDefault();
        
        const content = document.getElementById('node-content').value.trim();
        const content_zh = document.getElementById('node-content-zh').value.trim();
        const parentNodeId = document.getElementById('parent-node-search').dataset.selectedNodeId || null;
        const createLinks = document.getElementById('create-links').checked;
        
        if (!content) {
            alert('Please enter content for the node');
            return;
        }
        
        // Collect all link targets
        const linkTargets = [];
        if (createLinks) {
            const linkInputs = document.querySelectorAll('.link-target-input');
            const weightInputs = document.querySelectorAll('.link-weight-input');
            const descriptionInputs = document.querySelectorAll('.link-description-input');
            
            for (let i = 0; i < linkInputs.length; i++) {
                const targetNodeId = linkInputs[i].dataset.selectedNodeId;
                if (targetNodeId && linkInputs[i].value.trim()) {
                    linkTargets.push({
                        targetNodeId,
                        weight: parseFloat(weightInputs[i].value) || 1.0,
                        description: descriptionInputs[i].value.trim()
                    });
                }
            }
        }
        
        try {
            const response = await fetch('/api/local-graph/nodes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content,
                    content_zh,
                    parentNodeId,
                    linkTargets, // Send array of link targets instead of single center node link
                    centerNodeId // Still send for context
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to create node');
            }
            
            const result = await response.json();
            
            closeAddNodeModal();
            await refreshGraph();
            
            showNotification(`Node created successfully with ${linkTargets.length} link(s)!`, 'success');
            
        } catch (error) {
            console.error('Error creating node:', error);
            showNotification('Error creating node', 'error');
        }
    }
    
    async function refreshGraph() {
        if (centerNodeId) {
            await exploreGraph();
        }
    }
    
    async function focusInOutliner(nodeId) {
        try {
            const response = await fetch(`/api/local-graph/focus/${nodeId}`);
            const result = await response.json();
            
            // Trigger focus in main outliner
            // This would need integration with your existing outliner code
            if (window.focusNodeInOutliner) {
                window.focusNodeInOutliner(result.pathToRoot);
            } else {
                // Fallback: just show the path
                showNotification(`Path to node: ${result.pathToRoot.join(' → ')}`, 'info');
            }
            
            // Optionally close the local graph manager
            // hide();
            
        } catch (error) {
            console.error('Error focusing node in outliner:', error);
            showNotification('Error focusing node in outliner', 'error');
        }
    }
    
    async function show() {
        if (!isInitialized) {
            console.error('LocalGraphManager not initialized');
            return;
        }
        
        if (!container) {
            console.error('Container not found');
            return;
        }
        
        container.style.display = 'block';
        
        // Check if there are any nodes in the database
        try {
            const response = await fetch('/api/nodes/exists');
            const result = await response.json();
            
            if (result.exists) {
                // Nodes exist, show center selection
                switchToCenterSelection();
                // Load quick access nodes
                await loadQuickAccessNodes();
            } else {
                // No nodes found, show empty state
                switchToEmptyState();
            }
        } catch (error) {
            console.error('Error checking for nodes:', error);
            // Default to center selection phase
            switchToCenterSelection();
            await loadQuickAccessNodes();
        }
        
        // Reset state with null checks
        centerNodeId = null;
        graphData = null;
        
        const centerSearch = document.getElementById('center-node-search');
        const exploreBtn = document.getElementById('explore-graph-btn');
        
        if (centerSearch) centerSearch.value = '';
        if (exploreBtn) exploreBtn.disabled = true;
    }
    
    function hide() {
        if (!container) {
            console.warn('Container not found, cannot hide');
            return;
        }
        container.style.display = 'none';
    }
    
    function isVisible() {
        return container && container.style.display !== 'none';
    }
    
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = 'local-graph-notification';
        notification.textContent = message;
        
        const baseStyles = {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            zIndex: '10001',
            fontSize: '14px',
            fontWeight: 'bold',
            maxWidth: '300px',
            wordWrap: 'break-word'
        };
        
        const typeStyles = {
            success: { backgroundColor: '#4CAF50', color: 'white' },
            error: { backgroundColor: '#f44336', color: 'white' },
            warning: { backgroundColor: '#ff9800', color: 'white' },
            info: { backgroundColor: '#2196F3', color: 'white' }
        };
        
        Object.assign(notification.style, baseStyles, typeStyles[type] || typeStyles.info);
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.style.opacity = '0';
                notification.style.transition = 'opacity 0.3s ease';
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }
        }, 3000);
    }
    
    // Add new functions for empty state handling
    async function createFirstNode() {
        try {
            // Create a simple first node
            const response = await fetch('/api/nodes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: 'My First Node',
                    content_zh: '我的第一个节点',
                    parent_id: null,
                    position: 0
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to create first node');
            }
            
            const newNode = await response.json();
            
            showNotification('First node created! You can now create more nodes and links.', 'success');
            
            // Switch to center selection phase and pre-select the new node
            switchToCenterSelection();
            centerNodeId = newNode.id;
            
            const centerSearch = document.getElementById('center-node-search');
            const exploreBtn = document.getElementById('explore-graph-btn');
            
            if (centerSearch) centerSearch.value = newNode.content;
            if (exploreBtn) exploreBtn.disabled = false;
            
        } catch (error) {
            console.error('Error creating first node:', error);
            showNotification('Error creating first node', 'error');
        }
    }
    
    function goToOutliner() {
        // Close local graph manager and focus on main outliner
        hide();
        
        // If there's a global function to focus the outliner, call it
        if (window.focusMainOutliner) {
            window.focusMainOutliner();
        } else {
            showNotification('Please use the main outliner to create nodes', 'info');
        }
    }
    
    async function checkNodesAgain() {
        try {
            const response = await fetch('/api/nodes/exists');
            const result = await response.json();
            
            if (result.exists) {
                switchToCenterSelection();
                showNotification(`Great! Found ${result.count} nodes. You can now select a center node.`, 'success');
            } else {
                showNotification('Still no nodes found. Please create some nodes first.', 'warning');
            }
        } catch (error) {
            console.error('Error checking for nodes:', error);
            showNotification('Error checking for nodes', 'error');
        }
    }
    
    function switchToCenterSelection() {
        const emptyPhase = document.getElementById('empty-state-phase');
        const centerPhase = document.getElementById('center-selection-phase');
        const graphPhase = document.getElementById('graph-visualization-phase');
        
        if (emptyPhase) emptyPhase.classList.remove('active');
        if (centerPhase) centerPhase.classList.add('active');
        if (graphPhase) graphPhase.classList.remove('active');
    }
    
    function switchToEmptyState() {
        const emptyPhase = document.getElementById('empty-state-phase');
        const centerPhase = document.getElementById('center-selection-phase');
        const graphPhase = document.getElementById('graph-visualization-phase');
        
        if (emptyPhase) emptyPhase.classList.add('active');
        if (centerPhase) centerPhase.classList.remove('active');
        if (graphPhase) graphPhase.classList.remove('active');
    }
    
    // Add function to create node from search
    async function createNodeFromSearch(content) {
        try {
            const response = await fetch('/api/nodes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: content,
                    parent_id: null,
                    position: 0
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to create node');
            }
            
            const newNode = await response.json();
            
            // ADDED: Automatically add the new node to the pool
            try {
                await addNodeToPool(newNode.id, 'Created from center node search');
                showNotification('Node created and added to pool!', 'success');
            } catch (poolError) {
                console.error('Error adding node to pool:', poolError);
                showNotification('Node created but failed to add to pool', 'warning');
            }
            
            // Select the new node as center
            selectCenterNode(newNode.id, newNode.content);
            
            // Hide dropdown
            document.getElementById('center-node-dropdown').classList.remove('show');
            
        } catch (error) {
            console.error('Error creating node from search:', error);
            showNotification('Error creating node', 'error');
        }
    }
    
    // Add pool management functions
    async function addNodeToPool(nodeId, notes = '') {
        try {
            const response = await fetch('/api/local-graph/pool/nodes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nodeId, notes })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to add node to pool');
            }
            
            // Update local status
            nodePoolStatus.set(nodeId, true);
            
            // Update UI
            showNotification('Node added to Local Graph Pool!', 'success');
            
            return true;
        } catch (error) {
            console.error('Error adding node to pool:', error);
            showNotification(error.message || 'Error adding node to pool', 'error');
            return false;
        }
    }
    
    async function removeNodeFromPool(nodeId) {
        try {
            const response = await fetch(`/api/local-graph/pool/nodes/${nodeId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to remove node from pool');
            }
            
            // Update local status
            nodePoolStatus.set(nodeId, false);
            
            // Update UI
            showNotification('Node removed from Local Graph Pool!', 'success');
            
            return true;
        } catch (error) {
            console.error('Error removing node from pool:', error);
            showNotification(error.message || 'Error removing node from pool', 'error');
            return false;
        }
    }
    
    async function checkNodePoolStatus(nodeId) {
        try {
            const response = await fetch(`/api/local-graph/pool/check-node/${nodeId}`);
            const result = await response.json();
            
            nodePoolStatus.set(nodeId, result.inPool);
            return result.inPool;
        } catch (error) {
            console.error('Error checking node pool status:', error);
            return false;
        }
    }
    
    function showNodeContextMenu(event, node) {
        // Remove existing context menu
        const existingMenu = document.getElementById('node-context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
        
        const isInPool = nodePoolStatus.get(node.id) || false;
        
        // Create context menu
        const menu = document.createElement('div');
        menu.id = 'node-context-menu';
        menu.style.cssText = `
            position: fixed;
            top: ${event.clientY}px;
            left: ${event.clientX}px;
            background: white;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 10000;
            padding: 5px 0;
            min-width: 150px;
        `;
        
        const menuItems = [
            {
                text: 'Edit Node',
                action: () => editNode(node.id),
                style: 'color: #0366d6; font-weight: 600;'
            },
            {
                text: isInPool ? 'Remove from Pool' : 'Add to Pool',
                action: () => isInPool ? removeNodeFromPool(node.id) : addNodeToPool(node.id),
                style: `color: ${isInPool ? '#d73a49' : '#28a745'};`
            },
            {
                text: 'Focus in Outliner',
                action: () => focusInOutliner(node.id)
            },
            {
                text: 'Set as Center',
                action: () => {
                    centerNodeId = node.id;
                    document.getElementById('current-center-node').textContent = node.content || 'Untitled';
                    exploreGraph();
                }
            }
        ];
        
        menuItems.forEach(item => {
            const menuItem = document.createElement('div');
            menuItem.style.cssText = `
                padding: 8px 16px;
                cursor: pointer;
                font-size: 14px;
                ${item.style || ''}
            `;
            menuItem.textContent = item.text;
            menuItem.addEventListener('click', () => {
                item.action();
                menu.remove();
            });
            menuItem.addEventListener('mouseenter', () => {
                menuItem.style.backgroundColor = '#f5f5f5';
            });
            menuItem.addEventListener('mouseleave', () => {
                menuItem.style.backgroundColor = '';
            });
            menu.appendChild(menuItem);
        });
        
        document.body.appendChild(menu);
        
        // Remove menu when clicking elsewhere
        setTimeout(() => {
            document.addEventListener('click', function removeMenu() {
                menu.remove();
                document.removeEventListener('click', removeMenu);
            });
        }, 100);
    }
    
    // Add these new functions to handle flexible linking
    function setupLinkingHandlers() {
        const createLinksCheckbox = document.getElementById('create-links');
        const linkOptions = document.getElementById('link-options');
        const addAnotherLinkBtn = document.getElementById('add-another-link');
        const linkToCenterBtn = document.getElementById('link-to-center-quick');
        
        if (createLinksCheckbox) {
            createLinksCheckbox.addEventListener('change', function(e) {
                if (linkOptions) {
                    linkOptions.style.display = e.target.checked ? 'block' : 'none';
                }
            });
        }
        
        if (addAnotherLinkBtn) {
            addAnotherLinkBtn.addEventListener('click', addAnotherLinkTarget);
        }
        
        if (linkToCenterBtn) {
            linkToCenterBtn.addEventListener('click', addCenterNodeAsTarget);
        }
        
        // Setup initial link target search
        setupLinkTargetSearch(0);
    }
    
    function addAnotherLinkTarget() {
        const container = document.querySelector('.link-targets-container');
        const existingItems = container.querySelectorAll('.link-target-item');
        const newIndex = existingItems.length;
        
        const newItem = document.createElement('div');
        newItem.className = 'link-target-item';
        newItem.innerHTML = `
            <div class="link-target-search">
                <input type="text" class="link-target-input" placeholder="Search for node to link to..." data-index="${newIndex}">
                <div class="link-target-dropdown" data-index="${newIndex}">
                    <div class="dropdown-content">
                        <div class="no-results-message">Start typing to search nodes...</div>
                    </div>
                </div>
            </div>
            <div class="link-options-row">
                <input type="number" class="link-weight-input" min="0.1" max="100" step="0.1" value="1.0" placeholder="Weight">
                <input type="text" class="link-description-input" placeholder="Optional description...">
                <button type="button" class="remove-link-btn">×</button>
            </div>
        `;
        
        container.appendChild(newItem);
        
        // Setup search for the new item
        setupLinkTargetSearch(newIndex);
        
        // Add remove handler
        const removeBtn = newItem.querySelector('.remove-link-btn');
        removeBtn.addEventListener('click', () => {
            newItem.remove();
            updateRemoveButtonVisibility();
        });
        
        updateRemoveButtonVisibility();
    }
    
    function addCenterNodeAsTarget() {
        if (!centerNodeId || !graphData?.centerNode) return;
        
        // Find the first empty link target input
        const linkInputs = document.querySelectorAll('.link-target-input');
        for (let input of linkInputs) {
            if (!input.value.trim()) {
                input.value = graphData.centerNode.content || 'Untitled';
                input.dataset.selectedNodeId = centerNodeId;
                break;
            }
        }
    }
    
    function updateRemoveButtonVisibility() {
        const removeButtons = document.querySelectorAll('.remove-link-btn');
        removeButtons.forEach((btn, index) => {
            btn.style.display = removeButtons.length > 1 ? 'inline-block' : 'none';
        });
    }
    
    async function setupLinkTargetSearch(index) {
        const input = document.querySelector(`.link-target-input[data-index="${index}"]`);
        const dropdown = document.querySelector(`.link-target-dropdown[data-index="${index}"]`);
        
        if (!input || !dropdown) return;
        
        input.addEventListener('input', async (e) => {
            const query = e.target.value.trim();
            const dropdownContent = dropdown.querySelector('.dropdown-content');
            
            if (query.length < 2) {
                dropdownContent.innerHTML = '<div class="no-results-message">Start typing to search nodes...</div>';
                dropdown.classList.remove('show');
                return;
            }
            
            try {
                // CHANGED: Search only within pool nodes instead of all nodes
                const response = await fetch(`/api/local-graph/pool/search?q=${encodeURIComponent(query)}&limit=10`);
                const results = await response.json();
                
                if (results.length === 0) {
                    dropdownContent.innerHTML = `<div class="no-results-message">No nodes found in pool matching "${query}"</div>`;
                } else {
                    dropdownContent.innerHTML = results.map(node => `
                        <div class="node-option" data-node-id="${node.id}">
                            <div class="node-option-content">${node.content || 'Untitled'}</div>
                            ${node.content_zh ? `<div class="node-option-content-zh">${node.content_zh}</div>` : ''}
                            <div class="node-option-meta">In pool since ${new Date(node.added_at).toLocaleDateString()}</div>
                        </div>
                    `).join('');
                    
                    // Add click handlers
                    dropdownContent.querySelectorAll('.node-option').forEach(option => {
                        option.addEventListener('click', function() {
                            input.value = this.querySelector('.node-option-content').textContent;
                            input.dataset.selectedNodeId = this.dataset.nodeId;
                            dropdown.classList.remove('show');
                        });
                    });
                }
                
                dropdown.classList.add('show');
            } catch (error) {
                console.error('Error searching pool nodes:', error);
                dropdownContent.innerHTML = '<div class="error-message">Error searching pool nodes</div>';
            }
        });
    }
    
    // Add function to populate quick suggestions from current graph
    async function populateQuickSuggestions() {
        const suggestionsContainer = document.getElementById('link-suggestions-list');
        if (!suggestionsContainer) return;
        
        try {
            // Get nodes from current local graph pool
            const response = await fetch('/api/local-graph/pool');
            const poolData = await response.json();
            
            if (poolData.nodes && poolData.nodes.length > 0) {
                // Show up to 6 most recent pool nodes as quick suggestions
                const recentNodes = poolData.nodes.slice(0, 6);
                
                suggestionsContainer.innerHTML = recentNodes.map(poolNode => `
                    <button type="button" class="suggestion-btn" data-node-id="${poolNode.node_id}">
                        ${poolNode.content || poolNode.content_zh || 'Untitled'}
                    </button>
                `).join('');
                
                // Add click handlers for quick suggestions
                suggestionsContainer.querySelectorAll('.suggestion-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const nodeId = this.dataset.nodeId;
                        const nodeContent = this.textContent;
                        
                        // Find the first empty link target input
                        const linkInputs = document.querySelectorAll('.link-target-input');
                        for (let input of linkInputs) {
                            if (!input.value.trim()) {
                                input.value = nodeContent;
                                input.dataset.selectedNodeId = nodeId;
                                break;
                            }
                        }
                        
                        // If all inputs are filled, add a new one
                        if (Array.from(linkInputs).every(input => input.value.trim())) {
                            addAnotherLinkTarget();
                            const newInputs = document.querySelectorAll('.link-target-input');
                            const lastInput = newInputs[newInputs.length - 1];
                            lastInput.value = nodeContent;
                            lastInput.dataset.selectedNodeId = nodeId;
                        }
                    });
                });
            } else {
                suggestionsContainer.innerHTML = '<div class="no-suggestions">No nodes in pool yet. Add some nodes to the pool first.</div>';
            }
        } catch (error) {
            console.error('Error loading quick suggestions:', error);
            suggestionsContainer.innerHTML = '<div class="error-message">Error loading suggestions</div>';
        }
    }
    
    // Add new function to handle parent node search
    async function setupParentNodeSearch() {
        const parentSearch = document.getElementById('parent-node-search');
        const parentDropdown = document.getElementById('parent-node-dropdown');
        
        if (!parentSearch || !parentDropdown) return;
        
        parentSearch.addEventListener('input', async (e) => {
            const query = e.target.value.trim();
            const dropdownContent = parentDropdown.querySelector('.dropdown-content');
            
            if (query.length === 0) {
                // Show root option when empty
                dropdownContent.innerHTML = `
                    <div class="node-option" data-node-id="">
                        <div class="node-option-content">(Create as root node)</div>
                        <div class="node-option-content-zh">创建为根节点</div>
                    </div>
                `;
                
                // Add click handler for root option
                dropdownContent.querySelector('.node-option').addEventListener('click', function() {
                    parentSearch.value = '(Create as root node)';
                    parentSearch.dataset.selectedNodeId = '';
                    parentDropdown.classList.remove('show');
                });
                
                parentDropdown.classList.add('show');
                return;
            }
            
            if (query.length < 2) {
                dropdownContent.innerHTML = '<div class="no-results-message">Start typing to search pool nodes...</div>';
                parentDropdown.classList.remove('show');
                return;
            }
            
            try {
                // Search within pool nodes
                const response = await fetch(`/api/local-graph/pool/search?q=${encodeURIComponent(query)}&limit=10`);
                const results = await response.json();
                
                if (results.length === 0) {
                    dropdownContent.innerHTML = `
                        <div class="no-results-message">No nodes found in pool matching "${query}"</div>
                        <div class="node-option" data-node-id="">
                            <div class="node-option-content">(Create as root node instead)</div>
                            <div class="node-option-content-zh">改为创建根节点</div>
                        </div>
                    `;
                } else {
                    // Add root option at the top
                    let optionsHtml = `
                        <div class="node-option" data-node-id="">
                            <div class="node-option-content">(Create as root node)</div>
                            <div class="node-option-content-zh">创建为根节点</div>
                        </div>
                    `;
                    
                    // Add search results
                    optionsHtml += results.map(node => `
                        <div class="node-option" data-node-id="${node.id}">
                            <div class="node-option-content">${node.content || 'Untitled'}</div>
                            ${node.content_zh ? `<div class="node-option-content-zh">${node.content_zh}</div>` : ''}
                            <div class="node-option-meta">In pool since ${new Date(node.added_at).toLocaleDateString()}</div>
                        </div>
                    `).join('');
                    
                    dropdownContent.innerHTML = optionsHtml;
                }
                
                // Add click handlers for all options
                dropdownContent.querySelectorAll('.node-option').forEach(option => {
                    option.addEventListener('click', function() {
                        const nodeId = this.dataset.nodeId;
                        const nodeContent = this.querySelector('.node-option-content').textContent;
                        
                        parentSearch.value = nodeContent;
                        parentSearch.dataset.selectedNodeId = nodeId;
                        parentDropdown.classList.remove('show');
                    });
                });
                
                parentDropdown.classList.add('show');
            } catch (error) {
                console.error('Error searching pool nodes for parent:', error);
                dropdownContent.innerHTML = '<div class="error-message">Error searching pool nodes</div>';
            }
        });
        
        // Hide dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!parentSearch.contains(e.target) && !parentDropdown.contains(e.target)) {
                parentDropdown.classList.remove('show');
            }
        });
    }
    
    // Add new functions for quick access management
    
    async function loadQuickAccessNodes() {
        try {
            const response = await fetch('/api/local-graph/quick-access');
            const quickAccessNodes = await response.json();
            
            const quickAccessList = document.getElementById('quick-access-list');
            if (!quickAccessList) return;
            
            if (quickAccessNodes.length === 0) {
                quickAccessList.innerHTML = `
                    <div class="quick-access-empty">
                        <span>No quick access nodes yet. Explore a graph and save it using the ⭐ button.</span>
                    </div>
                `;
                return;
            }
            
            quickAccessList.innerHTML = quickAccessNodes.map(item => `
                <div class="quick-access-item" data-node-id="${item.node_id}">
                    <div class="quick-access-content">
                        <div class="quick-access-title">${item.content || item.content_zh || 'Untitled'}</div>
                        ${item.content_zh && item.content ? `<div class="quick-access-subtitle">${item.content_zh}</div>` : ''}
                        <div class="quick-access-meta">
                            <span>Distance: ${item.max_distance}</span>
                            <span>Depth: ${item.max_depth}</span>
                            <span>Used ${item.usage_count} times</span>
                            <span class="quick-access-date">Last: ${new Date(item.last_used_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div class="quick-access-actions">
                        <button class="quick-access-use-btn" onclick="LocalGraphManager.useQuickAccess('${item.node_id}', ${item.max_distance}, ${item.max_depth})" title="Use this center node">
                            🚀
                        </button>
                        <button class="quick-access-remove-btn" onclick="LocalGraphManager.removeFromQuickAccess('${item.id}')" title="Remove from quick access">
                            ×
                        </button>
                    </div>
                </div>
            `).join('');
            
        } catch (error) {
            console.error('Error loading quick access nodes:', error);
            const quickAccessList = document.getElementById('quick-access-list');
            if (quickAccessList) {
                quickAccessList.innerHTML = '<div class="quick-access-error">Error loading quick access nodes</div>';
            }
        }
    }
    
    async function saveCurrentCenterToQuickAccess() {
        if (!centerNodeId) {
            showNotification('No center node selected', 'warning');
            return;
        }
        
        try {
            const response = await fetch('/api/local-graph/quick-access', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nodeId: centerNodeId,
                    maxDistance: maxDistance,
                    maxDepth: maxDepth
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save to quick access');
            }
            
            const result = await response.json();
            showNotification(result.message || 'Saved to quick access!', 'success');
            
            // Update the button appearance to show it's saved
            const saveBtn = document.getElementById('save-to-quick-access-btn');
            if (saveBtn) {
                saveBtn.textContent = '⭐';
                saveBtn.style.backgroundColor = '#fbbf24';
                saveBtn.style.color = 'white';
                setTimeout(() => {
                    saveBtn.style.backgroundColor = '';
                    saveBtn.style.color = '';
                }, 2000);
            }
            
        } catch (error) {
            console.error('Error saving to quick access:', error);
            showNotification(error.message || 'Error saving to quick access', 'error');
        }
    }
    
    async function useQuickAccess(nodeId, distance, depth) {
        try {
            // Set the parameters
            centerNodeId = nodeId;
            maxDistance = distance;
            maxDepth = depth;
            
            // Update input fields
            const maxDistanceInput = document.getElementById('max-distance-input');
            const maxDepthInput = document.getElementById('max-depth-input');
            if (maxDistanceInput) maxDistanceInput.value = distance;
            if (maxDepthInput) maxDepthInput.value = depth;
            
            // Update usage count
            await fetch(`/api/local-graph/quick-access/${nodeId}/use`, {
                method: 'POST'
            });
            
            // Explore the graph
            await exploreGraph();
            
            showNotification('Quick access center loaded!', 'success');
            
        } catch (error) {
            console.error('Error using quick access:', error);
            showNotification('Error loading quick access center', 'error');
        }
    }
    
    async function removeFromQuickAccess(quickAccessId) {
        if (!confirm('Remove this node from quick access?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/local-graph/quick-access/${quickAccessId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error('Failed to remove from quick access');
            }
            
            showNotification('Removed from quick access', 'success');
            
            // Reload quick access list
            await loadQuickAccessNodes();
            
        } catch (error) {
            console.error('Error removing from quick access:', error);
            showNotification('Error removing from quick access', 'error');
        }
    }
    
    let searchHighlightedNode = null; // Track currently highlighted search result
    
    async function handleGraphNodeSearch(e) {
        const query = e.target.value.trim();
        const resultsContainer = document.getElementById('graph-search-results');
        
        if (!graphData || !graphData.nodes) {
            resultsContainer.innerHTML = '<div class="local-graph-search-no-results">No graph loaded</div>';
            return;
        }
        
        if (query.length < 2) {
            resultsContainer.innerHTML = '<div class="local-graph-search-hint">Type at least 2 characters to search</div>';
            clearSearchHighlight();
            return;
        }
        
        // Search within current graph nodes
        const matchingNodes = graphData.nodes.filter(node => {
            const content = (node.content || '').toLowerCase();
            const content_zh = (node.content_zh || '').toLowerCase();
            const searchTerm = query.toLowerCase();
            
            return content.includes(searchTerm) || content_zh.includes(searchTerm);
        });
        
        if (matchingNodes.length === 0) {
            resultsContainer.innerHTML = `<div class="local-graph-search-no-results">No nodes found matching "${query}"</div>`;
            clearSearchHighlight();
            return;
        }
        
        // Display search results with updated class names
        resultsContainer.innerHTML = matchingNodes.map(node => {
            const distance = graphData.distances[node.id] || 0;
            const depth = graphData.depths[node.id] || 0;
            const isInPool = nodePoolStatus.get(node.id) || false;
            
            return `
                <div class="local-graph-search-result-item" data-node-id="${node.id}">
                    <div class="local-graph-search-result-content">
                        <div class="local-graph-search-result-title">${highlightSearchTerm(node.content || 'Untitled', query)}</div>
                        ${node.content_zh ? `<div class="local-graph-search-result-subtitle">${highlightSearchTerm(node.content_zh, query)}</div>` : ''}
                        <div class="local-graph-search-result-meta">
                            <span class="local-graph-search-distance">Distance: ${distance.toFixed(2)}</span>
                            <span class="local-graph-search-depth">Depth: ${depth}</span>
                            ${isInPool ? '<span class="local-graph-search-pool-status">In Pool</span>' : ''}
                        </div>
                    </div>
                    <button class="local-graph-search-locate-btn" onclick="LocalGraphManager.locateNodeInGraph('${node.id}')" title="Locate in graph">
                        🎯
                    </button>
                </div>
            `;
        }).join('');
        
        // Add click handlers for result items with updated class names
        resultsContainer.querySelectorAll('.local-graph-search-result-item').forEach(item => {
            item.addEventListener('click', function(e) {
                if (!e.target.classList.contains('local-graph-search-locate-btn')) {
                    const nodeId = this.dataset.nodeId;
                    const node = graphData.nodes.find(n => n.id === nodeId);
                    if (node) {
                        selectNode(node);
                        locateNodeInGraph(nodeId);
                    }
                }
            });
        });
    }
    
    function highlightSearchTerm(text, searchTerm) {
        if (!text || !searchTerm) return text || '';
        
        const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }
    
    function locateNodeInGraph(nodeId) {
        if (!graphData || !graphData.nodes) return;
        
        const node = graphData.nodes.find(n => n.id === nodeId);
        if (!node) return;
        
        // Clear previous highlight
        clearSearchHighlight();
        
        // Find the node element in the SVG
        const nodeElement = document.querySelector(`g[data-node-id="${nodeId}"]`);
        if (!nodeElement) return;
        
        const circle = nodeElement.querySelector('circle.main-node-circle');
        if (!circle) return;
        
        // Add highlight effect with updated class name
        circle.classList.add('local-graph-search-highlighted');
        searchHighlightedNode = nodeId;
        
        // Get node position for centering
        const cx = parseFloat(circle.getAttribute('cx'));
        const cy = parseFloat(circle.getAttribute('cy'));
        
        // Center the view on the node
        centerViewOnNode(cx, cy);
        
        // Select the node to show details
        selectNode(node);
        
        // Add pulsing animation with updated animation name
        animateNodeHighlight(circle);
        
        // Auto-clear highlight after 5 seconds
        setTimeout(() => {
            clearSearchHighlight();
        }, 5000);
        
        showNotification(`Located "${node.content || 'Untitled'}" in graph`, 'success');
    }
    
    function clearSearchHighlight() {
        if (searchHighlightedNode) {
            const highlightedElement = document.querySelector(`g[data-node-id="${searchHighlightedNode}"] circle.main-node-circle`);
            if (highlightedElement) {
                highlightedElement.classList.remove('local-graph-search-highlighted');
            }
            searchHighlightedNode = null;
        }
    }
    
    function centerViewOnNode(nodeX, nodeY) {
        const svg = document.querySelector('#local-graph-canvas svg');
        const mainGroup = document.getElementById('main-graph-group');
        
        if (!svg || !mainGroup) return;
        
        const svgRect = svg.getBoundingClientRect();
        const centerX = svgRect.width / 2;
        const centerY = svgRect.height / 2;
        
        // Calculate new pan position to center the node
        const newPanX = centerX - nodeX;
        const newPanY = centerY - nodeY;
        
        // Apply smooth transition
        mainGroup.style.transition = 'transform 0.8s ease-out';
        mainGroup.setAttribute('transform', `translate(${newPanX}, ${newPanY}) scale(1)`);
        
        // Remove transition after animation
        setTimeout(() => {
            mainGroup.style.transition = '';
        }, 800);
        
        // Update global pan state if available
        if (typeof currentPanX !== 'undefined') {
            currentPanX = newPanX;
            currentPanY = newPanY;
            currentZoom = 1;
        }
    }
    
    function animateNodeHighlight(circleElement) {
        // Add pulsing animation with updated animation name
        circleElement.style.animation = 'localGraphSearchPulse 2s ease-in-out 3';
    }

    // Add the resizable sidebar functionality:
    function setupResizableGraphSidebar() {
        const sidebar = document.getElementById('local-graph-sidebar');
        const resizeHandle = document.getElementById('local-graph-resize-handle');
        const canvasArea = document.getElementById('local-graph-canvas-area');
        
        if (!sidebar || !resizeHandle || !canvasArea) {
            console.warn('Local graph sidebar elements not found');
            return;
        }
        
        // Get the initial sidebar width from localStorage or use default
        const savedWidth = localStorage.getItem('localGraphSidebarWidth');
        const defaultWidth = 250;
        const initialWidth = savedWidth ? parseInt(savedWidth) : defaultWidth;
        
        // Set initial width
        sidebar.style.width = initialWidth + 'px';
        resizeHandle.style.left = initialWidth + 'px';
        
        // Variables for tracking resize state
        let isResizing = false;
        let startX = 0;
        let startWidth = 0;
        
        // Mouse down event on the resize handle
        resizeHandle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startWidth = parseInt(getComputedStyle(sidebar).width);
            
            // Add a class to the body during resize to prevent text selection
            document.body.classList.add('local-graph-resizing');
            
            // Prevent text selection during resize
            e.preventDefault();
        });
        
        // Mouse move event for resizing
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            
            const deltaX = e.clientX - startX;
            const newWidth = Math.max(200, Math.min(startWidth + deltaX, window.innerWidth * 0.6));
            
            // Update sidebar width
            sidebar.style.width = `${newWidth}px`;
            
            // Update handle position
            resizeHandle.style.left = `${newWidth}px`;
            
            // Save the width to localStorage
            localStorage.setItem('localGraphSidebarWidth', newWidth);
        });
        
        // Mouse up event to stop resizing
        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.classList.remove('local-graph-resizing');
            }
        });
        
        // Handle window resize
        window.addEventListener('resize', () => {
            // Make sure sidebar doesn't exceed max width when window is resized
            const currentWidth = parseInt(getComputedStyle(sidebar).width);
            const maxWidth = window.innerWidth * 0.6;
            
            if (currentWidth > maxWidth) {
                const newWidth = maxWidth;
                sidebar.style.width = newWidth + 'px';
                resizeHandle.style.left = `${newWidth}px`;
                localStorage.setItem('localGraphSidebarWidth', newWidth);
            }
        });
    }
    
    // Add these edit node functions before the return statement
    
    // Edit Node Functions
    async function editNode(nodeId) {
        const node = graphData.nodes.find(n => n.id === nodeId);
        if (!node) {
            showNotification('Node not found', 'error');
            return;
        }

        currentEditingNode = node;
        
        // Load node content
        document.getElementById('edit-node-content').value = node.content || '';
        document.getElementById('edit-node-content-zh').value = node.content_zh || '';
        
        // Load node links
        await loadNodeLinks(nodeId);
        
        // Setup new link target search
        setupNewLinkTargetSearch();
        
        // Setup tab switching
        setupEditModalTabs();
        
        // Show modal
        const modal = document.getElementById('edit-node-modal');
        modal.classList.add('show');
        modal.style.display = 'flex';
        
        // Focus on content field
        setTimeout(() => document.getElementById('edit-node-content').focus(), 100);
    }

    async function loadNodeLinks(nodeId) {
        try {
            const response = await fetch(`/api/nodes/${nodeId}/links`);
            currentNodeLinks = await response.json();
            
            // Update the links lists
            updateEditModalLinksList();
        } catch (error) {
            console.error('Error fetching node links:', error);
            showNotification('Error loading node links', 'error');
        }
    }

    function updateEditModalLinksList() {
        const outgoingList = document.getElementById('outgoing-links-list');
        const incomingList = document.getElementById('incoming-links-list');
        
        // Clear existing lists
        outgoingList.innerHTML = '';
        incomingList.innerHTML = '';
        
        // Add outgoing links
        if (currentNodeLinks.outgoing.length === 0) {
            outgoingList.innerHTML = '<div class="no-links">No outgoing links</div>';
        } else {
            currentNodeLinks.outgoing.forEach(link => {
                const linkItem = document.createElement('div');
                linkItem.className = 'link-item';
                linkItem.innerHTML = `
                    <div class="link-info">
                        <div class="link-target">To: ${link.content || link.content_zh || 'Untitled'}</div>
                        <div class="link-details">
                            <span class="link-weight">Weight: ${link.weight}</span>
                            <span class="link-description">${link.description || 'No description'}</span>
                        </div>
                    </div>
                    <div class="link-actions">
                        <button class="edit-link-btn" data-link-id="${link.id}">Edit</button>
                        <button class="delete-link-btn" data-link-id="${link.id}">Delete</button>
                    </div>
                `;
                
                // Add event listeners
                linkItem.querySelector('.edit-link-btn').addEventListener('click', () => editLink(link));
                linkItem.querySelector('.delete-link-btn').addEventListener('click', () => deleteLink(link.id));
                
                outgoingList.appendChild(linkItem);
            });
        }
        
        // Add incoming links (NOW WITH EDIT/DELETE ACTIONS!)
        if (currentNodeLinks.incoming.length === 0) {
            incomingList.innerHTML = '<div class="no-links">No incoming links</div>';
        } else {
            currentNodeLinks.incoming.forEach(link => {
                const linkItem = document.createElement('div');
                linkItem.className = 'link-item';
                linkItem.innerHTML = `
                    <div class="link-info">
                        <div class="link-source">From: ${link.content || link.content_zh || 'Untitled'}</div>
                        <div class="link-details">
                            <span class="link-weight">Weight: ${link.weight}</span>
                            <span class="link-description">${link.description || 'No description'}</span>
                        </div>
                    </div>
                    <div class="link-actions">
                        <button class="edit-link-btn" data-link-id="${link.id}">Edit</button>
                        <button class="delete-link-btn" data-link-id="${link.id}">Delete</button>
                    </div>
                `;
                
                // Add event listeners (same as outgoing links)
                linkItem.querySelector('.edit-link-btn').addEventListener('click', () => editLink(link));
                linkItem.querySelector('.delete-link-btn').addEventListener('click', () => deleteLink(link.id));
                
                incomingList.appendChild(linkItem);
            });
        }
    }

    function setupEditModalTabs() {
        const tabs = document.querySelectorAll('#edit-node-modal .tab');
        const tabPanes = document.querySelectorAll('#edit-node-modal .tab-pane');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                
                // Remove active class from all tabs and panes
                tabs.forEach(t => t.classList.remove('active'));
                tabPanes.forEach(p => p.classList.remove('active'));
                
                // Add active class to clicked tab and corresponding pane
                tab.classList.add('active');
                document.querySelector(`#edit-node-modal .tab-pane[data-tab="${tabName}"]`).classList.add('active');
            });
        });
    }

    async function setupNewLinkTargetSearch() {
        const input = document.getElementById('new-link-target');
        const dropdown = document.getElementById('new-link-dropdown');
        
        input.addEventListener('input', async (e) => {
            const query = e.target.value.trim();
            const dropdownContent = dropdown.querySelector('.dropdown-content');
            
            if (query.length < 2) {
                dropdownContent.innerHTML = '<div class="no-results-message">Start typing to search pool nodes...</div>';
                dropdown.classList.remove('show');
                return;
            }
            
            try {
                const response = await fetch(`/api/local-graph/pool/search?q=${encodeURIComponent(query)}&limit=10`);
                const results = await response.json();
                
                // Filter out the current node being edited
                const filteredResults = results.filter(node => node.id !== currentEditingNode.id);
                
                if (filteredResults.length === 0) {
                    dropdownContent.innerHTML = `<div class="no-results-message">No nodes found in pool matching "${query}"</div>`;
                } else {
                    dropdownContent.innerHTML = filteredResults.map(node => `
                        <div class="node-option" data-node-id="${node.id}">
                            <div class="node-option-content">${node.content || 'Untitled'}</div>
                            ${node.content_zh ? `<div class="node-option-content-zh">${node.content_zh}</div>` : ''}
                            <div class="node-option-meta">In pool since ${new Date(node.added_at).toLocaleDateString()}</div>
                        </div>
                    `).join('');
                    
                    // Add click handlers
                    dropdownContent.querySelectorAll('.node-option').forEach(option => {
                        option.addEventListener('click', function() {
                            input.value = this.querySelector('.node-option-content').textContent;
                            input.dataset.selectedNodeId = this.dataset.nodeId;
                            dropdown.classList.remove('show');
                        });
                    });
                }
                
                dropdown.classList.add('show');
            } catch (error) {
                console.error('Error searching pool nodes:', error);
                dropdownContent.innerHTML = '<div class="error-message">Error searching pool nodes</div>';
            }
        });
    }

    async function addNewLink() {
        const targetInput = document.getElementById('new-link-target');
        const weightInput = document.getElementById('new-link-weight');
        const descriptionInput = document.getElementById('new-link-description');
        
        const targetNodeId = targetInput.dataset.selectedNodeId;
        const weight = parseFloat(weightInput.value) || 1.0;
        const description = descriptionInput.value.trim();
        
        if (!targetNodeId) {
            showNotification('Please select a target node', 'warning');
            return;
        }
        
        try {
            const response = await fetch('/api/links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    from_node_id: currentEditingNode.id,
                    to_node_id: targetNodeId,
                    weight,
                    description
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create link');
            }
            
            // Clear form
            targetInput.value = '';
            targetInput.dataset.selectedNodeId = '';
            weightInput.value = '1.0';
            descriptionInput.value = '';
            
            // Reload links
            await loadNodeLinks(currentEditingNode.id);
            
            // Switch to outgoing links tab
            document.querySelector('#edit-node-modal .tab[data-tab="outgoing"]').click();
            
            showNotification('Link added successfully!', 'success');
            
        } catch (error) {
            console.error('Error adding link:', error);
            showNotification(error.message || 'Error adding link', 'error');
        }
    }

    let currentEditingLink = null;
    let currentEditingLinkNodeId = null; // Add this new variable

    async function editLink(link) {
        currentEditingLink = link;
        // Store the node ID that we need to reload links for
        currentEditingLinkNodeId = currentEditingNode?.id;
        
        // Populate the form
        document.getElementById('edit-link-weight').value = link.weight;
        document.getElementById('edit-link-description').value = link.description || '';
        
        // Show modal
        const modal = document.getElementById('edit-link-modal');
        modal.classList.add('show');
        modal.style.display = 'flex';
        
        // Focus on weight field
        setTimeout(() => document.getElementById('edit-link-weight').focus(), 100);
    }

    function closeEditLinkModal() {
        const modal = document.getElementById('edit-link-modal');
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 200);
        
        // Reset form
        document.getElementById('edit-link-form').reset();
        currentEditingLink = null;
        currentEditingLinkNodeId = null; // Reset this too
    }

    async function saveEditedLink(e) {
        e.preventDefault();
        
        if (!currentEditingLink) {
            showNotification('No link being edited', 'error');
            return;
        }
        
        const weight = parseFloat(document.getElementById('edit-link-weight').value);
        const description = document.getElementById('edit-link-description').value.trim();
        
        if (isNaN(weight) || weight <= 0) {
            showNotification('Please enter a valid weight', 'warning');
            return;
        }
        
        try {
            const response = await fetch(`/api/links/${currentEditingLink.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    weight: weight,
                    description: description
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update link');
            }
            
            closeEditLinkModal();
            
            // Only reload links if we have a valid node ID and the edit node modal is still open
            if (currentEditingLinkNodeId && currentEditingNode?.id === currentEditingLinkNodeId) {
                await loadNodeLinks(currentEditingLinkNodeId);
            }
            
            // Also refresh the main graph to show updated link weights
            await refreshGraph();
            
            showNotification('Link updated successfully!', 'success');
            
        } catch (error) {
            console.error('Error updating link:', error);
            showNotification(error.message || 'Error updating link', 'error');
        }
    }

    async function deleteLink(linkId) {
        if (!confirm('Are you sure you want to delete this link?')) {
            return;
        }
        
        // Store the current editing node ID at the start to avoid timing issues
        const editingNodeId = currentEditingNode?.id;
        
        if (!editingNodeId) {
            showNotification('Error: No node being edited', 'error');
            return;
        }
        
        try {
            const response = await fetch(`/api/links/${linkId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete link');
            }
            
            // Reload links using the stored node ID
            await loadNodeLinks(editingNodeId);
            
            showNotification('Link deleted successfully!', 'success');
            
        } catch (error) {
            console.error('Error deleting link:', error);
            showNotification(error.message || 'Error deleting link', 'error');
        }
    }

    async function saveNodeEdits(e) {
        e.preventDefault();
        
        const content = document.getElementById('edit-node-content').value.trim();
        const content_zh = document.getElementById('edit-node-content-zh').value.trim();
        
        if (!content) {
            showNotification('Content cannot be empty', 'warning');
            return;
        }
        
        try {
            const response = await fetch(`/api/nodes/${currentEditingNode.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content,
                    content_zh
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update node');
            }
            
            // Update local node data
            currentEditingNode.content = content;
            currentEditingNode.content_zh = content_zh;
            
            // Update the node in graphData
            const nodeInGraph = graphData.nodes.find(n => n.id === currentEditingNode.id);
            if (nodeInGraph) {
                nodeInGraph.content = content;
                nodeInGraph.content_zh = content_zh;
            }
            
            closeEditNodeModal();
            await refreshGraph();
            
            showNotification('Node updated successfully!', 'success');
            
        } catch (error) {
            console.error('Error updating node:', error);
            showNotification(error.message || 'Error updating node', 'error');
        }
    }

    function closeEditNodeModal() {
        const modal = document.getElementById('edit-node-modal');
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 200);
        
        // Reset form
        document.getElementById('edit-node-form').reset();
        currentEditingNode = null;
        currentNodeLinks = { outgoing: [], incoming: [] };
    }

    // Manual Placement Functions
function startManualPlacement() {
    manualPlacementState.isActive = true;
    manualPlacementState.phase = 'initial';
    manualPlacementState.placedNodes.clear();
    manualPlacementState.initialNodes.clear();
    manualPlacementState.nodesToPlace = [];
    manualPlacementState.currentNodeIndex = 0;
    
    // Show manual placement controls
    const controls = document.getElementById('manual-placement-controls');
    if (controls) {
        controls.style.display = 'block';
    }
    
    // Calculate initial layout for depth 1-2 nodes only
    const initialLayout = calculateManualInitialLayout();
    manualPlacementState.nodePositions = initialLayout;
    
    // Render with initial placement
    renderManualGraph();
    
    updateManualPlacementUI();
}

function calculateManualInitialLayout() {
    const nodes = graphData.nodes || [];
    const links = graphData.links || [];
    const distances = graphData.distances || {};
    const depths = graphData.depths || {};
    
    // Filter nodes by depth (only depth 1-2)
    const initialNodes = nodes.filter(node => {
        const depth = depths[node.id] || 0;
        return depth <= 2;
    });
    
    // Nodes that will need manual placement (depth > 2)
    const remainingNodes = nodes.filter(node => {
        const depth = depths[node.id] || 0;
        return depth > 2;
    });
    
    // SORT REMAINING NODES BY DEPTH (3 hops, then 4 hops, then 5 hops, etc.)
    remainingNodes.sort((a, b) => {
        const depthA = depths[a.id] || 0;
        const depthB = depths[b.id] || 0;
        
        // Primary sort: by depth (ascending - 3 hops first, then 4, then 5, etc.)
        if (depthA !== depthB) {
            return depthA - depthB;
        }
        
        // Secondary sort: by node content for consistent ordering within same depth
        const contentA = a.content || a.content_zh || '';
        const contentB = b.content || b.content_zh || '';
        return contentA.localeCompare(contentB);
    });
    
    // Store which nodes are initial vs manual
    initialNodes.forEach(node => {
        manualPlacementState.initialNodes.add(node.id);
        manualPlacementState.placedNodes.add(node.id);
    });
    
    manualPlacementState.nodesToPlace = remainingNodes;
    
    // Use distance-based layout for initial nodes
    const centerX = 400;
    const centerY = 300;
    const maxRadius = 250;
    
    // Calculate positions using the existing distance-based algorithm but only for initial nodes
    const allPositions = calculateDistanceBasedLayout(nodes, links, distances, centerX, centerY, maxRadius);
    
    // Return only positions for initial nodes
    const initialPositions = {};
    initialNodes.forEach(node => {
        if (allPositions[node.id]) {
            initialPositions[node.id] = allPositions[node.id];
        }
    });
    
    return initialPositions;
}

function renderManualGraph() {
    const canvasArea = document.getElementById('local-graph-canvas');
    const nodes = graphData.nodes || [];
    const links = graphData.links || [];
    
    // Clear canvas
    canvasArea.innerHTML = '';
    
    // Create SVG with zoom and pan capabilities (similar to existing renderGraph)
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.background = '#fff';
    svg.style.cursor = manualPlacementState.phase === 'placing' ? 'crosshair' : 'grab';
    
    // Create main group for zoom/pan transformations
    const mainGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    mainGroup.setAttribute('id', 'main-graph-group');
    
    // Zoom and pan state - ADD THESE MISSING VARIABLES
    let currentZoom = 1;
    let currentPanX = 0;
    let currentPanY = 0;
    let isPanning = false;
    let panStartX = 0;
    let panStartY = 0;
    let panStartPanX = 0;
    let panStartPanY = 0;
    
    // Node dragging state
    let draggedNode = null;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    let hasDragged = false;
    
    // Zoom constraints
    const MIN_ZOOM = 0.2;
    const MAX_ZOOM = 5;
    
    // Add gradients and filters (reuse from existing code)
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    
    // Silver gradient for pool rings
    const silverGradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    silverGradient.setAttribute('id', 'silverGradient');
    silverGradient.setAttribute('x1', '0%');
    silverGradient.setAttribute('y1', '0%');
    silverGradient.setAttribute('x2', '100%');
    silverGradient.setAttribute('y2', '100%');
    
    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', '#f8fafc');
    stop1.setAttribute('stop-opacity', '1');
    
    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop2.setAttribute('offset', '50%');
    stop2.setAttribute('stop-color', '#cbd5e1');
    stop2.setAttribute('stop-opacity', '1');
    
    const stop3 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop3.setAttribute('offset', '100%');
    stop3.setAttribute('stop-color', '#94a3b8');
    stop3.setAttribute('stop-opacity', '1');
    
    silverGradient.appendChild(stop1);
    silverGradient.appendChild(stop2);
    silverGradient.appendChild(stop3);
    defs.appendChild(silverGradient);
    
    // Subtle glow filter for pool nodes
    const glowFilter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    glowFilter.setAttribute('id', 'poolGlow');
    glowFilter.setAttribute('x', '-50%');
    glowFilter.setAttribute('y', '-50%');
    glowFilter.setAttribute('width', '200%');
    glowFilter.setAttribute('height', '200%');
    
    const feGaussianBlur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
    feGaussianBlur.setAttribute('stdDeviation', '2');
    feGaussianBlur.setAttribute('result', 'coloredBlur');
    
    const feMerge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
    const feMergeNode1 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
    feMergeNode1.setAttribute('in', 'coloredBlur');
    const feMergeNode2 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
    feMergeNode2.setAttribute('in', 'SourceGraphic');
    
    feMerge.appendChild(feMergeNode1);
    feMerge.appendChild(feMergeNode2);
    glowFilter.appendChild(feGaussianBlur);
    glowFilter.appendChild(feMerge);
    defs.appendChild(glowFilter);
    
    svg.appendChild(defs);
    
    // Create links group
    const linksGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    linksGroup.setAttribute('id', 'links-group');
    
    // Create nodes group
    const nodesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    nodesGroup.setAttribute('id', 'nodes-group');
    
    // Only render placed nodes and their connections
    const placedNodes = nodes.filter(node => manualPlacementState.placedNodes.has(node.id));
    const placedNodeIds = new Set(placedNodes.map(n => n.id));
    
    // Filter links to only show connections between placed nodes
    const visibleLinks = links.filter(link => 
        placedNodeIds.has(link.from_node_id) && placedNodeIds.has(link.to_node_id)
    );
    
    // Draw links
    const linkElements = [];
    visibleLinks.forEach(link => {
        const sourcePos = manualPlacementState.nodePositions[link.from_node_id];
        const targetPos = manualPlacementState.nodePositions[link.to_node_id];
        
        if (sourcePos && targetPos) {
            const linkData = createLinkElement(link, sourcePos, targetPos, 'manual');
            linksGroup.appendChild(linkData.linkGroup);
            linkElements.push(linkData);
        }
    });
    
    // Draw nodes
    const nodeElements = [];
    placedNodes.forEach(node => {
        const pos = manualPlacementState.nodePositions[node.id];
        if (!pos) return;
        
        const nodeData = createManualNodeElement(node, pos);
        nodeElements.push(nodeData);
        nodesGroup.appendChild(nodeData.element);
    });

    
    // Add manual placement interaction for placing new nodes (only in placing phase)
    if (manualPlacementState.phase === 'placing') {
        // Add click handler for placing nodes
        svg.addEventListener('click', (e) => {
            if (manualPlacementState.phase !== 'placing' || manualPlacementState.currentNodeIndex >= manualPlacementState.nodesToPlace.length) {
                return;
            }
            
            // Don't place if we're dragging or panning
            if (isPanning || draggedNode) return;
            
            // Get click position relative to SVG (accounting for zoom/pan)
            const svgCoords = screenToSVG(e.clientX, e.clientY, svg, currentPanX, currentPanY, currentZoom);
            
            // Place the current node
            const currentNode = manualPlacementState.nodesToPlace[manualPlacementState.currentNodeIndex];
            manualPlacementState.nodePositions[currentNode.id] = { x: svgCoords.x, y: svgCoords.y };
            manualPlacementState.placedNodes.add(currentNode.id);
            
            // Move to next node
            manualPlacementState.currentNodeIndex++;
            
            // Re-render graph with new node
            renderManualGraph();
            
            // Update UI
            updateManualPlacementUI();
            
            // Check if we're done
            if (manualPlacementState.currentNodeIndex >= manualPlacementState.nodesToPlace.length) {
                completeManualPlacement();
            }
        });
    }
    
    // Mouse event handlers for both node dragging and canvas panning
    svg.addEventListener('mousedown', (e) => {
        e.preventDefault();
        
        // Check if we clicked on a node
        const target = e.target.closest('g[data-node-id]');
        if (target && manualPlacementState.phase === 'initial') {
            // Start node dragging (only in initial phase)
            const nodeId = target.getAttribute('data-node-id');
            if (manualPlacementState.initialNodes.has(nodeId)) {
                draggedNode = nodeElements.find(n => n.nodeId === nodeId);
                
                if (draggedNode) {
                    const svgCoords = screenToSVG(e.clientX, e.clientY, svg, currentPanX, currentPanY, currentZoom);
                    dragStartX = e.clientX;
                    dragStartY = e.clientY;
                    dragOffsetX = svgCoords.x - draggedNode.position.x;
                    dragOffsetY = svgCoords.y - draggedNode.position.y;
                    hasDragged = false;
                    
                    draggedNode.element.style.cursor = 'grabbing';
                    
                    // Bring node to front
                    nodesGroup.appendChild(draggedNode.element);
                }
            }
        } else {
            // Start canvas panning
            isPanning = true;
            svg.style.cursor = 'grabbing';
            
            panStartX = e.clientX;
            panStartY = e.clientY;
            panStartPanX = currentPanX;
            panStartPanY = currentPanY;
        }
    });
    
    svg.addEventListener('mousemove', (e) => {
        if (draggedNode) {
            // Handle node dragging
            const deltaX = e.clientX - dragStartX;
            const deltaY = e.clientY - dragStartY;
            
            // Check if we've moved enough to consider this a drag
            if (!hasDragged && (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3)) {
                hasDragged = true;
            }
            
            if (hasDragged) {
                const svgCoords = screenToSVG(e.clientX, e.clientY, svg, currentPanX, currentPanY, currentZoom);
                draggedNode.position.x = svgCoords.x - dragOffsetX;
                draggedNode.position.y = svgCoords.y - dragOffsetY;
                
                // Update stored position
                manualPlacementState.nodePositions[draggedNode.nodeId] = { 
                    x: draggedNode.position.x, 
                    y: draggedNode.position.y 
                };
                
                updateNodePosition(draggedNode);
                updateLinks(linkElements, nodeElements);
            }
        } else if (isPanning) {
            // Handle canvas panning
            const deltaX = e.clientX - panStartX;
            const deltaY = e.clientY - panStartY;
            
            currentPanX = panStartPanX + deltaX;
            currentPanY = panStartPanY + deltaY;
            
            updateTransform(mainGroup, currentPanX, currentPanY, currentZoom);
        }
    });
    
    svg.addEventListener('mouseup', (e) => {
        if (draggedNode) {
            draggedNode.element.style.cursor = 'move';
            
            // If we didn't drag, treat it as a click
            if (!hasDragged) {
                selectNode(draggedNode.node);
            }
            
            draggedNode = null;
            hasDragged = false;
        }
        
        if (isPanning) {
            isPanning = false;
            svg.style.cursor = manualPlacementState.phase === 'placing' ? 'crosshair' : 'grab';
        }
    });
    
    // Add right-click context menu to nodes
    nodeElements.forEach(nodeData => {
        nodeData.element.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showNodeContextMenu(e, nodeData.node);
        });
    });
    
    // Zoom functionality
    svg.addEventListener('wheel', (e) => {
        e.preventDefault();
        
        const rect = svg.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Calculate zoom
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentZoom * zoomFactor));
        
        if (newZoom !== currentZoom) {
            // Zoom towards mouse position
            const zoomRatio = newZoom / currentZoom;
            
            currentPanX = mouseX - (mouseX - currentPanX) * zoomRatio;
            currentPanY = mouseY - (mouseY - currentPanY) * zoomRatio;
            currentZoom = newZoom;
            
            updateTransform(mainGroup, currentPanX, currentPanY, currentZoom);
            updateZoomInfo();
        }
    });
    
    // Touch support for mobile
    let touchStartDistance = 0;
    let touchStartZoom = 1;
    let touchStartPan = { x: 0, y: 0 };
    
    svg.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            // Pinch zoom start
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            touchStartDistance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
            touchStartZoom = currentZoom;
            touchStartPan = { x: currentPanX, y: currentPanY };
        }
    });
    
    svg.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const currentDistance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
            
            if (touchStartDistance > 0) {
                const zoomRatio = currentDistance / touchStartDistance;
                const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, touchStartZoom * zoomRatio));
                
                if (newZoom !== currentZoom) {
                    currentZoom = newZoom;
                    updateTransform(mainGroup, currentPanX, currentPanY, currentZoom);
                    updateZoomInfo();
                }
            }
        }
    });
    
    // Function to update zoom info in UI
    function updateZoomInfo() {
        const zoomPercent = Math.round(currentZoom * 100);
        const distanceDisplay = document.getElementById('distance-display');
        if (distanceDisplay) {
            const originalText = distanceDisplay.textContent.split(' | ')[0];
            distanceDisplay.textContent = `${originalText} | Zoom: ${zoomPercent}%`;
        }
    }
    
    // Initial transform
    updateTransform(mainGroup, currentPanX, currentPanY, currentZoom);
    updateZoomInfo();
    
    canvasArea.appendChild(svg);
}

function createManualNodeElement(node, pos) {
    const isCenter = node.id === centerNodeId;
    const isInitial = manualPlacementState.initialNodes.has(node.id);
    
    // Create node group
    const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    nodeGroup.setAttribute('data-node-id', node.id);
    nodeGroup.style.cursor = isInitial ? 'move' : 'default';
    
    // Node circle with different styling for initial vs manual nodes
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', pos.x);
    circle.setAttribute('cy', pos.y);
    circle.setAttribute('r', isCenter ? 14 : 10);
    circle.setAttribute('class', 'main-node-circle');
    
    if (isCenter) {
        circle.setAttribute('fill', '#6366f1');
        circle.setAttribute('stroke', '#4f46e5');
        circle.setAttribute('stroke-width', '3');
    } else if (isInitial) {
        circle.setAttribute('fill', '#10b981'); // Green for initial nodes
        circle.setAttribute('stroke', '#059669');
        circle.setAttribute('stroke-width', '2');
    } else {
        circle.setAttribute('fill', '#8b5cf6'); // Purple for manually placed nodes
        circle.setAttribute('stroke', '#7c3aed');
        circle.setAttribute('stroke-width', '2');
    }
    
    nodeGroup.appendChild(circle);
    
    // Node label
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', pos.x);
    text.setAttribute('y', pos.y - (isCenter ? 20 : 16));
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-size', isCenter ? '11' : '9');
    text.setAttribute('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif');
    text.setAttribute('font-weight', isCenter ? '600' : '500');
    text.setAttribute('fill', '#1e293b');
    text.textContent = (node.content || 'Untitled').substring(0, 20) + (node.content?.length > 20 ? '...' : '');
    text.style.pointerEvents = 'none';
    
    nodeGroup.appendChild(text);
    
    return {
        element: nodeGroup,
        circle: circle,
        text: text,
        nodeId: node.id,
        position: pos,
        node: node
    };
}

function updateManualPlacementUI() {
    const titleElement = document.getElementById('manual-placement-title');
    const progressText = document.getElementById('manual-progress-text');
    const progressFill = document.getElementById('manual-progress-fill');
    const currentNodeName = document.getElementById('current-node-name');
    const remainingCount = document.getElementById('remaining-nodes-count');
    
    const totalPhases = 3;
    let currentPhase = 1;
    let progress = 0;
    
    switch (manualPlacementState.phase) {
        case 'initial':
            currentPhase = 1;
            progress = 33;
            if (titleElement) titleElement.textContent = 'Step 1: Initial Placement';
            document.getElementById('manual-phase-initial').style.display = 'block';
            document.getElementById('manual-phase-placing').style.display = 'none';
            document.getElementById('manual-phase-complete').style.display = 'none';
            break;
            
        case 'placing':
            currentPhase = 2;
            const placedCount = manualPlacementState.currentNodeIndex;
            const totalToPlace = manualPlacementState.nodesToPlace.length;
            progress = 33 + ((placedCount / totalToPlace) * 34);
            
            if (titleElement) titleElement.textContent = 'Step 2: Manual Placement';
            document.getElementById('manual-phase-initial').style.display = 'none';
            document.getElementById('manual-phase-placing').style.display = 'block';
            document.getElementById('manual-phase-complete').style.display = 'none';
            
            if (manualPlacementState.currentNodeIndex < manualPlacementState.nodesToPlace.length) {
                const currentNode = manualPlacementState.nodesToPlace[manualPlacementState.currentNodeIndex];
                if (currentNodeName) {
                    currentNodeName.textContent = currentNode.content || currentNode.content_zh || 'Untitled';
                }
                if (remainingCount) {
                    remainingCount.textContent = `Remaining: ${totalToPlace - placedCount} nodes`;
                }
            }
            break;
            
        case 'complete':
            currentPhase = 3;
            progress = 100;
            if (titleElement) titleElement.textContent = 'Step 3: Complete';
            document.getElementById('manual-phase-initial').style.display = 'none';
            document.getElementById('manual-phase-placing').style.display = 'none';
            document.getElementById('manual-phase-complete').style.display = 'block';
            break;
    }
    
    if (progressText) {
        progressText.textContent = `Step ${currentPhase} of ${totalPhases}`;
    }
    
    if (progressFill) {
        progressFill.style.width = `${progress}%`;
    }
}

function setupManualPlacementHandlers() {
    const proceedBtn = document.getElementById('manual-proceed-btn');
    const resetBtn = document.getElementById('manual-reset-positions-btn');
    const skipBtn = document.getElementById('manual-skip-node-btn');
    const autoPlaceBtn = document.getElementById('manual-auto-place-remaining-btn');
    const cancelBtn = document.getElementById('manual-cancel-btn');
    const finishBtn = document.getElementById('manual-finish-btn');
    
    if (proceedBtn) {
        proceedBtn.addEventListener('click', () => {
            manualPlacementState.phase = 'placing';
            updateManualPlacementUI();
            renderManualGraph();
        });
    }
    
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            // Reset initial positions to auto-calculated ones
            const initialLayout = calculateManualInitialLayout();
            Object.keys(initialLayout).forEach(nodeId => {
                manualPlacementState.nodePositions[nodeId] = initialLayout[nodeId];
            });
            renderManualGraph();
        });
    }
    
    if (skipBtn) {
        skipBtn.addEventListener('click', () => {
            // Skip current node (place it at a default position)
            if (manualPlacementState.currentNodeIndex < manualPlacementState.nodesToPlace.length) {
                const currentNode = manualPlacementState.nodesToPlace[manualPlacementState.currentNodeIndex];
                
                // Place at a default position (e.g., top-right corner)
                manualPlacementState.nodePositions[currentNode.id] = { x: 600, y: 100 + (manualPlacementState.currentNodeIndex * 30) };
                manualPlacementState.placedNodes.add(currentNode.id);
                manualPlacementState.currentNodeIndex++;
                
                renderManualGraph();
                updateManualPlacementUI();
                
                if (manualPlacementState.currentNodeIndex >= manualPlacementState.nodesToPlace.length) {
                    completeManualPlacement();
                }
            }
        });
    }
    
    if (autoPlaceBtn) {
        autoPlaceBtn.addEventListener('click', () => {
            // Auto-place all remaining nodes
            const remaining = manualPlacementState.nodesToPlace.slice(manualPlacementState.currentNodeIndex);
            remaining.forEach((node, index) => {
                // Place in a grid pattern
                const x = 500 + (index % 3) * 80;
                const y = 200 + Math.floor(index / 3) * 60;
                manualPlacementState.nodePositions[node.id] = { x, y };
                manualPlacementState.placedNodes.add(node.id);
            });
            
            manualPlacementState.currentNodeIndex = manualPlacementState.nodesToPlace.length;
            completeManualPlacement();
        });
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            exitManualPlacement();
            // Switch back to distance-based layout
            const layoutSelect = document.getElementById('layout-mode-select');
            if (layoutSelect) {
                layoutSelect.value = 'distance-based';
                currentLayoutMode = 'distance-based';
                renderGraph();
            }
        });
    }
    
    if (finishBtn) {
        finishBtn.addEventListener('click', () => {
            exitManualPlacement();
            showNotification('Manual placement completed!', 'success');
        });
    }
}

function completeManualPlacement() {
    manualPlacementState.phase = 'complete';
    updateManualPlacementUI();
    renderManualGraph();
}

function exitManualPlacement() {
    manualPlacementState.isActive = false;
    manualPlacementState.phase = 'initial';
    manualPlacementState.placedNodes.clear();
    manualPlacementState.initialNodes.clear();
    manualPlacementState.nodesToPlace = [];
    manualPlacementState.currentNodeIndex = 0;
    manualPlacementState.nodePositions = {};
    
    // Hide manual placement controls
    const controls = document.getElementById('manual-placement-controls');
    if (controls) {
        controls.style.display = 'none';
    }
}

function calculateHybridLayout(nodes, links, distances, centerX, centerY, maxRadius) {
    const nodePositions = {};
    const BASE_EDGE_SCALE_FACTOR = 40;
    
    // Function to get scale factor based on depth (same as distance-based)
    function getScaleFactorForDepth(depth) {
        if (depth <= 2) {
            return BASE_EDGE_SCALE_FACTOR * 3; // 120 pixels per weight unit
        }
        return BASE_EDGE_SCALE_FACTOR; // 40 pixels per weight unit
    }
    
    // Fixed radius calculation for concentric circles
    function getFixedRadiusForDepth(depth, weightScale = 1.0) {
        const BASE_RADIUS_DEPTH_2 = 160;
        const BASE_RADIUS_DEPTH_1 = BASE_RADIUS_DEPTH_2 / 2;
        
        if (depth === 1) {
            return BASE_RADIUS_DEPTH_1 * weightScale;
        } else if (depth === 2) {
            return BASE_RADIUS_DEPTH_2 * weightScale;
        }
        return 0; // Should not happen for depths 1-2
    }
    
    // Start with center node at origin
    nodePositions[centerNodeId] = { x: centerX, y: centerY };
    
    // Build adjacency list with weights
    const adjacencyList = new Map();
    links.forEach(link => {
        if (!adjacencyList.has(link.from_node_id)) {
            adjacencyList.set(link.from_node_id, []);
        }
        if (!adjacencyList.has(link.to_node_id)) {
            adjacencyList.set(link.to_node_id, []);
        }
        
        adjacencyList.get(link.from_node_id).push({
            nodeId: link.to_node_id,
            weight: link.weight || 1.0,
            linkId: link.id
        });
        adjacencyList.get(link.to_node_id).push({
            nodeId: link.from_node_id,
            weight: link.weight || 1.0,
            linkId: link.id
        });
    });
    
    // Group nodes by depth (hop count from center) - ENSURE PROPER DEPTH ASSIGNMENT
    const nodesByDepth = new Map();
    const nodeDepths = new Map();
    const visited = new Set();
    const queue = [{ nodeId: centerNodeId, depth: 0 }];
    
    // BFS to assign depths - this ensures depth 1 = 1 hop, depth 2 = 2 hops
    while (queue.length > 0) {
        const { nodeId, depth } = queue.shift();
        
        if (visited.has(nodeId)) continue;
        visited.add(nodeId);
        
        nodeDepths.set(nodeId, depth);
        
        if (!nodesByDepth.has(depth)) {
            nodesByDepth.set(depth, []);
        }
        nodesByDepth.get(depth).push(nodeId);
        
        // Add neighbors to queue with depth + 1
        const neighbors = adjacencyList.get(nodeId) || [];
        neighbors.forEach(neighbor => {
            if (!visited.has(neighbor.nodeId)) {
                queue.push({ nodeId: neighbor.nodeId, depth: depth + 1 });
            }
        });
    }
    
    // CRITICAL FIX: Store depths in global graphData for rendering
    if (!graphData.depths) {
        graphData.depths = {};
    }
    
    // Convert Map to object and store in graphData
    for (let [nodeId, depth] of nodeDepths.entries()) {
        graphData.depths[nodeId] = depth;
    }
    
    console.log('Hybrid Layout Debug - Nodes by depth:');
    for (let [depth, nodeIds] of nodesByDepth.entries()) {
        console.log(`Depth ${depth}: ${nodeIds.length} nodes`, nodeIds);
    }
    
    // Calculate global weight scale for consistent sizing
    let globalAvgWeight = 1.0;
    let globalWeightCount = 0;
    
    links.forEach(link => {
        globalAvgWeight += link.weight || 1.0;
        globalWeightCount++;
    });
    
    if (globalWeightCount > 0) {
        globalAvgWeight = globalAvgWeight / globalWeightCount;
    }
    
    const weightScale = Math.max(0.5, Math.min(2.0, globalAvgWeight));
    
    // Store the depth 2 circle radius for later constraint checking
    const depth1Radius = getFixedRadiusForDepth(1, weightScale);
    const depth2Radius = getFixedRadiusForDepth(2, weightScale);
    
    // IMPROVED: Calculate minimum distance based on the gap between depth 1 and 2 circles
    const circleGap = depth2Radius - depth1Radius; // This is 80 pixels with default values
    const minOutsideRadius = depth2Radius + circleGap; // Push out by same distance as between circles
    
    console.log(`Circle radii - Depth 1: ${depth1Radius}, Depth 2: ${depth2Radius}, Gap: ${circleGap}, MinOutside: ${minOutsideRadius}`);

    // Process depth 1 nodes (inner circle) and depth 2 nodes (outer circle)
    for (let depth = 1; depth <= 2; depth++) {
        const nodesAtDepth = nodesByDepth.get(depth) || [];
        if (nodesAtDepth.length === 0) continue;
        
        console.log(`Processing depth ${depth}: ${nodesAtDepth.length} nodes`);
        
        // Use fixed radius calculation to maintain 1:2 ratio
        const radius = getFixedRadiusForDepth(depth, weightScale);
        
        // Use crossing minimization for node placement
        const optimizedPositions = minimizeCrossingsOnCircle(
            nodesAtDepth, 
            links, 
            nodeDepths, 
            centerX, 
            centerY, 
            radius
        );
        
        // Assign positions
        Object.entries(optimizedPositions).forEach(([nodeId, pos]) => {
            nodePositions[nodeId] = pos;
        });
    }
    
    // Process deeper nodes (depth > 2) using distance-based approach with constraint
    const positioned = new Set([centerNodeId, ...nodesByDepth.get(1) || [], ...nodesByDepth.get(2) || []]);

    // FIXED: Get the actual maximum depth, not just from keys
    const allDepths = Array.from(nodesByDepth.keys());
    const maxDepth = allDepths.length > 0 ? Math.max(...allDepths) : 0;

    console.log(`Processing deeper nodes from depth 3 to ${maxDepth}`);

    // FIXED: Process nodes depth by depth, positioning them incrementally
    for (let depth = 3; depth <= maxDepth; depth++) {
        const nodesAtDepth = nodesByDepth.get(depth) || [];
        console.log(`Depth ${depth}: ${nodesAtDepth.length} nodes to position`);
        
        // Collect nodes at this depth that need positioning
        const toPositionAtThisDepth = [];
        
        nodesAtDepth.forEach(nodeId => {
            if (positioned.has(nodeId)) return; // Skip if already positioned
            
            // Find the best parent (positioned node with shortest edge weight)
            const neighbors = adjacencyList.get(nodeId) || [];
            let bestParent = null;
            let bestWeight = Infinity;
            
            neighbors.forEach(neighbor => {
                if (positioned.has(neighbor.nodeId) && neighbor.weight < bestWeight) {
                    bestParent = neighbor.nodeId;
                    bestWeight = neighbor.weight;
                }
            });
            
            if (bestParent && isFinite(bestWeight) && bestWeight > 0) {
                toPositionAtThisDepth.push({
                    nodeId: nodeId,
                    fromNodeId: bestParent,
                    edgeWeight: bestWeight,
                    priority: depth
                });
            } else {
                console.warn(`Node ${nodeId} at depth ${depth} has no valid positioned parent! Using fallback.`);
                // FALLBACK: Use center node as parent if no positioned neighbor found
                toPositionAtThisDepth.push({
                    nodeId: nodeId,
                    fromNodeId: centerNodeId,
                    edgeWeight: 2.0, // Default weight
                    priority: depth
                });
            }
        });
        
        // Sort nodes at this depth by edge weight (position closest connections first)
        toPositionAtThisDepth.sort((a, b) => a.edgeWeight - b.edgeWeight);
        
        // Position each node at this depth
        toPositionAtThisDepth.forEach((current, index) => {
            const fromPos = nodePositions[current.fromNodeId];
            if (!fromPos) {
                console.error(`Parent node ${current.fromNodeId} not positioned for node ${current.nodeId}`);
                return;
            }
            
            // SAFETY CHECK: Validate fromPos coordinates
            if (!isFinite(fromPos.x) || !isFinite(fromPos.y)) {
                console.error(`Invalid parent position for node ${current.nodeId}:`, fromPos);
                return;
            }
            
            const scaleFactorForThisDepth = getScaleFactorForDepth(current.priority);
            const desiredDistance = current.edgeWeight * scaleFactorForThisDepth;
            
            // SAFETY CHECK: Validate desiredDistance
            if (!isFinite(desiredDistance) || desiredDistance <= 0) {
                console.error(`Invalid desired distance for node ${current.nodeId}: ${desiredDistance} (weight: ${current.edgeWeight}, scale: ${scaleFactorForThisDepth})`);
                return;
            }
            
            let bestAngle = findBestAngleForNode(
                current.nodeId,
                fromPos,
                desiredDistance,
                nodePositions,
                links,
                positioned,
                centerX,
                centerY
            );
            
            // SAFETY CHECK: Validate bestAngle
            if (!isFinite(bestAngle)) {
                console.error(`Invalid angle for node ${current.nodeId}: ${bestAngle}`);
                // Use a random angle as fallback
                bestAngle = Math.random() * 2 * Math.PI;
            }
            
            let newPos = {
                x: fromPos.x + Math.cos(bestAngle) * desiredDistance,
                y: fromPos.y + Math.sin(bestAngle) * desiredDistance
            };
            
            // SAFETY CHECK: Validate newPos coordinates
            if (!isFinite(newPos.x) || !isFinite(newPos.y)) {
                console.error(`Invalid calculated position for node ${current.nodeId}:`, newPos);
                console.error(`fromPos:`, fromPos, `angle:`, bestAngle, `distance:`, desiredDistance);
                // Use fallback position
                const fallbackAngle = Math.random() * 2 * Math.PI;
                newPos = {
                    x: centerX + Math.cos(fallbackAngle) * (minOutsideRadius + 20),
                    y: centerY + Math.sin(fallbackAngle) * (minOutsideRadius + 20)
                };
            }
            
            // CONSTRAINT: Ensure the node is outside the depth 2 circle
            const distanceFromCenter = Math.sqrt(
                Math.pow(newPos.x - centerX, 2) + 
                Math.pow(newPos.y - centerY, 2)
            );
            
            if (distanceFromCenter < minOutsideRadius) {
                // Push the node outward to be just outside the depth 2 circle
                const angleFromCenter = Math.atan2(newPos.y - centerY, newPos.x - centerX);
                newPos = {
                    x: centerX + Math.cos(angleFromCenter) * minOutsideRadius,
                    y: centerY + Math.sin(angleFromCenter) * minOutsideRadius
                };
            }
            
            // FINAL SAFETY CHECK: Ensure final position is valid
            if (!isFinite(newPos.x) || !isFinite(newPos.y)) {
                console.error(`Final position still invalid for node ${current.nodeId}:`, newPos);
                // Last resort fallback
                newPos = {
                    x: centerX + Math.random() * 100 - 50,
                    y: centerY + Math.random() * 100 - 50
                };
            }
            
            // CRITICAL: Add the positioned node to our tracking sets immediately
            nodePositions[current.nodeId] = newPos;
            positioned.add(current.nodeId);
            
            console.log(`Positioned node ${current.nodeId} at depth ${current.priority} (${index + 1}/${toPositionAtThisDepth.length}) at (${newPos.x.toFixed(1)}, ${newPos.y.toFixed(1)})`);
        });
        
        console.log(`Completed depth ${depth}. Total positioned nodes: ${positioned.size}`);
    }

    console.log(`Final positioned nodes: ${Object.keys(nodePositions).length}`);
    console.log('Positioned node IDs:', Object.keys(nodePositions));
    
    // ADDITIONAL FIX: Ensure all nodes from the original nodes array have positions
    nodes.forEach(node => {
        if (!nodePositions[node.id]) {
            console.error(`Node ${node.id} missing position! Adding fallback position.`);
            // Improved fallback: place missing nodes well outside the depth 2 circle
            const angle = Math.random() * 2 * Math.PI;
            const fallbackDistance = minOutsideRadius + circleGap;
            nodePositions[node.id] = {
                x: centerX + Math.cos(angle) * fallbackDistance,
                y: centerY + Math.sin(angle) * fallbackDistance
            };
        }
    });
    
    // Modified refinement to respect the outer boundary constraint
    refineHybridLayoutWithConstraints(nodePositions, links, adjacencyList, nodeDepths, getScaleFactorForDepth, centerNodeId, centerX, centerY, minOutsideRadius);
    
    return nodePositions;
}

// New refinement function that respects the outer boundary constraint
function refineHybridLayoutWithConstraints(nodePositions, links, adjacencyList, nodeDepths, getScaleFactorForDepth, centerNodeId, centerX, centerY, minOutsideRadius) {
    const MAX_ITERATIONS = 30;
    const STEP_SIZE = 0.3;
    
    // Calculate the circle gap for stronger constraint enforcement
    const BASE_RADIUS_DEPTH_2 = 160;
    const BASE_RADIUS_DEPTH_1 = BASE_RADIUS_DEPTH_2 / 2;
    const circleGap = BASE_RADIUS_DEPTH_1; // 80 pixels
    
    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
        const forces = {};
        
        // Initialize forces
        Object.keys(nodePositions).forEach(nodeId => {
            forces[nodeId] = { x: 0, y: 0 };
        });
        
        // Apply forces based on edge length constraints with dynamic scaling
        links.forEach(link => {
            const pos1 = nodePositions[link.from_node_id];
            const pos2 = nodePositions[link.to_node_id];
            
            if (!pos1 || !pos2) return;
            
            const currentDistance = Math.sqrt(
                Math.pow(pos2.x - pos1.x, 2) + 
                Math.pow(pos2.y - pos1.y, 2)
            );
            
            // Determine which node's depth to use for scaling
            const fromDepth = nodeDepths.get(link.from_node_id) || 0;
            const toDepth = nodeDepths.get(link.to_node_id) || 0;
            const edgeDepth = Math.max(fromDepth, toDepth);
            
            const scaleFactorForThisEdge = getScaleFactorForDepth(edgeDepth);
            const desiredDistance = link.weight * scaleFactorForThisEdge;
            
            if (Math.abs(currentDistance - desiredDistance) > 0.1) {
                const direction = {
                    x: (pos2.x - pos1.x) / currentDistance,
                    y: (pos2.y - pos1.y) / currentDistance
                };
                
                const forceStrength = (desiredDistance - currentDistance) * 0.1;
                
                forces[link.from_node_id].x -= direction.x * forceStrength;
                forces[link.from_node_id].y -= direction.y * forceStrength;
                forces[link.to_node_id].x += direction.x * forceStrength;
                forces[link.to_node_id].y += direction.y * forceStrength;
            }
        });
        
        // Apply forces while respecting constraints
        Object.keys(nodePositions).forEach(nodeId => {
            if (nodeId === centerNodeId) return;
            
            const depth = nodeDepths.get(nodeId) || 0;
            if (depth <= 2) return;
            
            const currentPos = nodePositions[nodeId];
            const newPos = {
                x: currentPos.x + forces[nodeId].x * STEP_SIZE,
                y: currentPos.y + forces[nodeId].y * STEP_SIZE
            };
            
            // IMPROVED CONSTRAINT: Much stronger separation enforcement
            const distanceFromCenter = Math.sqrt(
                Math.pow(newPos.x - centerX, 2) + 
                Math.pow(newPos.y - centerY, 2)
            );
            
            if (distanceFromCenter < minOutsideRadius) {
                // Push back with additional buffer to ensure proper separation
                const angleFromCenter = Math.atan2(newPos.y - centerY, newPos.x - centerX);
                const strongPushDistance = minOutsideRadius + (circleGap * 0.5); // Add half the circle gap as buffer
                nodePositions[nodeId] = {
                    x: centerX + Math.cos(angleFromCenter) * strongPushDistance,
                    y: centerY + Math.sin(angleFromCenter) * strongPushDistance
                };
            } else {
                nodePositions[nodeId] = newPos;
            }
        });
    }
}

function minimizeCrossingsOnCircle(nodeIds, links, nodeDepths, centerX, centerY, radius) {
    if (nodeIds.length === 0) return {};
    
    const positions = {};
    
    // Special case for single node
    if (nodeIds.length === 1) {
        positions[nodeIds[0]] = {
            x: centerX + radius,
            y: centerY
        };
        return positions;
    }
    
    // Build adjacency matrix for nodes at this level
    const nodeIndex = new Map();
    nodeIds.forEach((nodeId, index) => {
        nodeIndex.set(nodeId, index);
    });
    
    const adjacencyMatrix = Array(nodeIds.length).fill(null).map(() => Array(nodeIds.length).fill(0));
    
    // Count crossings between nodes at this level
    links.forEach(link => {
        const fromIndex = nodeIndex.get(link.from_node_id);
        const toIndex = nodeIndex.get(link.to_node_id);
        
        if (fromIndex !== undefined && toIndex !== undefined) {
            adjacencyMatrix[fromIndex][toIndex] = 1;
            adjacencyMatrix[toIndex][fromIndex] = 1;
        }
    });
    
    // Use a simple heuristic: try to minimize the sum of angular distances for connected nodes
    let bestOrder = [...nodeIds];
    let bestCrossingCount = countCrossings(bestOrder, links, nodeDepths);
    
    // Try several random permutations and local improvements
    for (let attempt = 0; attempt < Math.min(50, nodeIds.length * 2); attempt++) {
        let currentOrder = [...nodeIds];
        
        // Shuffle the order
        for (let i = currentOrder.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [currentOrder[i], currentOrder[j]] = [currentOrder[j], currentOrder[i]];
        }
        
        // Apply local improvements (2-opt style)
        let improved = true;
        while (improved) {
            improved = false;
            for (let i = 0; i < currentOrder.length - 1; i++) {
                for (let j = i + 2; j < currentOrder.length; j++) {
                    // Try swapping segments
                    const newOrder = [...currentOrder];
                    const segment = newOrder.slice(i, j + 1).reverse();
                    newOrder.splice(i, j - i + 1, ...segment);
                    
                    const newCrossingCount = countCrossings(newOrder, links, nodeDepths);
                    if (newCrossingCount < bestCrossingCount) {
                        bestOrder = newOrder;
                        bestCrossingCount = newCrossingCount;
                        currentOrder = newOrder;
                        improved = true;
                    }
                }
            }
        }
    }
    
    // Place nodes according to best order
    bestOrder.forEach((nodeId, index) => {
        const angle = (index / bestOrder.length) * 2 * Math.PI;
        positions[nodeId] = {
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius
        };
    });
    
    return positions;
}

function countCrossings(nodeOrder, links, nodeDepths) {
    // Create position map for quick lookup
    const positionMap = new Map();
    nodeOrder.forEach((nodeId, index) => {
        positionMap.set(nodeId, index);
    });
    
    let crossings = 0;
    
    // Check all pairs of links for crossings
    for (let i = 0; i < links.length; i++) {
        for (let j = i + 1; j < links.length; j++) {
            const link1 = links[i];
            const link2 = links[j];
            
            // Only consider links that involve nodes in this circle
            const pos1From = positionMap.get(link1.from_node_id);
            const pos1To = positionMap.get(link1.to_node_id);
            const pos2From = positionMap.get(link2.from_node_id);
            const pos2To = positionMap.get(link2.to_node_id);
            
            // Skip if either link doesn't involve nodes in this circle
            if (pos1From === undefined && pos1To === undefined) continue;
            if (pos2From === undefined && pos2To === undefined) continue;
            
            // Check for crossing (only count crossings between nodes at the same level)
            if (pos1From !== undefined && pos1To !== undefined && 
                pos2From !== undefined && pos2To !== undefined) {
                
                const depth1From = nodeDepths.get(link1.from_node_id);
                const depth1To = nodeDepths.get(link1.to_node_id);
                const depth2From = nodeDepths.get(link2.from_node_id);
                const depth2To = nodeDepths.get(link2.to_node_id);
                
                // Only count if both links are between nodes at the same depth
                if (depth1From === depth1To && depth2From === depth2To && depth1From === depth2From) {
                    if (doSegmentsCrossOnCircle(pos1From, pos1To, pos2From, pos2To, nodeOrder.length)) {
                        crossings++;
                    }
                }
            }
        }
    }
    
    return crossings;
}

function doSegmentsCrossOnCircle(pos1From, pos1To, pos2From, pos2To, circleSize) {
    // Convert to normalized positions on circle [0, 1)
    const normalize = (pos) => pos / circleSize;
    
    const a1 = normalize(Math.min(pos1From, pos1To));
    const a2 = normalize(Math.max(pos1From, pos1To));
    const b1 = normalize(Math.min(pos2From, pos2To));
    const b2 = normalize(Math.max(pos2From, pos2To));
    
    // Check if the arcs cross
    // Two arcs cross if one starts inside the other but doesn't end inside
    return (a1 < b1 && b1 < a2 && a2 < b2) || (b1 < a1 && a1 < b2 && b2 < a2);
}

function addConcentricCircleGuides(mainGroup, centerX, centerY, nodes, links) {
    // Create very light dotted circles for depth visualization
    const circleStyle = {
        stroke: '#e5e7eb',
        strokeWidth: '1',
        strokeDasharray: '3,4',
        opacity: '0.3',
        fill: 'none'
    };
    
    // Fixed radius calculation - depth 1 radius is half of depth 2 radius
    const BASE_RADIUS_DEPTH_2 = 160; // Base radius for depth 2
    const BASE_RADIUS_DEPTH_1 = BASE_RADIUS_DEPTH_2 / 2; // Depth 1 is half of depth 2
    
    // Build adjacency list to calculate average weights for scaling
    const adjacencyList = new Map();
    links.forEach(link => {
        if (!adjacencyList.has(link.from_node_id)) {
            adjacencyList.set(link.from_node_id, []);
        }
        if (!adjacencyList.has(link.to_node_id)) {
            adjacencyList.set(link.to_node_id, []);
        }
        
        adjacencyList.get(link.from_node_id).push({
            nodeId: link.to_node_id,
            weight: link.weight || 1.0
        });
        adjacencyList.get(link.to_node_id).push({
            nodeId: link.from_node_id,
            weight: link.weight || 1.0
        });
    });
    
    // Group nodes by depth
    const nodesByDepth = new Map();
    const nodeDepths = new Map();
    const visited = new Set();
    const queue = [{ nodeId: centerNodeId, depth: 0 }];
    
    // BFS to assign depths
    while (queue.length > 0) {
        const { nodeId, depth } = queue.shift();
        
        if (visited.has(nodeId)) continue;
        visited.add(nodeId);
        
        nodeDepths.set(nodeId, depth);
        
        if (!nodesByDepth.has(depth)) {
            nodesByDepth.set(depth, []);
        }
        nodesByDepth.get(depth).push(nodeId);
        
        const neighbors = adjacencyList.get(nodeId) || [];
        neighbors.forEach(neighbor => {
            if (!visited.has(neighbor.nodeId)) {
                queue.push({ nodeId: neighbor.nodeId, depth: depth + 1 });
            }
        });
    }
    
    // Calculate global average weight for scaling
    let globalAvgWeight = 1.0;
    let globalWeightCount = 0;
    
    links.forEach(link => {
        globalAvgWeight += link.weight || 1.0;
        globalWeightCount++;
    });
    
    if (globalWeightCount > 0) {
        globalAvgWeight = globalAvgWeight / globalWeightCount;
    }
    
    // Scale factor based on global average weight
    const weightScale = Math.max(0.5, Math.min(2.0, globalAvgWeight)); // Clamp between 0.5 and 2.0
    
    // Calculate and draw circles for depth 1 and 2 with fixed ratios
    for (let depth = 1; depth <= 2; depth++) {
        const nodesAtDepth = nodesByDepth.get(depth) || [];
        if (nodesAtDepth.length === 0) continue;
        
        // Fixed radius calculation maintaining 1:2 ratio
        const baseRadius = depth === 1 ? BASE_RADIUS_DEPTH_1 : BASE_RADIUS_DEPTH_2;
        const radius = baseRadius * weightScale;
        
        // Create circle element
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', centerX);
        circle.setAttribute('cy', centerY);
        circle.setAttribute('r', radius);
        
        // Apply styling
        Object.entries(circleStyle).forEach(([key, value]) => {
            circle.setAttribute(key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`), value);
        });
        
        // Add depth label
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', centerX + radius - 25);
        label.setAttribute('y', centerY - 5);
        label.setAttribute('font-size', '10');
        label.setAttribute('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif');
        label.setAttribute('font-weight', '500');
        label.setAttribute('fill', '#9ca3af');
        label.setAttribute('opacity', '0.6');
        label.textContent = `Depth ${depth}`;
        label.style.pointerEvents = 'none';
        label.style.userSelect = 'none';
        
        // Add elements to the beginning so they appear behind nodes
        mainGroup.insertBefore(circle, mainGroup.firstChild);
        mainGroup.insertBefore(label, mainGroup.firstChild);
    }
}

    // Public API
    return {
        initialize,
        show,
        hide,
        isVisible,
        focusInOutliner,
        createNodeFromSearch,
        addNodeToPool,
        removeNodeFromPool,
        useQuickAccess,
        removeFromQuickAccess,
        locateNodeInGraph,
        editNode, // This function is now defined above
        isInitialized: () => isInitialized
    };
})();

// Add initialization flag to prevent multiple initializations
LocalGraphManager.isInitialized = false;

window.LocalGraphManager = LocalGraphManager;

