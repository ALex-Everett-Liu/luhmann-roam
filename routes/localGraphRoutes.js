const express = require('express');
const router = express.Router();
const localGraphController = require('../controllers/localGraphController');

// Pool management routes
router.get('/pool', localGraphController.getLocalGraphPool);
router.post('/pool/nodes', localGraphController.addNodeToPool);
router.delete('/pool/nodes/:nodeId', localGraphController.removeNodeFromPool);
router.post('/pool/links', localGraphController.addLinkToPool);
router.delete('/pool/links/:linkId', localGraphController.removeLinkFromPool);
router.get('/pool/check-node/:nodeId', localGraphController.checkNodeInPool);

// Get local graph data centered around a specific node
router.get('/center/:centerNodeId', localGraphController.getLocalGraph);

// Create a new node in the local graph and main outliner
router.post('/nodes', localGraphController.createNodeInLocalGraph);

// Get suggested parent nodes for placing new nodes
router.get('/suggested-parents/:centerNodeId', localGraphController.getSuggestedParents);

// Focus a node in the main outliner
router.get('/focus/:nodeId', localGraphController.focusNodeInOutliner);

module.exports = router;