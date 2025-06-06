/**
 * Task Statistics Manager Module
 * Handles task statistics analysis and visualization
 */
const TaskStatisticsManager = (function() {
    let isInitialized = false;
    let statisticsModal = null;
    let currentFilters = {
        days: 7,
        category: null,
        startDate: null,
        endDate: null
    };
    
    /**
     * Initialize the Task Statistics Manager
     */
    function initialize() {
        if (isInitialized) return;
        
        createStatisticsModal();
        isInitialized = true;
        console.log('TaskStatisticsManager initialized');
    }
    
    /**
     * Create the statistics modal UI
     */
    function createStatisticsModal() {
        // Create modal overlay
        statisticsModal = document.createElement('div');
        statisticsModal.className = 'task-statistics-modal-overlay';
        statisticsModal.style.display = 'none';
        
        // Create modal container
        const modal = document.createElement('div');
        modal.className = 'task-statistics-modal';
        
        // Modal header
        const header = document.createElement('div');
        header.className = 'task-statistics-header';
        header.innerHTML = `
            <h2>📊 Task Statistics & Analysis</h2>
            <button class="task-statistics-close-btn">&times;</button>
        `;
        
        // Modal content
        const content = document.createElement('div');
        content.className = 'task-statistics-content';
        content.innerHTML = `
            <div class="task-statistics-filters">
                <div class="filter-group">
                    <label>Time Period:</label>
                    <select id="task-stats-period">
                        <option value="7">Last 7 days</option>
                        <option value="30">Last 30 days</option>
                        <option value="90">Last 90 days</option>
                        <option value="custom">Custom range</option>
                    </select>
                </div>
                
                <div class="filter-group" id="custom-date-range" style="display: none;">
                    <label>From:</label>
                    <input type="date" id="task-stats-start-date">
                    <label>To:</label>
                    <input type="date" id="task-stats-end-date">
                </div>
                
                <div class="filter-group">
                    <label>Category:</label>
                    <select id="task-stats-category">
                        <option value="">All categories</option>
                    </select>
                </div>
                
                <button id="task-stats-refresh" class="task-stats-button">Refresh</button>
            </div>
            
            <div class="task-statistics-tabs">
                <button class="tab-button active" data-tab="overview">Overview</button>
                <button class="tab-button" data-tab="task-groups">Task Groups</button>
                <button class="tab-button" data-tab="categories">Categories</button>
                <button class="tab-button" data-tab="daily">Daily Trends</button>
                <button class="tab-button" data-tab="manage">Manage Categories</button>
            </div>
            
            <div class="task-statistics-panels">
                <div class="tab-panel active" id="overview-panel">
                    <div class="stats-overview-cards">
                        <div class="stats-card">
                            <div class="stats-card-title">Total Tasks</div>
                            <div class="stats-card-value" id="total-tasks">-</div>
                        </div>
                        <div class="stats-card">
                            <div class="stats-card-title">Total Time</div>
                            <div class="stats-card-value" id="total-time">-</div>
                        </div>
                        <div class="stats-card">
                            <div class="stats-card-title">Completed</div>
                            <div class="stats-card-value" id="completed-tasks">-</div>
                        </div>
                        <div class="stats-card">
                            <div class="stats-card-title">Avg Task Time</div>
                            <div class="stats-card-value" id="avg-task-time">-</div>
                        </div>
                        <div class="stats-card">
                            <div class="stats-card-title">Active Days</div>
                            <div class="stats-card-value" id="active-days">-</div>
                        </div>
                    </div>
                </div>
                
                <div class="tab-panel" id="task-groups-panel">
                    <div class="task-groups-list" id="task-groups-list">
                        <!-- Task groups will be populated here -->
                    </div>
                </div>
                
                <div class="tab-panel" id="categories-panel">
                    <div class="categories-chart" id="categories-chart">
                        <!-- Category chart will be populated here -->
                    </div>
                </div>
                
                <div class="tab-panel" id="daily-panel">
                    <div class="daily-chart-controls">
                        <div class="chart-type-selector">
                            <label>Chart Type:</label>
                            <select id="daily-chart-type">
                                <option value="line">Line Chart</option>
                                <option value="bar">Bar Chart</option>
                            </select>
                        </div>
                        <div class="daily-chart-metrics">
                            <label>Show:</label>
                            <select id="daily-chart-metric">
                                <option value="time">Total Time</option>
                                <option value="tasks">Task Count</option>
                                <option value="completed">Completed Tasks</option>
                            </select>
                        </div>
                    </div>
                    <div class="daily-chart" id="daily-chart">
                        <!-- Daily chart will be populated here -->
                    </div>
                </div>
                
                <div class="tab-panel" id="manage-panel">
                    <div class="category-manager">
                        <div class="category-creator">
                            <h3>Create New Category</h3>
                            <div class="category-form">
                                <input type="text" id="new-category-name" placeholder="Category name">
                                <input type="text" id="new-category-description" placeholder="Description (optional)">
                                <input type="color" id="new-category-color" value="#4285f4">
                                <button id="create-category-btn">Create</button>
                            </div>
                        </div>
                        <div class="categories-list" id="categories-manage-list">
                            <!-- Categories will be populated here -->
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        modal.appendChild(header);
        modal.appendChild(content);
        statisticsModal.appendChild(modal);
        document.body.appendChild(statisticsModal);
        
        setupEventListeners();
    }
    
    /**
     * Setup event listeners for the modal
     */
    function setupEventListeners() {
        // Close button
        statisticsModal.querySelector('.task-statistics-close-btn').addEventListener('click', close);
        
        // Click outside to close
        statisticsModal.addEventListener('click', (e) => {
            if (e.target === statisticsModal) {
                close();
            }
        });
        
        // Filter changes
        document.getElementById('task-stats-period').addEventListener('change', handlePeriodChange);
        document.getElementById('task-stats-category').addEventListener('change', handleCategoryChange);
        document.getElementById('task-stats-start-date').addEventListener('change', updateFilters);
        document.getElementById('task-stats-end-date').addEventListener('change', updateFilters);
        document.getElementById('task-stats-refresh').addEventListener('click', refreshStatistics);
        
        // Tab switching
        statisticsModal.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                switchTab(e.target.dataset.tab);
            });
        });
        
        // Category creation
        document.getElementById('create-category-btn').addEventListener('click', createCategory);
        
        // Enter key for category creation
        document.getElementById('new-category-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                createCategory();
            }
        });
        
        // Chart type and metric change handlers
        document.getElementById('daily-chart-type')?.addEventListener('change', () => {
            // Re-render the chart with current data
            if (window.currentDailyStats) {
                updateDailyChart(window.currentDailyStats);
            }
        });
        
        document.getElementById('daily-chart-metric')?.addEventListener('change', () => {
            // Re-render the chart with current data
            if (window.currentDailyStats) {
                updateDailyChart(window.currentDailyStats);
            }
        });
    }
    
    /**
     * Handle period change
     */
    function handlePeriodChange(e) {
        const period = e.target.value;
        const customRange = document.getElementById('custom-date-range');
        
        if (period === 'custom') {
            customRange.style.display = 'block';
            // Set default dates
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);
            
            document.getElementById('task-stats-start-date').value = startDate.toISOString().split('T')[0];
            document.getElementById('task-stats-end-date').value = endDate.toISOString().split('T')[0];
            
            currentFilters.days = null;
            currentFilters.startDate = startDate.toISOString().split('T')[0];
            currentFilters.endDate = endDate.toISOString().split('T')[0];
        } else {
            customRange.style.display = 'none';
            currentFilters.days = parseInt(period);
            currentFilters.startDate = null;
            currentFilters.endDate = null;
        }
        
        refreshStatistics();
    }
    
    /**
     * Handle category filter change
     */
    function handleCategoryChange(e) {
        currentFilters.category = e.target.value || null;
        refreshStatistics();
    }
    
    /**
     * Update filters from date inputs
     */
    function updateFilters() {
        const startDate = document.getElementById('task-stats-start-date').value;
        const endDate = document.getElementById('task-stats-end-date').value;
        
        currentFilters.startDate = startDate;
        currentFilters.endDate = endDate;
    }
    
    /**
     * Switch active tab
     */
    function switchTab(tabName) {
        // Update buttons
        statisticsModal.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        statisticsModal.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Update panels
        statisticsModal.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        statisticsModal.querySelector(`#${tabName}-panel`).classList.add('active');
        
        // Load data for specific tabs
        if (tabName === 'manage') {
            loadCategoriesForManagement();
        }
    }
    
    /**
     * Open the statistics modal
     */
    async function open() {
        if (!statisticsModal) {
            initialize();
        }
        
        statisticsModal.style.display = 'flex';
        
        // Load initial data
        await loadCategories();
        await refreshStatistics();
    }
    
    /**
     * Close the statistics modal
     */
    function close() {
        if (statisticsModal) {
            statisticsModal.style.display = 'none';
        }
    }
    
    /**
     * Load categories for the filter dropdown
     */
    async function loadCategories() {
        try {
            const response = await fetch('/api/tasks/categories');
            
            if (!response.ok) {
                console.error('Failed to load categories:', response.status, response.statusText);
                return;
            }
            
            const categories = await response.json();
            
            // Ensure categories is an array
            if (!Array.isArray(categories)) {
                console.error('Categories response is not an array:', categories);
                return;
            }
            
            const categorySelect = document.getElementById('task-stats-category');
            if (!categorySelect) {
                console.error('Category select element not found');
                return;
            }
            
            categorySelect.innerHTML = '<option value="">All categories</option>';
            
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.name;
                option.textContent = `${category.name} (${category.task_count || 0} tasks)`;
                categorySelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }
    
    /**
     * Refresh statistics data
     */
    async function refreshStatistics() {
        try {
            // Build query parameters
            const params = new URLSearchParams();
            if (currentFilters.days) params.append('days', currentFilters.days);
            if (currentFilters.category) params.append('category', currentFilters.category);
            if (currentFilters.startDate) params.append('startDate', currentFilters.startDate);
            if (currentFilters.endDate) params.append('endDate', currentFilters.endDate);
            
            const response = await fetch(`/api/tasks/statistics?${params}`);
            
            if (!response.ok) {
                console.error('Failed to load statistics:', response.status, response.statusText);
                return;
            }
            
            const data = await response.json();
            
            // Ensure data structure is correct
            const safeData = {
                overallStats: data.overallStats || {},
                taskGroups: Array.isArray(data.taskGroups) ? data.taskGroups : [],
                categoryStats: Array.isArray(data.categoryStats) ? data.categoryStats : [],
                dailyStats: Array.isArray(data.dailyStats) ? data.dailyStats : []
            };
            
            updateOverviewStats(safeData.overallStats);
            updateTaskGroups(safeData.taskGroups);
            updateCategoriesChart(safeData.categoryStats);
            updateDailyChart(safeData.dailyStats);
            
            window.currentDailyStats = safeData.dailyStats; // Store for chart re-rendering
            
        } catch (error) {
            console.error('Error refreshing statistics:', error);
        }
    }
    
    /**
     * Update overview statistics
     */
    function updateOverviewStats(stats) {
        document.getElementById('total-tasks').textContent = stats.total_tasks || 0;
        document.getElementById('total-time').textContent = formatDuration(stats.total_time || 0);
        document.getElementById('completed-tasks').textContent = `${stats.completed_tasks || 0} (${Math.round((stats.completed_tasks || 0) / (stats.total_tasks || 1) * 100)}%)`;
        document.getElementById('avg-task-time').textContent = formatDuration(stats.avg_task_time || 0);
        document.getElementById('active-days').textContent = stats.active_days || 0;
    }
    
    /**
     * Update task groups list
     */
    function updateTaskGroups(taskGroups) {
        const container = document.getElementById('task-groups-list');
        container.innerHTML = '';
        
        if (taskGroups.length === 0) {
            container.innerHTML = '<div class="no-data">No task groups found for the selected period.</div>';
            return;
        }
        
        taskGroups.forEach(group => {
            const groupElement = document.createElement('div');
            groupElement.className = 'task-group-item';
            groupElement.innerHTML = `
                <div class="task-group-header">
                    <h3>${group.base_name}</h3>
                    <div class="task-group-stats">
                        <span class="stat">${group.task_count} tasks</span>
                        <span class="stat">${formatDuration(group.total_time)}</span>
                        <span class="stat">${group.completed_count}/${group.task_count} completed</span>
                    </div>
                </div>
                <div class="task-group-details">
                    <div class="detail">Avg time: ${formatDuration(group.avg_time)}</div>
                    <div class="detail">Period: ${group.first_date} to ${group.last_date}</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${(group.completed_count / group.task_count) * 100}%"></div>
                    </div>
                </div>
            `;
            container.appendChild(groupElement);
        });
    }
    
    /**
     * Update categories chart
     */
    function updateCategoriesChart(categoryStats) {
        const container = document.getElementById('categories-chart');
        container.innerHTML = '';
        
        if (categoryStats.length === 0) {
            container.innerHTML = '<div class="no-data">No category data found for the selected period.</div>';
            return;
        }
        
        // Create a simple bar chart
        const maxTime = Math.max(...categoryStats.map(c => c.total_time));
        
        categoryStats.forEach(category => {
            const categoryElement = document.createElement('div');
            categoryElement.className = 'category-chart-item';
            
            const percentage = maxTime > 0 ? (category.total_time / maxTime) * 100 : 0;
            
            categoryElement.innerHTML = `
                <div class="category-label" style="color: ${category.category_color}">
                    ${category.category_name}
                </div>
                <div class="category-bar">
                    <div class="category-bar-fill" style="width: ${percentage}%; background-color: ${category.category_color}"></div>
                </div>
                <div class="category-stats">
                    <span>${category.task_count} tasks</span>
                    <span>${formatDuration(category.total_time)}</span>
                    <span>${category.completed_count} completed</span>
                </div>
            `;
            container.appendChild(categoryElement);
        });
    }
    
    /**
     * Update daily chart with line or bar chart options
     */
    function updateDailyChart(dailyStats) {
        const container = document.getElementById('daily-chart');
        container.innerHTML = '';
        
        if (dailyStats.length === 0) {
            container.innerHTML = '<div class="no-data">No daily data found for the selected period.</div>';
            return;
        }
        
        // Get chart preferences
        const chartType = document.getElementById('daily-chart-type')?.value || 'line';
        const metric = document.getElementById('daily-chart-metric')?.value || 'time';
        
        // Sort data by date
        const sortedStats = [...dailyStats].sort((a, b) => new Date(a.date) - new Date(b.date));
        
        if (chartType === 'line') {
            createLineChart(container, sortedStats, metric);
        } else {
            createBarChart(container, sortedStats, metric);
        }
    }
    
    /**
     * Create a line chart for daily statistics
     */
    function createLineChart(container, dailyStats, metric) {
        // Create SVG container
        const svgContainer = document.createElement('div');
        svgContainer.className = 'line-chart-container';
        
        const width = 800;
        const height = 300;
        const margin = { top: 20, right: 30, bottom: 60, left: 60 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;
        
        // Get data values based on selected metric
        const getMetricValue = (stat) => {
            switch (metric) {
                case 'tasks': return stat.task_count;
                case 'completed': return stat.completed_count;
                case 'time': 
                default: return stat.total_time;
            }
        };
        
        const getMetricLabel = () => {
            switch (metric) {
                case 'tasks': return 'Tasks';
                case 'completed': return 'Completed Tasks';
                case 'time': 
                default: return 'Time (hours)';
            }
        };
        
        const values = dailyStats.map(getMetricValue);
        const maxValue = Math.max(...values);
        const minValue = Math.min(...values);
        
        // Create SVG
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);
        svg.style.background = '#fff';
        svg.style.border = '1px solid #e0e0e0';
        svg.style.borderRadius = '4px';
        
        // Create chart group
        const chartGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        chartGroup.setAttribute('transform', `translate(${margin.left}, ${margin.top})`);
        svg.appendChild(chartGroup);
        
        // Create scales
        const xScale = (index) => (index / (dailyStats.length - 1)) * chartWidth;
        const yScale = (value) => chartHeight - ((value - minValue) / (maxValue - minValue || 1)) * chartHeight;
        
        // Create grid lines
        const gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        gridGroup.setAttribute('class', 'grid');
        chartGroup.appendChild(gridGroup);
        
        // Horizontal grid lines
        for (let i = 0; i <= 5; i++) {
            const y = (i / 5) * chartHeight;
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', 0);
            line.setAttribute('y1', chartHeight - y);
            line.setAttribute('x2', chartWidth);
            line.setAttribute('y2', chartHeight - y);
            line.setAttribute('stroke', '#f0f0f0');
            line.setAttribute('stroke-width', 1);
            gridGroup.appendChild(line);
        }
        
        // Create line path
        let pathData = '';
        dailyStats.forEach((stat, index) => {
            const x = xScale(index);
            const y = yScale(getMetricValue(stat));
            
            if (index === 0) {
                pathData += `M ${x} ${y}`;
            } else {
                pathData += ` L ${x} ${y}`;
            }
        });
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('stroke', '#4285f4');
        path.setAttribute('stroke-width', 2);
        path.setAttribute('fill', 'none');
        chartGroup.appendChild(path);
        
        // Create data points
        dailyStats.forEach((stat, index) => {
            const x = xScale(index);
            const y = yScale(getMetricValue(stat));
            
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', x);
            circle.setAttribute('cy', y);
            circle.setAttribute('r', 4);
            circle.setAttribute('fill', '#4285f4');
            circle.setAttribute('stroke', '#fff');
            circle.setAttribute('stroke-width', 2);
            
            // Add tooltip
            const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            const formattedValue = metric === 'time' ? formatDuration(getMetricValue(stat)) : getMetricValue(stat);
            title.textContent = `${stat.date}: ${formattedValue}`;
            circle.appendChild(title);
            
            chartGroup.appendChild(circle);
        });
        
        // Create axes
        // X-axis
        const xAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        xAxis.setAttribute('x1', 0);
        xAxis.setAttribute('y1', chartHeight);
        xAxis.setAttribute('x2', chartWidth);
        xAxis.setAttribute('y2', chartHeight);
        xAxis.setAttribute('stroke', '#333');
        xAxis.setAttribute('stroke-width', 1);
        chartGroup.appendChild(xAxis);
        
        // Y-axis
        const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        yAxis.setAttribute('x1', 0);
        yAxis.setAttribute('y1', 0);
        yAxis.setAttribute('x2', 0);
        yAxis.setAttribute('y2', chartHeight);
        yAxis.setAttribute('stroke', '#333');
        yAxis.setAttribute('stroke-width', 1);
        chartGroup.appendChild(yAxis);
        
        // Add axis labels
        // X-axis labels (show every few dates to avoid crowding)
        const labelInterval = Math.max(1, Math.floor(dailyStats.length / 8));
        dailyStats.forEach((stat, index) => {
            if (index % labelInterval === 0 || index === dailyStats.length - 1) {
                const x = xScale(index);
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', x);
                text.setAttribute('y', chartHeight + 20);
                text.setAttribute('text-anchor', 'middle');
                text.setAttribute('font-size', '12');
                text.setAttribute('fill', '#666');
                text.textContent = new Date(stat.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                chartGroup.appendChild(text);
            }
        });
        
        // Y-axis labels
        for (let i = 0; i <= 5; i++) {
            const value = minValue + (maxValue - minValue) * (i / 5);
            const y = chartHeight - (i / 5) * chartHeight;
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', -10);
            text.setAttribute('y', y + 4);
            text.setAttribute('text-anchor', 'end');
            text.setAttribute('font-size', '12');
            text.setAttribute('fill', '#666');
            
            if (metric === 'time') {
                text.textContent = Math.round(value / (1000 * 60 * 60 * 1000) * 1000) / 1000 + 'h'; // Convert to hours
            } else {
                text.textContent = Math.round(value);
            }
            chartGroup.appendChild(text);
        }
        
        // Chart title
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        title.setAttribute('x', chartWidth / 2);
        title.setAttribute('y', -5);
        title.setAttribute('text-anchor', 'middle');
        title.setAttribute('font-size', '14');
        title.setAttribute('font-weight', 'bold');
        title.setAttribute('fill', '#333');
        title.textContent = `Daily ${getMetricLabel()} Trend`;
        chartGroup.appendChild(title);
        
        svgContainer.appendChild(svg);
        container.appendChild(svgContainer);
    }
    
    /**
     * Create a bar chart for daily statistics (improved version)
     */
    function createBarChart(container, dailyStats, metric) {
        // Limit to last 30 days for better display
        const limitedStats = dailyStats.slice(-30);
        
        const getMetricValue = (stat) => {
            switch (metric) {
                case 'tasks': return stat.task_count;
                case 'completed': return stat.completed_count;
                case 'time': 
                default: return stat.total_time;
            }
        };
        
        const maxValue = Math.max(...limitedStats.map(getMetricValue));
        
        limitedStats.forEach(day => {
            const dayElement = document.createElement('div');
            dayElement.className = 'daily-chart-item';
            
            const value = getMetricValue(day);
            const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
            
            let displayValue;
            if (metric === 'time') {
                displayValue = formatDuration(value);
            } else {
                displayValue = value.toString();
            }
            
            dayElement.innerHTML = `
                <div class="daily-date">${new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                <div class="daily-bar">
                    <div class="daily-bar-fill" style="height: ${percentage}%"></div>
                </div>
                <div class="daily-stats">
                    <div>${displayValue}</div>
                    <div class="daily-secondary">${day.task_count} tasks</div>
                    <div class="daily-secondary">${day.completed_count} done</div>
                </div>
            `;
            container.appendChild(dayElement);
        });
    }
    
    /**
     * Load categories for management
     */
    async function loadCategoriesForManagement() {
        try {
            const response = await fetch('/api/tasks/categories');
            const categories = await response.json();
            
            const container = document.getElementById('categories-manage-list');
            container.innerHTML = '';
            
            categories.forEach(category => {
                const categoryElement = document.createElement('div');
                categoryElement.className = 'category-manage-item';
                categoryElement.innerHTML = `
                    <div class="category-info">
                        <div class="category-color-indicator" style="background-color: ${category.color}"></div>
                        <div class="category-details">
                            <div class="category-name">${category.name}</div>
                            <div class="category-description">${category.description || 'No description'}</div>
                            <div class="category-usage">${category.task_count || 0} tasks, ${formatDuration(category.total_time || 0)}</div>
                        </div>
                    </div>
                    <div class="category-actions">
                        <button onclick="TaskStatisticsManager.editCategory('${category.id}')">Edit</button>
                        <button onclick="TaskStatisticsManager.deleteCategory('${category.id}')" class="delete">Delete</button>
                    </div>
                `;
                container.appendChild(categoryElement);
            });
        } catch (error) {
            console.error('Error loading categories for management:', error);
        }
    }
    
    /**
     * Create a new category
     */
    async function createCategory() {
        const name = document.getElementById('new-category-name').value.trim();
        const description = document.getElementById('new-category-description').value.trim();
        const color = document.getElementById('new-category-color').value;
        
        if (!name) {
            alert('Category name is required');
            return;
        }
        
        try {
            const response = await fetch('/api/tasks/categories', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, description, color })
            });
            
            if (response.ok) {
                // Clear form
                document.getElementById('new-category-name').value = '';
                document.getElementById('new-category-description').value = '';
                document.getElementById('new-category-color').value = '#4285f4';
                
                // Reload categories
                await loadCategories();
                await loadCategoriesForManagement();
                
                alert('Category created successfully!');
            } else {
                const error = await response.json();
                alert(`Error creating category: ${error.error}`);
            }
        } catch (error) {
            console.error('Error creating category:', error);
            alert('Error creating category. Please try again.');
        }
    }
    
    /**
     * Format duration in milliseconds to readable format
     */
    function formatDuration(ms) {
        if (!ms || ms === 0) return '0:00:00';
        
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        const hours = Math.floor(ms / (1000 * 60 * 60));
        
        return [
            hours.toString().padStart(2, '0'),
            minutes.toString().padStart(2, '0'),
            seconds.toString().padStart(2, '0')
        ].join(':');
    }
    
    /**
     * Edit a category
     */
    async function editCategory(categoryId) {
        try {
            // Get the category data
            const response = await fetch(`/api/tasks/categories/${categoryId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch category');
            }
            
            const category = await response.json();
            
            // Create edit modal
            const editModal = document.createElement('div');
            editModal.className = 'category-edit-modal-overlay';
            editModal.innerHTML = `
                <div class="category-edit-modal">
                    <div class="category-edit-header">
                        <h3>Edit Category</h3>
                        <button class="category-edit-close-btn">&times;</button>
                    </div>
                    <div class="category-edit-content">
                        <div class="category-edit-form">
                            <label>Name:</label>
                            <input type="text" id="edit-category-name" value="${category.name}">
                            
                            <label>Description:</label>
                            <input type="text" id="edit-category-description" value="${category.description || ''}">
                            
                            <label>Color:</label>
                            <input type="color" id="edit-category-color" value="${category.color}">
                            
                            <div class="category-edit-actions">
                                <button id="save-category-btn">Save Changes</button>
                                <button id="cancel-edit-btn">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(editModal);
            
            // Event listeners
            editModal.querySelector('.category-edit-close-btn').addEventListener('click', () => {
                document.body.removeChild(editModal);
            });
            
            editModal.querySelector('#cancel-edit-btn').addEventListener('click', () => {
                document.body.removeChild(editModal);
            });
            
            editModal.querySelector('#save-category-btn').addEventListener('click', async () => {
                const name = document.getElementById('edit-category-name').value.trim();
                const description = document.getElementById('edit-category-description').value.trim();
                const color = document.getElementById('edit-category-color').value;
                
                if (!name) {
                    alert('Category name is required');
                    return;
                }
                
                try {
                    const updateResponse = await fetch(`/api/tasks/categories/${categoryId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ name, description, color })
                    });
                    
                    if (updateResponse.ok) {
                        document.body.removeChild(editModal);
                        await loadCategories();
                        await loadCategoriesForManagement();
                        alert('Category updated successfully!');
                    } else {
                        const error = await updateResponse.json();
                        alert(`Error updating category: ${error.error}`);
                    }
                } catch (error) {
                    console.error('Error updating category:', error);
                    alert('Error updating category. Please try again.');
                }
            });
            
            // Click outside to close
            editModal.addEventListener('click', (e) => {
                if (e.target === editModal) {
                    document.body.removeChild(editModal);
                }
            });
            
        } catch (error) {
            console.error('Error editing category:', error);
            alert('Error loading category data. Please try again.');
        }
    }
    
    /**
     * Delete a category
     */
    async function deleteCategory(categoryId) {
        if (!confirm('Are you sure you want to delete this category? This will remove the category assignment from all tasks.')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/tasks/categories/${categoryId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                await loadCategories();
                await loadCategoriesForManagement();
                alert('Category deleted successfully!');
            } else {
                const error = await response.json();
                alert(`Error deleting category: ${error.error}`);
            }
        } catch (error) {
            console.error('Error deleting category:', error);
            alert('Error deleting category. Please try again.');
        }
    }
    
    // Public API
    return {
        initialize,
        open,
        close,
        refreshStatistics,
        loadCategoriesForManagement,
        createCategory,
        editCategory,
        deleteCategory
    };
})();

// Export the module for use in other files
window.TaskStatisticsManager = TaskStatisticsManager;