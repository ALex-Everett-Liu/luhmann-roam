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
    
    function initialize() {
        createContainer();
        setupEventHandlers();
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
                <!-- Center Node Selection Phase -->
                <div id="center-selection-phase" class="phase-content active">
                    <div class="center-selection-container">
                        <h3>Select Center Node</h3>
                        <p>Choose a node to explore its local neighborhood:</p>
                        
                        <div class="node-search-container">
                            <input type="text" id="center-node-search" placeholder="Search for center node..." class="node-search-input">
                            <div id="center-node-dropdown" class="node-dropdown">
                                <div class="node-dropdown-content">
                                    <div class="no-results-message">Start typing to search nodes...</div>
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
                        <label>Place in Outliner:</label>
                        <select id="parent-node-select">
                            <option value="">Loading suggestions...</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="link-to-center" checked>
                            Link to center node
                        </label>
                    </div>
                    
                    <div id="link-options" class="form-group">
                        <label>Link Weight:</label>
                        <input type="number" id="link-weight" min="0.1" max="100" step="0.1" value="1.0">
                        
                        <label>Link Description:</label>
                        <input type="text" id="link-description" placeholder="Optional description...">
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
        // Close button
        document.getElementById('close-local-graph').addEventListener('click', hide);
        
        // Center node search
        document.getElementById('center-node-search').addEventListener('input', handleCenterNodeSearch);
        
        // Phase navigation
        document.getElementById('explore-graph-btn').addEventListener('click', exploreGraph);
        document.getElementById('change-center-btn').addEventListener('click', changeCenterNode);
        document.getElementById('adjust-distance-btn').addEventListener('click', openDistanceModal);
        
        // Graph actions
        document.getElementById('add-node-btn').addEventListener('click', openAddNodeModal);
        document.getElementById('refresh-graph-btn').addEventListener('click', refreshGraph);
        
        // Modal handling
        document.getElementById('distance-adjustment-form').addEventListener('submit', applyDistanceAdjustment);
        document.getElementById('cancel-distance-adjustment').addEventListener('click', closeDistanceModal);
        
        document.getElementById('add-node-form').addEventListener('submit', createNewNode);
        document.getElementById('cancel-add-node').addEventListener('click', closeAddNodeModal);
        
        // Link options toggle
        document.getElementById('link-to-center').addEventListener('change', function(e) {
            document.getElementById('link-options').style.display = e.target.checked ? 'block' : 'none';
        });
        
        // Distance input changes
        document.getElementById('max-distance-input').addEventListener('change', updateDistanceFromInput);
        document.getElementById('max-depth-input').addEventListener('change', updateDepthFromInput);
    }
    
    async function handleCenterNodeSearch(e) {
        const query = e.target.value.trim();
        const dropdown = document.getElementById('center-node-dropdown');
        const dropdownContent = dropdown.querySelector('.node-dropdown-content');
        
        if (query.length < 2) {
            dropdownContent.innerHTML = '<div class="no-results-message">Start typing to search nodes...</div>';
            dropdown.classList.remove('show');
            return;
        }
        
        try {
            const response = await fetch(`/api/nodes/search?q=${encodeURIComponent(query)}&limit=10`);
            const results = await response.json();
            
            if (results.length === 0) {
                dropdownContent.innerHTML = '<div class="no-results-message">No nodes found</div>';
            } else {
                dropdownContent.innerHTML = results.map(node => `
                    <div class="node-option" data-node-id="${node.id}">
                        <div class="node-option-content">${node.content || 'Untitled'}</div>
                        ${node.content_zh ? `<div class="node-option-content-zh">${node.content_zh}</div>` : ''}
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
            console.error('Error searching nodes:', error);
            dropdownContent.innerHTML = '<div class="error-message">Error searching nodes</div>';
        }
    }
    
    function selectCenterNode(nodeId, nodeContent) {
        centerNodeId = nodeId;
        
        document.getElementById('center-node-search').value = nodeContent;
        document.getElementById('center-node-dropdown').classList.remove('show');
        document.getElementById('explore-graph-btn').disabled = false;
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
            
            // Node circle
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', pos.x);
            circle.setAttribute('cy', pos.y);
            circle.setAttribute('r', isCenter ? 12 : 8);
            circle.setAttribute('fill', isCenter ? '#e74c3c' : getDistanceColor(distance));
            circle.setAttribute('stroke', '#333');
            circle.setAttribute('stroke-width', '2');
            circle.style.cursor = 'pointer';
            
            // Add click handler
            circle.addEventListener('click', () => selectNode(node));
            
            svg.appendChild(circle);
            
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
        
        infoDiv.innerHTML = `
            <div class="selected-node">
                <h5>${node.content || 'Untitled'}</h5>
                ${node.content_zh ? `<p class="node-content-zh">${node.content_zh}</p>` : ''}
                <p class="node-distance">Distance: ${distance.toFixed(2)}</p>
                <div class="node-actions">
                    <button onclick="LocalGraphManager.focusInOutliner('${node.id}')" class="focus-btn">
                        Focus in Outliner
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
        
        // Load suggested parents
        try {
            const response = await fetch(`/api/local-graph/suggested-parents/${centerNodeId}`);
            const suggestions = await response.json();
            
            const select = document.getElementById('parent-node-select');
            select.innerHTML = suggestions.map(node => `
                <option value="${node.id || ''}">${node.content || node.content_zh || 'Untitled'}</option>
            `).join('');
            
        } catch (error) {
            console.error('Error loading parent suggestions:', error);
            document.getElementById('parent-node-select').innerHTML = '<option value="">Error loading suggestions</option>';
        }
        
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
        document.getElementById('link-to-center').checked = true;
        document.getElementById('link-options').style.display = 'block';
    }
    
    async function createNewNode(e) {
        e.preventDefault();
        
        const content = document.getElementById('node-content').value.trim();
        const content_zh = document.getElementById('node-content-zh').value.trim();
        const parentNodeId = document.getElementById('parent-node-select').value || null;
        const linkToCenterNode = document.getElementById('link-to-center').checked;
        const linkWeight = parseFloat(document.getElementById('link-weight').value) || 1.0;
        const linkDescription = document.getElementById('link-description').value.trim();
        
        if (!content) {
            alert('Please enter content for the node');
            return;
        }
        
        try {
            const response = await fetch('/api/local-graph/nodes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content,
                    content_zh,
                    parentNodeId,
                    linkToCenterNode,
                    centerNodeId,
                    linkWeight,
                    linkDescription
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to create node');
            }
            
            const result = await response.json();
            
            closeAddNodeModal();
            
            // Refresh the graph to show the new node
            await refreshGraph();
            
            showNotification('Node created successfully!', 'success');
            
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
    
    function show() {
        container.style.display = 'block';
        
        // Reset to selection phase
        centerNodeId = null;
        graphData = null;
        document.getElementById('graph-visualization-phase').classList.remove('active');
        document.getElementById('center-selection-phase').classList.add('active');
        document.getElementById('center-node-search').value = '';
        document.getElementById('explore-graph-btn').disabled = true;
    }
    
    function hide() {
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
    
    // Public API
    return {
        initialize,
        show,
        hide,
        isVisible,
        focusInOutliner
    };
})();

window.LocalGraphManager = LocalGraphManager;