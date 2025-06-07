/**
 * New Code Graph Manager - Clean, Simple Code Analysis with Full CRUD
 * Complete project management interface
 */
const NewCodeGraphManager = (function() {
    // Private variables
    let isVisible = false;
    let isInitialized = false;
    let currentVisualizationData = null;
    let container = null;
    let currentView = 'projects'; // 'projects', 'project-detail', 'cards', 'graph'
    let svg = null;
    let simulation = null;
    let currentProject = null;
    let projects = [];
    
    // Fullscreen state tracking
    let isFullscreen = false;
    let originalContainer = null;

    /**
     * Initialize the New Code Graph Manager
     */
    function initialize() {
        if (isInitialized) {
            console.log('NewCodeGraphManager already initialized');
            return;
        }
        
        console.log('Initializing NewCodeGraphManager...');
        createContainer();
        initializeGraphVisualization();
        isInitialized = true;
        console.log('NewCodeGraphManager initialized successfully');
    }

    /**
     * Create the modal container with project management
     */
    function createContainer() {
        container = document.createElement('div');
        container.className = 'new-code-graph-modal';
        container.style.display = 'none';
        
        container.innerHTML = `
            <div class="new-code-graph-content">
                <div class="new-code-graph-header">
                    <h2>Code Graph Manager</h2>
                    <div class="header-actions">
                        <button class="btn btn-primary" onclick="NewCodeGraphManager.initializeDatabase()">Initialize DB</button>
                    <button class="close-btn" onclick="NewCodeGraphManager.hide()">&times;</button>
                </div>
                </div>
                
                <div class="new-code-graph-status" id="ncg-status"></div>
                
                <div class="new-code-graph-main">
                    <!-- Project Management View -->
                    <div class="view-container" id="ncg-projects-view">
                        <div class="projects-header">
                            <h3>📁 Project Management</h3>
                            <div class="project-actions">
                                <button class="btn btn-primary" onclick="NewCodeGraphManager.showCreateProjectForm()">+ New Project</button>
                                <button class="btn btn-success" onclick="NewCodeGraphManager.createSavedDcimExample()">📊 Create DCIM Template</button>
                                <button class="btn btn-secondary" onclick="NewCodeGraphManager.refreshProjects()">🔄 Refresh</button>
                            </div>
                        </div>
                        <div class="projects-grid" id="ncg-projects-grid">
                            <div class="loading">Loading projects...</div>
                </div>
                
                        <!-- Create Project Form -->
                        <div class="form-modal" id="ncg-create-project-form" style="display: none;">
                            <div class="form-content">
                                <h4>Create New Project</h4>
                                <form onsubmit="NewCodeGraphManager.handleCreateProject(event)">
                                    <div class="form-group">
                                        <label>Project Name:</label>
                                        <input type="text" name="name" required placeholder="e.g., My Web App">
                                    </div>
                                    <div class="form-group">
                                        <label>Project Path:</label>
                                        <input type="text" name="path" required placeholder="e.g., /src/controllers">
                                    </div>
                                    <div class="form-group">
                                        <label>Description:</label>
                                        <textarea name="description" placeholder="Optional description..."></textarea>
                                    </div>
                                    <div class="form-actions">
                                        <button type="submit" class="btn btn-primary">Create Project</button>
                                        <button type="button" class="btn btn-secondary" onclick="NewCodeGraphManager.hideCreateProjectForm()">Cancel</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Project Detail View -->
                    <div class="view-container" id="ncg-project-detail-view" style="display: none;">
                        <div class="detail-header">
                            <button class="btn btn-secondary" onclick="NewCodeGraphManager.showProjectsView()">← Back to Projects</button>
                            <h3 id="ncg-project-title">Project Details</h3>
                            <div class="detail-actions">
                                <button class="btn btn-primary" onclick="NewCodeGraphManager.showVisualization()">📊 View Graph</button>
                                <button class="btn btn-secondary" onclick="NewCodeGraphManager.showEditProjectForm()">✏️ Edit</button>
                                <button class="btn btn-danger" onclick="NewCodeGraphManager.deleteCurrentProject()">🗑️ Delete</button>
                            </div>
                        </div>
                        
                        <div class="detail-tabs">
                            <button class="tab-btn active" onclick="NewCodeGraphManager.switchDetailTab('overview')">Overview</button>
                            <button class="tab-btn" onclick="NewCodeGraphManager.switchDetailTab('functions')">Functions</button>
                            <button class="tab-btn" onclick="NewCodeGraphManager.switchDetailTab('variables')">Variables</button>
                            <button class="tab-btn" onclick="NewCodeGraphManager.switchDetailTab('dependencies')">Dependencies</button>
                        </div>
                        
                        <div class="detail-content" id="ncg-project-detail-content">
                            <!-- Project details will be loaded here -->
                        </div>
                    </div>

                    <!-- Visualization Views -->
                    <div class="view-container" id="ncg-cards-view" style="display: none;">
                        <div class="viz-header">
                            <button class="btn btn-secondary" onclick="NewCodeGraphManager.backToProjectDetail()">← Back to Project</button>
                            <h3>📊 Code Elements</h3>
                            <div class="view-toggles">
                                <button class="view-toggle-btn active" data-view="cards" onclick="NewCodeGraphManager.switchVizView('cards')">Card View</button>
                                <button class="view-toggle-btn" data-view="graph" onclick="NewCodeGraphManager.switchVizView('graph')">Graph View</button>
                            </div>
                        </div>
                        <div class="new-code-graph-visualization">
                            <div class="graph-container" id="ncg-graph-container">
                                <p class="placeholder-text">No visualization data available</p>
                            </div>
                            
                            <div class="dependencies-container" id="ncg-dependencies-container" style="display: none;">
                                <h4>Dependencies & Data Flow</h4>
                                <div class="dependencies-list" id="ncg-dependencies-list"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="view-container" id="ncg-graph-view" style="display: none;">
                        <div class="viz-header">
                            <button class="btn btn-secondary" onclick="NewCodeGraphManager.backToProjectDetail()">← Back to Project</button>
                            <h3>🔗 Interactive Graph</h3>
                            <div class="view-toggles">
                                <button class="view-toggle-btn" data-view="cards" onclick="NewCodeGraphManager.switchVizView('cards')">Card View</button>
                                <button class="view-toggle-btn active" data-view="graph" onclick="NewCodeGraphManager.switchVizView('graph')">Graph View</button>
                            </div>
                        </div>
                        <div class="graph-visualization">
                            <div class="graph-controls">
                                <button class="btn btn-sm" onclick="NewCodeGraphManager.resetGraphLayout()">Reset Layout</button>
                                <button class="btn btn-sm" onclick="NewCodeGraphManager.fitGraphToView()">Fit to View</button>
                                <button class="btn btn-sm" onclick="NewCodeGraphManager.toggleFullscreen()">
                                    <span id="fullscreen-icon">⛶</span> Fullscreen
                                </button>
                                <label>
                                    <input type="range" id="zoom-slider" min="0.1" max="3" step="0.1" value="1" onchange="NewCodeGraphManager.handleZoom(this.value)">
                                    Zoom
                                </label>
                            </div>
                            <div class="graph-svg-container" id="ncg-graph-svg-container">
                                <p class="placeholder-text">No graph data available</p>
                            </div>
                        </div>
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

    // =================================================================
    // PROJECT MANAGEMENT FUNCTIONS
    // =================================================================

    async function loadProjects() {
        try {
            showStatus('Loading projects...', 'info');
            
            const response = await fetch('/api/new-code-graph/projects');
            
            // Better error handling for undefined responses
            if (!response) {
                throw new Error('No response received - server may be down');
            }
            
            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unknown error');
                throw new Error(`Server error ${response.status}: ${errorText}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                projects = data.projects || [];
                renderProjectsGrid(projects);
                showStatus(`Loaded ${projects.length} projects`, 'success');
            } else {
                throw new Error(data.error || 'Failed to load projects');
            }
        } catch (error) {
            console.error('Error loading projects:', error);
            showStatus(`Error: ${error.message}`, 'error');
            
            // Show user-friendly error with retry button
            const grid = document.getElementById('ncg-projects-grid');
            if (grid) {
                grid.innerHTML = `
                    <div class="error-state" style="padding: 20px; text-align: center; color: #ff6b6b;">
                        <h4>❌ Failed to Load Projects</h4>
                        <p><strong>Error:</strong> ${error.message}</p>
                        <p>Please check:</p>
                        <ul style="text-align: left; display: inline-block;">
                            <li>Server is running on port 3003</li>
                            <li>Database is properly initialized</li>
                            <li>API routes are accessible</li>
                        </ul>
                        <button class="btn btn-primary" onclick="window.NewCodeGraphManager && window.NewCodeGraphManager.loadProjects()" style="margin-top: 10px;">
                            🔄 Retry Loading Projects
                        </button>
                    </div>
                `;
            }
        }
    }

    function renderProjectsGrid(projectList) {
        const grid = document.getElementById('ncg-projects-grid');
        
        if (projectList.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <h4>No Projects Yet</h4>
                    <p>Create your first project to start analyzing code relationships</p>
                    <button class="btn btn-primary" onclick="NewCodeGraphManager.showCreateProjectForm()">+ Create Project</button>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = projectList.map(project => `
            <div class="project-card" onclick="NewCodeGraphManager.openProject('${project.id}')">
                <div class="project-header">
                    <h4>${escapeHtml(project.name)}</h4>
                    <div class="project-stats">
                        <span class="stat">📁 ${project.function_count || 0} functions</span>
                        <span class="stat">📊 ${project.variable_count || 0} variables</span>
                        <span class="stat">🔗 ${project.dependency_count || 0} deps</span>
                    </div>
                </div>
                <div class="project-path">${escapeHtml(project.path)}</div>
                ${project.description ? `<div class="project-description">${escapeHtml(project.description)}</div>` : ''}
                <div class="project-footer">
                    <span class="project-date">Created: ${new Date(project.created_at * 1000).toLocaleDateString()}</span>
                    <div class="project-actions" onclick="event.stopPropagation()">
                        <button class="btn btn-sm btn-primary" onclick="NewCodeGraphManager.openProject('${project.id}')">Open</button>
                        <button class="btn btn-sm btn-secondary" onclick="NewCodeGraphManager.editProject('${project.id}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="NewCodeGraphManager.deleteProject('${project.id}')">Delete</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async function openProject(projectId) {
        try {
            showStatus('Loading project details...', 'info');
            
            const response = await fetch(`/api/new-code-graph/projects/${projectId}`);
            const data = await response.json();
            
            if (data.success) {
                currentProject = data.project;
                showProjectDetail(currentProject);
                switchView('project-detail');
                showStatus('Project loaded successfully', 'success');
        } else {
                throw new Error(data.error || 'Failed to load project');
            }
        } catch (error) {
            console.error('Error loading project:', error);
            showStatus(`Error loading project: ${error.message}`, 'error');
        }
    }

    function showProjectDetail(project) {
        document.getElementById('ncg-project-title').textContent = project.name;
        switchDetailTab('overview');
    }

    async function switchDetailTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[onclick*="${tabName}"]`).classList.add('active');
        
        const content = document.getElementById('ncg-project-detail-content');
        
        switch (tabName) {
            case 'overview':
                content.innerHTML = renderProjectOverview(currentProject);
                break;
            case 'functions':
                await loadAndRenderFunctions(currentProject.id);
                break;
            case 'variables':
                await loadAndRenderVariables(currentProject.id);
                break;
            case 'dependencies':
                await loadAndRenderDependencies(currentProject.id);
                break;
        }
    }

    function renderProjectOverview(project) {
        return `
            <div class="project-overview">
                <div class="overview-section">
                    <h4>📋 Project Information</h4>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>Name:</label>
                            <span>${escapeHtml(project.name)}</span>
                        </div>
                        <div class="info-item">
                            <label>Path:</label>
                            <span>${escapeHtml(project.path)}</span>
                        </div>
                        <div class="info-item">
                            <label>Description:</label>
                            <span>${escapeHtml(project.description || 'No description')}</span>
                        </div>
                        <div class="info-item">
                            <label>Created:</label>
                            <span>${new Date(project.created_at * 1000).toLocaleString()}</span>
                        </div>
                        <div class="info-item">
                            <label>Updated:</label>
                            <span>${new Date(project.updated_at * 1000).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
                
                <div class="overview-section">
                    <h4>📊 Project Statistics</h4>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-number">${project.function_count || 0}</div>
                            <div class="stat-label">Functions</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${project.variable_count || 0}</div>
                            <div class="stat-label">Variables</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${project.dependency_count || 0}</div>
                            <div class="stat-label">Dependencies</div>
                        </div>
                    </div>
                </div>
                
                <div class="overview-section">
                    <h4>🚀 Quick Actions</h4>
                    <div class="action-buttons">
                        <button class="btn btn-primary" onclick="NewCodeGraphManager.showVisualization()">📊 View Visualization</button>
                        <button class="btn btn-success" onclick="NewCodeGraphManager.addFunction()">+ Add Function</button>
                        <button class="btn btn-success" onclick="NewCodeGraphManager.addVariable()">+ Add Variable</button>
                        <button class="btn btn-success" onclick="NewCodeGraphManager.addDependency()">+ Add Dependency</button>
            </div>
                </div>
            </div>
        `;
    }

    // =================================================================
    // VIEW MANAGEMENT
    // =================================================================

    function switchView(viewType) {
        currentView = viewType;
        
        // Hide all views
        document.querySelectorAll('.view-container').forEach(view => {
            view.style.display = 'none';
        });
        
        // Show selected view
        const targetView = document.getElementById(`ncg-${viewType}-view`);
        if (targetView) {
            targetView.style.display = 'block';
        }
        
        // Load data for specific views
        if (viewType === 'projects') {
            loadProjects();
        }
        
        console.log(`Switched to ${viewType} view`);
    }

    function switchVizView(vizType) {
        // Hide all viz views
        document.getElementById('ncg-cards-view').style.display = 'none';
        document.getElementById('ncg-graph-view').style.display = 'none';
        
        // Show selected viz view
        document.getElementById(`ncg-${vizType}-view`).style.display = 'block';
        
        // Update toggle buttons
        document.querySelectorAll('.view-toggle-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${vizType}"]`).classList.add('active');
        
        currentView = vizType;
    }

    function showProjectsView() {
        switchView('projects');
    }

    function backToProjectDetail() {
        switchView('project-detail');
    }

    async function showVisualization() {
        if (!currentProject) {
            showStatus('No project selected', 'error');
            return;
        }
        
        try {
            showStatus('Loading visualization data...', 'info');
            
            const response = await fetch(`/api/new-code-graph/visualization/${currentProject.id}`);
            const data = await response.json();
            
            if (data.success) {
                currentVisualizationData = data.visualization;
                renderVisualization(currentVisualizationData);
                switchVizView('cards');
                showStatus('Visualization loaded successfully', 'success');
            } else {
                throw new Error(data.error || 'Failed to load visualization');
            }
        } catch (error) {
            console.error('Error loading visualization:', error);
            showStatus(`Error loading visualization: ${error.message}`, 'error');
        }
    }

    // =================================================================
    // FORM HANDLERS
    // =================================================================

    function showCreateProjectForm() {
        document.getElementById('ncg-create-project-form').style.display = 'block';
    }

    function hideCreateProjectForm() {
        document.getElementById('ncg-create-project-form').style.display = 'none';
    }

    async function handleCreateProject(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const projectData = {
            name: formData.get('name'),
            path: formData.get('path'),
            description: formData.get('description')
        };
        
        try {
            showStatus('Creating project...', 'info');
            
            const response = await fetch('/api/new-code-graph/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(projectData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                hideCreateProjectForm();
                event.target.reset();
                await loadProjects();
                showStatus('Project created successfully', 'success');
            } else {
                throw new Error(data.error || 'Failed to create project');
            }
        } catch (error) {
            console.error('Error creating project:', error);
            showStatus(`Error creating project: ${error.message}`, 'error');
        }
    }

    async function refreshProjects() {
        await loadProjects();
    }

    // =================================================================
    // EXISTING FUNCTIONS (keeping the working ones)
    // =================================================================

    async function createSavedDcimExample() {
        try {
            showStatus('Creating DCIM template project...', 'info');
            
            const response = await fetch('/api/new-code-graph/create-saved-dcim-example', {
                method: 'POST'
            });
            
            const data = await response.json();
            
            if (data.success) {
                await loadProjects();
                showStatus('DCIM template project created successfully!', 'success');
            } else {
                throw new Error(data.error || 'Failed to create DCIM template');
            }
        } catch (error) {
            console.error('Error creating DCIM template:', error);
            showStatus(`Error: ${error.message}`, 'error');
        }
    }

    // =================================================================
    // UTILITY FUNCTIONS
    // =================================================================

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function show() {
        if (!isInitialized) initialize();
        
        container.style.display = 'block';
        isVisible = true;
        
        // Start with projects view
        switchView('projects');
        
        console.log('NewCodeGraphManager shown');
    }

    function hide() {
        if (container) {
            container.style.display = 'none';
        }
        isVisible = false;
        console.log('NewCodeGraphManager hidden');
    }

    function showStatus(message, type = 'success') {
        const statusEl = document.getElementById('ncg-status');
        if (!statusEl) return;
        
        statusEl.textContent = message;
        statusEl.className = `new-code-graph-status ${type}`;
        statusEl.style.display = 'block';
        
        setTimeout(() => {
            statusEl.style.display = 'none';
        }, 3000);
    }

    async function initializeDatabase() {
        try {
            showStatus('Initializing database...', 'info');
            
            const response = await fetch('/api/new-code-graph/initialize', {
                method: 'POST'
            });
            
            const data = await response.json();
            
            if (data.success) {
                showStatus('Database initialized successfully!', 'success');
            } else {
                throw new Error(data.error || 'Failed to initialize database');
            }
        } catch (error) {
            console.error('Error initializing database:', error);
            showStatus(`Error: ${error.message}`, 'error');
        }
    }

    // =================================================================
    // PUBLIC API
    // =================================================================

    function globalCleanup() {
        console.log('🧹 Cleaning up NewCodeGraphManager');
        
        // Hide the manager if it's visible
        if (isVisible) {
            hide();
        }
        
        // Clear any timers or intervals
        // Reset state
        currentProject = null;
        projects = [];
        currentVisualizationData = null;
        
        // Remove container from DOM if it exists
        if (container) {
            const parent = container.parentNode;
            if (parent) {
                parent.removeChild(container);
            }
            container = null;
        }
        
        // Reset initialization state
        isInitialized = false;
        isVisible = false;
    }

    return {
        initialize,
        show,
        hide,
        getIsVisible: () => isVisible,
        isInitialized: () => isInitialized,
        globalCleanup,
        loadProjects,
        
        // Project Management
        openProject,
        showCreateProjectForm,
        hideCreateProjectForm,
        handleCreateProject,
        refreshProjects,
        
        // View Management
        switchView,
        switchVizView,
        showProjectsView,
        backToProjectDetail,
        showVisualization,
        switchDetailTab,
        
        // Database Operations
        initializeDatabase,
        createSavedDcimExample,
        
        // Status
        showStatus
    };
})();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', NewCodeGraphManager.initialize);
} else {
    NewCodeGraphManager.initialize();
}

// Export to window object so it can be accessed by other modules
window.NewCodeGraphManager = NewCodeGraphManager;
console.log('✅ NewCodeGraphManager loaded and exported to window');