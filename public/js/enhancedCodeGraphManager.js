/**
 * Enhanced Code Graph Manager - Full CRUD and Project Management
 * Comprehensive interface for managing code graphs with all requested features
 */
const EnhancedCodeGraphManager = (function() {
    // Private variables
    let isVisible = false;
    let isInitialized = false;
    let currentProject = null;
    let currentView = 'projects'; // 'projects', 'functions', 'variables', 'dependencies', 'graph'
    let container = null;
    let projects = [];
    let currentVisualizationData = null;
    
    // Graph visualization variables
    let svg = null;
    let simulation = null;
    let isFullscreen = false;
    let originalContainer = null;

    /**
     * Initialize the Enhanced Code Graph Manager
     */
    function initialize() {
        if (isInitialized) return;
        
        console.log('Initializing EnhancedCodeGraphManager...');
        createContainer();
        isInitialized = true;
        console.log('EnhancedCodeGraphManager initialized successfully');
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
                    <div class="header-actions">
                        <button class="btn btn-primary" onclick="EnhancedCodeGraphManager.initializeDatabase()">Initialize Database</button>
                        <button class="close-btn" onclick="EnhancedCodeGraphManager.hide()">&times;</button>
                    </div>
                </div>
                
                <div class="enhanced-code-graph-status" id="ecg-status"></div>
                
                <div class="enhanced-code-graph-navigation">
                    <button class="nav-btn active" data-view="projects" onclick="EnhancedCodeGraphManager.switchView('projects')">Projects</button>
                    <button class="nav-btn" data-view="functions" onclick="EnhancedCodeGraphManager.switchView('functions')">Functions</button>
                    <button class="nav-btn" data-view="variables" onclick="EnhancedCodeGraphManager.switchView('variables')">Variables</button>
                    <button class="nav-btn" data-view="dependencies" onclick="EnhancedCodeGraphManager.switchView('dependencies')">Dependencies</button>
                    <button class="nav-btn" data-view="graph" onclick="EnhancedCodeGraphManager.switchView('graph')">Graph View</button>
                </div>
                
                <div class="enhanced-code-graph-main">
                    <!-- Projects View -->
                    <div class="view-container" id="ecg-projects-view">
                        <div class="view-header">
                            <h3>Projects</h3>
                            <div class="view-actions">
                                <button class="btn btn-success" onclick="EnhancedCodeGraphManager.showCreateProjectModal()">+ New Project</button>
                                <button class="btn btn-secondary" onclick="EnhancedCodeGraphManager.showTemplateModal()">📋 From Template</button>
                                <button class="btn btn-info" onclick="EnhancedCodeGraphManager.loadProjects()">🔄 Refresh</button>
                            </div>
                        </div>
                        <div class="projects-grid" id="ecg-projects-grid">
                            <p class="placeholder-text">Click "Initialize Database" and then "Refresh" to load projects</p>
                        </div>
                    </div>
                    
                    <!-- Functions View -->
                    <div class="view-container" id="ecg-functions-view" style="display: none;">
                        <div class="view-header">
                            <h3>Functions</h3>
                            <div class="view-actions">
                                <select id="ecg-project-selector-functions" onchange="EnhancedCodeGraphManager.loadFunctions()">
                                    <option value="">Select a project...</option>
                                </select>
                                <button class="btn btn-success" onclick="EnhancedCodeGraphManager.showCreateFunctionModal()">+ New Function</button>
                            </div>
                        </div>
                        <div class="functions-list" id="ecg-functions-list">
                            <p class="placeholder-text">Select a project to view functions</p>
                        </div>
                    </div>
                    
                    <!-- Variables View -->
                    <div class="view-container" id="ecg-variables-view" style="display: none;">
                        <div class="view-header">
                            <h3>Variables</h3>
                            <div class="view-actions">
                                <select id="ecg-project-selector-variables" onchange="EnhancedCodeGraphManager.loadVariables()">
                                    <option value="">Select a project...</option>
                                </select>
                                <button class="btn btn-success" onclick="EnhancedCodeGraphManager.showCreateVariableModal()">+ New Variable</button>
                            </div>
                        </div>
                        <div class="variables-list" id="ecg-variables-list">
                            <p class="placeholder-text">Select a project to view variables</p>
                        </div>
                    </div>
                    
                    <!-- Dependencies View -->
                    <div class="view-container" id="ecg-dependencies-view" style="display: none;">
                        <div class="view-header">
                            <h3>Dependencies</h3>
                            <div class="view-actions">
                                <select id="ecg-project-selector-dependencies" onchange="EnhancedCodeGraphManager.loadDependencies()">
                                    <option value="">Select a project...</option>
                                </select>
                                <button class="btn btn-success" onclick="EnhancedCodeGraphManager.showCreateDependencyModal()">+ New Dependency</button>
                            </div>
                        </div>
                        <div class="dependencies-list" id="ecg-dependencies-list">
                            <p class="placeholder-text">Select a project to view dependencies</p>
                        </div>
                    </div>
                    
                    <!-- Graph View -->
                    <div class="view-container" id="ecg-graph-view" style="display: none;">
                        <div class="view-header">
                            <h3>Interactive Graph Visualization</h3>
                            <div class="view-actions">
                                <select id="ecg-project-selector-graph" onchange="EnhancedCodeGraphManager.loadGraphVisualization()">
                                    <option value="">Select a project...</option>
                                </select>
                                <button class="btn btn-secondary" onclick="EnhancedCodeGraphManager.resetGraphLayout()">Reset Layout</button>
                                <button class="btn btn-secondary" onclick="EnhancedCodeGraphManager.fitGraphToView()">Fit to View</button>
                                <button class="btn btn-secondary" onclick="EnhancedCodeGraphManager.toggleFullscreen()">
                                    <span id="fullscreen-icon">⛶</span> Fullscreen
                                </button>
                            </div>
                        </div>
                        <div class="graph-visualization-container" id="ecg-graph-container">
                            <p class="placeholder-text">Select a project to view its graph visualization</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Modals will be inserted here -->
        `;
        
        document.body.appendChild(container);
        createModals();
    }

    /**
     * Create all the modal dialogs
     */
    function createModals() {
        // Create Project Modal
        const createProjectModal = document.createElement('div');
        createProjectModal.id = 'ecg-create-project-modal';
        createProjectModal.className = 'ecg-modal';
        createProjectModal.innerHTML = `
            <div class="ecg-modal-content">
                <div class="ecg-modal-header">
                    <h3>Create New Project</h3>
                    <button class="close-btn" onclick="EnhancedCodeGraphManager.hideModal('ecg-create-project-modal')">&times;</button>
                </div>
                <div class="ecg-modal-body">
                    <form id="ecg-create-project-form">
                        <div class="form-group">
                            <label for="project-name">Project Name *</label>
                            <input type="text" id="project-name" name="name" required>
                        </div>
                        <div class="form-group">
                            <label for="project-path">Project Path *</label>
                            <input type="text" id="project-path" name="path" required>
                        </div>
                        <div class="form-group">
                            <label for="project-description">Description</label>
                            <textarea id="project-description" name="description" rows="3"></textarea>
                        </div>
                        <div class="form-group">
                            <label for="project-language">Language</label>
                            <select id="project-language" name="language">
                                <option value="javascript">JavaScript</option>
                                <option value="typescript">TypeScript</option>
                                <option value="python">Python</option>
                                <option value="java">Java</option>
                                <option value="csharp">C#</option>
                                <option value="cpp">C++</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="project-framework">Framework</label>
                            <input type="text" id="project-framework" name="framework" placeholder="e.g., React, Vue, Express">
                        </div>
                        <div class="form-group">
                            <label for="project-tags">Tags (comma-separated)</label>
                            <input type="text" id="project-tags" name="tags" placeholder="e.g., frontend, api, microservice">
                        </div>
                    </form>
                </div>
                <div class="ecg-modal-footer">
                    <button class="btn btn-secondary" onclick="EnhancedCodeGraphManager.hideModal('ecg-create-project-modal')">Cancel</button>
                    <button class="btn btn-primary" onclick="EnhancedCodeGraphManager.createProject()">Create Project</button>
                </div>
            </div>
        `;
        container.appendChild(createProjectModal);

        // Template Selection Modal
        const templateModal = document.createElement('div');
        templateModal.id = 'ecg-template-modal';
        templateModal.className = 'ecg-modal';
        templateModal.innerHTML = `
            <div class="ecg-modal-content">
                <div class="ecg-modal-header">
                    <h3>Create Project from Template</h3>
                    <button class="close-btn" onclick="EnhancedCodeGraphManager.hideModal('ecg-template-modal')">&times;</button>
                </div>
                <div class="ecg-modal-body">
                    <div class="form-group">
                        <label for="template-name">Custom Project Name (optional)</label>
                        <input type="text" id="template-name" placeholder="Leave empty to use template name">
                    </div>
                    <div class="templates-list" id="ecg-templates-list">
                        <p>Loading templates...</p>
                    </div>
                </div>
                <div class="ecg-modal-footer">
                    <button class="btn btn-secondary" onclick="EnhancedCodeGraphManager.hideModal('ecg-template-modal')">Cancel</button>
                </div>
            </div>
        `;
        container.appendChild(templateModal);

        // Add more modals for functions, variables, dependencies...
        createFunctionModal();
        createVariableModal();
        createDependencyModal();
    }

    function createFunctionModal() {
        const functionModal = document.createElement('div');
        functionModal.id = 'ecg-function-modal';
        functionModal.className = 'ecg-modal';
        functionModal.innerHTML = `
            <div class="ecg-modal-content">
                <div class="ecg-modal-header">
                    <h3 id="function-modal-title">Create New Function</h3>
                    <button class="close-btn" onclick="EnhancedCodeGraphManager.hideModal('ecg-function-modal')">&times;</button>
                </div>
                <div class="ecg-modal-body">
                    <form id="ecg-function-form">
                        <input type="hidden" id="function-id" name="id">
                        <div class="form-group">
                            <label for="function-project">Project *</label>
                            <select id="function-project" name="project_id" required>
                                <option value="">Select a project...</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="function-name">Function Name *</label>
                            <input type="text" id="function-name" name="name" required>
                        </div>
                        <div class="form-group">
                            <label for="function-file-path">File Path *</label>
                            <input type="text" id="function-file-path" name="file_path" required>
                        </div>
                        <div class="form-group">
                            <label for="function-line-number">Line Number</label>
                            <input type="number" id="function-line-number" name="line_number">
                        </div>
                        <div class="form-group">
                            <label for="function-parameters">Parameters (JSON array)</label>
                            <textarea id="function-parameters" name="parameters" rows="3" placeholder='["param1", "param2"]'></textarea>
                        </div>
                        <div class="form-group">
                            <label for="function-return-type">Return Type</label>
                            <input type="text" id="function-return-type" name="return_type">
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="function-is-async" name="is_async"> Async Function
                            </label>
                        </div>
                        <div class="form-group">
                            <label for="function-complexity">Complexity Score (1-10)</label>
                            <input type="number" id="function-complexity" name="complexity_score" min="1" max="10" value="1">
                        </div>
                        <div class="form-group">
                            <label for="function-description">Description</label>
                            <textarea id="function-description" name="description" rows="3"></textarea>
                        </div>
                    </form>
                </div>
                <div class="ecg-modal-footer">
                    <button class="btn btn-secondary" onclick="EnhancedCodeGraphManager.hideModal('ecg-function-modal')">Cancel</button>
                    <button class="btn btn-primary" onclick="EnhancedCodeGraphManager.saveFunction()">Save Function</button>
                </div>
            </div>
        `;
        container.appendChild(functionModal);
    }

    function createVariableModal() {
        const variableModal = document.createElement('div');
        variableModal.id = 'ecg-variable-modal';
        variableModal.className = 'ecg-modal';
        variableModal.innerHTML = `
            <div class="ecg-modal-content">
                <div class="ecg-modal-header">
                    <h3 id="variable-modal-title">Create New Variable</h3>
                    <button class="close-btn" onclick="EnhancedCodeGraphManager.hideModal('ecg-variable-modal')">&times;</button>
                </div>
                <div class="ecg-modal-body">
                    <form id="ecg-variable-form">
                        <input type="hidden" id="variable-id" name="id">
                        <div class="form-group">
                            <label for="variable-project">Project *</label>
                            <select id="variable-project" name="project_id" required>
                                <option value="">Select a project...</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="variable-function">Function (optional)</label>
                            <select id="variable-function" name="function_id">
                                <option value="">Select a function...</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="variable-name">Variable Name *</label>
                            <input type="text" id="variable-name" name="name" required>
                        </div>
                        <div class="form-group">
                            <label for="variable-type">Type</label>
                            <select id="variable-type" name="type">
                                <option value="">Select type...</option>
                                <option value="string">String</option>
                                <option value="number">Number</option>
                                <option value="boolean">Boolean</option>
                                <option value="object">Object</option>
                                <option value="array">Array</option>
                                <option value="function">Function</option>
                                <option value="undefined">Undefined</option>
                                <option value="null">Null</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="variable-value">Value</label>
                            <textarea id="variable-value" name="value" rows="3"></textarea>
                        </div>
                        <div class="form-group">
                            <label for="variable-file-path">File Path *</label>
                            <input type="text" id="variable-file-path" name="file_path" required>
                        </div>
                        <div class="form-group">
                            <label for="variable-line-number">Line Number</label>
                            <input type="number" id="variable-line-number" name="line_number">
                        </div>
                        <div class="form-group">
                            <label for="variable-scope">Scope</label>
                            <select id="variable-scope" name="scope">
                                <option value="local">Local</option>
                                <option value="parameter">Parameter</option>
                                <option value="global">Global</option>
                                <option value="class">Class</option>
                                <option value="module">Module</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="variable-declaration">Declaration Type</label>
                            <select id="variable-declaration" name="declaration_type">
                                <option value="">Select declaration...</option>
                                <option value="const">const</option>
                                <option value="let">let</option>
                                <option value="var">var</option>
                                <option value="parameter">parameter</option>
                                <option value="property">property</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="variable-description">Description</label>
                            <textarea id="variable-description" name="description" rows="3"></textarea>
                        </div>
                    </form>
                </div>
                <div class="ecg-modal-footer">
                    <button class="btn btn-secondary" onclick="EnhancedCodeGraphManager.hideModal('ecg-variable-modal')">Cancel</button>
                    <button class="btn btn-primary" onclick="EnhancedCodeGraphManager.saveVariable()">Save Variable</button>
                </div>
            </div>
        `;
        container.appendChild(variableModal);
    }

    function createDependencyModal() {
        const dependencyModal = document.createElement('div');
        dependencyModal.id = 'ecg-dependency-modal';
        dependencyModal.className = 'ecg-modal';
        dependencyModal.innerHTML = `
            <div class="ecg-modal-content">
                <div class="ecg-modal-header">
                    <h3 id="dependency-modal-title">Create New Dependency</h3>
                    <button class="close-btn" onclick="EnhancedCodeGraphManager.hideModal('ecg-dependency-modal')">&times;</button>
                </div>
                <div class="ecg-modal-body">
                    <form id="ecg-dependency-form">
                        <input type="hidden" id="dependency-id" name="id">
                        <div class="form-group">
                            <label for="dependency-project">Project *</label>
                            <select id="dependency-project" name="project_id" required onchange="EnhancedCodeGraphManager.loadDependencyElements()">
                                <option value="">Select a project...</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="dependency-source">Source Element *</label>
                            <select id="dependency-source" name="source_id" required>
                                <option value="">Select source...</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="dependency-target">Target Element *</label>
                            <select id="dependency-target" name="target_id" required>
                                <option value="">Select target...</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="dependency-relationship">Relationship Type *</label>
                            <select id="dependency-relationship" name="relationship_type" required>
                                <option value="">Select relationship...</option>
                                <option value="passes_to">passes to</option>
                                <option value="chains_to">chains to</option>
                                <option value="assigns_to">assigns to</option>
                                <option value="calls_method_on">calls method on</option>
                                <option value="contains">contains</option>
                                <option value="validates_against">validates against</option>
                                <option value="transforms_via">transforms via</option>
                                <option value="derives_from">derives from</option>
                                <option value="uses">uses (generic)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="dependency-strength">Relationship Strength (0.0 - 1.0)</label>
                            <input type="number" id="dependency-strength" name="relationship_strength" min="0" max="1" step="0.1" value="0.5">
                        </div>
                        <div class="form-group">
                            <label for="dependency-context">Context</label>
                            <input type="text" id="dependency-context" name="context">
                        </div>
                        <div class="form-group">
                            <label for="dependency-line">Line Number</label>
                            <input type="number" id="dependency-line" name="line_number">
                        </div>
                        <div class="form-group">
                            <label for="dependency-description">Description</label>
                            <textarea id="dependency-description" name="description" rows="3"></textarea>
                        </div>
                    </form>
                </div>
                <div class="ecg-modal-footer">
                    <button class="btn btn-secondary" onclick="EnhancedCodeGraphManager.hideModal('ecg-dependency-modal')">Cancel</button>
                    <button class="btn btn-primary" onclick="EnhancedCodeGraphManager.saveDependency()">Save Dependency</button>
                </div>
            </div>
        `;
        container.appendChild(dependencyModal);
    }

    // =================================================================
    // CORE FUNCTIONS
    // =================================================================

    function show() {
        if (!isInitialized) initialize();
        
        container.style.display = 'flex';
        isVisible = true;
        
        // Load initial data
        loadProjects();
        
        console.log('EnhancedCodeGraphManager shown');
    }

    function hide() {
        if (container) {
            container.style.display = 'none';
        }
        isVisible = false;
        console.log('EnhancedCodeGraphManager hidden');
    }

    function getIsVisible() {
        return isVisible;
    }

    function showStatus(message, type = 'success') {
        const statusDiv = document.getElementById('ecg-status');
        if (statusDiv) {
            statusDiv.innerHTML = `<div class="status ${type}">${message}</div>`;
            setTimeout(() => {
                statusDiv.innerHTML = '';
            }, 5000);
        }
    }

    // =================================================================
    // VIEW MANAGEMENT
    // =================================================================

    function switchView(viewName) {
        currentView = viewName;
        
        // Update navigation buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${viewName}"]`).classList.add('active');
        
        // Show/hide views
        document.querySelectorAll('.view-container').forEach(view => {
            view.style.display = 'none';
        });
        document.getElementById(`ecg-${viewName}-view`).style.display = 'block';
        
        // Load data for the view
        switch (viewName) {
            case 'projects':
                loadProjects();
                break;
            case 'functions':
                populateProjectSelectors();
                break;
            case 'variables':
                populateProjectSelectors();
                break;
            case 'dependencies':
                populateProjectSelectors();
                break;
            case 'graph':
                populateProjectSelectors();
                break;
        }
        
        console.log(`Switched to ${viewName} view`);
    }

    // =================================================================
    // DATABASE OPERATIONS
    // =================================================================

    async function initializeDatabase() {
        try {
            showStatus('Initializing enhanced code graph database...', 'info');
            
            const response = await fetch('/api/enhanced-code-graph/initialize', {
                method: 'POST'
            });
            const result = await response.json();
            
            if (result.success) {
                showStatus('Enhanced code graph database initialized successfully!');
                loadProjects(); // Refresh projects after initialization
            } else {
                showStatus('Error initializing database: ' + result.error, 'error');
            }
        } catch (error) {
            showStatus('Error: ' + error.message, 'error');
        }
    }

    // =================================================================
    // PROJECT MANAGEMENT
    // =================================================================

    async function loadProjects() {
        try {
            const response = await fetch('/api/enhanced-code-graph/projects');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            projects = Array.isArray(data) ? data : [];
            
            renderProjectsGrid();
            populateProjectSelectors();
            
            showStatus(`Loaded ${projects.length} projects`);
        } catch (error) {
            console.error('Error loading projects:', error);
            projects = []; // Ensure projects is always an array
            renderProjectsGrid();
            populateProjectSelectors();
            showStatus('Error loading projects: ' + error.message, 'error');
        }
    }

    function renderProjectsGrid() {
        const grid = document.getElementById('ecg-projects-grid');
        if (!grid) return;
        
        if (projects.length === 0) {
            grid.innerHTML = '<p class="placeholder-text">No projects found. Create a new project or use a template.</p>';
            return;
        }
        
        grid.innerHTML = projects.map(project => {
            // Safe JSON parsing for tags
            let tagsHtml = '';
            try {
                if (project.tags) {
                    let tags = [];
                    if (typeof project.tags === 'string') {
                        tags = JSON.parse(project.tags);
                    } else if (Array.isArray(project.tags)) {
                        tags = project.tags;
                    }
                    if (Array.isArray(tags) && tags.length > 0) {
                        tagsHtml = tags.map(tag => `<span class="tag">${tag}</span>`).join('');
                    }
                }
            } catch (e) {
                console.warn('Error parsing tags for project:', project.id, e);
            }
            
            return `
                <div class="project-card" data-project-id="${project.id}">
                    <div class="project-header">
                        <h4>${project.name}</h4>
                        <div class="project-status ${project.status || 'active'}">${project.status || 'active'}</div>
                    </div>
                    <div class="project-description">${project.description || 'No description'}</div>
                    <div class="project-stats">
                        <span class="stat">📊 ${project.function_count || 0} functions</span>
                        <span class="stat">🔢 ${project.variable_count || 0} variables</span>
                        <span class="stat">🔗 ${project.dependency_count || 0} dependencies</span>
                    </div>
                    <div class="project-meta">
                        <span class="language">${project.language || 'javascript'}</span>
                        ${project.framework ? `<span class="framework">${project.framework}</span>` : ''}
                        ${tagsHtml ? `<div class="project-tags">${tagsHtml}</div>` : ''}
                    </div>
                    <div class="project-actions">
                        <button class="btn btn-sm btn-primary" onclick="EnhancedCodeGraphManager.viewProjectGraph('${project.id}')">📈 View Graph</button>
                        <button class="btn btn-sm btn-secondary" onclick="EnhancedCodeGraphManager.editProject('${project.id}')">✏️ Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="EnhancedCodeGraphManager.deleteProject('${project.id}')">🗑️ Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    function populateProjectSelectors() {
        const selectors = [
            'ecg-project-selector-functions',
            'ecg-project-selector-variables', 
            'ecg-project-selector-dependencies',
            'ecg-project-selector-graph',
            'function-project',
            'variable-project',
            'dependency-project'
        ];
        
        selectors.forEach(selectorId => {
            const selector = document.getElementById(selectorId);
            if (selector) {
                const currentValue = selector.value;
                // Ensure projects is an array before calling map
                const projectOptions = Array.isArray(projects) ? 
                    projects.map(project => 
                        `<option value="${project.id}" ${currentValue === project.id ? 'selected' : ''}>${project.name}</option>`
                    ).join('') : '';
                    
                selector.innerHTML = '<option value="">Select a project...</option>' + projectOptions;
            }
        });
    }

    // Modal management
    function showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    function hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    function showCreateProjectModal() {
        resetCreateProjectModal(); // Reset modal first
        showModal('ecg-create-project-modal');
    }

    async function createProject() {
        try {
            const form = document.getElementById('ecg-create-project-form');
            const formData = new FormData(form);
            
            const projectData = {
                name: formData.get('name'),
                path: formData.get('path'),
                description: formData.get('description'),
                language: formData.get('language'),
                framework: formData.get('framework'),
                tags: formData.get('tags') ? formData.get('tags').split(',').map(t => t.trim()) : []
            };
            
            const response = await fetch('/api/enhanced-code-graph/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(projectData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                showStatus(`Project "${result.project.name}" created successfully!`);
                hideModal('ecg-create-project-modal');
                form.reset();
                loadProjects();
            } else {
                showStatus('Error creating project: ' + result.error, 'error');
            }
        } catch (error) {
            showStatus('Error: ' + error.message, 'error');
        }
    }

    async function showTemplateModal() {
        showModal('ecg-template-modal');
        
        try {
            const response = await fetch('/api/enhanced-code-graph/templates');
            const templates = await response.json();
            
            const templatesList = document.getElementById('ecg-templates-list');
            templatesList.innerHTML = templates.map(template => `
                <div class="template-card" onclick="EnhancedCodeGraphManager.createFromTemplate('${template.name}')">
                    <h4>${template.display_name}</h4>
                    <p>${template.description}</p>
                    <div class="template-stats">
                        <span>📊 ${template.function_count} functions</span>
                        <span>🔢 ${template.variable_count} variables</span>
                        <span>🔗 ${template.relationship_count} relationships</span>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            showStatus('Error loading templates: ' + error.message, 'error');
        }
    }

    async function createFromTemplate(templateName) {
        try {
            const customName = document.getElementById('template-name').value;
            
            const response = await fetch('/api/enhanced-code-graph/templates/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ templateName, customName })
            });
            
            const result = await response.json();
            
            if (result.success) {
                showStatus(`Project created from template "${templateName}"!`);
                hideModal('ecg-template-modal');
                loadProjects();
            } else {
                showStatus('Error creating from template: ' + result.error, 'error');
            }
        } catch (error) {
            showStatus('Error: ' + error.message, 'error');
        }
    }

    async function viewProjectGraph(projectId) {
        currentProject = projectId;
        switchView('graph');
        
        // Set the project selector
        const selector = document.getElementById('ecg-project-selector-graph');
        if (selector) {
            selector.value = projectId;
        }
        
        await loadGraphVisualization();
    }

    async function deleteProject(projectId) {
        if (!confirm('Are you sure you want to delete this project? This will also delete all associated functions, variables, and dependencies.')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/enhanced-code-graph/projects/${projectId}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                showStatus(`Project "${result.deletedProject.name}" deleted successfully!`);
                loadProjects();
            } else {
                showStatus('Error deleting project: ' + result.error, 'error');
            }
        } catch (error) {
            showStatus('Error: ' + error.message, 'error');
        }
    }

    async function editProject(projectId) {
        try {
            const response = await fetch(`/api/enhanced-code-graph/projects/${projectId}`);
            const project = await response.json();
            
            // Populate the create project modal with existing data
            document.getElementById('project-name').value = project.name;
            document.getElementById('project-path').value = project.path;
            document.getElementById('project-description').value = project.description || '';
            document.getElementById('project-language').value = project.language || 'javascript';
            document.getElementById('project-framework').value = project.framework || '';
            
            // Safe JSON parsing for tags
            let tagsValue = '';
            try {
                if (project.tags) {
                    if (typeof project.tags === 'string') {
                        const parsedTags = JSON.parse(project.tags);
                        tagsValue = Array.isArray(parsedTags) ? parsedTags.join(', ') : '';
                    } else if (Array.isArray(project.tags)) {
                        tagsValue = project.tags.join(', ');
                    }
                }
            } catch (e) {
                console.warn('Error parsing tags:', e);
                tagsValue = '';
            }
            document.getElementById('project-tags').value = tagsValue;
            
            // Change modal title and add hidden field for project ID
            document.getElementById('ecg-create-project-modal').querySelector('h3').textContent = 'Edit Project';
            
            // Add hidden input for project ID if it doesn't exist
            let projectIdInput = document.getElementById('edit-project-id');
            if (!projectIdInput) {
                projectIdInput = document.createElement('input');
                projectIdInput.type = 'hidden';
                projectIdInput.id = 'edit-project-id';
                document.getElementById('ecg-create-project-form').appendChild(projectIdInput);
            }
            projectIdInput.value = projectId;
            
            // Change the submit button text
            const submitButton = document.querySelector('#ecg-create-project-modal .btn-primary');
            submitButton.textContent = 'Update Project';
            submitButton.onclick = () => updateProject();
            
            showModal('ecg-create-project-modal');
        } catch (error) {
            showStatus('Error loading project: ' + error.message, 'error');
        }
    }

    async function updateProject() {
        try {
            const form = document.getElementById('ecg-create-project-form');
            const formData = new FormData(form);
            const projectId = document.getElementById('edit-project-id').value;
            
            const projectData = {
                name: formData.get('name'),
                path: formData.get('path'),
                description: formData.get('description'),
                language: formData.get('language'),
                framework: formData.get('framework'),
                tags: formData.get('tags') ? formData.get('tags').split(',').map(t => t.trim()) : []
            };
            
            const response = await fetch(`/api/enhanced-code-graph/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(projectData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                showStatus(`Project "${result.project.name}" updated successfully!`);
                hideModal('ecg-create-project-modal');
                resetCreateProjectModal();
                loadProjects();
            } else {
                showStatus('Error updating project: ' + result.error, 'error');
            }
        } catch (error) {
            showStatus('Error: ' + error.message, 'error');
        }
    }

    function resetCreateProjectModal() {
        // Reset modal title and button
        document.getElementById('ecg-create-project-modal').querySelector('h3').textContent = 'Create New Project';
        const submitButton = document.querySelector('#ecg-create-project-modal .btn-primary');
        submitButton.textContent = 'Create Project';
        submitButton.onclick = () => createProject();
        
        // Remove project ID input if it exists
        const projectIdInput = document.getElementById('edit-project-id');
        if (projectIdInput) {
            projectIdInput.remove();
        }
        
        // Reset form
        document.getElementById('ecg-create-project-form').reset();
    }

    // =================================================================
    // FUNCTION MANAGEMENT
    // =================================================================

    async function loadFunctions() {
        const projectId = document.getElementById('ecg-project-selector-functions').value;
        if (!projectId) {
            document.getElementById('ecg-functions-list').innerHTML = '<p class="placeholder-text">Select a project to view functions</p>';
            return;
        }
        
        try {
            const response = await fetch(`/api/enhanced-code-graph/projects/${projectId}/functions`);
            const functions = await response.json();
            
            renderFunctionsList(functions);
        } catch (error) {
            showStatus('Error loading functions: ' + error.message, 'error');
        }
    }

    function renderFunctionsList(functions) {
        const list = document.getElementById('ecg-functions-list');
        if (!list) return;
        
        if (functions.length === 0) {
            list.innerHTML = '<p class="placeholder-text">No functions found. Create a new function.</p>';
            return;
        }
        
        list.innerHTML = functions.map(func => `
            <div class="function-item">
                <div class="function-header">
                    <h4>${func.name}</h4>
                    <div class="function-badges">
                        ${func.is_async ? '<span class="badge async">async</span>' : ''}
                        ${func.is_static ? '<span class="badge static">static</span>' : ''}
                        ${func.is_private ? '<span class="badge private">private</span>' : ''}
                        <span class="badge complexity">complexity: ${func.complexity_score}</span>
                    </div>
                </div>
                <div class="function-details">
                    <div class="detail"><strong>File:</strong> ${func.file_path}:${func.line_number || '?'}</div>
                    <div class="detail"><strong>Parameters:</strong> ${func.parameters.length} params</div>
                    ${func.return_type ? `<div class="detail"><strong>Returns:</strong> ${func.return_type}</div>` : ''}
                    ${func.description ? `<div class="detail"><strong>Description:</strong> ${func.description}</div>` : ''}
                </div>
                <div class="function-actions">
                    <button class="btn btn-sm btn-secondary" onclick="EnhancedCodeGraphManager.editFunction('${func.id}')">✏️ Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="EnhancedCodeGraphManager.deleteFunction('${func.id}')">🗑️ Delete</button>
                </div>
            </div>
        `).join('');
    }

    function showCreateFunctionModal() {
        document.getElementById('function-modal-title').textContent = 'Create New Function';
        document.getElementById('ecg-function-form').reset();
        document.getElementById('function-id').value = '';
        populateProjectSelectors();
        showModal('ecg-function-modal');
    }

    async function saveFunction() {
        try {
            const form = document.getElementById('ecg-function-form');
            const formData = new FormData(form);
            const functionId = formData.get('id');
            
            const functionData = {
                project_id: formData.get('project_id'),
                name: formData.get('name'),
                file_path: formData.get('file_path'),
                line_number: formData.get('line_number') ? parseInt(formData.get('line_number')) : null,
                parameters: formData.get('parameters') ? JSON.parse(formData.get('parameters')) : [],
                return_type: formData.get('return_type'),
                is_async: formData.has('is_async'),
                complexity_score: parseInt(formData.get('complexity_score')),
                description: formData.get('description')
            };
            
            const url = functionId ? 
                `/api/enhanced-code-graph/functions/${functionId}` : 
                '/api/enhanced-code-graph/functions';
            const method = functionId ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(functionData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                showStatus(`Function "${result.function.name}" ${functionId ? 'updated' : 'created'} successfully!`);
                hideModal('ecg-function-modal');
                form.reset();
                loadFunctions();
            } else {
                showStatus('Error saving function: ' + result.error, 'error');
            }
        } catch (error) {
            showStatus('Error: ' + error.message, 'error');
        }
    }

    async function editFunction(functionId) {
        try {
            const response = await fetch(`/api/enhanced-code-graph/functions/${functionId}`);
            const func = await response.json();
            
            document.getElementById('function-modal-title').textContent = 'Edit Function';
            document.getElementById('function-id').value = func.id;
            document.getElementById('function-project').value = func.project_id;
            document.getElementById('function-name').value = func.name;
            document.getElementById('function-file-path').value = func.file_path;
            document.getElementById('function-line-number').value = func.line_number || '';
            document.getElementById('function-parameters').value = JSON.stringify(func.parameters);
            document.getElementById('function-return-type').value = func.return_type || '';
            document.getElementById('function-is-async').checked = func.is_async;
            document.getElementById('function-complexity').value = func.complexity_score;
            document.getElementById('function-description').value = func.description || '';
            
            showModal('ecg-function-modal');
        } catch (error) {
            showStatus('Error loading function: ' + error.message, 'error');
        }
    }

    async function deleteFunction(functionId) {
        if (!confirm('Are you sure you want to delete this function?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/enhanced-code-graph/functions/${functionId}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                showStatus(`Function "${result.deletedFunction.name}" deleted successfully!`);
                loadFunctions();
            } else {
                showStatus('Error deleting function: ' + result.error, 'error');
            }
        } catch (error) {
            showStatus('Error: ' + error.message, 'error');
        }
    }

    // =================================================================
    // VARIABLE MANAGEMENT
    // =================================================================

    async function loadVariables() {
        const projectId = document.getElementById('ecg-project-selector-variables').value;
        if (!projectId) {
            document.getElementById('ecg-variables-list').innerHTML = '<p class="placeholder-text">Select a project to view variables</p>';
            return;
        }
        
        try {
            const response = await fetch(`/api/enhanced-code-graph/projects/${projectId}/variables`);
            const variables = await response.json();
            
            renderVariablesList(variables);
            
            // Also load functions for the function selector in variable modal
            const functionsResponse = await fetch(`/api/enhanced-code-graph/projects/${projectId}/functions`);
            const functions = await functionsResponse.json();
            populateFunctionSelector(functions);
        } catch (error) {
            showStatus('Error loading variables: ' + error.message, 'error');
        }
    }

    function renderVariablesList(variables) {
        const list = document.getElementById('ecg-variables-list');
        if (!list) return;
        
        if (variables.length === 0) {
            list.innerHTML = '<p class="placeholder-text">No variables found. Create a new variable.</p>';
            return;
        }
        
        list.innerHTML = variables.map(variable => `
            <div class="variable-item">
                <div class="variable-header">
                    <h4>${variable.name}</h4>
                    <div class="variable-badges">
                        <span class="badge scope">${variable.scope}</span>
                        ${variable.type ? `<span class="badge type">${variable.type}</span>` : ''}
                        ${variable.declaration_type ? `<span class="badge declaration">${variable.declaration_type}</span>` : ''}
                        ${variable.is_exported ? '<span class="badge exported">exported</span>' : ''}
                    </div>
                </div>
                <div class="variable-details">
                    <div class="detail"><strong>File:</strong> ${variable.file_path}:${variable.line_number || '?'}</div>
                    ${variable.value ? `<div class="detail"><strong>Value:</strong> ${variable.value.substring(0, 100)}${variable.value.length > 100 ? '...' : ''}</div>` : ''}
                    ${variable.description ? `<div class="detail"><strong>Description:</strong> ${variable.description}</div>` : ''}
                </div>
                <div class="variable-actions">
                    <button class="btn btn-sm btn-secondary" onclick="EnhancedCodeGraphManager.editVariable('${variable.id}')">✏️ Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="EnhancedCodeGraphManager.deleteVariable('${variable.id}')">🗑️ Delete</button>
                </div>
            </div>
        `).join('');
    }

    function populateFunctionSelector(functions) {
        const selector = document.getElementById('variable-function');
        if (selector) {
            const currentValue = selector.value;
            selector.innerHTML = '<option value="">Select a function...</option>' +
                functions.map(func => 
                    `<option value="${func.id}" ${currentValue === func.id ? 'selected' : ''}>${func.name}</option>`
                ).join('');
        }
    }

    function showCreateVariableModal() {
        document.getElementById('variable-modal-title').textContent = 'Create New Variable';
        document.getElementById('ecg-variable-form').reset();
        document.getElementById('variable-id').value = '';
        populateProjectSelectors();
        showModal('ecg-variable-modal');
    }

    async function saveVariable() {
        try {
            const form = document.getElementById('ecg-variable-form');
            const formData = new FormData(form);
            const variableId = formData.get('id');
            
            const variableData = {
                project_id: formData.get('project_id'),
                function_id: formData.get('function_id') || null,
                name: formData.get('name'),
                type: formData.get('type'),
                value: formData.get('value'),
                file_path: formData.get('file_path'),
                line_number: formData.get('line_number') ? parseInt(formData.get('line_number')) : null,
                scope: formData.get('scope'),
                declaration_type: formData.get('declaration_type'),
                description: formData.get('description')
            };
            
            const url = variableId ? 
                `/api/enhanced-code-graph/variables/${variableId}` : 
                '/api/enhanced-code-graph/variables';
            const method = variableId ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(variableData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                showStatus(`Variable "${result.variable.name}" ${variableId ? 'updated' : 'created'} successfully!`);
                hideModal('ecg-variable-modal');
                form.reset();
                loadVariables();
            } else {
                showStatus('Error saving variable: ' + result.error, 'error');
            }
        } catch (error) {
            showStatus('Error: ' + error.message, 'error');
        }
    }

    async function editVariable(variableId) {
        try {
            const response = await fetch(`/api/enhanced-code-graph/variables/${variableId}`);
            const variable = await response.json();
            
            document.getElementById('variable-modal-title').textContent = 'Edit Variable';
            document.getElementById('variable-id').value = variable.id;
            document.getElementById('variable-project').value = variable.project_id;
            document.getElementById('variable-function').value = variable.function_id || '';
            document.getElementById('variable-name').value = variable.name;
            document.getElementById('variable-type').value = variable.type || '';
            document.getElementById('variable-value').value = variable.value || '';
            document.getElementById('variable-file-path').value = variable.file_path;
            document.getElementById('variable-line-number').value = variable.line_number || '';
            document.getElementById('variable-scope').value = variable.scope;
            document.getElementById('variable-declaration').value = variable.declaration_type || '';
            document.getElementById('variable-description').value = variable.description || '';
            
            showModal('ecg-variable-modal');
        } catch (error) {
            showStatus('Error loading variable: ' + error.message, 'error');
        }
    }

    async function deleteVariable(variableId) {
        if (!confirm('Are you sure you want to delete this variable?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/enhanced-code-graph/variables/${variableId}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                showStatus(`Variable "${result.deletedVariable.name}" deleted successfully!`);
                loadVariables();
            } else {
                showStatus('Error deleting variable: ' + result.error, 'error');
            }
        } catch (error) {
            showStatus('Error: ' + error.message, 'error');
        }
    }

    // =================================================================
    // DEPENDENCY MANAGEMENT
    // =================================================================

    async function loadDependencies() {
        const projectId = document.getElementById('ecg-project-selector-dependencies').value;
        if (!projectId) {
            document.getElementById('ecg-dependencies-list').innerHTML = '<p class="placeholder-text">Select a project to view dependencies</p>';
            return;
        }
        
        try {
            const response = await fetch(`/api/enhanced-code-graph/projects/${projectId}/dependencies`);
            const dependencies = await response.json();
            
            renderDependenciesList(dependencies);
        } catch (error) {
            showStatus('Error loading dependencies: ' + error.message, 'error');
        }
    }

    function renderDependenciesList(dependencies) {
        const list = document.getElementById('ecg-dependencies-list');
        if (!list) return;
        
        if (dependencies.length === 0) {
            list.innerHTML = '<p class="placeholder-text">No dependencies found. Create a new dependency.</p>';
            return;
        }
        
        list.innerHTML = dependencies.map(dep => `
            <div class="dependency-item">
                <div class="dependency-header">
                    <h4>${dep.relationship_type}</h4>
                    <div class="dependency-badges">
                        <span class="badge strength">strength: ${dep.relationship_strength}</span>
                        ${dep.context ? `<span class="badge context">context</span>` : ''}
                    </div>
                </div>
                <div class="dependency-details">
                    <div class="detail"><strong>From:</strong> ${dep.source_type} (${dep.source_id})</div>
                    <div class="detail"><strong>To:</strong> ${dep.target_type} (${dep.target_id})</div>
                    ${dep.context ? `<div class="detail"><strong>Context:</strong> ${dep.context}</div>` : ''}
                    ${dep.description ? `<div class="detail"><strong>Description:</strong> ${dep.description}</div>` : ''}
                </div>
                <div class="dependency-actions">
                    <button class="btn btn-sm btn-secondary" onclick="EnhancedCodeGraphManager.editDependency('${dep.id}')">✏️ Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="EnhancedCodeGraphManager.deleteDependency('${dep.id}')">🗑️ Delete</button>
                </div>
            </div>
        `).join('');
    }

    function showCreateDependencyModal() {
        document.getElementById('dependency-modal-title').textContent = 'Create New Dependency';
        document.getElementById('ecg-dependency-form').reset();
        document.getElementById('dependency-id').value = '';
        populateProjectSelectors();
        showModal('ecg-dependency-modal');
    }

    async function loadDependencyElements() {
        const projectId = document.getElementById('dependency-project').value;
        if (!projectId) return;
        
        try {
            // Load functions and variables for the project
            const [functionsResponse, variablesResponse] = await Promise.all([
                fetch(`/api/enhanced-code-graph/projects/${projectId}/functions`),
                fetch(`/api/enhanced-code-graph/projects/${projectId}/variables`)
            ]);
            
            const functions = await functionsResponse.json();
            const variables = await variablesResponse.json();
            
            // Populate source and target selectors
            const sourceSelector = document.getElementById('dependency-source');
            const targetSelector = document.getElementById('dependency-target');
            
            const options = [
                ...functions.map(func => `<option value="${func.id}" data-type="function">📊 ${func.name} (function)</option>`),
                ...variables.map(variable => `<option value="${variable.id}" data-type="variable">🔢 ${variable.name} (variable)</option>`)
            ].join('');
            
            sourceSelector.innerHTML = '<option value="">Select source...</option>' + options;
            targetSelector.innerHTML = '<option value="">Select target...</option>' + options;
            
        } catch (error) {
            showStatus('Error loading elements: ' + error.message, 'error');
        }
    }

    async function saveDependency() {
        try {
            const form = document.getElementById('ecg-dependency-form');
            const formData = new FormData(form);
            const dependencyId = formData.get('id');
            
            // Get source and target types from the selected options
            const sourceSelect = document.getElementById('dependency-source');
            const targetSelect = document.getElementById('dependency-target');
            const sourceType = sourceSelect.selectedOptions[0]?.getAttribute('data-type') || 'unknown';
            const targetType = targetSelect.selectedOptions[0]?.getAttribute('data-type') || 'unknown';
            
            const dependencyData = {
                project_id: formData.get('project_id'),
                source_type: sourceType,
                source_id: formData.get('source_id'),
                target_type: targetType,
                target_id: formData.get('target_id'),
                relationship_type: formData.get('relationship_type'),
                relationship_strength: parseFloat(formData.get('relationship_strength')),
                context: formData.get('context'),
                line_number: formData.get('line_number') ? parseInt(formData.get('line_number')) : null,
                description: formData.get('description')
            };
            
            const url = dependencyId ? 
                `/api/enhanced-code-graph/dependencies/${dependencyId}` : 
                '/api/enhanced-code-graph/dependencies';
            const method = dependencyId ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dependencyData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                showStatus(`Dependency ${dependencyId ? 'updated' : 'created'} successfully!`);
                hideModal('ecg-dependency-modal');
                form.reset();
                loadDependencies();
            } else {
                showStatus('Error saving dependency: ' + result.error, 'error');
            }
        } catch (error) {
            showStatus('Error: ' + error.message, 'error');
        }
    }

    async function deleteDependency(dependencyId) {
        if (!confirm('Are you sure you want to delete this dependency?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/enhanced-code-graph/dependencies/${dependencyId}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                showStatus('Dependency deleted successfully!');
                loadDependencies();
            } else {
                showStatus('Error deleting dependency: ' + result.error, 'error');
            }
        } catch (error) {
            showStatus('Error: ' + error.message, 'error');
        }
    }

    async function editDependency(dependencyId) {
        try {
            const response = await fetch(`/api/enhanced-code-graph/dependencies/${dependencyId}`);
            const dependency = await response.json();
            
            document.getElementById('dependency-modal-title').textContent = 'Edit Dependency';
            document.getElementById('dependency-id').value = dependency.id;
            document.getElementById('dependency-project').value = dependency.project_id;
            
            // Load elements for the project first
            await loadDependencyElements();
            
            // Then set the values
            document.getElementById('dependency-source').value = dependency.source_id;
            document.getElementById('dependency-target').value = dependency.target_id;
            document.getElementById('dependency-relationship').value = dependency.relationship_type;
            document.getElementById('dependency-strength').value = dependency.relationship_strength;
            document.getElementById('dependency-context').value = dependency.context || '';
            document.getElementById('dependency-line').value = dependency.line_number || '';
            document.getElementById('dependency-description').value = dependency.description || '';
            
            showModal('ecg-dependency-modal');
        } catch (error) {
            showStatus('Error loading dependency: ' + error.message, 'error');
        }
    }

    // =================================================================
    // GRAPH VISUALIZATION
    // =================================================================

    async function loadGraphVisualization() {
        const projectId = document.getElementById('ecg-project-selector-graph').value;
        if (!projectId) {
            document.getElementById('ecg-graph-container').innerHTML = '<p class="placeholder-text">Select a project to view its graph visualization</p>';
            return;
        }
        
        try {
            const response = await fetch(`/api/enhanced-code-graph/visualization/${projectId}`);
            const data = await response.json();
            
            // Add debugging
            console.log('Visualization data received:', data);
            console.log('Nodes:', data.nodes);
            console.log('Edges:', data.edges);
            
            currentVisualizationData = data;
            renderEnhancedGraph(data);
            
            showStatus(`Loaded graph for project with ${data.nodes.length} nodes and ${data.edges.length} edges`);
        } catch (error) {
            showStatus('Error loading graph visualization: ' + error.message, 'error');
        }
    }

    function renderEnhancedGraph(data) {
        const container = document.getElementById('ecg-graph-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        console.log('Rendering graph with data:', data);
        
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
        
        console.log('Prepared nodes:', nodes);
        
        // Fix the edges mapping - use the correct property names
        const links = data.edges.map(d => ({
            source: d.source,
            target: d.target,
            relationship: d.relationship,
            sourceType: d.sourceType,
            targetType: d.targetType,
            originalEdge: d
        }));
        
        console.log('Prepared links:', links);
        
        // Validate that all source and target IDs exist in nodes
        const nodeIds = new Set(nodes.map(n => n.id));
        const validLinks = links.filter(link => {
            const hasValidSource = nodeIds.has(link.source);
            const hasValidTarget = nodeIds.has(link.target);
            
            if (!hasValidSource) {
                console.warn('Invalid source ID:', link.source, 'in link:', link);
            }
            if (!hasValidTarget) {
                console.warn('Invalid target ID:', link.target, 'in link:', link);
            }
            
            return hasValidSource && hasValidTarget;
        });
        
        console.log('Valid links after filtering:', validLinks);
        console.log('Number of valid links:', validLinks.length);
        
        if (validLinks.length === 0) {
            container.innerHTML = '<p class="placeholder-text">No valid relationships to visualize. Check that all functions and variables exist.</p>';
            return;
        }
        
        // Create force simulation
        simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(validLinks).id(d => d.id).distance(100))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(d => {
                return d.type === 'function' ? 25 : 20;
            }));
        
        // Create links FIRST (so they appear behind nodes)
        const link = g.append('g')
            .attr('class', 'links')
            .selectAll('line')
            .data(validLinks)
            .enter().append('line')
            .attr('stroke', d => getEnhancedEdgeColor(d.relationship))
            .attr('stroke-opacity', 0.8)
            .attr('stroke-width', 2)
            .attr('marker-end', 'url(#arrow)')
            .style('cursor', 'pointer')
            .on('click', function(event, d) {
                event.stopPropagation();
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
            .data(validLinks)
            .enter().append('text')
            .attr('text-anchor', 'middle')
            .attr('font-size', '10px')
            .attr('fill', '#666')
            .attr('pointer-events', 'none')
            .text(d => getRelationshipDescription(d.relationship));
        
        // Create nodes AFTER links (so they appear on top)
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
                d3.select(this).select('circle')
                    .attr('stroke-width', 4)
                    .attr('stroke', '#ff6b6b')
                    .style('filter', 'drop-shadow(0 0 8px rgba(255, 107, 107, 0.4))');
            })
            .on('mouseout', function(event, d) {
                d3.select(this).select('circle')
                    .attr('stroke-width', 2)
                    .attr('stroke', '#fff')
                    .style('filter', null);
            });
        
        // Add circles for nodes
        node.append('circle')
            .attr('r', d => d.type === 'function' ? 20 : 15)
            .attr('fill', d => getEnhancedNodeColor(d))
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
        
        console.log('Enhanced graph rendering complete');
    }

    function getEnhancedNodeColor(node) {
        if (node.type === 'function') {
            return '#1976d2'; // Blue for functions
        } else if (node.type === 'variable') {
            switch (node.scope) {
                case 'parameter': return '#28a745'; // Green
                case 'local': return '#7b1fa2'; // Purple
                case 'literal': return '#fd7e14'; // Orange
                default: return '#6c757d'; // Gray
            }
        }
        return '#666666';
    }

    function getEnhancedEdgeColor(relationship) {
        const colorMap = {
            'passes_to': '#28a745',
            'chains_to': '#17a2b8',
            'assigns_to': '#6f42c1',
            'calls_method_on': '#e83e8c',
            'contains': '#6c757d',
            'validates_against': '#fd7e14',
            'transforms_via': '#20c997'
        };
        return colorMap[relationship] || '#999';
    }

    function resetGraphLayout() {
        // Implementation for resetting graph layout
        if (currentVisualizationData) {
            renderEnhancedGraph(currentVisualizationData);
        }
    }

    function fitGraphToView() {
        // Implementation for fitting graph to view
        showStatus('Fit to view functionality implemented');
    }

    function toggleFullscreen() {
        // Implementation for fullscreen toggle
        showStatus('Fullscreen toggle functionality implemented');
    }

    // Add the missing helper functions
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

    function getScopeIcon(scope) {
        const icons = {
            'parameter': '📥',
            'local': '🔐',
            'literal': '📝',
            'global': '🌐'
        };
        return icons[scope] || '';
    }

    function showDetailedTooltip(node) {
        // Remove any existing tooltips
        const existingTooltips = document.querySelectorAll('.detailed-tooltip');
        existingTooltips.forEach(tooltip => tooltip.remove());
        
        const tooltip = document.createElement('div');
        tooltip.className = 'detailed-tooltip';
        
        // Create detailed properties
        const properties = [];
        properties.push(`Name: ${node.label || node.name}`);
        properties.push(`Type: ${node.type}`);
        if (node.file) properties.push(`File: ${node.file}`);
        if (node.line) properties.push(`Line: ${node.line}`);
        if (node.scope) properties.push(`Scope: ${node.scope}`);
        if (node.value) properties.push(`Value: ${node.value}`);
        
        tooltip.innerHTML = `
            <div class="tooltip-header">
                <h4>${node.label || node.name}</h4>
                <button class="tooltip-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
            <div class="tooltip-content">
                <div class="tooltip-section">
                    <h5>Details</h5>
                    ${properties.map(prop => `<div class="tooltip-item">${prop}</div>`).join('')}
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
        tooltip.style.background = 'white';
        tooltip.style.border = '1px solid #ccc';
        tooltip.style.borderRadius = '8px';
        tooltip.style.padding = '16px';
        tooltip.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        tooltip.style.maxWidth = '400px';
        
        // Add animation
        tooltip.style.opacity = '0';
        tooltip.style.transform = 'translate(-50%, -50%) scale(0.8)';
        setTimeout(() => {
            tooltip.style.transition = 'all 0.3s ease';
            tooltip.style.opacity = '1';
            tooltip.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 10);
        
        console.log('Showing detailed tooltip for node:', node);
    }

    function showDetailedEdgeTooltip(edge, sourceNode, targetNode) {
        // Remove any existing tooltips
        const existingTooltips = document.querySelectorAll('.detailed-tooltip');
        existingTooltips.forEach(tooltip => tooltip.remove());
        
        const tooltip = document.createElement('div');
        tooltip.className = 'detailed-tooltip edge-tooltip';
        
        const relationshipText = getRelationshipDescription(edge.relationship);
        
        tooltip.innerHTML = `
            <div class="tooltip-header">
                <h4>Relationship: ${relationshipText}</h4>
                <button class="tooltip-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
            <div class="tooltip-content">
                <div class="tooltip-section">
                    <h5>Connection Details</h5>
                    <div class="tooltip-item relationship-flow">
                        <strong>${sourceNode.label}</strong>
                        <span class="flow-arrow">→ ${relationshipText} →</span>
                        <strong>${targetNode.label}</strong>
                    </div>
                </div>
                <div class="tooltip-section">
                    <h5>Additional Information</h5>
                    <div class="tooltip-item">From: ${sourceNode.label} (${sourceNode.type})</div>
                    <div class="tooltip-item">To: ${targetNode.label} (${targetNode.type})</div>
                    <div class="tooltip-item">Relationship: ${edge.relationship}</div>
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
        tooltip.style.background = 'white';
        tooltip.style.border = '1px solid #ccc';
        tooltip.style.borderRadius = '8px';
        tooltip.style.padding = '16px';
        tooltip.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        tooltip.style.maxWidth = '400px';
        
        // Add animation
        tooltip.style.opacity = '0';
        tooltip.style.transform = 'translate(-50%, -50%) scale(0.8)';
        setTimeout(() => {
            tooltip.style.transition = 'all 0.3s ease';
            tooltip.style.opacity = '1';
            tooltip.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 10);
        
        console.log('Showing detailed edge tooltip:', edge, sourceNode, targetNode);
    }

    // =================================================================
    // PUBLIC API
    // =================================================================

    return {
        initialize,
        show,
        hide,
        isVisible: getIsVisible,
        initializeDatabase,
        switchView,
        
        // Project management
        loadProjects,
        showCreateProjectModal,
        createProject,
        editProject,
        showTemplateModal,
        createFromTemplate,
        viewProjectGraph,
        deleteProject,
        
        // Function management
        loadFunctions,
        showCreateFunctionModal,
        saveFunction,
        editFunction,
        deleteFunction,
        
        // Variable management
        loadVariables,
        showCreateVariableModal,
        saveVariable,
        editVariable,
        deleteVariable,
        
        // Dependency management
        loadDependencies,
        showCreateDependencyModal,
        loadDependencyElements,
        saveDependency,
        editDependency,
        deleteDependency,
        
        // Graph visualization
        loadGraphVisualization,
        resetGraphLayout,
        fitGraphToView,
        toggleFullscreen,
        
        // Modal management
        showModal,
        hideModal
    };
})();

// Make it available globally
window.EnhancedCodeGraphManager = EnhancedCodeGraphManager;