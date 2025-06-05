/**
 * Code Graph Management UI
 * Manual interface for creating and managing code entities and relationships
 */
const CodeGraphManager = (function() {
    let container;
    let entitiesData = [];
    let relationshipsData = [];
    let projectsData = [];
    
    // State management
    let entitiesState = {
      currentPage: 1,
      itemsPerPage: 20,
      searchTerm: '',
      typeFilter: '',
      projectFilter: '',
      filteredData: []
    };
    
    let relationshipsState = {
      currentPage: 1,
      itemsPerPage: 20,
      searchTerm: '',
      typeFilter: '',
      filteredData: [],
      pagination: null
    };
    
    function initialize() {
      createContainer();
      setupEventHandlers();
    }
    
    function createContainer() {
      container = document.createElement('div');
      container.id = 'code-graph-container';
      container.className = 'code-graph-container';
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
        <div class="code-graph-header">
          <h2>Code Graph Analysis</h2>
          <button id="close-code-graph" class="close-btn">×</button>
        </div>
        
        <div class="code-graph-content">
          <div class="management-section">
            <div class="section-tabs">
              <button class="tab-btn active" data-tab="entities">Code Entities</button>
              <button class="tab-btn" data-tab="relationships">Relationships</button>
              <button class="tab-btn" data-tab="projects">Projects</button>
              <button class="tab-btn" data-tab="analysis">Analysis</button>
              <button class="tab-btn" data-tab="visualization">Visualization</button>
              <button class="tab-btn" data-tab="line-analysis">Line Analysis</button>
            </div>
            
            <!-- Entities Tab -->
            <div id="entities-tab" class="tab-content active">
              <div class="action-bar">
                <button id="add-entity-btn" class="primary-btn">Add Entity</button>
                <button id="refresh-entities-btn" class="secondary-btn">Refresh</button>
                <button id="import-entities-btn" class="secondary-btn">Import from Files</button>
              </div>
              
              <div class="search-filter-bar">
                <div class="search-container">
                  <input type="text" id="entities-search" placeholder="Search entities by name, file, or documentation..." class="search-input">
                  <button id="clear-entities-search" class="clear-search-btn">×</button>
                </div>
                <div class="filter-container">
                  <select id="entities-type-filter" class="filter-select">
                    <option value="">All Types</option>
                    <option value="function">Function</option>
                    <option value="class">Class</option>
                    <option value="method">Method</option>
                    <option value="variable">Variable</option>
                    <option value="property">Property</option>
                    <option value="module">Module</option>
                  </select>
                  <select id="entities-project-filter" class="filter-select">
                    <option value="">All Projects</option>
                  </select>
                  <select id="entities-per-page" class="filter-select">
                    <option value="10">10 per page</option>
                    <option value="20" selected>20 per page</option>
                    <option value="50">50 per page</option>
                    <option value="100">100 per page</option>
                  </select>
                </div>
              </div>
              
              <div id="entities-results-info" class="results-info"></div>
              <div id="entities-list" class="data-list"></div>
              <div id="entities-pagination" class="pagination-container"></div>
            </div>
            
            <!-- Relationships Tab -->
            <div id="relationships-tab" class="tab-content">
              <div class="action-bar">
                <button id="add-relationship-btn" class="primary-btn">Add Relationship</button>
                <button id="refresh-relationships-btn" class="secondary-btn">Refresh</button>
              </div>
              
              <div class="search-filter-bar">
                <div class="search-container">
                  <input type="text" id="relationships-search" placeholder="Search relationships..." class="search-input">
                  <button id="clear-relationships-search" class="clear-search-btn">×</button>
                </div>
                <div class="filter-container">
                  <select id="relationships-type-filter" class="filter-select">
                    <option value="">All Types</option>
                    <option value="calls">Calls</option>
                    <option value="inherits">Inherits</option>
                    <option value="implements">Implements</option>
                    <option value="imports">Imports</option>
                    <option value="uses">Uses</option>
                    <option value="defines">Defines</option>
                    <option value="modifies">Modifies</option>
                  </select>
                  <select id="relationships-per-page" class="filter-select">
                    <option value="10">10 per page</option>
                    <option value="20" selected>20 per page</option>
                    <option value="50">50 per page</option>
                  </select>
                </div>
              </div>
              
              <div id="relationships-results-info" class="results-info"></div>
              <div id="relationships-list" class="data-list"></div>
              <div id="relationships-pagination" class="pagination-container"></div>
            </div>
            
            <!-- Projects Tab -->
            <div id="projects-tab" class="tab-content">
              <div class="action-bar">
                <button id="add-project-btn" class="primary-btn">Add Project</button>
                <button id="refresh-projects-btn" class="secondary-btn">Refresh</button>
              </div>
              <div id="projects-list" class="data-list"></div>
            </div>
            
            <!-- Analysis Tab -->
            <div id="analysis-tab" class="tab-content">
              <div class="analysis-controls">
                <h3>Code Analysis Tools</h3>
                <div class="analysis-buttons">
                  <button id="analyze-complexity-btn" class="analysis-btn">Analyze Complexity</button>
                  <button id="analyze-dependencies-btn" class="analysis-btn">Analyze Dependencies</button>
                  <button id="analyze-coupling-btn" class="analysis-btn">Analyze Coupling</button>
                </div>
                <select id="analysis-project-filter" class="filter-select">
                  <option value="">All Projects</option>
                </select>
              </div>
              <div id="analysis-results" class="analysis-results"></div>
            </div>
            
            <!-- Visualization Tab -->
            <div id="visualization-tab" class="tab-content">
              <div class="visualization-controls">
                <h3>Code Graph Visualization</h3>
                <div class="viz-controls">
                  <select id="viz-project-filter" class="filter-select">
                    <option value="">All Projects</option>
                  </select>
                  <select id="viz-type-filter" class="filter-select">
                    <option value="">All Types</option>
                    <option value="function">Functions Only</option>
                    <option value="class">Classes Only</option>
                  </select>
                  <select id="viz-relationship-filter" class="filter-select">
                    <option value="">All Relationships</option>
                    <option value="calls">Calls Only</option>
                    <option value="inherits">Inheritance Only</option>
                  </select>
                  <button id="load-visualization-btn" class="primary-btn">Load Graph</button>
                </div>
              </div>
              <div id="code-graph-visualization" class="graph-visualization"></div>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(container);
      createModals();
    }
    
    function createModals() {
      // Entity Modal
      const entityModal = document.createElement('div');
      entityModal.id = 'entity-modal';
      entityModal.className = 'code-graph-modal';
      entityModal.innerHTML = `
        <div class="code-graph-modal-content">
          <h3 id="entity-modal-title">Add Code Entity</h3>
          <form id="entity-form">
            <div class="form-row">
              <div class="form-group">
                <label>Name*:</label>
                <input type="text" id="entity-name" required>
              </div>
              <div class="form-group">
                <label>Type*:</label>
                <select id="entity-type" required>
                  <option value="function">Function</option>
                  <option value="class">Class</option>
                  <option value="method">Method</option>
                  <option value="variable">Variable</option>
                  <option value="property">Property</option>
                  <option value="module">Module</option>
                </select>
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label>File Path*:</label>
                <input type="text" id="entity-file-path" required placeholder="/path/to/file.js">
              </div>
              <div class="form-group">
                <label>Line Number:</label>
                <input type="number" id="entity-line-number" min="1">
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label>Scope:</label>
                <select id="entity-scope">
                  <option value="global">Global</option>
                  <option value="local">Local</option>
                  <option value="class">Class</option>
                  <option value="module">Module</option>
                </select>
              </div>
              <div class="form-group">
                <label>Language:</label>
                <select id="entity-language">
                  <option value="javascript">JavaScript</option>
                  <option value="typescript">TypeScript</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="csharp">C#</option>
                </select>
              </div>
            </div>
            
            <div class="form-group">
              <label>Signature:</label>
              <input type="text" id="entity-signature" placeholder="function(param1, param2) => returnType">
            </div>
            
            <div class="form-group">
              <label>Documentation:</label>
              <textarea id="entity-documentation" rows="3" placeholder="Description or JSDoc comments..."></textarea>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label>Access Modifier:</label>
                <select id="entity-access-modifier">
                  <option value="">None</option>
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                  <option value="protected">Protected</option>
                </select>
              </div>
              <div class="form-group">
                <label>Return Type:</label>
                <input type="text" id="entity-return-type" placeholder="string, number, void, etc.">
              </div>
            </div>
            
            <div class="form-row checkbox-row">
              <label><input type="checkbox" id="entity-is-async"> Async</label>
              <label><input type="checkbox" id="entity-is-static"> Static</label>
              <label><input type="checkbox" id="entity-is-exported"> Exported</label>
            </div>
            
            <div class="modal-actions">
              <button type="submit" class="primary-btn">Save</button>
              <button type="button" id="cancel-entity" class="secondary-btn">Cancel</button>
            </div>
          </form>
        </div>
      `;
      document.body.appendChild(entityModal);
      
      // Relationship Modal
      const relationshipModal = document.createElement('div');
      relationshipModal.id = 'relationship-modal';
      relationshipModal.className = 'code-graph-modal';
      relationshipModal.innerHTML = `
        <div class="code-graph-modal-content">
          <h3 id="relationship-modal-title">Add Relationship</h3>
          <form id="relationship-form">
            <div class="form-group">
              <label>Source Entity*:</label>
              <select id="relationship-source" required>
                <option value="">Select source entity...</option>
              </select>
            </div>
            
            <div class="form-group">
              <label>Target Entity*:</label>
              <select id="relationship-target" required>
                <option value="">Select target entity...</option>
              </select>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label>Relationship Type*:</label>
                <select id="relationship-type" required>
                  <option value="calls">Calls</option>
                  <option value="inherits">Inherits</option>
                  <option value="implements">Implements</option>
                  <option value="imports">Imports</option>
                  <option value="uses">Uses</option>
                  <option value="defines">Defines</option>
                  <option value="modifies">Modifies</option>
                </select>
              </div>
              <div class="form-group">
                <label>Strength (1-10):</label>
                <input type="number" id="relationship-strength" min="1" max="10" value="5">
              </div>
            </div>
            
            <div class="form-group">
              <label>Context:</label>
              <textarea id="relationship-context" rows="2" placeholder="Additional context about this relationship..."></textarea>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label>File Path:</label>
                <input type="text" id="relationship-file-path" placeholder="Where this relationship occurs">
              </div>
              <div class="form-group">
                <label>Line Number:</label>
                <input type="number" id="relationship-line-number" min="1">
              </div>
            </div>
            
            <div class="modal-actions">
              <button type="submit" class="primary-btn">Save</button>
              <button type="button" id="cancel-relationship" class="secondary-btn">Cancel</button>
            </div>
          </form>
        </div>
      `;
      document.body.appendChild(relationshipModal);
      
      // Project Modal
      const projectModal = document.createElement('div');
      projectModal.id = 'project-modal';
      projectModal.className = 'code-graph-modal';
      projectModal.innerHTML = `
        <div class="code-graph-modal-content">
          <h3 id="project-modal-title">Add Project</h3>
          <form id="project-form">
            <div class="form-row">
              <div class="form-group">
                <label>Name*:</label>
                <input type="text" id="project-name" required>
              </div>
              <div class="form-group">
                <label>Language:</label>
                <select id="project-language">
                  <option value="javascript">JavaScript</option>
                  <option value="typescript">TypeScript</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="csharp">C#</option>
                </select>
              </div>
            </div>
            
            <div class="form-group">
              <label>Base Path*:</label>
              <input type="text" id="project-base-path" required placeholder="/path/to/project">
            </div>
            
            <div class="form-group">
              <label>Description:</label>
              <textarea id="project-description" rows="2" placeholder="Project description..."></textarea>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label>Framework:</label>
                <input type="text" id="project-framework" placeholder="React, Vue, Express, etc.">
              </div>
              <div class="form-group">
                <label>Version:</label>
                <input type="text" id="project-version" placeholder="1.0.0">
              </div>
            </div>
            
            <div class="modal-actions">
              <button type="submit" class="primary-btn">Save</button>
              <button type="button" id="cancel-project" class="secondary-btn">Cancel</button>
            </div>
          </form>
        </div>
      `;
      document.body.appendChild(projectModal);

      // Expression Analysis Modal
      const expressionModal = document.createElement('div');
      expressionModal.id = 'expression-modal';
      expressionModal.className = 'code-graph-modal';
      expressionModal.innerHTML = `
        <div class="code-graph-modal-content expression-modal-content">
          <h3 id="expression-modal-title">Analyze Code Expression</h3>
          
          <!-- Expression Context -->
          <div class="expression-context">
            <div class="form-group">
              <label>Code Line:</label>
              <textarea id="expression-code-line" rows="2" readonly class="code-display"></textarea>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Parent Function:</label>
                <input type="text" id="expression-parent-function" readonly>
              </div>
              <div class="form-group">
                <label>Line Number:</label>
                <input type="number" id="expression-line-number" readonly>
              </div>
            </div>
          </div>

          <!-- Expression Analysis Tabs -->
          <div class="expression-tabs">
            <button class="expression-tab-btn active" data-tab="variables">Variables</button>
            <button class="expression-tab-btn" data-tab="method-calls">Method Calls</button>
            <button class="expression-tab-btn" data-tab="data-flow">Data Flow</button>
            <button class="expression-tab-btn" data-tab="dependencies">Dependencies</button>
          </div>

          <!-- Variables Tab -->
          <div id="variables-expression-tab" class="expression-tab-content active">
            <div class="detected-items">
              <h4>Detected Variables</h4>
              <div id="detected-variables-list"></div>
            </div>
            
            <div class="add-variable-section">
              <h4>Add/Edit Variable</h4>
              <form id="variable-form">
                <div class="form-row">
                  <div class="form-group">
                    <label>Variable Name*:</label>
                    <input type="text" id="variable-name" required>
                  </div>
                  <div class="form-group">
                    <label>Declaration Type:</label>
                    <select id="variable-declaration-type">
                      <option value="const">const</option>
                      <option value="let">let</option>
                      <option value="var">var</option>
                      <option value="parameter">parameter</option>
                      <option value="property">property</option>
                    </select>
                  </div>
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label>Data Type:</label>
                    <select id="variable-data-type">
                      <option value="string">string</option>
                      <option value="number">number</option>
                      <option value="boolean">boolean</option>
                      <option value="object">object</option>
                      <option value="array">array</option>
                      <option value="function">function</option>
                      <option value="undefined">undefined</option>
                      <option value="null">null</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Scope Type:</label>
                    <select id="variable-scope-type">
                      <option value="local">local</option>
                      <option value="parameter">parameter</option>
                      <option value="closure">closure</option>
                      <option value="global">global</option>
                    </select>
                  </div>
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label>Initial Value Type:</label>
                    <select id="variable-initial-value-type">
                      <option value="literal">literal</option>
                      <option value="function_call">function_call</option>
                      <option value="expression">expression</option>
                      <option value="parameter">parameter</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Mutability:</label>
                    <select id="variable-mutability">
                      <option value="immutable">immutable</option>
                      <option value="mutable">mutable</option>
                    </select>
                  </div>
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label>Column Start:</label>
                    <input type="number" id="variable-column-start" min="0">
                  </div>
                  <div class="form-group">
                    <label>Column End:</label>
                    <input type="number" id="variable-column-end" min="0">
                  </div>
                </div>
                
                <div class="checkbox-row">
                  <label><input type="checkbox" id="variable-is-exported"> Exported</label>
                </div>
                
                <button type="submit" class="primary-btn">Add Variable</button>
              </form>
            </div>
          </div>

          <!-- Method Calls Tab -->
          <div id="method-calls-expression-tab" class="expression-tab-content">
            <div class="detected-items">
              <h4>Detected Method Calls</h4>
              <div id="detected-method-calls-list"></div>
            </div>
            
            <div class="add-method-call-section">
              <h4>Add/Edit Method Call</h4>
              <form id="method-call-form">
                <div class="form-row">
                  <div class="form-group">
                    <label>Method Name*:</label>
                    <input type="text" id="method-call-name" required>
                  </div>
                  <div class="form-group">
                    <label>Call Type:</label>
                    <select id="method-call-type">
                      <option value="direct">direct</option>
                      <option value="chained">chained</option>
                      <option value="nested">nested</option>
                    </select>
                  </div>
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label>Module Source:</label>
                    <select id="method-module-source">
                      <option value="built-in">built-in</option>
                      <option value="external">external</option>
                      <option value="local">local</option>
                      <option value="third-party">third-party</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Chain Position:</label>
                    <select id="method-chain-position">
                      <option value="standalone">standalone</option>
                      <option value="first">first</option>
                      <option value="intermediate">intermediate</option>
                      <option value="last">last</option>
                    </select>
                  </div>
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label>Arguments Count:</label>
                    <input type="number" id="method-arguments-count" min="0" value="0">
                  </div>
                  <div class="form-group">
                    <label>Return Type:</label>
                    <input type="text" id="method-return-type" placeholder="string, number, void, etc.">
                  </div>
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label>Column Start:</label>
                    <input type="number" id="method-column-start" min="0">
                  </div>
                  <div class="form-group">
                    <label>Column End:</label>
                    <input type="number" id="method-column-end" min="0">
                  </div>
                </div>
                
                <div class="checkbox-row">
                  <label><input type="checkbox" id="method-is-async"> Async</label>
                </div>
                
                <button type="submit" class="primary-btn">Add Method Call</button>
              </form>
            </div>
          </div>

          <!-- Data Flow Tab -->
          <div id="data-flow-expression-tab" class="expression-tab-content">
            <div class="data-flow-visualization">
              <h4>Data Flow Analysis</h4>
              <div id="data-flow-diagram"></div>
            </div>
            
            <div class="add-data-flow-section">
              <h4>Add Data Flow Relationship</h4>
              <form id="data-flow-form">
                <div class="form-row">
                  <div class="form-group">
                    <label>Source Type:</label>
                    <select id="data-flow-source-type">
                      <option value="variable">variable</option>
                      <option value="method_call">method_call</option>
                      <option value="expression">expression</option>
                      <option value="parameter">parameter</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Source:</label>
                    <select id="data-flow-source-id">
                      <option value="">Select source...</option>
                    </select>
                  </div>
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label>Target Type:</label>
                    <select id="data-flow-target-type">
                      <option value="variable">variable</option>
                      <option value="method_call">method_call</option>
                      <option value="expression">expression</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Target:</label>
                    <select id="data-flow-target-id">
                      <option value="">Select target...</option>
                    </select>
                  </div>
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label>Flow Type:</label>
                    <select id="data-flow-type">
                      <option value="assignment">assignment</option>
                      <option value="parameter_passing">parameter_passing</option>
                      <option value="return_value">return_value</option>
                      <option value="transformation">transformation</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Transformation Applied:</label>
                    <input type="text" id="data-flow-transformation" placeholder="e.g., toLowerCase, parseInt">
                  </div>
                </div>
                
                <button type="submit" class="primary-btn">Add Data Flow</button>
              </form>
            </div>
          </div>

          <!-- Dependencies Tab -->
          <div id="dependencies-expression-tab" class="expression-tab-content">
            <div class="dependencies-analysis">
              <h4>External Dependencies</h4>
              <div id="external-dependencies-list"></div>
              
              <h4>Built-in Dependencies</h4>
              <div id="builtin-dependencies-list"></div>
              
              <h4>Internal Dependencies</h4>
              <div id="internal-dependencies-list"></div>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" id="analyze-expression-btn" class="primary-btn">Auto-Analyze</button>
            <button type="button" id="save-expression-analysis" class="primary-btn">Save Analysis</button>
            <button type="button" id="cancel-expression" class="secondary-btn">Cancel</button>
          </div>
        </div>
      `;
      document.body.appendChild(expressionModal);
    }
    
    function setupEventHandlers() {
      // Close button
      document.getElementById('close-code-graph').addEventListener('click', hide);
      
      // Tab switching
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', switchTab);
      });
      
      // Action buttons
      document.getElementById('add-entity-btn').addEventListener('click', () => openEntityModal());
      document.getElementById('add-relationship-btn').addEventListener('click', () => openRelationshipModal());
      document.getElementById('add-project-btn').addEventListener('click', () => openProjectModal());
      
      document.getElementById('refresh-entities-btn').addEventListener('click', loadEntities);
      document.getElementById('refresh-relationships-btn').addEventListener('click', loadRelationships);
      document.getElementById('refresh-projects-btn').addEventListener('click', loadProjects);
      
      // Search and filter handlers
      document.getElementById('entities-search').addEventListener('input', handleEntitiesSearch);
      document.getElementById('clear-entities-search').addEventListener('click', clearEntitiesSearch);
      document.getElementById('entities-type-filter').addEventListener('change', handleEntitiesFilter);
      document.getElementById('entities-project-filter').addEventListener('change', handleEntitiesFilter);
      document.getElementById('entities-per-page').addEventListener('change', handleEntitiesPerPageChange);
      
      document.getElementById('relationships-search').addEventListener('input', handleRelationshipsSearch);
      document.getElementById('clear-relationships-search').addEventListener('click', clearRelationshipsSearch);
      document.getElementById('relationships-type-filter').addEventListener('change', handleRelationshipsFilter);
      document.getElementById('relationships-per-page').addEventListener('change', handleRelationshipsPerPageChange);
      
      // Modal handling
      document.getElementById('entity-form').addEventListener('submit', saveEntity);
      document.getElementById('relationship-form').addEventListener('submit', saveRelationship);
      document.getElementById('project-form').addEventListener('submit', saveProject);
      
      document.getElementById('cancel-entity').addEventListener('click', closeEntityModal);
      document.getElementById('cancel-relationship').addEventListener('click', closeRelationshipModal);
      document.getElementById('cancel-project').addEventListener('click', closeProjectModal);
      
      // Analysis buttons
      document.getElementById('analyze-complexity-btn').addEventListener('click', analyzeComplexity);
      document.getElementById('analyze-dependencies-btn').addEventListener('click', analyzeDependencies);
      document.getElementById('analyze-coupling-btn').addEventListener('click', analyzeCoupling);
      
      // Visualization
      document.getElementById('load-visualization-btn').addEventListener('click', loadVisualization);
      
      // Import
      document.getElementById('import-entities-btn').addEventListener('click', importFromFiles);

      // Add expression modal handlers
      setupExpressionModalHandlers();
    }
    
    function switchTab(e) {
      const targetTab = e.target.dataset.tab;
      
      // Update tab buttons
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      
      // Update tab content
      document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
      document.getElementById(`${targetTab}-tab`).classList.add('active');
      
      // Load data if needed
      if (targetTab === 'entities') {
        loadEntities();
      } else if (targetTab === 'relationships') {
        loadRelationships();
      } else if (targetTab === 'projects') {
        loadProjects();
      }
    }
    
    // Entity management functions
    async function loadEntities() {
      try {
        const params = new URLSearchParams({
          page: entitiesState.currentPage,
          limit: entitiesState.itemsPerPage
        });
        
        if (entitiesState.searchTerm) params.append('search', entitiesState.searchTerm);
        if (entitiesState.typeFilter) params.append('type', entitiesState.typeFilter);
        if (entitiesState.projectFilter) params.append('project_id', entitiesState.projectFilter);
        
        const response = await fetch(`/api/code-graph/entities?${params}`);
        const data = await response.json();
        
        entitiesData = data.entities || [];
        entitiesState.filteredData = entitiesData;
        
        renderEntitiesList();
        renderEntitiesPagination(data.pagination);
        updateEntitiesResultsInfo(data.pagination);
        
        // Update project filter options
        await updateProjectFilters();
      } catch (error) {
        console.error('Error loading entities:', error);
        showNotification('Error loading entities', 'error');
      }
    }
    
    function renderEntitiesList() {
      const listContainer = document.getElementById('entities-list');
      
      if (entitiesData.length === 0) {
        listContainer.innerHTML = '<p class="empty-message">No code entities found. Add some entities to get started.</p>';
        return;
      }
      
      listContainer.innerHTML = entitiesData.map(entity => `
        <div class="data-item code-entity-item" data-id="${entity.id}">
          <div class="item-info">
            <div class="item-title">
              <span class="entity-name">${entity.name}</span>
              <span class="entity-type-badge ${entity.type}">${entity.type}</span>
            </div>
            <div class="item-meta">
              <span class="file-path">${entity.file_path} 
                <button class="quick-analyze-btn" onclick="CodeGraphManager.quickAnalyzeFile('${entity.file_path}')">📊</button>
              </span>
              ${entity.line_number ? `<span class="line-number">Line ${entity.line_number}</span>` : ''}
              ${entity.project_name ? `<span class="project-name">Project: ${entity.project_name}</span>` : ''}
            </div>
            ${entity.signature ? `<div class="entity-signature" oncontextmenu="showExpressionContextMenu(event, '${entity.id}')">${entity.signature}</div>` : ''}
            ${entity.documentation ? `<div class="entity-docs">${entity.documentation.substring(0, 100)}${entity.documentation.length > 100 ? '...' : ''}</div>` : ''}
          </div>
          <div class="item-actions">
            <button onclick="CodeGraphManager.viewDataFlow('${entity.id}')" class="view-btn">Data Flow</button>
            <button onclick="CodeGraphManager.editEntity('${entity.id}')" class="edit-btn">Edit</button>
            <button onclick="CodeGraphManager.deleteEntity('${entity.id}')" class="delete-btn">Delete</button>
            <button onclick="CodeGraphManager.analyzeExpressionAtLine('${entity.id}', 70, 'const fileExtension = path.extname(inputPath).toLowerCase();')" class="analyze-btn">Analyze Line</button>
          </div>
        </div>
      `).join('');
    }
    
    function handleEntitiesSearch(e) {
      entitiesState.searchTerm = e.target.value.toLowerCase();
      entitiesState.currentPage = 1;
      loadEntities();
    }
    
    function clearEntitiesSearch() {
      document.getElementById('entities-search').value = '';
      entitiesState.searchTerm = '';
      entitiesState.currentPage = 1;
      loadEntities();
    }
    
    function handleEntitiesFilter() {
      entitiesState.typeFilter = document.getElementById('entities-type-filter').value;
      entitiesState.projectFilter = document.getElementById('entities-project-filter').value;
      entitiesState.currentPage = 1;
      loadEntities();
    }
    
    function handleEntitiesPerPageChange(e) {
      entitiesState.itemsPerPage = parseInt(e.target.value);
      entitiesState.currentPage = 1;
      loadEntities();
    }
    
    // Relationship management functions
    async function loadRelationships() {
      try {
        const params = new URLSearchParams({
          page: relationshipsState.currentPage,
          limit: relationshipsState.itemsPerPage
        });
        
        if (relationshipsState.searchTerm) params.append('search', relationshipsState.searchTerm);
        if (relationshipsState.typeFilter) params.append('type', relationshipsState.typeFilter);
        
        const response = await fetch(`/api/code-graph/relationships?${params}`);
        const data = await response.json();
        
        if (data.relationships) {
          relationshipsData = data.relationships;
          relationshipsState.pagination = data.pagination;
        } else if (Array.isArray(data)) {
          relationshipsData = data;
          relationshipsState.pagination = null;
        } else {
          relationshipsData = [];
          relationshipsState.pagination = null;
        }
        
        renderRelationshipsList();
        renderRelationshipsPagination();
        updateRelationshipsResultsInfo();
      } catch (error) {
        console.error('Error loading relationships:', error);
        showNotification('Error loading relationships', 'error');
      }
    }
    
    function renderRelationshipsList() {
      const listContainer = document.getElementById('relationships-list');
      
      if (relationshipsData.length === 0) {
        listContainer.innerHTML = '<p class="empty-message">No relationships found. Add some relationships to connect your code entities.</p>';
        return;
      }
      
      listContainer.innerHTML = relationshipsData.map(rel => `
        <div class="data-item relationship-item" data-id="${rel.id}">
          <div class="item-info">
            <div class="item-title">
              <span class="source-entity">${rel.source_name}</span>
              <span class="relationship-arrow">→</span>
              <span class="target-entity">${rel.target_name}</span>
            </div>
            <div class="item-meta">
              <span class="relationship-type-badge ${rel.relationship_type}">${rel.relationship_type}</span>
              <span class="relationship-strength">Strength: ${rel.relationship_strength}</span>
              ${rel.call_count > 1 ? `<span class="call-count">Calls: ${rel.call_count}</span>` : ''}
              ${rel.file_path ? `<span class="file-path">${rel.file_path}</span>` : ''}
            </div>
            ${rel.context ? `<div class="relationship-context">${rel.context}</div>` : ''}
          </div>
          <div class="item-actions">
            <button onclick="CodeGraphManager.editRelationship('${rel.id}')" class="edit-btn">Edit</button>
            <button onclick="CodeGraphManager.deleteRelationship('${rel.id}')" class="delete-btn">Delete</button>
          </div>
        </div>
      `).join('');
    }
    
    // Project management functions
    async function loadProjects() {
      try {
        const response = await fetch('/api/code-graph/projects');
        projectsData = await response.json();
        renderProjectsList();
      } catch (error) {
        console.error('Error loading projects:', error);
        showNotification('Error loading projects', 'error');
      }
    }
    
    function renderProjectsList() {
      const listContainer = document.getElementById('projects-list');
      
      if (projectsData.length === 0) {
        listContainer.innerHTML = '<p class="empty-message">No projects found. Create a project to organize your code entities.</p>';
        return;
      }
      
      listContainer.innerHTML = projectsData.map(project => `
        <div class="data-item project-item" data-id="${project.id}">
          <div class="item-info">
            <div class="item-title">${project.name}</div>
            <div class="item-meta">
              <span class="language">${project.language}</span>
              ${project.framework ? `<span class="framework">${project.framework}</span>` : ''}
              ${project.version ? `<span class="version">v${project.version}</span>` : ''}
              <span class="entity-count">${project.entity_count} entities</span>
            </div>
            <div class="project-path">${project.base_path}</div>
            ${project.description ? `<div class="project-description">${project.description}</div>` : ''}
          </div>
          <div class="item-actions">
            <button onclick="CodeGraphManager.viewProject('${project.id}')" class="view-btn">View</button>
            <button onclick="CodeGraphManager.editProject('${project.id}')" class="edit-btn">Edit</button>
            <button onclick="CodeGraphManager.deleteProject('${project.id}')" class="delete-btn">Delete</button>
          </div>
        </div>
      `).join('');
    }
    
    // Modal functions
    function openEntityModal(entityId = null) {
      const modal = document.getElementById('entity-modal');
      const title = document.getElementById('entity-modal-title');
      const form = document.getElementById('entity-form');
      
      if (entityId) {
        const entity = entitiesData.find(e => e.id === entityId);
        title.textContent = 'Edit Code Entity';
        
        // Populate form fields
        document.getElementById('entity-name').value = entity.name;
        document.getElementById('entity-type').value = entity.type;
        document.getElementById('entity-file-path').value = entity.file_path;
        document.getElementById('entity-line-number').value = entity.line_number || '';
        document.getElementById('entity-scope').value = entity.scope || 'global';
        document.getElementById('entity-language').value = entity.language || 'javascript';
        document.getElementById('entity-signature').value = entity.signature || '';
        document.getElementById('entity-documentation').value = entity.documentation || '';
        document.getElementById('entity-access-modifier').value = entity.access_modifier || '';
        document.getElementById('entity-return-type').value = entity.return_type || '';
        document.getElementById('entity-is-async').checked = entity.is_async || false;
        document.getElementById('entity-is-static').checked = entity.is_static || false;
        document.getElementById('entity-is-exported').checked = entity.is_exported || false;
        
        form.dataset.entityId = entityId;
      } else {
        title.textContent = 'Add Code Entity';
        form.reset();
        delete form.dataset.entityId;
      }
      
      modal.classList.add('show');
      modal.style.display = 'flex';
    }
    
    function closeEntityModal() {
      const modal = document.getElementById('entity-modal');
      modal.classList.remove('show');
      setTimeout(() => modal.style.display = 'none', 200);
    }
    
    async function saveEntity(e) {
      e.preventDefault();
      
      const form = e.target;
      const isEdit = !!form.dataset.entityId;
      
      const data = {
        name: document.getElementById('entity-name').value,
        type: document.getElementById('entity-type').value,
        file_path: document.getElementById('entity-file-path').value,
        line_number: parseInt(document.getElementById('entity-line-number').value) || null,
        scope: document.getElementById('entity-scope').value,
        language: document.getElementById('entity-language').value,
        signature: document.getElementById('entity-signature').value,
        documentation: document.getElementById('entity-documentation').value,
        access_modifier: document.getElementById('entity-access-modifier').value,
        return_type: document.getElementById('entity-return-type').value,
        is_async: document.getElementById('entity-is-async').checked,
        is_static: document.getElementById('entity-is-static').checked,
        is_exported: document.getElementById('entity-is-exported').checked
      };
      
      try {
        const url = isEdit 
          ? `/api/code-graph/entities/${form.dataset.entityId}`
          : '/api/code-graph/entities';
        
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        if (!response.ok) {
          throw new Error('Failed to save entity');
        }
        
        closeEntityModal();
        loadEntities();
        showNotification(isEdit ? 'Entity updated successfully!' : 'Entity created successfully!', 'success');
      } catch (error) {
        console.error('Error saving entity:', error);
        showNotification('Error saving entity', 'error');
      }
    }
    
    // Analysis functions
    async function analyzeComplexity() {
      try {
        const projectId = document.getElementById('analysis-project-filter').value;
        const response = await fetch('/api/code-graph/analysis/complexity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project_id: projectId || null })
        });
        
        const result = await response.json();
        
        if (result.success) {
          renderAnalysisResults('Complexity Analysis', result.results);
          showNotification('Complexity analysis completed!', 'success');
        }
      } catch (error) {
        console.error('Error analyzing complexity:', error);
        showNotification('Error analyzing complexity', 'error');
      }
    }
    
    function renderAnalysisResults(title, results) {
      const container = document.getElementById('analysis-results');
      
      let html = `<h4>${title}</h4>`;
      
      if (results.length === 0) {
        html += '<p>No results found.</p>';
      } else {
        html += `
          <table class="analysis-table">
            <thead>
              <tr>
                <th>Entity</th>
                <th>Complexity</th>
                <th>Fan In</th>
                <th>Fan Out</th>
              </tr>
            </thead>
            <tbody>
              ${results.map(result => `
                <tr>
                  <td>${result.entity_name}</td>
                  <td>${result.complexity.toFixed(2)}</td>
                  <td>${result.fan_in}</td>
                  <td>${result.fan_out}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }
      
      container.innerHTML = html;
    }
    
    // Visualization functions
    async function loadVisualization() {
      try {
        const projectId = document.getElementById('viz-project-filter').value;
        const typeFilter = document.getElementById('viz-type-filter').value;
        const relationshipFilter = document.getElementById('viz-relationship-filter').value;
        
        const params = new URLSearchParams();
        if (projectId) params.append('project_id', projectId);
        if (typeFilter) params.append('type_filter', typeFilter);
        if (relationshipFilter) params.append('relationship_filter', relationshipFilter);
        
        const response = await fetch(`/api/code-graph/visualization/graph?${params}`);
        const data = await response.json();
        
        renderGraphVisualization(data);
      } catch (error) {
        console.error('Error loading visualization:', error);
        showNotification('Error loading visualization', 'error');
      }
    }
    
    function renderGraphVisualization(data) {
      const container = document.getElementById('code-graph-visualization');
      
      // Simple visualization using basic HTML/CSS
      // In a production environment, you'd use D3.js, vis.js, or similar
      let html = `
        <div class="graph-summary">
          <p><strong>Nodes:</strong> ${data.nodes.length} | <strong>Edges:</strong> ${data.edges.length}</p>
        </div>
        <div class="simple-graph">
      `;
      
      // Create a simple node list with connections
      data.nodes.forEach(node => {
        const connections = data.edges.filter(edge => 
          edge.source === node.id || edge.target === node.id
        );
        
        html += `
          <div class="graph-node ${node.type}" data-id="${node.id}">
            <div class="node-label">${node.label}</div>
            <div class="node-type">${node.type}</div>
            <div class="node-connections">${connections.length} connections</div>
          </div>
        `;
      });
      
      html += '</div>';
      
      // Add connections list
      html += `
        <div class="connections-list">
          <h4>Relationships</h4>
          ${data.edges.map(edge => {
            const sourceNode = data.nodes.find(n => n.id === edge.source);
            const targetNode = data.nodes.find(n => n.id === edge.target);
            return `
              <div class="connection-item">
                <span class="source">${sourceNode?.label}</span>
                <span class="relationship">${edge.type}</span>
                <span class="target">${targetNode?.label}</span>
              </div>
            `;
          }).join('')}
        </div>
      `;
      
      container.innerHTML = html;
    }
    
    // Utility functions
    async function updateProjectFilters() {
      const selectors = [
        'entities-project-filter',
        'analysis-project-filter', 
        'viz-project-filter'
      ];
      
      selectors.forEach(selectorId => {
        const selector = document.getElementById(selectorId);
        if (selector) {
          const currentValue = selector.value;
          selector.innerHTML = '<option value="">All Projects</option>';
          
          projectsData.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name;
            selector.appendChild(option);
          });
          
          if (currentValue) selector.value = currentValue;
        }
      });
    }
    
    function show() {
      container.style.display = 'block';
      loadEntities();
      loadProjects();
    }
    
    function hide() {
      container.style.display = 'none';
    }
    
    function isVisible() {
      return container && container.style.display !== 'none';
    }
    
    // Pagination and search functions for entities
    function renderEntitiesPagination(pagination) {
      const paginationContainer = document.getElementById('entities-pagination');
      
      if (!pagination || pagination.pages <= 1) {
        paginationContainer.innerHTML = '';
        return;
      }
      
      let html = '<div class="pagination">';
      
      // Previous button
      if (pagination.page > 1) {
        html += `<button onclick="CodeGraphManager.changeEntitiesPage(${pagination.page - 1})" class="pagination-btn">Previous</button>`;
      }
      
      // Page numbers
      for (let i = 1; i <= pagination.pages; i++) {
        if (i === pagination.page) {
          html += `<span class="pagination-current">${i}</span>`;
        } else {
          html += `<button onclick="CodeGraphManager.changeEntitiesPage(${i})" class="pagination-btn">${i}</button>`;
        }
      }
      
      // Next button
      if (pagination.page < pagination.pages) {
        html += `<button onclick="CodeGraphManager.changeEntitiesPage(${pagination.page + 1})" class="pagination-btn">Next</button>`;
      }
      
      html += '</div>';
      paginationContainer.innerHTML = html;
    }

    function updateEntitiesResultsInfo(pagination) {
      const infoContainer = document.getElementById('entities-results-info');
      if (pagination) {
        const start = (pagination.page - 1) * pagination.limit + 1;
        const end = Math.min(pagination.page * pagination.limit, pagination.total);
        infoContainer.textContent = `Showing ${start}-${end} of ${pagination.total} entities`;
      } else {
        infoContainer.textContent = `Showing ${entitiesData.length} entities`;
      }
    }

    function changeEntitiesPage(page) {
      entitiesState.currentPage = page;
      loadEntities();
    }

    // Missing relationship functions
    function handleRelationshipsSearch(e) {
      relationshipsState.searchTerm = e.target.value.toLowerCase();
      relationshipsState.currentPage = 1;
      loadRelationships();
    }

    function clearRelationshipsSearch() {
      document.getElementById('relationships-search').value = '';
      relationshipsState.searchTerm = '';
      relationshipsState.currentPage = 1;
      loadRelationships();
    }

    function handleRelationshipsFilter() {
      relationshipsState.typeFilter = document.getElementById('relationships-type-filter').value;
      relationshipsState.currentPage = 1;
      loadRelationships();
    }

    function handleRelationshipsPerPageChange(e) {
      relationshipsState.itemsPerPage = parseInt(e.target.value);
      relationshipsState.currentPage = 1;
      loadRelationships();
    }

    function renderRelationshipsPagination() {
      const paginationContainer = document.getElementById('relationships-pagination');
      
      if (!relationshipsState.pagination || relationshipsState.pagination.pages <= 1) {
        paginationContainer.innerHTML = '';
        return;
      }
      
      const pagination = relationshipsState.pagination;
      let html = '<div class="pagination">';
      
      // Previous button
      if (pagination.page > 1) {
        html += `<button onclick="CodeGraphManager.changeRelationshipsPage(${pagination.page - 1})" class="pagination-btn">Previous</button>`;
      }
      
      // Page numbers
      for (let i = 1; i <= pagination.pages; i++) {
        if (i === pagination.page) {
          html += `<span class="pagination-current">${i}</span>`;
        } else {
          html += `<button onclick="CodeGraphManager.changeRelationshipsPage(${i})" class="pagination-btn">${i}</button>`;
        }
      }
      
      // Next button
      if (pagination.page < pagination.pages) {
        html += `<button onclick="CodeGraphManager.changeRelationshipsPage(${pagination.page + 1})" class="pagination-btn">Next</button>`;
      }
      
      html += '</div>';
      paginationContainer.innerHTML = html;
    }

    function updateRelationshipsResultsInfo() {
      const infoContainer = document.getElementById('relationships-results-info');
      if (relationshipsState.pagination) {
        const pagination = relationshipsState.pagination;
        const start = (pagination.page - 1) * pagination.limit + 1;
        const end = Math.min(pagination.page * pagination.limit, pagination.total);
        infoContainer.textContent = `Showing ${start}-${end} of ${pagination.total} relationships`;
      } else {
        infoContainer.textContent = `Showing ${relationshipsData.length} relationships`;
      }
    }

    function changeRelationshipsPage(page) {
      relationshipsState.currentPage = page;
      loadRelationships();
    }

    // Missing modal functions
    function openRelationshipModal(relationshipId = null) {
      const modal = document.getElementById('relationship-modal');
      const title = document.getElementById('relationship-modal-title');
      const form = document.getElementById('relationship-form');
      
      // Load entities for dropdowns
      loadEntitiesForDropdowns();
      
      if (relationshipId) {
        const relationship = relationshipsData.find(r => r.id === relationshipId);
        title.textContent = 'Edit Relationship';
        
        // Populate form fields
        document.getElementById('relationship-source').value = relationship.source_entity_id;
        document.getElementById('relationship-target').value = relationship.target_entity_id;
        document.getElementById('relationship-type').value = relationship.relationship_type;
        document.getElementById('relationship-strength').value = relationship.relationship_strength || 5;
        document.getElementById('relationship-context').value = relationship.context || '';
        document.getElementById('relationship-file-path').value = relationship.file_path || '';
        document.getElementById('relationship-line-number').value = relationship.line_number || '';
        
        form.dataset.relationshipId = relationshipId;
      } else {
        title.textContent = 'Add Relationship';
        form.reset();
        delete form.dataset.relationshipId;
      }
      
      modal.classList.add('show');
      modal.style.display = 'flex';
    }

    function closeRelationshipModal() {
      const modal = document.getElementById('relationship-modal');
      modal.classList.remove('show');
      setTimeout(() => modal.style.display = 'none', 200);
    }

    function openProjectModal(projectId = null) {
      const modal = document.getElementById('project-modal');
      const title = document.getElementById('project-modal-title');
      const form = document.getElementById('project-form');
      
      if (projectId) {
        const project = projectsData.find(p => p.id === projectId);
        title.textContent = 'Edit Project';
        
        // Populate form fields
        document.getElementById('project-name').value = project.name;
        document.getElementById('project-language').value = project.language || 'javascript';
        document.getElementById('project-base-path').value = project.base_path;
        document.getElementById('project-description').value = project.description || '';
        document.getElementById('project-framework').value = project.framework || '';
        document.getElementById('project-version').value = project.version || '';
        
        form.dataset.projectId = projectId;
      } else {
        title.textContent = 'Add Project';
        form.reset();
        delete form.dataset.projectId;
      }
      
      modal.classList.add('show');
      modal.style.display = 'flex';
    }

    function closeProjectModal() {
      const modal = document.getElementById('project-modal');
      modal.classList.remove('show');
      setTimeout(() => modal.style.display = 'none', 200);
    }

    // Missing save functions
    async function saveRelationship(e) {
      e.preventDefault();
      
      const form = e.target;
      const isEdit = !!form.dataset.relationshipId;
      
      const data = {
        source_entity_id: document.getElementById('relationship-source').value,
        target_entity_id: document.getElementById('relationship-target').value,
        relationship_type: document.getElementById('relationship-type').value,
        relationship_strength: parseFloat(document.getElementById('relationship-strength').value) || 5,
        context: document.getElementById('relationship-context').value,
        file_path: document.getElementById('relationship-file-path').value,
        line_number: parseInt(document.getElementById('relationship-line-number').value) || null
      };
      
      try {
        const url = isEdit 
          ? `/api/code-graph/relationships/${form.dataset.relationshipId}`
          : '/api/code-graph/relationships';
        
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        if (!response.ok) {
          throw new Error('Failed to save relationship');
        }
        
        closeRelationshipModal();
        loadRelationships();
        showNotification(isEdit ? 'Relationship updated successfully!' : 'Relationship created successfully!', 'success');
      } catch (error) {
        console.error('Error saving relationship:', error);
        showNotification('Error saving relationship', 'error');
      }
    }

    async function saveProject(e) {
      e.preventDefault();
      
      const form = e.target;
      const isEdit = !!form.dataset.projectId;
      
      const data = {
        name: document.getElementById('project-name').value,
        language: document.getElementById('project-language').value,
        base_path: document.getElementById('project-base-path').value,
        description: document.getElementById('project-description').value,
        framework: document.getElementById('project-framework').value,
        version: document.getElementById('project-version').value
      };
      
      try {
        const url = isEdit 
          ? `/api/code-graph/projects/${form.dataset.projectId}`
          : '/api/code-graph/projects';
        
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        if (!response.ok) {
          throw new Error('Failed to save project');
        }
        
        closeProjectModal();
        loadProjects();
        showNotification(isEdit ? 'Project updated successfully!' : 'Project created successfully!', 'success');
      } catch (error) {
        console.error('Error saving project:', error);
        showNotification('Error saving project', 'error');
      }
    }

    // Missing analysis functions
    async function analyzeDependencies() {
      try {
        const projectId = document.getElementById('analysis-project-filter').value;
        const response = await fetch('/api/code-graph/analysis/dependencies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project_id: projectId || null })
        });
        
        const result = await response.json();
        
        if (result.success) {
          renderAnalysisResults('Dependency Analysis', result.dependency_details || []);
          showNotification('Dependency analysis completed!', 'success');
        }
      } catch (error) {
        console.error('Error analyzing dependencies:', error);
        showNotification('Error analyzing dependencies', 'error');
      }
    }

    async function analyzeCoupling() {
      try {
        const projectId = document.getElementById('analysis-project-filter').value;
        const response = await fetch('/api/code-graph/analysis/coupling', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project_id: projectId || null })
        });
        
        const result = await response.json();
        
        if (result.success) {
          renderAnalysisResults('Coupling Analysis', result.results);
          showNotification('Coupling analysis completed!', 'success');
        }
      } catch (error) {
        console.error('Error analyzing coupling:', error);
        showNotification('Error analyzing coupling', 'error');
      }
    }

    // Missing utility functions
    async function loadEntitiesForDropdowns() {
      try {
        const response = await fetch('/api/code-graph/entities?limit=1000');
        const data = await response.json();
        const entities = data.entities || data;
        
        const sourceSelect = document.getElementById('relationship-source');
        const targetSelect = document.getElementById('relationship-target');
        
        // Clear existing options
        sourceSelect.innerHTML = '<option value="">Select source entity...</option>';
        targetSelect.innerHTML = '<option value="">Select target entity...</option>';
        
        // Add entity options
        entities.forEach(entity => {
          const option1 = document.createElement('option');
          option1.value = entity.id;
          option1.textContent = `${entity.name} (${entity.type}) - ${entity.file_path}`;
          sourceSelect.appendChild(option1);
          
          const option2 = document.createElement('option');
          option2.value = entity.id;
          option2.textContent = `${entity.name} (${entity.type}) - ${entity.file_path}`;
          targetSelect.appendChild(option2);
        });
      } catch (error) {
        console.error('Error loading entities for dropdowns:', error);
      }
    }

    async function importFromFiles() {
      // Placeholder for file import functionality
      showNotification('File import functionality not yet implemented', 'info');
    }

    // Expression analysis functions
    function openExpressionModal(entityId, lineNumber, codeText) {
      const modal = document.getElementById('expression-modal');
      const title = document.getElementById('expression-modal-title');
      
      // Set context
      document.getElementById('expression-code-line').value = codeText;
      document.getElementById('expression-line-number').value = lineNumber;
      
      // Load parent function info
      loadParentFunctionInfo(entityId);
      
      // Auto-analyze the expression
      autoAnalyzeExpression(codeText, entityId, lineNumber);
      
      modal.classList.add('show');
      modal.style.display = 'flex';
    }

    function autoAnalyzeExpression(codeText, entityId, lineNumber) {
      // Parse the code line to detect variables, method calls, etc.
      const analysis = parseCodeLine(codeText);
      
      // Populate detected variables
      populateDetectedVariables(analysis.variables, entityId, lineNumber);
      
      // Populate detected method calls
      populateDetectedMethodCalls(analysis.methodCalls, entityId, lineNumber);
      
      // Analyze data flow
      analyzeDataFlow(analysis, entityId, lineNumber);
      
      // Analyze dependencies
      analyzeDependencies(analysis);
    }

    function parseCodeLine(codeText) {
      const analysis = {
        variables: [],
        methodCalls: [],
        dataFlow: [],
        dependencies: {
          external: [],
          builtin: [],
          internal: []
        }
      };
      
      // Example parsing for: const fileExtension = path.extname(inputPath).toLowerCase();
      
      // Detect variable declarations
      const varMatch = codeText.match(/(?:const|let|var)\s+(\w+)\s*=/);
      if (varMatch) {
        analysis.variables.push({
          name: varMatch[1],
          declarationType: codeText.includes('const') ? 'const' : 
                         codeText.includes('let') ? 'let' : 'var',
          dataType: 'string', // Could be inferred
          mutability: codeText.includes('const') ? 'immutable' : 'mutable',
          initialValueType: 'expression'
        });
      }
      
      // Detect method calls
      const methodMatches = codeText.matchAll(/(\w+(?:\.\w+)*)\(/g);
      for (const match of methodMatches) {
        const fullMethod = match[1];
        const parts = fullMethod.split('.');
        
        analysis.methodCalls.push({
          name: parts[parts.length - 1],
          fullPath: fullMethod,
          callType: parts.length > 1 ? 'chained' : 'direct',
          moduleSource: detectModuleSource(parts[0]),
          chainPosition: detectChainPosition(codeText, match.index)
        });
      }
      
      // Detect parameters used
      const paramMatches = codeText.matchAll(/\b(\w+)\b/g);
      for (const match of paramMatches) {
        if (!['const', 'let', 'var', 'path', 'extname', 'toLowerCase'].includes(match[1])) {
          analysis.dependencies.internal.push(match[1]);
        }
      }
      
      return analysis;
    }

    function detectModuleSource(identifier) {
      const builtinModules = ['path', 'fs', 'crypto', 'util'];
      const builtinMethods = ['toString', 'toLowerCase', 'toUpperCase', 'parseInt'];
      
      if (builtinModules.includes(identifier)) return 'external';
      if (builtinMethods.includes(identifier)) return 'built-in';
      return 'local';
    }

    function detectChainPosition(codeText, position) {
      const beforeDot = codeText.substring(0, position).lastIndexOf('.');
      const afterParen = codeText.substring(position).indexOf(')');
      const nextDot = codeText.substring(position + afterParen).indexOf('.');
      
      if (beforeDot === -1 && nextDot === -1) return 'standalone';
      if (beforeDot === -1) return 'first';
      if (nextDot === -1) return 'last';
      return 'intermediate';
    }

    function populateDetectedVariables(variables, entityId, lineNumber) {
      const container = document.getElementById('detected-variables-list');
      
      container.innerHTML = variables.map(variable => `
        <div class="detected-item" data-variable="${variable.name}">
          <div class="detected-item-info">
            <div class="detected-item-name">${variable.name}</div>
            <div class="detected-item-meta">
              ${variable.declarationType} | ${variable.dataType} | ${variable.mutability}
            </div>
          </div>
          <div class="detected-item-actions">
            <button class="edit-detected-btn" onclick="editDetectedVariable('${variable.name}')">Edit</button>
            <button class="delete-detected-btn" onclick="deleteDetectedVariable('${variable.name}')">Delete</button>
          </div>
        </div>
      `).join('');
    }

    function populateDetectedMethodCalls(methodCalls, entityId, lineNumber) {
      const container = document.getElementById('detected-method-calls-list');
      
      container.innerHTML = methodCalls.map((call, index) => `
        <div class="detected-item" data-method="${call.name}-${index}">
          <div class="detected-item-info">
            <div class="detected-item-name">${call.fullPath}</div>
            <div class="detected-item-meta">
              ${call.callType} | ${call.moduleSource} | ${call.chainPosition}
            </div>
          </div>
          <div class="detected-item-actions">
            <button class="edit-detected-btn" onclick="editDetectedMethodCall('${call.name}-${index}')">Edit</button>
            <button class="delete-detected-btn" onclick="deleteDetectedMethodCall('${call.name}-${index}')">Delete</button>
          </div>
        </div>
      `).join('');
    }

    // Add event handlers for expression modal
    function setupExpressionModalHandlers() {
      // Tab switching
      document.querySelectorAll('.expression-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const targetTab = e.target.dataset.tab;
          
          // Update tab buttons
          document.querySelectorAll('.expression-tab-btn').forEach(b => b.classList.remove('active'));
          e.target.classList.add('active');
          
          // Update tab content
          document.querySelectorAll('.expression-tab-content').forEach(content => content.classList.remove('active'));
          document.getElementById(`${targetTab}-expression-tab`).classList.add('active');
        });
      });
      
      // Form submissions
      document.getElementById('variable-form').addEventListener('submit', saveVariable);
      document.getElementById('method-call-form').addEventListener('submit', saveMethodCall);
      document.getElementById('data-flow-form').addEventListener('submit', saveDataFlow);
      
      // Modal actions
      document.getElementById('analyze-expression-btn').addEventListener('click', () => {
        const codeText = document.getElementById('expression-code-line').value;
        const entityId = document.getElementById('expression-parent-function').dataset.entityId;
        const lineNumber = document.getElementById('expression-line-number').value;
        autoAnalyzeExpression(codeText, entityId, lineNumber);
      });
      
      document.getElementById('cancel-expression').addEventListener('click', closeExpressionModal);
    }

    function closeExpressionModal() {
      const modal = document.getElementById('expression-modal');
      modal.classList.remove('show');
      setTimeout(() => modal.style.display = 'none', 200);
    }

    // Add missing functions after the existing expression analysis functions

    function loadParentFunctionInfo(entityId) {
      // Load information about the parent function/entity
      fetch(`/api/code-graph/entities/${entityId}`)
        .then(response => response.json())
        .then(entity => {
          document.getElementById('expression-parent-function').value = entity.name || 'Unknown';
          document.getElementById('expression-parent-function').dataset.entityId = entityId;
        })
        .catch(error => {
          console.error('Error loading parent function info:', error);
          document.getElementById('expression-parent-function').value = 'Error loading';
        });
    }

    function analyzeDataFlow(analysis, entityId, lineNumber) {
      // Placeholder for data flow analysis
      console.log('Analyzing data flow for:', analysis);
      
      // Update data flow diagram
      const diagram = document.getElementById('data-flow-diagram');
      if (diagram) {
        diagram.innerHTML = `
          <div style="text-align: center; color: #666;">
            <p>Data Flow Analysis</p>
            <p>Variables: ${analysis.variables.length}</p>
            <p>Method Calls: ${analysis.methodCalls.length}</p>
            <p>Dependencies: ${analysis.dependencies.internal.length}</p>
          </div>
        `;
      }
    }

    function analyzeDependencies(analysis) {
      // Populate dependencies lists
      const externalList = document.getElementById('external-dependencies-list');
      const builtinList = document.getElementById('builtin-dependencies-list');
      const internalList = document.getElementById('internal-dependencies-list');
      
      if (externalList) {
        externalList.innerHTML = analysis.dependencies.external.length > 0 
          ? analysis.dependencies.external.map(dep => `<div class="dependency-item">${dep}</div>`).join('')
          : '<div class="empty-message">No external dependencies detected</div>';
      }
      
      if (builtinList) {
        builtinList.innerHTML = analysis.dependencies.builtin.length > 0
          ? analysis.dependencies.builtin.map(dep => `<div class="dependency-item">${dep}</div>`).join('')
          : '<div class="empty-message">No built-in dependencies detected</div>';
      }
      
      if (internalList) {
        internalList.innerHTML = analysis.dependencies.internal.length > 0
          ? analysis.dependencies.internal.map(dep => `<div class="dependency-item">${dep}</div>`).join('')
          : '<div class="empty-message">No internal dependencies detected</div>';
      }
    }

    // Add missing form save functions
    function saveVariable(e) {
      e.preventDefault();
      
      const variableData = {
        name: document.getElementById('variable-name').value,
        declarationType: document.getElementById('variable-declaration-type').value,
        dataType: document.getElementById('variable-data-type').value,
        scopeType: document.getElementById('variable-scope-type').value,
        initialValueType: document.getElementById('variable-initial-value-type').value,
        mutability: document.getElementById('variable-mutability').value,
        columnStart: parseInt(document.getElementById('variable-column-start').value) || 0,
        columnEnd: parseInt(document.getElementById('variable-column-end').value) || 0,
        isExported: document.getElementById('variable-is-exported').checked
      };
      
      console.log('Saving variable:', variableData);
      
      // Add to detected variables list
      const container = document.getElementById('detected-variables-list');
      const newItem = document.createElement('div');
      newItem.className = 'detected-item';
      newItem.innerHTML = `
        <div class="detected-item-info">
          <div class="detected-item-name">${variableData.name}</div>
          <div class="detected-item-meta">
            ${variableData.declarationType} | ${variableData.dataType} | ${variableData.mutability}
          </div>
        </div>
        <div class="detected-item-actions">
          <button class="edit-detected-btn" onclick="editDetectedVariable('${variableData.name}')">Edit</button>
          <button class="delete-detected-btn" onclick="deleteDetectedVariable('${variableData.name}')">Delete</button>
        </div>
      `;
      
      container.appendChild(newItem);
      
      // Clear form
      document.getElementById('variable-form').reset();
      
      showNotification('Variable added successfully!', 'success');
    }

    function saveMethodCall(e) {
      e.preventDefault();
      
      const methodCallData = {
        name: document.getElementById('method-call-name').value,
        callType: document.getElementById('method-call-type').value,
        moduleSource: document.getElementById('method-module-source').value,
        chainPosition: document.getElementById('method-chain-position').value,
        argumentsCount: parseInt(document.getElementById('method-arguments-count').value) || 0,
        returnType: document.getElementById('method-return-type').value,
        columnStart: parseInt(document.getElementById('method-column-start').value) || 0,
        columnEnd: parseInt(document.getElementById('method-column-end').value) || 0,
        isAsync: document.getElementById('method-is-async').checked
      };
      
      console.log('Saving method call:', methodCallData);
      
      // Add to detected method calls list
      const container = document.getElementById('detected-method-calls-list');
      const newItem = document.createElement('div');
      newItem.className = 'detected-item';
      newItem.innerHTML = `
        <div class="detected-item-info">
          <div class="detected-item-name">${methodCallData.name}</div>
          <div class="detected-item-meta">
            ${methodCallData.callType} | ${methodCallData.moduleSource} | ${methodCallData.chainPosition}
          </div>
        </div>
        <div class="detected-item-actions">
          <button class="edit-detected-btn" onclick="editDetectedMethodCall('${methodCallData.name}')">Edit</button>
          <button class="delete-detected-btn" onclick="deleteDetectedMethodCall('${methodCallData.name}')">Delete</button>
        </div>
      `;
      
      container.appendChild(newItem);
      
      // Clear form
      document.getElementById('method-call-form').reset();
      
      showNotification('Method call added successfully!', 'success');
    }

    function saveDataFlow(e) {
      e.preventDefault();
      
      const dataFlowData = {
        sourceType: document.getElementById('data-flow-source-type').value,
        sourceId: document.getElementById('data-flow-source-id').value,
        targetType: document.getElementById('data-flow-target-type').value,
        targetId: document.getElementById('data-flow-target-id').value,
        flowType: document.getElementById('data-flow-type').value,
        transformation: document.getElementById('data-flow-transformation').value
      };
      
      console.log('Saving data flow:', dataFlowData);
      
      // Clear form
      document.getElementById('data-flow-form').reset();
      
      showNotification('Data flow relationship added successfully!', 'success');
    }

    // Add missing edit/delete functions for detected items
    function editDetectedVariable(variableName) {
      console.log('Editing variable:', variableName);
      // Populate the variable form with existing data
      document.getElementById('variable-name').value = variableName;
      showNotification('Variable loaded for editing', 'info');
    }

    function deleteDetectedVariable(variableName) {
      if (confirm(`Delete variable "${variableName}"?`)) {
        const item = document.querySelector(`[data-variable="${variableName}"]`);
        if (item) {
          item.remove();
          showNotification('Variable deleted', 'success');
        }
      }
    }

    function editDetectedMethodCall(methodCallId) {
      console.log('Editing method call:', methodCallId);
      // Extract method name from ID
      const methodName = methodCallId.split('-')[0];
      document.getElementById('method-call-name').value = methodName;
      showNotification('Method call loaded for editing', 'info');
    }

    function deleteDetectedMethodCall(methodCallId) {
      if (confirm(`Delete method call "${methodCallId}"?`)) {
        const item = document.querySelector(`[data-method="${methodCallId}"]`);
        if (item) {
          item.remove();
          showNotification('Method call deleted', 'success');
        }
      }
    }

    // Add missing quick analyze function
    function quickAnalyzeFile(filePath) {
      console.log('Quick analyzing file:', filePath);
      showNotification(`Analyzing file: ${filePath}`, 'info');
      
      // This would typically trigger a file analysis
      // For now, just show a placeholder message
      setTimeout(() => {
        showNotification('File analysis completed (placeholder)', 'success');
      }, 1000);
    }

    // Public API - Updated to include all necessary functions
    return {
      initialize,
      show,
      hide,
      isVisible,
      editEntity: (id) => openEntityModal(id),
      deleteEntity: async (id) => {
        if (confirm('Are you sure you want to delete this entity? This will also delete all related relationships.')) {
          try {
            const response = await fetch(`/api/code-graph/entities/${id}`, { method: 'DELETE' });
            if (response.ok) {
              loadEntities();
              showNotification('Entity deleted successfully!', 'success');
            }
          } catch (error) {
            console.error('Error deleting entity:', error);
            showNotification('Error deleting entity', 'error');
          }
        }
      },
      viewDataFlow: async (id) => {
        try {
          const response = await fetch(`/api/code-graph/visualization/flow/${id}`);
          const data = await response.json();
          
          // Open a modal or new tab to show data flow
          console.log('Data flow for entity:', data);
          showNotification('Data flow loaded (check console)', 'info');
        } catch (error) {
          console.error('Error loading data flow:', error);
          showNotification('Error loading data flow', 'error');
        }
      },
      // Add missing public functions
      changeEntitiesPage,
      changeRelationshipsPage,
      editRelationship: (id) => openRelationshipModal(id),
      deleteRelationship: async (id) => {
        if (confirm('Are you sure you want to delete this relationship?')) {
          try {
            const response = await fetch(`/api/code-graph/relationships/${id}`, { method: 'DELETE' });
            if (response.ok) {
              loadRelationships();
              showNotification('Relationship deleted successfully!', 'success');
            }
          } catch (error) {
            console.error('Error deleting relationship:', error);
            showNotification('Error deleting relationship', 'error');
          }
        }
      },
      editProject: (id) => openProjectModal(id),
      deleteProject: async (id) => {
        if (confirm('Are you sure you want to delete this project? This will also delete all related entities and relationships.')) {
          try {
            const response = await fetch(`/api/code-graph/projects/${id}`, { method: 'DELETE' });
            if (response.ok) {
              loadProjects();
              showNotification('Project deleted successfully!', 'success');
            }
          } catch (error) {
            console.error('Error deleting project:', error);
            showNotification('Error deleting project', 'error');
          }
        }
      },
      viewProject: (id) => {
        // Switch to entities tab and filter by project
        document.querySelector('[data-tab="entities"]').click();
        document.getElementById('entities-project-filter').value = id;
        handleEntitiesFilter();
      },
      analyzeExpressionAtLine: (entityId, lineNumber, codeText) => openExpressionModal(entityId, lineNumber, codeText),
      quickAnalyzeFile: quickAnalyzeFile
    };
})();

