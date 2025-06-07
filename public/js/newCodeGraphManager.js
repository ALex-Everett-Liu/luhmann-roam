/**
 * New Code Graph Manager - Clean, Simple Code Analysis
 * Replaces the complex old codeGraphManager.js with a focused, simple approach
 */
const NewCodeGraphManager = (function() {
    // Private variables
    let isVisible = false;
    let isInitialized = false;
    let currentVisualizationData = null;
    let container = null;
    let currentView = 'cards'; // 'cards' or 'graph'
    let svg = null;
    let simulation = null;

    /**
     * Initialize the New Code Graph Manager
     */
    function initialize() {
        if (isInitialized) return;
        
        console.log('Initializing NewCodeGraphManager...');
        createContainer();
        initializeGraphVisualization();
        isInitialized = true;
        console.log('NewCodeGraphManager initialized successfully');
    }

    /**
     * Create the modal container
     */
    function createContainer() {
        container = document.createElement('div');
        container.className = 'new-code-graph-modal';
        container.style.display = 'none';
        
        container.innerHTML = `
            <div class="new-code-graph-content">
                <div class="new-code-graph-header">
                    <h2>Simple Code Graph</h2>
                    <button class="close-btn" onclick="NewCodeGraphManager.hide()">&times;</button>
                </div>
                
                <div class="new-code-graph-controls">
                    <button class="btn btn-primary" onclick="NewCodeGraphManager.initializeDatabase()">Initialize Database</button>
                    <button class="btn btn-success" onclick="NewCodeGraphManager.analyzeDcimExample()">Analyze DCIM Example</button>
                    <button class="btn btn-secondary" onclick="NewCodeGraphManager.loadProjects()">Load Projects</button>
                    <button class="btn btn-secondary" onclick="NewCodeGraphManager.clearVisualization()">Clear</button>
                </div>
                
                <div class="new-code-graph-status" id="ncg-status"></div>
                
                <div class="view-toggles">
                    <button class="view-toggle-btn active" data-view="cards" onclick="NewCodeGraphManager.switchView('cards')">Card View</button>
                    <button class="view-toggle-btn" data-view="graph" onclick="NewCodeGraphManager.switchView('graph')">Graph View</button>
                </div>
                
                <div class="new-code-graph-main">
                    <!-- Card View -->
                    <div class="view-container" id="ncg-cards-view">
                        <div class="new-code-graph-visualization">
                            <h3>Code Elements</h3>
                            <div class="graph-container" id="ncg-graph-container">
                                <p class="placeholder-text">Click "Analyze DCIM Example" to see the code graph visualization</p>
                            </div>
                            
                            <div class="dependencies-container" id="ncg-dependencies-container" style="display: none;">
                                <h4>Dependencies & Data Flow</h4>
                                <div class="dependencies-list" id="ncg-dependencies-list"></div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Graph View -->
                    <div class="view-container" id="ncg-graph-view" style="display: none;">
                        <div class="graph-visualization">
                            <h3>Interactive Graph</h3>
                            <div class="graph-controls">
                                <button class="btn btn-sm" onclick="NewCodeGraphManager.resetGraphLayout()">Reset Layout</button>
                                <button class="btn btn-sm" onclick="NewCodeGraphManager.fitGraphToView()">Fit to View</button>
                                <label>
                                    <input type="range" id="zoom-slider" min="0.1" max="3" step="0.1" value="1" onchange="NewCodeGraphManager.handleZoom(this.value)">
                                    Zoom
                                </label>
                            </div>
                            <div class="graph-svg-container" id="ncg-graph-svg-container">
                                <p class="placeholder-text">Switch to graph view to see the interactive visualization</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="projects-container" id="ncg-projects-container" style="display: none;">
                        <h3>Projects</h3>
                        <div class="projects-list" id="ncg-projects-list"></div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(container);
    }

    /**
     * Initialize D3.js graph visualization
     */
    function initializeGraphVisualization() {
        // We'll initialize this when switching to graph view to avoid D3 loading issues
    }

    /**
     * Switch between card and graph views
     */
    function switchView(viewType) {
        currentView = viewType;
        
        // Update toggle buttons
        document.querySelectorAll('.view-toggle-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${viewType}"]`).classList.add('active');
        
        // Show/hide views
        document.getElementById('ncg-cards-view').style.display = viewType === 'cards' ? 'block' : 'none';
        document.getElementById('ncg-graph-view').style.display = viewType === 'graph' ? 'block' : 'none';
        
        // If switching to graph view and we have data, render the graph
        if (viewType === 'graph' && currentVisualizationData) {
            setTimeout(() => renderGraph(currentVisualizationData), 100);
        }
        
        console.log(`Switched to ${viewType} view`);
    }

    /**
     * Render the D3.js graph visualization with interactive tooltips
     */
    function renderGraph(data) {
        const container = document.getElementById('ncg-graph-svg-container');
        if (!container) return;
        
        // Clear previous graph
        container.innerHTML = '';
        
        if (!data.nodes || data.nodes.length === 0) {
            container.innerHTML = '<p class="placeholder-text">No data to visualize</p>';
            return;
        }
        
        const width = container.clientWidth || 800;
        const height = 600;
        
        // Create SVG
        svg = d3.select(container)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .style('border', '1px solid #e1e5e9')
            .style('border-radius', '8px');
        
        // Create zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.1, 3])
            .on('zoom', function(event) {
                g.attr('transform', event.transform);
                // Update zoom slider
                document.getElementById('zoom-slider').value = event.transform.k;
            });
        
        svg.call(zoom);
        
        // Create main group for zooming/panning
        const g = svg.append('g');
        
        // Create arrow markers for edges
        svg.append('defs').selectAll('marker')
            .data(['arrow'])
            .enter().append('marker')
            .attr('id', 'arrow')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 20)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', '#666');
        
        // Prepare data for D3
        const nodes = data.nodes.map(d => ({
            ...d,
            id: d.id,
            name: d.label,
            group: d.type === 'function' ? 1 : 2
        }));
        
        const links = data.edges.map(d => ({
            source: d.source,
            target: d.target,
            relationship: d.relationship,
            sourceType: d.sourceType,
            targetType: d.targetType,
            originalEdge: d // Store original edge data for tooltips
        }));
        
        // Create force simulation
        simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id).distance(100))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(d => {
                // Use consistent radius that matches visual appearance + padding
                return d.type === 'function' ? 25 : 20;
            }));
        
        // Create links (edges)
        const link = g.append('g')
            .attr('class', 'links')
            .selectAll('line')
            .data(links)
            .enter().append('line')
            .attr('stroke', d => getEdgeColor(d.relationship))
            .attr('stroke-opacity', 0.8)
            .attr('stroke-width', 2)
            .attr('marker-end', 'url(#arrow)')
            .style('cursor', 'pointer')
            .on('click', function(event, d) {
                event.stopPropagation();
                // Find the source and target nodes for tooltip
                const sourceNode = data.nodes.find(n => n.id === d.source.id);
                const targetNode = data.nodes.find(n => n.id === d.target.id);
                showDetailedEdgeTooltip(d.originalEdge, sourceNode, targetNode);
            })
            .on('mouseover', function(event, d) {
                d3.select(this)
                    .attr('stroke-width', 4)
                    .attr('stroke-opacity', 1);
            })
            .on('mouseout', function(event, d) {
                d3.select(this)
                    .attr('stroke-width', 2)
                    .attr('stroke-opacity', 0.8);
            });
        
        // Create link labels
        const linkLabel = g.append('g')
            .attr('class', 'link-labels')
            .selectAll('text')
            .data(links)
            .enter().append('text')
            .attr('text-anchor', 'middle')
            .attr('font-size', '10px')
            .attr('fill', '#666')
            .attr('pointer-events', 'none')
            .text(d => getRelationshipDescription(d.relationship));
        
        // Create nodes (vertices) - FIXED HOVER BEHAVIOR
        const node = g.append('g')
            .attr('class', 'nodes')
            .selectAll('g')
            .data(nodes)
            .enter().append('g')
            .attr('class', 'node')
            .style('cursor', 'pointer')
            .call(d3.drag()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended))
            .on('click', function(event, d) {
                event.stopPropagation();
                showDetailedTooltip(d);
            })
            .on('mouseover', function(event, d) {
                // Only change visual properties that don't affect positioning
                d3.select(this).select('circle')
                    .attr('stroke-width', 4)
                    .attr('stroke', '#ff6b6b')  // Add highlight color instead of radius change
                    .style('filter', 'drop-shadow(0 0 8px rgba(255, 107, 107, 0.4))');
            })
            .on('mouseout', function(event, d) {
                // Reset to original appearance
                d3.select(this).select('circle')
                    .attr('stroke-width', 2)
                    .attr('stroke', '#fff')  // Reset to white stroke
                    .style('filter', null);
            });
        
        // Add circles for nodes
        node.append('circle')
            .attr('r', d => d.type === 'function' ? 20 : 15)
            .attr('fill', d => getNodeColor(d))
            .attr('stroke', '#fff')
            .attr('stroke-width', 2);
        
        // Add labels for nodes
        node.append('text')
            .attr('dy', -25)
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .attr('font-weight', 'bold')
            .attr('fill', '#24292e')
            .attr('pointer-events', 'none')
            .text(d => d.name);
        
        // Add type labels
        node.append('text')
            .attr('dy', 4)
            .attr('text-anchor', 'middle')
            .attr('font-size', '8px')
            .attr('fill', '#666')
            .attr('pointer-events', 'none')
            .text(d => d.type);
        
        // Add scope indicators for variables
        node.filter(d => d.type === 'variable' && d.scope)
            .append('text')
            .attr('dy', 15)
            .attr('text-anchor', 'middle')
            .attr('font-size', '7px')
            .attr('fill', '#999')
            .attr('pointer-events', 'none')
            .text(d => getScopeIcon(d.scope));
        
        // Update positions on tick
        simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
            
            linkLabel
                .attr('x', d => (d.source.x + d.target.x) / 2)
                .attr('y', d => (d.source.y + d.target.y) / 2);
            
            node
                .attr('transform', d => `translate(${d.x},${d.y})`);
        });
        
        // Drag functions
        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }
        
        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }
        
        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }
        
        // Store references for manipulation
        window.currentGraphElements = { svg, simulation, g, zoom };
    }

    /**
     * Reset graph layout
     */
    function resetGraphLayout() {
        if (simulation) {
            simulation.alpha(1).restart();
        }
    }

    /**
     * Fit graph to view
     */
    function fitGraphToView() {
        if (!svg || !window.currentGraphElements) return;
        
        const { g, zoom } = window.currentGraphElements;
        const bounds = g.node().getBBox();
        const container = document.getElementById('ncg-graph-svg-container');
        const width = container.clientWidth || 800;
        const height = 600;
        
        const scale = Math.min(width / bounds.width, height / bounds.height) * 0.8;
        const translate = [
            width / 2 - scale * (bounds.x + bounds.width / 2),
            height / 2 - scale * (bounds.y + bounds.height / 2)
        ];
        
        svg.transition().duration(750).call(
            zoom.transform,
            d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
        );
    }

    /**
     * Handle zoom slider
     */
    function handleZoom(scale) {
        if (!svg || !window.currentGraphElements) return;
        
        const { zoom } = window.currentGraphElements;
        const container = document.getElementById('ncg-graph-svg-container');
        const width = container.clientWidth || 800;
        const height = 600;
        
        svg.transition().duration(300).call(
            zoom.transform,
            d3.zoomIdentity.translate(width / 2, height / 2).scale(scale).translate(-width / 2, -height / 2)
        );
    }

    /**
     * Show the code graph manager
     */
    function show() {
        if (!isInitialized) initialize();
        
        container.style.display = 'flex';
        isVisible = true;
        console.log('NewCodeGraphManager shown');
    }

    /**
     * Hide the code graph manager
     */
    function hide() {
        if (container) {
            container.style.display = 'none';
        }
        isVisible = false;
        console.log('NewCodeGraphManager hidden');
    }

    /**
     * Check if the manager is visible
     */
    function getIsVisible() {
        return isVisible;
    }

    /**
     * Show status message
     */
    function showStatus(message, type = 'success') {
        const statusDiv = document.getElementById('ncg-status');
        if (statusDiv) {
            statusDiv.innerHTML = `<div class="status ${type}">${message}</div>`;
            setTimeout(() => {
                statusDiv.innerHTML = '';
            }, 5000);
        }
    }

    /**
     * Initialize the database
     */
    async function initializeDatabase() {
        try {
            const response = await fetch('/api/new-code-graph/initialize', {
                method: 'POST'
            });
            const result = await response.json();
            
            if (result.success) {
                showStatus('Database initialized successfully!');
            } else {
                showStatus('Error initializing database: ' + result.error, 'error');
            }
        } catch (error) {
            showStatus('Error: ' + error.message, 'error');
        }
    }

    /**
     * Analyze the DCIM controller example
     */
    async function analyzeDcimExample() {
        try {
            showStatus('Analyzing DCIM controller example...', 'info');
            
            const response = await fetch('/api/new-code-graph/analyze-dcim-example', {
                method: 'POST'
            });
            const result = await response.json();
            
            if (result.success) {
                currentVisualizationData = result.visualization;
                renderVisualization(result.visualization);
                
                // If currently on graph view, render the graph
                if (currentView === 'graph') {
                    setTimeout(() => renderGraph(result.visualization), 100);
                }
                
                showStatus('DCIM example analyzed successfully! Check the visualization below.');
            } else {
                showStatus('Error analyzing DCIM example: ' + result.error, 'error');
            }
        } catch (error) {
            showStatus('Error: ' + error.message, 'error');
        }
    }

    /**
     * Load all projects
     */
    async function loadProjects() {
        try {
            const response = await fetch('/api/new-code-graph/projects');
            const projects = await response.json();
            
            const projectsContainer = document.getElementById('ncg-projects-container');
            const projectsList = document.getElementById('ncg-projects-list');
            
            if (projectsList) {
                projectsList.innerHTML = '';
                
                if (projects.length === 0) {
                    projectsList.innerHTML = '<p class="no-data">No projects found.</p>';
                } else {
                    projects.forEach(project => {
                        const projectDiv = document.createElement('div');
                        projectDiv.className = 'project-item';
                        projectDiv.innerHTML = `
                            <div class="project-name">${project.name}</div>
                            <div class="project-path">${project.path}</div>
                            ${project.description ? `<div class="project-description">${project.description}</div>` : ''}
                            <div class="project-timestamp">
                                Created: ${new Date(project.created_at * 1000).toLocaleString()}
                            </div>
                        `;
                        projectsList.appendChild(projectDiv);
                    });
                }
                
                if (projectsContainer) {
                    projectsContainer.style.display = 'block';
                }
                showStatus(`Loaded ${projects.length} projects`);
            }
        } catch (error) {
            showStatus('Error loading projects: ' + error.message, 'error');
        }
    }

    /**
     * Enhanced visualization with hierarchical relationships
     */
    function renderVisualization(data) {
        const graphContainer = document.getElementById('ncg-graph-container');
        const depsContainer = document.getElementById('ncg-dependencies-container');
        const depsList = document.getElementById('ncg-dependencies-list');
        
        if (!graphContainer || !depsContainer || !depsList) return;
        
        // Clear previous content
        graphContainer.innerHTML = '';
        depsList.innerHTML = '';
        
        // Group nodes by type and scope
        const nodeGroups = {
            functions: data.nodes.filter(n => n.type === 'function'),
            parameters: data.nodes.filter(n => n.type === 'variable' && n.scope === 'parameter'),
            localVars: data.nodes.filter(n => n.type === 'variable' && n.scope === 'local'),
            literals: data.nodes.filter(n => n.type === 'variable' && n.scope === 'literal'),
            builtins: data.nodes.filter(n => n.file === 'built-in')
        };
        
        // Render function container
        const functionContainer = document.createElement('div');
        functionContainer.className = 'function-container';
        functionContainer.innerHTML = '<h4>Functions</h4>';
        
        nodeGroups.functions.forEach(node => {
            const nodeDiv = createNodeElement(node);
            functionContainer.appendChild(nodeDiv);
            
            // Add parameters container
            const paramsContainer = document.createElement('div');
            paramsContainer.className = 'parameters-container';
            paramsContainer.innerHTML = '<h5>Parameters</h5>';
            
            nodeGroups.parameters.forEach(param => {
                const paramDiv = createNodeElement(param);
                paramDiv.classList.add('nested-node');
                paramsContainer.appendChild(paramDiv);
            });
            
            functionContainer.appendChild(paramsContainer);
            
            // Add local variables container
            const varsContainer = document.createElement('div');
            varsContainer.className = 'variables-container';
            varsContainer.innerHTML = '<h5>Local Variables</h5>';
            
            nodeGroups.localVars.forEach(variable => {
                const varDiv = createNodeElement(variable);
                varDiv.classList.add('nested-node');
                varsContainer.appendChild(varDiv);
            });
            
            functionContainer.appendChild(varsContainer);
        });
        
        graphContainer.appendChild(functionContainer);
        
        // Render built-ins and literals separately
        const builtinsContainer = document.createElement('div');
        builtinsContainer.className = 'builtins-container';
        builtinsContainer.innerHTML = '<h4>Built-in Methods & Literals</h4>';
        
        [...nodeGroups.builtins, ...nodeGroups.literals].forEach(node => {
            const nodeDiv = createNodeElement(node);
            builtinsContainer.appendChild(nodeDiv);
        });
        
        graphContainer.appendChild(builtinsContainer);
        
        // Enhanced dependency rendering with grouping for new relationship types
        if (data.edges && data.edges.length > 0) {
            const dependencyGroups = {
                containment: data.edges.filter(e => e.relationship === 'contains'),
                dataFlow: data.edges.filter(e => ['passes_to', 'chains_to', 'assigns_to', 'calls_method_on'].includes(e.relationship)),
                legacy: data.edges.filter(e => ['uses_parameter', 'transforms_via', 'chains_from', 'validates_against', 'includes_check'].includes(e.relationship)),
                other: data.edges.filter(e => !['contains', 'passes_to', 'chains_to', 'assigns_to', 'calls_method_on', 'uses_parameter', 'transforms_via', 'chains_from', 'validates_against', 'includes_check'].includes(e.relationship))
            };
            
            // Render containment relationships
            if (dependencyGroups.containment.length > 0) {
                const containmentSection = document.createElement('div');
                containmentSection.innerHTML = '<h5>Scope Relationships</h5>';
                dependencyGroups.containment.forEach(edge => {
                    const depDiv = createDependencyElement(edge, data.nodes);
                    containmentSection.appendChild(depDiv);
                });
                depsList.appendChild(containmentSection);
            }
            
            // Render execution flow relationships
            if (dependencyGroups.dataFlow.length > 0) {
                const dataFlowSection = document.createElement('div');
                dataFlowSection.innerHTML = '<h5>Execution Flow</h5>';
                dependencyGroups.dataFlow.forEach(edge => {
                    const depDiv = createDependencyElement(edge, data.nodes);
                    dataFlowSection.appendChild(depDiv);
                });
                depsList.appendChild(dataFlowSection);
            }
            
            // Render legacy relationships (if any)
            if (dependencyGroups.legacy.length > 0) {
                const legacySection = document.createElement('div');
                legacySection.innerHTML = '<h5>Legacy Relationships</h5>';
                dependencyGroups.legacy.forEach(edge => {
                    const depDiv = createDependencyElement(edge, data.nodes);
                    legacySection.appendChild(depDiv);
                });
                depsList.appendChild(legacySection);
            }
            
            // Render other relationships
            if (dependencyGroups.other.length > 0) {
                const otherSection = document.createElement('div');
                otherSection.innerHTML = '<h5>Other Relationships</h5>';
                dependencyGroups.other.forEach(edge => {
                    const depDiv = createDependencyElement(edge, data.nodes);
                    otherSection.appendChild(depDiv);
                });
                depsList.appendChild(otherSection);
            }
            
            depsContainer.style.display = 'block';
        }
    }

    function createNodeElement(node) {
        const nodeDiv = document.createElement('div');
        nodeDiv.className = `code-node ${node.type}`;
        
        // Add special styling for different scopes
        if (node.scope) {
            nodeDiv.classList.add(`scope-${node.scope}`);
        }
        
        // Create detailed properties for tooltip
        const properties = getNodeProperties(node);
        
        let nodeContent = `
            <div class="node-title">${node.label}</div>
            <div class="node-meta">Type: ${node.type}</div>
            <div class="node-meta">File: ${node.file}:${node.line}</div>
        `;
        
        if (node.type === 'function') {
            if (node.isAsync) {
                nodeContent += `<div class="node-meta">⚡ Async Function</div>`;
            }
            if (node.parameters && node.parameters.length > 0) {
                nodeContent += `<div class="node-meta">Parameters: ${node.parameters.length}</div>`;
            }
            if (node.file === 'built-in') {
                nodeContent += `<div class="node-meta">🔧 Built-in Method</div>`;
            } else if (node.file.includes('Node.js')) {
                nodeContent += `<div class="node-meta">📦 Node.js Module</div>`;
            }
        } else if (node.type === 'variable') {
            nodeContent += `<div class="node-meta">Scope: ${node.scope}</div>`;
            
            // Add scope-specific icons and info
            if (node.scope === 'parameter') {
                nodeContent += `<div class="node-meta">📥 Function Parameter</div>`;
                if (node.value && node.value.includes('default')) {
                    nodeContent += `<div class="node-meta">🎯 Has Default Value</div>`;
                }
            } else if (node.scope === 'local') {
                nodeContent += `<div class="node-meta">🔐 Local Variable</div>`;
                if (node.value && node.value.includes('const')) {
                    nodeContent += `<div class="node-meta">🔒 Immutable (const)</div>`;
                }
            } else if (node.scope === 'literal') {
                nodeContent += `<div class="node-meta">📝 Literal Value</div>`;
                if (node.value && node.value.includes('[')) {
                    nodeContent += `<div class="node-meta">📋 Array Literal</div>`;
                }
            }
            
            if (node.value) {
                nodeContent += `<div class="node-value">${truncateValue(node.value, 50)}</div>`;
            }
        }
        
        // Add tooltip with detailed properties
        nodeDiv.setAttribute('title', properties.join('\n'));
        nodeDiv.setAttribute('data-tooltip', JSON.stringify({
            title: node.label,
            type: node.type,
            scope: node.scope,
            file: node.file,
            line: node.line,
            value: node.value,
            properties: properties
        }));
        
        nodeDiv.innerHTML = nodeContent;
        
        // Add click handler for detailed tooltip
        nodeDiv.addEventListener('click', () => showDetailedTooltip(node));
        
        return nodeDiv;
    }

    function createDependencyElement(edge, nodes) {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        
        if (sourceNode && targetNode) {
            const depDiv = document.createElement('div');
            depDiv.className = 'dependency-item';
            depDiv.setAttribute('data-relationship', edge.relationship);
            
            const relationshipText = getRelationshipDescription(edge.relationship);
            const edgeProperties = getEdgeProperties(edge, sourceNode, targetNode);
            
            depDiv.innerHTML = `
                <strong>${sourceNode.label}</strong>
                <span class="dependency-arrow" title="${edgeProperties.join('\n')}">${relationshipText}</span>
                <strong>${targetNode.label}</strong>
            `;
            
            // Add click handler for detailed edge tooltip
            depDiv.addEventListener('click', () => showDetailedEdgeTooltip(edge, sourceNode, targetNode));
            
            return depDiv;
        }
        return document.createElement('div');
    }

    // Helper functions for enhanced tooltips
    function getNodeProperties(node) {
        const properties = [];
        
        properties.push(`Name: ${node.label}`);
        properties.push(`Type: ${node.type}`);
        properties.push(`Location: ${node.file}:${node.line}`);
        
        if (node.scope) {
            properties.push(`Scope: ${node.scope}`);
        }
        
        if (node.type === 'function') {
            if (node.isAsync) {
                properties.push('🔄 Asynchronous function');
            }
            if (node.parameters && node.parameters.length > 0) {
                properties.push(`Parameters: ${node.parameters.map(p => p.name).join(', ')}`);
            }
            if (node.file === 'built-in') {
                properties.push('🔧 JavaScript built-in method');
            } else if (node.file.includes('Node.js')) {
                properties.push('📦 Node.js standard library');
            }
        }
        
        if (node.type === 'variable') {
            if (node.scope === 'parameter') {
                properties.push('📥 Input parameter to function');
                if (node.value && node.value.includes('default')) {
                    const defaultMatch = node.value.match(/default[:\s]+(\d+)/);
                    if (defaultMatch) {
                        properties.push(`🎯 Default value: ${defaultMatch[1]}`);
                    }
                }
            } else if (node.scope === 'local') {
                properties.push('🔐 Local variable within function');
                if (node.value && node.value.includes('const')) {
                    properties.push('🔒 Immutable constant declaration');
                }
            } else if (node.scope === 'literal') {
                properties.push('📝 Literal value in code');
                if (node.value && node.value.includes('[')) {
                    const arrayMatch = node.value.match(/\[(.*)\]/);
                    if (arrayMatch) {
                        const elements = arrayMatch[1].split(',').length;
                        properties.push(`📋 Array with ${elements} elements`);
                    }
                }
            }
            
            if (node.value) {
                properties.push(`Value: ${node.value}`);
            }
        }
        
        return properties;
    }

    function getEdgeProperties(edge, sourceNode, targetNode) {
        const properties = [];
        
        properties.push(`Relationship: ${getRelationshipDescription(edge.relationship)}`);
        properties.push(`From: ${sourceNode.label} (${sourceNode.type})`);
        properties.push(`To: ${targetNode.label} (${targetNode.type})`);
        
        // Add relationship-specific details
        switch (edge.relationship) {
            case 'passes_to':
                properties.push('🔄 Data flows as input parameter');
                break;
            case 'chains_to':
                properties.push('🔗 Method chaining - result becomes input');
                break;
            case 'assigns_to':
                properties.push('💾 Final result stored in variable');
                break;
            case 'calls_method_on':
                properties.push('📞 Method invoked on this object');
                break;
            case 'contains':
                properties.push('📦 Scope containment relationship');
                break;
            case 'transforms_via':
                properties.push('🔄 Data transformation through function');
                break;
            case 'validates_against':
                properties.push('✅ Validation check performed');
                break;
        }
        
        return properties;
    }

    function showDetailedTooltip(node) {
        // Remove any existing tooltips
        d3.selectAll('.detailed-tooltip').remove();
        
        const tooltip = document.createElement('div');
        tooltip.className = 'detailed-tooltip';
        
        const properties = getNodeProperties(node);
        
        tooltip.innerHTML = `
            <div class="tooltip-header">
                <h4>${node.label || node.name}</h4>
                <button class="tooltip-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
            <div class="tooltip-content">
                <div class="tooltip-section">
                    <h5>Basic Information</h5>
                    ${properties.slice(0, 4).map(prop => `<div class="tooltip-item">${prop}</div>`).join('')}
                </div>
                ${properties.length > 4 ? `
                <div class="tooltip-section">
                    <h5>Additional Details</h5>
                    ${properties.slice(4).map(prop => `<div class="tooltip-item">${prop}</div>`).join('')}
                </div>
                ` : ''}
            </div>
        `;
        
        document.body.appendChild(tooltip);
        
        // Position tooltip
        tooltip.style.position = 'fixed';
        tooltip.style.top = '50%';
        tooltip.style.left = '50%';
        tooltip.style.transform = 'translate(-50%, -50%)';
        tooltip.style.zIndex = '10001';
        
        // Add animation
        tooltip.style.opacity = '0';
        tooltip.style.transform = 'translate(-50%, -50%) scale(0.8)';
        setTimeout(() => {
            tooltip.style.transition = 'all 0.3s ease';
            tooltip.style.opacity = '1';
            tooltip.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 10);
    }

    function showDetailedEdgeTooltip(edge, sourceNode, targetNode) {
        // Remove any existing tooltips
        d3.selectAll('.detailed-tooltip').remove();
        
        const tooltip = document.createElement('div');
        tooltip.className = 'detailed-tooltip edge-tooltip';
        
        const properties = getEdgeProperties(edge, sourceNode, targetNode);
        
        tooltip.innerHTML = `
            <div class="tooltip-header">
                <h4>Relationship: ${getRelationshipDescription(edge.relationship)}</h4>
                <button class="tooltip-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
            <div class="tooltip-content">
                <div class="tooltip-section">
                    <h5>Connection Details</h5>
                    <div class="tooltip-item relationship-flow">
                        <strong>${sourceNode.label}</strong>
                        <span class="flow-arrow">→ ${getRelationshipDescription(edge.relationship)} →</span>
                        <strong>${targetNode.label}</strong>
                    </div>
                </div>
                <div class="tooltip-section">
                    <h5>Additional Information</h5>
                    ${properties.slice(3).map(prop => `<div class="tooltip-item">${prop}</div>`).join('')}
                </div>
            </div>
        `;
        
        document.body.appendChild(tooltip);
        
        // Position tooltip
        tooltip.style.position = 'fixed';
        tooltip.style.top = '50%';
        tooltip.style.left = '50%';
        tooltip.style.transform = 'translate(-50%, -50%)';
        tooltip.style.zIndex = '10001';
        
        // Add animation
        tooltip.style.opacity = '0';
        tooltip.style.transform = 'translate(-50%, -50%) scale(0.8)';
        setTimeout(() => {
            tooltip.style.transition = 'all 0.3s ease';
            tooltip.style.opacity = '1';
            tooltip.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 10);
    }

    function truncateValue(value, maxLength) {
        if (!value) return '';
        if (value.length <= maxLength) return value;
        return value.substring(0, maxLength) + '...';
    }

    // Update the relationship descriptions
    function getRelationshipDescription(relationshipType) {
        const descriptions = {
            'derives_from': 'derives from',
            'extracts_from': 'extracts from', 
            'transforms_via': 'transforms via',
            'computes_from': 'computes from',
            'assigns_from': 'assigns from',
            'passes_to': 'passes to',
            'chains_to': 'chains to',
            'assigns_to': 'assigns to',
            'calls_method_on': 'calls method on',
            'validates_against': 'validates against',
            'filters_by': 'filters by',
            'checks': 'checks',
            'compares_with': 'compares with',
            'includes_check': 'checks inclusion in',
            'calls': 'calls',
            'returns_to': 'returns to',
            'invokes': 'invokes',
            'uses_parameter': 'uses parameter',
            'contains': 'contains',
            'defined_in': 'defined in',
            'scoped_to': 'scoped to',
            'conditions_on': 'conditions on',
            'branches_on': 'branches on',
            'iterates_over': 'iterates over',
            'uses': 'uses'
        };
        
        return descriptions[relationshipType] || relationshipType;
    }

    // Helper functions for enhanced graph visualization
    function getNodeColor(node) {
        if (node.type === 'function') {
            if (node.file === 'built-in') {
                return '#6f42c1'; // Purple for built-ins
            } else if (node.file.includes('Node.js')) {
                return '#28a745'; // Green for Node.js modules
            }
            return '#1976d2'; // Blue for custom functions
        } else if (node.type === 'variable') {
            switch (node.scope) {
                case 'parameter':
                    return '#28a745'; // Green for parameters
                case 'local':
                    return '#7b1fa2'; // Purple for local vars
                case 'literal':
                    return '#fd7e14'; // Orange for literals
                default:
                    return '#6c757d'; // Gray for others
            }
        }
        return '#666666';
    }

    function getEdgeColor(relationship) {
        const colorMap = {
            'passes_to': '#28a745',
            'chains_to': '#17a2b8',
            'assigns_to': '#6f42c1',
            'calls_method_on': '#e83e8c',
            'contains': '#6c757d',
            'transforms_via': '#6f42c1',
            'validates_against': '#fd7e14',
            'extracts_from': '#007bff',
            'computes_from': '#20c997'
        };
        return colorMap[relationship] || '#999';
    }

    function getScopeIcon(scope) {
        const icons = {
            'parameter': '📥',
            'local': '🔐',
            'literal': '📝',
            'global': '🌐'
        };
        return icons[scope] || '';
    }

    /**
     * Clear the visualization
     */
    function clearVisualization() {
        const graphContainer = document.getElementById('ncg-graph-container');
        const depsContainer = document.getElementById('ncg-dependencies-container');
        const projectsContainer = document.getElementById('ncg-projects-container');
        const graphSvgContainer = document.getElementById('ncg-graph-svg-container');
        
        if (graphContainer) {
            graphContainer.innerHTML = '<p class="placeholder-text">Click "Analyze DCIM Example" to see the code graph visualization</p>';
        }
        if (depsContainer) {
            depsContainer.style.display = 'none';
        }
        if (projectsContainer) {
            projectsContainer.style.display = 'none';
        }
        if (graphSvgContainer) {
            graphSvgContainer.innerHTML = '<p class="placeholder-text">Switch to graph view to see the interactive visualization</p>';
        }
        
        currentVisualizationData = null;
        simulation = null;
        svg = null;
        showStatus('Visualization cleared');
    }

    // Public API
    return {
        initialize,
        show,
        hide,
        isVisible: getIsVisible,
        initializeDatabase,
        analyzeDcimExample,
        loadProjects,
        clearVisualization,
        switchView,
        resetGraphLayout,
        fitGraphToView,
        handleZoom
    };
})();

// Make it available globally
window.NewCodeGraphManager = NewCodeGraphManager;