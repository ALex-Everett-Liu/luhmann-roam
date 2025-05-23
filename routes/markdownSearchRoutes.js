// markdownSearchRoutes.js - Routes for markdown search operations
const express = require('express');
const markdownSearchController = require('../controllers/markdownSearchController');

const router = express.Router();

// Search through all markdown files
router.get('/search', markdownSearchController.searchMarkdownFiles);

// Get combined search results (nodes + markdown)
router.get('/search/combined', markdownSearchController.getCombinedSearchResults);

module.exports = router;