// attributeRoutes.js - Routes for attribute operations
const express = require('express');
const attributeController = require('../controllers/attributeController');

const router = express.Router();

// Create a new attribute
router.post('/', attributeController.createAttribute);

// Update an attribute
router.put('/:id', attributeController.updateAttribute);

// Delete an attribute
router.delete('/:id', attributeController.deleteAttribute);

module.exports = router;