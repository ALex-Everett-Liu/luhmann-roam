const express = require('express');
const router = express.Router();
const globalGraphController = require('../controllers/globalGraphController');

// Get complete global graph data
router.get('/', globalGraphController.getGlobalGraph);

// Get graph statistics
router.get('/stats', globalGraphController.getGraphStats);

// Cache management endpoints
router.get('/cache/status', globalGraphController.getCacheStatus);
router.delete('/cache', globalGraphController.clearCache);

// Calculate specific centrality measure
router.get('/centrality/:measure', globalGraphController.calculateCentrality);

// Calculate all centrality measures
router.post('/centrality/calculate-all', globalGraphController.calculateAllCentralities);

// Search nodes
router.get('/search', globalGraphController.searchNodes);

// Get node neighbors
router.get('/nodes/:nodeId/neighbors', globalGraphController.getNodeNeighbors);

// Get centrality data for a specific node
router.get('/nodes/:nodeId/centrality', globalGraphController.getNodeCentrality);

// Calculate centrality for a specific node
router.post('/nodes/:nodeId/calculate-centrality', globalGraphController.calculateNodeCentrality);

module.exports = router;