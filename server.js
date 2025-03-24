const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { getDb, initializeDatabase } = require('./database');
const fs = require('fs');
const path = require('path');

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

// Get attributes for a node
app.get('/api/nodes/:id/attributes', async (req, res) => {
  try {
    const { id } = req.params;
    
    const attributes = await db.all(
      'SELECT * FROM node_attributes WHERE node_id = ? ORDER BY key',
      id
    );
    
    res.json(attributes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new attribute
app.post('/api/node-attributes', async (req, res) => {
  try {
    const { node_id, key, value } = req.body;
    
    // Validate input
    if (!node_id || !key) {
      return res.status(400).json({ error: 'Node ID and attribute key are required' });
    }
    
    // Check if node exists
    const node = await db.get('SELECT id FROM nodes WHERE id = ?', node_id);
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    // Check if attribute already exists for this node
    const existingAttr = await db.get(
      'SELECT id FROM node_attributes WHERE node_id = ? AND key = ?',
      [node_id, key]
    );
    
    const now = Date.now();
    let attribute;
    
    if (existingAttr) {
      // Update existing attribute
      await db.run(
        'UPDATE node_attributes SET value = ?, updated_at = ? WHERE id = ?',
        [value, now, existingAttr.id]
      );
      attribute = await db.get('SELECT * FROM node_attributes WHERE id = ?', existingAttr.id);
    } else {
      // Create new attribute
      const id = uuidv4();
      await db.run(
        'INSERT INTO node_attributes (id, node_id, key, value, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, node_id, key, value, now, now]
      );
      attribute = await db.get('SELECT * FROM node_attributes WHERE id = ?', id);
    }
    
    res.status(201).json(attribute);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update an attribute
app.put('/api/node-attributes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { value } = req.body;
    const now = Date.now();
    
    await db.run(
      'UPDATE node_attributes SET value = ?, updated_at = ? WHERE id = ?',
      [value, now, id]
    );
    
    const attribute = await db.get('SELECT * FROM node_attributes WHERE id = ?', id);
    
    if (!attribute) {
      return res.status(404).json({ error: 'Attribute not found' });
    }
    
    res.json(attribute);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete an attribute
app.delete('/api/node-attributes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const attribute = await db.get('SELECT * FROM node_attributes WHERE id = ?', id);
    if (!attribute) {
      return res.status(404).json({ error: 'Attribute not found' });
    }
    
    await db.run('DELETE FROM node_attributes WHERE id = ?', id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Query nodes by attributes
app.post('/api/nodes/query', async (req, res) => {
  try {
    console.log("Received query request with raw body:", JSON.stringify(req.body));
    console.log("Query string:", req.body.query);
    const { query, sortBy, sortOrder, page = 1, pageSize = 20 } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    // Parse the query to find nodes with matching attributes
    try {
      const db = await getDb();
      
      // First get all nodes with their attributes
      const nodes = await db.all(`
        SELECT n.*, GROUP_CONCAT(a.key || ':' || a.value, ';') as attributes
        FROM nodes n
        LEFT JOIN node_attributes a ON n.id = a.node_id
        GROUP BY n.id
      `);
      
      // Get all node attributes for filtering logic
      const allNodeAttributes = await db.all(`
        SELECT node_id, key, value
        FROM node_attributes
      `);
      
      // Create a map of node_id to attributes for easier access
      const nodeAttributesMap = {};
      allNodeAttributes.forEach(attr => {
        if (!nodeAttributesMap[attr.node_id]) {
          nodeAttributesMap[attr.node_id] = [];
        }
        nodeAttributesMap[attr.node_id].push({ key: attr.key, value: attr.value });
      });
      
      // Parse the query for conditions
      const conditions = query.split('AND').map(part => part.trim());
      
      console.log('Query received:', query);
      console.log('Conditions:', conditions);
      
      // Filter nodes based on the query conditions
      let matchingNodes = nodes.filter(node => {
        const nodeId = node.id;
        
        if (!nodeAttributesMap[node.id]) {
          return false;
        }
        
        const nodeAttrs = nodeAttributesMap[node.id];
        
        try {
          const allConditionsMet = conditions.every(condition => {
            // For each condition, check if node has matching attribute
            const parsedCondition = parseCondition(condition);
            if (!parsedCondition || parsedCondition.length !== 3) {
              return false;
            }
            
            const [key, operator, value] = parsedCondition;
            
            const attr = nodeAttrs.find(a => a.key === key);
            if (!attr) {
              return false;
            }
            
            const result = compareValues(attr.value, operator, value);
            return result;
          });
          
          return allConditionsMet;
        } catch (conditionError) {
          console.error(`Error evaluating condition for node ${nodeId}:`, conditionError);
          return false;
        }
      });
      
      // Apply sorting if a sort field is provided
      if (sortBy) {
        matchingNodes.sort((a, b) => {
          const aAttrs = nodeAttributesMap[a.id] || [];
          const bAttrs = nodeAttributesMap[b.id] || [];
          
          const aAttr = aAttrs.find(attr => attr.key === sortBy);
          const bAttr = bAttrs.find(attr => attr.key === sortBy);
          
          const aValue = aAttr ? aAttr.value : '';
          const bValue = bAttr ? bAttr.value : '';
          
          // Try to sort numerically if both values are numbers
          if (!isNaN(parseFloat(aValue)) && !isNaN(parseFloat(bValue))) {
            return sortOrder === 'desc' 
              ? parseFloat(bValue) - parseFloat(aValue) 
              : parseFloat(aValue) - parseFloat(bValue);
          }
          
          // Otherwise sort alphabetically
          return sortOrder === 'desc'
            ? bValue.localeCompare(aValue)
            : aValue.localeCompare(bValue);
        });
      }
      
      // Calculate pagination
      const totalResults = matchingNodes.length;
      const totalPages = Math.ceil(totalResults / pageSize);
      const startIndex = (page - 1) * pageSize;
      const endIndex = Math.min(startIndex + pageSize, totalResults);
      
      // Get the subset of nodes for the current page
      const paginatedNodes = matchingNodes.slice(startIndex, endIndex);
      
      // Enhance the result with attribute details
      const resultNodes = paginatedNodes.map(node => {
        return {
          ...node,
          attributes: nodeAttributesMap[node.id] || []
        };
      });
      
      // Send the results with pagination metadata
      console.log(`Query returned ${totalResults} total results, ${resultNodes.length} on current page`);
      res.json({
        results: resultNodes,
        pagination: {
          page,
          pageSize,
          totalResults,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      });
    } catch (dbError) {
      console.error('Database operation error:', dbError);
      return res.status(500).json({ error: `Database operation failed: ${dbError.message}` });
    }
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).json({ error: `Failed to execute query: ${error.message}` });
  }
});

// Helper function to parse a condition
function parseCondition(condition) {
  console.log('Parsing condition:', condition);
  
  try {
    // Remove any escape characters that might have been added in JSON encoding
    const cleanCondition = condition.replace(/\\"/g, '"').replace(/\\'/g, "'");
    console.log('Cleaned condition:', cleanCondition);
    
    // Handle key:* format (wildcard/existence check)
    const wildcardMatch = cleanCondition.match(/([^:]+):\s*\*/);
    if (wildcardMatch) {
      const key = wildcardMatch[1].trim();
      console.log('Parsed wildcard check:', key, 'exists');
      return [key, 'exists', '*'];
    }
    
    // Handle key:"" format (empty value check)
    const emptyMatch = cleanCondition.match(/([^:]+):\s*["']["']/);
    if (emptyMatch) {
      const key = emptyMatch[1].trim();
      console.log('Parsed empty value check:', key, 'exists');
      return [key, 'exists', ''];
    }
    
    // Handle key:"value" format (with quotes)
    const quotedMatch = cleanCondition.match(/([^:]+):\s*["']([^"']+)["']/);
    if (quotedMatch) {
      const key = quotedMatch[1].trim();
      const value = quotedMatch[2].trim();
      console.log('Parsed quoted value:', key, '=', value);
      return [key, '=', value];
    }
    
    // Handle colon format without quotes (key:value)
    const colonMatch = cleanCondition.match(/([^:]+):\s*([^"'\s]+)/);
    if (colonMatch) {
      const key = colonMatch[1].trim();
      const value = colonMatch[2].trim();
      console.log('Parsed colon format:', key, '=', value);
      return [key, '=', value];
    }
    
    // Check for operators
    const operatorMatch = cleanCondition.match(/\s*(=|!=|>|<|>=|<=)\s*/);
    if (operatorMatch) {
      const parts = cleanCondition.split(operatorMatch[0]);
      const key = parts[0].trim();
      const operator = operatorMatch[1].trim();
      let value = parts[1].trim();
      
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }
      
      console.log('Parsed with operator:', key, operator, value);
      return [key, operator, value];
    }
    
    // Simple key=value case
    const parts = cleanCondition.split(/\s+/);
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const operator = '=';
      const value = parts.slice(1).join(' ').trim();
      
      // Remove quotes if present
      let cleanValue = value;
      if ((cleanValue.startsWith('"') && cleanValue.endsWith('"')) || 
          (cleanValue.startsWith("'") && cleanValue.endsWith("'"))) {
        cleanValue = cleanValue.substring(1, cleanValue.length - 1);
      }
      
      console.log('Parsed simple case:', key, operator, cleanValue);
      return [key, operator, cleanValue];
    }
    
    console.error('Could not parse condition:', cleanCondition);
    return null;
  } catch (error) {
    console.error('Error parsing condition:', condition, error);
    return null;
  }
}

// Helper function to compare values based on operator
function compareValues(attrValue, operator, queryValue) {
  console.log(`Comparing: "${attrValue}" ${operator} "${queryValue}"`);
  
  // Special case for existence check
  if (operator === 'exists') {
    // If we get here, the attribute exists (since we found it in the node's attributes)
    return true;
  }
  
  // Handle numeric comparisons
  if (['>', '<', '>=', '<='].includes(operator)) {
    const numAttrValue = parseFloat(attrValue);
    const numQueryValue = parseFloat(queryValue);
    
    if (!isNaN(numAttrValue) && !isNaN(numQueryValue)) {
      switch(operator) {
        case '>': return numAttrValue > numQueryValue;
        case '<': return numAttrValue < numQueryValue;
        case '>=': return numAttrValue >= numQueryValue;
        case '<=': return numAttrValue <= numQueryValue;
      }
    }
  }
  
  // Handle string comparisons - use case-insensitive comparison
  switch(operator) {
    case '=':
      return attrValue.toLowerCase() === queryValue.toLowerCase();
    case '!=':
      return attrValue.toLowerCase() !== queryValue.toLowerCase();
    default:
      return attrValue.toLowerCase() === queryValue.toLowerCase();
  }
}

// Code Structure Analysis Endpoint
app.get('/api/code-structure', async (req, res) => {
  try {
    const codeStructure = await analyzeCodebase();
    res.json(codeStructure);
  } catch (error) {
    console.error('Error analyzing codebase:', error);
    res.status(500).json({ error: 'Failed to analyze codebase' });
  }
});

// Function to analyze the codebase
async function analyzeCodebase() {
  const structure = {
    modules: {},
    functionCount: 0,
    variableCount: 0,
    relationships: []
  };
  
  try {
    // Get list of all JavaScript files
    const jsFiles = await getJavaScriptFiles();
    
    // Process each file
    for (const file of jsFiles) {
      try {
        const content = await fs.promises.readFile(file, 'utf8');
        const fileStructure = parseJavaScriptFile(content, file);
        structure.modules[file] = fileStructure;
        structure.functionCount += fileStructure.functions.length;
        structure.variableCount += fileStructure.variables.length;
        
        // Add relationships
        fileStructure.imports.forEach(importItem => {
          structure.relationships.push({
            from: file,
            to: importItem,
            type: 'import'
          });
        });
      } catch (fileError) {
        console.error(`Error processing file ${file}:`, fileError);
        // Continue with next file instead of failing completely
      }
    }
    
    return structure;
  } catch (error) {
    console.error('Error in analyzeCodebase:', error);
    // Return a valid structure even on error
    return structure;
  }
}

// Helper function to get all JavaScript files
async function getJavaScriptFiles() {
  try {
    const baseDir = path.join(__dirname, 'public/js');
    const serverFiles = [
      path.join(__dirname, 'server.js'),
      path.join(__dirname, 'database.js')
    ];
    
    // Make sure directories exist before trying to read them
    if (!fs.existsSync(baseDir)) {
      console.warn(`Directory ${baseDir} does not exist`);
      return serverFiles; // Just return server files if public/js doesn't exist
    }
    
    const clientFiles = await findFiles(baseDir, '.js');
    return [...serverFiles, ...clientFiles];
  } catch (error) {
    console.error('Error getting JavaScript files:', error);
    return []; // Return empty array on error
  }
}

// Recursively find files with a specific extension
async function findFiles(dir, ext) {
  const files = await fs.promises.readdir(dir, { withFileTypes: true });
  const result = [];
  
  for (const file of files) {
    const res = path.resolve(dir, file.name);
    if (file.isDirectory()) {
      const nestedFiles = await findFiles(res, ext);
      result.push(...nestedFiles);
    } else if (file.name.endsWith(ext)) {
      result.push(res);
    }
  }
  
  return result;
}

// Parse a JavaScript file to extract structure
function parseJavaScriptFile(content, filename) {
  const functions = [];
  const variables = [];
  const imports = [];
  
  // Find function declarations
  const functionPattern = /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
  let match;
  while ((match = functionPattern.exec(content)) !== null) {
    functions.push({
      name: match[1],
      position: match.index
    });
  }
  
  // Find arrow functions assigned to variables
  const arrowFuncPattern = /const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:\([^)]*\)|[a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>/g;
  while ((match = arrowFuncPattern.exec(content)) !== null) {
    functions.push({
      name: match[1],
      position: match.index,
      type: 'arrow'
    });
  }
  
  // Find variable declarations
  const varPattern = /(?:var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g;
  while ((match = varPattern.exec(content)) !== null) {
    variables.push({
      name: match[1],
      position: match.index
    });
  }
  
  // Find requires (Node.js imports)
  const requirePattern = /require\(['"]([^'"]+)['"]\)/g;
  while ((match = requirePattern.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  return {
    functions,
    variables,
    imports,
    complexity: calculateComplexity(content),
    loc: content.split('\n').length
  };
}

// Calculate code complexity
function calculateComplexity(content) {
  // Simple complexity metric based on conditional statements, loops and functions
  let complexity = 0;
  
  // Count conditional statements
  const ifCount = (content.match(/if\s*\(/g) || []).length;
  const switchCount = (content.match(/switch\s*\(/g) || []).length;
  
  // Count loops
  const forCount = (content.match(/for\s*\(/g) || []).length;
  const whileCount = (content.match(/while\s*\(/g) || []).length;
  
  // Count function declarations
  const functionCount = (content.match(/function\s+/g) || []).length;
  
  // Weighted sum
  complexity = ifCount + switchCount * 2 + forCount + whileCount + functionCount * 0.5;
  
  return complexity;
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
