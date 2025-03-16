const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { getDb, initializeDatabase } = require('./database');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

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
initializeDatabase().then(database => {
  db = database;
});

// Create markdown directory if it doesn't exist
const markdownDir = path.join(__dirname, 'markdown');
if (!fs.existsSync(markdownDir)) {
  fs.mkdirSync(markdownDir);
}

// Routes

// Get all top-level nodes
app.get('/api/nodes', async (req, res) => {
  try {
    // Get nodes with link counts
    const nodes = await db.all(`
      SELECT n.*, 
        (SELECT COUNT(*) FROM links WHERE from_node_id = n.id OR to_node_id = n.id) as link_count
      FROM nodes n 
      WHERE n.parent_id IS NULL 
      ORDER BY n.position
    `);
    
    res.json(nodes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get children of a node
app.get('/api/nodes/:id/children', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get children with link counts
    const nodes = await db.all(`
      SELECT n.*, 
        (SELECT COUNT(*) FROM links WHERE from_node_id = n.id OR to_node_id = n.id) as link_count
      FROM nodes n 
      WHERE n.parent_id = ? 
      ORDER BY n.position
    `, id);
    
    res.json(nodes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new node
app.post('/api/nodes', async (req, res) => {
  try {
    const { content, content_zh, parent_id, position } = req.body;
    const now = Date.now();
    const id = uuidv4();
    
    await db.run(
      'INSERT INTO nodes (id, content, content_zh, parent_id, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, content, content_zh, parent_id, position, now, now]
    );
    
    const node = await db.get('SELECT * FROM nodes WHERE id = ?', id);
    res.status(201).json(node);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a node
app.put('/api/nodes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, content_zh, parent_id, position, is_expanded } = req.body;
    const now = Date.now();
    
    let query = 'UPDATE nodes SET updated_at = ?';
    const params = [now];
    
    if (content !== undefined) {
      query += ', content = ?';
      params.push(content);
    }
    
    if (content_zh !== undefined) {
      query += ', content_zh = ?';
      params.push(content_zh);
    }
    
    if (parent_id !== undefined) {
      query += ', parent_id = ?';
      params.push(parent_id);
    }
    
    if (position !== undefined) {
      query += ', position = ?';
      params.push(position);
    }
    
    if (is_expanded !== undefined) {
      query += ', is_expanded = ?';
      params.push(is_expanded);
    }
    
    query += ' WHERE id = ?';
    params.push(id);
    
    await db.run(query, params);
    const node = await db.get('SELECT * FROM nodes WHERE id = ?', id);
    res.json(node);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a node
app.delete('/api/nodes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Start a transaction
    await db.run('BEGIN TRANSACTION');
    
    // First delete all children recursively
    const deleteChildren = async (nodeId) => {
      const children = await db.all('SELECT id FROM nodes WHERE parent_id = ?', nodeId);
      for (const child of children) {
        await deleteChildren(child.id);
      }
      
      // Delete markdown file if it exists
      const filePath = path.join(markdownDir, `${nodeId}.md`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      // Delete links associated with this node
      await db.run('DELETE FROM links WHERE from_node_id = ? OR to_node_id = ?', [nodeId, nodeId]);
      
      // Delete the node
      await db.run('DELETE FROM nodes WHERE id = ?', nodeId);
    };
    
    await deleteChildren(id);
    
    await db.run('COMMIT');
    res.status(204).send();
  } catch (error) {
    await db.run('ROLLBACK');
    res.status(500).json({ error: error.message });
  }
});

// Reorder nodes (when dragging)
app.post('/api/nodes/reorder', async (req, res) => {
  try {
    const { nodeId, newParentId, newPosition } = req.body;
    
    // Validate input
    if (!nodeId) {
      return res.status(400).json({ error: 'Missing required parameter: nodeId' });
    }
    
    // Start a transaction
    await db.run('BEGIN TRANSACTION');
    
    // Get current parent and position
    const node = await db.get('SELECT parent_id, position FROM nodes WHERE id = ?', nodeId);
    
    // Check if node exists
    if (!node) {
      await db.run('ROLLBACK');
      return res.status(404).json({ error: `Node with ID ${nodeId} not found` });
    }
    
    const oldParentId = node.parent_id;
    const oldPosition = node.position;
    
    // Update positions of nodes in old parent
    if (oldParentId) {
      await db.run(
        'UPDATE nodes SET position = position - 1 WHERE parent_id = ? AND position > ?',
        [oldParentId, oldPosition]
      );
    } else {
      await db.run(
        'UPDATE nodes SET position = position - 1 WHERE parent_id IS NULL AND position > ?',
        oldPosition
      );
    }
    
    // Update positions of nodes in new parent
    if (newParentId) {
      await db.run(
        'UPDATE nodes SET position = position + 1 WHERE parent_id = ? AND position >= ?',
        [newParentId, newPosition]
      );
    } else {
      await db.run(
        'UPDATE nodes SET position = position + 1 WHERE parent_id IS NULL AND position >= ?',
        newPosition
      );
    }
    
    // Update the node itself
    await db.run(
      'UPDATE nodes SET parent_id = ?, position = ?, updated_at = ? WHERE id = ?',
      [newParentId, newPosition, Date.now(), nodeId]
    );
    
    await db.run('COMMIT');
    res.status(200).json({ success: true });
  } catch (error) {
    await db.run('ROLLBACK');
    res.status(500).json({ error: error.message });
  }
});

// Toggle expand/collapse
app.post('/api/nodes/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const node = await db.get('SELECT is_expanded FROM nodes WHERE id = ?', id);
    
    await db.run(
      'UPDATE nodes SET is_expanded = ?, updated_at = ? WHERE id = ?',
      [!node.is_expanded, Date.now(), id]
    );
    
    res.json({ id, is_expanded: !node.is_expanded });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get markdown content
app.get('/api/nodes/:id/markdown', async (req, res) => {
  try {
    const { id } = req.params;
    const filePath = path.join(markdownDir, `${id}.md`);
    
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      res.json({ content });
    } else {
      res.json({ content: '' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save markdown content
app.post('/api/nodes/:id/markdown', async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const filePath = path.join(markdownDir, `${id}.md`);
    
    fs.writeFileSync(filePath, content);
    
    // Update the node to indicate it has markdown
    await db.run(
      'UPDATE nodes SET has_markdown = 1, updated_at = ? WHERE id = ?',
      [Date.now(), id]
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete markdown content
app.delete('/api/nodes/:id/markdown', async (req, res) => {
  try {
    const { id } = req.params;
    const filePath = path.join(markdownDir, `${id}.md`);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Update the node to indicate it no longer has markdown
    await db.run(
      'UPDATE nodes SET has_markdown = 0, updated_at = ? WHERE id = ?',
      [Date.now(), id]
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get node above
app.get('/api/nodes/:id/above', async (req, res) => {
  try {
    const { id } = req.params;
    const node = await db.get('SELECT * FROM nodes WHERE id = ?', id);
    
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    let nodeAbove;
    
    if (node.parent_id) {
      // If it has a parent, get siblings with position less than current node
      nodeAbove = await db.get(
        'SELECT * FROM nodes WHERE parent_id = ? AND position < ? ORDER BY position DESC LIMIT 1',
        [node.parent_id, node.position]
      );
    } else {
      // If it's a root node, get the root node above it
      nodeAbove = await db.get(
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
    const node = await db.get('SELECT * FROM nodes WHERE id = ?', id);
    
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
      nodeAbove = await db.get(
        'SELECT * FROM nodes WHERE parent_id = ? AND position < ? ORDER BY position DESC LIMIT 1',
        [node.parent_id, node.position]
      );
    } else {
      // If it's a root node, get the root node above it
      nodeAbove = await db.get(
        'SELECT * FROM nodes WHERE parent_id IS NULL AND position < ? ORDER BY position DESC LIMIT 1',
        [node.position]
      );
    }
    
    if (!nodeAbove) {
      return res.status(400).json({ error: 'No node above to make parent' });
    }
    
    // Get children of the node above
    const children = await db.all('SELECT * FROM nodes WHERE parent_id = ? ORDER BY position', nodeAbove.id);
    const maxPosition = children.length;
    
    // Start a transaction
    await db.run('BEGIN TRANSACTION');
    
    // Update positions of nodes in old parent
    if (node.parent_id) {
      await db.run(
        'UPDATE nodes SET position = position - 1 WHERE parent_id = ? AND position > ?',
        [node.parent_id, node.position]
      );
    } else {
      await db.run(
        'UPDATE nodes SET position = position - 1 WHERE parent_id IS NULL AND position > ?',
        node.position
      );
    }
    
    // Update the node itself
    await db.run(
      'UPDATE nodes SET parent_id = ?, position = ?, updated_at = ? WHERE id = ?',
      [nodeAbove.id, maxPosition, Date.now(), id]
    );
    
    // Ensure the parent is expanded
    await db.run(
      'UPDATE nodes SET is_expanded = 1, updated_at = ? WHERE id = ?',
      [Date.now(), nodeAbove.id]
    );
    
    await db.run('COMMIT');
    
    res.json({ success: true });
  } catch (error) {
    await db.run('ROLLBACK');
    res.status(500).json({ error: error.message });
  }
});

// Handle outdenting a node
app.post('/api/nodes/:id/outdent', async (req, res) => {
  try {
    const { id } = req.params;
    const node = await db.get('SELECT * FROM nodes WHERE id = ?', id);
    
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    // Can't outdent a root node
    if (!node.parent_id) {
      return res.status(400).json({ error: 'Cannot outdent a root node' });
    }
    
    // Get the parent node
    const parentNode = await db.get('SELECT * FROM nodes WHERE id = ?', node.parent_id);
    
    // Start a transaction
    await db.run('BEGIN TRANSACTION');
    
    // Update positions of nodes in old parent
    await db.run(
      'UPDATE nodes SET position = position - 1 WHERE parent_id = ? AND position > ?',
      [node.parent_id, node.position]
    );
    
    let targetPosition;
    
    if (parentNode.parent_id) {
      // Parent has a parent, find parent's next sibling position
      const parentSiblings = await db.all(
        'SELECT * FROM nodes WHERE parent_id = ? AND position > ? ORDER BY position',
        [parentNode.parent_id, parentNode.position]
      );
      
      if (parentSiblings.length > 0) {
        // Insert at parent's sibling position
        targetPosition = parentNode.position + 1;
        
        // Shift parent's siblings
        await db.run(
          'UPDATE nodes SET position = position + 1 WHERE parent_id = ? AND position > ?',
          [parentNode.parent_id, parentNode.position]
        );
      } else {
        // Parent is the last child, so insert at the end
        targetPosition = parentNode.position + 1;
      }
      
      // Update the node
      await db.run(
        'UPDATE nodes SET parent_id = ?, position = ?, updated_at = ? WHERE id = ?',
        [parentNode.parent_id, targetPosition, Date.now(), id]
      );
    } else {
      // Parent is a root node, find position for new root node
      const rootCount = await db.get('SELECT COUNT(*) as count FROM nodes WHERE parent_id IS NULL');
      targetPosition = rootCount.count;
      
      // Update the node to be a root node
      await db.run(
        'UPDATE nodes SET parent_id = NULL, position = ?, updated_at = ? WHERE id = ?',
        [targetPosition, Date.now(), id]
      );
    }
    
    await db.run('COMMIT');
    
    res.json({ success: true });
  } catch (error) {
    await db.run('ROLLBACK');
    res.status(500).json({ error: error.message });
  }
});

// Move node up
app.post('/api/nodes/:id/move-up', async (req, res) => {
  try {
    const { id } = req.params;
    const node = await db.get('SELECT * FROM nodes WHERE id = ?', id);
    
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    // Can't move up if it's already at the top
    if (node.position === 0) {
      return res.status(400).json({ error: 'Node is already at the top' });
    }
    
    // Start a transaction
    await db.run('BEGIN TRANSACTION');
    
    // Find the node directly above this one
    let nodeAbove;
    if (node.parent_id) {
      nodeAbove = await db.get(
        'SELECT * FROM nodes WHERE parent_id = ? AND position = ?',
        [node.parent_id, node.position - 1]
      );
    } else {
      nodeAbove = await db.get(
        'SELECT * FROM nodes WHERE parent_id IS NULL AND position = ?',
        [node.position - 1]
      );
    }
    
    if (!nodeAbove) {
      await db.run('ROLLBACK');
      return res.status(400).json({ error: 'No node above to swap with' });
    }
    
    // Swap positions
    await db.run(
      'UPDATE nodes SET position = ?, updated_at = ? WHERE id = ?',
      [node.position, Date.now(), nodeAbove.id]
    );
    
    await db.run(
      'UPDATE nodes SET position = ?, updated_at = ? WHERE id = ?',
      [node.position - 1, Date.now(), id]
    );
    
    await db.run('COMMIT');
    
    res.json({ success: true });
  } catch (error) {
    await db.run('ROLLBACK');
    res.status(500).json({ error: error.message });
  }
});

// Move node down
app.post('/api/nodes/:id/move-down', async (req, res) => {
  try {
    const { id } = req.params;
    const node = await db.get('SELECT * FROM nodes WHERE id = ?', id);
    
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    // Find the node directly below this one
    let nodeBelow;
    if (node.parent_id) {
      nodeBelow = await db.get(
        'SELECT * FROM nodes WHERE parent_id = ? AND position = ?',
        [node.parent_id, node.position + 1]
      );
    } else {
      nodeBelow = await db.get(
        'SELECT * FROM nodes WHERE parent_id IS NULL AND position = ?',
        [node.position + 1]
      );
    }
    
    // Can't move down if it's already at the bottom
    if (!nodeBelow) {
      return res.status(400).json({ error: 'Node is already at the bottom' });
    }
    
    // Start a transaction
    await db.run('BEGIN TRANSACTION');
    
    // Swap positions
    await db.run(
      'UPDATE nodes SET position = ?, updated_at = ? WHERE id = ?',
      [node.position, Date.now(), nodeBelow.id]
    );
    
    await db.run(
      'UPDATE nodes SET position = ?, updated_at = ? WHERE id = ?',
      [node.position + 1, Date.now(), id]
    );
    
    await db.run('COMMIT');
    
    res.json({ success: true });
  } catch (error) {
    await db.run('ROLLBACK');
    res.status(500).json({ error: error.message });
  }
});

// Get all links for a node (both incoming and outgoing)
app.get('/api/nodes/:id/links', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get outgoing links (from this node to others)
    const outgoingLinks = await db.all(
      'SELECT l.*, n.content, n.content_zh FROM links l JOIN nodes n ON l.to_node_id = n.id WHERE l.from_node_id = ?',
      id
    );
    
    // Get incoming links (from others to this node)
    const incomingLinks = await db.all(
      'SELECT l.*, n.content, n.content_zh FROM links l JOIN nodes n ON l.from_node_id = n.id WHERE l.to_node_id = ?',
      id
    );
    
    res.json({
      outgoing: outgoingLinks,
      incoming: incomingLinks
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new link
app.post('/api/links', async (req, res) => {
  try {
    const { from_node_id, to_node_id, weight, description } = req.body;
    
    // Validate that both nodes exist
    const fromNode = await db.get('SELECT id FROM nodes WHERE id = ?', from_node_id);
    const toNode = await db.get('SELECT id FROM nodes WHERE id = ?', to_node_id);
    
    if (!fromNode || !toNode) {
      return res.status(400).json({ error: 'One or both nodes do not exist' });
    }
    
    // Check if link already exists
    const existingLink = await db.get(
      'SELECT id FROM links WHERE from_node_id = ? AND to_node_id = ?',
      [from_node_id, to_node_id]
    );
    
    if (existingLink) {
      return res.status(400).json({ error: 'Link already exists between these nodes' });
    }
    
    const now = Date.now();
    const id = uuidv4();
    
    await db.run(
      'INSERT INTO links (id, from_node_id, to_node_id, weight, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, from_node_id, to_node_id, weight || 1.0, description || '', now, now]
    );
    
    const link = await db.get('SELECT * FROM links WHERE id = ?', id);
    res.status(201).json(link);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a link
app.put('/api/links/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { weight, description } = req.body;
    const now = Date.now();
    
    let query = 'UPDATE links SET updated_at = ?';
    const params = [now];
    
    if (weight !== undefined) {
      query += ', weight = ?';
      params.push(weight);
    }
    
    if (description !== undefined) {
      query += ', description = ?';
      params.push(description);
    }
    
    query += ' WHERE id = ?';
    params.push(id);
    
    await db.run(query, params);
    const link = await db.get('SELECT * FROM links WHERE id = ?', id);
    
    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }
    
    res.json(link);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a link
app.delete('/api/links/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const link = await db.get('SELECT * FROM links WHERE id = ?', id);
    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }
    
    await db.run('DELETE FROM links WHERE id = ?', id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search for nodes
app.get('/api/nodes/search', async (req, res) => {
  try {
    const { q, excludeId } = req.query;
    const searchTerm = `%${q}%`;
    
    // Search in both English and Chinese content based on current language
    const nodes = await db.all(
      'SELECT * FROM nodes WHERE (content LIKE ? OR content_zh LIKE ?) AND id != ? LIMIT 10',
      [searchTerm, searchTerm, excludeId || '']
    );
    
    res.json(nodes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single node
app.get('/api/nodes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const node = await db.get('SELECT * FROM nodes WHERE id = ?', id);
    
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    res.json(node);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Task Management API Endpoints

// Get tasks for a specific date
app.get('/api/tasks/:date', async (req, res) => {
  try {
    const { date } = req.params;
    
    const tasks = await db.all(
      'SELECT * FROM tasks WHERE date = ? ORDER BY created_at',
      date
    );
    
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new task
app.post('/api/tasks', async (req, res) => {
  try {
    const { name, date } = req.body;
    const now = Date.now();
    const id = uuidv4();
    
    await db.run(
      'INSERT INTO tasks (id, name, date, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [id, name, date, now, now]
    );
    
    const task = await db.get('SELECT * FROM tasks WHERE id = ?', id);
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a task
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, is_completed, is_active, total_duration } = req.body;
    const now = Date.now();
    
    let query = 'UPDATE tasks SET updated_at = ?';
    const params = [now];
    
    if (name !== undefined) {
      query += ', name = ?';
      params.push(name);
    }
    
    if (is_completed !== undefined) {
      query += ', is_completed = ?';
      params.push(is_completed);
    }
    
    if (is_active !== undefined) {
      query += ', is_active = ?';
      params.push(is_active);
    }
    
    if (total_duration !== undefined) {
      query += ', total_duration = ?';
      params.push(total_duration);
    }
    
    query += ' WHERE id = ?';
    params.push(id);
    
    await db.run(query, params);
    const task = await db.get('SELECT * FROM tasks WHERE id = ?', id);
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start timing a task
app.post('/api/tasks/:id/start', async (req, res) => {
  try {
    const { id } = req.params;
    const now = Date.now();
    
    // First, stop any currently active task
    await db.run(
      'UPDATE tasks SET is_active = 0, updated_at = ? WHERE is_active = 1',
      now
    );
    
    // Then activate the selected task
    await db.run(
      'UPDATE tasks SET is_active = 1, start_time = ?, updated_at = ? WHERE id = ?',
      [now, now, id]
    );
    
    const task = await db.get('SELECT * FROM tasks WHERE id = ?', id);
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Pause timing a task
app.post('/api/tasks/:id/pause', async (req, res) => {
  try {
    const { id } = req.params;
    const { elapsed } = req.body;
    const now = Date.now();
    
    // Get the task
    const task = await db.get('SELECT * FROM tasks WHERE id = ?', id);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Update the task's total duration and deactivate it
    const newDuration = (task.total_duration || 0) + elapsed;
    
    await db.run(
      'UPDATE tasks SET is_active = 0, total_duration = ?, start_time = NULL, updated_at = ? WHERE id = ?',
      [newDuration, now, id]
    );
    
    const updatedTask = await db.get('SELECT * FROM tasks WHERE id = ?', id);
    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a task
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.run('DELETE FROM tasks WHERE id = ?', id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get dates with tasks
app.get('/api/tasks/dates', async (req, res) => {
  try {
    const dates = await db.all(
      'SELECT DISTINCT date FROM tasks ORDER BY date DESC'
    );
    
    res.json(dates.map(item => item.date));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
