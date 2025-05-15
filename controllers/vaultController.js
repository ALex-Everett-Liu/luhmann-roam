// controllers/vaultController.js
const fs = require('fs');
const path = require('path');
const { getDb, initializeDatabase } = require('../database');

// Path to vaults directory
const vaultsDir = path.join(__dirname, '..', 'vaults');

/**
 * List all available vaults
 */
exports.listVaults = async (req, res) => {
  try {
    // Main vault is always available
    const vaults = ['main'];
    
    // Get all .db files from vaults directory
    if (fs.existsSync(vaultsDir)) {
      const files = fs.readdirSync(vaultsDir);
      files.forEach(file => {
        if (file.endsWith('.db')) {
          vaults.push(file.replace('.db', ''));
        }
      });
    }
    
    res.json({ 
      vaults,
      currentVault: req.currentVault
    });
  } catch (error) {
    console.error('Error listing vaults:', error);
    res.status(500).json({ error: 'Failed to list vaults' });
  }
};

/**
 * Create a new vault
 */
exports.createVault = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name || !/^[a-zA-Z0-9_-]+$/.test(name)) {
      return res.status(400).json({ error: 'Invalid vault name. Use only letters, numbers, hyphens and underscores.' });
    }
    
    // Check if vault already exists
    const dbPath = path.join(vaultsDir, `${name}.db`);
    if (fs.existsSync(dbPath)) {
      return res.status(409).json({ error: 'Vault already exists' });
    }
    
    // Create vaults directory if it doesn't exist
    if (!fs.existsSync(vaultsDir)) {
      fs.mkdirSync(vaultsDir);
    }
    
    // FIX: Pass the vault name, not the connection object
    await initializeDatabase(name);
    
    // Store vault metadata
    const metadataPath = path.join(vaultsDir, `${name}.json`);
    fs.writeFileSync(metadataPath, JSON.stringify({
      name,
      description: description || '',
      created: new Date().toISOString()
    }));
    
    res.json({ 
      success: true, 
      vault: name,
      message: `Vault "${name}" created successfully`
    });
  } catch (error) {
    console.error('Error creating vault:', error);
    res.status(500).json({ error: 'Failed to create vault' });
  }
};

/**
 * Switch the current vault
 */
exports.switchVault = async (req, res) => {
  try {
    const { vault } = req.body;
    
    if (!vault) {
      return res.status(400).json({ error: 'Vault name is required' });
    }
    
    // Check if vault exists
    const dbPath = vault === 'main' 
      ? path.join(__dirname, '..', 'outliner.db')
      : path.join(vaultsDir, `${vault}.db`);
    
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: 'Vault not found' });
    }
    
    // Update current vault
    req.app.locals.currentVault = vault;
    
    res.json({ 
      success: true, 
      currentVault: vault,
      message: `Switched to vault "${vault}"`
    });
  } catch (error) {
    console.error('Error switching vault:', error);
    res.status(500).json({ error: 'Failed to switch vault' });
  }
};

/**
 * Delete a vault
 */
exports.deleteVault = async (req, res) => {
  try {
    const { vaultName } = req.params;
    
    if (vaultName === 'main') {
      return res.status(400).json({ error: 'Cannot delete the main vault' });
    }
    
    // Check if vault exists
    const dbPath = path.join(vaultsDir, `${vaultName}.db`);
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: 'Vault not found' });
    }
    
    // Delete the vault file
    fs.unlinkSync(dbPath);
    
    // Delete metadata if exists
    const metadataPath = path.join(vaultsDir, `${vaultName}.json`);
    if (fs.existsSync(metadataPath)) {
      fs.unlinkSync(metadataPath);
    }
    
    res.json({ 
      success: true, 
      message: `Vault "${vaultName}" deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting vault:', error);
    res.status(500).json({ error: 'Failed to delete vault' });
  }
};