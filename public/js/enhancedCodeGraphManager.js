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

    // Add these variables at the top of the EnhancedCodeGraphManager function
    let searchState = {
        functions: { query: '', filters: {}, currentPage: 1, itemsPerPage: 20 },
        variables: { query: '', filters: {}, currentPage: 1, itemsPerPage: 20 },
        dependencies: { query: '', filters: {}, currentPage: 1, itemsPerPage: 20 }
    };

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
                    <button class="nav-btn" data-view="modules" onclick="EnhancedCodeGraphManager.switchView('modules')">Modules</button>
                    <button class="nav-btn" data-view="libraries" onclick="EnhancedCodeGraphManager.switchView('libraries')">Libraries</button>
                    <button class="nav-btn" data-view="functions" onclick="EnhancedCodeGraphManager.switchView('functions')">Functions</button>
                    <button class="nav-btn" data-view="variables" onclick="EnhancedCodeGraphManager.switchView('variables')">Variables</button>
                    <button class="nav-btn" data-view="dependencies" onclick="EnhancedCodeGraphManager.switchView('dependencies')">Micro Dependencies</button>
                    <button class="nav-btn" data-view="module-deps" onclick="EnhancedCodeGraphManager.switchView('module-deps')">Macro Dependencies</button>
                    <button class="nav-btn" data-view="graph" onclick="EnhancedCodeGraphManager.switchView('graph')">Graph View</button>
                    <button class="nav-btn" data-view="text-editor" onclick="EnhancedCodeGraphManager.switchView('text-editor')">📝 Text Editor</button>
                </div>
                
                <div class="enhanced-code-graph-main">
                    <!-- Projects View -->
                    <div class="view-container" id="ecg-projects-view">
                        <div class="view-header">
                            <h3>Projects</h3>
                            <div class="view-actions">
                                <button class="btn btn-success" onclick="EnhancedCodeGraphManager.showCreateProjectModal()">+ New Project</button>
                                <button class="btn btn-secondary" onclick="EnhancedCodeGraphManager.showTemplateModal()">📋 From Template</button>
                                <button class="btn btn-secondary" onclick="EnhancedCodeGraphManager.showImportModal()">📥 Import Project</button>
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
                        
                        <!-- Search and Filter Controls -->
                        <div class="search-container" id="functions-search-container" style="display: none;">
                            <input type="text" class="search-input" id="functions-search" placeholder="Search functions by name, file path, or description..." 
                                   onkeyup="EnhancedCodeGraphManager.searchFunctions()" />
                            <div class="search-filters">
                                <select class="filter-select" id="functions-async-filter" onchange="EnhancedCodeGraphManager.searchFunctions()">
                                    <option value="">All Functions</option>
                                    <option value="async">Async Only</option>
                                    <option value="sync">Sync Only</option>
                                </select>
                                <select class="filter-select" id="functions-complexity-filter" onchange="EnhancedCodeGraphManager.searchFunctions()">
                                    <option value="">All Complexity</option>
                                    <option value="1-3">Low (1-3)</option>
                                    <option value="4-6">Medium (4-6)</option>
                                    <option value="7-10">High (7-10)</option>
                                </select>
                                <button class="clear-search-btn" onclick="EnhancedCodeGraphManager.clearFunctionSearch()">Clear</button>
                            </div>
                        </div>
                        
                        <div class="search-results-info" id="functions-results-info" style="display: none;"></div>
                        
                        <div class="functions-list" id="ecg-functions-list">
                            <p class="placeholder-text">Select a project to view functions</p>
                        </div>
                        
                        <div class="pagination-container" id="functions-pagination" style="display: none;"></div>
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
                        
                        <!-- Search and Filter Controls -->
                        <div class="search-container" id="variables-search-container" style="display: none;">
                            <input type="text" class="search-input" id="variables-search" placeholder="Search variables by name, type, value, or description..." 
                                   onkeyup="EnhancedCodeGraphManager.searchVariables()" />
                            <div class="search-filters">
                                <select class="filter-select" id="variables-scope-filter" onchange="EnhancedCodeGraphManager.searchVariables()">
                                    <option value="">All Scopes</option>
                                    <option value="local">Local</option>
                                    <option value="parameter">Parameter</option>
                                    <option value="global">Global</option>
                                    <option value="class">Class</option>
                                    <option value="module">Module</option>
                                </select>
                                <select class="filter-select" id="variables-type-filter" onchange="EnhancedCodeGraphManager.searchVariables()">
                                    <option value="">All Types</option>
                                    <option value="string">String</option>
                                    <option value="number">Number</option>
                                    <option value="boolean">Boolean</option>
                                    <option value="object">Object</option>
                                    <option value="array">Array</option>
                                    <option value="function">Function</option>
                                </select>
                                <button class="clear-search-btn" onclick="EnhancedCodeGraphManager.clearVariableSearch()">Clear</button>
                            </div>
                        </div>
                        
                        <div class="search-results-info" id="variables-results-info" style="display: none;"></div>
                        
                        <div class="variables-list" id="ecg-variables-list">
                            <p class="placeholder-text">Select a project to view variables</p>
                        </div>
                        
                        <div class="pagination-container" id="variables-pagination" style="display: none;"></div>
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
                        
                        <!-- Search and Filter Controls -->
                        <div class="search-container" id="dependencies-search-container" style="display: none;">
                            <input type="text" class="search-input" id="dependencies-search" placeholder="Search dependencies by function/variable names, relationship type, context, or description..." 
                                   onkeyup="EnhancedCodeGraphManager.searchDependencies()" />
                            <div class="search-filters">
                                <select class="filter-select" id="dependencies-type-filter" onchange="EnhancedCodeGraphManager.searchDependencies()">
                                    <option value="">All Relationships</option>
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
                                <select class="filter-select" id="dependencies-strength-filter" onchange="EnhancedCodeGraphManager.searchDependencies()">
                                    <option value="">All Strengths</option>
                                    <option value="0.0-0.3">Weak (0.0-0.3)</option>
                                    <option value="0.4-0.7">Medium (0.4-0.7)</option>
                                    <option value="0.8-1.0">Strong (0.8-1.0)</option>
                                </select>
                                <button class="clear-search-btn" onclick="EnhancedCodeGraphManager.clearDependencySearch()">Clear</button>
                            </div>
                        </div>
                        
                        <div class="search-results-info" id="dependencies-results-info" style="display: none;"></div>
                        
                        <div class="dependencies-list" id="ecg-dependencies-list">
                            <p class="placeholder-text">Select a project to view dependencies</p>
                        </div>
                        
                        <div class="pagination-container" id="dependencies-pagination" style="display: none;"></div>
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
                    
                    <!-- Modules View -->
                    <div class="view-container" id="ecg-modules-view" style="display: none;">
                        <div class="view-header">
                            <h3>Modules & Files</h3>
                            <div class="view-actions">
                                <select id="ecg-project-selector-modules" onchange="EnhancedCodeGraphManager.loadModules()">
                                    <option value="">Select a project...</option>
                                </select>
                                <button class="btn btn-success" onclick="EnhancedCodeGraphManager.showCreateModuleModal()">+ New Module</button>
                                <button class="btn btn-secondary" onclick="EnhancedCodeGraphManager.scanProjectStructure()">🔍 Scan Project</button>
                            </div>
                        </div>
                        <div class="modules-hierarchy" id="ecg-modules-hierarchy">
                            <p class="placeholder-text">Select a project to view modules</p>
                        </div>
                    </div>
                    
                    <!-- Libraries View -->
                    <div class="view-container" id="ecg-libraries-view" style="display: none;">
                        <div class="view-header">
                            <h3>External Libraries</h3>
                            <div class="view-actions">
                                <select id="ecg-project-selector-libraries" onchange="EnhancedCodeGraphManager.loadLibraries()">
                                    <option value="">Select a project...</option>
                                </select>
                                <button class="btn btn-success" onclick="EnhancedCodeGraphManager.showCreateLibraryModal()">+ Add Library</button>
                                <button class="btn btn-secondary" onclick="EnhancedCodeGraphManager.scanPackageJson()">📦 Scan package.json</button>
                            </div>
                        </div>
                        <div class="libraries-grid" id="ecg-libraries-grid">
                            <p class="placeholder-text">Select a project to view libraries</p>
                        </div>
                    </div>
                    
                    <!-- Module Dependencies View -->
                    <div class="view-container" id="ecg-module-deps-view" style="display: none;">
                        <div class="view-header">
                            <h3>Module Dependencies</h3>
                            <div class="view-actions">
                                <select id="ecg-project-selector-module-deps" onchange="EnhancedCodeGraphManager.loadModuleDependencies()">
                                    <option value="">Select a project...</option>
                                </select>
                                <button class="btn btn-success" onclick="EnhancedCodeGraphManager.showCreateModuleDependencyModal()">+ New Dependency</button>
                                <button class="btn btn-secondary" onclick="EnhancedCodeGraphManager.analyzeImports()">🔍 Analyze Imports</button>
                            </div>
                        </div>
                        <div class="module-dependencies-list" id="ecg-module-dependencies-list">
                            <p class="placeholder-text">Select a project to view module dependencies</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Text Editor View -->
