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
                        
                        <div class="node-search-container">
                            <input type="text" id="center-node-search" placeholder="Search pool nodes..." class="node-search-input">
                            <div id="center-node-dropdown" class="node-dropdown">
                                <div class="node-dropdown-content">
                                    <div class="no-results-message">Start typing to search pool nodes...</div>
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
                            </div>
                            <div class="distance-info">
                                <span id="distance-display">Distance: 5, Depth: 3</span>
                                <button id="adjust-distance-btn" class="secondary-btn">Adjust</button>
                            </div>
                            <div class="graph-actions">
                                <button id="add-node-btn" class="primary-btn">Add Node</button>
                                <button id="refresh-graph-btn" class="secondary-btn">Refresh</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="graph-main-area">
                        <div class="graph-sidebar">
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
                        
                        <div class="graph-canvas-area">
                            <div id="local-graph-canvas"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(container);
        
        // Create modals
        createModals();
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
                        <select id="parent-node-select">
                            <option value="">Loading pool nodes...</option>
                        </select>
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
                setTimeout(updateNodePoolIndicators, 500);
            }
            
        } catch (error) {
            console.error('Error exploring graph:', error);
            alert('Error loading graph data');
        }
    }
    
    function renderGraph() {
        const canvasArea = document.getElementById('local-graph-canvas');
        
        // Create a simple network visualization using D3 or similar
        // For now, we'll create a simple HTML-based visualization
        
        const nodes = graphData.nodes || [];
        const links = graphData.links || [];
        const distances = graphData.distances || {};
        
        // Clear canvas
        canvasArea.innerHTML = '';
        
        // Create SVG
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.style.background = '#fff';
        
        // Simple circular layout based on distance
        const centerX = 400;
        const centerY = 300;
        const maxRadius = 250;
        
        // Group nodes by distance
        const nodesByDistance = {};
        nodes.forEach(node => {
            const distance = distances[node.id] || 0;
            if (!nodesByDistance[distance]) {
                nodesByDistance[distance] = [];
            }
            nodesByDistance[distance].push(node);
        });
        
        // Position nodes
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
        
        // Draw links
        links.forEach(link => {
            const sourcePos = nodePositions[link.from_node_id];
            const targetPos = nodePositions[link.to_node_id];
            
            if (sourcePos && targetPos) {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', sourcePos.x);
                line.setAttribute('y1', sourcePos.y);
                line.setAttribute('x2', targetPos.x);
                line.setAttribute('y2', targetPos.y);
                line.setAttribute('stroke', '#ccc');
                line.setAttribute('stroke-width', Math.max(1, link.weight));
                svg.appendChild(line);
            }
        });
        
        // Draw nodes
        nodes.forEach(node => {
            const pos = nodePositions[node.id];
            if (!pos) return;
            
            const isCenter = node.id === centerNodeId;
            const distance = distances[node.id] || 0;
            const isInPool = nodePoolStatus.get(node.id) || false;
            
            // Node circle
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', pos.x);
            circle.setAttribute('cy', pos.y);
            circle.setAttribute('r', isCenter ? 12 : 8);
            circle.setAttribute('fill', isCenter ? '#e74c3c' : getDistanceColor(distance));
            circle.setAttribute('stroke', isInPool ? '#4CAF50' : '#333');
            circle.setAttribute('stroke-width', isInPool ? '3' : '2');
            circle.setAttribute('data-node-id', node.id);
            circle.style.cursor = 'pointer';
            
            // Add click handler
            circle.addEventListener('click', () => selectNode(node));
            
            // Add right-click context menu
            circle.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                showNodeContextMenu(e, node);
            });
            
            svg.appendChild(circle);
            
            // Pool indicator
            if (isInPool) {
                const indicator = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                indicator.setAttribute('cx', pos.x + 8);
                indicator.setAttribute('cy', pos.y - 8);
                indicator.setAttribute('r', 3);
                indicator.setAttribute('fill', '#4CAF50');
                indicator.setAttribute('stroke', '#fff');
                indicator.setAttribute('stroke-width', '1');
                svg.appendChild(indicator);
            }
            
            // Node label
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', pos.x);
            text.setAttribute('y', pos.y - 15);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('font-size', '10');
            text.setAttribute('font-family', 'Arial, sans-serif');
            text.textContent = (node.content || 'Untitled').substring(0, 20) + (node.content?.length > 20 ? '...' : '');
            text.style.cursor = 'pointer';
            
            // Add click handler
            text.addEventListener('click', () => selectNode(node));
            
            svg.appendChild(text);
        });
        
        canvasArea.appendChild(svg);
    }
    
    function getDistanceColor(distance) {
        // Color nodes based on distance from center
        const normalizedDistance = Math.min(distance / maxDistance, 1);
        const hue = (1 - normalizedDistance) * 240; // Blue to red
        return `hsl(${hue}, 70%, 60%)`;
    }
    
    function selectNode(node) {
        const infoDiv = document.getElementById('selected-node-info');
        const distance = graphData.distances[node.id] || 0;
        const isInPool = nodePoolStatus.get(node.id) || false;
        
        infoDiv.innerHTML = `
            <div class="selected-node">
                <h5>${node.content || 'Untitled'}</h5>
                ${node.content_zh ? `<p class="node-content-zh">${node.content_zh}</p>` : ''}
                <p class="node-distance">Distance: ${distance.toFixed(2)}</p>
                <p class="node-pool-status" style="color: ${isInPool ? '#4CAF50' : '#666'}; font-size: 12px; margin: 5px 0;">
                    ${isInPool ? '✓ In Local Graph Pool' : '○ Not in Pool'}
                </p>
                <div class="node-actions">
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
        
        // Group nodes by distance
        const levelGroups = {};
        Object.entries(distances).forEach(([nodeId, distance]) => {
            const level = Math.round(distance * 2) / 2; // Round to nearest 0.5
            if (!levelGroups[level]) {
                levelGroups[level] = 0;
            }
            levelGroups[level]++;
        });
        
        const sortedLevels = Object.keys(levelGroups).sort((a, b) => parseFloat(a) - parseFloat(b));
        
        levelsDiv.innerHTML = sortedLevels.map(level => `
            <div class="distance-level">
                <span class="level-label">${level}:</span>
                <span class="level-count">${levelGroups[level]} nodes</span>
            </div>
        `).join('');
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
        
        // CHANGED: Load suggested parents from pool instead of suggested-parents endpoint
        try {
            // Get all pool nodes as potential parents
            const response = await fetch('/api/local-graph/pool');
            const poolData = await response.json();
            
            const select = document.getElementById('parent-node-select');
            
            if (poolData.nodes && poolData.nodes.length > 0) {
                // Add root option first
                let options = '<option value="">Create as root node</option>';
                
                // Add pool nodes as options, prioritizing center node and its ancestors
                const poolNodes = poolData.nodes;
                
                // Sort to put center node first if it exists in pool
                poolNodes.sort((a, b) => {
                    if (a.node_id === centerNodeId) return -1;
                    if (b.node_id === centerNodeId) return 1;
                    return new Date(b.added_at) - new Date(a.added_at); // Most recent first
                });
                
                options += poolNodes.map(poolNode => `
                    <option value="${poolNode.node_id}">
                        ${poolNode.content || poolNode.content_zh || 'Untitled'}
                        ${poolNode.node_id === centerNodeId ? ' (Center Node)' : ''}
                    </option>
                `).join('');
                
                select.innerHTML = options;
            } else {
                select.innerHTML = '<option value="">No pool nodes available - create as root</option>';
            }
            
        } catch (error) {
            console.error('Error loading pool nodes for parent suggestions:', error);
            document.getElementById('parent-node-select').innerHTML = '<option value="">Error loading suggestions</option>';
        }
        
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
    }
    
    async function createNewNode(e) {
        e.preventDefault();
        
        const content = document.getElementById('node-content').value.trim();
        const content_zh = document.getElementById('node-content-zh').value.trim();
        const parentNodeId = document.getElementById('parent-node-select').value || null;
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
            } else {
                // No nodes found, show empty state
                switchToEmptyState();
            }
        } catch (error) {
            console.error('Error checking for nodes:', error);
            // Default to center selection phase
            switchToCenterSelection();
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
            updateNodePoolIndicators();
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
            updateNodePoolIndicators();
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
    
    function updateNodePoolIndicators() {
        // Add visual indicators to nodes that are in the pool
        const nodeElements = document.querySelectorAll('#local-graph-canvas circle[data-node-id]');
        nodeElements.forEach(element => {
            const nodeId = element.getAttribute('data-node-id');
            if (nodeId && nodePoolStatus.has(nodeId)) {
                if (nodePoolStatus.get(nodeId)) {
                    element.setAttribute('stroke', '#4CAF50');
                    element.setAttribute('stroke-width', '4');
                } else {
                    element.setAttribute('stroke', '#333');
                    element.setAttribute('stroke-width', '2');
                }
            }
        });
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
        isInitialized: () => isInitialized
    };
})();

// Add initialization flag to prevent multiple initializations
LocalGraphManager.isInitialized = false;

window.LocalGraphManager = LocalGraphManager;