// IMPORTANT: Assign to window object immediately after definition
window.CodeGraphManager = CodeGraphManager;

// Notification function
function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.className = 'code-graph-notification';
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

// Make functions available globally for onclick handlers
window.changeEntitiesPage = (page) => CodeGraphManager.changeEntitiesPage(page);
window.changeRelationshipsPage = (page) => CodeGraphManager.changeRelationshipsPage(page);

// Make sure these functions are available globally for the expression modal
window.editDetectedVariable = function(variableName) {
  console.log('Editing variable:', variableName);
  document.getElementById('variable-name').value = variableName;
  showNotification('Variable loaded for editing', 'info');
};

window.deleteDetectedVariable = function(variableName) {
  if (confirm(`Delete variable "${variableName}"?`)) {
    const item = document.querySelector(`[data-variable="${variableName}"]`);
    if (item) {
      item.remove();
      showNotification('Variable deleted', 'success');
    }
  }
};

window.editDetectedMethodCall = function(methodCallId) {
  console.log('Editing method call:', methodCallId);
  const methodName = methodCallId.split('-')[0];
  document.getElementById('method-call-name').value = methodName;
  showNotification('Method call loaded for editing', 'info');
};

window.deleteDetectedMethodCall = function(methodCallId) {
  if (confirm(`Delete method call "${methodCallId}"?`)) {
    const item = document.querySelector(`[data-method="${methodCallId}"]`);
    if (item) {
      item.remove();
      showNotification('Method call deleted', 'success');
    }
  }
};