<div class="view-container" id="ecg-text-editor-view" style="display: none;">
    <div class="view-header">
        <h3>📝 Text Editor - Code Graph Definition</h3>
        <div class="view-actions">
            <select id="ecg-project-selector-text-editor" onchange="EnhancedCodeGraphManager.loadProjectForTextEditor()">
                <option value="">Select a project...</option>
            </select>
            <button class="btn btn-secondary" onclick="EnhancedCodeGraphManager.loadCurrentProjectAsText()">📥 Load Current</button>
            <button class="btn btn-success" onclick="EnhancedCodeGraphManager.parseAndSaveTextDefinition()">💾 Parse & Save</button>
            <button class="btn btn-info" onclick="EnhancedCodeGraphManager.showTextEditorHelp()">❓ Help</button>
        </div>
    </div>
    
    <div class="text-editor-container">
        <div class="text-editor-sidebar">
            <div class="text-editor-toolbar">
                <h4>Quick Actions</h4>
                <button class="btn btn-sm btn-secondary" onclick="EnhancedCodeGraphManager.insertTextTemplate('function')">+ Add Function</button>
                <button class="btn btn-sm btn-secondary" onclick="EnhancedCodeGraphManager.insertTextTemplate('variable')">+ Add Variable</button>
                <button class="btn btn-sm btn-secondary" onclick="EnhancedCodeGraphManager.insertTextTemplate('relationship')">+ Add Relationship</button>
                <button class="btn btn-sm btn-secondary" onclick="EnhancedCodeGraphManager.validateTextSyntax()">✅ Validate</button>
            </div>
            
            <div class="syntax-info">
                <h4>Syntax Preview</h4>
                <div class="syntax-example">
                    <pre># Functions
                        function myFunction(param1, param2) async
                        file: src/myfile.js:42
                        returns: Promise&lt;string&gt;
                        description: Does something useful

                        # Variables  
                        variable myVar: string = "hello"
                        scope: local
                        function: myFunction
                        description: A local variable

                        # Relationships
                        myFunction -> someOtherFunction (calls)
                        param1 -> myVar (assigns_to)</pre>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="text-editor-main">
                                    <div class="text-editor-status" id="text-editor-status"></div>
                                    
                                    <textarea id="text-editor-input" class="text-editor-textarea" 
                                            placeholder="Start typing your code graph definition here...

                        # Example:
                        # Functions
                        function generateThumbnail(inputPath, thumbPath, maxSize=180, quality=60) async
                        file: controllers/dcimController.js:68
                        description: Generate thumbnails for images and videos using Sharp and FFmpeg

                        function getAssetDirectory()
                        file: controllers/dcimController.js:25
                        description: Retrieves custom asset directory path from database with fallback

                        # Variables
                        variable inputPath: string
                        scope: parameter
                        function: generateThumbnail
                        description: source file path for thumbnail generation

                        variable maxSize: number = 180
                        scope: parameter
                        function: generateThumbnail
                        description: function parameter with default value

                        # Relationships
                        generateThumbnail -> sharp (calls)
                        inputPath -> path.extname (passes_to)
                        path.extname -> toLowerCase (chains_to)
                        toLowerCase -> fileExtension (assigns_to)"></textarea>
                                    
                                    <div class="text-editor-preview" id="text-editor-preview" style="display: none;">
                                        <h4>Parsed Structure Preview</h4>
                                        <div id="text-editor-preview-content"></div>
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

        // Import Modal
        const importModal = document.createElement('div');
        importModal.id = 'ecg-import-modal';
        importModal.className = 'ecg-modal';
        importModal.innerHTML = `
            <div class="ecg-modal-content">
                <div class="ecg-modal-header">
                    <h3>Import Project</h3>
                    <button class="close-btn" onclick="EnhancedCodeGraphManager.hideModal('ecg-import-modal')">&times;</button>
                </div>
                <div class="ecg-modal-body">
                    <!-- Content will be dynamically populated by showImportModal() -->
                </div>
            </div>
        `;
        container.appendChild(importModal);

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
        // Hide all views first
        const allViews = document.querySelectorAll('.view-container');
        allViews.forEach(view => view.style.display = 'none');
        
        // Remove active class from all nav buttons
        const allNavBtns = document.querySelectorAll('.nav-btn');
        allNavBtns.forEach(btn => btn.classList.remove('active'));
        
        // Special handling for text editor - show full-screen overlay
        if (viewName === 'text-editor') {
            showTextEditorFullscreen();
            return;
        }
        
        // For other views, show normally
        const targetView = document.getElementById(`ecg-${viewName}-view`);
        if (targetView) {
            targetView.style.display = 'block';
        }
        
        // Set active nav button
        const targetNavBtn = document.querySelector(`[data-view="${viewName}"]`);
        if (targetNavBtn) {
            targetNavBtn.classList.add('active');
        }
        
        // Load data for specific views
        switch(viewName) {
            case 'projects':
                loadProjects();
                break;
            case 'functions':
                loadFunctions();
                break;
            case 'variables':
                loadVariables();
                break;
            case 'micro-dependencies':
            case 'macro-dependencies':
                loadDependencies();
                break;
            case 'graph-view':
                loadGraphVisualization();
                break;
        }
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
                        <button class="btn btn-sm btn-success" onclick="EnhancedCodeGraphManager.exportProject('${project.id}')">📤 Export</button>
                        <button class="btn btn-sm btn-info" onclick="EnhancedCodeGraphManager.showUpdateImportModal('${project.id}')">📥 Update from Import</button>
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
            document.getElementById('functions-search-container').style.display = 'none';
            document.getElementById('functions-results-info').style.display = 'none';
            document.getElementById('functions-pagination').style.display = 'none';
            return;
        }
        
        try {
            const response = await fetch(`/api/enhanced-code-graph/projects/${projectId}/functions`);
            const functions = await response.json();
            
            // Store all functions for searching
            searchState.functions.allItems = functions;
            searchState.functions.currentPage = 1;
            
            // Show search controls
            document.getElementById('functions-search-container').style.display = 'flex';
            
            // Render functions with search applied
            searchFunctions();
        } catch (error) {
            showStatus('Error loading functions: ' + error.message, 'error');
        }
    }

    function searchFunctions() {
        const query = document.getElementById('functions-search').value.toLowerCase();
        const asyncFilter = document.getElementById('functions-async-filter').value;
        const complexityFilter = document.getElementById('functions-complexity-filter').value;
        
        searchState.functions.query = query;
        searchState.functions.filters = { asyncFilter, complexityFilter };
        searchState.functions.currentPage = 1;
        
        let filteredFunctions = searchState.functions.allItems || [];
        
        // Apply text search
        if (query) {
            filteredFunctions = filteredFunctions.filter(func => 
                func.name.toLowerCase().includes(query) ||
                func.file_path.toLowerCase().includes(query) ||
                (func.description && func.description.toLowerCase().includes(query)) ||
                (func.parameters && JSON.stringify(func.parameters).toLowerCase().includes(query))
            );
        }
        
        // Apply async filter
        if (asyncFilter === 'async') {
            filteredFunctions = filteredFunctions.filter(func => func.is_async);
        } else if (asyncFilter === 'sync') {
            filteredFunctions = filteredFunctions.filter(func => !func.is_async);
        }
        
        // Apply complexity filter
        if (complexityFilter) {
            const [min, max] = complexityFilter.split('-').map(Number);
            filteredFunctions = filteredFunctions.filter(func => 
                func.complexity_score >= min && func.complexity_score <= max
            );
        }
        
        searchState.functions.filteredItems = filteredFunctions;
        renderFunctionsWithPagination();
    }

    function renderFunctionsWithPagination() {
        const { filteredItems, currentPage, itemsPerPage, query } = searchState.functions;
        const totalItems = filteredItems.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageItems = filteredItems.slice(startIndex, endIndex);
        
        // Update results info
        const resultsInfo = document.getElementById('functions-results-info');
        if (query || Object.values(searchState.functions.filters).some(f => f)) {
            resultsInfo.style.display = 'block';
            resultsInfo.innerHTML = `Found ${totalItems} function(s) matching your criteria. Showing ${startIndex + 1}-${Math.min(endIndex, totalItems)} of ${totalItems}.`;
        } else {
            resultsInfo.style.display = 'none';
        }
        
        // Render functions
        renderFunctionsList(pageItems, query);
        
        // Render pagination
        renderPagination('functions', currentPage, totalPages, totalItems);
    }

    function renderFunctionsList(functions, searchQuery = '') {
        const list = document.getElementById('ecg-functions-list');
        if (!list) return;
        
        if (functions.length === 0) {
            if (searchQuery || Object.values(searchState.functions.filters).some(f => f)) {
                list.innerHTML = '<div class="no-results">No functions match your search criteria. Try adjusting your filters.</div>';
            } else {
                list.innerHTML = '<p class="placeholder-text">No functions found. Create a new function.</p>';
            }
            return;
        }
        
        list.innerHTML = functions.map(func => {
            // Highlight search terms
            let name = func.name;
            let filePath = func.file_path;
            let description = func.description || '';
            
            if (searchQuery) {
                const regex = new RegExp(`(${escapeRegex(searchQuery)})`, 'gi');
                name = name.replace(regex, '<span class="highlight">$1</span>');
                filePath = filePath.replace(regex, '<span class="highlight">$1</span>');
                description = description.replace(regex, '<span class="highlight">$1</span>');
            }
            
            return `
                <div class="function-item">
                    <div class="function-header">
                        <h4>${name}</h4>
                        <div class="function-badges">
                            ${func.is_async ? '<span class="badge async">async</span>' : ''}
                            ${func.is_static ? '<span class="badge static">static</span>' : ''}
                            ${func.is_private ? '<span class="badge private">private</span>' : ''}
                            <span class="badge complexity">complexity: ${func.complexity_score}</span>
                        </div>
                    </div>
                    <div class="function-details">
                        <div class="detail"><strong>File:</strong> ${filePath}:${func.line_number || '?'}</div>
                        <div class="detail"><strong>Parameters:</strong> ${func.parameters.length} params</div>
                        ${func.return_type ? `<div class="detail"><strong>Returns:</strong> ${func.return_type}</div>` : ''}
                        ${description ? `<div class="detail"><strong>Description:</strong> ${description}</div>` : ''}
                    </div>
                    <div class="function-actions">
                        <button class="btn btn-sm btn-secondary" onclick="EnhancedCodeGraphManager.editFunction('${func.id}')">✏️ Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="EnhancedCodeGraphManager.deleteFunction('${func.id}')">🗑️ Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    function clearFunctionSearch() {
        document.getElementById('functions-search').value = '';
        document.getElementById('functions-async-filter').value = '';
        document.getElementById('functions-complexity-filter').value = '';
        searchState.functions.query = '';
        searchState.functions.filters = {};
        searchState.functions.currentPage = 1;
        searchFunctions();
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
            document.getElementById('variables-search-container').style.display = 'none';
            document.getElementById('variables-results-info').style.display = 'none';
            document.getElementById('variables-pagination').style.display = 'none';
            return;
        }
        
        try {
            const [variablesResponse, functionsResponse] = await Promise.all([
                fetch(`/api/enhanced-code-graph/projects/${projectId}/variables`),
                fetch(`/api/enhanced-code-graph/projects/${projectId}/functions`)
            ]);
            
            const variables = await variablesResponse.json();
            const functions = await functionsResponse.json();
            
            // Store all variables for searching
            searchState.variables.allItems = variables;
            searchState.variables.currentPage = 1;
            
            // Show search controls
            document.getElementById('variables-search-container').style.display = 'flex';
            
            // Populate function selector and render variables
            populateFunctionSelector(functions);
            searchVariables();
        } catch (error) {
            showStatus('Error loading variables: ' + error.message, 'error');
        }
    }

    function searchVariables() {
        const query = document.getElementById('variables-search').value.toLowerCase();
        const scopeFilter = document.getElementById('variables-scope-filter').value;
        const typeFilter = document.getElementById('variables-type-filter').value;
        
        searchState.variables.query = query;
        searchState.variables.filters = { scopeFilter, typeFilter };
        searchState.variables.currentPage = 1;
        
        let filteredVariables = searchState.variables.allItems || [];
        
        // Apply text search
        if (query) {
            filteredVariables = filteredVariables.filter(variable => 
                variable.name.toLowerCase().includes(query) ||
                (variable.type && variable.type.toLowerCase().includes(query)) ||
                (variable.value && variable.value.toLowerCase().includes(query)) ||
                variable.file_path.toLowerCase().includes(query) ||
                (variable.description && variable.description.toLowerCase().includes(query))
            );
        }
        
        // Apply scope filter
        if (scopeFilter) {
            filteredVariables = filteredVariables.filter(variable => variable.scope === scopeFilter);
        }
        
        // Apply type filter
        if (typeFilter) {
            filteredVariables = filteredVariables.filter(variable => variable.type === typeFilter);
        }
        
        searchState.variables.filteredItems = filteredVariables;
        renderVariablesWithPagination();
    }

    function renderVariablesWithPagination() {
        const { filteredItems, currentPage, itemsPerPage, query } = searchState.variables;
        const totalItems = filteredItems.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageItems = filteredItems.slice(startIndex, endIndex);
        
        // Update results info
        const resultsInfo = document.getElementById('variables-results-info');
        if (query || Object.values(searchState.variables.filters).some(f => f)) {
            resultsInfo.style.display = 'block';
            resultsInfo.innerHTML = `Found ${totalItems} variable(s) matching your criteria. Showing ${startIndex + 1}-${Math.min(endIndex, totalItems)} of ${totalItems}.`;
        } else {
            resultsInfo.style.display = 'none';
        }
        
        // Render variables
        renderVariablesList(pageItems, query);
        
        // Render pagination
        renderPagination('variables', currentPage, totalPages, totalItems);
    }

    function renderVariablesList(variables, searchQuery = '') {
        const list = document.getElementById('ecg-variables-list');
        if (!list) return;
        
        if (variables.length === 0) {
            if (searchQuery || Object.values(searchState.variables.filters).some(f => f)) {
                list.innerHTML = '<div class="no-results">No variables match your search criteria. Try adjusting your filters.</div>';
            } else {
                list.innerHTML = '<p class="placeholder-text">No variables found. Create a new variable.</p>';
            }
            return;
        }
        
        list.innerHTML = variables.map(variable => {
            // Highlight search terms
            let name = variable.name;
            let filePath = variable.file_path;
            let value = variable.value || '';
            let description = variable.description || '';
            
            if (searchQuery) {
                const regex = new RegExp(`(${escapeRegex(searchQuery)})`, 'gi');
                name = name.replace(regex, '<span class="highlight">$1</span>');
                filePath = filePath.replace(regex, '<span class="highlight">$1</span>');
                value = value.replace(regex, '<span class="highlight">$1</span>');
                description = description.replace(regex, '<span class="highlight">$1</span>');
            }
            
            return `
                <div class="variable-item">
                    <div class="variable-header">
                        <h4>${name}</h4>
                        <div class="variable-badges">
                            <span class="badge scope">${variable.scope}</span>
                            ${variable.type ? `<span class="badge type">${variable.type}</span>` : ''}
                            ${variable.declaration_type ? `<span class="badge declaration">${variable.declaration_type}</span>` : ''}
                            ${variable.is_exported ? '<span class="badge exported">exported</span>' : ''}
                        </div>
                    </div>
                    <div class="variable-details">
                        <div class="detail"><strong>File:</strong> ${filePath}:${variable.line_number || '?'}</div>
                        ${value ? `<div class="detail"><strong>Value:</strong> ${value.substring(0, 100)}${value.length > 100 ? '...' : ''}</div>` : ''}
                        ${description ? `<div class="detail"><strong>Description:</strong> ${description}</div>` : ''}
                    </div>
                    <div class="variable-actions">
                        <button class="btn btn-sm btn-secondary" onclick="EnhancedCodeGraphManager.editVariable('${variable.id}')">✏️ Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="EnhancedCodeGraphManager.deleteVariable('${variable.id}')">🗑️ Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    function clearVariableSearch() {
        document.getElementById('variables-search').value = '';
        document.getElementById('variables-scope-filter').value = '';
        document.getElementById('variables-type-filter').value = '';
        searchState.variables.query = '';
        searchState.variables.filters = {};
        searchState.variables.currentPage = 1;
        searchVariables();
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

    // =================================================================
    // DEPENDENCY MANAGEMENT
    // =================================================================

    async function loadDependencies() {
        const projectId = document.getElementById('ecg-project-selector-dependencies').value;
        if (!projectId) {
            document.getElementById('ecg-dependencies-list').innerHTML = '<p class="placeholder-text">Select a project to view dependencies</p>';
            document.getElementById('dependencies-search-container').style.display = 'none';
            document.getElementById('dependencies-results-info').style.display = 'none';
            document.getElementById('dependencies-pagination').style.display = 'none';
            return;
        }
        
        try {
            // Load dependencies, functions, and variables in parallel
            const [dependenciesResponse, functionsResponse, variablesResponse] = await Promise.all([
                fetch(`/api/enhanced-code-graph/projects/${projectId}/dependencies`),
                fetch(`/api/enhanced-code-graph/projects/${projectId}/functions`),
                fetch(`/api/enhanced-code-graph/projects/${projectId}/variables`)
            ]);
            
            const dependencies = await dependenciesResponse.json();
            const functions = await functionsResponse.json();
            const variables = await variablesResponse.json();
            
            // Create lookup maps for names
            const functionNames = {};
            const variableNames = {};
            
            functions.forEach(func => {
                functionNames[func.id] = func.name;
            });
            
            variables.forEach(variable => {
                variableNames[variable.id] = variable.name;
            });
            
            // Enhance dependencies with actual names
            const enhancedDependencies = dependencies.map(dep => ({
                ...dep,
                source_name: dep.source_type === 'function' ? functionNames[dep.source_id] : variableNames[dep.source_id],
                target_name: dep.target_type === 'function' ? functionNames[dep.target_id] : variableNames[dep.target_id]
            }));
            
            // Store all dependencies for searching
            searchState.dependencies.allItems = enhancedDependencies;
            searchState.dependencies.currentPage = 1;
            
            // Show search controls
            document.getElementById('dependencies-search-container').style.display = 'flex';
            
            // Render dependencies with search applied
            searchDependencies();
        } catch (error) {
            showStatus('Error loading dependencies: ' + error.message, 'error');
        }
    }

    function searchDependencies() {
        const query = document.getElementById('dependencies-search').value.toLowerCase();
        const typeFilter = document.getElementById('dependencies-type-filter').value;
        const strengthFilter = document.getElementById('dependencies-strength-filter').value;
        
        searchState.dependencies.query = query;
        searchState.dependencies.filters = { typeFilter, strengthFilter };
        searchState.dependencies.currentPage = 1;
        
        let filteredDependencies = searchState.dependencies.allItems || [];
        
        // Apply text search - now includes actual names
        if (query) {
            filteredDependencies = filteredDependencies.filter(dep => 
                dep.relationship_type.toLowerCase().includes(query) ||
                (dep.context && dep.context.toLowerCase().includes(query)) ||
                (dep.description && dep.description.toLowerCase().includes(query)) ||
                dep.source_type.toLowerCase().includes(query) ||
                dep.target_type.toLowerCase().includes(query) ||
                // NEW: Search by actual names instead of IDs
                (dep.source_name && dep.source_name.toLowerCase().includes(query)) ||
                (dep.target_name && dep.target_name.toLowerCase().includes(query))
            );
        }
        
        // Apply relationship type filter
        if (typeFilter) {
            filteredDependencies = filteredDependencies.filter(dep => dep.relationship_type === typeFilter);
        }
        
        // Apply strength filter
        if (strengthFilter) {
            const [min, max] = strengthFilter.split('-').map(Number);
            filteredDependencies = filteredDependencies.filter(dep => 
                dep.relationship_strength >= min && dep.relationship_strength <= max
            );
        }
        
        searchState.dependencies.filteredItems = filteredDependencies;
        renderDependenciesWithPagination();
    }

    function renderDependenciesWithPagination() {
        const { filteredItems, currentPage, itemsPerPage, query } = searchState.dependencies;
        const totalItems = filteredItems.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageItems = filteredItems.slice(startIndex, endIndex);
        
        // Update results info
        const resultsInfo = document.getElementById('dependencies-results-info');
        if (query || Object.values(searchState.dependencies.filters).some(f => f)) {
            resultsInfo.style.display = 'block';
            resultsInfo.innerHTML = `Found ${totalItems} dependenc(y/ies) matching your criteria. Showing ${startIndex + 1}-${Math.min(endIndex, totalItems)} of ${totalItems}.`;
        } else {
            resultsInfo.style.display = 'none';
        }
        
        // Render dependencies
        renderDependenciesList(pageItems, query);
        
        // Render pagination
        renderPagination('dependencies', currentPage, totalPages, totalItems);
    }

    function renderDependenciesList(dependencies, searchQuery = '') {
        const list = document.getElementById('ecg-dependencies-list');
        if (!list) return;
        
        if (dependencies.length === 0) {
            if (searchQuery || Object.values(searchState.dependencies.filters).some(f => f)) {
                list.innerHTML = '<div class="no-results">No dependencies match your search criteria. Try adjusting your filters.</div>';
            } else {
                list.innerHTML = '<p class="placeholder-text">No dependencies found. Create a new dependency.</p>';
            }
            return;
        }
        
        list.innerHTML = dependencies.map(dep => {
            // Highlight search terms
            let relationshipType = dep.relationship_type;
            let context = dep.context || '';
            let description = dep.description || '';
            let sourceName = dep.source_name || 'Unknown';
            let targetName = dep.target_name || 'Unknown';
            
            if (searchQuery) {
                const regex = new RegExp(`(${escapeRegex(searchQuery)})`, 'gi');
                relationshipType = relationshipType.replace(regex, '<span class="highlight">$1</span>');
                context = context.replace(regex, '<span class="highlight">$1</span>');
                description = description.replace(regex, '<span class="highlight">$1</span>');
                sourceName = sourceName.replace(regex, '<span class="highlight">$1</span>');
                targetName = targetName.replace(regex, '<span class="highlight">$1</span>');
            }
            
            // Get appropriate icons for source and target types
            const sourceIcon = dep.source_type === 'function' ? '📊' : '🔢';
            const targetIcon = dep.target_type === 'function' ? '📊' : '🔢';
            
            return `
                <div class="dependency-item">
                    <div class="dependency-header">
                        <h4>${relationshipType}</h4>
                        <div class="dependency-badges">
                            <span class="badge strength">strength: ${dep.relationship_strength}</span>
                            ${dep.context ? `<span class="badge context">context</span>` : ''}
                        </div>
                    </div>
                    <div class="dependency-details">
                        <div class="detail">
                            <strong>From:</strong> ${sourceIcon} <strong>${sourceName}</strong> 
                            <span class="element-type">(${dep.source_type})</span>
                        </div>
                        <div class="detail">
                            <strong>To:</strong> ${targetIcon} <strong>${targetName}</strong> 
                            <span class="element-type">(${dep.target_type})</span>
                        </div>
                        ${context ? `<div class="detail"><strong>Context:</strong> ${context}</div>` : ''}
                        ${description ? `<div class="detail"><strong>Description:</strong> ${description}</div>` : ''}
                        ${dep.line_number ? `<div class="detail"><strong>Line:</strong> ${dep.line_number}</div>` : ''}
                    </div>
                    <div class="dependency-actions">
                        <button class="btn btn-sm btn-secondary" onclick="EnhancedCodeGraphManager.editDependency('${dep.id}')">✏️ Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="EnhancedCodeGraphManager.deleteDependency('${dep.id}')">🗑️ Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    function clearDependencySearch() {
        document.getElementById('dependencies-search').value = '';
        document.getElementById('dependencies-type-filter').value = '';
        document.getElementById('dependencies-strength-filter').value = '';
        searchState.dependencies.query = '';
        searchState.dependencies.filters = {};
        searchState.dependencies.currentPage = 1;
        searchDependencies();
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
            // Add view mode selector
            const viewMode = document.getElementById('graph-view-mode')?.value || 'macro';
            
            const response = await fetch(`/api/enhanced-code-graph/visualization/${projectId}?mode=${viewMode}`);
            const data = await response.json();
            
            currentVisualizationData = data;
            renderEnhancedMultiLevelGraph(data, viewMode);
            
            showStatus(`Loaded ${viewMode} graph for project with ${data.nodes.length} nodes and ${data.edges.length} edges`);
        } catch (error) {
            showStatus('Error loading graph visualization: ' + error.message, 'error');
        }
    }

    function renderEnhancedMultiLevelGraph(data, viewMode) {
        // Add view mode selector to graph header
        const viewHeader = document.querySelector('#ecg-graph-view .view-actions');
        if (!document.getElementById('graph-view-mode')) {
            const viewModeSelector = document.createElement('select');
            viewModeSelector.id = 'graph-view-mode';
            viewModeSelector.innerHTML = `
                <option value="macro">Macro View (Modules/Libraries)</option>
                <option value="micro">Micro View (Functions/Variables)</option>
                <option value="hybrid">Hybrid View (Both)</option>
            `;
            viewModeSelector.onchange = () => loadGraphVisualization();
            viewHeader.insertBefore(viewModeSelector, viewHeader.firstChild);
        }
        
        document.getElementById('graph-view-mode').value = viewMode;
        
        // Render based on mode
        switch (viewMode) {
            case 'macro':
                renderMacroGraphActual(data);
                break;
            case 'micro':
                renderMicroGraphActual(data);
                break;
            case 'hybrid':
                renderHybridGraphActual(data);
                break;
        }
    }

    function renderMacroGraphActual(data) {
        renderActualGraph(data, 'macro');
    }

    function renderMicroGraphActual(data) {
        renderActualGraph(data, 'micro');
    }

    function renderHybridGraphActual(data) {
        renderActualGraph(data, 'hybrid');
    }

    function renderActualGraph(data, viewMode) {
            const container = document.getElementById('ecg-graph-container');
        if (!container) return;
        
        // Clear previous graph
        container.innerHTML = '';
        
        if (!data.nodes || data.nodes.length === 0) {
            container.innerHTML = `
                <div class="graph-placeholder">
                    <h3>${viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} View</h3>
                    <p>No data to visualize. Create some functions, variables, and dependencies first.</p>
            </div>
        `;
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
            .style('border-radius', '8px')
            .style('background', '#fafafa');
        
        // Create zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.1, 3])
            .on('zoom', function(event) {
                g.attr('transform', event.transform);
            });
        
        svg.call(zoom);
        
        // Create main group for zooming/panning
        const g = svg.append('g');
        
        // Store references for other functions
        window.currentGraphElements = { g, zoom };
        
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
            name: d.label || d.name,
            group: d.type === 'function' ? 1 : 2
        }));
        
        const links = data.edges.map(d => ({
            source: d.source,
            target: d.target,
            relationship: d.relationship,
            sourceType: d.sourceType,
            targetType: d.targetType,
            originalEdge: d
        }));
        
        // Create force simulation
        simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id).distance(100))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(d => {
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
        
        // Create nodes (vertices)
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
        
        // Add title
        const title = container.insertBefore(document.createElement('div'), container.firstChild);
        title.style.cssText = 'padding: 10px; background: #f8f9fa; border-bottom: 1px solid #e1e5e9; font-weight: bold;';
        title.innerHTML = `
            ${viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} View - 
            ${data.nodes.length} nodes, ${data.edges.length} relationships
        `;
    }

    function getNodeColor(node) {
        if (node.type === 'function') {
            return node.is_async ? '#FF6B6B' : '#4ECDC4';
        } else if (node.type === 'variable') {
            switch (node.scope) {
                case 'parameter': return '#95E1D3';
                case 'local': return '#F3D2A7';
                case 'global': return '#FFAAA5';
                default: return '#C7CEEA';
            }
        }
        return '#999';
    }

    function getEdgeColor(relationship) {
        switch (relationship) {
            case 'calls': return '#FF6B6B';
            case 'uses': return '#4ECDC4';
            case 'assigns': return '#45B7D1';
            case 'passes_to': return '#96CEB4';
            case 'chains_to': return '#FFEAA7';
            case 'transforms_via': return '#DDA0DD';
            default: return '#666';
        }
    }

    // Remove the broken functions completely
    function renderMacroGraph(data) {
        renderMacroGraphActual(data);
    }

    function renderMicroGraph(data) {
        renderMicroGraphActual(data);
    }

    function renderHybridGraph(data) {
        renderHybridGraphActual(data);
    }

    function resetGraphLayout() {
        if (simulation) {
            simulation.alpha(1).restart();
        }
    }

    function fitGraphToView() {
        if (!svg || !window.currentGraphElements) return;
        
        const { g, zoom } = window.currentGraphElements;
        const bounds = g.node().getBBox();
        
        let width, height;
        if (isFullscreen) {
            width = window.innerWidth - 40;
            height = window.innerHeight - 120;
        } else {
            const container = document.getElementById('ecg-graph-container');
            width = container.clientWidth || 800;
            height = 600;
        }
        
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

    function handleZoom(scale) {
        if (!svg || !window.currentGraphElements) return;
        
        const { zoom } = window.currentGraphElements;
        let width, height;
        
        if (isFullscreen) {
            width = window.innerWidth - 40;
            height = window.innerHeight - 120;
            // Sync zoom sliders
            const normalSlider = document.getElementById('ecg-zoom-slider');
            const fullscreenSlider = document.getElementById('ecg-fullscreen-zoom-slider');
            if (normalSlider && fullscreenSlider) {
                normalSlider.value = scale;
                fullscreenSlider.value = scale;
            }
        } else {
            const container = document.getElementById('ecg-graph-container');
            width = container.clientWidth || 800;
            height = 600;
        }
        
        svg.transition().duration(300).call(
            zoom.transform,
            d3.zoomIdentity.translate(width / 2, height / 2).scale(scale).translate(-width / 2, -height / 2)
        );
    }

    function toggleFullscreen() {
        if (!isFullscreen) {
            enterFullscreen();
        } else {
            exitFullscreen();
        }
    }

    function enterFullscreen() {
        const graphContainer = document.getElementById('ecg-graph-container');
        if (!graphContainer) return;
        
        // Store original container reference
        originalContainer = graphContainer;
        
        // Create fullscreen overlay
        const fullscreenOverlay = document.createElement('div');
        fullscreenOverlay.id = 'ecg-fullscreen-overlay';
        fullscreenOverlay.className = 'ecg-fullscreen-overlay';
        fullscreenOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: white;
            z-index: 10000;
            display: flex;
            flex-direction: column;
        `;
        
        // Create fullscreen controls
        const fullscreenControls = document.createElement('div');
        fullscreenControls.className = 'ecg-fullscreen-controls';
        fullscreenControls.style.cssText = `
            padding: 20px;
            border-bottom: 1px solid #e1e5e9;
            background: #f8f9fa;
        `;
        fullscreenControls.innerHTML = `
            <div class="ecg-fullscreen-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin: 0;">Enhanced Code Graph - Fullscreen</h3>
                <button class="btn btn-sm" onclick="EnhancedCodeGraphManager.exitFullscreen()" style="background: #dc3545; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                    ✕ Exit Fullscreen
                </button>
            </div>
            <div class="ecg-fullscreen-graph-controls" style="display: flex; gap: 10px; align-items: center;">
                <button class="btn btn-sm" onclick="EnhancedCodeGraphManager.resetGraphLayout()" style="padding: 6px 12px; border: 1px solid #ccc; background: white; border-radius: 4px; cursor: pointer;">Reset Layout</button>
                <button class="btn btn-sm" onclick="EnhancedCodeGraphManager.fitGraphToView()" style="padding: 6px 12px; border: 1px solid #ccc; background: white; border-radius: 4px; cursor: pointer;">Fit to View</button>
                <label style="display: flex; align-items: center; gap: 8px;">
                    <input type="range" id="ecg-fullscreen-zoom-slider" min="0.1" max="3" step="0.1" value="1" onchange="EnhancedCodeGraphManager.handleZoom(this.value)" style="width: 150px;">
                    Zoom
                </label>
            </div>
        `;
        
        // Create fullscreen graph container
        const fullscreenGraphContainer = document.createElement('div');
        fullscreenGraphContainer.id = 'ecg-fullscreen-graph-container';
        fullscreenGraphContainer.className = 'ecg-fullscreen-graph-container';
        fullscreenGraphContainer.style.cssText = `
            flex: 1;
            padding: 20px;
            overflow: hidden;
        `;
        
        // Move the SVG to fullscreen container
        const svg = graphContainer.querySelector('svg');
        if (svg) {
            fullscreenGraphContainer.appendChild(svg);
        }
        
        // Assemble fullscreen overlay
        fullscreenOverlay.appendChild(fullscreenControls);
        fullscreenOverlay.appendChild(fullscreenGraphContainer);
        
        // Add to document
        document.body.appendChild(fullscreenOverlay);
        
        // Update state
        isFullscreen = true;
        
        // Resize graph for fullscreen
        setTimeout(() => {
            resizeGraphForFullscreen();
        }, 100);
        
        // Add escape key listener
        document.addEventListener('keydown', handleFullscreenEscape);
        
        console.log('Entered enhanced code graph fullscreen mode');
    }

    function exitFullscreen() {
        const fullscreenOverlay = document.getElementById('ecg-fullscreen-overlay');
        const fullscreenGraphContainer = document.getElementById('ecg-fullscreen-graph-container');
        
        if (fullscreenOverlay && fullscreenGraphContainer && originalContainer) {
            // Move SVG back to original container
            const svg = fullscreenGraphContainer.querySelector('svg');
            if (svg) {
                originalContainer.appendChild(svg);
            }
            
            // Remove fullscreen overlay
            document.body.removeChild(fullscreenOverlay);
            
            // Update state
            isFullscreen = false;
            originalContainer = null;
            
            // Resize graph back to normal
            setTimeout(() => {
                resizeGraphForNormal();
            }, 100);
            
            // Remove escape key listener
            document.removeEventListener('keydown', handleFullscreenEscape);
            
            console.log('Exited enhanced code graph fullscreen mode');
        }
    }

    function resizeGraphForFullscreen() {
        const svg = d3.select('#ecg-fullscreen-graph-container svg');
        if (svg.empty()) return;
        
        const width = window.innerWidth - 40; // Account for padding
        const height = window.innerHeight - 120; // Account for controls
        
        svg.attr('width', width).attr('height', height);
        
        // Update force simulation center
        if (simulation) {
            simulation.force('center', d3.forceCenter(width / 2, height / 2));
            simulation.alpha(0.3).restart();
        }
        
        // Sync zoom sliders
        const fullscreenZoomSlider = document.getElementById('ecg-fullscreen-zoom-slider');
        const originalZoomSlider = document.getElementById('ecg-zoom-slider');
        if (fullscreenZoomSlider && originalZoomSlider) {
            fullscreenZoomSlider.value = originalZoomSlider.value;
        }
    }

    function resizeGraphForNormal() {
        const container = document.getElementById('ecg-graph-container');
        const svg = d3.select(container).select('svg');
        if (svg.empty()) return;
        
        const width = container.clientWidth || 800;
        const height = 600;
        
        svg.attr('width', width).attr('height', height);
        
        // Update force simulation center
        if (simulation) {
            simulation.force('center', d3.forceCenter(width / 2, height / 2));
            simulation.alpha(0.3).restart();
        }
    }

    function handleFullscreenEscape(event) {
        if (event.key === 'Escape' && isFullscreen) {
            exitFullscreen();
        }
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
        
        const properties = getNodeProperties(node);
        
        tooltip.innerHTML = `
            <div class="tooltip-header" style="cursor: move;">
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
        tooltip.style.background = 'white';
        tooltip.style.border = '1px solid #ccc';
        tooltip.style.borderRadius = '8px';
        tooltip.style.padding = '16px';
        tooltip.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        tooltip.style.maxWidth = '400px';
        
        // Make tooltip draggable
        makeDraggable(tooltip);
        
        // Add animation
        tooltip.style.opacity = '0';
        tooltip.style.transform = 'translate(-50%, -50%) scale(0.8)';
        setTimeout(() => {
            tooltip.style.transition = 'all 0.3s ease';
            tooltip.style.opacity = '1';
            tooltip.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 10);
    }

    // Add the comprehensive getNodeProperties function from newCodeGraphManager.js
    function getNodeProperties(node) {
        const properties = [];
        
        properties.push(`Type: ${node.type}`);
        properties.push(`Location: ${node.file}:${node.line || '?'}`);
        
        if (node.scope) {
            properties.push(`Scope: ${node.scope}`);
        }
        
        if (node.type === 'function') {
            if (node.isAsync) {
                properties.push('🔄 Asynchronous function');
            }
            
            // Fix: Safely parse parameters
            if (node.parameters) {
                let params = [];
                try {
                    // If it's a string, try to parse it as JSON
                    if (typeof node.parameters === 'string') {
                        params = JSON.parse(node.parameters);
                    } else if (Array.isArray(node.parameters)) {
                        params = node.parameters;
                    }
                    
                    if (params && params.length > 0) {
                        const paramNames = params.map(p => {
                            if (typeof p === 'string') return p;
                            if (typeof p === 'object' && p.name) return p.name;
                            return String(p);
                        });
                        properties.push(`Parameters: ${paramNames.join(', ')}`);
                    }
                } catch (e) {
                    console.warn('Error parsing parameters for node:', node.label, e);
                    // Fallback: treat as string
                    if (typeof node.parameters === 'string' && node.parameters.length > 0) {
                        properties.push(`Parameters: ${node.parameters}`);
                    }
                }
            }
            
            if (node.file === 'built-in') {
                properties.push('🔧 JavaScript built-in method');
            } else if (node.file && node.file.includes('Node.js')) {
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

    function showDetailedEdgeTooltip(edge, sourceNode, targetNode) {
        // Remove any existing tooltips
        const existingTooltips = document.querySelectorAll('.detailed-tooltip');
        existingTooltips.forEach(tooltip => tooltip.remove());
        
        const tooltip = document.createElement('div');
        tooltip.className = 'detailed-tooltip edge-tooltip';
        
        const properties = getEdgeProperties(edge, sourceNode, targetNode);
        
        tooltip.innerHTML = `
            <div class="tooltip-header" style="cursor: move;">
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
        tooltip.style.background = 'white';
        tooltip.style.border = '1px solid #ccc';
        tooltip.style.borderRadius = '8px';
        tooltip.style.padding = '16px';
        tooltip.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        tooltip.style.maxWidth = '400px';
        
        // Make tooltip draggable
        makeDraggable(tooltip);
        
        // Add animation
        tooltip.style.opacity = '0';
        tooltip.style.transform = 'translate(-50%, -50%) scale(0.8)';
        setTimeout(() => {
            tooltip.style.transition = 'all 0.3s ease';
            tooltip.style.opacity = '1';
            tooltip.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 10);
    }

    // Add the comprehensive getEdgeProperties function from newCodeGraphManager.js
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

    // Add draggable functionality
    function makeDraggable(element) {
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;
        
        const header = element.querySelector('.tooltip-header');
        if (!header) return;
        
        header.addEventListener('mousedown', dragStart);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);
        
        function dragStart(e) {
            // Don't drag if clicking the close button
            if (e.target.classList.contains('tooltip-close')) {
                return;
            }
            
            // Get current position
            const rect = element.getBoundingClientRect();
            
            initialX = e.clientX - rect.left;
            initialY = e.clientY - rect.top;
            
            if (e.target === header || header.contains(e.target)) {
                isDragging = true;
                
                // Remove transform and transition for dragging
                element.style.transition = 'none';
                element.style.transform = 'none';
                
                // Set initial position
                element.style.left = rect.left + 'px';
                element.style.top = rect.top + 'px';
                
                xOffset = rect.left;
                yOffset = rect.top;
            }
        }
        
        function drag(e) {
            if (isDragging) {
                e.preventDefault();
                
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
                
                xOffset = currentX;
                yOffset = currentY;
                
                // Constrain to viewport
                const maxX = window.innerWidth - element.offsetWidth;
                const maxY = window.innerHeight - element.offsetHeight;
                
                xOffset = Math.max(0, Math.min(xOffset, maxX));
                yOffset = Math.max(0, Math.min(yOffset, maxY));
                
                element.style.left = xOffset + 'px';
                element.style.top = yOffset + 'px';
            }
        }
        
        function dragEnd(e) {
            if (isDragging) {
                isDragging = false;
                
                // Store final position
                const rect = element.getBoundingClientRect();
                element.style.left = rect.left + 'px';
                element.style.top = rect.top + 'px';
            }
        }
        
        // Prevent text selection during drag
        header.addEventListener('selectstart', function(e) {
            e.preventDefault();
        });
        
        // Add visual feedback
        header.addEventListener('mouseenter', function() {
            header.style.backgroundColor = '#f8f9fa';
        });
        
        header.addEventListener('mouseleave', function() {
            if (!isDragging) {
                header.style.backgroundColor = '';
            }
        });
    }

    
// =================================================================
// EXPORT/IMPORT FUNCTIONALITY
// =================================================================

async function exportProject(projectId) {
    try {
      showStatus('Exporting project structure...', 'info');
      
      const response = await fetch(`/api/enhanced-code-graph/projects/${projectId}/export`);
      
      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }
      
      const exportData = await response.json();
      
      // Create download
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      
      // Get project name for filename
      const project = projects.find(p => p.id === projectId);
      const filename = `${(project?.name || 'project').replace(/[^a-zA-Z0-9]/g, '_')}_export_${new Date().toISOString().split('T')[0]}.json`;
      
      // Create download link
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showStatus(`Project structure exported successfully as ${filename}!`);
    } catch (error) {
      showStatus('Error exporting project: ' + error.message, 'error');
    }
  }
  
  function showImportModal() {
    // Get the existing modal
    const modal = document.getElementById('ecg-import-modal');
    if (!modal) {
      console.error('Import modal not found');
      return;
    }
    
    // Reset modal content
    const modalBody = modal.querySelector('.ecg-modal-body');
    
    modalBody.innerHTML = `
      <div class="import-tabs">
        <button class="tab-button active" onclick="EnhancedCodeGraphManager.switchImportTab('file')">Upload JSON File</button>
        <button class="tab-button" onclick="EnhancedCodeGraphManager.switchImportTab('templates')">Load from Templates</button>
      </div>
      
      <div id="import-tab-file" class="import-tab active">
        <div class="form-group">
          <label for="importFile">Select exported JSON file:</label>
          <input type="file" id="importFile" accept=".json" onchange="EnhancedCodeGraphManager.handleImportFile(this)">
          <div class="file-info">Choose a JSON file exported from another Enhanced Code Graph project</div>
        </div>
        
        <div id="import-preview" style="display: none;">
          <!-- Preview content will be added here -->
        </div>
        
        <div class="form-group">
          <label for="importProjectName">Project Name (optional):</label>
          <input type="text" id="importProjectName" placeholder="Leave empty to use original name + timestamp">
        </div>
      </div>
      
      <div id="import-tab-templates" class="import-tab" style="display: none;">
        <div class="template-list-container">
          <h4>Available Template Files</h4>
          <div id="template-files-list">
            <div class="loading">Loading templates...</div>
          </div>
        </div>
        
        <div class="form-group">
          <label for="templateProjectName">Project Name (optional):</label>
          <input type="text" id="templateProjectName" placeholder="Leave empty to use template name + timestamp">
        </div>
      </div>
      
      <div class="modal-actions">
        <button type="button" onclick="EnhancedCodeGraphManager.confirmImport()" class="btn btn-primary" id="confirmImportBtn" disabled>
          Import Project
        </button>
        <button type="button" onclick="EnhancedCodeGraphManager.hideModal('ecg-import-modal')" class="btn btn-secondary">
          Cancel
        </button>
      </div>
    `;
    
    showModal('ecg-import-modal');
    
    // Load template files for the templates tab
    loadTemplateFiles();
  }

  function handleImportFile(input) {
    const file = input.files[0];
    if (!file) {
      document.getElementById('confirmImportBtn').disabled = true;
      return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const importData = JSON.parse(e.target.result);
        
        // Validate the import data structure
        if (!importData.template || !importData.metadata) {
          throw new Error('Invalid import file format. Expected enhanced code graph export format.');
        }
        
        // Store import data globally for use in confirmImport
        window.pendingImportData = importData;
        
        // Show preview
        showImportPreview(importData);
        
        // Enable import button
        document.getElementById('confirmImportBtn').disabled = false;
        document.getElementById('confirmImportBtn').textContent = 'Import Project';
        
      } catch (error) {
        showStatus('Error reading import file: ' + error.message, 'error');
        document.getElementById('confirmImportBtn').disabled = true;
        window.pendingImportData = null;
      }
    };
    
    reader.readAsText(file);
  }

  function showImportPreview(importData) {
    const previewDiv = document.getElementById('import-preview');
    const template = importData.template;
    const metadata = importData.metadata;
    
    previewDiv.innerHTML = `
      <div class="import-preview-card">
        <h4>📋 Import Preview</h4>
        <div class="preview-section">
          <h5>Project Information</h5>
          <div class="preview-item"><strong>Name:</strong> ${template.display_name || template.name}</div>
          <div class="preview-item"><strong>Description:</strong> ${template.description}</div>
          ${metadata.originalProject ? `
            <div class="preview-item"><strong>Original Path:</strong> ${metadata.originalProject.path}</div>
            <div class="preview-item"><strong>Language:</strong> ${metadata.originalProject.language || 'Not specified'}</div>
          ` : ''}
        </div>
        
        <div class="preview-section">
          <h5>Content Summary</h5>
          <div class="preview-stats">
            <div class="stat-item">
              <span class="stat-number">${template.functions?.length || 0}</span>
              <span class="stat-label">Functions</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">${template.variables?.length || 0}</span>
              <span class="stat-label">Variables</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">${template.relationships?.length || 0}</span>
              <span class="stat-label">Relationships</span>
            </div>
          </div>
        </div>
        
        ${metadata.statistics ? `
        <div class="preview-section">
          <h5>Export Details</h5>
          <div class="preview-item"><strong>Exported:</strong> ${new Date(metadata.exportedAt).toLocaleDateString()}</div>
          <div class="preview-item"><strong>Version:</strong> ${metadata.version}</div>
          <div class="preview-item"><strong>Relationship Types:</strong> ${metadata.statistics.relationship_types?.join(', ') || 'Various'}</div>
        </div>
        ` : ''}
      </div>
    `;
    
    previewDiv.style.display = 'block';
  }

  async function confirmImport() {
    const activeTab = document.querySelector('.import-tab.active');
    
    if (activeTab.id === 'import-tab-file') {
      // File import logic
      if (!window.pendingImportData) {
        showStatus('No import data available', 'error');
        return;
      }
      
      const customName = document.getElementById('importProjectName').value.trim();
      
      try {
        // FIX: Add missing /api prefix
        const response = await fetch('/api/enhanced-code-graph/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            importData: window.pendingImportData,
            customName: customName || null
          })
        });
        
        const result = await response.json();
        
        if (result.success) {
          showStatus(`Successfully imported project: ${result.project.name}`, 'success');
          hideModal('ecg-import-modal');
          loadProjects();
          window.pendingImportData = null;
        } else {
          showStatus(`Import failed: ${result.error}`, 'error');
        }
      } catch (error) {
        console.error('Import error:', error);
        showStatus(`Import failed: ${error.message}`, 'error');
      }
    } else if (activeTab.id === 'import-tab-templates') {
      // Template file import logic
      const selectedTemplate = document.querySelector('.template-file-item.selected');
      if (!selectedTemplate) {
        showStatus('Please select a template first', 'error');
        return;
      }
      
      const filename = selectedTemplate.dataset.filename;
      const customName = document.getElementById('templateProjectName').value.trim();
      
      try {
        // FIX: Add missing /api prefix
        const response = await fetch('/api/enhanced-code-graph/import-from-template', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: filename,
            customName: customName || null
          })
        });
        
        const result = await response.json();
        
        if (result.success) {
          showStatus(`Successfully imported project from template: ${result.project.name}`, 'success');
          hideModal('ecg-import-modal');
          loadProjects();
        } else {
          showStatus(`Template import failed: ${result.error}`, 'error');
        }
      } catch (error) {
        console.error('Template import error:', error);
        showStatus(`Template import failed: ${error.message}`, 'error');
      }
    }
  }
  
  function switchImportTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[onclick="EnhancedCodeGraphManager.switchImportTab('${tabName}')"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.import-tab').forEach(tab => {
      tab.style.display = 'none';
      tab.classList.remove('active');
    });
    
    const activeTab = document.getElementById(`import-tab-${tabName}`);
    activeTab.style.display = 'block';
    activeTab.classList.add('active');
    
    // Reset import button
    document.getElementById('confirmImportBtn').disabled = true;
    document.getElementById('confirmImportBtn').textContent = 'Import Project';
    
    // Clear any previous selections/data
    if (tabName === 'file') {
      window.pendingImportData = null;
      const importPreview = document.getElementById('import-preview');
      if (importPreview) {
        importPreview.style.display = 'none';
      }
    } else if (tabName === 'templates') {
      document.querySelectorAll('.template-file-item').forEach(item => {
        item.classList.remove('selected');
      });
    }
  }
  
  async function loadTemplateFiles() {
    try {
      // Fix: Add the correct API prefix
      const response = await fetch('/api/enhanced-code-graph/template-files');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const templateFiles = await response.json();
      renderTemplateFilesList(templateFiles);
    } catch (error) {
      console.error('Error loading template files:', error);
      document.getElementById('template-files-list').innerHTML = `
        <div class="error">Error loading template files: ${error.message}</div>
      `;
    }
  }
  
  function renderTemplateFilesList(templateFiles) {
    const container = document.getElementById('template-files-list');
    
    if (templateFiles.length === 0) {
      container.innerHTML = `
        <div class="no-templates">
          <p>No template files found.</p>
          <p>To add templates:</p>
          <ol>
            <li>Export a project using the "Export Project" button</li>
            <li>Save the JSON file in the <code>templates/</code> directory</li>
            <li>Refresh this list</li>
          </ol>
        </div>
      `;
      return;
    }
    
    container.innerHTML = templateFiles.map(template => `
      <div class="template-file-item ${template.error ? 'error' : ''}" 
           data-filename="${template.filename}" 
           onclick="EnhancedCodeGraphManager.selectTemplateFile('${template.filename}')">
        <div class="template-header">
          <h5>${template.name}</h5>
          <div class="template-stats">
            ${template.functionCount} functions, ${template.variableCount} variables, ${template.relationshipCount} relationships
          </div>
        </div>
        <div class="template-description">${template.description}</div>
        <div class="template-meta">
          <small>File: ${template.filename} | Size: ${(template.size / 1024).toFixed(1)}KB | Modified: ${new Date(template.modified).toLocaleDateString()}</small>
        </div>
        ${template.error ? '<div class="template-error">⚠️ Error reading this template file</div>' : ''}
      </div>
    `).join('');
  }
  
  function selectTemplateFile(filename) {
    // Remove previous selections
    document.querySelectorAll('.template-file-item').forEach(item => {
      item.classList.remove('selected');
    });
    
    // Select current item
    const selectedItem = document.querySelector(`[data-filename="${filename}"]`);
    selectedItem.classList.add('selected');
    
    // Store selected filename
    selectedItem.dataset.selected = 'true';
    
    // Enable import button
    document.getElementById('confirmImportBtn').disabled = false;
    
    // Update button text
    document.getElementById('confirmImportBtn').textContent = 'Import from Template';
  }
  
  async function confirmImport() {
    const activeTab = document.querySelector('.import-tab.active');
    
    if (activeTab.id === 'import-tab-file') {
      // Original file import logic
      if (!window.pendingImportData) {
        showStatus('Please select a file first', 'error');
        return;
      }
      
      const customName = document.getElementById('importProjectName').value.trim();
      
      try {
        const response = await fetch('/api/enhanced-code-graph/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            importData: window.pendingImportData,
            customName: customName || null
          })
        });
        
        const result = await response.json();
        
        if (result.success) {
          showStatus(`Successfully imported project: ${result.project.name}`, 'success');
          hideModal('ecg-import-modal');
          loadProjects();
          window.pendingImportData = null;
        } else {
          showStatus(`Import failed: ${result.error}`, 'error');
        }
      } catch (error) {
        console.error('Import error:', error);
        showStatus(`Import failed: ${error.message}`, 'error');
      }
    } else if (activeTab.id === 'import-tab-templates') {
      // Template file import logic
      const selectedTemplate = document.querySelector('.template-file-item.selected');
      if (!selectedTemplate) {
        showStatus('Please select a template first', 'error');
        return;
      }
      
      const filename = selectedTemplate.dataset.filename;
      const customName = document.getElementById('templateProjectName').value.trim();
      
      try {
        const response = await fetch('/api/enhanced-code-graph/import-from-template', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: filename,
            customName: customName || null
          })
        });
        
        const result = await response.json();
        
        if (result.success) {
          showStatus(`Successfully imported project from template: ${result.project.name}`, 'success');
          hideModal('ecg-import-modal');
          loadProjects();
        } else {
          showStatus(`Template import failed: ${result.error}`, 'error');
        }
      } catch (error) {
        console.error('Template import error:', error);
        showStatus(`Template import failed: ${error.message}`, 'error');
      }
    }
  }

  function showUpdateImportModal(projectId) {
    const updateImportModal = document.createElement('div');
    updateImportModal.id = 'ecg-update-import-modal';
    updateImportModal.className = 'ecg-modal';
    updateImportModal.innerHTML = `
      <div class="ecg-modal-content">
        <div class="ecg-modal-header">
          <h3>Update Project from Import</h3>
          <button class="close-btn" onclick="EnhancedCodeGraphManager.hideModal('ecg-update-import-modal')">&times;</button>
        </div>
        <div class="ecg-modal-body">
          <div class="form-group">
            <label for="update-import-file">Select Modified Export File</label>
            <input type="file" id="update-import-file" accept=".json" onchange="EnhancedCodeGraphManager.handleUpdateImportFile(this, '${projectId}')">
            <small class="help-text">Select the JSON file with your modifications</small>
          </div>
          
          <div class="form-group">
            <h4>Update Options</h4>
            <label>
              <input type="checkbox" id="update-project-info" checked> Update project information
            </label>
            <label>
              <input type="checkbox" id="remove-absent-elements"> Remove elements not in import
              <small class="help-text">⚠️ This will delete functions/variables that aren't in the import file</small>
            </label>
            <label>
              <input type="checkbox" id="update-dependencies" checked> Update dependencies
            </label>
          </div>
          
          <div id="update-import-preview" class="import-preview" style="display: none;">
            <h4>Update Preview</h4>
            <div id="update-import-details"></div>
          </div>
        </div>
        <div class="ecg-modal-footer">
          <button class="btn btn-secondary" onclick="EnhancedCodeGraphManager.hideModal('ecg-update-import-modal')">Cancel</button>
          <button class="btn btn-primary" id="update-import-confirm-btn" onclick="EnhancedCodeGraphManager.confirmUpdateImport('${projectId}')" disabled>Update Project</button>
        </div>
      </div>
    `;
    
    container.appendChild(updateImportModal);
    showModal('ecg-update-import-modal');
  }

  function handleUpdateImportFile(input, projectId) {
    const file = input.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const importData = JSON.parse(e.target.result);
        
        // Validate import data
        if (!importData.metadata || !importData.template) {
          throw new Error('Invalid export file format');
        }
        
        if (importData.metadata.exportType !== 'enhanced_code_graph_project') {
          throw new Error('This file is not an Enhanced Code Graph project export');
        }
        
        // Show preview with diff info
        showUpdateImportPreview(importData);
        
        // Store import data for confirmation
        window.currentUpdateImportData = importData;
        
        // Enable update button
        document.getElementById('update-import-confirm-btn').disabled = false;
        
      } catch (error) {
        showStatus('Error reading import file: ' + error.message, 'error');
        document.getElementById('update-import-preview').style.display = 'none';
        document.getElementById('update-import-confirm-btn').disabled = true;
      }
    };
    reader.readAsText(file);
  }

  function showUpdateImportPreview(importData) {
    const preview = document.getElementById('update-import-preview');
    const details = document.getElementById('update-import-details');
    
    const original = importData.metadata.originalProject;
    const stats = importData.metadata.statistics;
    
    details.innerHTML = `
      <div class="import-project-info">
        <h5>Import Source: ${original.name}</h5>
        <p><strong>Last Exported:</strong> ${new Date(importData.metadata.exportedAt).toLocaleString()}</p>
        <div class="update-warning">
          <p>⚠️ <strong>This will update your existing project with the imported changes.</strong></p>
          <p>Functions and variables with the same names will be updated.</p>
          <p>New elements will be added. Check options to remove absent elements.</p>
        </div>
      </div>
      <div class="import-statistics">
        <h5>Import Contains</h5>
        <div class="stats-grid">
          <div class="stat">
            <span class="stat-number">${stats.function_count}</span>
            <span class="stat-label">Functions</span>
          </div>
          <div class="stat">
            <span class="stat-number">${stats.variable_count}</span>
            <span class="stat-label">Variables</span>
          </div>
          <div class="stat">
            <span class="stat-number">${stats.dependency_count}</span>
            <span class="stat-label">Dependencies</span>
          </div>
        </div>
      </div>
    `;
    
    preview.style.display = 'block';
  }

  async function confirmUpdateImport(projectId) {
    try {
      if (!window.currentUpdateImportData) {
        throw new Error('No import data available');
      }
      
      showStatus('Updating project from import...', 'info');
      
      const options = {
        updateProjectInfo: document.getElementById('update-project-info').checked,
        removeAbsent: document.getElementById('remove-absent-elements').checked,
        updateDependencies: document.getElementById('update-dependencies').checked
      };
      
      const response = await fetch(`/api/enhanced-code-graph/projects/${projectId}/import-update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          importData: window.currentUpdateImportData,
          options: options
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        const stats = result.updateStats;
        showStatus(`Project updated successfully! Added: ${stats.functionsAdded} functions, ${stats.variablesAdded} variables. Updated: ${stats.functionsUpdated} functions, ${stats.variablesUpdated} variables.`);
        hideModal('ecg-update-import-modal');
        loadProjects(); // Refresh projects list
        
        // Clean up
        window.currentUpdateImportData = null;
      } else {
        showStatus('Error updating project: ' + result.error, 'error');
      }
    } catch (error) {
      showStatus('Error updating project: ' + error.message, 'error');
    }
    }

    // =================================================================
    // PAGINATION FUNCTIONS
    // =================================================================

    function renderPagination(type, currentPage, totalPages, totalItems) {
        const paginationContainer = document.getElementById(`${type}-pagination`);
        if (!paginationContainer) return;
        
        if (totalPages <= 1) {
            paginationContainer.style.display = 'none';
            return;
        }
        
        paginationContainer.style.display = 'flex';
        
        const startItem = (currentPage - 1) * searchState[type].itemsPerPage + 1;
        const endItem = Math.min(currentPage * searchState[type].itemsPerPage, totalItems);
        
        paginationContainer.innerHTML = `
            <div class="pagination-info">
                Showing ${startItem}-${endItem} of ${totalItems} items
            </div>
            <div class="pagination-controls">
                <button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} 
                        onclick="EnhancedCodeGraphManager.changePage('${type}', ${currentPage - 1})">
                    ← Previous
                </button>
                ${generatePageNumbers(type, currentPage, totalPages)}
                <button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} 
                        onclick="EnhancedCodeGraphManager.changePage('${type}', ${currentPage + 1})">
                    Next →
                </button>
            </div>
        `;
    }

    function generatePageNumbers(type, currentPage, totalPages) {
        const pages = [];
        const maxVisiblePages = 5;
        
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        // Adjust start page if we're near the end
        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        // Add first page and ellipsis if needed
        if (startPage > 1) {
            pages.push(`<button class="page-btn" onclick="EnhancedCodeGraphManager.changePage('${type}', 1)">1</button>`);
            if (startPage > 2) {
                pages.push('<span class="page-ellipsis">...</span>');
            }
        }
        
        // Add visible page numbers
        for (let i = startPage; i <= endPage; i++) {
            pages.push(`
                <button class="page-btn ${i === currentPage ? 'active' : ''}" 
                        onclick="EnhancedCodeGraphManager.changePage('${type}', ${i})">
                    ${i}
                </button>
            `);
        }
        
        // Add last page and ellipsis if needed
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                pages.push('<span class="page-ellipsis">...</span>');
            }
            pages.push(`<button class="page-btn" onclick="EnhancedCodeGraphManager.changePage('${type}', ${totalPages})">${totalPages}</button>`);
        }
        
        return pages.join('');
    }

    function changePage(type, page) {
        if (!searchState[type] || !searchState[type].filteredItems) return;
        
        const totalPages = Math.ceil(searchState[type].filteredItems.length / searchState[type].itemsPerPage);
        
        // Validate page number
        if (page < 1 || page > totalPages) return;
        
        searchState[type].currentPage = page;
        
        // Re-render with new page
        switch (type) {
            case 'functions':
                renderFunctionsWithPagination();
                break;
            case 'variables':
                renderVariablesWithPagination();
                break;
            case 'dependencies':
                renderDependenciesWithPagination();
                break;
        }
    }

    // Helper function to escape regex characters for search highlighting
    function escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // =================================================================
    // EXPORT/IMPORT FUNCTIONALITY
    // =================================================================

    // =================================================================
// TEXT EDITOR FUNCTIONALITY
// =================================================================

let currentTextEditorProject = null;

async function loadProjectForTextEditor() {
    const projectId = document.getElementById('ecg-project-selector-text-editor').value;
    if (!projectId) {
        currentTextEditorProject = null;
        updateTextEditorStatus('No project selected');
        return;
    }
    
    currentTextEditorProject = projectId;
    updateTextEditorStatus(`Project selected: ${projects.find(p => p.id === projectId)?.name || 'Unknown'}`);
}

async function loadCurrentProjectAsText() {
    const projectSelector = document.getElementById('text-editor-project-selector') || 
                           document.getElementById('ecg-project-selector-text-editor');
    const textarea = document.getElementById('text-editor-fullscreen-input') || 
                    document.getElementById('text-editor-input');
    
    if (!projectSelector || !projectSelector.value) {
        updateTextEditorStatus('Please select a project first', 'error');
        return;
    }
    
    try {
        updateTextEditorStatus('Loading project data...', 'info');
        
        const projectId = projectSelector.value;
        
        // Load functions, variables, and dependencies for the project
        const [functionsResponse, variablesResponse, dependenciesResponse] = await Promise.all([
            fetch(`/api/enhanced-code-graph/functions?projectId=${projectId}`),
            fetch(`/api/enhanced-code-graph/variables?projectId=${projectId}`),
            fetch(`/api/enhanced-code-graph/dependencies?projectId=${projectId}`)
        ]);
        
        const functions = await functionsResponse.json();
        const variables = await variablesResponse.json();
        const dependencies = await dependenciesResponse.json();
        
        // Convert to text format
        const textContent = convertProjectToTextFormat(functions, variables, dependencies);
        
        // Set the textarea content
        if (textarea) {
            textarea.value = textContent;
        }
        
        updateTextEditorStatus('Project loaded successfully', 'info');
        
    } catch (error) {
        console.error('Error loading project:', error);
        updateTextEditorStatus('Error loading project data', 'error');
    }
}

function convertProjectToTextFormat(functions, variables, dependencies) {
    let text = '';
    
    // Add functions section
    if (functions.length > 0) {
        text += '# Functions\n\n';
        functions.forEach(func => {
            // Parse parameters safely
            let parameters = [];
            try {
                if (typeof func.parameters === 'string') {
                    parameters = JSON.parse(func.parameters);
                } else if (Array.isArray(func.parameters)) {
                    parameters = func.parameters;
                }
            } catch (e) {
                console.warn('Error parsing parameters for function:', func.name, e);
            }
            
            const paramStr = Array.isArray(parameters) ? parameters.join(', ') : '';
            const asyncStr = func.is_async ? ' async' : '';
            
            text += `function ${func.name}(${paramStr})${asyncStr}\n`;
            text += `  file: ${func.file_path}${func.line_number ? ':' + func.line_number : ''}\n`;
            if (func.return_type) text += `  returns: ${func.return_type}\n`;
            if (func.description) text += `  description: ${func.description}\n`;
            text += '\n';
        });
    }
    
    // Add variables section
    if (variables.length > 0) {
        text += '# Variables\n\n';
        variables.forEach(variable => {
            const typeStr = variable.type ? `: ${variable.type}` : '';
            const valueStr = variable.value ? ` = ${variable.value}` : '';
            
            text += `variable ${variable.name}${typeStr}${valueStr}\n`;
            text += `  scope: ${variable.scope}\n`;
            if (variable.function_id) {
                const func = functions.find(f => f.id === variable.function_id);
                if (func) text += `  function: ${func.name}\n`;
            }
            text += `  file: ${variable.file_path}${variable.line_number ? ':' + variable.line_number : ''}\n`;
            if (variable.description) text += `  description: ${variable.description}\n`;
            text += '\n';
        });
    }
    
    // Add relationships section
    if (dependencies.length > 0) {
        text += '# Relationships\n\n';
        
        // Create lookup maps for names
        const functionNames = {};
        const variableNames = {};
        
        functions.forEach(func => {
            functionNames[func.id] = func.name;
        });
        
        variables.forEach(variable => {
            variableNames[variable.id] = variable.name;
        });
        
        dependencies.forEach(dep => {
            const sourceName = dep.source_type === 'function' ? 
                functionNames[dep.source_id] : variableNames[dep.source_id];
            const targetName = dep.target_type === 'function' ? 
                functionNames[dep.target_id] : variableNames[dep.target_id];
            
            if (sourceName && targetName) {
                text += `${sourceName} -> ${targetName} (${dep.relationship_type})`;
                if (dep.context) text += ` # ${dep.context}`;
                text += '\n';
            }
        });
    }
    
    return text;
}

