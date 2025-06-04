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
    
    // Get all tasks for the specified date with category information
    const tasks = await db.all(`
      SELECT 
        t.*,
        tc.name as category_name,
        tc.color as category_color
      FROM tasks t
      LEFT JOIN task_category_assignments tca ON t.id = tca.task_id
      LEFT JOIN task_categories tc ON tca.category_id = tc.id
      WHERE t.date = ? 
      ORDER BY t.created_at
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

/**
 * Get a single task by sequence ID
 * GET /api/tasks/sequence/:sequence_id
 */
exports.getTaskBySequenceId = async (req, res) => {
  try {
    const { sequence_id } = req.params;
    
    // Validate input
    const sequenceIdNum = parseInt(sequence_id);
    if (isNaN(sequenceIdNum) || sequenceIdNum <= 0) {
      return res.status(400).json({ error: 'Invalid sequence ID format' });
    }
    
    const db = req.db;
    const task = await db.get('SELECT * FROM tasks WHERE sequence_id = ?', sequenceIdNum);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found with the provided sequence ID' });
    }
    
    res.json(task);
  } catch (error) {
    console.error(`Error retrieving task by sequence ID ${req.params.sequence_id}:`, error);
    res.status(500).json({ error: 'Database error when retrieving task by sequence ID' });
  }
};

/**
 * Get task statistics
 * GET /api/tasks/statistics?days=30&category=coding
 */
exports.getTaskStatistics = async (req, res) => {
  try {
    const { days = 7, category, startDate, endDate } = req.query;
    const db = req.db;
    
    // Build date filter
    let dateFilter = '';
    let dateParams = [];
    
    if (startDate && endDate) {
      dateFilter = 'AND date BETWEEN ? AND ?';
      dateParams = [startDate, endDate];
    } else {
      const daysNum = parseInt(days) || 7;
      const startDateCalc = new Date();
      startDateCalc.setDate(startDateCalc.getDate() - daysNum);
      const startDateStr = startDateCalc.toISOString().split('T')[0];
      
      dateFilter = 'AND date >= ?';
      dateParams = [startDateStr];
    }
    
    // Base query for tasks with category filter
    let categoryJoin = '';
    let categoryFilter = '';
    let categoryParams = [];
    
    if (category) {
      categoryJoin = `
        LEFT JOIN task_category_assignments tca ON t.id = tca.task_id
        LEFT JOIN task_categories tc ON tca.category_id = tc.id
      `;
      categoryFilter = 'AND tc.name = ?';
      categoryParams = [category];
    }
    
    // Get task groups (grouped by base name)
    const taskGroups = await db.all(`
      SELECT 
        CASE 
          WHEN name LIKE '% [0-9][0-9]' THEN SUBSTR(name, 1, LENGTH(name) - 3)
          WHEN name LIKE '% [0-9]' THEN SUBSTR(name, 1, LENGTH(name) - 2)
          ELSE name
        END as base_name,
        COUNT(*) as task_count,
        SUM(total_duration) as total_time,
        SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) as completed_count,
        AVG(total_duration) as avg_time,
        MIN(date) as first_date,
        MAX(date) as last_date
      FROM tasks t
      ${categoryJoin}
      WHERE 1=1 ${dateFilter} ${categoryFilter}
      GROUP BY base_name
      ORDER BY total_time DESC
    `, [...dateParams, ...categoryParams]);
    
    // Get category statistics
    const categoryStats = await db.all(`
      SELECT 
        COALESCE(tc.name, 'Uncategorized') as category_name,
        COALESCE(tc.color, '#999999') as category_color,
        COUNT(DISTINCT t.id) as task_count,
        SUM(t.total_duration) as total_time,
        SUM(CASE WHEN t.is_completed = 1 THEN 1 ELSE 0 END) as completed_count
      FROM tasks t
      LEFT JOIN task_category_assignments tca ON t.id = tca.task_id
      LEFT JOIN task_categories tc ON tca.category_id = tc.id
      WHERE 1=1 ${dateFilter}
      GROUP BY tc.id, tc.name, tc.color
      ORDER BY total_time DESC
    `, dateParams);
    
    // Get daily statistics
    const dailyStats = await db.all(`
      SELECT 
        date,
        COUNT(*) as task_count,
        SUM(total_duration) as total_time,
        SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) as completed_count
      FROM tasks t
      ${categoryJoin}
      WHERE 1=1 ${dateFilter} ${categoryFilter}
      GROUP BY date
      ORDER BY date DESC
    `, [...dateParams, ...categoryParams]);
    
    // Get overall statistics
    const overallStats = await db.get(`
      SELECT 
        COUNT(*) as total_tasks,
        SUM(total_duration) as total_time,
        SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) as completed_tasks,
        AVG(total_duration) as avg_task_time,
        COUNT(DISTINCT date) as active_days
      FROM tasks t
      ${categoryJoin}
      WHERE 1=1 ${dateFilter} ${categoryFilter}
    `, [...dateParams, ...categoryParams]);
    
    res.json({
      overallStats: overallStats || {},
      taskGroups: taskGroups || [],
      categoryStats: categoryStats || [],
      dailyStats: dailyStats || [],
      filters: {
        days: days,
        category: category,
        startDate: startDate,
        endDate: endDate
      }
    });
    
  } catch (error) {
    console.error('Error getting task statistics:', error);
    res.status(500).json({ error: 'Failed to get task statistics' });
  }
};

/**
 * Get all task categories
 * GET /api/tasks/categories
 */
exports.getTaskCategories = async (req, res) => {
  try {
    const db = req.db;
    
    const categories = await db.all(`
      SELECT 
        tc.*,
        COUNT(tca.task_id) as task_count,
        SUM(t.total_duration) as total_time
      FROM task_categories tc
      LEFT JOIN task_category_assignments tca ON tc.id = tca.category_id
      LEFT JOIN tasks t ON tca.task_id = t.id
      GROUP BY tc.id
      ORDER BY tc.name
    `);
    
    res.json(categories || []);
  } catch (error) {
    console.error('Error getting task categories:', error);
    res.status(500).json({ error: 'Failed to get task categories' });
  }
};

/**
 * Create a new task category
 * POST /api/tasks/categories
 */
exports.createTaskCategory = async (req, res) => {
  try {
    const { name, description, color = '#4285f4' } = req.body;
    const db = req.db;
    
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    
    const categoryId = uuidv4();
    const now = Date.now();
    
    await db.run(`
      INSERT INTO task_categories (id, name, description, color, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [categoryId, name, description, color, now, now]);
    
    const newCategory = await db.get('SELECT * FROM task_categories WHERE id = ?', categoryId);
    
    res.status(201).json(newCategory);
  } catch (error) {
    console.error('Error creating task category:', error);
    res.status(500).json({ error: 'Failed to create task category' });
  }
};

