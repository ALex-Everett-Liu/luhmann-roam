const express = require('express');
const router = express.Router();
const newCodeGraphController = require('../controllers/newCodeGraphController');

// Use the named exports for route handlers
router.post('/initialize', newCodeGraphController.initializeDatabase);
router.post('/projects', newCodeGraphController.createProject);
router.get('/projects', newCodeGraphController.getProjects);
router.post('/analyze-dcim-example', newCodeGraphController.analyzeDcimExample);
router.get('/visualization/:projectId', newCodeGraphController.getVisualization);

module.exports = router;