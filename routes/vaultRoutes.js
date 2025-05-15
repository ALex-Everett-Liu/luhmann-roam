// routes/vaultRoutes.js
const express = require('express');
const router = express.Router();
const vaultController = require('../controllers/vaultController');

// List all available vaults
router.get('/', vaultController.listVaults);

// Create a new vault
router.post('/', vaultController.createVault);

// Switch current vault
router.post('/switch', vaultController.switchVault);

// Delete a vault
router.delete('/:vaultName', vaultController.deleteVault);

module.exports = router;