/**
 * Assign task to category
 * POST /api/tasks/:taskId/category
 */
exports.assignTaskToCategory = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { categoryId } = req.body;
    const db = req.db;
    
    if (!categoryId) {
      return res.status(400).json({ error: 'Category ID is required' });
    }
    
    const assignmentId = uuidv4();
    const now = Date.now();
    
    // Remove existing assignment first
    await db.run(`
      DELETE FROM task_category_assignments WHERE task_id = ?
    `, [taskId]);
    
    // Add new assignment
    await db.run(`
      INSERT INTO task_category_assignments (id, task_id, category_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `, [assignmentId, taskId, categoryId, now, now]);
    
    res.json({ success: true, message: 'Task assigned to category successfully' });
  } catch (error) {
    console.error('Error assigning task to category:', error);
    res.status(500).json({ error: 'Failed to assign task to category' });
  }
};

/**
 * Remove task from category
 * DELETE /api/tasks/:taskId/category
 */
exports.removeTaskFromCategory = async (req, res) => {
  try {
    const { taskId } = req.params;
    const db = req.db;
    
    await db.run(`
      DELETE FROM task_category_assignments WHERE task_id = ?
    `, [taskId]);
    
    res.json({ success: true, message: 'Task removed from category successfully' });
  } catch (error) {
    console.error('Error removing task from category:', error);
    res.status(500).json({ error: 'Failed to remove task from category' });
  }
};

/**
 * Get task category
 * GET /api/tasks/:taskId/category
 */
exports.getTaskCategory = async (req, res) => {
  try {
    const { taskId } = req.params;
    const db = req.db;
    
    const result = await db.get(`
      SELECT tc.* 
      FROM task_categories tc
      JOIN task_category_assignments tca ON tc.id = tca.category_id
      WHERE tca.task_id = ?
    `, [taskId]);
    
    res.json(result || null);
  } catch (error) {
    console.error('Error getting task category:', error);
    res.status(500).json({ error: 'Failed to get task category' });
  }
};

/**
 * Get a single task category
 * GET /api/tasks/categories/:categoryId
 */
exports.getTaskCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const db = req.db;
    
    const category = await db.get(`
      SELECT * FROM task_categories WHERE id = ?
    `, [categoryId]);
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json(category);
  } catch (error) {
    console.error('Error getting task category:', error);
    res.status(500).json({ error: 'Failed to get task category' });
  }
};

/**
 * Update a task category
 * PUT /api/tasks/categories/:categoryId
 */
exports.updateTaskCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { name, description, color } = req.body;
    const db = req.db;
    
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    
    const now = Date.now();
    
    await db.run(`
      UPDATE task_categories 
      SET name = ?, description = ?, color = ?, updated_at = ?
      WHERE id = ?
    `, [name, description, color, now, categoryId]);
    
    const updatedCategory = await db.get('SELECT * FROM task_categories WHERE id = ?', categoryId);
    
    if (!updatedCategory) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json(updatedCategory);
  } catch (error) {
    console.error('Error updating task category:', error);
    res.status(500).json({ error: 'Failed to update task category' });
  }
};

/**
 * Delete a task category
 * DELETE /api/tasks/categories/:categoryId
 */
exports.deleteTaskCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const db = req.db;
    
    // Check if category exists
    const category = await db.get('SELECT * FROM task_categories WHERE id = ?', categoryId);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    // Remove all task assignments for this category
    await db.run('DELETE FROM task_category_assignments WHERE category_id = ?', categoryId);
    
    // Delete the category
    await db.run('DELETE FROM task_categories WHERE id = ?', categoryId);
    
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting task category:', error);
    res.status(500).json({ error: 'Failed to delete task category' });
  }
};

/**
 * Get a single task category by ID
 * GET /api/tasks/categories/:categoryId
 */
exports.getTaskCategoryById = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const db = req.db;
    
    const category = await db.get(`
      SELECT 
        tc.*,
        COUNT(tca.task_id) as task_count,
        SUM(t.total_duration) as total_time
      FROM task_categories tc
      LEFT JOIN task_category_assignments tca ON tc.id = tca.category_id
      LEFT JOIN tasks t ON tca.task_id = t.id
      WHERE tc.id = ?
      GROUP BY tc.id
    `, [categoryId]);
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json(category);
  } catch (error) {
    console.error('Error getting task category:', error);
    res.status(500).json({ error: 'Failed to get task category' });
  }
};