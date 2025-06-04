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
            const categories = await response.json();
            
            const categorySelect = document.getElementById('task-stats-category');
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
            const data = await response.json();
            
            updateOverviewStats(data.overallStats);
            updateTaskGroups(data.taskGroups);
            updateCategoriesChart(data.categoryStats);
            updateDailyChart(data.dailyStats);
            
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
     * Update daily chart
     */
    function updateDailyChart(dailyStats) {
        const container = document.getElementById('daily-chart');
        container.innerHTML = '';
        
        if (dailyStats.length === 0) {
            container.innerHTML = '<div class="no-data">No daily data found for the selected period.</div>';
            return;
        }
        
        // Create a simple line chart representation
        const maxTime = Math.max(...dailyStats.map(d => d.total_time));
        
        dailyStats.slice(0, 30).forEach(day => { // Limit to last 30 days for display
            const dayElement = document.createElement('div');
            dayElement.className = 'daily-chart-item';
            
            const percentage = maxTime > 0 ? (day.total_time / maxTime) * 100 : 0;
            
            dayElement.innerHTML = `
                <div class="daily-date">${day.date}</div>
                <div class="daily-bar">
                    <div class="daily-bar-fill" style="height: ${percentage}%"></div>
                </div>
                <div class="daily-stats">
                    <div>${day.task_count} tasks</div>
                    <div>${formatDuration(day.total_time)}</div>
                    <div>${day.completed_count} done</div>
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
    
    // Public API
    return {
        initialize,
        open,
        close,
        refreshStatistics,
        loadCategoriesForManagement,
        createCategory
    };
})();

// Export the module for use in other files
window.TaskStatisticsManager = TaskStatisticsManager;