const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { getDb, initializeDatabase } = require('./database');
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

// Add this middleware to provide the database connection to all routes
app.use((req, res, next) => {
  req.db = db;
  next();
});

// Make sure this middleware is placed BEFORE your routes are defined
// but AFTER the database is initialized

// Create markdown directory if it doesn't exist
const markdownDir = path.join(__dirname, 'markdown');
if (!fs.existsSync(markdownDir)) {
  fs.mkdirSync(markdownDir);
}

// Blog templates directory
const TEMPLATES_DIR = path.join(__dirname, 'templates', 'blog');
const BLOG_PAGES_DIR = path.join(__dirname, 'public', 'blog');

// Ensure the blog pages directory exists
if (!fs.existsSync(BLOG_PAGES_DIR)) {
  fs.mkdirSync(BLOG_PAGES_DIR, { recursive: true });
}

// Routes

// Use the node routes
app.use('/api/nodes', nodeRoutes);

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

// Task Management API Endpoints

// Set up task routes
app.use('/api/tasks', taskRoutes);

// Add this where you set up the other routes (near the taskRoutes)
app.use('/api/code-analysis', codeAnalysisRoutes);

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
    await db.run('BEGIN TRANSACTION');
    
    // First, get all nodes at this level
    let siblings;
    if (parentId) {
      siblings = await db.all(
        'SELECT id, position FROM nodes WHERE parent_id = ? ORDER BY position, id',
        parentId
      );
    } else {
      siblings = await db.all(
        'SELECT id, position FROM nodes WHERE parent_id IS NULL ORDER BY position, id'
      );
    }
    
    // Assign new sequential positions
    for (let i = 0; i < siblings.length; i++) {
      await db.run(
        'UPDATE nodes SET position = ?, updated_at = ? WHERE id = ?',
        [i, Date.now(), siblings[i].id]
      );
    }
    
    await db.run('COMMIT');
    
    res.json({ 
      success: true, 
      message: `Fixed ${conflicts.length} position conflicts` 
    });
  } catch (error) {
    console.error('Error fixing positions:', error);
    await db.run('ROLLBACK');
    res.status(500).json({ error: 'Failed to fix positions' });
  }
});

