// taskRoutes.js - Routes for task operations
const express = require('express');
const taskController = require('../controllers/taskController');

const router = express.Router();

// Get all dates with tasks
router.get('/dates', taskController.getTaskDates);

// Get tasks for a specific date
router.get('/:date', taskController.getTasksByDate);

// Create a new task
router.post('/', taskController.createTask);

// Update a task
router.put('/:id', taskController.updateTask);

// Delete a task
router.delete('/:id', taskController.deleteTask);

// Start timing a task
router.post('/:id/start', taskController.startTask);

// Pause timing a task
router.post('/:id/pause', taskController.pauseTask);

router.get('/sequence/:sequence_id', taskController.getTaskBySequenceId);

// Get task statistics
router.get('/statistics', taskController.getTaskStatistics);

// Task categories routes
router.get('/categories', taskController.getTaskCategories);
router.post('/categories', taskController.createTaskCategory);

// Task category assignment routes
router.post('/:taskId/category', taskController.assignTaskToCategory);
router.delete('/:taskId/category', taskController.removeTaskFromCategory);

module.exports = router;