async function parseAndSaveTextDefinition() {
    if (!currentTextEditorProject) {
        showStatus('Please select a project first', 'error');
        return;
    }
    
    const textContent = document.getElementById('text-editor-input').value.trim();
    if (!textContent) {
        showStatus('Please enter some text to parse', 'error');
        return;
    }
    
    try {
        updateTextEditorStatus('Parsing text definition...', 'info');
        
        // Parse the text content
        const parsedData = parseTextDefinition(textContent);
        
        // Validate the parsed data
        const validationResult = validateParsedData(parsedData);
        if (!validationResult.valid) {
            updateTextEditorStatus(`Validation failed: ${validationResult.errors.join(', ')}`, 'error');
            showStatus('Validation failed: ' + validationResult.errors.join(', '), 'error');
            return;
        }
        
        // Show preview
        showTextEditorPreview(parsedData);
        
        // Send to backend for processing
        const response = await fetch('/api/enhanced-code-graph/text-definition', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectId: currentTextEditorProject,
                textDefinition: textContent,
                parsedData: parsedData
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            updateTextEditorStatus(`Successfully processed: ${result.stats.functionsProcessed} functions, ${result.stats.variablesProcessed} variables, ${result.stats.relationshipsProcessed} relationships`);
            showStatus('Text definition processed successfully!');
            
            // Refresh other views if they're visible
            if (currentView === 'functions') loadFunctions();
            if (currentView === 'variables') loadVariables();
            if (currentView === 'dependencies') loadDependencies();
        } else {
            updateTextEditorStatus('Error processing text definition', 'error');
            showStatus('Error processing text definition: ' + result.error, 'error');
        }
        
    } catch (error) {
        updateTextEditorStatus('Error parsing text definition', 'error');
        showStatus('Error parsing text definition: ' + error.message, 'error');
    }
}

