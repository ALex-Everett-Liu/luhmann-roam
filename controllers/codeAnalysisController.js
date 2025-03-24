// codeAnalysisController.js - Logic for code analysis operations
const codeAnalysisService = require('../services/codeAnalysisService');

/**
 * Get code structure analysis
 * GET /api/code-analysis/structure
 */
exports.getCodeStructure = async (req, res) => {
  try {
    const codeStructure = await codeAnalysisService.analyzeCodebase();
    res.json(codeStructure);
  } catch (error) {
    console.error('Error analyzing codebase:', error);
    res.status(500).json({ error: 'Failed to analyze codebase' });
  }
};