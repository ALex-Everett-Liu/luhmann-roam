// devTestRoutes.js - Routes for dev test panel operations
const express = require('express');
const devTestController = require('../controllers/devTestController');

const router = express.Router();

// Initialize dev test table
router.get('/init', devTestController.initializeTable);

// Get all dev test entries
router.get('/entries', devTestController.getEntries);

// Create a new dev test entry
router.post('/entries', devTestController.createEntry);

// Update a dev test entry
router.put('/entries/:id', devTestController.updateEntry);

// Delete a dev test entry
router.delete('/entries/:id', devTestController.deleteEntry);

// Run test for an entry
router.post('/entries/:id/run', devTestController.runTest);

// Get code statistics
router.get('/statistics', devTestController.getStatistics);

module.exports = router;