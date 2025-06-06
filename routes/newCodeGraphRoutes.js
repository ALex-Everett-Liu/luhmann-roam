const express = require('express');
const router = express.Router();
const newCodeGraphController = require('../controllers/newCodeGraphController');

// Initialize database
router.post('/initialize', newCodeGraphController.initializeDatabase);

// Create project
router.post('/projects', newCodeGraphController.createProject);

// Get all projects
router.get('/projects', newCodeGraphController.getProjects);

// Analyze DCIM example (our specific test case)
router.post('/analyze-dcim-example', newCodeGraphController.analyzeDcimExample);

// Get visualization data for a project
router.get('/visualization/:projectId', newCodeGraphController.getVisualization);

module.exports = router;