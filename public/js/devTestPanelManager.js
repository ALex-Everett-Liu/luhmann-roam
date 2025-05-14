/**
 * Dev Test Panel Manager
 * Provides UI for testing and monitoring code statistics
 */
const DevTestPanelManager = (function() {
    // Private variables
    let modalElement = null;
    let entries = [];
    let statistics = {};
    let initialized = false;
    
    /**
     * Initializes the dev test panel
     */
    function initialize() {
      // Create UI first, then add to DOM
      createDevTestUI();
      
      // Add to sidebar
      const sidebar = document.querySelector('.sidebar');
      if (sidebar) {
        const devTestButton = document.createElement('button');
        devTestButton.textContent = 'Dev Test Panel';
        devTestButton.id = 'dev-test-button';
        devTestButton.addEventListener('click', openModal);
        sidebar.appendChild(devTestButton);
        
        // Initialize the database table if needed
        initializeDatabase();
        
        initialized = true;
      } else {
        console.error('Cannot find sidebar element');
      }
    }
    
    /**
     * Initializes the database table
     */
    async function initializeDatabase() {
      try {
        const response = await fetch('/api/dev-test/init');
        const result = await response.json();
        
        if (!result.success) {
          console.error('Failed to initialize dev test database table');
        }
      } catch (error) {
        console.error('Error initializing dev test database:', error);
      }
    }
    
    /**
     * Creates the UI for the dev test panel
     */
    function createDevTestUI() {
      // Create modal container
      modalElement = document.createElement('div');
      modalElement.className = 'modal-overlay';
      modalElement.style.display = 'none';
      
      // Create modal content
      const modalContent = document.createElement('div');
      modalContent.className = 'modal query-modal dev-test-modal';
      
      // Create modal header
      const modalHeader = document.createElement('div');
      modalHeader.className = 'modal-header';
      
      const modalTitle = document.createElement('h2');
      modalTitle.className = 'modal-title';
      modalTitle.textContent = 'Dev Test Panel';
      
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
      
      const statsTab = document.createElement('div');
      statsTab.className = 'tab active';
      statsTab.textContent = 'Statistics';
      statsTab.dataset.tab = 'stats';
      
      const entriesTab = document.createElement('div');
      entriesTab.className = 'tab';
      entriesTab.textContent = 'Test Entries';
      entriesTab.dataset.tab = 'entries';
      
      const addEntryTab = document.createElement('div');
      addEntryTab.className = 'tab';
      addEntryTab.textContent = 'Add Entry';
      addEntryTab.dataset.tab = 'add-entry';
      
      tabsContainer.appendChild(statsTab);
      tabsContainer.appendChild(entriesTab);
      tabsContainer.appendChild(addEntryTab);
      
      // Add tab content container
      const tabContent = document.createElement('div');
      tabContent.className = 'tab-content';
      
      // Statistics tab pane
      const statsPane = document.createElement('div');
      statsPane.className = 'tab-pane active';
      statsPane.id = 'stats-tab';
      statsPane.innerHTML = `
        <div class="loading-indicator">Loading statistics...</div>
        <div id="statistics-container" style="display: none;">
          <div class="stats-header">
            <h3>Code Statistics</h3>
            <button id="refresh-statistics" class="btn btn-primary">Refresh</button>
          </div>
          <div id="stats-summary" class="stats-summary"></div>
          <div id="stats-chart" class="chart-container">
            <canvas id="stats-canvas"></canvas>
          </div>
          <div id="stats-files" class="stats-files">
            <h4>Files (Top 20 by Function Count)</h4>
            <table id="files-table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Functions</th>
                  <th>Variables</th>
                  <th>Lines</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      `;
      
      // Entries tab pane
      const entriesPane = document.createElement('div');
      entriesPane.className = 'tab-pane';
      entriesPane.id = 'entries-tab';
      entriesPane.innerHTML = `
        <div class="entries-header">
          <h3>Test Entries</h3>
          <div class="filter-controls">
            <div class="search-container">
              <input type="text" id="entry-search" placeholder="Search entries..." class="search-input">
              <button id="clear-search" class="clear-search-button">&times;</button>
            </div>
            <select id="type-filter">
              <option value="">All Types</option>
              <option value="function">Functions</option>
              <option value="api">APIs</option>
              <option value="variable">Variables</option>
              <option value="parameter">Parameters</option>
            </select>
            <select id="category-filter">
              <option value="">All Categories</option>
            </select>
            <button id="refresh-entries" class="btn btn-primary">Refresh</button>
          </div>
        </div>
        <div id="entries-list" class="entries-list">
          <div class="loading-indicator">Loading entries...</div>
        </div>
      `;
      
      // Add Entry tab pane
      const addEntryPane = document.createElement('div');
      addEntryPane.className = 'tab-pane';
      addEntryPane.id = 'add-entry-tab';
      addEntryPane.innerHTML = `
        <h3>Add Test Entry</h3>
        <form id="add-entry-form" class="dev-test-form">
          <div class="form-group">
            <label for="entry-type">Type:</label>
            <select id="entry-type" required>
              <option value="function">Function</option>
              <option value="api">API</option>
              <option value="variable">Variable</option>
              <option value="parameter">Parameter</option>
            </select>
          </div>
          <div class="form-group">
            <label for="entry-name">Name:</label>
            <input type="text" id="entry-name" required placeholder="e.g. fetchNodes or /api/nodes/:id">
          </div>
          <div class="form-group">
            <label for="entry-category">Category:</label>
            <input type="text" id="entry-category" placeholder="e.g. Node Operations">
          </div>
          <div class="form-group">
            <label for="entry-description">Description:</label>
            <textarea id="entry-description" rows="3" placeholder="What does this function/API do?"></textarea>
          </div>
          <div class="form-group">
            <label for="entry-test-data">Test Data (JSON):</label>
            <textarea id="entry-test-data" rows="5" placeholder='{"param1": "value1"}'></textarea>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">Add Entry</button>
            <button type="reset" class="btn btn-secondary">Reset</button>
          </div>
        </form>
      `;
      
      // Add tab panes to tab content
      tabContent.appendChild(statsPane);
      tabContent.appendChild(entriesPane);
      tabContent.appendChild(addEntryPane);
      
      // Assemble modal
      modalBody.appendChild(tabsContainer);
      modalBody.appendChild(tabContent);
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
          const tabPane = document.getElementById(`${tab.dataset.tab}-tab`);
          if (tabPane) {
            tabPane.classList.add('active');
          }
        });
      });
      
      // Add the modal to the document body
      document.body.appendChild(modalElement);
      
      // Add event listeners once the modal is in the DOM
      setupModalEventListeners();
    }
    
    /**
     * Set up event listeners for elements inside the modal
     */
    function setupModalEventListeners() {
      // Wait for next tick to ensure DOM is fully updated
      setTimeout(() => {
        const refreshStatsButton = modalElement.querySelector('#refresh-statistics');
        if (refreshStatsButton) {
          refreshStatsButton.addEventListener('click', loadStatistics);
        }
        
        const refreshEntriesButton = modalElement.querySelector('#refresh-entries');
        if (refreshEntriesButton) {
          refreshEntriesButton.addEventListener('click', loadEntries);
        }
        
        const typeFilter = modalElement.querySelector('#type-filter');
        if (typeFilter) {
          typeFilter.addEventListener('change', filterEntries);
        }
        
        const categoryFilter = modalElement.querySelector('#category-filter');
        if (categoryFilter) {
          categoryFilter.addEventListener('change', filterEntries);
        }
        
        const addEntryForm = modalElement.querySelector('#add-entry-form');
        if (addEntryForm) {
          addEntryForm.addEventListener('submit', handleAddEntry);
        }
        
        // Set up tab click handlers to load data
        const entriesTab = modalElement.querySelector('.tab[data-tab="entries"]');
        if (entriesTab) {
          entriesTab.addEventListener('click', function() {
            setTimeout(loadEntries, 50); // Delay to ensure DOM is updated
          });
        }
        
        const statsTab = modalElement.querySelector('.tab[data-tab="stats"]');
        if (statsTab) {
          statsTab.addEventListener('click', function() {
            setTimeout(loadStatistics, 50); // Delay to ensure DOM is updated
          });
        }
        
        // Add search functionality
        const searchInput = modalElement.querySelector('#entry-search');
        if (searchInput) {
          searchInput.addEventListener('input', debounce(filterEntries, 300));
        }
        
        // Add clear search button functionality
        const clearSearchButton = modalElement.querySelector('#clear-search');
        if (clearSearchButton) {
          clearSearchButton.addEventListener('click', () => {
            const searchInput = document.getElementById('entry-search');
            if (searchInput) {
              searchInput.value = '';
              filterEntries();
            }
          });
        }
      }, 0);
    }
    
    // Simple debounce function to prevent too many searches while typing
    function debounce(func, wait) {
      let timeout;
      return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
      };
    }
    
    /**
     * Opens the dev test panel modal
     */
    function openModal() {
      if (!modalElement) {
        console.error('Modal element not initialized');
        return;
      }
      
      modalElement.style.display = 'flex';
      
      // Wait for modal to be visible before accessing elements
      setTimeout(() => {
        // Load data based on active tab
        const activeTab = modalElement.querySelector('.tab.active');
        if (activeTab) {
          const tabName = activeTab.dataset.tab;
          if (tabName === 'stats') {
            loadStatistics();
          } else if (tabName === 'entries') {
            loadEntries();
          }
        }
      }, 100); // Longer delay to ensure modal is fully rendered
    }
    
    /**
     * Closes the modal
     */
    function closeModal() {
      if (modalElement) {
        modalElement.style.display = 'none';
      }
    }
    
    /**
     * Loads statistics data from the server
     */
    async function loadStatistics() {
      try {
        // Find DOM elements safely
        const statsTab = document.getElementById('stats-tab');
        if (!statsTab) {
          console.error('Stats tab not found in DOM');
          return;
        }
        
        // Find child elements safely
        const statisticsContainer = statsTab.querySelector('#statistics-container');
        const loadingIndicator = statsTab.querySelector('.loading-indicator');
        
        if (!statisticsContainer || !loadingIndicator) {
          console.error('Cannot find statistics container or loading indicator');
          return;
        }
        
        // Show loading indicator, hide container
        statisticsContainer.style.display = 'none';
        loadingIndicator.style.display = 'block';
        
        // Fetch statistics
        const response = await fetch('/api/dev-test/statistics');
        statistics = await response.json();
        
        renderStatistics();
        
        // Hide loading indicator, show container
        loadingIndicator.style.display = 'none';
        statisticsContainer.style.display = 'block';
      } catch (error) {
        console.error('Error loading statistics:', error);
        
        // Find statsTab safely
        const statsTab = document.getElementById('stats-tab');
        if (!statsTab) return;
        
        // Handle error
        statsTab.innerHTML = `
          <div class="error-message">
            Error loading statistics: ${error.message}
            <button id="retry-statistics" class="btn btn-primary">Retry</button>
          </div>
        `;
        
        const retryButton = document.getElementById('retry-statistics');
        if (retryButton) {
          retryButton.addEventListener('click', loadStatistics);
        }
      }
    }
    
    /**
     * Renders the statistics in the UI
     */
    function renderStatistics() {
      // Find DOM elements safely
      const statsSummary = document.getElementById('stats-summary');
      if (!statsSummary) {
        console.error('Cannot find stats-summary element');
        return;
      }
      
      // Ensure statistics data exists
      if (!statistics || !statistics.totalFiles) {
        console.error('Statistics data is missing or incomplete');
        statsSummary.innerHTML = '<div class="error-message">Invalid statistics data</div>';
        return;
      }
      
      // Render summary
      statsSummary.innerHTML = `
        <div class="stat-item">
          <div class="stat-value">${statistics.totalFiles}</div>
          <div class="stat-label">Files</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${statistics.totalFunctions}</div>
          <div class="stat-label">Functions</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${statistics.totalVariables}</div>
          <div class="stat-label">Variables</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${statistics.totalLOC}</div>
          <div class="stat-label">Lines of Code</div>
        </div>
      `;
      
      // Find and render files table safely
      const filesTable = document.getElementById('files-table');
      if (!filesTable) {
        console.error('Cannot find files-table element');
        return;
      }
      
      const tableBody = filesTable.querySelector('tbody');
      if (!tableBody) {
        console.error('Cannot find table body element');
        return;
      }
      
      tableBody.innerHTML = '';
      
      // Ensure files array exists
      if (!statistics.files || !Array.isArray(statistics.files)) {
        console.error('Files data is missing or not an array');
        return;
      }
      
      // Sort files by function count and take top 20
      const topFiles = [...statistics.files]
        .sort((a, b) => b.functions - a.functions)
        .slice(0, 20);
      
      topFiles.forEach(file => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${file.path}</td>
          <td>${file.functions}</td>
          <td>${file.variables}</td>
          <td>${file.lines}</td>
        `;
        tableBody.appendChild(row);
      });
      
      // Render chart with a delay to ensure canvas is ready
      setTimeout(() => renderStatisticsChart(topFiles), 50);
    }
    
    /**
     * Renders a chart of file statistics
     */
    function renderStatisticsChart(files) {
      // Find canvas safely
      const canvas = document.getElementById('stats-canvas');
      if (!canvas) {
        console.error('Cannot find stats-canvas element');
        return;
      }
      
      // Check if Chart.js is available
      if (typeof Chart === 'undefined') {
        // Load Chart.js dynamically if not already available
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = () => createStatisticsChart(files, canvas);
        document.head.appendChild(script);
      } else {
        createStatisticsChart(files, canvas);
      }
    }
    
    /**
     * Creates the statistics chart
     */
    function createStatisticsChart(files, canvas) {
      if (!canvas) return;
      
      // Check if canvas parent exists
      const canvasParent = canvas.parentNode;
      if (!canvasParent) {
        console.error('Canvas parent node is null');
        return;
      }
      
      // Prepare data for chart
      const labels = files.map(file => {
        // Truncate path for display
        const parts = file.path.split('/');
        if (parts.length > 2) {
          return '...' + parts.slice(-2).join('/');
        }
        return file.path;
      });
      
      const functionCounts = files.map(file => file.functions);
      const variableCounts = files.map(file => file.variables);
      
      // Define chart colors
      const functionColor = 'rgba(54, 162, 235, 0.7)';
      const variableColor = 'rgba(255, 99, 132, 0.7)';
      
      // Set canvas size
      canvasParent.style.height = '400px';
      canvasParent.style.width = '100%';
      
      // Destroy previous chart if exists
      if (window.devTestStatChart) {
        window.devTestStatChart.destroy();
      }
      
      // Create new chart
      const ctx = canvas.getContext('2d');
      window.devTestStatChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Functions',
              data: functionCounts,
              backgroundColor: functionColor,
              borderColor: functionColor.replace('0.7', '1'),
              borderWidth: 1
            },
            {
              label: 'Variables',
              data: variableCounts,
              backgroundColor: variableColor,
              borderColor: variableColor.replace('0.7', '1'),
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              ticks: {
                maxRotation: 45,
                minRotation: 45
              }
            },
            y: {
              beginAtZero: true
            }
          },
          plugins: {
            tooltip: {
              callbacks: {
                title: function(tooltipItems) {
                  // Show full path in tooltip
                  const index = tooltipItems[0].dataIndex;
                  return files[index].path;
                }
              }
            }
          }
        }
      });
    }
    
    /**
     * Loads test entries from the server
     */
    async function loadEntries() {
      try {
        // Find entries list element safely
        const entriesTab = document.getElementById('entries-tab');
        if (!entriesTab) {
          console.error('Entries tab not found in DOM');
          return;
        }
        
        const entriesList = entriesTab.querySelector('#entries-list');
        if (!entriesList) {
          console.error('Cannot find entries-list element in the DOM');
          return;
        }
        
        entriesList.innerHTML = '<div class="loading-indicator">Loading entries...</div>';
        
        // Get type and category filters
        const typeFilter = document.getElementById('type-filter');
        const categoryFilter = document.getElementById('category-filter');
        
        // Build query string
        let queryParams = new URLSearchParams();
        if (typeFilter && typeFilter.value) queryParams.append('type', typeFilter.value);
        if (categoryFilter && categoryFilter.value) queryParams.append('category', categoryFilter.value);
        
        const response = await fetch(`/api/dev-test/entries?${queryParams}`);
        entries = await response.json();
        
        renderEntries();
        updateCategoryFilter();
      } catch (error) {
        console.error('Error loading entries:', error);
        
        // Find entries list safely
        const entriesTab = document.getElementById('entries-tab');
        if (!entriesTab) return;
        
        const entriesList = entriesTab.querySelector('#entries-list');
        if (!entriesList) return;
        
        entriesList.innerHTML = `
          <div class="error-message">
            Error loading entries: ${error.message}
            <button id="retry-entries" class="btn btn-primary">Retry</button>
          </div>
        `;
        
        const retryButton = document.getElementById('retry-entries');
        if (retryButton) {
          retryButton.addEventListener('click', loadEntries);
        }
      }
    }
    
    /**
     * Updates the category filter dropdown with available categories
     */
    function updateCategoryFilter() {
      const categorySelect = document.getElementById('category-filter');
      if (!categorySelect) return;
      
      // Save current selection
      const currentValue = categorySelect.value;
      
      // Get unique categories
      const categories = [...new Set(entries.map(entry => entry.category).filter(Boolean))];
      
      // Clear options (except first)
      while (categorySelect.options.length > 1) {
        categorySelect.remove(1);
      }
      
      // Add options
      categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
      });
      
      // Restore selection if still valid
      if (categories.includes(currentValue)) {
        categorySelect.value = currentValue;
      }
    }
    
    /**
     * Renders the entries in the UI
     */
    function renderEntries() {
      const entriesList = document.getElementById('entries-list');
      entriesList.innerHTML = '';
      
      if (entries.length === 0) {
        entriesList.innerHTML = `
          <div class="empty-state">
            <p>No test entries found. Add some entries to start testing!</p>
          </div>
        `;
        return;
      }
      
      // Group entries by category
      const entriesByCategory = {};
      entries.forEach(entry => {
        const category = entry.category || 'Uncategorized';
        if (!entriesByCategory[category]) {
          entriesByCategory[category] = [];
        }
        entriesByCategory[category].push(entry);
      });
      
      // Create entries list
      Object.keys(entriesByCategory).sort().forEach(category => {
        const categoryEntries = entriesByCategory[category];
        
        const categorySection = document.createElement('div');
        categorySection.className = 'entry-category';
        // Reset display property to ensure all categories are visible after reloading
        categorySection.style.display = ''; 
        
        const categoryHeader = document.createElement('h4');
        categoryHeader.className = 'category-header';
        categoryHeader.textContent = category;
        categorySection.appendChild(categoryHeader);
        
        // Create entry list for this category
        const entriesContainer = document.createElement('div');
        entriesContainer.className = 'entries-container';
        
        categoryEntries.forEach(entry => {
          const entryItem = document.createElement('div');
          entryItem.className = `entry-item entry-status-${entry.status || 'pending'}`;
          entryItem.dataset.id = entry.id;
          // Reset display property to ensure all entries are visible after reloading
          entryItem.style.display = '';
          
          // Create entry header
          const entryHeader = document.createElement('div');
          entryHeader.className = 'entry-header';
          
          const entryTitle = document.createElement('div');
          entryTitle.className = 'entry-title';
          entryTitle.innerHTML = `<span class="entry-type">[${entry.type}]</span> ${entry.name}`;
          
          const entryActions = document.createElement('div');
          entryActions.className = 'entry-actions';
          
          const runButton = document.createElement('button');
          runButton.className = 'run-button';
          runButton.innerHTML = '▶';
          runButton.title = 'Run Test';
          runButton.addEventListener('click', () => runTest(entry.id));
          
          const editButton = document.createElement('button');
          editButton.className = 'edit-button';
          editButton.innerHTML = '✎';
          editButton.title = 'Edit Entry';
          editButton.addEventListener('click', () => editEntry(entry.id));
          
          const deleteButton = document.createElement('button');
          deleteButton.className = 'delete-button';
          deleteButton.innerHTML = '×';
          deleteButton.title = 'Delete Entry';
          deleteButton.addEventListener('click', () => deleteEntry(entry.id));
          
          entryActions.appendChild(runButton);
          entryActions.appendChild(editButton);
          entryActions.appendChild(deleteButton);
          
          entryHeader.appendChild(entryTitle);
          entryHeader.appendChild(entryActions);
          
          // Create entry content
          const entryContent = document.createElement('div');
          entryContent.className = 'entry-content';
          
          if (entry.description) {
            const descriptionEl = document.createElement('div');
            descriptionEl.className = 'entry-description';
            descriptionEl.textContent = entry.description;
            entryContent.appendChild(descriptionEl);
          }
          
          if (entry.test_data) {
            const testDataEl = document.createElement('div');
            testDataEl.className = 'entry-test-data';
            testDataEl.innerHTML = `<strong>Test Data:</strong> <pre>${entry.test_data}</pre>`;
            entryContent.appendChild(testDataEl);
          }
          
          if (entry.test_result) {
            const testResultEl = document.createElement('div');
            testResultEl.className = 'entry-test-result';
            testResultEl.innerHTML = `<strong>Result:</strong> <pre>${entry.test_result}</pre>`;
            entryContent.appendChild(testResultEl);
          }
          
          // Status badge
          const statusBadge = document.createElement('div');
          statusBadge.className = `status-badge status-${entry.status || 'pending'}`;
          statusBadge.textContent = entry.status || 'pending';
          entryHeader.appendChild(statusBadge);
          
          // Assemble entry item
          entryItem.appendChild(entryHeader);
          entryItem.appendChild(entryContent);
          
          // Toggle content visibility on header click
          entryHeader.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
              entryContent.style.display = entryContent.style.display === 'block' ? 'none' : 'block';
              entryItem.classList.toggle('expanded');
            }
          });
          entriesContainer.appendChild(entryItem);
        });
        
        categorySection.appendChild(entriesContainer);
        entriesList.appendChild(categorySection);
      });
      
      // Apply search filter if there's a search term
      const searchInput = document.getElementById('entry-search');
      if (searchInput && searchInput.value.trim()) {
        filterEntries();
      }
    }

    /**
     * Filters entries based on search term, type and category
     */
    function filterEntries() {
      const searchInput = document.getElementById('entry-search');
      const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
      
      // If there's a search term, filter entries locally
      if (searchTerm) {
        // Filter entries without reloading from server
        const entriesList = document.getElementById('entries-list');
        if (!entriesList) return;
        
        // Get all entry items
        const entryItems = entriesList.querySelectorAll('.entry-item');
        
        // Loop through each entry and check if it matches search
        entryItems.forEach(item => {
          const title = item.querySelector('.entry-title');
          const description = item.querySelector('.entry-description');
          const testData = item.querySelector('.entry-test-data');
          const testResult = item.querySelector('.entry-test-result');
          
          const titleText = title ? title.textContent.toLowerCase() : '';
          const descText = description ? description.textContent.toLowerCase() : '';
          const dataText = testData ? testData.textContent.toLowerCase() : '';
          const resultText = testResult ? testResult.textContent.toLowerCase() : '';
          
          // Check if any of the text contains search term
          const matches = titleText.includes(searchTerm) || 
                          descText.includes(searchTerm) || 
                          dataText.includes(searchTerm) || 
                          resultText.includes(searchTerm);
          
          // Show or hide based on match
          item.style.display = matches ? 'block' : 'none';
          
          // Also handle parent category visibility
          const parentCategory = item.closest('.entry-category');
          if (parentCategory) {
            // Check if any items in this category are visible
            const visibleItems = parentCategory.querySelectorAll('.entry-item[style="display: block;"]');
            parentCategory.style.display = visibleItems.length > 0 ? 'block' : 'none';
          }
        });
        
        // Check if any entries are visible, show empty state if not
        const visibleEntries = entriesList.querySelectorAll('.entry-item[style="display: block;"]');
        if (visibleEntries.length === 0) {
          // If no entries match, show empty state
          const emptyState = document.createElement('div');
          emptyState.className = 'empty-state';
          emptyState.id = 'search-empty-state';
          emptyState.innerHTML = `
            <p>No entries match your search for "${searchTerm}"</p>
          `;
          
          // Remove existing empty state if it exists
          const existingEmptyState = entriesList.querySelector('#search-empty-state');
          if (existingEmptyState) {
            entriesList.removeChild(existingEmptyState);
          }
          
          entriesList.appendChild(emptyState);
        } else {
          // Remove empty state if it exists
          const existingEmptyState = entriesList.querySelector('#search-empty-state');
          if (existingEmptyState) {
            entriesList.removeChild(existingEmptyState);
          }
        }
      } else {
        // If no search term, reload entries normally
        loadEntries();
      }
    }
    
    /**
     * Handles adding a new entry
     */
    async function handleAddEntry(e) {
      e.preventDefault();
      
      try {
        const typeInput = document.getElementById('entry-type');
        const nameInput = document.getElementById('entry-name');
        const categoryInput = document.getElementById('entry-category');
        const descriptionInput = document.getElementById('entry-description');
        const testDataInput = document.getElementById('entry-test-data');
        
        // Validate required fields
        if (!typeInput.value || !nameInput.value) {
          alert('Type and name are required fields');
          return;
        }
        
        // Validate JSON test data
        let testData = null;
        if (testDataInput.value) {
          try {
            testData = JSON.parse(testDataInput.value);
            // Re-stringify to ensure proper formatting
            testDataInput.value = JSON.stringify(testData, null, 2);
          } catch (error) {
            alert(`Invalid JSON in test data: ${error.message}`);
            return;
          }
        }
        
        // Prepare entry data
        const entryData = {
          type: typeInput.value,
          name: nameInput.value,
          category: categoryInput.value,
          description: descriptionInput.value,
          test_data: testDataInput.value
        };
        
        // Send request to create entry
        const response = await fetch('/api/dev-test/entries', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(entryData)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create entry');
        }
        
        // Reset form
        document.getElementById('add-entry-form').reset();
        
        // Reload entries
        loadEntries();
        
        // Switch to entries tab
        document.querySelector('.tab[data-tab="entries"]').click();
        
        // Show success message
        alert('Entry created successfully');
        
      } catch (error) {
        console.error('Error creating entry:', error);
        alert(`Error creating entry: ${error.message}`);
      }
    }
    
    /**
     * Runs a test for an entry
     */
    async function runTest(entryId) {
      try {
        // Get the entry element
        const entryElement = document.querySelector(`.entry-item[data-id="${entryId}"]`);
        if (!entryElement) return;
        
        // Update UI to show running state
        entryElement.classList.add('running');
        const statusBadge = entryElement.querySelector('.status-badge');
        if (statusBadge) {
          statusBadge.className = 'status-badge status-running';
          statusBadge.textContent = 'running';
        }
        
        // Expand the entry to show results
        const entryContent = entryElement.querySelector('.entry-content');
        if (entryContent) {
          entryContent.style.display = 'block';
        }
        entryElement.classList.add('expanded');
        
        // Run the test
        const response = await fetch(`/api/dev-test/entries/${entryId}/run`, {
          method: 'POST'
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Test execution failed');
        }
        
        const result = await response.json();
        
        // Update entry with results
        await loadEntries();
        
        // Find and expand the updated entry
        const updatedEntry = document.querySelector(`.entry-item[data-id="${entryId}"]`);
        if (updatedEntry) {
          updatedEntry.classList.add('expanded');
          const updatedContent = updatedEntry.querySelector('.entry-content');
          if (updatedContent) {
            updatedContent.style.display = 'block';
          }
        }
        
      } catch (error) {
        console.error('Error running test:', error);
        alert(`Error running test: ${error.message}`);
        
        // Reset the entry to its previous state
        loadEntries();
      }
    }
    
    /**
     * Edits an entry
     */
    async function editEntry(entryId) {
      try {
        // Get the entry from our cached list
        const entry = entries.find(e => e.id === entryId);
        if (!entry) {
          throw new Error('Entry not found');
        }
        
        // Create edit modal
        const editModal = document.createElement('div');
        editModal.className = 'modal-overlay';
        editModal.style.display = 'flex';
        
        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'modal edit-entry-modal';
        
        // Create modal header
        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        
        const modalTitle = document.createElement('h2');
        modalTitle.className = 'modal-title';
        modalTitle.textContent = 'Edit Test Entry';
        
        const closeButton = document.createElement('button');
        closeButton.className = 'modal-close';
        closeButton.innerHTML = '&times;';
        closeButton.addEventListener('click', () => {
          document.body.removeChild(editModal);
        });
        
        modalHeader.appendChild(modalTitle);
        modalHeader.appendChild(closeButton);
        
        // Create modal body
        const modalBody = document.createElement('div');
        modalBody.className = 'modal-body';
        
        modalBody.innerHTML = `
          <form id="edit-entry-form" class="dev-test-form">
            <div class="form-group">
              <label for="edit-entry-type">Type:</label>
              <select id="edit-entry-type" required>
                <option value="function" ${entry.type === 'function' ? 'selected' : ''}>Function</option>
                <option value="api" ${entry.type === 'api' ? 'selected' : ''}>API</option>
                <option value="variable" ${entry.type === 'variable' ? 'selected' : ''}>Variable</option>
                <option value="parameter" ${entry.type === 'parameter' ? 'selected' : ''}>Parameter</option>
              </select>
            </div>
            <div class="form-group">
              <label for="edit-entry-name">Name:</label>
              <input type="text" id="edit-entry-name" required value="${entry.name || ''}">
            </div>
            <div class="form-group">
              <label for="edit-entry-category">Category:</label>
              <input type="text" id="edit-entry-category" value="${entry.category || ''}">
            </div>
            <div class="form-group">
              <label for="edit-entry-description">Description:</label>
              <textarea id="edit-entry-description" rows="3">${entry.description || ''}</textarea>
            </div>
            <div class="form-group">
              <label for="edit-entry-test-data">Test Data (JSON):</label>
              <textarea id="edit-entry-test-data" rows="5">${entry.test_data || ''}</textarea>
            </div>
            <div class="form-group">
              <label for="edit-entry-status">Status:</label>
              <select id="edit-entry-status">
                <option value="pending" ${entry.status === 'pending' || !entry.status ? 'selected' : ''}>Pending</option>
                <option value="passed" ${entry.status === 'passed' ? 'selected' : ''}>Passed</option>
                <option value="failed" ${entry.status === 'failed' ? 'selected' : ''}>Failed</option>
                <option value="error" ${entry.status === 'error' ? 'selected' : ''}>Error</option>
              </select>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary">Save Changes</button>
              <button type="button" class="cancel-button btn btn-secondary">Cancel</button>
            </div>
          </form>
        `;
        
        // Assemble modal
        modalContent.appendChild(modalHeader);
        modalContent.appendChild(modalBody);
        editModal.appendChild(modalContent);
        
        // Add event listeners
        const form = modalContent.querySelector('#edit-entry-form');
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          
          try {
            // Get form data
            const type = document.getElementById('edit-entry-type').value;
            const name = document.getElementById('edit-entry-name').value;
            const category = document.getElementById('edit-entry-category').value;
            const description = document.getElementById('edit-entry-description').value;
            const testData = document.getElementById('edit-entry-test-data').value;
            const status = document.getElementById('edit-entry-status').value;
            
            // Validate JSON test data
            if (testData) {
              try {
                JSON.parse(testData);
              } catch (error) {
                alert(`Invalid JSON in test data: ${error.message}`);
                return;
              }
            }
            
            // Send update request
            const response = await fetch(`/api/dev-test/entries/${entryId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                type,
                name,
                category,
                description,
                test_data: testData,
                status
              })
            });
            
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to update entry');
            }
            
            // Close modal
            document.body.removeChild(editModal);
            
            // Reload entries
            loadEntries();
            
          } catch (error) {
            console.error('Error updating entry:', error);
            alert(`Error updating entry: ${error.message}`);
          }
        });
        
        // Cancel button handler
        const cancelButton = modalContent.querySelector('.cancel-button');
        cancelButton.addEventListener('click', () => {
          document.body.removeChild(editModal);
        });
        
        // Add the modal to the body
        document.body.appendChild(editModal);
        
      } catch (error) {
        console.error('Error editing entry:', error);
        alert(`Error editing entry: ${error.message}`);
      }
    }
    
    /**
     * Deletes an entry
     */
    async function deleteEntry(entryId) {
      try {
        // Confirm deletion
        if (!confirm('Are you sure you want to delete this entry?')) {
          return;
        }
        
        // Send delete request
        const response = await fetch(`/api/dev-test/entries/${entryId}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          throw new Error('Failed to delete entry');
        }
        
        // Reload entries
        loadEntries();
        
      } catch (error) {
        console.error('Error deleting entry:', error);
        alert(`Error deleting entry: ${error.message}`);
      }
    }
    
    // Public API
    return {
      initialize,
      openModal,
      loadStatistics,
      loadEntries
    };
})();

// Export the module
window.DevTestPanelManager = DevTestPanelManager;