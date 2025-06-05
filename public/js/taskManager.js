/**
 * Task Manager Module
 * Handles all task-related functionality
 */
const TaskManager = (function() {
  // Private variables
  let tasks = [];
  let currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  let activeTaskTimer = null;
  let sortOrder = 'created'; // Default sort order, options: created, durationAsc, durationDesc
  let currentLanguage = 'en'; // Default language
  let availableCategories = [];
  let isInitialized = false;
  
  // Task timestamp modal elements
  let taskTimestampModal = null;
  let taskModalOverlay = null;
  
  /**
   * Initializes the Task Manager
   */
  async function initialize() {
    if (isInitialized) return;
    
    createTaskInterface();
    createTaskTimestampModal();
    await loadCategories();
    await loadTasksForCurrentDate();
    
    // Set up intervals for updating the timer
    setInterval(updateActiveTaskTimer, 1000);
    
    isInitialized = true;
    console.log('TaskManager initialized');
  }
  
  /**
   * Creates the task management interface
   */
  function createTaskInterface() {
    const sidebarElement = document.querySelector('.sidebar');
    
    const taskManagerHTML = `
      <div class="task-manager">
        <h2>${I18n.t('dailyTasks')}</h2>
        <div class="date-selector">
          <button id="prev-date" title="${I18n.t('previousDay')}">◀</button>
          <input type="date" id="task-date" value="${currentDate}">
          <button id="next-date" title="${I18n.t('nextDay')}">▶</button>
          <button id="today-date" title="${I18n.t('today')}">${I18n.t('today')}</button>
        </div>
        
        <div class="active-task-display">
          <h3>${I18n.t('activeTask')}</h3>
          <div id="active-task">
            <span id="active-task-name">${I18n.t('noActiveTask')}</span>
            <span id="active-task-timer">00:00:00</span>
          </div>
        </div>
        
        <div class="task-creator">
          <input type="text" id="new-task-input" placeholder="${I18n.t('newTask')}">
          <button id="add-task-btn">${I18n.t('add')}</button>
          <button id="task-statistics-btn" class="task-statistics-btn" title="Task Statistics & Analysis">📊</button>
        </div>
        
        <div class="task-controls">
          <button id="sort-by-created" class="active">${I18n.t('byCreation')}</button>
          <button id="sort-duration-asc">${I18n.t('durationAsc')}</button>
          <button id="sort-duration-desc">${I18n.t('durationDesc')}</button>
        </div>
        
        <div class="tasks-container">
          <div id="tasks-list"></div>
        </div>
        
        <div class="task-statistics">
          <h3>${I18n.t('statistics')}</h3>
          <div id="task-stats">
            <div>${I18n.t('totalTasks')}: <span id="total-tasks-count">0</span></div>
            <div>${I18n.t('completed')}: <span id="completed-tasks-count">0</span></div>
            <div>${I18n.t('totalTime')}: <span id="total-time-spent">00:00:00</span></div>
          </div>
        </div>
      </div>
    `;
    
    sidebarElement.insertAdjacentHTML('afterbegin', taskManagerHTML);
    
    // Set up event listeners
    document.getElementById('task-date').addEventListener('change', handleDateChange);
    document.getElementById('prev-date').addEventListener('click', () => changeDate(-1));
    document.getElementById('next-date').addEventListener('click', () => changeDate(1));
    document.getElementById('today-date').addEventListener('click', goToToday);
    document.getElementById('add-task-btn').addEventListener('click', addNewTask);
    document.getElementById('new-task-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addNewTask();
    });
    
    document.getElementById('sort-by-created').addEventListener('click', () => sortTasks('created'));
    document.getElementById('sort-duration-asc').addEventListener('click', () => sortTasks('durationAsc'));
    document.getElementById('sort-duration-desc').addEventListener('click', () => sortTasks('durationDesc'));
    document.getElementById('task-statistics-btn').addEventListener('click', () => {
      if (window.TaskStatisticsManager) {
        TaskStatisticsManager.open();
      } else {
        console.error('TaskStatisticsManager not available');
      }
    });
  }
  
  /**
   * Creates the task timestamp modal
   */
  function createTaskTimestampModal() {
    // Create modal overlay if it doesn't exist
    if (!taskModalOverlay) {
      taskModalOverlay = document.createElement('div');
      taskModalOverlay.className = 'modal-overlay task-timestamp-modal-overlay';
      taskModalOverlay.style.display = 'none';
      document.body.appendChild(taskModalOverlay);
      
      // Close modal when clicking outside
      taskModalOverlay.addEventListener('click', function(e) {
        if (e.target === taskModalOverlay) {
          closeTaskTimestampModal();
        }
      });
    }
    
    // Create modal if it doesn't exist
    if (!taskTimestampModal) {
      taskTimestampModal = document.createElement('div');
      taskTimestampModal.className = 'modal task-timestamp-modal';
      
      // Modal header
      const modalHeader = document.createElement('div');
      modalHeader.className = 'modal-header';
      
      const modalTitle = document.createElement('h2');
      modalTitle.className = 'modal-title';
      modalTitle.id = 'task-timestamp-modal-title';
      modalTitle.textContent = 'Task Timestamps';
      
      const closeButton = document.createElement('button');
      closeButton.className = 'modal-close';
      closeButton.innerHTML = '&times;';
      closeButton.addEventListener('click', closeTaskTimestampModal);
      
      modalHeader.appendChild(modalTitle);
      modalHeader.appendChild(closeButton);
      
      // Modal body
      const modalBody = document.createElement('div');
      modalBody.className = 'modal-body';
      
      const timestampInfo = document.createElement('div');
      timestampInfo.className = 'task-timestamp-info';
      
      // Task name
      const taskNameSection = document.createElement('div');
      taskNameSection.className = 'task-timestamp-section';
      
      const taskNameLabel = document.createElement('h3');
      taskNameLabel.textContent = 'Task:';
      
      const taskNameDisplay = document.createElement('p');
      taskNameDisplay.id = 'task-timestamp-name';
      taskNameDisplay.className = 'task-name-display';
      
      taskNameSection.appendChild(taskNameLabel);
      taskNameSection.appendChild(taskNameDisplay);
      
      // Created timestamp
      const createdSection = document.createElement('div');
      createdSection.className = 'task-timestamp-section';
      
      const createdLabel = document.createElement('h3');
      createdLabel.id = 'task-created-label';
      createdLabel.textContent = 'Created:';
      
      const createdTime = document.createElement('p');
      createdTime.id = 'task-created-time';
      createdTime.className = 'timestamp';
      
      createdSection.appendChild(createdLabel);
      createdSection.appendChild(createdTime);
      
      // Updated timestamp
      const updatedSection = document.createElement('div');
      updatedSection.className = 'task-timestamp-section';
      
      const updatedLabel = document.createElement('h3');
      updatedLabel.id = 'task-updated-label';
      updatedLabel.textContent = 'Last Updated:';
      
      const updatedTime = document.createElement('p');
      updatedTime.id = 'task-updated-time';
      updatedTime.className = 'timestamp';
      
      updatedSection.appendChild(updatedLabel);
      updatedSection.appendChild(updatedTime);
      
      timestampInfo.appendChild(taskNameSection);
      timestampInfo.appendChild(createdSection);
      timestampInfo.appendChild(updatedSection);
      modalBody.appendChild(timestampInfo);
      
      // Assemble modal
      taskTimestampModal.appendChild(modalHeader);
      taskTimestampModal.appendChild(modalBody);
      
      taskModalOverlay.appendChild(taskTimestampModal);
    }
  }
  
  /**
   * Format timestamp to readable date/time
   * @param {number} timestamp - Unix timestamp in milliseconds
   * @returns {string} Formatted timestamp
   */
  function formatTaskTimestamp(timestamp) {
    if (!timestamp) return 'N/A';
    
    const date = new Date(timestamp);
    
    // Format: YYYY-MM-DD HH:MM:SS
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }
  
  /**
   * Open the task timestamp modal for a specific task
   * @param {string} taskId - The ID of the task
   */
  async function openTaskTimestampModal(taskId) {
    try {
      // Make sure the modal is created if it doesn't exist
      if (!taskTimestampModal) {
        createTaskTimestampModal();
      }

      // Find the task in our local tasks array
      const task = tasks.find(t => t.id === taskId);
      if (!task) {
        console.error('Task not found:', taskId);
        return;
      }
      
      // Update modal with task information
      const taskNameElement = document.getElementById('task-timestamp-name');
      const createdTimeElement = document.getElementById('task-created-time');
      const updatedTimeElement = document.getElementById('task-updated-time');
      
      if (taskNameElement) {
        taskNameElement.textContent = task.name;
      }
      
      if (createdTimeElement) {
        createdTimeElement.textContent = formatTaskTimestamp(task.created_at);
      }
      
      if (updatedTimeElement) {
        updatedTimeElement.textContent = formatTaskTimestamp(task.updated_at);
      }
      
      // Show the modal
      taskModalOverlay.style.display = 'flex';
    } catch (error) {
      console.error('Error opening task timestamp modal:', error);
    }
  }
  
  /**
   * Close the task timestamp modal
   */
  function closeTaskTimestampModal() {
    if (taskModalOverlay) {
      taskModalOverlay.style.display = 'none';
    }
  }
  
  /**
   * Loads tasks for the current date
   */
  async function loadTasksForCurrentDate() {
    try {
      const response = await fetch(`/api/tasks/${currentDate}`);
      tasks = await response.json();
      
      renderTasks();
      updateStatistics();
      highlightActiveTask();
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  }
  
  /**
   * Load available categories
   */
  async function loadCategories() {
    try {
      const response = await fetch('/api/tasks/categories');
      if (response.ok) {
        availableCategories = await response.json();
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      availableCategories = [];
    }
  }
  
  /**
   * Get task category information
   */
  async function getTaskCategory(taskId) {
    try {
      const response = await fetch(`/api/tasks/${taskId}/category`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Error getting task category:', error);
    }
    return null;
  }
  
  /**
   * Show category selector for a task
   */
  function showCategorySelector(taskId, buttonElement) {
    // Remove any existing dropdown
    const existingDropdown = document.querySelector('.category-dropdown');
    if (existingDropdown) {
      existingDropdown.remove();
    }

    // Get the task name to show in the UI
    const task = tasks.find(t => t.id === taskId);
    const taskName = task ? task.name : '';
    
    // Determine if this task has a pattern that could be grouped
    let hasPattern = false;
    let baseName = taskName;
    
    if (/\s\d{1,2}$/.test(taskName) || /\s\(\d+\)$/.test(taskName) || 
        /\s-\s\d+$/.test(taskName) || /\s#\d+$/.test(taskName)) {
      hasPattern = true;
      // Extract base name for display
      if (/\s\d{2}$/.test(taskName)) {
        baseName = taskName.replace(/\s\d{2}$/, '').trim();
      } else if (/\s\d$/.test(taskName)) {
        baseName = taskName.replace(/\s\d$/, '').trim();
      } else if (/\s\(\d+\)$/.test(taskName)) {
        baseName = taskName.replace(/\s\(\d+\)$/, '').trim();
      } else if (/\s-\s\d+$/.test(taskName)) {
        baseName = taskName.replace(/\s-\s\d+$/, '').trim();
      } else if (/\s#\d+$/.test(taskName)) {
        baseName = taskName.replace(/\s#\d+$/, '').trim();
      }
    }

    // Create dropdown
    const dropdown = document.createElement('div');
    dropdown.className = 'category-dropdown';
    dropdown.innerHTML = `
      <div class="category-dropdown-content">
        ${hasPattern ? `
          <div class="category-assignment-options">
            <div class="assignment-option-header">Apply category to:</div>
            <label class="assignment-option">
              <input type="radio" name="assignment-scope" value="single" checked>
              <span>Only "${taskName}"</span>
            </label>
            <label class="assignment-option">
              <input type="radio" name="assignment-scope" value="all">
              <span>All "${baseName}" tasks (${baseName} 01, ${baseName} 02, etc.)</span>
            </label>
            <div class="category-divider"></div>
          </div>
        ` : ''}
        
        <div class="category-option" data-category="">
          <span class="category-color" style="background-color: #999;"></span>
          <span>No Category</span>
        </div>
        ${availableCategories.map(category => `
          <div class="category-option" data-category="${category.id}">
            <span class="category-color" style="background-color: ${category.color};"></span>
            <span>${category.name}</span>
          </div>
        `).join('')}
        <div class="category-divider"></div>
        <div class="category-option manage-categories" data-action="manage">
          <span>⚙️ Manage Categories</span>
        </div>
      </div>
    `;

    // Position dropdown
    const rect = buttonElement.getBoundingClientRect();
    dropdown.style.position = 'absolute';
    dropdown.style.top = `${rect.bottom + window.scrollY}px`;
    dropdown.style.left = `${rect.left + window.scrollX}px`;
    dropdown.style.zIndex = '1000';

    document.body.appendChild(dropdown);

    // Add event listeners
    dropdown.querySelectorAll('.category-option').forEach(option => {
      option.addEventListener('click', async (e) => {
        const action = option.dataset.action;
        const categoryId = option.dataset.category;

        if (action === 'manage') {
          // Open task statistics manager to manage categories
          if (window.TaskStatisticsManager) {
            await window.TaskStatisticsManager.open();
            // Switch to manage tab
            const manageTab = document.querySelector('[data-tab="manage"]');
            if (manageTab) {
              manageTab.click();
            }
          }
        } else {
          // Determine scope based on radio button selection
          let applyToAll = false;
          const scopeRadio = dropdown.querySelector('input[name="assignment-scope"]:checked');
          if (scopeRadio && scopeRadio.value === 'all') {
            applyToAll = true;
          }
          
          // Assign category to task(s)
          await assignTaskToCategory(taskId, categoryId, applyToAll);
        }

        dropdown.remove();
      });
    });

    // Close dropdown when clicking outside
    setTimeout(() => {
      document.addEventListener('click', function closeDropdown(e) {
        if (!dropdown.contains(e.target) && e.target !== buttonElement) {
          dropdown.remove();
          document.removeEventListener('click', closeDropdown);
        }
      });
    }, 100);
  }
  
  /**
   * Assign task to category (updated to support bulk assignment)
   */
  async function assignTaskToCategory(taskId, categoryId, applyToAll = false) {
    try {
      const requestBody = { categoryId };
      if (applyToAll) {
        requestBody.applyToAll = true;
      }
      
      if (categoryId) {
        // Assign to category
        const response = await fetch(`/api/tasks/${taskId}/category`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        if (response.ok) {
          const result = await response.json();
          console.log('Task assigned to category successfully');
          
          // Show feedback to user
          if (result.affectedCount > 1) {
            alert(`Category assigned to ${result.affectedCount} related tasks!`);
          }
        }
      } else {
        // Remove from category
        const response = await fetch(`/api/tasks/${taskId}/category`, {
          method: 'DELETE'
        });

        if (response.ok) {
          console.log('Task removed from category successfully');
        }
      }

      // Refresh the task display
      await loadTasksForCurrentDate();
      renderTasks();

    } catch (error) {
      console.error('Error assigning task to category:', error);
    }
  }
  
  /**
   * Sorts the tasks based on the selected order
   * @param {string} order - The sort order (created, durationAsc, durationDesc)
   */
  function sortTasks(order) {
    sortOrder = order;
    
    // Update active button
    document.querySelectorAll('.task-controls button').forEach(btn => {
      btn.classList.remove('active');
    });
    
    if (order === 'created') {
      document.getElementById('sort-by-created').classList.add('active');
      tasks.sort((a, b) => a.created_at - b.created_at);
    } else if (order === 'durationAsc') {
      document.getElementById('sort-duration-asc').classList.add('active');
      tasks.sort((a, b) => a.total_duration - b.total_duration);
    } else if (order === 'durationDesc') {
      document.getElementById('sort-duration-desc').classList.add('active');
      tasks.sort((a, b) => b.total_duration - a.total_duration);
    }
    
    renderTasks();
  }
  
  /**
   * Renders the list of tasks
   */
  function renderTasks() {
    const tasksListElement = document.getElementById('tasks-list');
    tasksListElement.innerHTML = '';
    
    if (tasks.length === 0) {
      tasksListElement.innerHTML = `<div class="no-tasks">${I18n.t('noTasksForDay')}</div>`;
      return;
    }
    
    tasks.forEach(task => {
      const taskElement = createTaskElement(task);
      tasksListElement.appendChild(taskElement);
    });
  }
  
  /**
   * Creates an HTML element for a task
   * @param {Object} task - The task object
   * @returns {HTMLElement} The task element
   */
  function createTaskElement(task) {
    const taskElement = document.createElement('div');
    taskElement.className = 'task-item';
    taskElement.dataset.id = task.id;
    
    if (task.is_completed) {
      taskElement.classList.add('completed');
    }
    
    if (task.is_active) {
      taskElement.classList.add('active');
    }
    
    // Get category info for display
    const categoryInfo = task.category_name ? 
      `<span class="task-category" style="background-color: ${task.category_color || '#999'};" title="${task.category_name}"></span>` : 
      '';
    
    taskElement.innerHTML = `
      <div class="task-content">
        <input type="checkbox" class="task-checkbox" ${task.is_completed ? 'checked' : ''}>
        ${categoryInfo}
        <span class="task-name">${task.name}</span>
        <span class="task-duration">${formatDuration(task.total_duration || 0)}</span>
      </div>
      <div class="task-actions">
        ${!task.is_completed ? 
          `<button class="task-timer-btn ${task.is_active ? 'pause' : 'start'}" title="${task.is_active ? 'Pause task' : 'Start task'}">${task.is_active ? '⏸' : '▶'}</button>` : 
          ''
        }
        <button class="task-category-btn" title="Set Category">🏷️</button>
        <button class="task-menu-btn" title="More options">⋮</button>
      </div>
    `;
    
    // Add event listeners
    const checkbox = taskElement.querySelector('.task-checkbox');
    checkbox.addEventListener('change', () => toggleTaskCompletion(task.id, checkbox.checked));
    
    const timerBtn = taskElement.querySelector('.task-timer-btn');
    if (timerBtn) {
      timerBtn.addEventListener('click', () => {
        if (task.is_active) {
          pauseTask(task.id);
        } else {
          startTask(task.id);
        }
      });
    }
    
    const categoryBtn = taskElement.querySelector('.task-category-btn');
    categoryBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showCategorySelector(task.id, categoryBtn);
    });
    
    const menuBtn = taskElement.querySelector('.task-menu-btn');
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showTaskMenu(task.id, menuBtn);
    });
    
    return taskElement;
  }
  
  /**
   * Show task menu dropdown
   * @param {string} taskId - The ID of the task
   * @param {HTMLElement} buttonElement - The menu button element
   */
  function showTaskMenu(taskId, buttonElement) {
    // Remove any existing dropdown
    const existingDropdown = document.querySelector('.task-menu-dropdown');
    if (existingDropdown) {
      existingDropdown.remove();
    }

    // Create dropdown
    const dropdown = document.createElement('div');
    dropdown.className = 'task-menu-dropdown';
    dropdown.innerHTML = `
      <div class="task-menu-dropdown-content">
        <div class="task-menu-option" data-action="timestamp">
          <span class="menu-icon">🕒</span>
          <span>View Timestamps</span>
        </div>
        <div class="task-menu-option task-menu-delete" data-action="delete">
          <span class="menu-icon">🗑️</span>
          <span>Delete Task</span>
        </div>
      </div>
    `;

    // Position dropdown
    const rect = buttonElement.getBoundingClientRect();
    dropdown.style.position = 'absolute';
    dropdown.style.top = `${rect.bottom + window.scrollY}px`;
    dropdown.style.left = `${rect.left + window.scrollX - 120}px`; // Offset to align better
    dropdown.style.zIndex = '1000';

    document.body.appendChild(dropdown);

    // Add event listeners
    dropdown.querySelectorAll('.task-menu-option').forEach(option => {
      option.addEventListener('click', async (e) => {
        const action = option.dataset.action;

        if (action === 'timestamp') {
          openTaskTimestampModal(taskId);
        } else if (action === 'delete') {
          // Close the menu first
          dropdown.remove();
          // Call delete function
          deleteTask(taskId);
          return; // Don't remove dropdown here as we're doing it above
        }

        dropdown.remove();
      });
    });

    // Close dropdown when clicking outside
    setTimeout(() => {
      document.addEventListener('click', function closeDropdown(e) {
        if (!dropdown.contains(e.target) && e.target !== buttonElement) {
          dropdown.remove();
          document.removeEventListener('click', closeDropdown);
        }
      });
    }, 100);
  }
  
  /**
   * Adds a new task
   */
  async function addNewTask() {
    const inputElement = document.getElementById('new-task-input');
    const taskName = inputElement.value.trim();
    
    if (!taskName) return;
    
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: taskName,
          date: currentDate
        })
      });
      
      if (response.ok) {
        const newTask = await response.json();
        tasks.push(newTask);
        renderTasks();
        updateStatistics();
        
        // Clear the input
        inputElement.value = '';
      }
    } catch (error) {
      console.error('Error adding task:', error);
    }
  }
  
  /**
   * Starts timing a task
   * @param {string} taskId - The ID of the task to start
   */
  async function startTask(taskId) {
    try {
      const response = await fetch(`/api/tasks/${taskId}/start`, {
        method: 'POST'
      });
      
      if (response.ok) {
        // Update local tasks list
        tasks.forEach(task => {
          task.is_active = (task.id === taskId);
          if (task.is_active) {
            task.start_time = Date.now();
          }
        });
        
        // Update UI
        renderTasks();
        highlightActiveTask();
      }
    } catch (error) {
      console.error('Error starting task:', error);
    }
  }
  
  /**
   * Pauses timing a task
   * @param {string} taskId - The ID of the task to pause
   */
  async function pauseTask(taskId) {
    try {
      // Find the active task
      const activeTask = tasks.find(task => task.id === taskId && task.is_active);
      
      if (!activeTask) return;
      
      // Calculate elapsed time since task was started
      const elapsed = Date.now() - activeTask.start_time;
      
      const response = await fetch(`/api/tasks/${taskId}/pause`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          elapsed: elapsed
        })
      });
      
      if (response.ok) {
        const updatedTask = await response.json();
        
        // Update local tasks list
        tasks = tasks.map(task => {
          if (task.id === taskId) {
            return updatedTask;
          }
          return task;
        });
        
        // Update UI
        renderTasks();
        updateStatistics();
        highlightActiveTask();
      }
    } catch (error) {
      console.error('Error pausing task:', error);
    }
  }
  
  /**
   * Toggles task completion status
   * @param {string} taskId - The ID of the task
   * @param {boolean} isCompleted - Whether the task is completed
   */
  async function toggleTaskCompletion(taskId, isCompleted) {
    try {
      // If the task is active and being completed, pause it first
      const activeTask = tasks.find(task => task.id === taskId && task.is_active);
      if (activeTask && isCompleted) {
        await pauseTask(taskId);
      }
      
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          is_completed: isCompleted
        })
      });
      
      if (response.ok) {
        const updatedTask = await response.json();
        
        // Update local tasks list
        tasks = tasks.map(task => {
          if (task.id === taskId) {
            return updatedTask;
          }
          return task;
        });
        
        // Update UI
        renderTasks();
        updateStatistics();
      }
    } catch (error) {
      console.error('Error toggling task completion:', error);
    }
  }
  
  /**
   * Deletes a task
   * @param {string} taskId - The ID of the task to delete
   */
  async function deleteTask(taskId) {
    if (!confirm(I18n.t('confirmDeleteTask'))) return;
    
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Remove from local tasks list
        tasks = tasks.filter(task => task.id !== taskId);
        
        // Update UI
        renderTasks();
        updateStatistics();
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  }
  
  /**
   * Updates the timer for the active task
   */
  function updateActiveTaskTimer() {
    // Ensure tasks is always an array
    if (!Array.isArray(tasks)) {
      console.error('Error: tasks is not an array', tasks);
      tasks = []; // Reset to empty array to prevent further errors
      return;
    }

    const activeTask = tasks.find(task => task.is_active);
    const activeTaskNameElement = document.getElementById('active-task-name');
    const activeTaskTimerElement = document.getElementById('active-task-timer');
    
    if (!activeTask) {
      activeTaskNameElement.textContent = I18n.t('noActiveTask');
      activeTaskTimerElement.textContent = '00:00:00';
      return;
    }
    
    // Update the active task display
    activeTaskNameElement.textContent = activeTask.name;
    
    // Calculate current duration
    const elapsedSinceStart = activeTask.start_time ? Date.now() - activeTask.start_time : 0;
    const totalDuration = (activeTask.total_duration || 0) + elapsedSinceStart;
    
    activeTaskTimerElement.textContent = formatDuration(totalDuration);
    
    // Also update the duration in the task list
    const taskElement = document.querySelector(`.task-item[data-id="${activeTask.id}"] .task-duration`);
    if (taskElement) {
      taskElement.textContent = formatDuration(totalDuration);
    }
  }
  
  /**
   * Updates the statistics display
   */
  function updateStatistics() {
    const totalTasksElement = document.getElementById('total-tasks-count');
    const completedTasksElement = document.getElementById('completed-tasks-count');
    const totalTimeElement = document.getElementById('total-time-spent');
    
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.is_completed).length;
    
    // Calculate total time (including active task current time)
    let totalTime = 0;
    tasks.forEach(task => {
      totalTime += task.total_duration || 0;
      
      // Add current active time
      if (task.is_active && task.start_time) {
        totalTime += Date.now() - task.start_time;
      }
    });
    
    totalTasksElement.textContent = totalTasks;
    completedTasksElement.textContent = completedTasks;
    totalTimeElement.textContent = formatDuration(totalTime);
  }
  
  /**
   * Highlights the active task
   */
  function highlightActiveTask() {
    // Remove active class from all tasks
    document.querySelectorAll('.task-item').forEach(item => {
      item.classList.remove('active');
    });
    
    // Find the active task and highlight it
    const activeTask = tasks.find(task => task.is_active);
    if (activeTask) {
      const taskElement = document.querySelector(`.task-item[data-id="${activeTask.id}"]`);
      if (taskElement) {
        taskElement.classList.add('active');
      }
    }
  }
  
  /**
   * Handles date change in the date picker
   */
  function handleDateChange(event) {
    currentDate = event.target.value;
    loadTasksForCurrentDate();
  }
  
  /**
   * Changes the date by the specified offset
   * @param {number} offset - The number of days to offset (positive or negative)
   */
  function changeDate(offset) {
    const date = new Date(currentDate);
    date.setDate(date.getDate() + offset);
    currentDate = date.toISOString().split('T')[0];
    
    document.getElementById('task-date').value = currentDate;
    loadTasksForCurrentDate();
  }
  
  /**
   * Goes to today's date
   */
  function goToToday() {
    currentDate = new Date().toISOString().split('T')[0];
    document.getElementById('task-date').value = currentDate;
    loadTasksForCurrentDate();
  }
  
  /**
   * Formats milliseconds into a readable duration (HH:MM:SS)
   * @param {number} ms - Duration in milliseconds
   * @returns {string} Formatted duration
   */
  function formatDuration(ms) {
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
   * Updates the language for task manager UI
   * @param {string} language - The language code ('en' or 'zh')
   */
  function updateLanguage(language) {
    currentLanguage = language;
    
    // Update UI elements with translated text
    const taskManagerElement = document.querySelector('.task-manager');
    if (taskManagerElement) {
      // Update headings
      taskManagerElement.querySelector('h2').textContent = I18n.t('dailyTasks');
      
      // Update active task display
      taskManagerElement.querySelector('.active-task-display h3').textContent = I18n.t('activeTask');
      if (document.getElementById('active-task-name').textContent === 'No active task') {
        document.getElementById('active-task-name').textContent = I18n.t('noActiveTask');
      }
      
      // Update task controls
      document.getElementById('new-task-input').placeholder = I18n.t('newTask');
      document.getElementById('add-task-btn').textContent = I18n.t('add');
      document.getElementById('today-date').textContent = I18n.t('today');
      document.getElementById('sort-by-created').textContent = I18n.t('byCreation');
      document.getElementById('sort-duration-asc').textContent = I18n.t('durationAsc');
      document.getElementById('sort-duration-desc').textContent = I18n.t('durationDesc');
      
      // Update statistics section
      taskManagerElement.querySelector('.task-statistics h3').textContent = I18n.t('statistics');
      document.getElementById('task-stats').firstElementChild.innerHTML = 
        `${I18n.t('totalTasks')}: <span id="total-tasks-count">${document.getElementById('total-tasks-count').textContent}</span>`;
      document.getElementById('task-stats').children[1].innerHTML = 
        `${I18n.t('completed')}: <span id="completed-tasks-count">${document.getElementById('completed-tasks-count').textContent}</span>`;
      document.getElementById('task-stats').lastElementChild.innerHTML = 
        `${I18n.t('totalTime')}: <span id="total-time-spent">${document.getElementById('total-time-spent').textContent}</span>`;
    }
  }
  
  // Public API
  return {
    initialize: initialize,
    updateLanguage: updateLanguage
  };
})();

// Export the module for use in other files
window.TaskManager = TaskManager; 