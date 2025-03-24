/**
 * Code Analyzer Manager Module
 * Provides statistics and visualization of codebase structure
 */
const CodeAnalyzerManager = (function() {
    // Private variables
    let codeStructure = {
      modules: {},
      functionCount: 0,
      variableCount: 0,
      relationships: []
    };
    
    let modalElement = null;
    
    /**
     * Initializes the code analyzer
     */
    function initialize() {
      createAnalyzerUI();
      
      // Add to sidebar
      const sidebar = document.querySelector('.sidebar');
      const analyzeButton = document.createElement('button');
      analyzeButton.textContent = 'Code Structure';
      analyzeButton.addEventListener('click', openAnalyzerModal);
      sidebar.appendChild(analyzeButton);
    }
    
    /**
     * Creates the analyzer UI modal
     */
    function createAnalyzerUI() {
      // Create modal container
      modalElement = document.createElement('div');
      modalElement.className = 'modal-overlay';
      modalElement.style.display = 'none';
      
      // Create modal content
      const modalContent = document.createElement('div');
      modalContent.className = 'modal query-modal';
      
      // Create modal header
      const modalHeader = document.createElement('div');
      modalHeader.className = 'modal-header';
      
      const modalTitle = document.createElement('h2');
      modalTitle.className = 'modal-title';
      modalTitle.textContent = 'Code Structure Analysis';
      
      const closeButton = document.createElement('button');
      closeButton.className = 'modal-close';
      closeButton.innerHTML = '&times;';
      closeButton.addEventListener('click', closeModal);
      
      modalHeader.appendChild(modalTitle);
      modalHeader.appendChild(closeButton);
      
      // Create modal body
      const modalBody = document.createElement('div');
      modalBody.className = 'modal-body';
      
      // Add tabs for different views
      const tabsContainer = document.createElement('div');
      tabsContainer.className = 'tabs-container';
      
      const statsSummaryTab = document.createElement('div');
      statsSummaryTab.className = 'tab active';
      statsSummaryTab.textContent = 'Summary';
      statsSummaryTab.dataset.tab = 'summary';
      
      const modulesTab = document.createElement('div');
      modulesTab.className = 'tab';
      modulesTab.textContent = 'Modules';
      modulesTab.dataset.tab = 'modules';
      
      const functionsTab = document.createElement('div');
      functionsTab.className = 'tab';
      functionsTab.textContent = 'Functions';
      functionsTab.dataset.tab = 'functions';
      
      const relationshipsTab = document.createElement('div');
      relationshipsTab.className = 'tab';
      relationshipsTab.textContent = 'Relationships';
      relationshipsTab.dataset.tab = 'relationships';
      
      tabsContainer.appendChild(statsSummaryTab);
      tabsContainer.appendChild(modulesTab);
      tabsContainer.appendChild(functionsTab);
      tabsContainer.appendChild(relationshipsTab);
      
      // Add tab content container
      const tabContent = document.createElement('div');
      tabContent.className = 'tab-content';
      
      // Summary tab pane
      const summaryPane = document.createElement('div');
      summaryPane.className = 'tab-pane active';
      summaryPane.id = 'summary-tab';
      
      // Create a container for the summary statistics
      const summaryStats = document.createElement('div');
      summaryStats.id = 'summary-stats';
      summaryPane.appendChild(summaryStats);
      
      // Modules tab pane
      const modulesPane = document.createElement('div');
      modulesPane.className = 'tab-pane';
      modulesPane.id = 'modules-tab';
      
      // Functions tab pane
      const functionsPane = document.createElement('div');
      functionsPane.className = 'tab-pane';
      functionsPane.id = 'functions-tab';
      
      // Relationships tab pane
      const relationshipsPane = document.createElement('div');
      relationshipsPane.className = 'tab-pane';
      relationshipsPane.id = 'relationships-tab';
      
      // Add tab panes to tab content
      tabContent.appendChild(summaryPane);
      tabContent.appendChild(modulesPane);
      tabContent.appendChild(functionsPane);
      tabContent.appendChild(relationshipsPane);
      
      // Add refresh button 
      const refreshButton = document.createElement('button');
      refreshButton.className = 'btn btn-primary';
      refreshButton.textContent = 'Refresh Analysis';
      refreshButton.addEventListener('click', analyzeCodebase);
      
      // Add tabs and content to modal body
      modalBody.appendChild(tabsContainer);
      modalBody.appendChild(tabContent);
      modalBody.appendChild(refreshButton);
      
      // Assemble modal
      modalContent.appendChild(modalHeader);
      modalContent.appendChild(modalBody);
      modalElement.appendChild(modalContent);
      
      // Add tab switching functionality
      tabsContainer.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
          // Remove active class from all tabs
          tabsContainer.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
          tabContent.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
          
          // Add active class to clicked tab
          tab.classList.add('active');
          document.getElementById(`${tab.dataset.tab}-tab`).classList.add('active');
        });
      });
      
      // Add modal to document
      document.body.appendChild(modalElement);
    }
    
    /**
     * Opens the analyzer modal
     */
    function openAnalyzerModal() {
      ensureUIExists();
      modalElement.style.display = 'flex';
      analyzeCodebase();
    }
    
    /**
     * Closes the analyzer modal
     */
    function closeModal() {
      if (modalElement) {
        modalElement.style.display = 'none';
      }
    }
    
    /**
     * Ensures the UI exists before trying to use it
     */
    function ensureUIExists() {
      if (!modalElement) {
        createAnalyzerUI();
      }
    }
    
    /**
     * Analyzes all JavaScript files in the application
     */
    async function analyzeCodebase() {
      try {
        // Show loading state
        const summaryStats = document.getElementById('summary-stats');
        if (summaryStats) {
          summaryStats.innerHTML = '<p>Loading analysis...</p>';
        }
        
        const response = await fetch('/api/code-structure');
        const data = await response.json();
        codeStructure = data;
        renderCodeStructure();
      } catch (error) {
        console.error('Error analyzing codebase:', error);
        const summaryStats = document.getElementById('summary-stats');
        if (summaryStats) {
          summaryStats.innerHTML = `<p>Error analyzing codebase: ${error.message}</p>`;
        }
      }
    }
    
    /**
     * Renders the code structure visualization
     */
    function renderCodeStructure() {
      renderSummary();
      renderModules();
      renderFunctions();
      renderRelationships();
    }
    
    /**
     * Renders the summary statistics
     */
    function renderSummary() {
      const summaryPane = document.getElementById('summary-tab');
      if (!summaryPane) return;
      
      const moduleCount = Object.keys(codeStructure.modules).length;
      
      let html = `
        <div class="summary-card">
          <h3>Code Statistics</h3>
          <ul>
            <li><strong>Modules:</strong> ${moduleCount}</li>
            <li><strong>Functions:</strong> ${codeStructure.functionCount}</li>
            <li><strong>Variables:</strong> ${codeStructure.variableCount}</li>
            <li><strong>Dependencies:</strong> ${codeStructure.relationships.length}</li>
            <li><strong>Total Files:</strong> ${moduleCount}</li>
            <li><strong>Total LOC:</strong> ${calculateTotalLOC()}</li>
          </ul>
        </div>
        
        <div id="complexity-chart" class="chart-container">
          <h3>Module Complexity</h3>
          <div class="chart-placeholder">
            <!-- Charts would be rendered here with a library like d3.js -->
            <p>Module complexity chart would be displayed here.</p>
          </div>
        </div>
      `;
      
      summaryPane.innerHTML = html;
    }
    
    /**
     * Renders the modules list
     */
    function renderModules() {
      const modulesPane = document.getElementById('modules-tab');
      if (!modulesPane) return;
      
      let html = '<h3>Modules</h3><ul class="modules-list">';
      
      Object.entries(codeStructure.modules).forEach(([filePath, moduleData]) => {
        html += `
          <li class="module-item">
            <div class="module-header">
              <span class="module-name">${getFileNameFromPath(filePath)}</span>
              <span class="module-stats">
                <span class="module-metric">${moduleData.functions.length} functions</span>
                <span class="module-metric">${moduleData.loc} lines</span>
              </span>
            </div>
            <div class="module-path">${filePath}</div>
          </li>
        `;
      });
      
      html += '</ul>';
      modulesPane.innerHTML = html;
    }
    
    /**
     * Renders the functions list
     */
    function renderFunctions() {
      const functionsPane = document.getElementById('functions-tab');
      if (!functionsPane) return;
      
      let html = '<h3>Functions</h3><ul class="functions-list">';
      
      // Collect all functions from all modules
      const allFunctions = [];
      
      Object.entries(codeStructure.modules).forEach(([filePath, moduleData]) => {
        moduleData.functions.forEach(func => {
          allFunctions.push({
            name: func.name,
            filePath: filePath,
            position: func.position,
            fileName: getFileNameFromPath(filePath)
          });
        });
      });
      
      // Sort functions by name
      allFunctions.sort((a, b) => a.name.localeCompare(b.name));
      
      allFunctions.forEach(func => {
        html += `
          <li class="function-item">
            <span class="function-name">${func.name}</span>
            <span class="function-file">${func.fileName}</span>
          </li>
        `;
      });
      
      html += '</ul>';
      functionsPane.innerHTML = html;
    }
    
    /**
     * Renders the relationships visualization
     */
    function renderRelationships() {
      const relationshipsPane = document.getElementById('relationships-tab');
      if (!relationshipsPane) return;
      
      let html = `
        <h3>Module Dependencies</h3>
        <div class="relationships-viz">
          <p>Module dependency chart would be displayed here.</p>
          <p>For a production implementation, consider using D3.js for force-directed graphs.</p>
        </div>
        
        <h3>Dependency List</h3>
        <ul class="relationships-list">
      `;
      
      codeStructure.relationships.forEach(rel => {
        html += `
          <li class="relationship-item">
            <span class="relationship-from">${getFileNameFromPath(rel.from)}</span>
            <span class="relationship-arrow">→</span>
            <span class="relationship-to">${getFileNameFromPath(rel.to)}</span>
          </li>
        `;
      });
      
      html += '</ul>';
      relationshipsPane.innerHTML = html;
    }
    
    /**
     * Helper to calculate total lines of code
     */
    function calculateTotalLOC() {
      return Object.values(codeStructure.modules).reduce((total, module) => total + module.loc, 0);
    }
    
    /**
     * Helper to extract filename from path
     */
    function getFileNameFromPath(path) {
      const parts = path.split('/');
      return parts[parts.length - 1];
    }
    
    // Public API
    return {
      initialize,
      analyzeCodebase,
      openAnalyzerModal: function() {
        ensureUIExists();
        modalElement.style.display = 'flex';
        analyzeCodebase();
      }
    };
  })();
  
  // Export the module for use in other files
  window.CodeAnalyzerManager = CodeAnalyzerManager;