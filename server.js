const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { getDb, initializeDatabase, populateSequenceIds } = require('./database');
const fs = require('fs');
const path = require('path');
const taskRoutes = require('./routes/taskRoutes');
const nodeRoutes = require('./routes/nodeRoutes');
const codeAnalysisRoutes = require('./routes/codeAnalysisRoutes');
const crypto = require('crypto');
const axios = require('axios');
const url = require('url');
const fontRoutes = require('./routes/fontRoutes');
const sanitizeHtml = require('sanitize-html');
const blogRoutes = require('./routes/blogRoutes');
const blogController = require('./controllers/blogController');
const markdownRoutes = require('./routes/markdownRoutes');
const linkRoutes = require('./routes/linkRoutes');
const attributeRoutes = require('./routes/attributeRoutes');
const dcimRoutes = require('./routes/dcimRoutes');
const sharp = require('sharp');
const upload = require('./middleware/upload');
const devTestRoutes = require('./routes/devTestRoutes');
const databaseExportImportRoutes = require('./routes/databaseExportImportRoutes');
const vaultRoutes = require('./routes/vaultRoutes');
const metroMapRoutes = require('./routes/metroMapRoutes');

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Explicitly set up the attachment directory
app.use('/attachment', express.static(path.join(__dirname, 'public/attachment')));

// Add language preference middleware
app.use((req, res, next) => {
  req.lang = req.query.lang || 'en'; // Default to English if not specified
  next();
});

// Initialize database
let db;
initializeDatabase()
  .then(database => {
    db = database;
    console.log('Database initialized successfully');
    return populateSequenceIds();
  })
  .then(result => {
    console.log('Sequence IDs populated:', result);
  })
  .catch(err => {
    console.error('Error during initialization:', err);
  });

// Add this middleware to create a fresh db connection for each request
app.use(async (req, res, next) => {
  try {
    req.db = await getDb();  // This will use the current global.currentVault
    next();
  } catch (err) {
    console.error('Error creating database connection:', err);
    res.status(500).json({ error: 'Database connection error' });
  }
});

// Routes

// Use the node routes
app.use('/api/nodes', nodeRoutes);

