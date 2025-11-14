const express = require('express');
const cors = require('cors');
const { getDb, initializeDatabase } = require('./database');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());

// Modern Express built-in parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use(express.static('public'));

// Add language preference middleware
app.use((req, res, next) => {
  req.lang = req.query.lang || 'en';
  next();
});

// Initialize database
let db;
initializeDatabase()
  .then(database => {
    db = database;
    console.log('Database initialized successfully');
  })
  .catch(err => {
    console.error('Error during initialization:', err);
  });

// Add this middleware to create a fresh db connection for each request
app.use(async (req, res, next) => {
  try {
    req.db = await getDb();
    next();
  } catch (err) {
    console.error('Error creating database connection:', err);
    res.status(500).json({ error: 'Database connection error' });
  }
});

// Routes - minimal version only
const nodeRoutes = require('./routes/nodeRoutes');
const linkRoutes = require('./routes/linkRoutes');

// Use the node routes
app.use('/api/nodes', nodeRoutes);
// Use the link routes
app.use('/api/links', linkRoutes);

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
      nodeAbove = await req.db.get(
        'SELECT * FROM nodes WHERE parent_id = ? AND position < ? ORDER BY position DESC LIMIT 1',
        [node.parent_id, node.position]
      );
    } else {
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

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;