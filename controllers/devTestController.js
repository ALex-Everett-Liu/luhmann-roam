// devTestController.js - Controller for dev test panel operations
const devTestService = require('../services/devTestService');
const crypto = require('crypto');

/**
 * Initialize the dev test database table
 * GET /api/dev-test/init
 */
exports.initializeTable = async (req, res) => {
  try {
    const result = await devTestService.initializeDevTestTable();
    res.json({ success: result });
  } catch (error) {
    console.error('Error initializing dev test table:', error);
    res.status(500).json({ error: 'Failed to initialize dev test table' });
  }
};

/**
 * Get all dev test entries
 * GET /api/dev-test/entries
 */
exports.getEntries = async (req, res) => {
  try {
    const { type, category } = req.query;
    const entries = await devTestService.getDevTestEntries(type, category);
    res.json(entries);
  } catch (error) {
    console.error('Error getting dev test entries:', error);
    res.status(500).json({ error: 'Failed to get dev test entries' });
  }
};

/**
 * Create a new dev test entry
 * POST /api/dev-test/entries
 */
exports.createEntry = async (req, res) => {
  try {
    const entry = await devTestService.createDevTestEntry(req.body);
    res.status(201).json(entry);
  } catch (error) {
    console.error('Error creating dev test entry:', error);
    res.status(500).json({ error: 'Failed to create dev test entry' });
  }
};

/**
 * Update a dev test entry
 * PUT /api/dev-test/entries/:id
 */
exports.updateEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await devTestService.updateDevTestEntry(id, req.body);
    res.json(entry);
  } catch (error) {
    console.error('Error updating dev test entry:', error);
    res.status(500).json({ error: 'Failed to update dev test entry' });
  }
};

/**
 * Delete a dev test entry
 * DELETE /api/dev-test/entries/:id
 */
exports.deleteEntry = async (req, res) => {
  try {
    const { id } = req.params;
    await devTestService.deleteDevTestEntry(id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting dev test entry:', error);
    res.status(500).json({ error: 'Failed to delete dev test entry' });
  }
};

/**
 * Run test for a dev test entry
 * POST /api/dev-test/entries/:id/run
 */
exports.runTest = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await devTestService.runTest(id, req.body?.testData);
    res.json(result);
  } catch (error) {
    console.error('Error running test:', error);
    res.status(500).json({ error: 'Failed to run test' });
  }
};

/**
 * Get code statistics
 * GET /api/dev-test/statistics
 */
exports.getStatistics = async (req, res) => {
  try {
    const statistics = await devTestService.getCodeStatistics();
    res.json(statistics);
  } catch (error) {
    console.error('Error getting code statistics:', error);
    res.status(500).json({ error: 'Failed to get code statistics' });
  }
};