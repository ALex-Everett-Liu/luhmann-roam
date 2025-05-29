// luhmann-roam/routes/wordFrequencyRoutes.js
const express = require('express');
const router = express.Router();
const wordFrequencyService = require('../services/wordFrequencyService');

/**
 * GET /api/word-frequency
 * Retrieves word frequency analysis for node content.
 */
router.get('/', async (req, res) => {
  try {
    const frequencies = await wordFrequencyService.analyzeWordFrequency();
    res.json(frequencies);
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze word frequency' });
  }
});

module.exports = router;