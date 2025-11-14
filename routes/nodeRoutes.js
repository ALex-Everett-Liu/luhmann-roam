// nodeRoutes.js - Routes for node operations
const express = require('express');
const nodeController = require('../controllers/nodeController');

const router = express.Router();

// Add debug logging
console.log('Setting up node routes...');

// Add this BEFORE routes with :id params
router.get('/search', nodeController.searchNodes);
router.get('/exists', nodeController.checkNodesExist);

console.log('Node routes setup complete');

// Get all top-level nodes
router.get('/', nodeController.getAllRootNodes);

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

// Links functionality removed for minimal version

// Get node by sequence ID
router.get('/sequence/:sequence_id', nodeController.getNodeBySequenceId);

module.exports = router;