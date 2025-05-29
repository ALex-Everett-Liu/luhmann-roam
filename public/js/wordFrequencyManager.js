/**
 * Word Frequency Manager
 * Analyzes and displays word frequency in node content
 */
const WordFrequencyManager = (function() {
    // Private variables
    let modalElement = null;
    let wordFrequencyData = [];
    let initialized = false;
    let currentChart = null;
    let currentView = 'overview'; // 'overview', 'chart-expanded', 'table-expanded'
    
    /**
     * Initializes the word frequency manager
     */
    function initialize() {
        if (initialized) return;
        
        // Create UI
        createWordFrequencyUI();
        
        // Add button to sidebar
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            const wordFreqButton = document.createElement('button');
            wordFreqButton.textContent = 'Word Frequency';
            wordFreqButton.id = 'word-frequency-button';
            wordFreqButton.className = 'feature-toggle';
            wordFreqButton.title = 'Analyze word frequency in node content';
            wordFreqButton.addEventListener('click', openModal);
            sidebar.appendChild(wordFreqButton);
            
            initialized = true;
            console.log('WordFrequencyManager initialized');
        } else {
            console.error('Cannot find sidebar element');
        }
    }
    
    /**
     * Creates the UI for the word frequency analyzer
     */
    function createWordFrequencyUI() {
        // Create modal container
        modalElement = document.createElement('div');
        modalElement.className = 'modal-overlay word-frequency-modal-overlay';
        modalElement.style.display = 'none';
        
        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'modal word-frequency-modal';
        
        // Create modal header
        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        
        const modalTitle = document.createElement('h2');
        modalTitle.className = 'modal-title';
        modalTitle.textContent = 'Word Frequency Analysis';
        
        const closeButton = document.createElement('button');
        closeButton.className = 'modal-close';
        closeButton.innerHTML = '&times;';
        closeButton.addEventListener('click', closeModal);
        
        modalHeader.appendChild(modalTitle);
        modalHeader.appendChild(closeButton);
        
        // Create modal body
        const modalBody = document.createElement('div');
        modalBody.className = 'modal-body word-frequency-body';
        
        modalBody.innerHTML = `
            <div class="word-frequency-container">
                <div class="loading-indicator" id="word-freq-loading">
                    <p>Analyzing word frequency...</p>
                </div>
                
                <div class="word-frequency-content" id="word-freq-content" style="display: none;">
                    <!-- Navigation breadcrumb for expanded views -->
                    <div class="word-frequency-nav" id="word-freq-nav" style="display: none;">
                        <button id="back-to-overview" class="btn btn-secondary">← Back to Overview</button>
                        <span id="current-view-title"></span>
                    </div>
                    
                    <div class="word-frequency-controls">
                        <button id="refresh-word-freq" class="btn btn-primary">Refresh Analysis</button>
                        <div class="display-options">
                            <label>
                                <input type="checkbox" id="show-chart" checked> Show Chart
                            </label>
                            <label>
                                Display Top: 
                                <select id="word-limit">
                                    <option value="25">25 words</option>
                                    <option value="50" selected>50 words</option>
                                    <option value="100">100 words</option>
                                    <option value="200">200 words</option>
                                    <option value="all">All words</option>
                                </select>
                            </label>
                            <label>
                                Min word length: 
                                <select id="min-length">
                                    <option value="1">1 character</option>
                                    <option value="2">2 characters</option>
                                    <option value="3" selected>3 characters</option>
                                    <option value="4">4 characters</option>
                                    <option value="5">5 characters</option>
                                </select>
                            </label>
                        </div>
                    </div>
                    
                    <div class="word-frequency-stats" id="word-freq-stats">
                        <!-- Statistics will be populated here -->
                    </div>
                    
                    <div class="word-frequency-chart-container" id="chart-container">
                        <div class="chart-header">
                            <h3>Top 20 Most Frequent Words</h3>
                            <button id="expand-chart" class="expand-button" title="Expand chart to full view">⛶</button>
                        </div>
                        <canvas id="word-frequency-chart"></canvas>
                    </div>
                    
                    <div class="word-frequency-table-container" id="table-container">
                        <div class="table-header">
                            <h3>Word Frequency Table</h3>
                            <button id="expand-table" class="expand-button" title="Expand table to full view">⛶</button>
                        </div>
                        <table class="word-frequency-table" id="word-freq-table">
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Word</th>
                                    <th>Count</th>
                                    <th>Percentage</th>
                                </tr>
                            </thead>
                            <tbody>
                                <!-- Table rows will be populated here -->
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div class="error-message" id="word-freq-error" style="display: none;">
                    <!-- Error messages will be shown here -->
                </div>
            </div>
        `;
        
        // Assemble modal
        modalContent.appendChild(modalHeader);
        modalContent.appendChild(modalBody);
        modalElement.appendChild(modalContent);
        
        // Add to document
        document.body.appendChild(modalElement);
        
        // Set up event listeners
        setupEventListeners();
    }
    
    /**
     * Sets up event listeners for the word frequency UI
     */
    function setupEventListeners() {
        // Refresh button
        const refreshButton = modalElement.querySelector('#refresh-word-freq');
        if (refreshButton) {
            refreshButton.addEventListener('click', loadWordFrequencyData);
        }
        
        // Display option controls
        const showChartCheckbox = modalElement.querySelector('#show-chart');
        const wordLimitSelect = modalElement.querySelector('#word-limit');
        const minLengthSelect = modalElement.querySelector('#min-length');
        
        if (showChartCheckbox) {
            showChartCheckbox.addEventListener('change', updateDisplay);
        }
        
        if (wordLimitSelect) {
            wordLimitSelect.addEventListener('change', updateDisplay);
        }
        
        if (minLengthSelect) {
            minLengthSelect.addEventListener('change', updateDisplay);
        }
        
        // Expand buttons
        const expandChartButton = modalElement.querySelector('#expand-chart');
        const expandTableButton = modalElement.querySelector('#expand-table');
        const backToOverviewButton = modalElement.querySelector('#back-to-overview');
        
        if (expandChartButton) {
            expandChartButton.addEventListener('click', () => switchView('chart-expanded'));
        }
        
        if (expandTableButton) {
            expandTableButton.addEventListener('click', () => switchView('table-expanded'));
        }
        
        if (backToOverviewButton) {
            backToOverviewButton.addEventListener('click', () => switchView('overview'));
        }
        
        // Close modal when clicking outside
        modalElement.addEventListener('click', (e) => {
            if (e.target === modalElement) {
                closeModal();
            }
        });
    }
    
    /**
     * Switches between different view modes
     */
    function switchView(newView) {
        currentView = newView;
        
        const navElement = modalElement.querySelector('#word-freq-nav');
        const statsElement = modalElement.querySelector('#word-freq-stats');
        const controlsElement = modalElement.querySelector('.word-frequency-controls');
        const chartContainer = modalElement.querySelector('#chart-container');
        const tableContainer = modalElement.querySelector('#table-container');
        const currentViewTitle = modalElement.querySelector('#current-view-title');
        
        // Reset all containers to default state
        chartContainer.classList.remove('expanded');
        tableContainer.classList.remove('expanded');
        
        switch (newView) {
            case 'overview':
                navElement.style.display = 'none';
                statsElement.style.display = 'block';
                controlsElement.style.display = 'flex';
                chartContainer.style.display = modalElement.querySelector('#show-chart').checked ? 'block' : 'none';
                tableContainer.style.display = 'block';
                break;
                
            case 'chart-expanded':
                navElement.style.display = 'flex';
                statsElement.style.display = 'none';
                controlsElement.style.display = 'none';
                chartContainer.style.display = 'block';
                chartContainer.classList.add('expanded');
                tableContainer.style.display = 'none';
                currentViewTitle.textContent = 'Chart View';
                
                // Recreate chart for expanded view
                setTimeout(() => {
                    const minLength = parseInt(modalElement.querySelector('#min-length').value);
                    const filteredData = wordFrequencyData.filter(item => item.stem.length >= minLength);
                    updateChart(filteredData.slice(0, 50)); // Show more words in expanded view
                }, 100);
                break;
                
            case 'table-expanded':
                navElement.style.display = 'flex';
                statsElement.style.display = 'none';
                controlsElement.style.display = 'none';
                chartContainer.style.display = 'none';
                tableContainer.style.display = 'block';
                tableContainer.classList.add('expanded');
                currentViewTitle.textContent = 'Table View';
                break;
        }
    }
    
    /**
     * Opens the word frequency modal
     */
    function openModal() {
        if (!modalElement) {
            console.error('Modal element not initialized');
            return;
        }
        
        modalElement.style.display = 'flex';
        currentView = 'overview';
        
        // Load data when opening
        loadWordFrequencyData();
    }
    
    /**
     * Closes the modal
     */
    function closeModal() {
        if (modalElement) {
            modalElement.style.display = 'none';
            currentView = 'overview';
            
            // Destroy chart if it exists
            if (currentChart) {
                currentChart.destroy();
                currentChart = null;
            }
        }
    }
    
    /**
     * Loads word frequency data from the server
     */
    async function loadWordFrequencyData() {
        try {
            // Show loading indicator
            showLoading();
            
            const response = await fetch('/api/word-frequency');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            wordFrequencyData = await response.json();
            
            // Hide loading and show content
            hideLoading();
            
            // Display the data
            updateDisplay();
            
        } catch (error) {
            console.error('Error loading word frequency data:', error);
            showError(`Failed to load word frequency data: ${error.message}`);
        }
    }
    
    /**
     * Updates the display based on current filters and options
     */
    function updateDisplay() {
        if (!wordFrequencyData || wordFrequencyData.length === 0) {
            showError('No word frequency data available');
            return;
        }
        
        try {
            // Get current filter settings
            const minLength = parseInt(modalElement.querySelector('#min-length').value);
            const wordLimit = modalElement.querySelector('#word-limit').value;
            const showChart = modalElement.querySelector('#show-chart').checked;
            
            // Filter data based on minimum stem length
            let filteredData = wordFrequencyData.filter(item => item.stem.length >= minLength);
            
            // Limit number of words if not "all"
            if (wordLimit !== 'all') {
                filteredData = filteredData.slice(0, parseInt(wordLimit));
            }
            
            // Update statistics
            updateStatistics(filteredData);
            
            // Update table
            updateTable(filteredData);
            
            // Update chart
            if (showChart && currentView !== 'table-expanded') {
                const chartData = currentView === 'chart-expanded' ? 
                    filteredData.slice(0, 50) : // More words in expanded view
                    filteredData.slice(0, 20);  // Standard view
                updateChart(chartData);
                modalElement.querySelector('#chart-container').style.display = 'block';
            } else if (currentView !== 'chart-expanded') {
                modalElement.querySelector('#chart-container').style.display = 'none';
                if (currentChart) {
                    currentChart.destroy();
                    currentChart = null;
                }
            }
            
        } catch (error) {
            console.error('Error updating display:', error);
            showError(`Error updating display: ${error.message}`);
        }
    }
    
    /**
     * Updates the statistics display
     */
    function updateStatistics(data) {
        const statsContainer = modalElement.querySelector('#word-freq-stats');
        if (!statsContainer) return;
        
        const totalWords = data.reduce((sum, item) => sum + item.count, 0);
        const uniqueStems = data.length;
        const totalUniqueStems = wordFrequencyData.length;
        
        statsContainer.innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-value">${totalWords.toLocaleString()}</div>
                    <div class="stat-label">Total Occurrences (filtered)</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${uniqueStems.toLocaleString()}</div>
                    <div class="stat-label">Unique Stems (filtered)</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${totalUniqueStems.toLocaleString()}</div>
                    <div class="stat-label">Total Unique Stems</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${data.length > 0 ? data[0].stem : 'N/A'}</div>
                    <div class="stat-label">Most Frequent Stem</div>
                </div>
            </div>
        `;
    }
    
    /**
     * Updates the word frequency table
     */
    function updateTable(data) {
        const tableBody = modalElement.querySelector('#word-freq-table tbody');
        if (!tableBody) return;
        
        const totalWords = data.reduce((sum, item) => sum + item.count, 0);
        
        tableBody.innerHTML = '';
        
        data.forEach((item, index) => {
            const row = document.createElement('tr');
            const percentage = ((item.count / totalWords) * 100).toFixed(2);
            
            row.innerHTML = `
                <td>${index + 1}</td>
                <td class="word-cell" style="cursor: pointer;" title="Click to see original forms">${item.stem}</td>
                <td class="count-cell">${item.count.toLocaleString()}</td>
                <td class="percentage-cell">${percentage}%</td>
            `;
            
            // Add click handler to show word forms
            const wordCell = row.querySelector('.word-cell');
            wordCell.addEventListener('click', () => {
                showWordForms(item.stem, item.forms);
            });
            
            tableBody.appendChild(row);
        });
    }
    
    /**
     * Updates the word frequency chart
     */
    function updateChart(data) {
        const canvas = modalElement.querySelector('#word-frequency-chart');
        if (!canvas) return;
        
        // Destroy existing chart
        if (currentChart) {
            currentChart.destroy();
        }
        
        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js not available, skipping chart display');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        
        const isExpanded = currentView === 'chart-expanded';
        
        currentChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(item => item.stem),
                datasets: [{
                    label: 'Stem Frequency',
                    data: data.map(item => item.count),
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Frequency'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Word Stems'
                        },
                        ticks: {
                            maxRotation: isExpanded ? 45 : 45,
                            minRotation: isExpanded ? 45 : 45,
                            font: {
                                size: isExpanded ? 12 : 10
                            }
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: isExpanded ? `Top ${data.length} Most Frequent Stems` : 'Top 20 Most Frequent Stems',
                        font: {
                            size: isExpanded ? 18 : 14
                        }
                    },
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
    
    /**
     * Shows the loading indicator
     */
    function showLoading() {
        const loading = modalElement.querySelector('#word-freq-loading');
        const content = modalElement.querySelector('#word-freq-content');
        const error = modalElement.querySelector('#word-freq-error');
        
        if (loading) loading.style.display = 'block';
        if (content) content.style.display = 'none';
        if (error) error.style.display = 'none';
    }
    
    /**
     * Hides the loading indicator and shows content
     */
    function hideLoading() {
        const loading = modalElement.querySelector('#word-freq-loading');
        const content = modalElement.querySelector('#word-freq-content');
        const error = modalElement.querySelector('#word-freq-error');
        
        if (loading) loading.style.display = 'none';
        if (content) content.style.display = 'block';
        if (error) error.style.display = 'none';
        
        // Ensure we're in overview mode when content loads
        switchView('overview');
    }
    
    /**
     * Shows an error message
     */
    function showError(message) {
        const loading = modalElement.querySelector('#word-freq-loading');
        const content = modalElement.querySelector('#word-freq-content');
        const error = modalElement.querySelector('#word-freq-error');
        
        if (loading) loading.style.display = 'none';
        if (content) content.style.display = 'none';
        if (error) {
            error.style.display = 'block';
            error.innerHTML = `
                <p>${message}</p>
                <button id="retry-word-freq" class="btn btn-primary">Retry</button>
            `;
            
            // Add retry functionality
            const retryButton = error.querySelector('#retry-word-freq');
            if (retryButton) {
                retryButton.addEventListener('click', loadWordFrequencyData);
            }
        }
    }
    
    /**
     * Shows the original forms of a stemmed word
     */
    function showWordForms(stem, forms) {
        let formsHtml = `<div style="max-height: 300px; overflow-y: auto;">`;
        formsHtml += `<h4>Original forms for "${stem}":</h4>`;
        formsHtml += `<table style="width: 100%; border-collapse: collapse;">`;
        formsHtml += `<thead><tr><th style="border: 1px solid #ddd; padding: 8px;">Word</th><th style="border: 1px solid #ddd; padding: 8px;">Count</th></tr></thead>`;
        formsHtml += `<tbody>`;
        
        // Sort forms by count descending
        const sortedForms = Object.entries(forms).sort((a, b) => b[1] - a[1]);
        
        for (const [form, count] of sortedForms) {
            formsHtml += `<tr><td style="border: 1px solid #ddd; padding: 8px;">${form}</td><td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${count}</td></tr>`;
        }
        
        formsHtml += `</tbody></table></div>`;
        
        // Create a simple modal-like overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: white;
            padding: 20px;
            border-radius: 8px;
            max-width: 500px;
            max-height: 80vh;
            overflow: auto;
            position: relative;
        `