function parseTextDefinition(textContent) {
    const lines = textContent.split('\n');
    const result = {
        functions: [],
        variables: [],
        relationships: []
    };
    
    let currentSection = null;
    let currentItem = null;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines and comments (except section headers)
        if (!line || (line.startsWith('#') && !line.match(/^# (Functions|Variables|Relationships)$/))) {
            continue;
        }
        
        // Section headers
        if (line.startsWith('# ')) {
            const sectionName = line.substring(2).toLowerCase();
            if (['functions', 'variables', 'relationships'].includes(sectionName)) {
                currentSection = sectionName;
                currentItem = null;
                continue;
            }
        }
        
        // Function definitions
        if (currentSection === 'functions' && line.startsWith('function ')) {
            currentItem = parseFunctionLine(line);
            if (currentItem) {
                result.functions.push(currentItem);
            }
            continue;
        }
        
        // Variable definitions
        if (currentSection === 'variables' && line.startsWith('variable ')) {
            currentItem = parseVariableLine(line);
            if (currentItem) {
                result.variables.push(currentItem);
            }
            continue;
        }
        
        // Relationship definitions
        if (currentSection === 'relationships' && line.includes(' -> ')) {
            const relationship = parseRelationshipLine(line);
            if (relationship) {
                result.relationships.push(relationship);
            }
            continue;
        }
        
        // Property lines (indented)
        if (line.startsWith('  ') && currentItem) {
            parsePropertyLine(line, currentItem);
        }
    }
    
    return result;
}

function parseFunctionLine(line) {
    // Parse: function functionName(param1, param2) async
    const match = line.match(/^function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)\s*(async)?/);
    if (!match) return null;
    
    const [, name, paramsStr, asyncFlag] = match;
    const parameters = paramsStr.split(',').map(p => p.trim()).filter(p => p);
    
    return {
        name,
        parameters,
        is_async: !!asyncFlag,
        file_path: null,
        line_number: null,
        description: null,
        return_type: null
    };
}

