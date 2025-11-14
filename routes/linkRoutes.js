// linkRoutes.js - Routes for link operations (minimal version)
const express = require('express');
const linkController = require('../controllers/linkController');

const router = express.Router();

// Get all links for a node
router.get('/node/:id', linkController.getNodeLinks);

// Create a new link
router.post('/', linkController.createLink);

// Update a link
router.put('/:id', linkController.updateLink);

// Delete a link
router.delete('/:id', linkController.deleteLink);

module.exports = router;