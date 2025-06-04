// taskRoutes.js - Routes for task operations
const express = require('express');
const taskController = require('../controllers/taskController');

const router = express.Router();

// Get all dates with tasks
router.get('/dates', taskController.getTaskDates);

// Get task statistics (MUST be before /:date route)
router.get('/statistics', taskController.getTaskStatistics);

// Task categories routes (MUST be before /:date route)
router.get('/categories', taskController.getTaskCategories);
router.post('/categories', taskController.createTaskCategory);
router.get('/:taskId/category', taskController.getTaskCategory);

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

// Task category assignment routes
router.post('/:taskId/category', taskController.assignTaskToCategory);
router.delete('/:taskId/category', taskController.removeTaskFromCategory);

router.get('/sequence/:sequence_id', taskController.getTaskBySequenceId);

module.exports = router;