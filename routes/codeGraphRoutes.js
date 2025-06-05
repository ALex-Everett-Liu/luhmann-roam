const express = require('express');
const router = express.Router();
const codeGraphController = require('../controllers/codeGraphController');

// Entity routes
router.get('/entities', codeGraphController.getAllEntities);
router.post('/entities', codeGraphController.createEntity);
router.put('/entities/:id', codeGraphController.updateEntity);
router.delete('/entities/:id', codeGraphController.deleteEntity);
router.get('/entities/:id', codeGraphController.getEntity);

// Relationship routes
router.get('/relationships', codeGraphController.getAllRelationships);
router.post('/relationships', codeGraphController.createRelationship);
router.put('/relationships/:id', codeGraphController.updateRelationship);
router.delete('/relationships/:id', codeGraphController.deleteRelationship);

// Project routes
router.get('/projects', codeGraphController.getAllProjects);
router.post('/projects', codeGraphController.createProject);
router.put('/projects/:id', codeGraphController.updateProject);
router.delete('/projects/:id', codeGraphController.deleteProject);

// Analysis routes
router.get('/analysis/metrics', codeGraphController.getAnalysisMetrics);
router.post('/analysis/complexity', codeGraphController.analyzeComplexity);
router.post('/analysis/dependencies', codeGraphController.analyzeDependencies);
router.post('/analysis/coupling', codeGraphController.analyzeCoupling);

// Visualization routes
router.get('/visualization/graph', codeGraphController.getGraphVisualization);
router.get('/visualization/flow/:entityId', codeGraphController.getDataFlow);

// Import utilities
router.post('/import/from-files', codeGraphController.importFromFiles);

// Variables routes
router.get('/variables', codeGraphController.getVariables);
router.get('/variables/:id', codeGraphController.getVariable);
router.post('/variables', codeGraphController.createVariable);
router.put('/variables/:id', codeGraphController.updateVariable);
router.delete('/variables/:id', codeGraphController.deleteVariable);

// Method calls routes
router.get('/method-calls', codeGraphController.getMethodCalls);
router.get('/method-calls/:id', codeGraphController.getMethodCall);
router.post('/method-calls', codeGraphController.createMethodCall);
router.put('/method-calls/:id', codeGraphController.updateMethodCall);
router.delete('/method-calls/:id', codeGraphController.deleteMethodCall);

// Data flow routes
router.get('/data-flow', codeGraphController.getDataFlow);
router.post('/data-flow', codeGraphController.createDataFlow);
router.put('/data-flow/:id', codeGraphController.updateDataFlow);
router.delete('/data-flow/:id', codeGraphController.deleteDataFlow);

// Expression analysis routes
router.post('/expressions/save-analysis', codeGraphController.saveExpressionAnalysis);
router.post('/expressions/auto-analyze', codeGraphController.analyzeExpression);

module.exports = router;