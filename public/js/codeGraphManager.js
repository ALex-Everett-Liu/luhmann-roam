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
    
    // Add state tracking for current expression analysis session
    let currentExpressionSession = {
      entityId: null,
      lineNumber: null,
      codeText: null,
      variables: [],
      methodCalls: [],
      dataFlow: []
    };
    
    // Add missing state tracking for editing
    let editingState = {
      variable: null,
      methodCall: null,
      dataFlow: null
    };
    
    // ADD THE CONSTANTS HERE - INSIDE THE MODULE SCOPE
    const EXPRESSION_RELATIONSHIP_TYPES = {
        'assigned_from': 'Assigned From',
        'calls_with': 'Calls With', 
        'called_on': 'Called On',
        'used_by': 'Used By',
        'defines': 'Defines',
        'returns_to': 'Returns To',
        'flows_to': 'Flows To',
        'transforms_via': 'Transforms Via',
        'depends_on': 'Depends On',
        'produces': 'Produces'
      };
    
    // Add this at the top of the module, after the variable declarations
    let _isInitialized = false;
    
    function initialize() {
        if (_isInitialized) {
            console.log('CodeGraphManager already initialized');
            return;
        }
        
        createContainer();
        setupEventHandlers();
        _isInitialized = true;
        console.log('CodeGraphManager initialized successfully');
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
            
            <!-- Line Analysis Tab -->
            <div id="line-analysis-tab" class="tab-content">
              <div class="line-analysis-controls">
                <h3>Line-by-Line Code Analysis</h3>
                <div class="analysis-instructions">
                  <p>Use the "Analyze Line" button on any entity to perform detailed expression analysis.</p>
                  <p>This feature allows you to:</p>
                  <ul>
                    <li>Analyze variables and their types</li>
                    <li>Track method calls and dependencies</li>
                    <li>Visualize data flow within expressions</li>
                    <li>Identify external and internal dependencies</li>
                  </ul>
                </div>
                <div class="recent-analyses">
                  <h4>Recent Line Analyses</h4>
                  <div id="recent-analyses-list" class="analysis-list">
                    <p class="empty-message">No recent analyses. Click "Analyze Line" on any entity to get started.</p>
                  </div>
                </div>
              </div>
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

      // Expression Analysis Modal with updated method calls form
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
              <h4 id="variable-form-title">Add Variable</h4>
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
                
                <button type="submit" id="variable-submit-btn" class="primary-btn">Add Variable</button>
                <button type="button" id="variable-cancel-edit-btn" class="secondary-btn" style="display: none;">Cancel Edit</button>
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
              <h4 id="method-call-form-title">Add Method Call</h4>
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
                    <label>Expression Type:</label>
                    <select id="method-expression-type">
                      <option value="call">call</option>
                      <option value="assignment">assignment</option>
                      <option value="parameter">parameter</option>
                      <option value="return">return</option>
                      <option value="conditional">conditional</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Module Source:</label>
                    <select id="method-module-source">
                      <option value="built-in">built-in</option>
                      <option value="external">external</option>
                      <option value="local">local</option>
                      <option value="third-party">third-party</option>
                    </select>
                  </div>
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label>Chain Position:</label>
                    <select id="method-chain-position">
                      <option value="standalone">standalone</option>
                      <option value="first">first</option>
                      <option value="intermediate">intermediate</option>
                      <option value="last">last</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Arguments Count:</label>
                    <input type="number" id="method-arguments-count" min="0" value="0">
                  </div>
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label>Return Type:</label>
                    <input type="text" id="method-return-type" placeholder="string, number, void, etc.">
                  </div>
                  <div class="form-group">
                    <label>Parameters Used:</label>
                    <textarea id="method-parameters-used" rows="2" placeholder="Comma-separated list of parameters used"></textarea>
                  </div>
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label>External Dependencies:</label>
                    <textarea id="method-external-dependencies" rows="2" placeholder="External modules or libraries used"></textarea>
                  </div>
                  <div class="form-group">
                    <label>Built-in Dependencies:</label>
                    <textarea id="method-builtin-dependencies" rows="2" placeholder="Built-in methods or functions used"></textarea>
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
                
                <button type="submit" id="method-call-submit-btn" class="primary-btn">Add Method Call</button>
                <button type="button" id="method-call-cancel-edit-btn" class="secondary-btn" style="display: none;">Cancel Edit</button>
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
              <h4 id="data-flow-form-title">Add Data Flow Relationship</h4>
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
                
                <button type="submit" id="data-flow-submit-btn" class="primary-btn">Add Data Flow</button>
                <button type="button" id="data-flow-cancel-edit-btn" class="secondary-btn" style="display: none;">Cancel Edit</button>
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

      // REMOVE THIS LINE - Don't call setupExpressionModalHandlers here
      // setupExpressionModalHandlers();
    }
    
    function switchTab(e) {
      const targetTab = e.target.dataset.tab;
      
      // Validate that we have a target tab
      if (!targetTab) {
        console.error('No target tab specified');
        return;
      }
      
      // Update tab buttons
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      
      // Update tab content - add null check
      document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
      
      const targetTabElement = document.getElementById(`${targetTab}-tab`);
      if (targetTabElement) {
        targetTabElement.classList.add('active');
      } else {
        console.error(`Tab element not found: ${targetTab}-tab`);
        return;
      }
      
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
      // Set up the current session
      currentExpressionSession = {
        entityId: entityId,
        lineNumber: lineNumber,
        codeText: codeText,
        variables: [],
        methodCalls: [],
        dataFlow: []
      };
      
      // Create and show the modal
      const modal = document.getElementById('expression-modal');
      if (!modal) {
        console.error('Expression modal not found!');
        return;
      }
      
      // Load parent function info
      loadParentFunctionInfo(entityId);
      
      // Fix: Add null checks for these elements
      const codeTextElement = document.getElementById('expression-code-text');
      const lineNumberElement = document.getElementById('expression-line-number');
      
      if (codeTextElement) {
        codeTextElement.textContent = codeText;
      } else {
        console.warn('expression-code-text element not found');
      }
      
      if (lineNumberElement) {
        lineNumberElement.textContent = lineNumber;
      } else {
        console.warn('expression-line-number element not found');
      }
      
      // Load existing data from database
      loadExpressionVariables();
      loadExpressionMethodCalls();
      loadExpressionDataFlow();
      
      // Show the modal
      modal.style.display = 'block';
      setTimeout(() => modal.classList.add('show'), 10);
      
      // Setup event handlers after modal is shown
      setupExpressionModalHandlers();
    }

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

    // Updated saveVariable function - save to database
    async function saveVariable(e) {
      e.preventDefault();
      
      const variableData = {
        name: document.getElementById('variable-name').value,
        declaration_type: document.getElementById('variable-declaration-type').value,
        data_type: document.getElementById('variable-data-type').value,
        scope_type: document.getElementById('variable-scope-type').value,
        initial_value_type: document.getElementById('variable-initial-value-type').value,
        mutability: document.getElementById('variable-mutability').value,
        column_start: parseInt(document.getElementById('variable-column-start').value) || 0,
        column_end: parseInt(document.getElementById('variable-column-end').value) || 0,
        is_exported: document.getElementById('variable-is-exported').checked,
        parent_entity_id: currentExpressionSession.entityId,
        line_number: currentExpressionSession.lineNumber
      };
      
      try {
        let response;
        if (editingState.variable) {
          // Update existing variable
          response = await fetch(`/api/code-graph/variables/${editingState.variable}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(variableData)
          });
        } else {
          // Create new variable
          response = await fetch('/api/code-graph/variables', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(variableData)
          });
        }
        
        if (!response.ok) {
          throw new Error('Failed to save variable');
        }
        
        const savedVariable = await response.json();
        
        // Update local session data
        if (editingState.variable) {
          const index = currentExpressionSession.variables.findIndex(v => v.id === editingState.variable);
          if (index !== -1) {
            currentExpressionSession.variables[index] = savedVariable;
          }
          showNotification('Variable updated successfully!', 'success');
        } else {
          currentExpressionSession.variables.push(savedVariable);
          showNotification('Variable added successfully!', 'success');
        }

        // Refresh the variables list
        await loadExpressionVariables();
        
        // Reset form and editing state
        document.getElementById('variable-form').reset();
        resetVariableForm();
      } catch (error) {
        console.error('Error saving variable:', error);
        showNotification('Error saving variable', 'error');
      }
    }

    // Updated saveMethodCall function - save to database
    async function saveMethodCall(e) {
      e.preventDefault();
      
      const methodCallData = {
        method_name: document.getElementById('method-call-name').value,
        call_type: document.getElementById('method-call-type').value,
        expression_type: document.getElementById('method-expression-type').value,
        module_source: document.getElementById('method-module-source').value,
        chain_position: document.getElementById('method-chain-position').value,
        arguments_count: parseInt(document.getElementById('method-arguments-count').value) || 0,
        return_type: document.getElementById('method-return-type').value,
        parameters_used: document.getElementById('method-parameters-used').value,
        external_dependencies: document.getElementById('method-external-dependencies').value,
        builtin_dependencies: document.getElementById('method-builtin-dependencies').value,
        column_start: parseInt(document.getElementById('method-column-start').value) || 0,
        column_end: parseInt(document.getElementById('method-column-end').value) || 0,
        is_async: document.getElementById('method-is-async').checked,
        parent_entity_id: currentExpressionSession.entityId,
        line_number: currentExpressionSession.lineNumber
      };
      
      // ADD THIS DEBUGGING
      console.log('🚀 Sending method call data:', methodCallData);
      console.log('🚀 Data types:', {
        method_name: typeof methodCallData.method_name,
        parent_entity_id: typeof methodCallData.parent_entity_id,
        line_number: typeof methodCallData.line_number
      });
      
      try {
        let response;
        if (editingState.methodCall) {
          // Update existing method call
          response = await fetch(`/api/code-graph/method-calls/${editingState.methodCall}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(methodCallData)
          });
        } else {
          // Create new method call
          response = await fetch('/api/code-graph/method-calls', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(methodCallData)
          });
        }
        
        if (!response.ok) {
          throw new Error('Failed to save method call');
        }
        
        const savedMethodCall = await response.json();
        
        // Update local session data
        if (editingState.methodCall) {
          const index = currentExpressionSession.methodCalls.findIndex(m => m.id === editingState.methodCall);
          if (index !== -1) {
            currentExpressionSession.methodCalls[index] = savedMethodCall;
          }
          showNotification('Method call updated successfully!', 'success');
        } else {
          currentExpressionSession.methodCalls.push(savedMethodCall);
          showNotification('Method call added successfully!', 'success');
        }
        
        // Refresh the method calls list
        await loadExpressionMethodCalls();
        
        // Reset form and editing state
        document.getElementById('method-call-form').reset();
        resetMethodCallForm();
      } catch (error) {
        console.error('Error saving method call:', error);
        showNotification('Error saving method call', 'error');
      }
    }

    // Load variables for current expression from database
    async function loadExpressionVariables() {
      console.log('🔍 Loading variables for:', {
        entityId: currentExpressionSession.entityId,
        lineNumber: currentExpressionSession.lineNumber
      });
      
      try {
        const url = `/api/code-graph/variables?parent_entity_id=${currentExpressionSession.entityId}&line_number=${currentExpressionSession.lineNumber}`;
        console.log('📡 Fetching variables from:', url);
        
        const response = await fetch(url);
        console.log('📥 Variables response status:', response.status, response.statusText);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Variables API error:', errorText);
          throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        
        const variables = await response.json();
        console.log('📊 Variables response data:', variables);
        console.log('📊 Variables type:', typeof variables, 'isArray:', Array.isArray(variables));
        
        // Ensure variables is an array
        const variablesArray = Array.isArray(variables) ? variables : [];
        currentExpressionSession.variables = variablesArray;
        console.log('✅ Variables array length:', variablesArray.length);
        
        const container = document.getElementById('detected-variables-list');
        if (!container) {
          console.error('❌ Variables container not found!');
          return;
        }
        
        if (variablesArray.length === 0) {
          container.innerHTML = '<p class="empty-message">No variables detected for this line.</p>';
          console.log('📝 Showing empty variables message');
        } else {
          console.log('🎨 Rendering variables:', variablesArray);
          container.innerHTML = variablesArray.map(variable => `
            <div class="detected-item" data-variable-id="${variable.id}">
              <div class="detected-item-info">
                <div class="detected-item-name">${variable.name || 'Unknown'}</div>
                <div class="detected-item-meta">
                  ${variable.declaration_type || 'unknown'} | ${variable.data_type || 'unknown'} | ${variable.mutability || 'unknown'}
                </div>
              </div>
              <div class="detected-item-actions">
                <button class="edit-detected-btn" onclick="CodeGraphManager.editDetectedVariable('${variable.id}')">Edit</button>
                <button class="delete-detected-btn" onclick="CodeGraphManager.deleteDetectedVariable('${variable.id}')">Delete</button>
              </div>
            </div>
          `).join('');
          console.log('✅ Variables rendered successfully');
        }
      } catch (error) {
        console.error('💥 Error loading variables:', error);
        console.error('💥 Error stack:', error.stack);
        currentExpressionSession.variables = [];
        const container = document.getElementById('detected-variables-list');
        if (container) {
          container.innerHTML = `<p class="error-message">Error loading variables: ${error.message}</p>`;
        }
        showNotification(`Error loading variables: ${error.message}`, 'error');
      }
      
      // After loading variables, update the data flow dropdowns
      setTimeout(updateDataFlowDropdowns, 100);
    }

    // Load method calls for current expression from database
    async function loadExpressionMethodCalls() {
      console.log('🔍 Loading method calls for:', {
        entityId: currentExpressionSession.entityId,
        lineNumber: currentExpressionSession.lineNumber
      });
      
      try {
        const url = `/api/code-graph/method-calls?parent_entity_id=${currentExpressionSession.entityId}&line_number=${currentExpressionSession.lineNumber}`;
        console.log('📡 Fetching method calls from:', url);
        
        const response = await fetch(url);
        console.log('📥 Method calls response status:', response.status, response.statusText);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Method calls API error:', errorText);
          throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        
        const methodCalls = await response.json();
        console.log('📊 Method calls response data:', methodCalls);
        console.log('📊 Method calls type:', typeof methodCalls, 'isArray:', Array.isArray(methodCalls));
        
        // Ensure methodCalls is an array
        const methodCallsArray = Array.isArray(methodCalls) ? methodCalls : [];
        currentExpressionSession.methodCalls = methodCallsArray;
        console.log('✅ Method calls array length:', methodCallsArray.length);
        
        const container = document.getElementById('detected-method-calls-list');
        if (!container) {
          console.error('❌ Method calls container not found!');
          return;
        }
        
        if (methodCallsArray.length === 0) {
          container.innerHTML = '<p class="empty-message">No method calls detected for this line.</p>';
          console.log('📝 Showing empty method calls message');
        } else {
          console.log('🎨 Rendering method calls:', methodCallsArray);
          container.innerHTML = methodCallsArray.map(methodCall => `
            <div class="detected-item" data-method-id="${methodCall.id}">
              <div class="detected-item-info">
                <div class="detected-item-name">${methodCall.method_name || 'Unknown'}</div>
                <div class="detected-item-meta">
                  ${methodCall.call_type || 'unknown'} | ${methodCall.expression_type || 'N/A'} | ${methodCall.module_source || 'unknown'} | ${methodCall.chain_position || 'unknown'}
                </div>
              </div>
              <div class="detected-item-actions">
                <button class="edit-detected-btn" onclick="CodeGraphManager.editDetectedMethodCall('${methodCall.id}')">Edit</button>
                <button class="delete-detected-btn" onclick="CodeGraphManager.deleteDetectedMethodCall('${methodCall.id}')">Delete</button>
              </div>
            </div>
          `).join('');
          console.log('✅ Method calls rendered successfully');
        }
      } catch (error) {
        console.error('💥 Error loading method calls:', error);
        console.error('💥 Error stack:', error.stack);
        currentExpressionSession.methodCalls = [];
        const container = document.getElementById('detected-method-calls-list');
        if (container) {
          container.innerHTML = `<p class="error-message">Error loading method calls: ${error.message}</p>`;
        }
        showNotification(`Error loading method calls: ${error.message}`, 'error');
      }
      
      // After loading method calls, update the data flow dropdowns
      setTimeout(updateDataFlowDropdowns, 100);
    }

    // Load data flow for current expression from database
    async function loadExpressionDataFlow() {
      console.log('🔍 Loading data flow for:', {
        entityId: currentExpressionSession.entityId,
        lineNumber: currentExpressionSession.lineNumber
      });
      
      try {
        const url = `/api/code-graph/data-flow?parent_entity_id=${currentExpressionSession.entityId}&line_number=${currentExpressionSession.lineNumber}`;
        console.log('📡 Fetching data flow from:', url);
        
        const response = await fetch(url);
        console.log('📥 Data flow response status:', response.status, response.statusText);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Data flow API error:', errorText);
          throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        
        const dataFlow = await response.json();
        console.log('📊 Data flow response data:', dataFlow);
        console.log('📊 Data flow type:', typeof dataFlow, 'isArray:', Array.isArray(dataFlow));
        
        // Ensure dataFlow is an array
        const dataFlowArray = Array.isArray(dataFlow) ? dataFlow : [];
        currentExpressionSession.dataFlow = dataFlowArray;
        console.log('✅ Data flow array length:', dataFlowArray.length);
      
        // Update data flow diagram
        const diagram = document.getElementById('data-flow-diagram');
        if (!diagram) {
          console.error('❌ Data flow diagram container not found!');
          return;
        }
        
        diagram.innerHTML = `
          <div style="text-align: center; color: #666;">
            <p>Data Flow Analysis</p>
            <p>Variables: ${currentExpressionSession.variables.length}</p>
            <p>Method Calls: ${currentExpressionSession.methodCalls.length}</p>
            <p>Data Flow Relationships: ${dataFlowArray.length}</p>
          </div>
        `;
        console.log('✅ Data flow diagram updated');
      } catch (error) {
        console.error('💥 Error loading data flow:', error);
        console.error('💥 Error stack:', error.stack);
        currentExpressionSession.dataFlow = [];
        const diagram = document.getElementById('data-flow-diagram');
        if (diagram) {
          diagram.innerHTML = `<p class="error-message">Error loading data flow: ${error.message}</p>`;
        }
        showNotification(`Error loading data flow: ${error.message}`, 'error');
      }
    }

    // Move these functions INSIDE the module scope and fix the database field mapping
    async function editDetectedVariable(variableId) {
      try {
        const response = await fetch(`/api/code-graph/variables/${variableId}`);
        const variable = await response.json();
        
        editingState.variable = variableId;
        
        // Populate all form fields from database
        document.getElementById('variable-name').value = variable.name || '';
        document.getElementById('variable-declaration-type').value = variable.declaration_type || 'const';
        document.getElementById('variable-data-type').value = variable.data_type || 'string';
        document.getElementById('variable-scope-type').value = variable.scope_type || 'local';
        document.getElementById('variable-initial-value-type').value = variable.initial_value_type || 'literal';
        document.getElementById('variable-mutability').value = variable.mutability || 'immutable';
        document.getElementById('variable-column-start').value = variable.column_start || 0;
        document.getElementById('variable-column-end').value = variable.column_end || 0;
        document.getElementById('variable-is-exported').checked = variable.is_exported || false;
        
        // Update form UI
        document.getElementById('variable-form-title').textContent = 'Edit Variable';
        document.getElementById('variable-submit-btn').textContent = 'Update Variable';
        document.getElementById('variable-cancel-edit-btn').style.display = 'inline-block';
        
        showNotification('Variable loaded for editing', 'info');
      } catch (error) {
        console.error('Error loading variable for editing:', error);
        showNotification('Error loading variable data', 'error');
      }
    }

    async function editDetectedMethodCall(methodCallId) {
      try {
        const response = await fetch(`/api/code-graph/method-calls/${methodCallId}`);
        const methodCall = await response.json();
        
        editingState.methodCall = methodCallId;
        
        // Populate all form fields from database - fix field mapping
        document.getElementById('method-call-name').value = methodCall.method_name || '';
        document.getElementById('method-call-type').value = methodCall.call_type || 'direct';
        document.getElementById('method-expression-type').value = methodCall.expression_type || 'call';
        document.getElementById('method-module-source').value = methodCall.module_source || 'local';
        document.getElementById('method-chain-position').value = methodCall.chain_position || 'standalone';
        document.getElementById('method-arguments-count').value = methodCall.arguments_count || 0;
        document.getElementById('method-return-type').value = methodCall.return_type || '';
        document.getElementById('method-parameters-used').value = methodCall.parameters_used || '';
        document.getElementById('method-external-dependencies').value = methodCall.external_dependencies || '';
        document.getElementById('method-builtin-dependencies').value = methodCall.builtin_dependencies || '';
        document.getElementById('method-column-start').value = methodCall.column_start || 0;
        document.getElementById('method-column-end').value = methodCall.column_end || 0;
        document.getElementById('method-is-async').checked = methodCall.is_async || false;
        
        // Update form UI
        document.getElementById('method-call-form-title').textContent = 'Edit Method Call';
        document.getElementById('method-call-submit-btn').textContent = 'Update Method Call';
        document.getElementById('method-call-cancel-edit-btn').style.display = 'inline-block';
        
        showNotification('Method call loaded for editing', 'info');
      } catch (error) {
        console.error('Error loading method call for editing:', error);
        showNotification('Error loading method call data', 'error');
      }
    }

    // Updated delete functions to delete from database
    async function deleteDetectedVariable(variableId) {
      if (confirm('Delete this variable?')) {
        try {
          const response = await fetch(`/api/code-graph/variables/${variableId}`, {
            method: 'DELETE'
          });
          
          if (!response.ok) {
            throw new Error('Failed to delete variable');
          }
          
          // Remove from local session data - ensure it's an array
          if (Array.isArray(currentExpressionSession.variables)) {
            currentExpressionSession.variables = currentExpressionSession.variables.filter(v => v.id !== variableId);
          }
          
          // Refresh the variables list
          await loadExpressionVariables();
          
          showNotification('Variable deleted successfully', 'success');
        } catch (error) {
          console.error('Error deleting variable:', error);
          showNotification('Error deleting variable', 'error');
        }
      }
    }

    async function deleteDetectedMethodCall(methodCallId) {
      if (confirm('Delete this method call?')) {
        try {
          const response = await fetch(`/api/code-graph/method-calls/${methodCallId}`, {
            method: 'DELETE'
          });
          
          if (!response.ok) {
            throw new Error('Failed to delete method call');
          }
          
          // Remove from local session data - ensure it's an array
          if (Array.isArray(currentExpressionSession.methodCalls)) {
            currentExpressionSession.methodCalls = currentExpressionSession.methodCalls.filter(m => m.id !== methodCallId);
          }
          
          // Refresh the method calls list
          await loadExpressionMethodCalls();
          
          showNotification('Method call deleted successfully', 'success');
        } catch (error) {
          console.error('Error deleting method call:', error);
          showNotification('Error deleting method call', 'error');
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

    // Replace the updateDataFlowDropdowns function with this enhanced version

    function updateDataFlowDropdowns() {
      const sourceSelect = document.getElementById('data-flow-source-id');
      const targetSelect = document.getElementById('data-flow-target-id');
      
      if (!sourceSelect || !targetSelect) {
        console.log('🔍 Data flow dropdowns not found');
        return;
      }
      
      console.log('🔄 Updating data flow dropdowns with session data:', {
        variables: currentExpressionSession.variables?.length || 0,
        methodCalls: currentExpressionSession.methodCalls?.length || 0
      });
      
      // Convert regular selects to searchable dropdowns
      createSearchableDropdown(sourceSelect, 'source');
      createSearchableDropdown(targetSelect, 'target');
      
      console.log('✅ Data flow dropdowns updated with search functionality');
    }

    // Create a searchable dropdown component
    function createSearchableDropdown(selectElement, type) {
      const container = selectElement.parentNode;
      const dropdownId = selectElement.id;
      
      // Remove the original select
      selectElement.remove();
      
      // Create the searchable dropdown HTML
      const searchableDropdown = document.createElement('div');
      searchableDropdown.className = 'searchable-dropdown';
      searchableDropdown.innerHTML = `
        <div class="dropdown-input-container">
          <input type="text" 
                 id="${dropdownId}" 
                 class="dropdown-search-input" 
                 placeholder="Search and select ${type}..." 
                 autocomplete="off">
          <button type="button" class="dropdown-toggle-btn">▼</button>
        </div>
        <div class="dropdown-options" id="${dropdownId}-options" style="display: none;">
          <div class="dropdown-options-list"></div>
        </div>
      `;
      
      container.appendChild(searchableDropdown);
      
      // Get the input and options elements
      const input = document.getElementById(dropdownId);
      const optionsContainer = document.getElementById(`${dropdownId}-options`);
      const optionsList = optionsContainer.querySelector('.dropdown-options-list');
      const toggleBtn = searchableDropdown.querySelector('.dropdown-toggle-btn');
      
      // Store all available options
      const allOptions = [];
      
      // Add variables to options
      if (currentExpressionSession.variables && Array.isArray(currentExpressionSession.variables)) {
        currentExpressionSession.variables.forEach(variable => {
          allOptions.push({
            value: `variable:${variable.id}`,
            text: `${variable.name} (variable)`,
            type: 'variable',
            searchText: `${variable.name} variable ${variable.declaration_type} ${variable.data_type}`.toLowerCase()
          });
        });
      }
      
      // Add method calls to options
      if (currentExpressionSession.methodCalls && Array.isArray(currentExpressionSession.methodCalls)) {
        currentExpressionSession.methodCalls.forEach(methodCall => {
          allOptions.push({
            value: `method_call:${methodCall.id}`,
            text: `${methodCall.method_name} (method call)`,
            type: 'method_call',
            searchText: `${methodCall.method_name} method call ${methodCall.call_type} ${methodCall.module_source}`.toLowerCase()
          });
        });
      }
      
      // Function to render options
      function renderOptions(filteredOptions = allOptions) {
        if (filteredOptions.length === 0) {
          optionsList.innerHTML = '<div class="dropdown-option no-results">No results found</div>';
          return;
        }
        
        // Group options by type
        const grouped = {
          variable: filteredOptions.filter(opt => opt.type === 'variable'),
          method_call: filteredOptions.filter(opt => opt.type === 'method_call')
        };
        
        let html = '';
        
        if (grouped.variable.length > 0) {
          html += '<div class="dropdown-group-header">Variables</div>';
          grouped.variable.forEach(option => {
            html += `<div class="dropdown-option" data-value="${option.value}">${option.text}</div>`;
          });
        }
        
        if (grouped.method_call.length > 0) {
          html += '<div class="dropdown-group-header">Method Calls</div>';
          grouped.method_call.forEach(option => {
            html += `<div class="dropdown-option" data-value="${option.value}">${option.text}</div>`;
          });
        }
        
        optionsList.innerHTML = html;
        
        // Add click handlers to options
        optionsList.querySelectorAll('.dropdown-option[data-value]').forEach(optionEl => {
          optionEl.addEventListener('click', () => {
            const value = optionEl.dataset.value;
            const text = optionEl.textContent;
            
            input.value = text;
            input.dataset.value = value;
            optionsContainer.style.display = 'none';
            
            // Trigger change event
            input.dispatchEvent(new Event('change'));
          });
        });
      }
      
      // Search functionality
      input.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        
        if (searchTerm.length === 0) {
          renderOptions(allOptions);
        } else {
          const filtered = allOptions.filter(option => 
            option.searchText.includes(searchTerm)
          );
          renderOptions(filtered);
        }
        
        if (optionsContainer.style.display === 'none') {
          optionsContainer.style.display = 'block';
        }
      });
      
      // Toggle dropdown
      toggleBtn.addEventListener('click', () => {
        if (optionsContainer.style.display === 'none') {
          optionsContainer.style.display = 'block';
          renderOptions();
          input.focus();
        } else {
          optionsContainer.style.display = 'none';
        }
      });
      
      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!searchableDropdown.contains(e.target)) {
          optionsContainer.style.display = 'none';
        }
      });
      
      // Keyboard navigation
      input.addEventListener('keydown', (e) => {
        const options = optionsList.querySelectorAll('.dropdown-option[data-value]');
        const currentSelected = optionsList.querySelector('.dropdown-option.selected');
        let selectedIndex = currentSelected ? Array.from(options).indexOf(currentSelected) : -1;
        
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, options.length - 1);
            updateSelection(options, selectedIndex);
            break;
          case 'ArrowUp':
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, 0);
            updateSelection(options, selectedIndex);
            break;
          case 'Enter':
            e.preventDefault();
            if (currentSelected) {
              currentSelected.click();
            }
            break;
          case 'Escape':
            optionsContainer.style.display = 'none';
            break;
        }
      });
      
      function updateSelection(options, index) {
        options.forEach(opt => opt.classList.remove('selected'));
        if (options[index]) {
          options[index].classList.add('selected');
          options[index].scrollIntoView({ block: 'nearest' });
        }
      }
      
      // Initial render
      renderOptions();
    }

    // Enhanced saveDataFlow function to handle the new dropdown format
    async function saveDataFlow(e) {
      e.preventDefault();
      
      const sourceInput = document.getElementById('data-flow-source-id');
      const targetInput = document.getElementById('data-flow-target-id');
      
      // Get values from the searchable dropdowns
      const sourceValue = sourceInput.dataset.value || '';
      const targetValue = targetInput.dataset.value || '';
      
      if (!sourceValue || !targetValue) {
        showNotification('Please select both source and target', 'warning');
        return;
      }
      
      // Parse the source and target values
      const [sourceType, sourceId] = sourceValue.split(':');
      const [targetType, targetId] = targetValue.split(':');
      
      const dataFlowData = {
        source_type: sourceType,
        source_id: sourceId,
        target_type: targetType,
        target_id: targetId,
        flow_type: document.getElementById('data-flow-type').value,
        transformation_applied: document.getElementById('data-flow-transformation').value,
        parent_entity_id: currentExpressionSession.entityId,
        line_number: currentExpressionSession.lineNumber
      };
      
      console.log('💾 Saving data flow:', dataFlowData);
      
      try {
        let response;
        if (editingState.dataFlow) {
          // Update existing data flow
          response = await fetch(`/api/code-graph/data-flow/${editingState.dataFlow}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataFlowData)
          });
        } else {
          // Create new data flow
          response = await fetch('/api/code-graph/data-flow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataFlowData)
          });
        }
        
        if (!response.ok) {
          throw new Error('Failed to save data flow');
        }
        
        const savedDataFlow = await response.json();
        
        // Update local session data
        if (editingState.dataFlow) {
          const index = currentExpressionSession.dataFlow.findIndex(d => d.id === editingState.dataFlow);
          if (index !== -1) {
            currentExpressionSession.dataFlow[index] = savedDataFlow;
          }
          showNotification('Data flow updated successfully!', 'success');
        } else {
          currentExpressionSession.dataFlow.push(savedDataFlow);
          showNotification('Data flow added successfully!', 'success');
        }
        
        // Refresh the data flow visualization
        await loadExpressionDataFlow();
        
        // Reset form and editing state
        document.getElementById('data-flow-form').reset();
        resetDataFlowForm();
      } catch (error) {
        console.error('Error saving data flow:', error);
        showNotification('Error saving data flow', 'error');
      }
    }

    // Add a quick filter function for large datasets
    function addQuickFilters() {
      const dataFlowTab = document.getElementById('data-flow-expression-tab');
      if (!dataFlowTab) return;
      
      // Add quick filter buttons above the form
      const quickFilters = document.createElement('div');
      quickFilters.className = 'quick-filters';
      quickFilters.innerHTML = `
        <div class="quick-filters-header">
          <h5>Quick Filters:</h5>
          <div class="filter-buttons">
            <button type="button" class="filter-btn active" data-filter="all">All (${(currentExpressionSession.variables?.length || 0) + (currentExpressionSession.methodCalls?.length || 0)})</button>
            <button type="button" class="filter-btn" data-filter="variables">Variables (${currentExpressionSession.variables?.length || 0})</button>
            <button type="button" class="filter-btn" data-filter="method_calls">Method Calls (${currentExpressionSession.methodCalls?.length || 0})</button>
            <button type="button" class="filter-btn" data-filter="external">External Deps</button>
            <button type="button" class="filter-btn" data-filter="builtin">Built-in Deps</button>
          </div>
        </div>
      `;
      
      const addDataFlowSection = dataFlowTab.querySelector('.add-data-flow-section');
      if (addDataFlowSection) {
        addDataFlowSection.insertBefore(quickFilters, addDataFlowSection.firstChild);
      }
    }

    // Move setupExpressionModalHandlers INSIDE the module scope
    function setupExpressionModalHandlers() {
      console.log('🔧 Setting up expression modal handlers...');
      
      // Expression tab switching
      const tabButtons = document.querySelectorAll('.expression-tab-btn');
      console.log('📋 Found tab buttons:', tabButtons.length);
      tabButtons.forEach(btn => {
        btn.addEventListener('click', switchExpressionTab);
      });
      
      // Setup data flow dropdown handlers
      setupDataFlowDropdownHandlers();
      
      // Update dropdowns when tab is switched to data flow
      const dataFlowTab = document.querySelector('.expression-tab-btn[data-tab="data-flow"]');
      if (dataFlowTab) {
        dataFlowTab.addEventListener('click', () => {
          setTimeout(updateDataFlowDropdowns, 100); // Small delay to ensure tab is active
        });
      }
      
      // Form handlers - add null checks
      const variableForm = document.getElementById('variable-form');
      const methodCallForm = document.getElementById('method-call-form');
      const dataFlowForm = document.getElementById('data-flow-form');
      
      if (variableForm) {
        variableForm.addEventListener('submit', saveVariable); // Now this will work!
        console.log('✅ Variable form handler attached');
      } else {
        console.error('❌ Variable form not found!');
      }
      
      if (methodCallForm) {
        methodCallForm.addEventListener('submit', saveMethodCall); // Now this will work!
        console.log('✅ Method call form handler attached');
      } else {
        console.error('❌ Method call form not found!');
      }
      
      if (dataFlowForm) {
        dataFlowForm.addEventListener('submit', saveDataFlow); // Now this will work!
        console.log('✅ Data flow form handler attached');
      } else {
        console.error('❌ Data flow form not found!');
      }
      
      // Cancel edit handlers - add null checks
      const variableCancelBtn = document.getElementById('variable-cancel-edit-btn');
      const methodCallCancelBtn = document.getElementById('method-call-cancel-edit-btn');
      const dataFlowCancelBtn = document.getElementById('data-flow-cancel-edit-btn');
      
      if (variableCancelBtn) {
        variableCancelBtn.addEventListener('click', resetVariableForm);
      }
      if (methodCallCancelBtn) {
        methodCallCancelBtn.addEventListener('click', resetMethodCallForm);
      }
      if (dataFlowCancelBtn) {
        dataFlowCancelBtn.addEventListener('click', resetDataFlowForm);
      }
      
      // Modal close handlers - add null checks
      const cancelBtn = document.getElementById('cancel-expression');
      const saveBtn = document.getElementById('save-expression-analysis');
      const analyzeBtn = document.getElementById('analyze-expression-btn');
      
      if (cancelBtn) {
        cancelBtn.addEventListener('click', closeExpressionModal);
      }
      if (saveBtn) {
        saveBtn.addEventListener('click', saveCompleteExpressionAnalysis);
      }
      if (analyzeBtn) {
        analyzeBtn.addEventListener('click', autoAnalyzeExpression);
      }
      
      console.log('🎉 Expression modal handlers setup complete');
      
      // ADD THIS LINE to setup the enhanced data flow tab
      enhanceDataFlowTab();
    }

    // Move these helper functions INSIDE the module scope too
    function switchExpressionTab(e) {
      const targetTab = e.target.dataset.tab;
      
      // Update tab buttons
      document.querySelectorAll('.expression-tab-btn').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      
      // Update tab content
      document.querySelectorAll('.expression-tab-content').forEach(content => content.classList.remove('active'));
      document.getElementById(`${targetTab}-expression-tab`).classList.add('active');
    }

    function resetVariableForm() {
      editingState.variable = null;
      document.getElementById('variable-form').reset();
      document.getElementById('variable-form-title').textContent = 'Add Variable';
      document.getElementById('variable-submit-btn').textContent = 'Add Variable';
      document.getElementById('variable-cancel-edit-btn').style.display = 'none';
    }

    function resetMethodCallForm() {
      editingState.methodCall = null;
      document.getElementById('method-call-form').reset();
      document.getElementById('method-call-form-title').textContent = 'Add Method Call';
      document.getElementById('method-call-submit-btn').textContent = 'Add Method Call';
      document.getElementById('method-call-cancel-edit-btn').style.display = 'none';
    }

    function resetDataFlowForm() {
      editingState.dataFlow = null;
      document.getElementById('data-flow-form').reset();
      document.getElementById('data-flow-form-title').textContent = 'Add Data Flow Relationship';
      document.getElementById('data-flow-submit-btn').textContent = 'Add Data Flow';
      document.getElementById('data-flow-cancel-edit-btn').style.display = 'none';
    }

    function closeExpressionModal() {
      const modal = document.getElementById('expression-modal');
      modal.classList.remove('show');
      setTimeout(() => modal.style.display = 'none', 200);
    }

    async function saveCompleteExpressionAnalysis() {
      try {
        const analysisData = {
          entityId: currentExpressionSession.entityId,
          lineNumber: currentExpressionSession.lineNumber,
          variables: currentExpressionSession.variables,
          methodCalls: currentExpressionSession.methodCalls,
          dataFlow: currentExpressionSession.dataFlow
        };
        
        const response = await fetch('/api/code-graph/expressions/save-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(analysisData)
        });
        
        if (!response.ok) {
          throw new Error('Failed to save expression analysis');
        }
        
        showNotification('Expression analysis saved successfully!', 'success');
        closeExpressionModal();
      } catch (error) {
        console.error('Error saving expression analysis:', error);
        showNotification('Error saving expression analysis', 'error');
      }
    }

    async function autoAnalyzeExpression() {
      try {
        const response = await fetch('/api/code-graph/expressions/auto-analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entityId: currentExpressionSession.entityId,
            lineNumber: currentExpressionSession.lineNumber,
            codeText: currentExpressionSession.codeText
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to auto-analyze expression');
        }
        
        const analysis = await response.json();
        
        // Update the session with auto-detected data
        currentExpressionSession.variables = analysis.variables || [];
        currentExpressionSession.methodCalls = analysis.methodCalls || [];
        currentExpressionSession.dataFlow = analysis.dataFlow || [];
        
        // Refresh the displays
        await loadExpressionVariables();
        await loadExpressionMethodCalls();
        await loadExpressionDataFlow();
        
        showNotification('Auto-analysis completed!', 'success');
      } catch (error) {
        console.error('Error auto-analyzing expression:', error);
        showNotification('Error during auto-analysis', 'error');
      }
    }

    // Add event listeners for source/target type changes
    function setupDataFlowDropdownHandlers() {
      const sourceTypeSelect = document.getElementById('data-flow-source-type');
      const targetTypeSelect = document.getElementById('data-flow-target-type');
      
      if (sourceTypeSelect) {
        sourceTypeSelect.addEventListener('change', updateDataFlowDropdowns);
      }
      
      if (targetTypeSelect) {
        targetTypeSelect.addEventListener('change', updateDataFlowDropdowns);
      }
    }

    // Enhanced dependencies tab with interactive forms
    function createInteractiveDependenciesTab() {
      const dependenciesTab = document.getElementById('dependencies-expression-tab');
      if (!dependenciesTab) return;
      
      dependenciesTab.innerHTML = `
        <div class="dependencies-analysis">
          <div class="dependencies-section">
            <h4>External Dependencies</h4>
            <div class="dependency-form">
              <form id="external-dependency-form">
                <div class="form-row">
                  <div class="form-group">
                    <label>Module Name:</label>
                    <input type="text" id="external-module-name" placeholder="e.g., path, fs, lodash">
                  </div>
                  <div class="form-group">
                    <label>Import Type:</label>
                    <select id="external-import-type">
                      <option value="require">require()</option>
                      <option value="import">import</option>
                      <option value="global">global</option>
                    </select>
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Used Methods:</label>
                    <input type="text" id="external-used-methods" placeholder="e.g., extname, dirname">
                  </div>
                  <button type="submit" class="primary-btn">Add External Dependency</button>
                </div>
              </form>
            </div>
            <div id="external-dependencies-list" class="dependencies-list"></div>
          </div>
          
          <div class="dependencies-section">
            <h4>Built-in Dependencies</h4>
            <div class="dependency-form">
              <form id="builtin-dependency-form">
                <div class="form-row">
                  <div class="form-group">
                    <label>Built-in Method:</label>
                    <input type="text" id="builtin-method-name" placeholder="e.g., toLowerCase, parseInt">
                  </div>
                  <div class="form-group">
                    <label>Object Type:</label>
                    <select id="builtin-object-type">
                      <option value="String">String</option>
                      <option value="Array">Array</option>
                      <option value="Object">Object</option>
                      <option value="Number">Number</option>
                      <option value="Date">Date</option>
                      <option value="Math">Math</option>
                      <option value="JSON">JSON</option>
                    </select>
                  </div>
                </div>
                <button type="submit" class="primary-btn">Add Built-in Dependency</button>
              </form>
            </div>
            <div id="builtin-dependencies-list" class="dependencies-list"></div>
          </div>
          
          <div class="dependencies-section">
            <h4>Internal Dependencies</h4>
            <div class="dependency-form">
              <form id="internal-dependency-form">
                <div class="form-row">
                  <div class="form-group">
                    <label>Parameter/Variable:</label>
                    <select id="internal-dependency-source">
                      <option value="">Select parameter or variable...</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Usage Type:</label>
                    <select id="internal-usage-type">
                      <option value="parameter">Parameter</option>
                      <option value="local_variable">Local Variable</option>
                      <option value="closure_variable">Closure Variable</option>
                      <option value="global_variable">Global Variable</option>
                    </select>
                  </div>
                </div>
                <button type="submit" class="primary-btn">Add Internal Dependency</button>
              </form>
            </div>
            <div id="internal-dependencies-list" class="dependencies-list"></div>
          </div>
        </div>
      `;
    }

    // Update the general relationship modal to support expression-level relationships
    function enhanceRelationshipModal() {
      const relationshipTypeSelect = document.getElementById('relationship-type');
      if (!relationshipTypeSelect) return;
      
      // Add expression-level relationship types
      const expressionTypes = [
        { value: 'assigned_from', text: 'Assigned From' },
        { value: 'calls_with', text: 'Calls With' },
        { value: 'called_on', text: 'Called On' },
        { value: 'uses_parameter', text: 'Uses Parameter' },
        { value: 'returns_to', text: 'Returns To' },
        { value: 'transforms_to', text: 'Transforms To' },
        { value: 'flows_to', text: 'Flows To' },
        { value: 'depends_on', text: 'Depends On' }
      ];
      
      expressionTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type.value;
        option.textContent = type.text;
        relationshipTypeSelect.appendChild(option);
      });
    }

    // Quick relationship creation helper for your example
    function createQuickRelationshipsForExample() {
      const relationships = [
        {
          source: 'fileExtension',
          target: 'path.extname(inputPath).toLowerCase()',
          type: 'assigned_from',
          description: 'fileExtension is assigned the result of path.extname(inputPath).toLowerCase()'
        },
        {
          source: 'path.extname',
          target: 'inputPath',
          type: 'calls_with',
          description: 'path.extname is called with inputPath as parameter'
        },
        {
          source: 'toLowerCase',
          target: 'path.extname result',
          type: 'called_on',
          description: 'toLowerCase is called on the result of path.extname'
        },
        {
          source: 'generateThumbnail',
          target: 'fileExtension',
          type: 'defines',
          description: 'generateThumbnail function defines the fileExtension variable'
        }
      ];
      
      return relationships;
    }

    // Enhanced data flow visualization
    function renderDataFlowRelationships() {
      const diagram = document.getElementById('data-flow-diagram');
      if (!diagram) return;
      
      const dataFlowArray = currentExpressionSession.dataFlow || [];
      
      if (dataFlowArray.length === 0) {
        diagram.innerHTML = `
          <div style="text-align: center; color: #666;">
            <p>Data Flow Analysis</p>
            <p>Variables: ${currentExpressionSession.variables?.length || 0}</p>
            <p>Method Calls: ${currentExpressionSession.methodCalls?.length || 0}</p>
            <p>Data Flow Relationships: 0</p>
            <div style="margin-top: 15px;">
              <button onclick="CodeGraphManager.createQuickRelationshipsForExample()" class="quick-relationship-btn">
                Create Example Relationships
              </button>
            </div>
          </div>
        `;
      } else {
        let html = `
          <div class="data-flow-summary">
            <p><strong>Variables:</strong> ${currentExpressionSession.variables?.length || 0} | 
               <strong>Method Calls:</strong> ${currentExpressionSession.methodCalls?.length || 0} | 
               <strong>Relationships:</strong> ${dataFlowArray.length}</p>
          </div>
          <div class="data-flow-relationships">
        `;
        
        dataFlowArray.forEach(flow => {
          html += `
            <div class="data-flow-relationship-item">
              <span class="flow-source">${flow.source_name || 'Unknown'}</span>
              <span class="flow-arrow">→</span>
              <span class="flow-target">${flow.target_name || 'Unknown'}</span>
              <span class="flow-type">${flow.flow_type}</span>
              ${flow.transformation_applied ? `<span class="flow-transformation">${flow.transformation_applied}</span>` : ''}
            </div>
          `;
        });
        
        html += '</div>';
        diagram.innerHTML = html;
      }
    }

    // Enhanced relationship form for expressions
  function createExpressionRelationshipForm() {
    // Generate the relationship type options from the constants
    const relationshipTypeOptions = Object.entries(EXPRESSION_RELATIONSHIP_TYPES)
      .map(([value, label]) => `<option value="${value}">${label}</option>`)
      .join('');

    return `
      <div class="expression-relationship-form">
        <div class="quick-relationship-templates">
          <h5>Quick Templates</h5>
          <div class="template-buttons">
            <button type="button" class="template-btn" onclick="CodeGraphManager.applyRelationshipTemplate('assignment')">
              Variable Assignment
            </button>
            <button type="button" class="template-btn" onclick="CodeGraphManager.applyRelationshipTemplate('method_call')">
              Method Call
            </button>
            <button type="button" class="template-btn" onclick="CodeGraphManager.applyRelationshipTemplate('method_chain')">
              Method Chain
            </button>
            <button type="button" class="template-btn" onclick="CodeGraphManager.applyRelationshipTemplate('parameter_usage')">
              Parameter Usage
            </button>
          </div>
        </div>

        <button type="button" class="create-example-btn" onclick="CodeGraphManager.createFileExtensionExample()">
          Create fileExtension Example Relationships
        </button>

        <form id="expression-relationship-form">
          <div class="relationship-element-section">
            <h5>Source Element</h5>
            <div class="form-row">
              <div class="form-group">
                <label for="expression-source-type">Source Type</label>
                <select id="expression-source-type" required>
                  <option value="">Select type...</option>
                  <option value="variable">Variable</option>
                  <option value="method_call">Method Call</option>
                  <option value="function">Function</option>
                  <option value="parameter">Parameter</option>
                  <option value="expression">Expression</option>
                  <option value="result">Intermediate Result</option>
                </select>
              </div>
              <div class="form-group">
                <label for="expression-source-name">Source Name</label>
                <input type="text" id="expression-source-name" required placeholder="e.g., fileExtension, path.extname">
              </div>
            </div>
          </div>

          <div class="relationship-element-section">
            <h5>Target Element</h5>
            <div class="form-row">
              <div class="form-group">
                <label for="expression-target-type">Target Type</label>
                <select id="expression-target-type" required>
                  <option value="">Select type...</option>
                  <option value="variable">Variable</option>
                  <option value="method_call">Method Call</option>
                  <option value="function">Function</option>
                  <option value="parameter">Parameter</option>
                  <option value="expression">Expression</option>
                  <option value="result">Intermediate Result</option>
                </select>
              </div>
              <div class="form-group">
                <label for="expression-target-name">Target Name</label>
                <input type="text" id="expression-target-name" required placeholder="e.g., inputPath, toLowerCase">
              </div>
            </div>
          </div>

          <div class="relationship-details-section">
            <h5>Relationship Details</h5>
            <div class="form-row">
              <div class="form-group">
                <label for="expression-relationship-type">Relationship Type</label>
                <select id="expression-relationship-type" required>
                  <option value="">Select relationship...</option>
                  ${relationshipTypeOptions}
                </select>
              </div>
              <div class="form-group">
                <label for="expression-order-sequence">Order Sequence</label>
                <input type="number" id="expression-order-sequence" min="1" placeholder="1">
              </div>
            </div>
            <div class="form-group">
              <label for="expression-description">Description</label>
              <textarea id="expression-description" placeholder="Describe this relationship..."></textarea>
            </div>
            <div class="form-group">
              <label for="expression-transformation">Transformation Details (optional)</label>
              <input type="text" id="expression-transformation" placeholder="e.g., converts to lowercase, extracts file extension">
            </div>
          </div>

          <div class="form-actions">
            <button type="submit" class="primary-btn">Add Relationship</button>
            <button type="button" class="secondary-btn" onclick="CodeGraphManager.resetExpressionRelationshipForm()">Reset</button>
          </div>
        </form>

        <div class="existing-relationships">
          <h5>Current Expression Relationships</h5>
          <div id="expression-relationships-list">
            <!-- Relationships will be loaded here -->
          </div>
        </div>
      </div>
    `;
  }

  // Setup handlers for expression relationship form
  function setupExpressionRelationshipHandlers() {
    const form = document.getElementById('expression-relationship-form');
    if (form) {
      form.addEventListener('submit', saveExpressionRelationship);
    }
    
    // Setup auto-suggestions
    setupAutoSuggestions();
  }

  // Save expression relationship
  async function saveExpressionRelationship(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    
    // Get the source and target information
    const sourceType = formData.get('source_type');
    const targetType = formData.get('target_type');
    const relationshipType = formData.get('relationship_type');
    
    // Try to find existing IDs for source and target
    let sourceId = null;
    let targetId = null;
    const sourceName = formData.get('source_name');
    const targetName = formData.get('target_name');
    
    // Look up existing variables and method calls
    if (sourceType === 'variable' && currentExpressionSession.variables) {
      const existingVar = currentExpressionSession.variables.find(v => v.name === sourceName);
      if (existingVar) {
        sourceId = existingVar.id;
        console.log('🔗 Found existing variable for source:', existingVar);
      }
    } else if (sourceType === 'method_call' && currentExpressionSession.methodCalls) {
      const existingMethod = currentExpressionSession.methodCalls.find(m => m.method_name === sourceName);
      if (existingMethod) {
        sourceId = existingMethod.id;
        console.log('🔗 Found existing method call for source:', existingMethod);
      }
    }
    
    if (targetType === 'variable' && currentExpressionSession.variables) {
      const existingVar = currentExpressionSession.variables.find(v => v.name === targetName);
      if (existingVar) {
        targetId = existingVar.id;
        console.log('🔗 Found existing variable for target:', existingVar);
      }
    } else if (targetType === 'method_call' && currentExpressionSession.methodCalls) {
      const existingMethod = currentExpressionSession.methodCalls.find(m => m.method_name === targetName);
      if (existingMethod) {
        targetId = existingMethod.id;
        console.log('🔗 Found existing method call for target:', existingMethod);
      }
    }
    
    const relationshipData = {
      source_type: sourceType,
      source_name: sourceName,
      source_id: sourceId, // Reference to existing entry
      target_type: targetType,
      target_name: targetName,
      target_id: targetId, // Reference to existing entry
      relationship_type: relationshipType,
      description: formData.get('description'),
      transformation: formData.get('transformation'),
      order_sequence: parseInt(formData.get('order_sequence')) || 1,
      entity_id: currentExpressionSession.entityId,
      line_number: currentExpressionSession.lineNumber,
      project_id: currentExpressionSession.projectId
    };
    
    console.log('💾 Saving expression relationship:', relationshipData);
    
    try {
      const response = await fetch('/api/code-graph/expression-relationships', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(relationshipData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Server response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ Expression relationship saved:', result);
      
      // Refresh the relationships list
      await loadExpressionRelationships();
      
      // Reset the form
      resetExpressionRelationshipForm();
      
      showNotification('Expression relationship saved successfully!');
    } catch (error) {
      console.error('❌ Error saving expression relationship:', error);
      showNotification('Error saving expression relationship: ' + error.message, 'error');
    }
  }

  // Load expression relationships
  async function loadExpressionRelationships() {
    if (!currentExpressionSession.entityId) return;
    
    try {
      const response = await fetch(`/api/code-graph/expression-relationships?entity_id=${currentExpressionSession.entityId}&line_number=${currentExpressionSession.lineNumber}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const relationships = await response.json();
      console.log('📋 Loaded expression relationships:', relationships);
      
      const container = document.querySelector('.existing-relationships .relationships-list');
      if (!container) return;
      
      if (relationships.length === 0) {
        container.innerHTML = '<div class="empty-message">No relationships defined yet</div>';
        return;
      }
      
      container.innerHTML = relationships.map(rel => `
        <div class="relationship-item" data-id="${rel.id}">
          <div class="relationship-info">
            <div class="relationship-summary">
              <span class="source-element">
                ${rel.source_name}
                ${rel.source_id ? `<small class="id-reference">(ID: ${rel.source_id.substring(0, 8)}...)</small>` : '<small class="no-reference">(no ID reference)</small>'}
              </span>
              <span class="relationship-type-badge">${rel.relationship_type.replace('_', ' ').toUpperCase()}</span>
              <span class="target-element">
                ${rel.target_name}
                ${rel.target_id ? `<small class="id-reference">(ID: ${rel.target_id.substring(0, 8)}...)</small>` : '<small class="no-reference">(no ID reference)</small>'}
              </span>
            </div>
            ${rel.description ? `<div class="relationship-description">${rel.description}</div>` : ''}
            ${rel.transformation ? `<div class="relationship-transformation">Transform: ${rel.transformation}</div>` : ''}
          </div>
          <div class="relationship-actions">
            <button class="edit-btn" onclick="editExpressionRelationship('${rel.id}')">Edit</button>
            <button class="delete-btn" onclick="deleteExpressionRelationship('${rel.id}')">Delete</button>
          </div>
        </div>
      `).join('');
    } catch (error) {
      console.error('❌ Error loading expression relationships:', error);
    }
  }

  // Apply relationship template
  function applyRelationshipTemplate(templateType) {
    const templates = {
      assignment: {
        source_type: 'variable',
        target_type: 'expression',
        relationship_type: 'assigned_from',
        description: EXPRESSION_RELATIONSHIP_TYPES['assigned_from'] + ' - Variable is assigned the result of expression'
      },
      method_call: {
        source_type: 'method_call',
        target_type: 'parameter',
        relationship_type: 'calls_with',
        description: EXPRESSION_RELATIONSHIP_TYPES['calls_with'] + ' - Method is called with parameter'
      },
      method_chain: {
        source_type: 'method_call',
        target_type: 'result',
        relationship_type: 'called_on',
        description: EXPRESSION_RELATIONSHIP_TYPES['called_on'] + ' - Method is called on the result of previous operation'
      },
      parameter_usage: {
        source_type: 'parameter',
        target_type: 'method_call',
        relationship_type: 'used_by',
        description: EXPRESSION_RELATIONSHIP_TYPES['used_by'] + ' - Parameter is used by method'
      }
    };

    const template = templates[templateType];
    if (!template) return;

    // Populate form fields with template values
    Object.entries(template).forEach(([key, value]) => {
      const element = document.getElementById(`expression-${key.replace('_', '-')}`);
      if (element) {
        element.value = value;
      }
    });

    showNotification(`Applied ${templateType} template`, 'info');
  }

  // Setup auto-suggestions for source and target names
  function setupAutoSuggestions() {
    const sourceNameInput = document.getElementById('expression-source-name');
    const targetNameInput = document.getElementById('expression-target-name');
    
    if (!sourceNameInput || !targetNameInput) return;
    
    // Create suggestion lists
    const suggestions = [];
    
    // Add variables
    if (currentExpressionSession.variables) {
      currentExpressionSession.variables.forEach(variable => {
        suggestions.push({
          name: variable.name,
          type: 'variable',
          details: `${variable.declaration_type} ${variable.data_type}`
        });
      });
    }
    
    // Add method calls
    if (currentExpressionSession.methodCalls) {
      currentExpressionSession.methodCalls.forEach(methodCall => {
        suggestions.push({
          name: methodCall.method_name,
          type: 'method_call',
          details: `${methodCall.call_type} ${methodCall.module_source}`
        });
      });
    }
    
    // Add common expressions for your example
    suggestions.push(
      { name: 'path.extname(inputPath).toLowerCase()', type: 'expression', details: 'Method chain expression' },
      { name: 'result of path.extname', type: 'result', details: 'Intermediate result' },
      { name: 'inputPath', type: 'parameter', details: 'Function parameter' },
      { name: 'generateThumbnail', type: 'function', details: 'Parent function' }
    );
    
    // Setup autocomplete for both inputs
    setupAutocomplete(sourceNameInput, suggestions);
    setupAutocomplete(targetNameInput, suggestions);
  }

  // Simple autocomplete implementation
  function setupAutocomplete(input, suggestions) {
    const container = input.parentNode;
    const suggestionsList = document.createElement('div');
    suggestionsList.className = 'autocomplete-suggestions';
    suggestionsList.style.display = 'none';
    container.appendChild(suggestionsList);
    
    input.addEventListener('input', (e) => {
      const value = e.target.value.toLowerCase();
      
      if (value.length < 2) {
        suggestionsList.style.display = 'none';
        return;
      }
      
      const filtered = suggestions.filter(s => 
        s.name.toLowerCase().includes(value)
      );
      
      if (filtered.length === 0) {
        suggestionsList.style.display = 'none';
        return;
      }
      
      suggestionsList.innerHTML = filtered.map(suggestion => `
        <div class="autocomplete-item" data-name="${suggestion.name}" data-type="${suggestion.type}">
          <div class="suggestion-name">${suggestion.name}</div>
          <div class="suggestion-details">${suggestion.details}</div>
        </div>
      `).join('');
      
      suggestionsList.style.display = 'block';
      
      // Add click handlers
      suggestionsList.querySelectorAll('.autocomplete-item').forEach(item => {
        item.addEventListener('click', () => {
          input.value = item.dataset.name;
          
          // Auto-set the type dropdown if it exists
          const typeSelect = input.id.includes('source') ? 
            document.getElementById('expression-source-type') :
            document.getElementById('expression-target-type');
          
          if (typeSelect && item.dataset.type) {
            typeSelect.value = item.dataset.type;
          }
          
          suggestionsList.style.display = 'none';
        });
      });
    });
    
    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
      if (!container.contains(e.target)) {
        suggestionsList.style.display = 'none';
      }
    });
  }

  // Quick action to create all relationships for your example
  function createFileExtensionExample() {
    const relationships = [
      {
        relationship_type: 'assigned_from',
        source_type: 'variable',
        source_name: 'fileExtension',
        target_type: 'expression',
        target_name: 'path.extname(inputPath).toLowerCase()',
        description: 'fileExtension is assigned the result of path.extname(inputPath).toLowerCase()',
        order_sequence: 1
      },
      {
        relationship_type: 'calls_with',
        source_type: 'method_call',
        source_name: 'path.extname',
        target_type: 'parameter',
        target_name: 'inputPath',
        description: 'path.extname is called with inputPath as parameter',
        order_sequence: 2
      },
      {
        relationship_type: 'called_on',
        source_type: 'method_call',
        source_name: 'toLowerCase',
        target_type: 'result',
        target_name: 'result of path.extname',
        description: 'toLowerCase is called on the result of path.extname',
        order_sequence: 3
      },
      {
        relationship_type: 'used_by',
        source_type: 'parameter',
        source_name: 'inputPath',
        target_type: 'method_call',
        target_name: 'path.extname',
        description: 'inputPath is used by path.extname',
        order_sequence: 4
      },
      {
        relationship_type: 'defines',
        source_type: 'function',
        source_name: 'generateThumbnail',
        target_type: 'variable',
        target_name: 'fileExtension',
        description: 'generateThumbnail function defines the fileExtension variable',
        order_sequence: 5
      }
    ];
    
    // Save all relationships
    relationships.forEach(async (rel, index) => {
      setTimeout(async () => {
        try {
          const response = await fetch('/api/code-graph/expression-relationships', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...rel,
              entity_id: currentExpressionSession.entityId,
              line_number: currentExpressionSession.lineNumber,
              project_id: currentExpressionSession.projectId
            })
          });
          
          if (response.ok && index === relationships.length - 1) {
            showNotification('All example relationships created successfully', 'success');
            loadExpressionRelationships();
          }
        } catch (error) {
          console.error('Error creating relationship:', error);
        }
      }, index * 100); // Stagger the requests
    });
  }

  // Reset expression relationship form
  function resetExpressionRelationshipForm() {
    const form = document.getElementById('expression-relationship-form');
    if (form) {
      form.reset();
    }
  }

  // Edit expression relationship
  async function editExpressionRelationship(id) {
    console.log('Editing relationship:', id);
    // Implementation for editing relationships
  }

  // Delete expression relationship
  async function deleteExpressionRelationship(id) {
    if (confirm('Delete this relationship?')) {
      try {
        const response = await fetch(`/api/code-graph/expression-relationships/${id}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          loadExpressionRelationships();
          showNotification('Relationship deleted successfully', 'success');
        }
      } catch (error) {
        console.error('Error deleting relationship:', error);
        showNotification('Error deleting relationship', 'error');
      }
    }
  }

  // Enhanced data flow tab with relationship management
  function enhanceDataFlowTab() {
    const dataFlowTab = document.getElementById('data-flow-expression-tab');
    if (!dataFlowTab) return;
    
    // Add the enhanced relationship form to the data flow tab
    const enhancedForm = document.createElement('div');
    enhancedForm.className = 'data-flow-form-enhanced';
    enhancedForm.innerHTML = createExpressionRelationshipForm();
    
    // Insert after the existing data flow form
    const existingForm = dataFlowTab.querySelector('.add-data-flow-section');
    if (existingForm) {
      existingForm.parentNode.insertBefore(enhancedForm, existingForm.nextSibling);
    }
    
    // Setup handlers for the new form
    setupExpressionRelationshipHandlers();
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
      quickAnalyzeFile: quickAnalyzeFile,
      // EXPOSE THE FUNCTIONS THAT NEED TO BE CALLED FROM ONCLICK HANDLERS
      editDetectedVariable: editDetectedVariable,
      editDetectedMethodCall: editDetectedMethodCall,
      deleteDetectedVariable: deleteDetectedVariable,
      deleteDetectedMethodCall: deleteDetectedMethodCall,
      // Add new functions to public API
      updateDataFlowDropdowns: updateDataFlowDropdowns,
      createQuickRelationshipsForExample: createQuickRelationshipsForExample,
      enhanceRelationshipModal: enhanceRelationshipModal,
      applyRelationshipTemplate,
      createFileExtensionExample,
      editExpressionRelationship,
      deleteExpressionRelationship,
      resetExpressionRelationshipForm,
      enhanceDataFlowTab,
      setupExpressionRelationshipHandlers,
      loadExpressionRelationships,
      _isInitialized: () => _isInitialized
    };
})();

// IMPORTANT: Assign to window object immediately after definition
window.CodeGraphManager = CodeGraphManager;

// Notification function (keep this outside the module)
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

// Make functions available globally for onclick handlers - USE THE MODULE FUNCTIONS
window.changeEntitiesPage = (page) => CodeGraphManager.changeEntitiesPage(page);
window.changeRelationshipsPage = (page) => CodeGraphManager.changeRelationshipsPage(page);

// REMOVE THE OLD GLOBAL FUNCTION DEFINITIONS AND USE THE MODULE ONES
window.editDetectedVariable = (variableId) => CodeGraphManager.editDetectedVariable(variableId);
window.editDetectedMethodCall = (methodCallId) => CodeGraphManager.editDetectedMethodCall(methodCallId);
window.deleteDetectedVariable = (variableId) => CodeGraphManager.deleteDetectedVariable(variableId);
window.deleteDetectedMethodCall = (methodCallId) => CodeGraphManager.deleteDetectedMethodCall(methodCallId);