// Get node above
app.get('/api/nodes/:id/above', async (req, res) => {
  try {
    const { id } = req.params;
    const node = await req.db.get('SELECT * FROM nodes WHERE id = ?', id);
    
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    let nodeAbove;
    
    if (node.parent_id) {
      // If it has a parent, get siblings with position less than current node
      nodeAbove = await req.db.get(
        'SELECT * FROM nodes WHERE parent_id = ? AND position < ? ORDER BY position DESC LIMIT 1',
        [node.parent_id, node.position]
      );
    } else {
      // If it's a root node, get the root node above it
      nodeAbove = await req.db.get(
        'SELECT * FROM nodes WHERE parent_id IS NULL AND position < ? ORDER BY position DESC LIMIT 1',
        [node.position]
      );
    }
    
    if (nodeAbove) {
      res.json(nodeAbove);
    } else {
      res.status(404).json({ error: 'No node above' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Handle indenting a node
app.post('/api/nodes/:id/indent', async (req, res) => {
  try {
    const { id } = req.params;
    const node = await req.db.get('SELECT * FROM nodes WHERE id = ?', id);
    
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    // Can't indent a root node without siblings above it
    if (!node.parent_id && node.position === 0) {
      return res.status(400).json({ error: 'Cannot indent the first root node' });
    }
    
    let nodeAbove;
    
    if (node.parent_id) {
      // If it has a parent, get siblings with position less than current node
      nodeAbove = await req.db.get(
        'SELECT * FROM nodes WHERE parent_id = ? AND position < ? ORDER BY position DESC LIMIT 1',
        [node.parent_id, node.position]
      );
    } else {
      // If it's a root node, get the root node above it
      nodeAbove = await req.db.get(
        'SELECT * FROM nodes WHERE parent_id IS NULL AND position < ? ORDER BY position DESC LIMIT 1',
        [node.position]
      );
    }
    
    if (!nodeAbove) {
      return res.status(400).json({ error: 'No node above to make parent' });
    }
    
    // Get children of the node above
    const children = await req.db.all('SELECT * FROM nodes WHERE parent_id = ? ORDER BY position', nodeAbove.id);
    const maxPosition = children.length;
    
    // Start a transaction
    await req.db.run('BEGIN TRANSACTION');
    
    // Update positions of nodes in old parent
    if (node.parent_id) {
      await req.db.run(
        'UPDATE nodes SET position = position - 1 WHERE parent_id = ? AND position > ?',
        [node.parent_id, node.position]
      );
    } else {
      await req.db.run(
        'UPDATE nodes SET position = position - 1 WHERE parent_id IS NULL AND position > ?',
        node.position
      );
    }
    
    // Update the node itself
    await req.db.run(
      'UPDATE nodes SET parent_id = ?, position = ?, updated_at = ? WHERE id = ?',
      [nodeAbove.id, maxPosition, Date.now(), id]
    );
    
    // Ensure the parent is expanded
    await req.db.run(
      'UPDATE nodes SET is_expanded = 1, updated_at = ? WHERE id = ?',
      [Date.now(), nodeAbove.id]
    );
    
    await req.db.run('COMMIT');
    
    res.json({ success: true });
  } catch (error) {
    await req.db.run('ROLLBACK');
    res.status(500).json({ error: error.message });
  }
});

// Handle outdenting a node
app.post('/api/nodes/:id/outdent', async (req, res) => {
  try {
    const { id } = req.params;
    const node = await req.db.get('SELECT * FROM nodes WHERE id = ?', id);
    
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    // Can't outdent a root node
    if (!node.parent_id) {
      return res.status(400).json({ error: 'Cannot outdent a root node' });
    }
    
    // Get the parent node
    const parentNode = await req.db.get('SELECT * FROM nodes WHERE id = ?', node.parent_id);
    
    // Start a transaction
    await req.db.run('BEGIN TRANSACTION');
    
    // Update positions of nodes in old parent
    await req.db.run(
      'UPDATE nodes SET position = position - 1 WHERE parent_id = ? AND position > ?',
      [node.parent_id, node.position]
    );
    
    let targetPosition;
    
    if (parentNode.parent_id) {
      // Parent has a parent, find parent's next sibling position
      const parentSiblings = await req.db.all(
        'SELECT * FROM nodes WHERE parent_id = ? AND position > ? ORDER BY position',
        [parentNode.parent_id, parentNode.position]
      );
      
      if (parentSiblings.length > 0) {
        // Insert at parent's sibling position
        targetPosition = parentNode.position + 1;
        
        // Shift parent's siblings
        await req.db.run(
          'UPDATE nodes SET position = position + 1 WHERE parent_id = ? AND position > ?',
          [parentNode.parent_id, parentNode.position]
        );
      } else {
        // Parent is the last child, so insert at the end
        targetPosition = parentNode.position + 1;
      }
      
      // Update the node
      await req.db.run(
        'UPDATE nodes SET parent_id = ?, position = ?, updated_at = ? WHERE id = ?',
        [parentNode.parent_id, targetPosition, Date.now(), id]
      );
    } else {
      // Parent is a root node, find position for new root node
      const rootCount = await req.db.get('SELECT COUNT(*) as count FROM nodes WHERE parent_id IS NULL');
      targetPosition = rootCount.count;
      
      // Update the node to be a root node
      await req.db.run(
        'UPDATE nodes SET parent_id = NULL, position = ?, updated_at = ? WHERE id = ?',
        [targetPosition, Date.now(), id]
      );
    }
    
    await req.db.run('COMMIT');
    
    res.json({ success: true });
  } catch (error) {
    await req.db.run('ROLLBACK');
    res.status(500).json({ error: error.message });
  }
});

// Move node up
app.post('/api/nodes/:id/move-up', async (req, res) => {
  try {
    const { id } = req.params;
    const node = await req.db.get('SELECT * FROM nodes WHERE id = ?', id);
    
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    // Can't move up if it's already at the top
    if (node.position === 0) {
      return res.status(400).json({ error: 'Node is already at the top' });
    }
    
    // Start a transaction
    await req.db.run('BEGIN TRANSACTION');
    
    // Find the node directly above this one
    let nodeAbove;
    if (node.parent_id) {
      nodeAbove = await req.db.get(
        'SELECT * FROM nodes WHERE parent_id = ? AND position = ?',
        [node.parent_id, node.position - 1]
      );
    } else {
      nodeAbove = await req.db.get(
        'SELECT * FROM nodes WHERE parent_id IS NULL AND position = ?',
        [node.position - 1]
      );
    }
    
    if (!nodeAbove) {
      await req.db.run('ROLLBACK');
      return res.status(400).json({ error: 'No node above to swap with' });
    }
    
    // Swap positions
    await req.db.run(
      'UPDATE nodes SET position = ?, updated_at = ? WHERE id = ?',
      [node.position, Date.now(), nodeAbove.id]
    );
    
    await req.db.run(
      'UPDATE nodes SET position = ?, updated_at = ? WHERE id = ?',
      [node.position - 1, Date.now(), id]
    );
    
    await req.db.run('COMMIT');
    
    res.json({ success: true });
  } catch (error) {
    await req.db.run('ROLLBACK');
    res.status(500).json({ error: error.message });
  }
});

// Move node down
app.post('/api/nodes/:id/move-down', async (req, res) => {
  try {
    const { id } = req.params;
    const node = await req.db.get('SELECT * FROM nodes WHERE id = ?', id);
    
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    // Find the node directly below this one
    let nodeBelow;
    if (node.parent_id) {
      nodeBelow = await req.db.get(
        'SELECT * FROM nodes WHERE parent_id = ? AND position = ?',
        [node.parent_id, node.position + 1]
      );
    } else {
      nodeBelow = await req.db.get(
        'SELECT * FROM nodes WHERE parent_id IS NULL AND position = ?',
        [node.position + 1]
      );
    }
    
    // Can't move down if it's already at the bottom
    if (!nodeBelow) {
      return res.status(400).json({ error: 'Node is already at the bottom' });
    }
    
    // Start a transaction
    await req.db.run('BEGIN TRANSACTION');
    
    // Swap positions
    await req.db.run(
      'UPDATE nodes SET position = ?, updated_at = ? WHERE id = ?',
      [node.position, Date.now(), nodeBelow.id]
    );
    
    await req.db.run(
      'UPDATE nodes SET position = ?, updated_at = ? WHERE id = ?',
      [node.position + 1, Date.now(), id]
    );
    
    await req.db.run('COMMIT');
    
    res.json({ success: true });
  } catch (error) {
    await req.db.run('ROLLBACK');
    res.status(500).json({ error: error.message });
  }
});


// Task Management API Endpoints

// Set up task routes
app.use('/api/tasks', taskRoutes);

// Add this where you set up the other routes (near the taskRoutes)
app.use('/api/code-analysis', codeAnalysisRoutes);


// Add this middleware to ensure correct MIME types for CSS files
app.use('*.css', (req, res, next) => {
  res.header('Content-Type', 'text/css');
  next();
});

// Add this to your existing routes in server.js
app.post('/api/nodes/reorder/shift', async (req, res) => {
  try {
    const { parentId, position, shift } = req.body;
    
    // Input validation
    if (shift === undefined || position === undefined) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    const db = await getDb();
    
    // Get all nodes at the same level that need their positions updated
    let nodesToUpdate;
    if (parentId) {
      // For child nodes under a parent
      nodesToUpdate = await db.all(
        'SELECT id, position FROM nodes WHERE parent_id = ? AND position >= ? ORDER BY position',
        [parentId, position]
      );
    } else {
      // For root level nodes
      nodesToUpdate = await db.all(
        'SELECT id, position FROM nodes WHERE parent_id IS NULL AND position >= ? ORDER BY position',
        [position]
      );
    }
    
    // Update positions in a transaction to ensure consistency
    await db.run('BEGIN TRANSACTION');
    
    for (const node of nodesToUpdate) {
      const newPosition = node.position + shift;
      await db.run(
        'UPDATE nodes SET position = ?, updated_at = ? WHERE id = ?',
        [newPosition, Date.now(), node.id]
      );
    }
    
    await db.run('COMMIT');
    
    res.json({ success: true, nodesUpdated: nodesToUpdate.length });
  } catch (error) {
    console.error('Error in shift reorder:', error);
    // Rollback transaction if an error occurred
    const db = await getDb();
    await db.run('ROLLBACK');
    res.status(500).json({ error: 'Failed to update node positions' });
  }
});

// Add this endpoint to fix position conflicts
app.post('/api/nodes/fix-positions', async (req, res) => {
  try {
    const { parentId, conflicts } = req.body;
    
    // Start a transaction to ensure all updates succeed or fail together
    await req.db.run('BEGIN TRANSACTION');
    
    // First, get all nodes at this level
    let siblings;
    if (parentId) {
      siblings = await req.db.all(
        'SELECT id, position FROM nodes WHERE parent_id = ? ORDER BY position, id',
        parentId
      );
    } else {
      siblings = await req.db.all(
        'SELECT id, position FROM nodes WHERE parent_id IS NULL ORDER BY position, id'
      );
    }
    
    // Assign new sequential positions
    for (let i = 0; i < siblings.length; i++) {
      await req.db.run(
        'UPDATE nodes SET position = ?, updated_at = ? WHERE id = ?',
        [i, Date.now(), siblings[i].id]
      );
    }
    
    await req.db.run('COMMIT');
    
    res.json({ 
      success: true, 
      message: `Fixed ${conflicts.length} position conflicts` 
    });
  } catch (error) {
    console.error('Error fixing positions:', error);
    await req.db.run('ROLLBACK');
    res.status(500).json({ error: 'Failed to fix positions' });
  }
});

// Add this endpoint to fix specific position conflicts
app.post('/api/nodes/fix-position-conflict', async (req, res) => {
  try {
    const { parentId, nodeId, position, conflictingNodes } = req.body;
    
    // Start a transaction to ensure all updates succeed or fail together
    await req.db.run('BEGIN TRANSACTION');
    
    // Keep the chosen node at its position
    // For all conflicting nodes, find empty positions and assign them
    
    // Get all siblings to find available positions
    let siblings;
    if (parentId) {
      siblings = await req.db.all(
        'SELECT id, position FROM nodes WHERE parent_id = ? ORDER BY position',
        parentId
      );
    } else {
      siblings = await req.db.all(
        'SELECT id, position FROM nodes WHERE parent_id IS NULL ORDER BY position'
      );
    }
    
    // Get all used positions
    const usedPositions = new Set(siblings.map(s => s.position));
    
    // Find the highest position
    const maxPosition = Math.max(...usedPositions) + 1;
    
    // For each conflicting node, find a new position
    // Start by trying position + 1, position + 2, etc.
    let nextPosition = position + 1;
    
    for (const cNodeId of conflictingNodes) {
      // Find the next unused position
      while (usedPositions.has(nextPosition)) {
        nextPosition++;
      }
      
      // Update the node with the new position
      await req.db.run(
        'UPDATE nodes SET position = ?, updated_at = ? WHERE id = ?',
        [nextPosition, Date.now(), cNodeId]
      );
      
      // Mark this position as used
      usedPositions.add(nextPosition);
      
      // Increment to the next potential position
      nextPosition++;
    }
    
    await req.db.run('COMMIT');
    
    res.json({ 
      success: true, 
      message: `Resolved conflict at position ${position}` 
    });
  } catch (error) {
    console.error('Error fixing position conflict:', error);
    await req.db.run('ROLLBACK');
    res.status(500).json({ error: 'Failed to fix position conflict' });
  }
});

// Add endpoint to reset all node sizes to default
app.post('/api/nodes/reset-sizes', async (req, res) => {
  try {
    const db = await getDb();
    
    // Update all nodes to default size
    await db.run('UPDATE nodes SET node_size = 20, updated_at = ?', Date.now());
    
    res.json({ success: true, message: 'All node sizes have been reset to default' });
  } catch (error) {
    console.error('Error resetting node sizes:', error);
    res.status(500).json({ error: 'Failed to reset node sizes' });
  }
});

// Add a debug endpoint to get full node info
app.get('/api/debug/node/:id', async (req, res) => {
  try {
    const db = await getDb();
    const node = await db.get('SELECT * FROM nodes WHERE id = ?', req.params.id);
    
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    res.json({
      node,
      message: 'This is the complete node data, including node_size field',
      has_node_size_field: node.hasOwnProperty('node_size')
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add these endpoints for bookmark operations

// Get all bookmarks
app.get('/api/bookmarks', async (req, res) => {
  try {
    const db = await getDb();
    const bookmarks = await db.all(`
      SELECT bookmarks.*, nodes.content, nodes.content_zh
      FROM bookmarks
      JOIN nodes ON bookmarks.node_id = nodes.id
      ORDER BY bookmarks.added_at DESC
    `);
    res.json(bookmarks);
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    res.status(500).json({ error: 'Failed to fetch bookmarks' });
  }
});

// Add a bookmark
app.post('/api/bookmarks', async (req, res) => {
  try {
    const { node_id, title } = req.body;
    if (!node_id) {
      return res.status(400).json({ error: 'Node ID is required' });
    }
    
    const db = await getDb();
    
    // Check if bookmark already exists
    const existing = await db.get('SELECT * FROM bookmarks WHERE node_id = ?', node_id);
    if (existing) {
      return res.status(409).json({ error: 'Bookmark already exists', bookmark: existing });
    }
    
    const now = Date.now();
    const id = crypto.randomUUID();
    
    await db.run(
      'INSERT INTO bookmarks (id, node_id, title, added_at, created_at) VALUES (?, ?, ?, ?, ?)',
      [id, node_id, title, now, now]
    );
    
    const bookmark = await db.get('SELECT * FROM bookmarks WHERE id = ?', id);
    res.status(201).json(bookmark);
  } catch (error) {
    console.error('Error creating bookmark:', error);
    res.status(500).json({ error: 'Failed to create bookmark' });
  }
});

// Delete a bookmark
app.delete('/api/bookmarks/:id', async (req, res) => {
  try {
    const db = await getDb();
    await db.run('DELETE FROM bookmarks WHERE id = ?', req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting bookmark:', error);
    res.status(500).json({ error: 'Failed to delete bookmark' });
  }
});

// Delete a bookmark by node ID
app.delete('/api/bookmarks/node/:nodeId', async (req, res) => {
  try {
    const db = await getDb();
    await db.run('DELETE FROM bookmarks WHERE node_id = ?', req.params.nodeId);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting bookmark by node ID:', error);
    res.status(500).json({ error: 'Failed to delete bookmark' });
  }
});

// Get a specific link by ID
app.get('/api/links/:id', async (req, res) => {
  try {
    const db = await getDb();
    const link = await db.get('SELECT * FROM links WHERE id = ?', req.params.id);
    
    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }
    
    res.json(link);
  } catch (error) {
    console.error('Error getting link:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Add these routes if not already present (similar to what you have)
app.use('/css', express.static(path.join(__dirname, 'public', 'css')));
app.use('/fonts', express.static(path.join(__dirname, 'public', 'fonts')));

// Add this to your existing routes
app.post('/api/backup/:vault?', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Get vault name from params or use current vault
    const vaultName = req.params.vault || global.currentVault || 'main';
    
    // Create backups directory if it doesn't exist
    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }
    
    // Generate timestamp for filename
    const timestamp = new Date().toISOString()
      .replace(/:/g, '-')  // Replace colons with hyphens for valid filename
      .replace(/\..+/, ''); // Remove milliseconds
    
    // Define source and destination paths
    let dbPath;
    if (vaultName === 'main') {
      dbPath = path.join(__dirname, 'outliner.db');
    } else {
      dbPath = path.join(__dirname, 'vaults', `${vaultName}.db`);
    }
    
    const backupFilename = `${vaultName}-${timestamp}.db`;
    const backupPath = path.join(backupDir, backupFilename);
    
    // Copy the database file
    fs.copyFileSync(dbPath, backupPath);
    
    console.log(`Database backup created: ${backupFilename}`);
    
    res.status(200).json({
      success: true,
      filename: backupFilename,
      vault: vaultName,
      timestamp: timestamp
    });
  } catch (error) {
    console.error('Backup error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Use the routes
app.use('/api/links', linkRoutes);
app.use('/api/fonts', fontRoutes);

// Use the blog routes
app.use('/api/blog', blogRoutes);

// Use the markdown routes - note the proper approach for nested routes
app.use('/api/nodes/:id/markdown', markdownRoutes);

// Add a special route for serving blog pages
app.get('/blog/:slug', blogController.serveBlogPage);

// Use the attribute routes
app.use('/api/node-attributes', attributeRoutes);

// Use the DCIM routes
app.use('/api/dcim', dcimRoutes);

// Use the dev test routes
app.use('/api/dev-test', devTestRoutes);

// Use the database export/import routes
app.use('/api/database', databaseExportImportRoutes);

// Use the vault routes
app.use('/api/vaults', vaultRoutes);

// In server.js, add this with other route registrations
app.use('/api/metro-map', metroMapRoutes);

// Add this after the database initialization
// Create vaults directory if it doesn't exist
const vaultsDir = path.join(__dirname, 'vaults');
if (!fs.existsSync(vaultsDir)) {
  fs.mkdirSync(vaultsDir);
}

// Modify the database connection to support multiple vaults
let currentVault = 'main'; // Default to main database
global.currentVault = 'main'; // Also set the global variable

// New middleware to set the current vault based on request
app.use((req, res, next) => {
  if (req.query.vault) {
    currentVault = req.query.vault;
    global.currentVault = req.query.vault;  // Add this line
  }
  req.currentVault = currentVault;
  next();
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