function parseVariableLine(line) {
    // Parse: variable varName: type = value
    const match = line.match(/^variable\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?::\s*([a-zA-Z_$][a-zA-Z0-9_$]*))?\s*(?:=\s*(.+))?/);
    if (!match) return null;
    
    const [, name, type, value] = match;
    
    return {
        name,
        type: type || null,
        value: value || null,
        scope: 'local',
        file_path: null,
        line_number: null,
        description: null,
        function_name: null
    };
}

function parseRelationshipLine(line) {
    // Parse: source -> target (relationship_type) # optional comment
    const match = line.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*->\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]+)\)\s*(?:#\s*(.+))?/);
    if (!match) return null;
    
    const [, source, target, relationshipType, context] = match;
    
    return {
        source,
        target,
        relationship_type: relationshipType.trim(),
        context: context ? context.trim() : null
    };
}

function parsePropertyLine(line, currentItem) {
    // Parse indented property lines like "  file: src/file.js:42"
    const trimmed = line.trim();
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) return;
    
    const key = trimmed.substring(0, colonIndex).trim();
    const value = trimmed.substring(colonIndex + 1).trim();
    
    switch (key) {
        case 'file':
            const fileMatch = value.match(/^(.+?)(?::(\d+))?$/);
            if (fileMatch) {
                currentItem.file_path = fileMatch[1];
                if (fileMatch[2]) {
                    currentItem.line_number = parseInt(fileMatch[2]);
                }
            }
            break;
        case 'description':
            currentItem.description = value;
            break;
        case 'returns':
            currentItem.return_type = value;
            break;
        case 'scope':
            currentItem.scope = value;
            break;
        case 'function':
            currentItem.function_name = value;
            break;
    }
}

