// codeAnalysisRoutes.js - Routes for code analysis operations
const express = require('express');
const codeAnalysisController = require('../controllers/codeAnalysisController');

const router = express.Router();

// Get code structure analysis
router.get('/structure', codeAnalysisController.getCodeStructure);

module.exports = router;