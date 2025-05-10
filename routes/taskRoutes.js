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

module.exports = router;