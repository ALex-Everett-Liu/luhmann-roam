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

    /**
     * Initialize the New Code Graph Manager
     */
    function initialize() {
        if (isInitialized) return;
        
        console.log('Initializing NewCodeGraphManager...');
        createContainer();
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
                
                <div class="new-code-graph-main">
                    <div class="new-code-graph-visualization">
                        <h3>Code Graph Visualization</h3>
                        <div class="graph-container" id="ncg-graph-container">
                            <p class="placeholder-text">Click "Analyze DCIM Example" to see the code graph visualization</p>
                        </div>
                        
                        <div class="dependencies-container" id="ncg-dependencies-container" style="display: none;">
                            <h4>Dependencies & Data Flow</h4>
                            <div class="dependencies-list" id="ncg-dependencies-list"></div>
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
     * Render the visualization
     */
    function renderVisualization(data) {
        const graphContainer = document.getElementById('ncg-graph-container');
        const depsContainer = document.getElementById('ncg-dependencies-container');
        const depsList = document.getElementById('ncg-dependencies-list');
        
        if (!graphContainer || !depsContainer || !depsList) return;
        
        // Clear previous content
        graphContainer.innerHTML = '';
        depsList.innerHTML = '';
        
        // Render nodes
        data.nodes.forEach(node => {
            const nodeDiv = document.createElement('div');
            nodeDiv.className = `code-node ${node.type}`;
            
            let nodeContent = `
                <div class="node-title">${node.label}</div>
                <div class="node-meta">Type: ${node.type}</div>
                <div class="node-meta">File: ${node.file}:${node.line}</div>
            `;
            
            if (node.type === 'function') {
                if (node.isAsync) {
                    nodeContent += `<div class="node-meta">Async: true</div>`;
                }
                if (node.parameters && node.parameters.length > 0) {
                    nodeContent += `<div class="node-meta">Parameters: ${node.parameters.length}</div>`;
                }
            } else if (node.type === 'variable') {
                nodeContent += `<div class="node-meta">Scope: ${node.scope}</div>`;
                if (node.value) {
                    nodeContent += `<div class="node-value">${node.value}</div>`;
                }
            }
            
            nodeDiv.innerHTML = nodeContent;
            graphContainer.appendChild(nodeDiv);
        });
        
        // Render dependencies
        if (data.edges && data.edges.length > 0) {
            data.edges.forEach(edge => {
                const sourceNode = data.nodes.find(n => n.id === edge.source);
                const targetNode = data.nodes.find(n => n.id === edge.target);
                
                if (sourceNode && targetNode) {
                    const depDiv = document.createElement('div');
                    depDiv.className = 'dependency-item';
                    depDiv.innerHTML = `
                        <strong>${sourceNode.label}</strong>
                        <span class="dependency-arrow">→ ${edge.relationship} →</span>
                        <strong>${targetNode.label}</strong>
                    `;
                    depsList.appendChild(depDiv);
                }
            });
            
            depsContainer.style.display = 'block';
        }
    }

    /**
     * Clear the visualization
     */
    function clearVisualization() {
        const graphContainer = document.getElementById('ncg-graph-container');
        const depsContainer = document.getElementById('ncg-dependencies-container');
        const projectsContainer = document.getElementById('ncg-projects-container');
        
        if (graphContainer) {
            graphContainer.innerHTML = '<p class="placeholder-text">Click "Analyze DCIM Example" to see the code graph visualization</p>';
        }
        if (depsContainer) {
            depsContainer.style.display = 'none';
        }
        if (projectsContainer) {
            projectsContainer.style.display = 'none';
        }
        
        currentVisualizationData = null;
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
        clearVisualization
    };
})();

// Make it available globally
window.NewCodeGraphManager = NewCodeGraphManager;