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
    console.error('Error in word frequency analysis:', error);
    res.status(500).json({ error: 'Failed to analyze word frequency' });
  }
});

/**
 * GET /api/word-frequency/search
 * Search for words and their variants in the frequency data.
 * Query parameters:
 *   - q: search term (required)
 */
router.get('/search', async (req, res) => {
  try {
    const { q: searchTerm } = req.query;
    
    if (!searchTerm) {
      return res.status(400).json({ error: 'Search term (q) is required' });
    }
    
    const searchResults = await wordFrequencyService.searchWordFrequency(searchTerm);
    res.json(searchResults);
  } catch (error) {
    console.error('Error in word frequency search:', error);
    res.status(500).json({ error: 'Failed to search word frequency' });
  }
});

/**
 * GET /api/word-frequency/suggestions
 * Get word suggestions based on partial input.
 * Query parameters:
 *   - q: partial word (required)
 *   - limit: maximum number of suggestions (optional, default: 10)
 */
router.get('/suggestions', async (req, res) => {
  try {
    const { q: partialWord, limit } = req.query;
    
    if (!partialWord) {
      return res.status(400).json({ error: 'Partial word (q) is required' });
    }
    
    const maxLimit = limit ? parseInt(limit, 10) : 10;
    if (isNaN(maxLimit) || maxLimit < 1 || maxLimit > 50) {
      return res.status(400).json({ error: 'Limit must be a number between 1 and 50' });
    }
    
    const suggestions = await wordFrequencyService.getWordSuggestions(partialWord, maxLimit);
    res.json(suggestions);
  } catch (error) {
    console.error('Error getting word suggestions:', error);
    res.status(500).json({ error: 'Failed to get word suggestions' });
  }
});

module.exports = router;