const express = require('express');
const router = express.Router();
const graphManagementController = require('../controllers/graphManagementController');

// Vertex routes
router.get('/vertices', graphManagementController.getAllVertices);
router.post('/vertices', graphManagementController.createVertex);
router.put('/vertices/:id', graphManagementController.updateVertex);
router.delete('/vertices/:id', graphManagementController.deleteVertex);

// Edge routes
router.get('/edges', graphManagementController.getAllEdges);
router.post('/edges', graphManagementController.createEdge);
router.put('/edges/:id', graphManagementController.updateEdge);
router.delete('/edges/:id', graphManagementController.deleteEdge);

// Import utilities
router.post('/import/nodes', graphManagementController.importFromNodes);

module.exports = router;