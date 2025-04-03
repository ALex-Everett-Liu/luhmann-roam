// nodeRoutes.js - Routes for node operations
const express = require('express');
const nodeController = require('../controllers/nodeController');

const router = express.Router();

// Get all top-level nodes
router.get('/', nodeController.getAllNodes);

// Get a single node by ID
router.get('/:id', nodeController.getNodeById);

// Get children of a node
router.get('/:id/children', nodeController.getChildNodes);

// Create a new node
router.post('/', nodeController.createNode);

// Update a node
router.put('/:id', nodeController.updateNode);

// Delete a node
router.delete('/:id', nodeController.deleteNode);

// Reorder nodes (when dragging)
router.post('/reorder', nodeController.reorderNodes);

// Shift node positions
router.post('/reorder/shift', nodeController.shiftNodePositions);

// Toggle node expansion
router.post('/:id/toggle', nodeController.toggleNode);

// Add additional routes for other node operations...
// (Routes for indenting, outdenting, fixing positions, etc.)

module.exports = router;