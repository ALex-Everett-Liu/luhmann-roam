/**
 * Global Graph Manager UI
 * Complete graph visualization with multiple layouts and centrality analysis
 * Enhanced with table view, caching, and community-based coloring
 */
const GlobalGraphManager = (function() {
    let container;
    let graphData = null;
    let currentLayout = 'force-directed';
    let currentCentralityMeasure = 'degree';
    let currentViewMode = 'graph'; // 'graph' or 'table'
    let isInitialized = false;
    let selectedNode = null;
    let searchTimeout = null;
    let currentCommunityFilter = 'all'; // Track current community filter
    
    // D3 visualization variables - will be initialized later
    let svg, g, simulation;
    let nodeElements, linkElements, labelElements;
    let width = 800, height = 600;
    let zoom, transform;
    
    // Color scales - will be initialized later
    let centralityColorScale, communityColorScale;
    
    // Enhanced caching system
    let analysisCache = new Map();
    let calculationPromises = new Map();
    const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
    
    // Available centrality measures
    const centralityMeasures = [
        'degree', 'betweenness', 'closeness', 'pagerank', 'eigenvector'
    ];
    
    // Add fullscreen state tracking
    let isTableFullscreen = false;

    function initialize() {
        if (isInitialized) {
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
                            <label for="view-mode-select">View Mode:</label>
                            <select id="view-mode-select" class="view-mode-select">
                                <option value="graph">Graph View</option>
                                <option value="table">Table View</option>
                            </select>
                        </div>
                        
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
                            <button id="calculate-all-btn" class="secondary-btn">Calculate All</button>
                            <button id="debug-state-btn" class="secondary-btn">Debug State</button>
                        </div>
                    </div>
                    
                    <!-- Cache Status -->
                    <div class="cache-status-section">
                        <div class="cache-status" id="cache-status">
                            <span class="cache-info">Cache: Empty</span>
                            <button id="clear-cache-btn" class="cache-btn">Clear Cache</button>
                        </div>
                    </div>
                </div>
                
                <!-- Main Content Area -->
                <div class="global-graph-main-area">
                    <!-- Graph View -->
                    <div class="global-graph-view" id="graph-view">
                        <div class="global-graph-canvas-area">
                            <div id="global-graph-canvas"></div>
                            <div class="zoom-controls">
                                <button id="zoom-in-btn">+</button>
                                <button id="zoom-out-btn">-</button>
                                <button id="zoom-reset-btn">⌂</button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Table View -->
                    <div class="global-graph-table-view" id="table-view" style="display: none;">
                        <div class="table-controls">
                            <div class="table-controls-left">
                                <div class="table-control-group">
                                    <label for="table-metric-select">Metric:</label>
                                    <select id="table-metric-select" class="table-metric-select">
                                        <option value="degree">Degree Centrality</option>
                                        <option value="betweenness">Betweenness Centrality</option>
                                        <option value="closeness">Closeness Centrality</option>
                                        <option value="pagerank">PageRank Centrality</option>
                                        <option value="eigenvector">Eigenvector Centrality</option>
                                    </select>
                                </div>
                                
                                <div class="table-control-group">
                                    <label for="table-limit-select">Show Top:</label>
                                    <select id="table-limit-select" class="table-limit-select">
                                        <option value="25">Top 25</option>
                                        <option value="50">Top 50</option>
                                        <option value="100" selected>Top 100</option>
                                        <option value="200">Top 200</option>
                                        <option value="500">Top 500</option>
                                        <option value="1000">Top 1000</option>
                                    </select>
                                </div>
                                
                                <div class="table-control-group">
                                    <label for="community-coloring-toggle">Community Colors:</label>
                                    <input type="checkbox" id="community-coloring-toggle" class="community-toggle">
                                </div>
                                
                                <div class="table-control-group">
                                    <label for="community-filter-select">Filter by Community:</label>
                                    <select id="community-filter-select" class="community-filter-select">
                                        <option value="all">All Communities</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="table-controls-right">
                                <button id="table-fullscreen-btn" class="fullscreen-btn">
                                    <span id="fullscreen-icon">⛶</span>
                                    <span id="fullscreen-text">Fullscreen</span>
                                </button>
                            </div>
                        </div>
                        
                        <div class="metrics-table-container" id="metrics-table-container">
                            <table class="metrics-table" id="metrics-table">
                                <thead>
                                    <tr>
                                        <th>Rank</th>
                                        <th>Node</th>
                                        <th>Centrality</th>
                                        <th>Community</th>
                                        <th>Degree</th>
                                    </tr>
                                </thead>
                                <tbody id="metrics-table-body">
                                    <tr>
                                        <td colspan="5" class="table-message">Load graph data to see metrics</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <!-- Sidebar -->
                    <div class="global-graph-sidebar">
                        <!-- Search - MOVED TO TOP -->
                        <div class="sidebar-section">
                            <h4>🔍 Search Nodes</h4>
                            <div class="search-container">
                                <input type="text" id="global-graph-search" 
                                       class="search-input" placeholder="Search nodes...">
                                <div class="search-results" id="search-results"></div>
                            </div>
                        </div>
                        
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
                                <div class="stat-item">
                                    <span class="stat-label">Communities:</span>
                                    <span class="stat-value" id="stat-communities">-</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Calculation Progress -->
                        <div class="sidebar-section" id="calculation-progress-section" style="display: none;">
                            <h4>🔄 Calculation Progress</h4>
                            <div class="progress-container">
                                <div class="progress-item">
                                    <span class="progress-label">Degree:</span>
                                    <span class="progress-status" id="progress-degree">Pending</span>
                                </div>
                                <div class="progress-item">
                                    <span class="progress-label">Betweenness:</span>
                                    <span class="progress-status" id="progress-betweenness">Pending</span>
                                </div>
                                <div class="progress-item">
                                    <span class="progress-label">Closeness:</span>
                                    <span class="progress-status" id="progress-closeness">Pending</span>
                                </div>
                                <div class="progress-item">
                                    <span class="progress-label">PageRank:</span>
                                    <span class="progress-status" id="progress-pagerank">Pending</span>
                                </div>
                                <div class="progress-item">
                                    <span class="progress-label">Eigenvector:</span>
                                    <span class="progress-status" id="progress-eigenvector">Pending</span>
                                </div>
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
        document.getElementById('calculate-all-btn')?.addEventListener('click', calculateAllCentralities);
        document.getElementById('debug-state-btn')?.addEventListener('click', debugCurrentState);
        document.getElementById('clear-cache-btn')?.addEventListener('click', clearCache);
        
        // View mode toggle
        document.getElementById('view-mode-select')?.addEventListener('change', handleViewModeChange);
        
        document.getElementById('layout-select')?.addEventListener('change', handleLayoutChange);
        document.getElementById('centrality-select')?.addEventListener('change', handleCentralityChange);
        
        // Table view handlers
        document.getElementById('table-metric-select')?.addEventListener('change', handleTableMetricChange);
        document.getElementById('table-limit-select')?.addEventListener('change', updateTableView);
        document.getElementById('community-coloring-toggle')?.addEventListener('change', updateTableView);
                
        // Community filter handler
        document.getElementById('community-filter-select')?.addEventListener('change', handleCommunityFilterChange);
        
        // Fullscreen handlers
        document.getElementById('table-fullscreen-btn')?.addEventListener('click', toggleTableFullscreen);
        
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
        
        // Escape key to exit fullscreen
        document.addEventListener('keydown', handleKeyDown);
    }
    
    function handleViewModeChange(e) {
        currentViewMode = e.target.value;
        switchView();
    }
    
    function switchView() {
        const graphView = document.getElementById('graph-view');
        const tableView = document.getElementById('table-view');
        
        if (currentViewMode === 'table') {
            graphView.style.display = 'none';
            tableView.style.display = 'block';
            updateTableView();
        } else {
            graphView.style.display = 'block';
            tableView.style.display = 'none';
        }
    }
    
    function handleTableMetricChange(e) {
        const metric = e.target.value;
        // Sync with main centrality select
        document.getElementById('centrality-select').value = metric;
        currentCentralityMeasure = metric;
        updateTableView();
    }
    
    function handleCommunityFilterChange(e) {
        currentCommunityFilter = e.target.value;
        updateTableView();
    }
    
    // Enhanced caching functions
    function getCachedAnalysis(measure) {
        const cacheKey = `${measure}_${Date.now()}`;
        const cached = analysisCache.get(measure);
        
        if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
            return cached.data;
        }
        
        return null;
    }
    
    function setCachedAnalysis(measure, data) {
        analysisCache.set(measure, {
            data: data,
            timestamp: Date.now()
        });
        updateCacheStatus();
    }
    
    function updateCacheStatus() {
        const statusEl = document.getElementById('cache-status');
        const cacheInfo = statusEl.querySelector('.cache-info');
        
        if (analysisCache.size === 0) {
            cacheInfo.textContent = 'Cache: Empty';
        } else {
            const validCount = Array.from(analysisCache.values())
                .filter(item => (Date.now() - item.timestamp) < CACHE_DURATION).length;
            cacheInfo.textContent = `Cache: ${validCount} metrics cached`;
        }
    }
    
    function clearCache() {
        analysisCache.clear();
        calculationPromises.clear();
        updateCacheStatus();
        showNotification('Cache cleared', 'info');
    }

    async function calculateAllCentralities() {
        if (!graphData) {
            showNotification('Please load the graph first', 'warning');
            return;
        }
        
        document.getElementById('calculation-progress-section').style.display = 'block';
        
        // Calculate all centralities progressively
        const measures = ['degree', 'betweenness', 'closeness', 'pagerank', 'eigenvector'];
        
        for (const measure of measures) {
            const progressEl = document.getElementById(`progress-${measure}`);
            progressEl.textContent = 'Calculating...';
            progressEl.className = 'progress-status calculating';
            
            try {
                await calculateCentralityMeasure(measure);
                progressEl.textContent = 'Completed';
                progressEl.className = 'progress-status completed';
            } catch (error) {
                progressEl.textContent = 'Error';
                progressEl.className = 'progress-status error';
                console.error(`Error calculating ${measure}:`, error);
            }
        }
        
        // Update views
        updateCentralityRankings();
        updateTableView();
        
        setTimeout(() => {
            document.getElementById('calculation-progress-section').style.display = 'none';
        }, 3000);
    }
    
    async function calculateCentralityMeasure(measure) {
        // Check cache first
        const cached = getCachedAnalysis(measure);
        if (cached) {
            console.log(`Using cached ${measure} centrality`);
            return cached;
        }
        
        // Check if calculation is already in progress
        if (calculationPromises.has(measure)) {
            return await calculationPromises.get(measure);
        }
        
        // Start calculation
        const calculationPromise = fetch(`/api/global-graph/centrality/${measure}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to calculate ${measure} centrality`);
                }
                return response.json();
            })
            .then(data => {
                // Cache the result
                setCachedAnalysis(measure, data);
                
                // Update graph data
                if (!graphData.analysis) graphData.analysis = {};
                graphData.analysis[`${measure}Centrality`] = {};
                
                data.results.forEach(result => {
                    graphData.analysis[`${measure}Centrality`][result.nodeId] = result.centrality;
                });
                
                return data;
            })
            .finally(() => {
                calculationPromises.delete(measure);
            });
        
        calculationPromises.set(measure, calculationPromise);
        return await calculationPromise;
    }

    async function calculateAndUpdateTable(measure) {
        try {
            showLoading(`Calculating ${measure} centrality...`);
            
            await calculateCentralityMeasure(measure);
            
            // Update color scale
            const measureKey = `${measure}Centrality`;
            if (graphData.analysis[measureKey]) {
                const centralityValues = Object.values(graphData.analysis[measureKey]);
                centralityColorScale.domain(d3.extent(centralityValues));
            }
            
            // Update table view
            updateTableView();
            
            // Update rankings
            updateCentralityRankings();
            
            hideLoading();
            showNotification(`${measure} centrality calculated!`, 'success');
            
        } catch (error) {
            console.error(`Error calculating ${measure}:`, error);
            hideLoading();
            showNotification(`Error calculating ${measure}: ${error.message}`, 'error');
        }
    }

    function debugCurrentState() {
        console.log('🐛 Current Debug State:', {
            viewMode: currentViewMode,
            centralityMeasure: currentCentralityMeasure,
            cacheSize: analysisCache.size,
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
            showLoading('Loading graph data...');
            
            const layout = document.getElementById('layout-select').value;
            const response = await fetch(`/api/global-graph?layout=${layout}&includeCentrality=true&includeLayout=true`);
            
            if (!response.ok) {
                throw new Error(`Failed to load graph data: ${response.status} ${response.statusText}`);
            }
            
            graphData = await response.json();
            
            // Update statistics
            updateStatistics();
            
            // Update centrality color scale
            if (graphData.analysis && graphData.analysis.degreeCentrality) {
                const centralityValues = Object.values(graphData.analysis.degreeCentrality);
                centralityColorScale.domain(d3.extent(centralityValues));
            }
            
            // Update community color scale
            if (graphData.analysis && graphData.analysis.communities) {
                const communityCount = Math.max(...Object.values(graphData.analysis.communities)) + 1;
                communityColorScale.domain(d3.range(communityCount));
            }
                            
            // Populate community filter dropdown
            populateCommunityFilter();
            
            // Render based on current view mode
            if (currentViewMode === 'graph') {
                renderGraph();
            } else {
                updateTableView();
            }
            
            // Update rankings
            updateCentralityRankings();
            
            hideLoading();
            showNotification('Graph loaded successfully!', 'success');
            
        } catch (error) {
            console.error('❌ Error loading graph:', error);
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
            await calculateCentralityMeasure(centrality);
            
            // Update color scale
            const measure = `${centrality}Centrality`;
            if (graphData.analysis[measure]) {
                const centralityValues = Object.values(graphData.analysis[measure]);
                centralityColorScale.domain(d3.extent(centralityValues));
            }
            
            // Re-render with new colors
            if (currentViewMode === 'graph') {
                updateNodeColors();
            } else {
                updateTableView();
            }
            
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
    
    function updateTableView() {
        const tableBody = document.getElementById('metrics-table-body');
        if (!tableBody || !graphData || !graphData.nodes) {
            return;
        }
        
        const metric = document.getElementById('table-metric-select').value;
        const limit = parseInt(document.getElementById('table-limit-select').value);
        const useCommunityCola = document.getElementById('community-coloring-toggle').checked;
        const communityFilter = document.getElementById('community-filter-select')?.value || 'all';
        
        const measure = `${metric}Centrality`;
        const centrality = graphData.analysis?.[measure];
        
        if (!centrality) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="table-message">
                        ${metric} centrality not calculated yet. 
                        <button onclick="GlobalGraphManager.calculateAndUpdateTable('${metric}')" class="inline-btn">Calculate Now</button>
                    </td>
                </tr>
            `;
            return;
        }
        
        // Show loading for large datasets
        if (Object.keys(centrality).length > 500) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="table-message">
                        <div class="loading-spinner" style="width: 20px; height: 20px; margin: 0 auto;"></div>
                        Loading ${Object.keys(centrality).length} nodes...
                    </td>
                </tr>
            `;
            
            // Use setTimeout to allow UI to update
            setTimeout(() => {
                renderTableData(centrality, limit, useCommunityCola, communityFilter);
            }, 10);
        } else {
            renderTableData(centrality, limit, useCommunityCola, communityFilter);
        }
    }
    
    function renderTableData(centrality, limit, useCommunityCola, communityFilter = 'all') {
        const tableBody = document.getElementById('metrics-table-body');
        if (!tableBody) return;
        
        // Create rankings array with community filtering
        const rankings = Object.entries(centrality)
            .map(([nodeId, value]) => {
                const node = graphData.nodes.find(n => n.id === nodeId);
                const community = graphData.analysis?.communities?.[nodeId] ?? 'N/A';
                return { node, value, nodeId, community };
            })
            .filter(item => {
                if (!item.node) return false;
                
                // Apply community filter
                if (communityFilter !== 'all') {
                    if (communityFilter === 'none') {
                        return item.community === 'N/A';
                    } else {
                        return item.community.toString() === communityFilter;
                    }
                }
                
                return true;
            })
            .sort((a, b) => b.value - a.value)
            .slice(0, limit);
        
        // Show message if no results after filtering
        if (rankings.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="table-message">
                        No nodes found in community "${communityFilter}". 
                        <button onclick="document.getElementById('community-filter-select').value='all'; GlobalGraphManager.handleCommunityFilterChange({target: {value: 'all'}})" class="inline-btn">Show All</button>
                    </td>
                </tr>
            `;
            return;
        }
        
        // Use DocumentFragment for better performance
        const fragment = document.createDocumentFragment();
        
        rankings.forEach((item, index) => {
            const community = item.community;
            const degree = graphData.analysis?.degreeCentrality?.[item.nodeId] || 0;
            
            // Get community color
            const communityColor = useCommunityCola && community !== 'N/A' ? 
                communityColorScale(community) : 'transparent';
            
            const row = document.createElement('tr');
            row.className = 'table-row';
            row.dataset.nodeId = item.nodeId;
            row.style.backgroundColor = `${communityColor}15`;
            
            row.innerHTML = `
                <td class="rank-cell">${index + 1}</td>
                <td class="node-cell">
                    <div class="node-info">
                        <div class="node-title">${truncateText(item.node.content, 60)}</div>
                        ${item.node.content_zh ? `<div class="node-subtitle">${truncateText(item.node.content_zh, 60)}</div>` : ''}
                    </div>
                </td>
                <td class="centrality-cell">${item.value.toFixed(4)}</td>
                <td class="community-cell">
                    <span class="community-badge" style="background-color: ${communityColor};">
                        ${community}
                    </span>
                </td>
                <td class="degree-cell">${degree}</td>
            `;
            
            // Add click handler
            row.addEventListener('click', () => {
                selectNodeById(item.nodeId);
            });
            
            fragment.appendChild(row);
        });
        
        // Clear and append all rows at once
        tableBody.innerHTML = '';
        tableBody.appendChild(fragment);
    }

    function populateCommunityFilter() {
        const communitySelect = document.getElementById('community-filter-select');
        if (!communitySelect || !graphData || !graphData.analysis || !graphData.analysis.communities) {
            return;
        }
        
        // Get all unique communities
        const communities = Object.values(graphData.analysis.communities);
        const uniqueCommunities = [...new Set(communities)].sort((a, b) => a - b);
        
        // Get community counts for display
        const communityCounts = {};
        communities.forEach(community => {
            communityCounts[community] = (communityCounts[community] || 0) + 1;
        });
        
        // Check if there are nodes without communities
        const nodesWithoutCommunities = graphData.nodes.filter(node => 
            !graphData.analysis.communities[node.id] && 
            graphData.analysis.communities[node.id] !== 0
        ).length;
        
        // Clear existing options except "All Communities"
        communitySelect.innerHTML = '<option value="all">All Communities</option>';
        
        // Add option for nodes without communities if they exist
        if (nodesWithoutCommunities > 0) {
            const option = document.createElement('option');
            option.value = 'none';
            option.textContent = `No Community (${nodesWithoutCommunities} nodes)`;
            communitySelect.appendChild(option);
        }
        
        // Add options for each community
        uniqueCommunities.forEach(community => {
            const option = document.createElement('option');
            option.value = community.toString();
            option.textContent = `Community ${community} (${communityCounts[community]} nodes)`;
            communitySelect.appendChild(option);
        });
        
        // Reset filter to 'all'
        communitySelect.value = 'all';
        currentCommunityFilter = 'all';
    }
    
    function renderGraph() {
        if (!graphData || !graphData.nodes) return;
        
        // Transform links to have the correct structure for D3.js
        const transformedLinks = graphData.links.map(link => ({
            ...link,
            source: link.from_node_id,  // D3.js expects 'source'
            target: link.to_node_id     // D3.js expects 'target'
        }));
        
        // Validate data
        const nodeIds = new Set(graphData.nodes.map(n => n.id));
        const validLinks = transformedLinks.filter(link => {
            const isValid = nodeIds.has(link.source) && nodeIds.has(link.target);
            if (!isValid) {
                console.warn('❌ Invalid link:', link);
            }
            return isValid;
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
                    
                    // Calculate scaling factors to fit in canvas with some padding
                    const padding = 50;
                    const scaleX = (width - 2 * padding) / serverWidth;
                    const scaleY = (height - 2 * padding) / serverHeight;
                    const scale = Math.min(scaleX, scaleY); // Use uniform scaling
                    
                    // Apply scaled positions WITHOUT fixing them (no fx/fy)
                    graphData.nodes.forEach(node => {
                        const pos = graphData.layout.positions[node.id];
                        if (pos) {
                            // Scale and center the positions
                            node.x = padding + (pos.x - serverMinX) * scale;
                            node.y = padding + (pos.y - serverMinY) * scale;
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
            }
            
            // Start simulation
            simulation.on('tick', updateElementPositions);
            
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
        
        // Check if community coloring is enabled
        const useCommunityCola = document.getElementById('community-coloring-toggle')?.checked;
        
        if (useCommunityCola && graphData.analysis.communities && 
            graphData.analysis.communities[node.id] !== undefined) {
            return communityColorScale(graphData.analysis.communities[node.id]);
        }
        
        // Use centrality coloring
        const measure = `${currentCentralityMeasure}Centrality`;
        const centrality = graphData.analysis[measure];
        
        if (centrality && centrality[node.id] !== undefined) {
            return centralityColorScale(centrality[node.id]);
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
        if (graphData && currentViewMode === 'graph') {
            loadGraph(); // Reload with new layout
        }
    }
    
    function handleCentralityChange(e) {
        currentCentralityMeasure = e.target.value;
        
        // Sync with table metric select
        document.getElementById('table-metric-select').value = currentCentralityMeasure;
        
        if (graphData && graphData.analysis) {
            // Update color scale
            const measure = `${currentCentralityMeasure}Centrality`;
            if (graphData.analysis[measure]) {
                const centralityValues = Object.values(graphData.analysis[measure]);
                centralityColorScale.domain(d3.extent(centralityValues));
                
                if (currentViewMode === 'graph') {
                    updateNodeColors();
                } else {
                    updateTableView();
                }
                
                updateCentralityRankings();
            } else {
                // Need to calculate this centrality
                analyzeGraph();
            }
        }
    }
    
    function handleZoom(event) {
        transform = event.transform;
        g.attr('transform', transform);
    }
    
    function zoomBy(factor) {
        if (currentViewMode === 'graph') {
            svg.transition().duration(300).call(
                zoom.scaleBy, factor
            );
        }
    }
    
    function resetZoom() {
        if (currentViewMode === 'graph') {
            svg.transition().duration(500).call(
                zoom.transform,
                d3.zoomIdentity
            );
        }
    }
    
    function handleResize() {
        if (container && container.style.display !== 'none' && currentViewMode === 'graph') {
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
        
        const community = graphData.analysis && graphData.analysis.communities && 
            graphData.analysis.communities[node.id] !== undefined ? 
            graphData.analysis.communities[node.id] : 'N/A';
        
        tooltip.html(`
            <strong>${truncateText(node.content, 30)}</strong><br/>
            ${currentCentralityMeasure}: ${typeof centrality === 'number' ? centrality.toFixed(3) : centrality}<br/>
            Community: ${community}
        `);
        
        tooltip.style('left', (event.pageX + 10) + 'px')
               .style('top', (event.pageY - 10) + 'px');
    }
    
    function hideTooltip() {
        d3.selectAll('.global-graph-tooltip').remove();
    }
    
    function selectNode(node) {
        selectedNode = node;
        
        // Highlight selected node in graph view
        if (currentViewMode === 'graph' && nodeElements) {
            nodeElements.attr('stroke', d => d.id === node.id ? '#ff6b6b' : '#fff')
                        .attr('stroke-width', d => d.id === node.id ? 4 : 2);
        }
        
        // Highlight selected node in table view
        if (currentViewMode === 'table') {
            // Wait a moment for table to update if filter was changed
            setTimeout(() => {
                const tableRows = document.querySelectorAll('.table-row');
                let targetRow = null;
                
                tableRows.forEach(row => {
                    if (row.dataset.nodeId === node.id) {
                        row.classList.add('selected');
                        targetRow = row;
                    } else {
                        row.classList.remove('selected');
                    }
                });
                
                // Scroll to the selected row
                if (targetRow) {
                    scrollToTableRow(targetRow);
                } else {
                    // If still not found, show message
                    showNotification('Node not found in current table view', 'warning');
                }
            }, 100);
        }
        
        // Update selected node info
        updateSelectedNodeInfo();
        
        // Show selected node section
        document.getElementById('selected-node-section').style.display = 'block';
    }
    
    function selectNodeById(nodeId) {
        if (!graphData || !graphData.nodes) return;
        
        const node = graphData.nodes.find(n => n.id === nodeId);
        if (node) {
            // If in table view, ensure the node is visible
            if (currentViewMode === 'table') {
                ensureNodeVisibleInTable(node);
            }
            
            selectNode(node);
            
            // If in graph view, center on node
            if (currentViewMode === 'graph') {
                centerViewOnNode(node);
            }
        }
    }

    function ensureNodeVisibleInTable(node) {
        const communityFilterSelect = document.getElementById('community-filter-select');
        if (!communityFilterSelect) return;
        
        // Get the node's community
        const nodeCommunity = graphData.analysis?.communities?.[node.id];
        const nodeCommunityStr = nodeCommunity !== undefined ? nodeCommunity.toString() : 'N/A';
        
        // Check if the node would be visible with current filter
        const currentFilter = communityFilterSelect.value;
        let needsFilterChange = false;
        
        if (currentFilter !== 'all') {
            if (currentFilter === 'none' && nodeCommunityStr !== 'N/A') {
                needsFilterChange = true;
            } else if (currentFilter !== 'none' && currentFilter !== nodeCommunityStr) {
                needsFilterChange = true;
            }
        }
        
        // Change filter if needed
        if (needsFilterChange) {
            if (nodeCommunityStr === 'N/A') {
                communityFilterSelect.value = 'none';
            } else {
                communityFilterSelect.value = nodeCommunityStr;
            }
            currentCommunityFilter = communityFilterSelect.value;
            
            // Update the table with new filter
            updateTableView();
            
            // Show notification about filter change
            const filterDisplayName = communityFilterSelect.value === 'none' ? 
                'No Community' : `Community ${communityFilterSelect.value}`;
            showNotification(`Switched to ${filterDisplayName} to show selected node`, 'info');
        }
    }
    
    function focusNodeById(nodeId) {
        selectNodeById(nodeId);
        focusSelectedNode();
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
        const community = graphData.analysis && graphData.analysis.communities && 
            graphData.analysis.communities[selectedNode.id] !== undefined ? 
            graphData.analysis.communities[selectedNode.id] : 'N/A';
        if (communityEl) {
            communityEl.textContent = community;
            
            // Add community color indicator
            if (community !== 'N/A') {
                const communityColor = communityColorScale(community);
                communityEl.style.background = communityColor + '20';
                communityEl.style.border = `2px solid ${communityColor}`;
                communityEl.style.borderRadius = '4px';
                communityEl.style.padding = '2px 6px';
            }
        }
    }
    
    function updateStatistics() {
        if (!graphData || !graphData.stats) return;
        
        document.getElementById('stat-nodes').textContent = graphData.stats.nodeCount;
        document.getElementById('stat-links').textContent = graphData.stats.linkCount;
        document.getElementById('stat-density').textContent = graphData.stats.density.toFixed(3);
        document.getElementById('stat-avg-degree').textContent = graphData.stats.averageDegree.toFixed(1);
        document.getElementById('stat-components').textContent = graphData.stats.components || 1;
        
        // Update community count
        const communityCount = graphData.analysis && graphData.analysis.communities ? 
            Math.max(...Object.values(graphData.analysis.communities)) + 1 : 1;
        document.getElementById('stat-communities').textContent = communityCount;
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
                return { node, value, nodeId };
            })
            .filter(item => item.node)
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
        
        rankingsEl.innerHTML = `
            <div class="rankings-header">Top ${currentCentralityMeasure} Centrality</div>
            ${rankings.map((item, index) => {
                const community = graphData.analysis.communities?.[item.nodeId] ?? 'N/A';
                const communityColor = community !== 'N/A' ? communityColorScale(community) : '#ccc';
                
                return `
                    <div class="ranking-item" data-node-id="${item.nodeId}">
                        <div class="ranking-position">${index + 1}</div>
                        <div class="ranking-content">
                            <div class="ranking-title">${truncateText(item.node.content, 25)}</div>
                            <div class="ranking-value">${item.value.toFixed(3)}</div>
                            <div class="ranking-community" style="background-color: ${communityColor}20; border-left: 3px solid ${communityColor};">
                                Community ${community}
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        `;
        
        // Add click handlers to ranking items
        rankingsEl.querySelectorAll('.ranking-item').forEach(item => {
            item.addEventListener('click', () => {
                const nodeId = item.dataset.nodeId;
                selectNodeById(nodeId);
            });
        });
    }
    
    function centerViewOnNode(node) {
        if (!node.x || !node.y || currentViewMode !== 'graph') return;
        
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
        
        if (!graphData || !graphData.nodes) {
            resultsEl.innerHTML = '<div class="search-error">No graph loaded</div>';
            return;
        }
        
        if (query.length < 2) {
            resultsEl.innerHTML = '<div class="search-hint">Type at least 2 characters to search</div>';
            return;
        }
        
        searchTimeout = setTimeout(() => {
            try {
                // Search within current graph nodes
                const matchingNodes = graphData.nodes.filter(node => {
                    const content = (node.content || '').toLowerCase();
                    const content_zh = (node.content_zh || '').toLowerCase();
                    const searchTerm = query.toLowerCase();
                    
                    return content.includes(searchTerm) || content_zh.includes(searchTerm);
                });
                
                if (matchingNodes.length === 0) {
                    resultsEl.innerHTML = `<div class="search-error">No nodes found matching "${query}" in current graph</div>`;
                    return;
                }
                
                // Sort by relevance (exact matches first, then by content length)
                matchingNodes.sort((a, b) => {
                    const aContent = (a.content || '').toLowerCase();
                    const bContent = (b.content || '').toLowerCase();
                    const searchTerm = query.toLowerCase();
                    
                    // Exact matches first
                    const aExact = aContent === searchTerm ? 1 : 0;
                    const bExact = bContent === searchTerm ? 1 : 0;
                    if (aExact !== bExact) return bExact - aExact;
                    
                    // Then by content length (shorter first for more specific matches)
                    return aContent.length - bContent.length;
                });
                
                // Display search results with additional metadata
                resultsEl.innerHTML = `
                    <div class="search-results-header">
                        <span class="search-results-count">${matchingNodes.length} result${matchingNodes.length !== 1 ? 's' : ''}</span>
                        <span class="search-results-mode">in ${currentViewMode} view</span>
                    </div>
                    ${matchingNodes.map(node => {
                        // Get centrality info if available
                        const measure = `${currentCentralityMeasure}Centrality`;
                        const centrality = graphData.analysis && graphData.analysis[measure] ? 
                            graphData.analysis[measure][node.id] : null;
                        
                        // Get degree if available
                        const degree = graphData.analysis && graphData.analysis.degreeCentrality ? 
                            graphData.analysis.degreeCentrality[node.id] || 0 : 0;
                        
                        // Get community if available
                        const community = graphData.analysis && graphData.analysis.communities && 
                            graphData.analysis.communities[node.id] !== undefined ? 
                            graphData.analysis.communities[node.id] : 'N/A';
                        
                        const communityColor = community !== 'N/A' ? communityColorScale(community) : '#ccc';
                        
                        // Check if node is currently visible in table
                        const isVisibleInTable = currentViewMode === 'table' && 
                            (currentCommunityFilter === 'all' || 
                             (currentCommunityFilter === 'none' && community === 'N/A') ||
                             (currentCommunityFilter === community.toString()));
                        
                        return `
                            <div class="search-result-item" data-node-id="${node.id}" ${!isVisibleInTable ? 'data-needs-filter="true"' : ''}>
                                <div class="search-result-content">${highlightSearchTerm(node.content || 'Untitled', query)}</div>
                                ${node.content_zh ? `<div class="search-result-subtitle">${highlightSearchTerm(node.content_zh, query)}</div>` : ''}
                                <div class="search-result-meta">
                                    <span class="search-result-degree">Degree: ${degree}</span>
                                    ${centrality !== null ? `<span class="search-result-centrality">${currentCentralityMeasure}: ${centrality.toFixed(3)}</span>` : ''}
                                    <span class="search-result-community" style="background-color: ${communityColor}20; border-left: 3px solid ${communityColor};">
                                        C${community}
                                    </span>
                                    ${!isVisibleInTable ? '<span class="search-result-filter-notice">Will adjust filter</span>' : ''}
                                </div>
                            </div>
                        `;
                    }).join('')}
                `;
                
                // Add click handlers
                resultsEl.querySelectorAll('.search-result-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const nodeId = item.dataset.nodeId;
                        selectNodeById(nodeId);
                    });
                });
                
            } catch (error) {
                console.error('Error searching nodes:', error);
                resultsEl.innerHTML = '<div class="search-error">Error searching nodes</div>';
            }
        }, 300);
    }
    
    function highlightSearchTerm(text, term) {
        if (!text || !term) return text || '';
        
        // Escape special regex characters to prevent regex injection
        const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedTerm})`, 'gi');
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
    
    // Drag handlers - simplified without excessive logging
    function dragStarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }
    
    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }
    
    function dragEnded(event, d) {
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
                if (currentViewMode === 'graph') {
                    handleResize();
                }
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
    
    function handleKeyDown(e) {
        if (e.key === 'Escape' && isTableFullscreen) {
            exitTableFullscreen();
        }
    }

    function toggleTableFullscreen() {
        if (isTableFullscreen) {
            exitTableFullscreen();
        } else {
            enterTableFullscreen();
        }
    }

    function enterTableFullscreen() {
        const tableContainer = document.getElementById('metrics-table-container');
        const fullscreenBtn = document.getElementById('table-fullscreen-btn');
        const fullscreenIcon = document.getElementById('fullscreen-icon');
        const fullscreenText = document.getElementById('fullscreen-text');
        
        if (!tableContainer || !fullscreenBtn) return;
        
        // Add fullscreen class
        tableContainer.classList.add('fullscreen');
        fullscreenBtn.classList.add('active');
        
        // Update button text and icon
        fullscreenIcon.textContent = '⛷';
        fullscreenText.textContent = 'Exit Fullscreen';
        
        // Create close button
        const closeBtn = document.createElement('button');
        closeBtn.id = 'fullscreen-close-btn';
        closeBtn.className = 'fullscreen-close-btn';
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', exitTableFullscreen);
        
        // Add close button to table container
        tableContainer.appendChild(closeBtn);
        
        // Set fullscreen state
        isTableFullscreen = true;
        
        // Hide body scrollbar
        document.body.style.overflow = 'hidden';
        
        showNotification('Table in fullscreen mode. Press ESC to exit.', 'info');
    }

    function exitTableFullscreen() {
        const tableContainer = document.getElementById('metrics-table-container');
        const fullscreenBtn = document.getElementById('table-fullscreen-btn');
        const fullscreenIcon = document.getElementById('fullscreen-icon');
        const fullscreenText = document.getElementById('fullscreen-text');
        const closeBtn = document.getElementById('fullscreen-close-btn');
        
        if (!tableContainer || !fullscreenBtn) return;
        
        // Remove fullscreen class
        tableContainer.classList.remove('fullscreen');
        fullscreenBtn.classList.remove('active');
        
        // Update button text and icon
        fullscreenIcon.textContent = '⛶';
        fullscreenText.textContent = 'Fullscreen';
        
        // Remove close button
        if (closeBtn) {
            closeBtn.remove();
        }
        
        // Reset fullscreen state
        isTableFullscreen = false;
        
        // Restore body scrollbar
        document.body.style.overflow = '';
        
        showNotification('Exited fullscreen mode', 'info');
    }
    
    function scrollToTableRow(row) {
        const tableContainer = document.getElementById('metrics-table-container');
        if (!tableContainer || !row) return;
        
        // Calculate the position of the row relative to the table container
        const tableRect = tableContainer.getBoundingClientRect();
        const rowRect = row.getBoundingClientRect();
        
        // Check if row is already visible
        const isVisible = rowRect.top >= tableRect.top && 
                     rowRect.bottom <= tableRect.bottom;
        
        if (!isVisible) {
            // Calculate scroll position to center the row
            const containerHeight = tableContainer.clientHeight;
            const rowHeight = row.offsetHeight;
            const scrollOffset = row.offsetTop - (containerHeight / 2) + (rowHeight / 2);
            
            // Smooth scroll to the row
            tableContainer.scrollTo({
                top: scrollOffset,
                behavior: 'smooth'
            });
        }
        
        // Add a temporary highlight effect
        row.classList.add('highlight-flash');
        setTimeout(() => {
            row.classList.remove('highlight-flash');
        }, 2000);
    }
    
    // Public API
    return {
        initialize,
        show,
        hide,
        isVisible,
        selectNode,
        selectNodeById,
        focusNodeById,
        centerViewOnNode,
        calculateCentralityMeasure,
        calculateAndUpdateTable,
        handleCommunityFilterChange,
        isInitialized: () => isInitialized
    };
})();

window.GlobalGraphManager = GlobalGraphManager;