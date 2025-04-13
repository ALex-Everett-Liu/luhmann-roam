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

// Add Font Manager API endpoints
app.post('/api/download-font', async (req, res) => {
  try {
    const { fontName, fontUrl, fontType } = req.body;
    
    if (!fontName || !fontUrl) {
      return res.status(400).json({ success: false, error: 'Missing font information' });
    }
    
    console.log(`Downloading font: ${fontName} (${fontType}) from ${fontUrl}`);
    
    // Create fonts directory if it doesn't exist
    const fontsDir = path.join(__dirname, 'public', 'fonts');
    if (!fs.existsSync(fontsDir)) {
      fs.mkdirSync(fontsDir, { recursive: true });
    }
    
    // Create a type-specific directory
    const typeFontsDir = path.join(fontsDir, fontType);
    if (!fs.existsSync(typeFontsDir)) {
      fs.mkdirSync(typeFontsDir, { recursive: true });
    }
    
    // First fetch the CSS to extract the actual font files
    const response = await fetch(fontUrl);
    const cssText = await response.text();
    
    // Extract font URLs
    const urlRegex = /url\(([^)]+)\)/g;
    const fontUrls = [];
    let match;
    
    while ((match = urlRegex.exec(cssText)) !== null) {
      let extractedUrl = match[1].trim();
      
      // Remove quotes if present
      if ((extractedUrl.startsWith('"') && extractedUrl.endsWith('"')) || 
          (extractedUrl.startsWith("'") && extractedUrl.endsWith("'"))) {
        extractedUrl = extractedUrl.slice(1, -1);
      }
      
      // Make sure we have absolute URLs
      if (extractedUrl.startsWith('//')) {
        extractedUrl = 'https:' + extractedUrl;
      } else if (!extractedUrl.startsWith('http')) {
        // Handle relative URLs
        const fontUrlObj = new URL(fontUrl);
        if (extractedUrl.startsWith('/')) {
          extractedUrl = `${fontUrlObj.origin}${extractedUrl}`;
        } else {
          const pathDir = fontUrlObj.pathname.substring(0, fontUrlObj.pathname.lastIndexOf('/'));
          extractedUrl = `${fontUrlObj.origin}${pathDir}/${extractedUrl}`;
        }
      }
      
      fontUrls.push(extractedUrl);
    }
    
    if (fontUrls.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No font URLs found in CSS' 
      });
    }
    
    console.log(`Found ${fontUrls.length} font URLs to download`);
    
    // Download each font file
    const downloadedFiles = [];
    
    for (const url of fontUrls) {
      // Extract filename from URL
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
      
      // Skip if already downloaded
      const outputPath = path.join(typeFontsDir, filename);
      if (fs.existsSync(outputPath)) {
        console.log(`Font file already exists: ${filename}`);
        downloadedFiles.push({ filename, path: outputPath });
        continue;
      }
      
      console.log(`Downloading font file: ${filename}`);
      
      // Download the file
      const fontResponse = await fetch(url);
      const buffer = await fontResponse.arrayBuffer();
      
      // Save to file
      fs.writeFileSync(outputPath, Buffer.from(buffer));
      console.log(`Saved font file to: ${outputPath}`);
      downloadedFiles.push({ filename, path: outputPath });
    }
    
    // Generate a CSS file for the downloaded font
    const cssOutputPath = path.join(typeFontsDir, `${sanitizeFilename(fontName)}.css`);
    
    // Modify the CSS to use local paths
    let localCss = cssText;
    
    // Replace URLs in the CSS
    for (const { filename } of downloadedFiles) {
      // Match both with and without quotes
      const urlPatterns = [
        new RegExp(`url\\(["']?[^)]*${escapeRegExp(filename)}["']?\\)`, 'g'),
        new RegExp(`url\\([^)]*${escapeRegExp(filename)}\\)`, 'g')
      ];
      
      for (const pattern of urlPatterns) {
        localCss = localCss.replace(pattern, `url(/fonts/${fontType}/${filename})`);
      }
    }
    
    // Save the modified CSS
    fs.writeFileSync(cssOutputPath, localCss);
    console.log(`Generated CSS file: ${cssOutputPath}`);
    
    res.json({
      success: true,
      fontName,
      fontType,
      files: downloadedFiles,
      cssPath: `/fonts/${fontType}/${sanitizeFilename(fontName)}.css`
    });
    
  } catch (error) {
    console.error('Error downloading font:', error);
    res.status(500).json({
      success: false,
      error: `Failed to download font: ${error.message}`
    });
  }
});

// Helper function to sanitize filenames
function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
}

// Helper function to escape regex special characters
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
