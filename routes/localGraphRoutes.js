const express = require('express');
const router = express.Router();
const localGraphController = require('../controllers/localGraphController');

router.get('/exists', nodeController.checkNodesExist);

// Get local graph data centered around a specific node
router.get('/center/:centerNodeId', localGraphController.getLocalGraph);

// Create a new node in the local graph and main outliner
router.post('/nodes', localGraphController.createNodeInLocalGraph);

// Get suggested parent nodes for placing new nodes
router.get('/suggested-parents/:centerNodeId', localGraphController.getSuggestedParents);

// Focus a node in the main outliner
router.get('/focus/:nodeId', localGraphController.focusNodeInOutliner);

module.exports = router;