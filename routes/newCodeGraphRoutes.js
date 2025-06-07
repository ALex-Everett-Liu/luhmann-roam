const express = require('express');
const router = express.Router();
const newCodeGraphController = require('../controllers/newCodeGraphController');

// =================================================================
// BASIC ROUTES
// =================================================================
router.post('/initialize', newCodeGraphController.initializeDatabase);
router.post('/analyze-dcim-example', newCodeGraphController.analyzeDcimExample);
router.post('/create-saved-dcim-example', newCodeGraphController.createSavedDcimExample);
router.get('/relationship-types', newCodeGraphController.getRelationshipTypes);

// =================================================================
// PROJECT ROUTES - Full CRUD
// =================================================================
router.get('/projects', newCodeGraphController.getProjects);
router.post('/projects', newCodeGraphController.createProject);
router.get('/projects/:projectId', newCodeGraphController.getProject);
router.put('/projects/:projectId', newCodeGraphController.updateProject);
router.delete('/projects/:projectId', newCodeGraphController.deleteProject);

// =================================================================
// FUNCTION ROUTES - Full CRUD
// =================================================================
router.get('/projects/:projectId/functions', newCodeGraphController.getFunctions);
router.post('/projects/:projectId/functions', newCodeGraphController.createFunction);
router.put('/functions/:functionId', newCodeGraphController.updateFunction);
router.delete('/functions/:functionId', newCodeGraphController.deleteFunction);

// =================================================================
// VARIABLE ROUTES - Full CRUD
// =================================================================
router.get('/projects/:projectId/variables', newCodeGraphController.getVariables);
router.post('/projects/:projectId/variables', newCodeGraphController.createVariable);
router.put('/variables/:variableId', newCodeGraphController.updateVariable);
router.delete('/variables/:variableId', newCodeGraphController.deleteVariable);

// =================================================================
// DEPENDENCY ROUTES - Full CRUD
// =================================================================
router.get('/projects/:projectId/dependencies', newCodeGraphController.getDependencies);
router.post('/projects/:projectId/dependencies', newCodeGraphController.createDependency);
router.put('/dependencies/:dependencyId', newCodeGraphController.updateDependency);
router.delete('/dependencies/:dependencyId', newCodeGraphController.deleteDependency);

// =================================================================
// VISUALIZATION ROUTES
// =================================================================
router.get('/visualization/:projectId', newCodeGraphController.getVisualization);

module.exports = router;