function validateParsedData(parsedData) {
    const errors = [];
    
    // Validate functions
    parsedData.functions.forEach((func, index) => {
        if (!func.name) {
            errors.push(`Function at index ${index} is missing a name`);
        }
        if (!func.file_path) {
            errors.push(`Function '${func.name}' is missing file path`);
        }
    });
    
    // Validate variables
    parsedData.variables.forEach((variable, index) => {
        if (!variable.name) {
            errors.push(`Variable at index ${index} is missing a name`);
        }
        if (!variable.file_path) {
            errors.push(`Variable '${variable.name}' is missing file path`);
        }
    });
    
    // Validate relationships
    const functionNames = new Set(parsedData.functions.map(f => f.name));
    const variableNames = new Set(parsedData.variables.map(v => v.name));
    const allNames = new Set([...functionNames, ...variableNames]);
    
    parsedData.relationships.forEach((rel, index) => {
        if (!allNames.has(rel.source)) {
            errors.push(`Relationship at index ${index}: source '${rel.source}' not found in functions or variables`);
        }
        if (!allNames.has(rel.target)) {
            errors.push(`Relationship at index ${index}: target '${rel.target}' not found in functions or variables`);
        }
    });
    
    return {
        valid: errors.length === 0,
        errors
    };
}

function showTextEditorPreview(parsedData) {
    const preview = document.getElementById('text-editor-preview');
    const content = document.getElementById('text-editor-preview-content');
    
    content.innerHTML = `
        <div class="parse-success">
            ✅ Successfully parsed: ${parsedData.functions.length} functions, ${parsedData.variables.length} variables, ${parsedData.relationships.length} relationships
        </div>
        
        ${parsedData.functions.map(func => `
            <div class="parsed-item">
                <div class="parsed-item-type">Function</div>
                <div class="parsed-item-name">${func.name}(${Array.isArray(func.parameters) ? func.parameters.join(', ') : ''})</div>
                <div class="parsed-item-details">
                    ${func.file_path ? `📁 ${func.file_path}${func.line_number ? ':' + func.line_number : ''}` : ''}
                    ${func.is_async ? ' • ⚡ async' : ''}
                    ${func.description ? `<br>📝 ${func.description}` : ''}
                </div>
            </div>
        `).join('')}
        
        ${parsedData.variables.map(variable => `
            <div class="parsed-item">
                <div class="parsed-item-type">Variable</div>
                <div class="parsed-item-name">${variable.name}${variable.type ? ': ' + variable.type : ''}${variable.value ? ' = ' + variable.value : ''}</div>
                <div class="parsed-item-details">
                    📁 ${variable.file_path || 'Not specified'}${variable.line_number ? ':' + variable.line_number : ''}
                    • 🔍 ${variable.scope}
                    ${variable.function_name ? ` • 📊 in ${variable.function_name}` : ''}
                    ${variable.description ? `<br>📝 ${variable.description}` : ''}
                </div>
            </div>
        `).join('')}
        
        ${parsedData.relationships.map(rel => `
            <div class="parsed-item">
                <div class="parsed-item-type">Relationship</div>
                <div class="parsed-item-name">${rel.source} → ${rel.target}</div>
                <div class="parsed-item-details">
                    🔗 ${rel.relationship_type}
                    ${rel.context ? ` • 💬 ${rel.context}` : ''}
                </div>
            </div>
        `).join('')}
    `;
    
    preview.style.display = 'block';
}

