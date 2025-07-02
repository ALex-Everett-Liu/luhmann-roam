/**
 * Global Graph Manager UI
 * Complete graph visualization with multiple layouts and centrality analysis
 */
const GlobalGraphManager = (function() {
    let container;
    let graphData = null;
    let currentLayout = 'force-directed';
    let currentCentralityMeasure = 'degree';
    let isInitialized = false;
    let selectedNode = null;
    let searchTimeout = null;
    
    // D3 visualization variables - will be initialized later
    let svg, g, simulation;
    let nodeElements, linkElements, labelElements;
    let width = 800, height = 600;
    let zoom, transform;
    
    // Color scales - will be initialized later
    let centralityColorScale, communityColorScale;
    
    function initialize() {
        if (isInitialized) {
            console.log('GlobalGraphManager already initialized');
            return;
        }
        
        // Check if D3 is available
        if (typeof d3 === 'undefined') {
            console.error('D3.js is not loaded. GlobalGraphManager requires D3.js to function.');
            setTimeout(() => {
                initialize(); // Try again in 100ms
            }, 100);
            return;
        }
        
        try {
            // Initialize D3-dependent variables now that D3 is available
            transform = d3.zoomIdentity;
            centralityColorScale = d3.scaleSequential(d3.interpolateViridis);
            communityColorScale = d3.scaleOrdinal(d3.schemeCategory10);
            
            createContainer();
            setupEventHandlers();
            isInitialized = true;
            console.log('GlobalGraphManager initialized successfully');
        } catch (error) {
            console.error('Error initializing GlobalGraphManager:', error);
        }
    }
    
    function createContainer() {
        container = document.createElement('div');
        container.id = 'global-graph-container';
        container.className = 'global-graph-container';
        container.style.display = 'none';
        
        container.innerHTML = `
            <div class="global-graph-header">
                <h2>🌐 Global Graph Explorer</h2>
                <button class="close-btn" id="close-global-graph-btn">&times;</button>
            </div>
            
            <div class="global-graph-content">
                <!-- Controls Panel -->
                <div class="global-graph-controls">
                    <div class="control-section">
                        <div class="control-group">
                            <label for="layout-select">Layout:</label>
                            <select id="layout-select" class="layout-select">
                                <option value="force-directed">Force-Directed</option>
                                <option value="circular">Circular</option>
                                <option value="hierarchical">Hierarchical</option>
                            </select>
                        </div>
                        
                        <div class="control-group">
                            <label for="centrality-select">Centrality:</label>
                            <select id="centrality-select" class="centrality-select">
                                <option value="degree">Degree</option>
                                <option value="betweenness">Betweenness</option>
                                <option value="closeness">Closeness</option>
                                <option value="pagerank">PageRank</option>
                                <option value="eigenvector">Eigenvector</option>
                            </select>
                        </div>
                        
                        <div class="control-group">
                            <button id="load-graph-btn" class="primary-btn">Load Graph</button>
                            <button id="analyze-btn" class="secondary-btn">Analyze</button>
                            <button id="debug-state-btn" class="secondary-btn">Debug State</button>
                        </div>
                    </div>
                </div>
                
                <!-- Main Content Area -->
                <div class="global-graph-main-area">
                    <!-- Graph Canvas -->
                    <div class="global-graph-canvas-area">
                        <div id="global-graph-canvas"></div>
                        <div class="zoom-controls">
                            <button id="zoom-in-btn">+</button>
                            <button id="zoom-out-btn">-</button>
                            <button id="zoom-reset-btn">⌂</button>
                        </div>
                    </div>
                    
                    <!-- Sidebar -->
                    <div class="global-graph-sidebar">
                        <!-- Graph Statistics -->
                        <div class="sidebar-section">
                            <h4>📊 Graph Statistics</h4>
                            <div class="stats-container">
                                <div class="stat-item">
                                    <span class="stat-label">Nodes:</span>
                                    <span class="stat-value" id="stat-nodes">-</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Links:</span>
                                    <span class="stat-value" id="stat-links">-</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Density:</span>
                                    <span class="stat-value" id="stat-density">-</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Avg Degree:</span>
                                    <span class="stat-value" id="stat-avg-degree">-</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Components:</span>
                                    <span class="stat-value" id="stat-components">-</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Search -->
                        <div class="sidebar-section">
                            <h4>🔍 Search Nodes</h4>
                            <div class="search-container">
                                <input type="text" id="global-graph-search" 
                                       class="search-input" placeholder="Search nodes...">
                                <div class="search-results" id="search-results"></div>
                            </div>
                        </div>
                        
                        <!-- Selected Node -->
                        <div class="sidebar-section" id="selected-node-section" style="display: none;">
                            <h4>📍 Selected Node</h4>
                            <div class="selected-node-info">
                                <div class="node-content" id="selected-node-content"></div>
                                <div class="node-metrics">
                                    <div class="metric-item">
                                        <span class="metric-label">Degree:</span>
                                        <span class="metric-value" id="selected-degree">-</span>
                                    </div>
                                    <div class="metric-item">
                                        <span class="metric-label">Centrality:</span>
                                        <span class="metric-value" id="selected-centrality">-</span>
                                    </div>
                                    <div class="metric-item">
                                        <span class="metric-label">Community:</span>
                                        <span class="metric-value" id="selected-community">-</span>
                                    </div>
                                </div>
                                <div class="node-actions">
                                    <button id="focus-node-btn" class="focus-btn">Focus in Outliner</button>
                                    <button id="explore-neighbors-btn" class="secondary-btn">Explore Neighbors</button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Centrality Rankings -->
                        <div class="sidebar-section">
                            <h4>🏆 Top Nodes</h4>
                            <div class="centrality-rankings" id="centrality-rankings">
                                <div class="loading-message">Load graph to see rankings</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Loading Overlay -->
            <div class="loading-overlay" id="global-graph-loading" style="display: none;">
                <div class="loading-spinner"></div>
                <div class="loading-text">Analyzing graph...</div>
            </div>
        `;
        
        document.body.appendChild(container);
        
        // Initialize D3 canvas
        initializeCanvas();
    }
    
    function initializeCanvas() {
        const canvasContainer = document.getElementById('global-graph-canvas');
        width = canvasContainer.clientWidth || 800;
        height = canvasContainer.clientHeight || 600;
        
        svg = d3.select('#global-graph-canvas')
            .append('svg')
            .attr('width', width)
            .attr('height', height);
        
        // Add zoom behavior
        zoom = d3.zoom()
            .scaleExtent([0.1, 10])
            .on('zoom', handleZoom);
        
        svg.call(zoom);
        
        // Main group for all graph elements
        g = svg.append('g');
        
        // Add groups for different element types
        g.append('g').attr('class', 'links');
        g.append('g').attr('class', 'nodes');
        g.append('g').attr('class', 'labels');
    }
    
    function setupEventHandlers() {
        // Control handlers
        document.getElementById('close-global-graph-btn')?.addEventListener('click', hide);
        document.getElementById('load-graph-btn')?.addEventListener('click', loadGraph);
        document.getElementById('analyze-btn')?.addEventListener('click', analyzeGraph);
        document.getElementById('debug-state-btn')?.addEventListener('click', debugCurrentState);
        document.getElementById('layout-select')?.addEventListener('change', handleLayoutChange);
        document.getElementById('centrality-select')?.addEventListener('change', handleCentralityChange);
        
        // Zoom controls
        document.getElementById('zoom-in-btn')?.addEventListener('click', () => zoomBy(1.5));
        document.getElementById('zoom-out-btn')?.addEventListener('click', () => zoomBy(0.67));
        document.getElementById('zoom-reset-btn')?.addEventListener('click', resetZoom);
        
        // Search
        document.getElementById('global-graph-search')?.addEventListener('input', handleSearch);
        
        // Selected node actions
        document.getElementById('focus-node-btn')?.addEventListener('click', focusSelectedNode);
        document.getElementById('explore-neighbors-btn')?.addEventListener('click', exploreNeighbors);
        
        // Window resize
        window.addEventListener('resize', handleResize);
    }

    function debugCurrentState() {
        console.log('🐛 Current Debug State:', {
            transform: { x: transform.x, y: transform.y, k: transform.k },
            svgDimensions: { width, height },
            svgBoundingRect: svg.node().getBoundingClientRect(),
            containerBoundingRect: container.getBoundingClientRect(),
            sampleNodePositions: graphData?.nodes?.slice(0, 3).map(n => ({ 
                id: n.id, 
                x: n.x, 
                y: n.y, 
                fx: n.fx, 
                fy: n.fy 
            })) || []
        });
    }
    
    async function loadGraph() {
        try {
            console.log('🔄 Starting graph load...');
            console.log('D3 available:', typeof d3 !== 'undefined');
            console.log('GlobalGraphManager initialized:', isInitialized);
            
            showLoading('Loading graph data...');
            
            const layout = document.getElementById('layout-select').value;
            console.log('Selected layout:', layout);
            
            const response = await fetch(`/api/global-graph?layout=${layout}&includeCentrality=true&includeLayout=true`);
            
            if (!response.ok) {
                throw new Error(`Failed to load graph data: ${response.status} ${response.statusText}`);
            }
            
            graphData = await response.json();
            console.log('📊 Raw graph data received:', {
                nodes: graphData.nodes?.length || 0,
                links: graphData.links?.length || 0,
                hasAnalysis: !!graphData.analysis,
                hasLayout: !!graphData.layout,
                nodesSample: graphData.nodes?.slice(0, 2),
                linksSample: graphData.links?.slice(0, 2)
            });
            
            // Detailed data structure inspection
            if (graphData.nodes && graphData.nodes.length > 0) {
                console.log('🔍 First node structure:', graphData.nodes[0]);
                console.log('🔍 Node ID types:', graphData.nodes.slice(0, 5).map(n => ({ id: n.id, type: typeof n.id })));
            }
            
            if (graphData.links && graphData.links.length > 0) {
                console.log('🔍 First link structure:', graphData.links[0]);
                console.log('🔍 Link endpoint types:', graphData.links.slice(0, 5).map(l => ({ 
                    from: l.from_node_id, 
                    to: l.to_node_id, 
                    fromType: typeof l.from_node_id,
                    toType: typeof l.to_node_id
                })));
            }
            
            // Update statistics
            updateStatistics();
            
            // Update centrality color scale
            if (graphData.analysis && graphData.analysis.degreeCentrality) {
                const centralityValues = Object.values(graphData.analysis.degreeCentrality);
                centralityColorScale.domain(d3.extent(centralityValues));
            }
            
            // Render graph
            console.log('🎨 About to render graph...');
            renderGraph();
            
            // Update rankings
            updateCentralityRankings();
            
            hideLoading();
            showNotification('Graph loaded successfully!', 'success');
            
        } catch (error) {
            console.error('❌ Error loading graph:', error);
            console.error('Error stack:', error.stack);
            hideLoading();
            showNotification('Error loading graph: ' + error.message, 'error');
        }
    }
    
    async function analyzeGraph() {
        if (!graphData) {
            showNotification('Please load the graph first', 'warning');
            return;
        }
        
        try {
            showLoading('Analyzing graph...');
            
            const centrality = document.getElementById('centrality-select').value;
            const response = await fetch(`/api/global-graph/centrality/${centrality}`);
            
            if (!response.ok) {
                throw new Error('Failed to analyze graph');
            }
            
            const analysisData = await response.json();
            
            // Update graph data with new centrality
            if (!graphData.analysis) graphData.analysis = {};
            graphData.analysis[`${centrality}Centrality`] = {};
            
            analysisData.results.forEach(result => {
                graphData.analysis[`${centrality}Centrality`][result.nodeId] = result.centrality;
            });
            
            // Update color scale
            const centralityValues = analysisData.results.map(r => r.centrality);
            centralityColorScale.domain(d3.extent(centralityValues));
            
            // Re-render with new colors
            updateNodeColors();
            
            // Update rankings
            updateCentralityRankings();
            
            hideLoading();
            showNotification(`${centrality} centrality calculated!`, 'success');
            
        } catch (error) {
            console.error('Error analyzing graph:', error);
            hideLoading();
            showNotification('Error analyzing graph: ' + error.message, 'error');
        }
    }
    
    function renderGraph() {
        if (!graphData || !graphData.nodes) return;
        
        console.log('🎨 Starting renderGraph with data:', {
            nodes: graphData.nodes.length,
            links: graphData.links.length
        });
        
        // Transform links to have the correct structure for D3.js
        const transformedLinks = graphData.links.map(link => ({
            ...link,
            source: link.from_node_id,  // D3.js expects 'source'
            target: link.to_node_id     // D3.js expects 'target'
        }));
        
        console.log('🔧 Transformed first link:', transformedLinks[0]);
        
        // Validate data
        const nodeIds = new Set(graphData.nodes.map(n => n.id));
        const validLinks = transformedLinks.filter(link => {
            const isValid = nodeIds.has(link.source) && nodeIds.has(link.target);
            if (!isValid) {
                console.warn('❌ Invalid link:', link);
            }
            return isValid;
        });
        
        console.log('✅ Validation complete:', {
            originalLinks: transformedLinks.length,
            validLinks: validLinks.length,
            filtered: transformedLinks.length - validLinks.length
        });
        
        // Clear previous elements
        g.selectAll('*').remove();
        g.append('g').attr('class', 'links');
        g.append('g').attr('class', 'nodes');
        g.append('g').attr('class', 'labels');
        
        try {
            // Create force simulation with transformed data
            simulation = d3.forceSimulation(graphData.nodes)
                .force('link', d3.forceLink(validLinks).id(d => d.id).distance(100))
                .force('charge', d3.forceManyBody().strength(-300))
                .force('center', d3.forceCenter(width / 2, height / 2))
                .force('collision', d3.forceCollide().radius(20));
            
            console.log('✅ Force simulation created successfully');
            
            // Create links with transformed data
            linkElements = g.select('.links')
                .selectAll('line')
                .data(validLinks)
                .enter()
                .append('line')
                .attr('class', 'link')
                .attr('stroke', '#999')
                .attr('stroke-opacity', 0.6)
                .attr('stroke-width', d => Math.sqrt(d.weight || 1));
            
            // Create nodes
            nodeElements = g.select('.nodes')
                .selectAll('circle')
                .data(graphData.nodes)
                .enter()
                .append('circle')
                .attr('class', 'node')
                .attr('r', d => getNodeRadius(d))
                .attr('fill', d => getNodeColor(d))
                .attr('stroke', '#fff')
                .attr('stroke-width', 2)
                .on('click', handleNodeClick)
                .on('mouseover', handleNodeMouseOver)
                .on('mouseout', handleNodeMouseOut)
                .call(d3.drag()
                    .on('start', dragStarted)
                    .on('drag', dragged)
                    .on('end', dragEnded));
            
            // Create labels
            labelElements = g.select('.labels')
                .selectAll('text')
                .data(graphData.nodes)
                .enter()
                .append('text')
                .attr('class', 'node-label')
                .attr('dx', 15)
                .attr('dy', 4)
                .style('font-size', '12px')
                .style('fill', '#333')
                .style('pointer-events', 'none')
                .text(d => truncateText(d.content, 20));
            
            // Use layout positions if available, but scale them properly
            if (graphData.layout && graphData.layout.positions) {
                console.log('🎨 Applying layout positions...');
                
                // First, find the bounds of the server-provided positions
                const positions = Object.values(graphData.layout.positions);
                if (positions.length > 0) {
                    const xValues = positions.map(p => p.x);
                    const yValues = positions.map(p => p.y);
                    
                    const serverMinX = Math.min(...xValues);
                    const serverMaxX = Math.max(...xValues);
                    const serverMinY = Math.min(...yValues);
                    const serverMaxY = Math.max(...yValues);
                    
                    const serverWidth = serverMaxX - serverMinX;
                    const serverHeight = serverMaxY - serverMinY;
                    
                    console.log('🎨 Server layout bounds:', {
                        width: serverWidth,
                        height: serverHeight,
                        minX: serverMinX,
                        maxX: serverMaxX,
                        minY: serverMinY,
                        maxY: serverMaxY
                    });
                    
                    console.log('🎨 Canvas dimensions:', { width, height });
                    
                    // Calculate scaling factors to fit in canvas with some padding
                    const padding = 50;
                    const scaleX = (width - 2 * padding) / serverWidth;
                    const scaleY = (height - 2 * padding) / serverHeight;
                    const scale = Math.min(scaleX, scaleY); // Use uniform scaling
                    
                    console.log('🎨 Calculated scale factor:', scale);
                    
                    // Apply scaled positions WITHOUT fixing them (no fx/fy)
                    graphData.nodes.forEach(node => {
                        const pos = graphData.layout.positions[node.id];
                        if (pos) {
                            // Scale and center the positions
                            node.x = padding + (pos.x - serverMinX) * scale;
                            node.y = padding + (pos.y - serverMinY) * scale;
                            
                            // Don't set fx/fy - let the force simulation take over if needed
                            console.log(`🎨 Node ${node.id}: server(${pos.x}, ${pos.y}) -> canvas(${node.x}, ${node.y})`);
                        }
                    });
                    
                    // For non-force-directed layouts, we can stop the simulation
                    // But for force-directed, let it run to fine-tune positions
                    if (currentLayout !== 'force-directed') {
                        // Give the simulation a moment to settle, then stop it
                        setTimeout(() => {
                            if (simulation) {
                                simulation.stop();
                            }
                        }, 1000);
                    }
                }
                
                updateElementPositions();
            } else {
                console.log('🎨 No layout positions available, using force simulation defaults');
                // Let the force simulation place nodes randomly and naturally
            }
            
            // Start simulation
            simulation.on('tick', updateElementPositions);
            console.log('✅ Graph rendered successfully');
            
        } catch (error) {
            console.error('❌ Error in renderGraph:', error);
            showNotification('Error rendering graph: ' + error.message, 'error');
        }
    }
    
    function updateElementPositions() {
        if (linkElements) {
            linkElements
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
        }
        
        if (nodeElements) {
            nodeElements
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);
        }
        
        if (labelElements) {
            labelElements
                .attr('x', d => d.x)
                .attr('y', d => d.y);
        }
    }
    
    function getNodeRadius(node) {
        if (!graphData.analysis) return 8;
        
        const measure = `${currentCentralityMeasure}Centrality`;
        const centrality = graphData.analysis[measure];
        
        if (centrality && centrality[node.id] !== undefined) {
            const maxCentrality = Math.max(...Object.values(centrality));
            const minCentrality = Math.min(...Object.values(centrality));
            const normalizedCentrality = maxCentrality > minCentrality ? 
                (centrality[node.id] - minCentrality) / (maxCentrality - minCentrality) : 0.5;
            return 5 + normalizedCentrality * 15; // Size range: 5-20
        }
        
        return 8;
    }
    
    function getNodeColor(node) {
        if (!graphData.analysis) return '#69b3a2';
        
        const measure = `${currentCentralityMeasure}Centrality`;
        const centrality = graphData.analysis[measure];
        
        if (centrality && centrality[node.id] !== undefined) {
            return centralityColorScale(centrality[node.id]);
        }
        
        // Use community color if available
        if (graphData.analysis.communities && graphData.analysis.communities[node.id] !== undefined) {
            return communityColorScale(graphData.analysis.communities[node.id]);
        }
        
        return '#69b3a2';
    }
    
    function updateNodeColors() {
        if (nodeElements) {
            nodeElements.attr('fill', d => getNodeColor(d));
        }
    }
    
    function handleLayoutChange(e) {
        currentLayout = e.target.value;
        if (graphData) {
            loadGraph(); // Reload with new layout
        }
    }
    
    function handleCentralityChange(e) {
        currentCentralityMeasure = e.target.value;
        if (graphData && graphData.analysis) {
            // Update color scale
            const measure = `${currentCentralityMeasure}Centrality`;
            if (graphData.analysis[measure]) {
                const centralityValues = Object.values(graphData.analysis[measure]);
                centralityColorScale.domain(d3.extent(centralityValues));
                updateNodeColors();
                updateCentralityRankings();
            } else {
                // Need to calculate this centrality
                analyzeGraph();
            }
        }
    }
    
    function handleZoom(event) {
        console.log('🔍 Zoom event:', {
            transform: { x: event.transform.x, y: event.transform.y, k: event.transform.k },
            previousTransform: { x: transform.x, y: transform.y, k: transform.k }
        });
        
        transform = event.transform;
        g.attr('transform', transform);
    }
    
    function zoomBy(factor) {
        svg.transition().duration(300).call(
            zoom.scaleBy, factor
        );
    }
    
    function resetZoom() {
        svg.transition().duration(500).call(
            zoom.transform,
            d3.zoomIdentity
        );
    }
    
    function handleResize() {
        if (container && container.style.display !== 'none') {
            const canvasContainer = document.getElementById('global-graph-canvas');
            const newWidth = canvasContainer.clientWidth || 800;
            const newHeight = canvasContainer.clientHeight || 600;
            
            if (newWidth !== width || newHeight !== height) {
                width = newWidth;
                height = newHeight;
                
                svg.attr('width', width).attr('height', height);
                
                if (simulation) {
                    simulation.force('center', d3.forceCenter(width / 2, height / 2));
                    simulation.alpha(0.3).restart();
                }
            }
        }
    }
    
    function handleNodeClick(event, node) {
        event.stopPropagation();
        selectNode(node);
    }
    
    function handleNodeMouseOver(event, node) {
        // Highlight node
        d3.select(event.target)
            .attr('stroke', '#ff6b6b')
            .attr('stroke-width', 3);
        
        // Show tooltip
        showTooltip(event, node);
    }
    
    function handleNodeMouseOut(event, node) {
        // Remove highlight
        d3.select(event.target)
            .attr('stroke', '#fff')
            .attr('stroke-width', 2);
        
        // Hide tooltip
        hideTooltip();
    }
    
    function showTooltip(event, node) {
        const tooltip = d3.select('body').append('div')
            .attr('class', 'global-graph-tooltip')
            .style('position', 'absolute')
            .style('background', 'rgba(0, 0, 0, 0.8)')
            .style('color', 'white')
            .style('padding', '8px')
            .style('border-radius', '4px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('z-index', '1000');
        
        const measure = `${currentCentralityMeasure}Centrality`;
        const centrality = graphData.analysis && graphData.analysis[measure] ? 
            graphData.analysis[measure][node.id] : 'N/A';
        
        tooltip.html(`
            <strong>${truncateText(node.content, 30)}</strong><br/>
            ${currentCentralityMeasure}: ${typeof centrality === 'number' ? centrality.toFixed(3) : centrality}
        `);
        
        tooltip.style('left', (event.pageX + 10) + 'px')
               .style('top', (event.pageY - 10) + 'px');
    }
    
    function hideTooltip() {
        d3.selectAll('.global-graph-tooltip').remove();
    }
    
    function selectNode(node) {
        selectedNode = node;
        
        // Highlight selected node
        if (nodeElements) {
            nodeElements.attr('stroke', d => d.id === node.id ? '#ff6b6b' : '#fff')
                        .attr('stroke-width', d => d.id === node.id ? 4 : 2);
        }
        
        // Update selected node info
        updateSelectedNodeInfo();
        
        // Show selected node section
        document.getElementById('selected-node-section').style.display = 'block';
    }
    
    function updateSelectedNodeInfo() {
        if (!selectedNode) return;
        
        const contentEl = document.getElementById('selected-node-content');
        const degreeEl = document.getElementById('selected-degree');
        const centralityEl = document.getElementById('selected-centrality');
        const communityEl = document.getElementById('selected-community');
        
        if (contentEl) {
            contentEl.innerHTML = `
                <div class="node-title">${truncateText(selectedNode.content, 50)}</div>
                ${selectedNode.content_zh ? `<div class="node-subtitle">${truncateText(selectedNode.content_zh, 50)}</div>` : ''}
            `;
        }
        
        // Get degree
        const degree = graphData.analysis && graphData.analysis.degreeCentrality ? 
            graphData.analysis.degreeCentrality[selectedNode.id] || 0 : 0;
        if (degreeEl) degreeEl.textContent = degree;
        
        // Get centrality
        const measure = `${currentCentralityMeasure}Centrality`;
        const centrality = graphData.analysis && graphData.analysis[measure] ? 
            graphData.analysis[measure][selectedNode.id] : 'N/A';
        if (centralityEl) {
            centralityEl.textContent = typeof centrality === 'number' ? centrality.toFixed(3) : centrality;
        }
        
        // Get community
        const community = graphData.analysis && graphData.analysis.communities ? 
            graphData.analysis.communities[selectedNode.id] : 'N/A';
        if (communityEl) communityEl.textContent = community;
    }
    
    function updateStatistics() {
        if (!graphData || !graphData.stats) return;
        
        document.getElementById('stat-nodes').textContent = graphData.stats.nodeCount;
        document.getElementById('stat-links').textContent = graphData.stats.linkCount;
        document.getElementById('stat-density').textContent = graphData.stats.density.toFixed(3);
        document.getElementById('stat-avg-degree').textContent = graphData.stats.averageDegree.toFixed(1);
        document.getElementById('stat-components').textContent = graphData.stats.components || 1;
    }
    
    function updateCentralityRankings() {
        const rankingsEl = document.getElementById('centrality-rankings');
        if (!rankingsEl || !graphData || !graphData.analysis) return;
        
        const measure = `${currentCentralityMeasure}Centrality`;
        const centrality = graphData.analysis[measure];
        
        if (!centrality) {
            rankingsEl.innerHTML = '<div class="loading-message">Calculate centrality to see rankings</div>';
            return;
        }
        
        // Create rankings array
        const rankings = Object.entries(centrality)
            .map(([nodeId, value]) => {
                const node = graphData.nodes.find(n => n.id === nodeId);
                return { node, value };
            })
            .filter(item => item.node)
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
        
        rankingsEl.innerHTML = `
            <div class="rankings-header">Top ${currentCentralityMeasure} Centrality</div>
            ${rankings.map((item, index) => `
                <div class="ranking-item" data-node-id="${item.node.id}">
                    <div class="ranking-position">${index + 1}</div>
                    <div class="ranking-content">
                        <div class="ranking-title">${truncateText(item.node.content, 25)}</div>
                        <div class="ranking-value">${item.value.toFixed(3)}</div>
                    </div>
                </div>
            `).join('')}
        `;
        
        // Add click handlers to ranking items
        rankingsEl.querySelectorAll('.ranking-item').forEach(item => {
            item.addEventListener('click', () => {
                const nodeId = item.dataset.nodeId;
                const node = graphData.nodes.find(n => n.id === nodeId);
                if (node) {
                    selectNode(node);
                    centerViewOnNode(node);
                }
            });
        });
    }
    
    function centerViewOnNode(node) {
        if (!node.x || !node.y) return;
        
        const scale = transform.k;
        const x = -node.x * scale + width / 2;
        const y = -node.y * scale + height / 2;
        
        svg.transition().duration(750).call(
            zoom.transform,
            d3.zoomIdentity.translate(x, y).scale(scale)
        );
    }
    
    async function handleSearch(e) {
        const query = e.target.value.trim();
        const resultsEl = document.getElementById('search-results');
        
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        
        if (query.length < 2) {
            resultsEl.innerHTML = '';
            return;
        }
        
        searchTimeout = setTimeout(async () => {
            try {
                const response = await fetch(`/api/global-graph/search?q=${encodeURIComponent(query)}`);
                const results = await response.json();
                
                resultsEl.innerHTML = results.map(node => `
                    <div class="search-result-item" data-node-id="${node.id}">
                        <div class="search-result-content">${highlightSearchTerm(node.content, query)}</div>
                        ${node.content_zh ? `<div class="search-result-subtitle">${highlightSearchTerm(node.content_zh, query)}</div>` : ''}
                    </div>
                `).join('');
                
                // Add click handlers
                resultsEl.querySelectorAll('.search-result-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const nodeId = item.dataset.nodeId;
                        const node = graphData?.nodes.find(n => n.id === nodeId);
                        if (node) {
                            selectNode(node);
                            centerViewOnNode(node);
                        }
                    });
                });
                
            } catch (error) {
                console.error('Error searching nodes:', error);
                resultsEl.innerHTML = '<div class="search-error">Error searching nodes</div>';
            }
        }, 300);
    }
    
    function highlightSearchTerm(text, term) {
        if (!text || !term) return text;
        const regex = new RegExp(`(${term})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }
    
    async function focusSelectedNode() {
        if (!selectedNode) return;
        
        try {
            // This would integrate with the main outliner
            if (window.focusNodeInOutliner) {
                window.focusNodeInOutliner(selectedNode.id);
            } else {
                showNotification('Outliner integration not available', 'warning');
            }
        } catch (error) {
            console.error('Error focusing node in outliner:', error);
            showNotification('Error focusing node in outliner', 'error');
        }
    }
    
    async function exploreNeighbors() {
        if (!selectedNode) return;
        
        try {
            const response = await fetch(`/api/global-graph/nodes/${selectedNode.id}/neighbors?depth=2`);
            const data = await response.json();
            
            showNotification(`Found ${data.neighbors.length} neighbors within 2 steps`, 'info');
            
            // Could open local graph manager or show neighbor details
            if (window.LocalGraphManager) {
                window.LocalGraphManager.show();
                // Set center node if the local graph manager supports it
            }
            
        } catch (error) {
            console.error('Error exploring neighbors:', error);
            showNotification('Error exploring neighbors', 'error');
        }
    }
    
    // Drag handlers
    function dragStarted(event, d) {
        console.log('🎯 Drag Started:', {
            nodeId: d.id,
            nodePosition: { x: d.x, y: d.y },
            eventPosition: { x: event.x, y: event.y },
            transform: { x: transform.x, y: transform.y, k: transform.k },
            sourceEvent: event.sourceEvent ? { x: event.sourceEvent.clientX, y: event.sourceEvent.clientY } : null
        });
        
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }
    
    function dragged(event, d) {
        console.log('🎯 Dragging:', {
            nodeId: d.id,
            eventPosition: { x: event.x, y: event.y },
            currentNodePos: { x: d.x, y: d.y },
            currentFixedPos: { fx: d.fx, fy: d.fy },
            transform: { x: transform.x, y: transform.y, k: transform.k }
        });
        
        d.fx = event.x;
        d.fy = event.y;
        
        console.log('🎯 Final position set:', { fx: d.fx, fy: d.fy });
    }
    
    function dragEnded(event, d) {
        console.log('🎯 Drag Ended:', {
            nodeId: d.id,
            finalPosition: { fx: d.fx, fy: d.fy },
            nodePosition: { x: d.x, y: d.y }
        });
        
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
    
    // Utility functions
    function truncateText(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }
    
    function showLoading(message = 'Loading...') {
        const loadingEl = document.getElementById('global-graph-loading');
        const textEl = loadingEl?.querySelector('.loading-text');
        if (textEl) textEl.textContent = message;
        if (loadingEl) loadingEl.style.display = 'flex';
    }
    
    function hideLoading() {
        const loadingEl = document.getElementById('global-graph-loading');
        if (loadingEl) loadingEl.style.display = 'none';
    }
    
    function showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `global-graph-notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
    
    function show() {
        if (!isInitialized) {
            console.error('GlobalGraphManager not initialized');
            return;
        }
        
        if (container) {
            container.style.display = 'block';
            
            // Trigger resize to ensure proper canvas sizing
            setTimeout(() => {
                handleResize();
            }, 100);
        }
    }
    
    function hide() {
        if (container) {
            container.style.display = 'none';
        }
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
        selectNode,
        centerViewOnNode,
        isInitialized: () => isInitialized
    };
})();

window.GlobalGraphManager = GlobalGraphManager;