// Add this endpoint to fix specific position conflicts
app.post('/api/nodes/fix-position-conflict', async (req, res) => {
  try {
    const { parentId, nodeId, position, conflictingNodes } = req.body;
    
    // Start a transaction to ensure all updates succeed or fail together
    await db.run('BEGIN TRANSACTION');
    
    // Keep the chosen node at its position
    // For all conflicting nodes, find empty positions and assign them
    
    // Get all siblings to find available positions
    let siblings;
    if (parentId) {
      siblings = await db.all(
        'SELECT id, position FROM nodes WHERE parent_id = ? ORDER BY position',
        parentId
      );
    } else {
      siblings = await db.all(
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
      await db.run(
        'UPDATE nodes SET position = ?, updated_at = ? WHERE id = ?',
        [nextPosition, Date.now(), cNodeId]
      );
      
      // Mark this position as used
      usedPositions.add(nextPosition);
      
      // Increment to the next potential position
      nextPosition++;
    }
    
    await db.run('COMMIT');
    
    res.json({ 
      success: true, 
      message: `Resolved conflict at position ${position}` 
    });
  } catch (error) {
    console.error('Error fixing position conflict:', error);
    await db.run('ROLLBACK');
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
app.post('/api/backup', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
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
    const dbPath = path.join(__dirname, 'outliner.db');
    const backupFilename = `outliner-${timestamp}.db`;
    const backupPath = path.join(backupDir, backupFilename);
    
    // Copy the database file
    fs.copyFileSync(dbPath, backupPath);
    
    console.log(`Database backup created: ${backupFilename}`);
    
    res.status(200).json({
      success: true,
      filename: backupFilename,
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
// app.use('/api/links', linkRoutes); // still handling link and markdown operations directly in the server.js file rather than through separate route modules.
// app.use('/api/markdown', markdownRoutes);
app.use('/api/fonts', fontRoutes);

// API endpoint to get available blog templates
app.get('/api/blog/templates', (req, res) => {
  try {
    // Check if templates directory exists
    if (!fs.existsSync(TEMPLATES_DIR)) {
      fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
      
      // Create a default template if none exist
      const defaultTemplateDir = path.join(TEMPLATES_DIR, 'default');
      if (!fs.existsSync(defaultTemplateDir)) {
        fs.mkdirSync(defaultTemplateDir, { recursive: true });
        
        // Create a simple default template
        const templateHtml = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{{title}}</title>
            <style>
              body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
              }
              header {
                margin-bottom: 30px;
                border-bottom: 1px solid #eee;
                padding-bottom: 10px;
              }
              .metadata {
                color: #666;
                font-size: 0.9em;
              }
              img {
                max-width: 100%;
                height: auto;
                border-radius: 4px;
              }
              code {
                background-color: #f5f5f5;
                padding: 2px 4px;
                border-radius: 3px;
              }
              pre {
                background-color: #f5f5f5;
                padding: 10px;
                border-radius: 3px;
                overflow-x: auto;
              }
              blockquote {
                border-left: 3px solid #ccc;
                margin-left: 0;
                padding-left: 15px;
                color: #666;
              }
            </style>
          </head>
          <body>
            <header>
              <h1>{{title}}</h1>
              <div class="metadata">
                <span>Posted on: {{date}}</span>
              </div>
            </header>
            <main>
              {{content}}
            </main>
            <footer>
              <p>&copy; {{year}} - Generated from Luhmann-Roam</p>
            </footer>
          </body>
          </html>
        `;
        
        fs.writeFileSync(path.join(defaultTemplateDir, 'template.html'), templateHtml);
        
        // Create a preview image (dummy content)
        const previewHtml = `
          <svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
            <rect width="400" height="300" fill="#f5f5f5"/>
            <text x="200" y="150" font-family="Arial" font-size="24" text-anchor="middle">Default Template</text>
          </svg>
        `;
        fs.writeFileSync(path.join(defaultTemplateDir, 'preview.svg'), previewHtml);
      }
    }
    
    // Read template directories
    const templates = [];
    const templateDirs = fs.readdirSync(TEMPLATES_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    // Get info for each template
    templateDirs.forEach(templateDir => {
      const templatePath = path.join(TEMPLATES_DIR, templateDir);
      const templateFile = path.join(templatePath, 'template.html');
      
      if (fs.existsSync(templateFile)) {
        // Find a preview image
        let previewImage = null;
        const imageExtensions = ['.png', '.jpg', '.jpeg', '.svg'];
        for (const ext of imageExtensions) {
          const previewFile = path.join(templatePath, 'preview' + ext);
          if (fs.existsSync(previewFile)) {
            previewImage = `/templates/blog/${templateDir}/preview${ext}`;
            break;
          }
        }
        
        templates.push({
          id: templateDir,
          name: templateDir.charAt(0).toUpperCase() + templateDir.slice(1).replace(/-/g, ' '),
          preview_image: previewImage
        });
      }
    });
    
    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// API endpoint to generate a blog page
app.post('/api/blog/generate', async (req, res) => {
  const { nodeId, templateId, title, slug } = req.body;
  
  if (!nodeId || !templateId || !title || !slug) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Validate slug format (alphanumeric with hyphens)
  const slugRegex = /^[a-z0-9-]+$/;
  if (!slugRegex.test(slug)) {
    return res.status(400).json({ error: 'Invalid slug format. Use lowercase letters, numbers, and hyphens only.' });
  }
  
  try {
    const db = await getDb();
    
    // Check if slug already exists
    const existingPage = await db.get('SELECT id FROM blog_pages WHERE slug = ?', [slug]);
    
    if (existingPage) {
      return res.status(400).json({ error: 'A blog page with this slug already exists' });
    }
    
    // Get the markdown content for the node
    const nodeMarkdown = await db.get('SELECT content FROM node_markdown WHERE node_id = ?', [nodeId]);
    
    if (!nodeMarkdown) {
      return res.status(404).json({ error: 'No markdown content found for this node' });
    }
    
    // Get the template
    const templateFile = path.join(TEMPLATES_DIR, templateId, 'template.html');
    if (!fs.existsSync(templateFile)) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    let templateHtml = fs.readFileSync(templateFile, 'utf8');
    
    // Convert markdown to HTML
    const contentHtml = markdownToHtml(nodeMarkdown.content);
    
    // Replace placeholders in the template
    const date = new Date().toLocaleDateString();
    const year = new Date().getFullYear();
    
    templateHtml = templateHtml
      .replace(/{{title}}/g, title)
      .replace(/{{content}}/g, contentHtml)
      .replace(/{{date}}/g, date)
      .replace(/{{year}}/g, year);
    
    // Create blog directory if it doesn't exist
    if (!fs.existsSync(BLOG_PAGES_DIR)) {
      fs.mkdirSync(BLOG_PAGES_DIR, { recursive: true });
    }
    
    // Write the HTML file
    const blogFilePath = path.join(BLOG_PAGES_DIR, `${slug}.html`);
    fs.writeFileSync(blogFilePath, templateHtml);
    
    // Save the blog page info to the database
    const result = await db.run(
      'INSERT INTO blog_pages (node_id, template_id, title, slug) VALUES (?, ?, ?, ?)',
      [nodeId, templateId, title, slug]
    );
    
    res.json({ success: true, slug });
  } catch (error) {
    console.error('Error generating blog page:', error);
    res.status(500).json({ error: 'Failed to generate blog page' });
  }
});

// API endpoint to get all published blog pages
app.get('/api/blog/pages', async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all('SELECT * FROM blog_pages ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching blog pages:', err);
    return res.status(500).json({ error: 'Failed to fetch blog pages' });
  }
});

// API endpoint to get a specific blog page
app.get('/api/blog/pages/:id', async (req, res) => {
  try {
    const db = await getDb();
    const row = await db.get('SELECT * FROM blog_pages WHERE id = ?', [req.params.id]);
    
    if (!row) {
      return res.status(404).json({ error: 'Blog page not found' });
    }
    
    res.json(row);
  } catch (err) {
    console.error('Error fetching blog page:', err);
    return res.status(500).json({ error: 'Failed to fetch blog page' });
  }
});

// API endpoint to get HTML content of a blog page
app.get('/api/blog/pages/html/:slug', (req, res) => {
  const blogFilePath = path.join(BLOG_PAGES_DIR, `${req.params.slug}.html`);
  
  if (!fs.existsSync(blogFilePath)) {
    return res.status(404).json({ error: 'Blog page not found' });
  }
  
  const html = fs.readFileSync(blogFilePath, 'utf8');
  res.set('Content-Type', 'text/html');
  res.send(html);
});

// API endpoint to update HTML content of a blog page
app.post('/api/blog/pages/html/:slug', async (req, res) => {
  const blogFilePath = path.join(BLOG_PAGES_DIR, `${req.params.slug}.html`);
  
  if (!fs.existsSync(blogFilePath)) {
    return res.status(404).json({ error: 'Blog page not found' });
  }
  
  // Get the raw HTML content from the request body
  let htmlContent = '';
  req.on('data', chunk => {
    htmlContent += chunk.toString();
  });
  
  req.on('end', async () => {
    try {
      // Write the HTML file
      fs.writeFileSync(blogFilePath, htmlContent);
      
      // Update the 'updated_at' timestamp in the database
      const db = await getDb();
      await db.run(
        'UPDATE blog_pages SET updated_at = CURRENT_TIMESTAMP WHERE slug = ?',
        [req.params.slug]
      );
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error saving blog HTML:', error);
      res.status(500).json({ error: 'Failed to save blog HTML' });
    }
  });
});

// API endpoint to delete a blog page
app.delete('/api/blog/pages/:id', async (req, res) => {
  try {
    const db = await getDb();
    
    // Get the slug for the page to delete the file
    const row = await db.get('SELECT slug FROM blog_pages WHERE id = ?', [req.params.id]);
    
    if (!row) {
      return res.status(404).json({ error: 'Blog page not found' });
    }
    
    // Delete the HTML file
    const blogFilePath = path.join(BLOG_PAGES_DIR, `${row.slug}.html`);
    if (fs.existsSync(blogFilePath)) {
      fs.unlinkSync(blogFilePath);
    }
    
    // Delete the database entry
    await db.run('DELETE FROM blog_pages WHERE id = ?', [req.params.id]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting blog page:', error);
    res.status(500).json({ error: 'Failed to delete blog page' });
  }
});

// Serve blog pages
app.get('/blog/:slug', (req, res) => {
  const blogFilePath = path.join(BLOG_PAGES_DIR, `${req.params.slug}.html`);
  
  if (fs.existsSync(blogFilePath)) {
    res.sendFile(blogFilePath);
  } else {
    res.status(404).send('Blog page not found');
  }
});

// Helper function to convert markdown to HTML
function markdownToHtml(markdown) {
  if (!markdown) return '';
  
  // Preserve any existing HTML img tags
  const htmlImgPlaceholders = [];
  markdown = markdown.replace(/<img\s+[^>]*>/gi, match => {
    const placeholder = `__HTML_IMG_${htmlImgPlaceholders.length}__`;
    htmlImgPlaceholders.push(match);
    return placeholder;
  });
  
  // Replace headers
  let html = markdown
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^##### (.+)$/gm, '<h5>$1</h5>')
    .replace(/^###### (.+)$/gm, '<h6>$1</h6>');
  
  // Replace images with custom size syntax
  html = html.replace(/!\[(.*?)\]\((.*?)\)(?:{([^}]*)})?/g, (match, alt, src, options) => {
    // Path handling
    if (!src.startsWith('http') && !src.startsWith('/')) {
      src = `/attachment/${src}`;
    }
    
    // Parse options like width and height
    let width = '';
    let height = '';
    
    if (options) {
      const widthMatch = options.match(/width=(\d+)/);
      const heightMatch = options.match(/height=(\d+)/);
      
      if (widthMatch) width = widthMatch[1];
      if (heightMatch) height = heightMatch[1];
    }
    
    const sizeAttrs = [];
    if (width) sizeAttrs.push(`width="${width}"`);
    if (height) sizeAttrs.push(`height="${height}"`);
    
    const sizeAttrsStr = sizeAttrs.length > 0 ? ' ' + sizeAttrs.join(' ') : '';
    
    return `<img src="${src}" alt="${alt}" class="blog-image"${sizeAttrsStr}>`;
  });
  
  // Restore HTML img tags
  htmlImgPlaceholders.forEach((imgTag, index) => {
    html = html.replace(`__HTML_IMG_${index}__`, imgTag);
  });
  
  // Replace bold and italic
  html = html
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\_\_(.+?)\_\_/g, '<strong>$1</strong>')
    .replace(/\_(.+?)\_/g, '<em>$1</em>');
  
  // Replace lists
  html = html
    .replace(/^\* (.+)$/gm, '<ul><li>$1</li></ul>')
    .replace(/^- (.+)$/gm, '<ul><li>$1</li></ul>')
    .replace(/^\d+\. (.+)$/gm, '<ol><li>$1</li></ol>');
  
  // Replace links
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
  
  // Replace inline code
  html = html.replace(/`(.+?)`/g, '<code>$1</code>');
  
  // Replace code blocks
  html = html.replace(/```(.+?)```/gs, '<pre><code>$1</code></pre>');
  
  // Replace paragraphs (two new lines)
  html = html.replace(/\n\s*\n/g, '</p><p>');
  
  // Wrap with paragraph tags if needed
  if (html && !html.startsWith('<')) {
    html = '<p>' + html + '</p>';
  }
  
  // Cleanup adjacent lists
  html = html
    .replace(/<\/ul><ul>/g, '')
    .replace(/<\/ol><ol>/g, '');
  
  return html;
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