function updateTextEditorStatus(message, type = 'info') {
    const statusElement = document.getElementById('text-editor-fullscreen-status') || 
                         document.getElementById('text-editor-status');
    
    if (!statusElement) return;
    
    const messageElement = statusElement.querySelector('.status-message');
    const timestampElement = statusElement.querySelector('.status-timestamp');
    
    if (messageElement) {
        messageElement.textContent = message;
        messageElement.className = `status-message ${type}`;
    }
    
    if (timestampElement) {
        timestampElement.textContent = new Date().toLocaleTimeString();
    }
}

function insertTextTemplate(type) {
    const textarea = document.getElementById('text-editor-input');
    const cursor = textarea.selectionStart;
    const textBefore = textarea.value.substring(0, cursor);
    const textAfter = textarea.value.substring(cursor);
    
    let template = '';
    
    switch (type) {
        case 'function':
            template = `function myFunction(param1, param2) async
  file: src/myfile.js:42
  returns: Promise<string>
  description: Description of what this function does

`;
            break;
        case 'variable':
            template = `variable myVariable: string = "initial value"
  scope: local
  function: myFunction
  description: Description of this variable

`;
            break;
        case 'relationship':
            template = `sourceElement -> targetElement (relationship_type) # optional context

`;
            break;
    }
    
    textarea.value = textBefore + template + textAfter;
    textarea.selectionStart = textarea.selectionEnd = cursor + template.length;
    textarea.focus();
}

