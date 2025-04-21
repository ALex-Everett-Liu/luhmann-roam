// markdownRoutes.js - Routes for markdown operations
const express = require('express');
const markdownController = require('../controllers/markdownController');

const router = express.Router({ mergeParams: true });  // Important: mergeParams option

// Get markdown content for a node
router.get('/', markdownController.getMarkdown);

// Save markdown content for a node
router.post('/', markdownController.saveMarkdown);

// Delete markdown content for a node
router.delete('/', markdownController.deleteMarkdown);

module.exports = router;