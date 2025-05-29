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
                            <h3>Top 20 Most Frequent Stems</h3>
                            <button id="expand-chart" class="expand-button" title="Expand chart to full view">⛶</button>
                        </div>
                        <canvas id="word-frequency-chart"></canvas>
                    </div>
                    
                    <div class="word-frequency-table-container" id="table-container">
                        <div class="table-header">
                            <h3>Word Stem Frequency Table</h3>
                            <button id="expand-table" class="expand-button" title="Expand table to full view">⛶</button>
                        </div>
                        <table class="word-frequency-table" id="word-freq-table">
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Stem</th>
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
            
            const customGroupIndicator = item.isCustomGroup ? ' <span style="color: #28a745; font-weight: bold;">✓</span>' : '';
            
            row.innerHTML = `
                <td>${index + 1}</td>
                <td class="word-cell" style="cursor: pointer;" title="Click to see original forms">${item.stem}${customGroupIndicator}</td>
                <td class="count-cell">${item.count.toLocaleString()}</td>
                <td class="percentage-cell">${percentage}%</td>
            `;
            
            // Add click handler to show word forms
            const wordCell = row.querySelector('.word-cell');
            wordCell.addEventListener('click', () => {
                showWordForms(item.stem, item.forms, item.isCustomGroup);
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
     * Shows the original forms of a stemmed word with editing capabilities
     */
    function showWordForms(stem, forms, isCustomGroup = false) {
        let formsHtml = `<div style="max-height: 400px; overflow-y: auto;">`;
        formsHtml += `<h4>Original forms for "${stem}":</h4>`;
        
        if (isCustomGroup) {
            formsHtml += `<p style="color: #28a745; font-size: 12px; margin: 5px 0;"><strong>✓ Custom Group</strong></p>`;
        }
        
        formsHtml += `<table style="width: 100%; border-collapse: collapse;">`;
        formsHtml += `<thead><tr><th style="border: 1px solid #ddd; padding: 8px;">Word</th><th style="border: 1px solid #ddd; padding: 8px;">Count</th></tr></thead>`;
        formsHtml += `<tbody>`;
        
        // Sort forms by count descending
        const sortedForms = Object.entries(forms).sort((a, b) => b[1] - a[1]);
        
        for (const [form, count] of sortedForms) {
            formsHtml += `<tr><td style="border: 1px solid #ddd; padding: 8px;">${form}</td><td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${count}</td></tr>`;
        }
        
        formsHtml += `</tbody></table>`;
        
        // Add action buttons
        formsHtml += `<div style="margin-top: 15px; text-align: center;">`;
        if (isCustomGroup) {
            formsHtml += `<button id="edit-word-group" style="margin: 5px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Edit Group</button>`;
        } else {
            formsHtml += `<button id="create-word-group" style="margin: 5px; padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">Create Custom Group</button>`;
        }
        formsHtml += `<button id="manage-all-groups" style="margin: 5px; padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Manage All Groups</button>`;
        formsHtml += `</div>`;
        
        formsHtml += `</div>`;
        
        // Create modal (same as before)
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
            max-width: 600px;
            max-height: 80vh;
            overflow: auto;
            position: relative;
        `;
        
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '×';
        closeButton.style.cssText = `
            position: absolute;
            top: 10px;
            right: 15px;
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #999;
        `;
        
        closeButton.addEventListener('click', () => {
            document.body.removeChild(overlay);
        });
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
            }
        });
        
        modal.innerHTML = formsHtml;
        modal.appendChild(closeButton);
        
        // Add event listeners for buttons
        const createGroupBtn = modal.querySelector('#create-word-group');
        const editGroupBtn = modal.querySelector('#edit-word-group');
        const manageAllBtn = modal.querySelector('#manage-all-groups');
        
        if (createGroupBtn) {
            createGroupBtn.addEventListener('click', () => {
                document.body.removeChild(overlay);
                openCreateGroupModal(stem, Object.keys(forms));
            });
        }
        
        if (editGroupBtn) {
            editGroupBtn.addEventListener('click', () => {
                document.body.removeChild(overlay);
                openEditGroupModal(stem, Object.keys(forms));
            });
        }
        
        if (manageAllBtn) {
            manageAllBtn.addEventListener('click', () => {
                document.body.removeChild(overlay);
                openWordGroupsManager();
            });
        }
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    }
    
    /**
     * Opens the create group modal
     */
    function openCreateGroupModal(suggestedName, words) {
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
            z-index: 10001;
        `;
        
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: white;
            padding: 20px;
            border-radius: 8px;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow: auto;
            position: relative;
        `;
        
        modal.innerHTML = `
            <h3>Create Custom Word Group</h3>
            <form id="create-group-form">
                <div style="margin-bottom: 15px;">
                    <label for="group-display-name" style="display: block; margin-bottom: 5px; font-weight: bold;">Display Name:</label>
                    <input type="text" id="group-display-name" value="${suggestedName}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" required>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label for="group-name" style="display: block; margin-bottom: 5px; font-weight: bold;">Internal Name:</label>
                    <input type="text" id="group-name" value="${suggestedName.toLowerCase().replace(/[^a-z0-9]/g, '_')}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" required>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label for="group-description" style="display: block; margin-bottom: 5px; font-weight: bold;">Description (optional):</label>
                    <textarea id="group-description" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; height: 60px;" placeholder="Describe what this group represents..."></textarea>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Words in this group:</label>
                    <div id="words-container" style="border: 1px solid #ddd; border-radius: 4px; padding: 10px; min-height: 100px; background: #f9f9f9;">
                        ${words.map(word => `
                            <span class="word-tag" style="display: inline-block; background: #007bff; color: white; padding: 4px 8px; margin: 2px; border-radius: 3px; font-size: 12px;">
                                ${word}
                                <button type="button" onclick="this.parentElement.remove()" style="background: none; border: none; color: white; margin-left: 5px; cursor: pointer;">×</button>
                            </span>
                        `).join('')}
                    </div>
                    <div style="margin-top: 5px;">
                        <input type="text" id="new-word-input" placeholder="Add more words..." style="padding: 6px; border: 1px solid #ddd; border-radius: 4px; margin-right: 5px;">
                        <button type="button" id="add-word-btn" style="padding: 6px 12px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">Add</button>
                    </div>
                </div>
                
                <div style="text-align: center; margin-top: 20px;">
                    <button type="submit" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">Create Group</button>
                    <button type="button" id="cancel-create" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
                </div>
            </form>
        `;
        
        // Close button
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '×';
        closeButton.style.cssText = `
            position: absolute;
            top: 10px;
            right: 15px;
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #999;
        `;
        closeButton.addEventListener('click', () => document.body.removeChild(overlay));
        modal.appendChild(closeButton);
        
        // Add word functionality
        const newWordInput = modal.querySelector('#new-word-input');
        const addWordBtn = modal.querySelector('#add-word-btn');
        const wordsContainer = modal.querySelector('#words-container');
        
        function addWord() {
            const word = newWordInput.value.trim();
            if (word) {
                const wordTag = document.createElement('span');
                wordTag.className = 'word-tag';
                wordTag.style.cssText = 'display: inline-block; background: #007bff; color: white; padding: 4px 8px; margin: 2px; border-radius: 3px; font-size: 12px;';
                wordTag.innerHTML = `
                    ${word}
                    <button type="button" onclick="this.parentElement.remove()" style="background: none; border: none; color: white; margin-left: 5px; cursor: pointer;">×</button>
                `;
                wordsContainer.appendChild(wordTag);
                newWordInput.value = '';
            }
        }
        
        addWordBtn.addEventListener('click', addWord);
        newWordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addWord();
            }
        });
        
        // Form submission
        modal.querySelector('#create-group-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const displayName = modal.querySelector('#group-display-name').value.trim();
            const name = modal.querySelector('#group-name').value.trim();
            const description = modal.querySelector('#group-description').value.trim();
            const wordTags = modal.querySelectorAll('.word-tag');
            const groupWords = Array.from(wordTags).map(tag => tag.textContent.replace('×', '').trim());
            
            try {
                const response = await fetch('/api/word-groups', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name,
                        display_name: displayName,
                        description,
                        words: groupWords
                    })
                });
                
                if (response.ok) {
                    alert('Word group created successfully!');
                    document.body.removeChild(overlay);
                    // Refresh the word frequency analysis
                    loadWordFrequencyData();
                } else {
                    const error = await response.json();
                    alert(`Error creating group: ${error.error}`);
                }
            } catch (error) {
                console.error('Error creating word group:', error);
                alert('Failed to create word group');
            }
        });
        
        // Cancel button
        modal.querySelector('#cancel-create').addEventListener('click', () => {
            document.body.removeChild(overlay);
        });
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Focus on the display name input
        setTimeout(() => modal.querySelector('#group-display-name').focus(), 100);
    }
    
    /**
     * Opens the edit group modal
     */
    async function openEditGroupModal(stem, words) {
        try {
            // First, find the group that contains this stem
            const response = await fetch('/api/word-groups');
            const groups = await response.json();
            
            const group = groups.find(g => g.display_name === stem || g.name === stem);
            if (!group) {
                alert('Group not found');
                return;
            }
            
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
                z-index: 10001;
            `;
            
            const modal = document.createElement('div');
            modal.style.cssText = `
                background: white;
                padding: 20px;
                border-radius: 8px;
                max-width: 600px;
                width: 90%;
                max-height: 80vh;
                overflow: auto;
                position: relative;
            `;
            
            modal.innerHTML = `
                <h3>Edit Word Group</h3>
                <form id="edit-group-form">
                    <div style="margin-bottom: 15px;">
                        <label for="edit-group-display-name" style="display: block; margin-bottom: 5px; font-weight: bold;">Display Name:</label>
                        <input type="text" id="edit-group-display-name" value="${group.display_name}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" required>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label for="edit-group-name" style="display: block; margin-bottom: 5px; font-weight: bold;">Internal Name:</label>
                        <input type="text" id="edit-group-name" value="${group.name}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" required>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label for="edit-group-description" style="display: block; margin-bottom: 5px; font-weight: bold;">Description (optional):</label>
                        <textarea id="edit-group-description" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; height: 60px;" placeholder="Describe what this group represents...">${group.description || ''}</textarea>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Words in this group:</label>
                        <div id="edit-words-container" style="border: 1px solid #ddd; border-radius: 4px; padding: 10px; min-height: 100px; background: #f9f9f9;">
                            ${group.words.map(word => `
                                <span class="word-tag" style="display: inline-block; background: #007bff; color: white; padding: 4px 8px; margin: 2px; border-radius: 3px; font-size: 12px;">
                                    ${word}
                                    <button type="button" onclick="this.parentElement.remove()" style="background: none; border: none; color: white; margin-left: 5px; cursor: pointer;">×</button>
                                </span>
                            `).join('')}
                        </div>
                        <div style="margin-top: 5px;">
                            <input type="text" id="edit-new-word-input" placeholder="Add more words..." style="padding: 6px; border: 1px solid #ddd; border-radius: 4px; margin-right: 5px;">
                            <button type="button" id="edit-add-word-btn" style="padding: 6px 12px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">Add</button>
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin-top: 20px;">
                        <button type="submit" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">Update Group</button>
                        <button type="button" id="delete-group" style="padding: 10px 20px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">Delete Group</button>
                        <button type="button" id="cancel-edit" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
                    </div>
                </form>
            `;
            
            // Close button
            const closeButton = document.createElement('button');
            closeButton.innerHTML = '×';
            closeButton.style.cssText = `
                position: absolute;
                top: 10px;
                right: 15px;
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #999;
            `;
            closeButton.addEventListener('click', () => document.body.removeChild(overlay));
            modal.appendChild(closeButton);
            
            // Add word functionality
            const newWordInput = modal.querySelector('#edit-new-word-input');
            const addWordBtn = modal.querySelector('#edit-add-word-btn');
            const wordsContainer = modal.querySelector('#edit-words-container');
            
            function addWord() {
                const word = newWordInput.value.trim();
                if (word) {
                    const wordTag = document.createElement('span');
                    wordTag.className = 'word-tag';
                    wordTag.style.cssText = 'display: inline-block; background: #007bff; color: white; padding: 4px 8px; margin: 2px; border-radius: 3px; font-size: 12px;';
                    wordTag.innerHTML = `
                        ${word}
                        <button type="button" onclick="this.parentElement.remove()" style="background: none; border: none; color: white; margin-left: 5px; cursor: pointer;">×</button>
                    `;
                    wordsContainer.appendChild(wordTag);
                    newWordInput.value = '';
                }
            }
            
            addWordBtn.addEventListener('click', addWord);
            newWordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    addWord();
                }
            });
            
            // Form submission
            modal.querySelector('#edit-group-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const displayName = modal.querySelector('#edit-group-display-name').value.trim();
                const name = modal.querySelector('#edit-group-name').value.trim();
                const description = modal.querySelector('#edit-group-description').value.trim();
                const wordTags = modal.querySelectorAll('.word-tag');
                const groupWords = Array.from(wordTags).map(tag => tag.textContent.replace('×', '').trim());
                
                try {
                    const response = await fetch(`/api/word-groups/${group.id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            name,
                            display_name: displayName,
                            description,
                            words: groupWords
                        })
                    });
                    
                    if (response.ok) {
                        alert('Word group updated successfully!');
                        document.body.removeChild(overlay);
                        // Refresh the word frequency analysis
                        loadWordFrequencyData();
                    } else {
                        const error = await response.json();
                        alert(`Error updating group: ${error.error}`);
                    }
                } catch (error) {
                    console.error('Error updating word group:', error);
                    alert('Failed to update word group');
                }
            });
            
            // Delete button
            modal.querySelector('#delete-group').addEventListener('click', async () => {
                if (confirm(`Are you sure you want to delete the word group "${group.display_name}"?`)) {
                    try {
                        const response = await fetch(`/api/word-groups/${group.id}`, {
                            method: 'DELETE'
                        });
                        
                        if (response.ok) {
                            alert('Word group deleted successfully!');
                            document.body.removeChild(overlay);
                            // Refresh the word frequency analysis
                            loadWordFrequencyData();
                        } else {
                            alert('Failed to delete word group');
                        }
                    } catch (error) {
                        console.error('Error deleting word group:', error);
                        alert('Failed to delete word group');
                    }
                }
            });
            
            // Cancel button
            modal.querySelector('#cancel-edit').addEventListener('click', () => {
                document.body.removeChild(overlay);
            });
            
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            
            // Focus on the display name input
            setTimeout(() => modal.querySelector('#edit-group-display-name').focus(), 100);
            
        } catch (error) {
            console.error('Error loading group for editing:', error);
            alert('Failed to load group information');
        }
    }
    
    /**
     * Opens the word groups manager
     */
    async function openWordGroupsManager() {
        try {
            const response = await fetch('/api/word-groups');
            const groups = await response.json();
            
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
                z-index: 10001;
            `;
            
            const modal = document.createElement('div');
            modal.style.cssText = `
                background: white;
                padding: 20px;
                border-radius: 8px;
                max-width: 800px;
                width: 90%;
                max-height: 80vh;
                overflow: auto;
                position: relative;
            `;
            
            let groupsHtml = `
                <h3>Word Groups Manager</h3>
                <div style="margin-bottom: 15px;">
                    <button id="create-new-group" style="padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">Create New Group</button>
                </div>
            `;
            
            if (groups.length === 0) {
                groupsHtml += '<p>No word groups created yet.</p>';
            } else {
                groupsHtml += `
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f8f9fa;">
                                <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Display Name</th>
                                <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Words</th>
                                <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                `;
                
                groups.forEach(group => {
                    const wordsPreview = group.words.slice(0, 5).join(', ') + (group.words.length > 5 ? `... (+${group.words.length - 5} more)` : '');
                    groupsHtml += `
                        <tr>
                            <td style="border: 1px solid #ddd; padding: 12px; font-weight: bold;">${group.display_name}</td>
                            <td style="border: 1px solid #ddd; padding: 12px; font-family: monospace; font-size: 12px;">${wordsPreview}</td>
                            <td style="border: 1px solid #ddd; padding: 12px;">
                                <button onclick="editGroup('${group.id}')" style="padding: 4px 8px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer; margin-right: 5px; font-size: 12px;">Edit</button>
                                <button onclick="deleteGroup('${group.id}', '${group.display_name}')" style="padding: 4px 8px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px;">Delete</button>
                            </td>
                        </tr>
                    `;
                });
                
                groupsHtml += '</tbody></table>';
            }
            
            modal.innerHTML = groupsHtml;
            
            // Close button
            const closeButton = document.createElement('button');
            closeButton.innerHTML = '×';
            closeButton.style.cssText = `
                position: absolute;
                top: 10px;
                right: 15px;
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #999;
            `;
            closeButton.addEventListener('click', () => document.body.removeChild(overlay));
            modal.appendChild(closeButton);
            
            // Create new group button
            const createNewGroupBtn = modal.querySelector('#create-new-group');
            if (createNewGroupBtn) {
                createNewGroupBtn.addEventListener('click', () => {
                    document.body.removeChild(overlay);
                    openCreateGroupModal('New Group', []);
                });
            }
            
            // Add global functions for edit and delete (temporary)
            window.editGroup = async (groupId) => {
                const group = groups.find(g => g.id === groupId);
                if (group) {
                    document.body.removeChild(overlay);
                    openEditGroupModal(group.display_name, group.words);
                }
            };
            
            window.deleteGroup = async (groupId, groupName) => {
                if (confirm(`Are you sure you want to delete the word group "${groupName}"?`)) {
                    try {
                        const response = await fetch(`/api/word-groups/${groupId}`, {
                            method: 'DELETE'
                        });
                        
                        if (response.ok) {
                            alert('Word group deleted successfully!');
                            document.body.removeChild(overlay);
                            loadWordFrequencyData();
                        } else {
                            alert('Failed to delete word group');
                        }
                    } catch (error) {
                        console.error('Error deleting word group:', error);
                        alert('Failed to delete word group');
                    }
                }
            };
            
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            
        } catch (error) {
            console.error('Error loading word groups:', error);
            alert('Failed to load word groups');
        }
    }
    
    // Public API
    return {
        initialize,
        openModal,
        closeModal
    };
})();

// Export to global scope
window.WordFrequencyManager = WordFrequencyManager;