function validateTextSyntax() {
    const textContent = document.getElementById('text-editor-input').value.trim();
    if (!textContent) {
        updateTextEditorStatus('No text to validate', 'error');
        return;
    }
    
    try {
        const parsedData = parseTextDefinition(textContent);
        const validationResult = validateParsedData(parsedData);
        
        if (validationResult.valid) {
            updateTextEditorStatus(`✅ Syntax valid: ${parsedData.functions.length} functions, ${parsedData.variables.length} variables, ${parsedData.relationships.length} relationships`);
            showTextEditorPreview(parsedData);
        } else {
            updateTextEditorStatus(`❌ Validation errors: ${validationResult.errors.join(', ')}`, 'error');
            
            // Show errors in preview
            const preview = document.getElementById('text-editor-preview');
            const content = document.getElementById('text-editor-preview-content');
            
            content.innerHTML = `
                <div class="parse-error">
                    ❌ Validation Errors:
                    <ul>
                        ${validationResult.errors.map(error => `<li>${error}</li>`).join('')}
                    </ul>
                </div>
            `;
            
            preview.style.display = 'block';
        }
    } catch (error) {
        updateTextEditorStatus(`❌ Parse error: ${error.message}`, 'error');
    }
}

function showTextEditorHelp() {
    const helpModal = document.createElement('div');
    helpModal.className = 'text-editor-help-modal';
    helpModal.innerHTML = `
        <div class="text-editor-help-content">
            <div class="text-editor-help-header">
                <h2>📝 Text Editor Help & Syntax Guide</h2>
                <button class="close-btn" onclick="this.parentElement.parentElement.remove()">&times;</button>
            </div>
            <div class="text-editor-help-body">
                <div class="help-section">
                    <h3>🎯 Overview</h3>
                    <p class="help-explanation">
                        The Text Editor allows you to define your code graph structure using a simple, intuitive text format. 
                        You can define functions, variables, and their relationships using familiar syntax patterns.
                    </p>
                </div>
                
                <div class="help-section">
                    <h3>📊 Functions</h3>
                    <p class="help-explanation">Define functions with their parameters and properties:</p>
                    <div class="help-example"># Functions

function generateThumbnail(inputPath, thumbPath, maxSize=180, quality=60) async
  file: controllers/dcimController.js:68
  returns: Promise<void>
  description: Generate thumbnails for images and videos using Sharp and FFmpeg

function calculateArea(width, height)
  file: utils/math.js:15
  returns: number
  description: Calculate the area of a rectangle</div>
                </div>
                
                <div class="help-section">
                    <h3>🔢 Variables</h3>
                    <p class="help-explanation">Define variables with their types, values, and scope:</p>
                    <div class="help-example"># Variables

variable inputPath: string
  scope: parameter
  function: generateThumbnail
  description: Input file path for image processing

variable DEFAULT_SIZE: number = 180
  scope: global
  file: config/constants.js:5
  description: Default thumbnail size in pixels

variable isProcessing: boolean = false
  scope: local
  function: processImages
  description: Flag to track processing state</div>
                </div>
                
                <div class="help-section">
                    <h3>🔗 Relationships</h3>
                    <p class="help-explanation">Define how functions and variables relate to each other:</p>
                    <div class="help-example"># Relationships

generateThumbnail -> sharp (calls) # Uses Sharp library for image processing
inputPath -> path.extname (passes_to) # Extracts file extension
path.extname -> toLowerCase (chains_to) # Converts to lowercase
maxSize -> sharp.resize (passes_to) # Sets thumbnail dimensions
quality -> sharp.webp (passes_to) # Sets compression quality</div>
                </div>
                
                <div class="help-section">
                    <h3>🔧 Available Relationship Types</h3>
                    <p class="help-explanation">Common relationship types you can use:</p>
                    <ul>
                        <li><strong>calls</strong> - Function A calls Function B</li>
                        <li><strong>passes_to</strong> - Variable/value passed as parameter</li>
                        <li><strong>chains_to</strong> - Method chaining (result.method())</li>
                        <li><strong>assigns_to</strong> - Value assigned to variable</li>
                        <li><strong>transforms_via</strong> - Data transformation</li>
                        <li><strong>validates_against</strong> - Validation check</li>
                        <li><strong>uses</strong> - Generic usage relationship</li>
                    </ul>
                </div>
                
                <div class="help-section">
                    <h3>💡 Tips & Best Practices</h3>
                    <ul>
                        <li>Use meaningful names for functions and variables</li>
                        <li>Always specify file paths for better organization</li>
                        <li>Add descriptions to document purpose and behavior</li>
                        <li>Use the validation feature to check syntax before saving</li>
                        <li>Load existing projects to see examples of the format</li>
                        <li>Use comments (# comment) to add notes and context</li>
                    </ul>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(helpModal);
    
    // Close on background click
    helpModal.addEventListener('click', function(e) {
        if (e.target === helpModal) {
            helpModal.remove();
        }
    });
}

function showTextEditorFullscreen() {
    // Create fullscreen overlay if it doesn't exist
    let overlay = document.getElementById('text-editor-fullscreen-overlay');
    if (!overlay) {
        createTextEditorFullscreen();
        overlay = document.getElementById('text-editor-fullscreen-overlay');
    }
    
    // Show the overlay
    overlay.style.display = 'flex';
    
    // Populate project selector
    populateTextEditorProjectSelector();
}

function createTextEditorFullscreen() {
    const overlay = document.createElement('div');
    overlay.id = 'text-editor-fullscreen-overlay';
    overlay.className = 'text-editor-fullscreen-overlay';
    overlay.innerHTML = `
        <div class="text-editor-fullscreen-header">
            <h2>📝 Text Editor - Code Graph Definition</h2>
            <div class="text-editor-fullscreen-actions">
                <select id="text-editor-project-selector" onchange="EnhancedCodeGraphManager.loadProjectForTextEditor()">
                    <option value="">Select a project...</option>
                </select>
                <button class="btn btn-secondary" onclick="EnhancedCodeGraphManager.loadCurrentProjectAsText()">📥 Load Current</button>
                <button class="btn btn-success" onclick="EnhancedCodeGraphManager.parseAndSaveTextDefinition()">💾 Parse & Save</button>
                <button class="btn btn-info" onclick="EnhancedCodeGraphManager.showTextEditorHelp()">❓ Help</button>
                <button class="btn btn-secondary" onclick="EnhancedCodeGraphManager.closeTextEditorFullscreen()">✕ Close</button>
            </div>
        </div>
        
        <div class="text-editor-fullscreen-body">
            <div class="text-editor-fullscreen-sidebar">
                <div class="text-editor-toolbar">
                    <h4>Quick Actions</h4>
                    <button class="btn btn-sm btn-secondary" onclick="EnhancedCodeGraphManager.insertTextTemplate('function')">+ Function</button>
                    <button class="btn btn-sm btn-secondary" onclick="EnhancedCodeGraphManager.insertTextTemplate('variable')">+ Variable</button>
                    <button class="btn btn-sm btn-secondary" onclick="EnhancedCodeGraphManager.insertTextTemplate('relationship')">+ Relationship</button>
                    <button class="btn btn-sm btn-secondary" onclick="EnhancedCodeGraphManager.validateTextSyntax()">✅ Validate</button>
                </div>
                
                <div class="syntax-info">
                    <h4>Syntax Guide</h4>
                    <div class="syntax-example"># Functions
function myFunc(param1, param2) async
  file: src/file.js:42
  returns: Promise&lt;string&gt;
  description: What it does

# Variables  
variable myVar: string = "hello"
  scope: local
  function: myFunc
  description: A variable

# Relationships
myFunc -> otherFunc (calls)
param1 -> myVar (assigns_to)</div>
                </div>
            </div>
            
            <div class="text-editor-fullscreen-main">
                <div class="text-editor-fullscreen-editor">
                    <div class="text-editor-fullscreen-status" id="text-editor-fullscreen-status">
                        <span class="status-message">Ready to edit</span>
                        <span class="status-timestamp">${new Date().toLocaleTimeString()}</span>
                    </div>
                    
                    <textarea id="text-editor-fullscreen-input" class="text-editor-fullscreen-textarea" 
                              placeholder="Start typing your code graph definition here...

# Example:
# Functions
function generateThumbnail(inputPath, thumbPath, maxSize=180, quality=60) async
  file: controllers/dcimController.js:68
  description: Generate thumbnails for images and videos using Sharp and FFmpeg"></textarea>
                </div>
                
                <div class="text-editor-fullscreen-preview" id="text-editor-fullscreen-preview" style="display: none;">
                    <h4>Parsed Structure Preview</h4>
                    <div id="text-editor-fullscreen-preview-content"></div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
}

function closeTextEditorFullscreen() {
    const overlay = document.getElementById('text-editor-fullscreen-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
    
    // Reset to projects view
    switchView('projects');
}

function populateTextEditorProjectSelector() {
    const selector = document.getElementById('text-editor-project-selector');
    if (!selector) return;
    
    // Clear existing options except the first one
    selector.innerHTML = '<option value="">Select a project...</option>';
    
    // Add projects from the current projects data
    if (window.enhancedCodeGraphProjects && window.enhancedCodeGraphProjects.length > 0) {
        window.enhancedCodeGraphProjects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name;
            selector.appendChild(option);
        });
    }
}

    return {
        initialize,
        show,
        hide,
        getIsVisible,
        showStatus,
        switchView,
        showModal,
        hideModal,
        showCreateProjectModal,
        createProject,
        showTemplateModal,
        createFromTemplate,
        viewProjectGraph,
        deleteProject,
        editProject,
        updateProject,
        resetCreateProjectModal,
        showCreateFunctionModal,
        saveFunction,
        editFunction,
        deleteFunction,
        showCreateVariableModal,
        saveVariable,
        editVariable,
        deleteVariable,
        showCreateDependencyModal,
        saveDependency,
        editDependency,
        deleteDependency,
        resetGraphLayout,
        fitGraphToView,
        handleZoom,
        toggleFullscreen,
        exitFullscreen, // Add this for the fullscreen exit button
        handleZoom, // Add this for the zoom slider
        
        // Export/Import
        exportProject,
        showImportModal,
        handleImportFile,
        confirmImport,
        switchImportTab,        // ← ADD THIS
        selectTemplateFile,     // ← ADD THIS
        loadTemplateFiles,      // ← ADD THIS
        showUpdateImportModal,
        handleUpdateImportFile,
        confirmUpdateImport,
        
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
        exitFullscreen, // Add this for the fullscreen exit button
        handleZoom, // Add this for the zoom slider
        
        // Modal management
        showModal,
        hideModal,
        showUpdateImportModal,
        handleUpdateImportFile,
        showUpdateImportPreview,
        confirmUpdateImport,
        selectTemplateFile,
        
        // Search functions
        searchFunctions,
        clearFunctionSearch,
        searchVariables,
        clearVariableSearch,
        searchDependencies,
        clearDependencySearch,
        changePage,

        loadProjectForTextEditor,
        loadCurrentProjectAsText,
        parseAndSaveTextDefinition,
        insertTextTemplate,
        validateTextSyntax,
        showTextEditorHelp,
        showTextEditorFullscreen,
        closeTextEditorFullscreen,
        populateTextEditorProjectSelector
    };
})();

// Make it available globally
window.EnhancedCodeGraphManager = EnhancedCodeGraphManager;
