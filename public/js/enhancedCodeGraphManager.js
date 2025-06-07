/**
 * Enhanced Code Graph Manager - Persistent & Scalable
 * Provides full CRUD interface for managing code graphs
 */
const EnhancedCodeGraphManager = (function() {
    // Private variables
    let isVisible = false;
    let isInitialized = false;
    let currentProject = null;
    let currentVisualizationData = null;
    let container = null;
    let currentView = 'projects'; // 'projects', 'project-detail', 'graph'
    let svg = null;
    let simulation = null;
    
    // Available relationship types (loaded from server)
    let relationshipTypes = {};

    /**
     * Initialize the Enhanced Code Graph Manager
     */
    function initialize() {
        if (isInitialized) return;
        
        console.log('Initializing EnhancedCodeGraphManager...');
        createContainer();
        loadRelationshipTypes();
        isInitialized = true;
        console.log('EnhancedCodeGraphManager initialized successfully');
    }

    /**
     * Load relationship types from server
     */
    async function loadRelationshipTypes() {
        try {
            const response = await fetch('/api/enhanced-code-graph/relationship-types');
            const result = await response.json();
            if (result.success) {
                relationshipTypes = result.relationshipTypes;
            }
        } catch (error) {
            console.error('Error loading relationship types:', error);
        }
    }

    /**
     * Create the main modal container
     */
    function createContainer() {
        container = document.createElement('div');
        container.className = 'enhanced-code-graph-modal';
        container.style.display = 'none';
        
        container.innerHTML = `
            <div class="enhanced-code-graph-content">
                <div class="enhanced-code-graph-header">
                    <h2>Enhanced Code Graph Manager</h2>
                    <button class="close-btn" onclick="EnhancedCodeGraphManager.hide()">&times;</button>
                </div>
                
                <div class="enhanced-code-graph-main" id="ecg-main">
                    <!-- Content will be rendered here based on current view -->
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
        
        // Start with projects view
        showProjectsView();
        
        console.log('EnhancedCodeGraphManager shown');
    }

    /**
     * Hide the code graph manager
     */
    function hide() {
        if (container) {
            container.style.display = 'none';
        }
        isVisible = false;
        console.log('EnhancedCodeGraphManager hidden');
    }

    /**
     * Check if the manager is visible
     */
    function getIsVisible() {
        return isVisible;
    }

    // =================================================================
    // VIEW MANAGEMENT
    // =================================================================

    /**
     * Show projects list view
     */
    async function showProjectsView() {
        currentView = 'projects';
        const mainContent = document.getElementById('ecg-main');
        
        mainContent.innerHTML = `
            <div class="view-header">
                <h3>Code Graph Projects</h3>
                <div class="header-actions">
                    <button class="btn btn-success" onclick="EnhancedCodeGraphManager.createSavedDcimExample()">
                        📊 Create DCIM Example (Saved)
                    </button>
                    <button class="btn btn-primary" onclick="EnhancedCodeGraphManager.showCreateProjectForm()">
                        + Create New Project
                    </button>
                </div>
            </div>
            
            <div class="projects-grid" id="ecg-projects-grid">
                <div class="loading">Loading projects...</div>
            </div>
        `;
        
        await loadProjects();
    }

    /**
     * Show project detail view
     */
    async function showProjectDetailView(projectId) {
        currentView = 'project-detail';
        const mainContent = document.getElementById('ecg-main');
        
        try {
            // Load project data
            const projectResponse = await fetch(`/api/enhanced-code-graph/projects/${projectId}`);
            const projectResult = await projectResponse.json();
            
            if (!projectResult.success) {
                throw new Error(projectResult.error);
            }
            
            currentProject = projectResult.project;
            
            mainContent.innerHTML = `
                <div class="view-header">
                    <div class="view-nav">
                        <button class="btn btn-secondary" onclick="EnhancedCodeGraphManager.showProjectsView()">
                            ← Back to Projects
                        </button>
                        <h3>${currentProject.name}</h3>
                    </div>
                    <div class="project-actions">
                        <button class="btn btn-primary" onclick="EnhancedCodeGraphManager.showVisualization('${projectId}')">
                            📊 View Graph
                        </button>
                        <button class="btn btn-secondary" onclick="EnhancedCodeGraphManager.showEditProjectForm('${projectId}')">
                            ✏️ Edit Project
                        </button>
                        <button class="btn btn-danger" onclick="EnhancedCodeGraphManager.confirmDeleteProject('${projectId}')">
                            🗑️ Delete Project
                        </button>
                    </div>
                </div>
                
                <div class="project-detail-content">
                    <div class="project-info">
                        <div class="info-item">
                            <label>Path:</label>
                            <span class="code">${currentProject.path}</span>
                        </div>
                        <div class="info-item">
                            <label>Description:</label>
                            <span>${currentProject.description || 'No description'}</span>
                        </div>
                        <div class="info-item">
                            <label>Created:</label>
                            <span>${new Date(currentProject.created_at * 1000).toLocaleString()}</span>
                        </div>
                    </div>
                    
                    <div class="project-tabs">
                        <button class="tab-btn active" data-tab="functions">
                            Functions
                        </button>
                        <button class="tab-btn" data-tab="variables">
                            Variables  
                        </button>
                        <button class="tab-btn" data-tab="dependencies">
                            Dependencies
                        </button>
                    </div>
                    
                    <div class="project-tab-content" id="ecg-tab-content">
                        <!-- Tab content will be loaded here -->
                    </div>
                </div>
            `;
            
            // Add tab click handlers
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const tabType = e.target.dataset.tab;
                    showProjectTab(tabType, e.target);
                });
            });
            
            // Show functions tab by default
            showProjectTab('functions', document.querySelector('.tab-btn[data-tab="functions"]'));
            
        } catch (error) {
            showError('Error loading project: ' + error.message);
        }
    }

    /**
     * Show different tabs in project detail view
     */
    async function showProjectTab(tabType, buttonElement) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        buttonElement.classList.add('active');
        
        const tabContent = document.getElementById('ecg-tab-content');
        
        switch (tabType) {
            case 'functions':
                await showFunctionsTab(tabContent);
                break;
            case 'variables':
                await showVariablesTab(tabContent);
                break;
            case 'dependencies':
                await showDependenciesTab(tabContent);
                break;
        }
    }

    /**
     * Show functions tab content
     */
    async function showFunctionsTab(container) {
        container.innerHTML = `
            <div class="tab-header">
                <h4>Functions</h4>
                <button class="btn btn-primary" onclick="EnhancedCodeGraphManager.showCreateFunctionForm()">
                    + Add Function
                </button>
            </div>
            <div class="items-list" id="ecg-functions-list">
                <div class="loading">Loading functions...</div>
            </div>
        `;
        
        try {
            const response = await fetch(`/api/enhanced-code-graph/projects/${currentProject.id}/functions`);
            const result = await response.json();
            
            if (result.success) {
                renderFunctionsList(result.functions);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            document.getElementById('ecg-functions-list').innerHTML = 
                `<div class="error">Error loading functions: ${error.message}</div>`;
        }
    }

    /**
     * Show variables tab content
     */
    async function showVariablesTab(container) {
        container.innerHTML = `
            <div class="tab-header">
                <h4>Variables</h4>
                <button class="btn btn-primary" onclick="EnhancedCodeGraphManager.showCreateVariableForm()">
                    + Add Variable
                </button>
            </div>
            <div class="items-list" id="ecg-variables-list">
                <div class="loading">Loading variables...</div>
            </div>
        `;
        
        try {
            const response = await fetch(`/api/enhanced-code-graph/projects/${currentProject.id}/variables`);
            const result = await response.json();
            
            if (result.success) {
                renderVariablesList(result.variables);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            document.getElementById('ecg-variables-list').innerHTML = 
                `<div class="error">Error loading variables: ${error.message}</div>`;
        }
    }

    /**
     * Show dependencies tab content
     */
    async function showDependenciesTab(container) {
        container.innerHTML = `
            <div class="tab-header">
                <h4>Dependencies</h4>
                <button class="btn btn-primary" onclick="EnhancedCodeGraphManager.showCreateDependencyForm()">
                    + Add Dependency
                </button>
            </div>
            <div class="items-list" id="ecg-dependencies-list">
                <div class="loading">Loading dependencies...</div>
            </div>
        `;
        
        try {
            const response = await fetch(`/api/enhanced-code-graph/projects/${currentProject.id}/dependencies`);
            const result = await response.json();
            
            if (result.success) {
                renderDependenciesList(result.dependencies);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            document.getElementById('ecg-dependencies-list').innerHTML = 
                `<div class="error">Error loading dependencies: ${error.message}</div>`;
        }
    }

    // =================================================================
    // DATA LOADING & RENDERING
    // =================================================================

    /**
     * Load and display projects
     */
    async function loadProjects() {
        try {
            const response = await fetch('/api/enhanced-code-graph/projects');
            const result = await response.json();
            
            if (result.success) {
                renderProjectsGrid(result.projects);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            document.getElementById('ecg-projects-grid').innerHTML = 
                `<div class="error">Error loading projects: ${error.message}</div>`;
        }
    }

    /**
     * Render projects grid
     */
    function renderProjectsGrid(projects) {
        const grid = document.getElementById('ecg-projects-grid');
        
        if (projects.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <h4>No projects yet</h4>
                    <p>Create your first code graph project to get started.</p>
                    <button class="btn btn-primary" onclick="EnhancedCodeGraphManager.showCreateProjectForm()">
                        Create Project
                    </button>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = projects.map(project => `
            <div class="project-card" onclick="EnhancedCodeGraphManager.showProjectDetailView('${project.id}')">
                <div class="project-card-header">
                    <h4>${project.name}</h4>
                    <div class="project-stats">
                        <span class="stat">
                            <span class="stat-value">${project.function_count || 0}</span>
                            <span class="stat-label">Functions</span>
                        </span>
                        <span class="stat">
                            <span class="stat-value">${project.variable_count || 0}</span>
                            <span class="stat-label">Variables</span>
                        </span>
                        <span class="stat">
                            <span class="stat-value">${project.dependency_count || 0}</span>
                            <span class="stat-label">Dependencies</span>
                        </span>
                    </div>
                </div>
                <div class="project-card-body">
                    <div class="project-path">${project.path}</div>
                    <div class="project-description">${project.description || 'No description'}</div>
                </div>
                <div class="project-card-footer">
                    <small>Created: ${new Date(project.created_at * 1000).toLocaleDateString()}</small>
                </div>
            </div>
        `).join('');
    }

    /**
     * Render functions list
     */
    function renderFunctionsList(functions) {
        const list = document.getElementById('ecg-functions-list');
        
        if (functions.length === 0) {
            list.innerHTML = '<div class="empty-state">No functions yet. Add your first function.</div>';
            return;
        }
        
        list.innerHTML = functions.map(func => `
            <div class="item-card function-card">
                <div class="item-header">
                    <h5>${func.name}${func.is_async ? ' (async)' : ''}</h5>
                    <div class="item-actions">
                        <button class="btn btn-sm btn-secondary" onclick="EnhancedCodeGraphManager.showEditFunctionForm('${func.id}')">
                            ✏️ Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="EnhancedCodeGraphManager.confirmDeleteFunction('${func.id}')">
                            🗑️ Delete
                        </button>
                    </div>
                </div>
                <div class="item-body">
                    <div class="item-detail">
                        <label>File:</label>
                        <span class="code">${func.file_path}:${func.line_number}</span>
                    </div>
                    <div class="item-detail">
                        <label>Parameters:</label>
                        <span>${JSON.parse(func.parameters || '[]').map(p => p.name).join(', ') || 'None'}</span>
                    </div>
                    <div class="item-detail">
                        <label>Variables:</label>
                        <span>${func.variable_count || 0}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Render variables list
     */
    function renderVariablesList(variables) {
        const list = document.getElementById('ecg-variables-list');
        
        if (variables.length === 0) {
            list.innerHTML = '<div class="empty-state">No variables yet. Add your first variable.</div>';
            return;
        }
        
        list.innerHTML = variables.map(variable => `
            <div class="item-card variable-card">
                <div class="item-header">
                    <h5>${variable.name}</h5>
                    <div class="item-actions">
                        <button class="btn btn-sm btn-secondary" onclick="EnhancedCodeGraphManager.showEditVariableForm('${variable.id}')">
                            ✏️ Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="EnhancedCodeGraphManager.confirmDeleteVariable('${variable.id}')">
                            🗑️ Delete
                        </button>
                    </div>
                </div>
                <div class="item-body">
                    <div class="item-detail">
                        <label>Type:</label>
                        <span>${variable.type || 'Unknown'}</span>
                    </div>
                    <div class="item-detail">
                        <label>Scope:</label>
                        <span class="scope-badge scope-${variable.scope}">${variable.scope}</span>
                    </div>
                    <div class="item-detail">
                        <label>File:</label>
                        <span class="code">${variable.file_path}:${variable.line_number}</span>
                    </div>
                    ${variable.value ? `
                    <div class="item-detail">
                        <label>Value:</label>
                        <span class="code">${variable.value.length > 50 ? variable.value.substring(0, 50) + '...' : variable.value}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    /**
     * Render dependencies list
     */
    function renderDependenciesList(dependencies) {
        const list = document.getElementById('ecg-dependencies-list');
        
        if (dependencies.length === 0) {
            list.innerHTML = '<div class="empty-state">No dependencies yet. Add your first dependency.</div>';
            return;
        }
        
        list.innerHTML = dependencies.map(dep => `
            <div class="item-card dependency-card">
                <div class="item-header">
                    <h5>${relationshipTypes[dep.relationship_type] || dep.relationship_type}</h5>
                    <div class="item-actions">
                        <button class="btn btn-sm btn-secondary" onclick="EnhancedCodeGraphManager.showEditDependencyForm('${dep.id}')">
                            ✏️ Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="EnhancedCodeGraphManager.confirmDeleteDependency('${dep.id}')">
                            🗑️ Delete
                        </button>
                    </div>
                </div>
                <div class="item-body">
                    <div class="dependency-flow">
                        <span class="source">${dep.source_type}: ${dep.source_id}</span>
                        <span class="arrow">→</span>
                        <span class="target">${dep.target_type}: ${dep.target_id}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // =================================================================
    // CRUD OPERATIONS
    // =================================================================

    /**
     * Create and save DCIM example to database
     */
    async function createSavedDcimExample() {
        try {
            showStatus('Creating DCIM example and saving to database...', 'info');
            
            const response = await fetch('/api/enhanced-code-graph/create-saved-dcim-example', {
                method: 'POST'
            });
            const result = await response.json();
            
            if (result.success) {
                showStatus('DCIM example created and saved to database!', 'success');
                await loadProjects(); // Refresh the projects list
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            showStatus('Error creating DCIM example: ' + error.message, 'error');
        }
    }

    /**
     * Show visualization for a project
     */
    async function showVisualization(projectId) {
        try {
            const response = await fetch(`/api/enhanced-code-graph/projects/${projectId}/visualization`);
            const result = await response.json();
            
            if (result.success) {
                // Use the existing NewCodeGraphManager to show the visualization
                if (window.NewCodeGraphManager) {
                    NewCodeGraphManager.show();
                    // Set the visualization data directly
                    NewCodeGraphManager.currentVisualizationData = result.visualization;
                    NewCodeGraphManager.renderVisualization(result.visualization);
                    NewCodeGraphManager.switchView('graph');
                    setTimeout(() => NewCodeGraphManager.renderGraph(result.visualization), 100);
                }
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            showStatus('Error loading visualization: ' + error.message, 'error');
        }
    }

    /**
     * Confirm and delete project
     */
    async function confirmDeleteProject(projectId) {
        if (confirm('Are you sure you want to delete this project? This will also delete all functions, variables, and dependencies.')) {
            try {
                const response = await fetch(`/api/enhanced-code-graph/projects/${projectId}`, {
                    method: 'DELETE'
                });
                const result = await response.json();
                
                if (result.success) {
                    showStatus('Project deleted successfully', 'success');
                    showProjectsView(); // Go back to projects list
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                showStatus('Error deleting project: ' + error.message, 'error');
            }
        }
    }

    // =================================================================
    // UTILITY FUNCTIONS
    // =================================================================

    /**
     * Show status message
     */
    function showStatus(message, type = 'info') {
        // Create or update status element
        let statusElement = document.getElementById('ecg-status');
        if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.id = 'ecg-status';
            statusElement.className = 'ecg-status';
            document.getElementById('ecg-main').prepend(statusElement);
        }
        
        statusElement.innerHTML = `<div class="status ${type}">${message}</div>`;
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (statusElement) {
                statusElement.innerHTML = '';
            }
        }, 5000);
    }

    /**
     * Show error message
     */
    function showError(message) {
        showStatus(message, 'error');
    }

    // =================================================================
    // PUBLIC API
    // =================================================================

    return {
        initialize,
        show,
        hide,
        isVisible: getIsVisible,
        showProjectsView,
        showProjectDetailView,
        showVisualization,
        createSavedDcimExample,
        confirmDeleteProject,
        
        // Placeholder functions for forms (to be implemented)
        showCreateProjectForm: () => showStatus('Create project form - to be implemented', 'info'),
        showEditProjectForm: () => showStatus('Edit project form - to be implemented', 'info'),
        showCreateFunctionForm: () => showStatus('Create function form - to be implemented', 'info'),
        showEditFunctionForm: () => showStatus('Edit function form - to be implemented', 'info'),
        confirmDeleteFunction: () => showStatus('Delete function - to be implemented', 'info'),
        showCreateVariableForm: () => showStatus('Create variable form - to be implemented', 'info'),
        showEditVariableForm: () => showStatus('Edit variable form - to be implemented', 'info'),
        confirmDeleteVariable: () => showStatus('Delete variable - to be implemented', 'info'),
        showCreateDependencyForm: () => showStatus('Create dependency form - to be implemented', 'info'),
        showEditDependencyForm: () => showStatus('Edit dependency form - to be implemented', 'info'),
        confirmDeleteDependency: () => showStatus('Delete dependency - to be implemented', 'info')
    };
})();

// Make it available globally
window.EnhancedCodeGraphManager = EnhancedCodeGraphManager;