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
                        <canvas id="word-frequency-chart"></canvas>
                    </div>
                    
                    <div class="word-frequency-table-container">
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
        
        // Close modal when clicking outside
        modalElement.addEventListener('click', (e) => {
            if (e.target === modalElement) {
                closeModal();
            }
        });
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
        
        // Load data when opening
        loadWordFrequencyData();
    }
    
    /**
     * Closes the modal
     */
    function closeModal() {
        if (modalElement) {
            modalElement.style.display = 'none';
            
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
            
            // Filter data based on minimum length
            let filteredData = wordFrequencyData.filter(item => item.word.length >= minLength);
            
            // Limit number of words if not "all"
            if (wordLimit !== 'all') {
                filteredData = filteredData.slice(0, parseInt(wordLimit));
            }
            
            // Update statistics
            updateStatistics(filteredData);
            
            // Update table
            updateTable(filteredData);
            
            // Update chart
            if (showChart) {
                updateChart(filteredData.slice(0, 20)); // Show top 20 in chart
                modalElement.querySelector('#chart-container').style.display = 'block';
            } else {
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
        const uniqueWords = data.length;
        const totalUniqueWords = wordFrequencyData.length;
        
        statsContainer.innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-value">${totalWords.toLocaleString()}</div>
                    <div class="stat-label">Total Words (filtered)</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${uniqueWords.toLocaleString()}</div>
                    <div class="stat-label">Unique Words (filtered)</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${totalUniqueWords.toLocaleString()}</div>
                    <div class="stat-label">Total Unique Words</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${data.length > 0 ? data[0].word : 'N/A'}</div>
                    <div class="stat-label">Most Frequent Word</div>
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
                <td class="word-cell">${item.word}</td>
                <td class="count-cell">${item.count.toLocaleString()}</td>
                <td class="percentage-cell">${percentage}%</td>
            `;
            
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
        
        currentChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(item => item.word),
                datasets: [{
                    label: 'Word Frequency',
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
                            text: 'Words'
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Top 20 Most Frequent Words'
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
    
    // Public API
    return {
        initialize,
        openModal,
        closeModal
    };
})();

// Export to global scope
window.WordFrequencyManager = WordFrequencyManager;