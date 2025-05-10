// linkRoutes.js - Routes for link operations
const express = require('express');
const linkController = require('../controllers/linkController');

const router = express.Router();

// Create a new link
router.post('/', linkController.createLink);

// Update a link
router.put('/:id', linkController.updateLink);

// Delete a link
router.delete('/:id', linkController.deleteLink);

router.get('/sequence/:sequence_id', linkController.getLinkBySequenceId);

module.exports = router;