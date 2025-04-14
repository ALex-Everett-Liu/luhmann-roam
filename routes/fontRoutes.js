// fontRoutes.js - Routes for font operations
const express = require('express');
const fontController = require('../controllers/fontController');

const router = express.Router();

// Download a font
router.post('/download', fontController.downloadFont);

// List all fonts
router.get('/', fontController.listFonts);

// Add more routes for font operations as needed

module.exports = router;