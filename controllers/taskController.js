// taskController.js - Logic for task operations
const { v4: uuidv4 } = require('uuid');

/**
 * Get tasks for a specific date
 * GET /api/tasks/:date
 */
exports.getTasksByDate = async (req, res) => {
  try {
    const { date } = req.params;
    const db = req.db;
    
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }
    
    // Get all tasks for the specified date
    const tasks = await db.all(`
      SELECT * FROM tasks 
      WHERE date = ? 
      ORDER BY created_at
    `, date);
    
    res.json(tasks);
  } catch (error) {
    console.error(`Error getting tasks for date ${req.params.date}:`, error);
    res.status(500).json({ error: 'Failed to get tasks' });
  }
};

/**
 * Create a new task
 * POST /api/tasks
 */
exports.createTask = async (req, res) => {
  try {
    const { name, date } = req.body;
    const db = req.db;
    
    // Validate required fields
    if (!name || !date) {
      return res.status(400).json({ error: 'Name and date are required' });
    }
    
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }
    
    const taskId = uuidv4();
    const now = Date.now();
    
    // Insert the new task
    await db.run(`
      INSERT INTO tasks (id, name, date, is_completed, is_active, total_duration, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [taskId, name, date, 0, 0, 0, now, now]);
    
    // Get the newly created task
    const newTask = await db.get('SELECT * FROM tasks WHERE id = ?', taskId);
    
    res.status(201).json(newTask);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
};

/**
 * Update a task
 * PUT /api/tasks/:id
 */
exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, is_completed } = req.body;
    const db = req.db;
    
    // Get the current task
    const task = await db.get('SELECT * FROM tasks WHERE id = ?', id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Build the update query
    const updates = [];
    const params = [];
    
    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    
    if (is_completed !== undefined) {
      updates.push('is_completed = ?');
      params.push(is_completed ? 1 : 0);
      
      // If completing a task, make sure it's no longer active
      if (is_completed) {
        updates.push('is_active = ?');
        params.push(0);
      }
    }
    
    // Add updated_at
    updates.push('updated_at = ?');
    params.push(Date.now());
    
    // Add task ID to params
    params.push(id);
    
    // Update the task
    await db.run(`
      UPDATE tasks 
      SET ${updates.join(', ')} 
      WHERE id = ?
    `, params);
    
    // Get the updated task
    const updatedTask = await db.get('SELECT * FROM tasks WHERE id = ?', id);
    
    res.json(updatedTask);
  } catch (error) {
    console.error(`Error updating task ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update task' });
  }
};

/**
 * Delete a task
 * DELETE /api/tasks/:id
 */
exports.deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db;
    
    // Check if task exists
    const task = await db.get('SELECT * FROM tasks WHERE id = ?', id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Delete the task
    await db.run('DELETE FROM tasks WHERE id = ?', id);
    
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    console.error(`Error deleting task ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
};

/**
 * Start timing a task
 * POST /api/tasks/:id/start
 */
exports.startTask = async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db;
    const now = Date.now();
    
    // Check if task exists
    const task = await db.get('SELECT * FROM tasks WHERE id = ?', id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // If there's any active task, deactivate it first
    await db.run(`
      UPDATE tasks 
      SET is_active = 0, updated_at = ? 
      WHERE is_active = 1
    `, now);
    
    // Activate the current task
    await db.run(`
      UPDATE tasks 
      SET is_active = 1, start_time = ?, updated_at = ? 
      WHERE id = ?
    `, [now, now, id]);
    
    // Get the updated task
    const updatedTask = await db.get('SELECT * FROM tasks WHERE id = ?', id);
    
    res.json(updatedTask);
  } catch (error) {
    console.error(`Error starting task ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to start task' });
  }
};

/**
 * Pause timing a task
 * POST /api/tasks/:id/pause
 */
exports.pauseTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { elapsed } = req.body;
    const db = req.db;
    const now = Date.now();
    
    // Check if task exists
    const task = await db.get('SELECT * FROM tasks WHERE id = ?', id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Validate elapsed time
    const elapsedTime = parseInt(elapsed || 0, 10);
    if (isNaN(elapsedTime) || elapsedTime < 0) {
      return res.status(400).json({ error: 'Invalid elapsed time' });
    }
    
    // Update the task duration and deactivate it
    await db.run(`
      UPDATE tasks 
      SET 
        is_active = 0, 
        start_time = NULL,
        total_duration = total_duration + ?,
        updated_at = ? 
      WHERE id = ?
    `, [elapsedTime, now, id]);
    
    // Get the updated task
    const updatedTask = await db.get('SELECT * FROM tasks WHERE id = ?', id);
    
    res.json(updatedTask);
  } catch (error) {
    console.error(`Error pausing task ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to pause task' });
  }
};

/**
 * Get all dates with tasks
 * GET /api/tasks/dates
 */
exports.getTaskDates = async (req, res) => {
  try {
    const db = req.db;
    
    const dates = await db.all(
      'SELECT DISTINCT date FROM tasks ORDER BY date DESC'
    );
    
    res.json(dates.map(item => item.date));
  } catch (error) {
    console.error('Error getting task dates:', error);
    res.status(500).json({ error: 'Failed to get task dates' });
  }
};