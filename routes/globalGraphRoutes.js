const express = require('express');
const router = express.Router();
const globalGraphController = require('../controllers/globalGraphController');

// Get complete global graph data
router.get('/', globalGraphController.getGlobalGraph);

// Get graph statistics
router.get('/stats', globalGraphController.getGraphStats);

// Calculate specific centrality measure
router.get('/centrality/:measure', globalGraphController.calculateCentrality);

// Search nodes
router.get('/search', globalGraphController.searchNodes);

// Get node neighbors
router.get('/nodes/:nodeId/neighbors', globalGraphController.getNodeNeighbors);

module.exports = router;