// routes/databaseExportImportRoutes.js
const express = require('express');
const router = express.Router();
const databaseController = require('../controllers/databaseExportImportController');

// Export selected tables
router.post('/export', databaseController.exportTables);

// Import data
router.post('/import', databaseController.importData);

// List all available tables
router.get('/tables', databaseController.listTables);

// Get table schema
router.get('/schema/:table', databaseController.getTableSchema);

// Export node tree
router.post('/export-node-tree', databaseController.exportNodeTree);

module.exports = router;