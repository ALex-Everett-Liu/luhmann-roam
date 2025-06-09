const express = require('express');
const router = express.Router();
const enhancedCodeGraphController = require('../controllers/enhancedCodeGraphController');

// =================================================================
// DATABASE INITIALIZATION
// =================================================================
router.post('/initialize', enhancedCodeGraphController.initializeDatabase);

// =================================================================
// PROJECT ROUTES
// =================================================================
router.post('/projects', enhancedCodeGraphController.createProject);
router.get('/projects', enhancedCodeGraphController.getAllProjects);
router.get('/projects/:projectId', enhancedCodeGraphController.getProject);
router.put('/projects/:projectId', enhancedCodeGraphController.updateProject);
router.delete('/projects/:projectId', enhancedCodeGraphController.deleteProject);

// Project analytics
router.get('/projects/:projectId/analytics', enhancedCodeGraphController.getProjectAnalytics);

// =================================================================
// FUNCTION ROUTES
// =================================================================
router.post('/functions', enhancedCodeGraphController.createFunction);
router.get('/functions/:functionId', enhancedCodeGraphController.getFunction);
router.put('/functions/:functionId', enhancedCodeGraphController.updateFunction);
router.delete('/functions/:functionId', enhancedCodeGraphController.deleteFunction);

// Functions by project
router.get('/projects/:projectId/functions', enhancedCodeGraphController.getFunctionsByProject);

// =================================================================
// VARIABLE ROUTES
// =================================================================
router.post('/variables', enhancedCodeGraphController.createVariable);
router.get('/variables/:variableId', enhancedCodeGraphController.getVariable);
router.put('/variables/:variableId', enhancedCodeGraphController.updateVariable);
router.delete('/variables/:variableId', enhancedCodeGraphController.deleteVariable);

// Variables by project and function
router.get('/projects/:projectId/variables', enhancedCodeGraphController.getVariablesByProject);
router.get('/functions/:functionId/variables', enhancedCodeGraphController.getVariablesByFunction);

// =================================================================
// DEPENDENCY ROUTES
// =================================================================
router.post('/dependencies', enhancedCodeGraphController.createDependency);
router.get('/dependencies/:dependencyId', enhancedCodeGraphController.getDependency);
router.put('/dependencies/:dependencyId', enhancedCodeGraphController.updateDependency);
router.delete('/dependencies/:dependencyId', enhancedCodeGraphController.deleteDependency);

// Dependencies by project
router.get('/projects/:projectId/dependencies', enhancedCodeGraphController.getDependenciesByProject);

// =================================================================
// TEMPLATE ROUTES
// =================================================================
router.get('/templates', enhancedCodeGraphController.getAvailableTemplates);
router.post('/templates/create', enhancedCodeGraphController.createProjectFromTemplate);

// =================================================================
// VISUALIZATION ROUTES
// =================================================================
router.get('/visualization/:projectId', enhancedCodeGraphController.getVisualizationData);

// =================================================================
// EXPORT/IMPORT ROUTES
// =================================================================
router.get('/projects/:projectId/export', enhancedCodeGraphController.exportProjectStructure);
router.post('/projects/import', enhancedCodeGraphController.importProjectStructure);
router.put('/projects/:projectId/import-update', enhancedCodeGraphController.updateProjectFromImport);

module.exports = router;