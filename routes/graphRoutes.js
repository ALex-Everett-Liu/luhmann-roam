const express = require('express');
const router = express.Router();
const graphController = require('../controllers/graphController');

// Route to get all graph data with analysis metrics
router.get('/analysis', graphController.getGraphWithAnalysis);

// Route to run centrality analysis
router.post('/centrality', graphController.runCentralityAnalysis);

// Route to detect communities
router.post('/communities', graphController.detectCommunities);

module.exports = router;