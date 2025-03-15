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
  
  /**
   * Initializes the Task Manager
   */
  function initialize() {
    createTaskInterface();
    loadTasksForCurrentDate();
    
    // Set up intervals for updating the timer
    setInterval(updateActiveTaskTimer, 1000);
  }
  
  /**
   * Creates the task management interface
   */
  function createTaskInterface() {
    const sidebarElement = document.querySelector('.sidebar');
    
    const taskManagerHTML = `
      <div class="task-manager">
        <h2>Daily Tasks</h2>
        <div class="date-selector">
          <button id="prev-date" title="Previous day">◀</button>
          <input type="date" id="task-date" value="${currentDate}">
          <button id="next-date" title="Next day">▶</button>
          <button id="today-date" title="Today">Today</button>
        </div>
        
        <div class="active-task-display">
          <h3>Active Task</h3>
          <div id="active-task">
            <span id="active-task-name">No active task</span>
            <span id="active-task-timer">00:00:00</span>
          </div>
        </div>
        
        <div class="task-creator">
          <input type="text" id="new-task-input" placeholder="Enter new task...">
          <button id="add-task-btn">Add</button>
        </div>
        
        <div class="task-controls">
          <button id="sort-by-created" class="active">By Creation</button>
          <button id="sort-duration-asc">↑ Duration</button>
          <button id="sort-duration-desc">↓ Duration</button>
        </div>
        
        <div class="tasks-container">
          <div id="tasks-list"></div>
        </div>
        
        <div class="task-statistics">
          <h3>Statistics</h3>
          <div id="task-stats">
            <div>Total Tasks: <span id="total-tasks-count">0</span></div>
            <div>Completed: <span id="completed-tasks-count">0</span></div>
            <div>Total Time: <span id="total-time-spent">00:00:00</span></div>
          </div>
        </div>
      </div>
    `;
    
    sidebarElement.insertAdjacentHTML('beforeend', taskManagerHTML);
    
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
      tasksListElement.innerHTML = '<div class="no-tasks">No tasks for this day</div>';
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
    
    taskElement.innerHTML = `
      <div class="task-content">
        <input type="checkbox" class="task-checkbox" ${task.is_completed ? 'checked' : ''}>
        <span class="task-name">${task.name}</span>
        <span class="task-duration">${formatDuration(task.total_duration || 0)}</span>
      </div>
      <div class="task-actions">
        ${!task.is_completed ? 
          `<button class="task-timer-btn ${task.is_active ? 'pause' : 'start'}">${task.is_active ? '⏸' : '▶'}</button>` : 
          ''
        }
        <button class="task-delete-btn">🗑️</button>
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
    
    const deleteBtn = taskElement.querySelector('.task-delete-btn');
    deleteBtn.addEventListener('click', () => deleteTask(task.id));
    
    return taskElement;
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
    if (!confirm('Are you sure you want to delete this task?')) return;
    
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
    const activeTask = tasks.find(task => task.is_active);
    const activeTaskNameElement = document.getElementById('active-task-name');
    const activeTaskTimerElement = document.getElementById('active-task-timer');
    
    if (!activeTask) {
      activeTaskNameElement.textContent = 'No active task';
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
  
  // Public API
  return {
    initialize: initialize
  };
})();

// Export the module for use in other files
window.TaskManager = TaskManager; 