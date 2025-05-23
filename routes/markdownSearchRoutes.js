// markdownSearchRoutes.js - Routes for markdown search operations
const express = require('express');
const markdownSearchController = require('../controllers/markdownSearchController');

const router = express.Router();

// Search through all markdown files
// This will handle: GET /api/markdown/search
router.get('/search', markdownSearchController.searchMarkdownFiles);

// Get combined search results (nodes + markdown)  
// This will handle: GET /api/search/combined
router.get('/combined', markdownSearchController.getCombinedSearchResults);

module.exports = router;