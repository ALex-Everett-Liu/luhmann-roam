// nodeController.js - Logic for node operations
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// Define markdown directory path
const markdownDir = path.join(__dirname, '..', 'markdown');

/**
 * Get all root nodes (top-level nodes)
 * GET /api/nodes
 */
exports.getAllRootNodes = async (req, res) => {
  try {
    const db = req.db;
    
    // Get nodes with link counts
    const nodes = await db.all(`
      SELECT n.*, n.sequence_id,
        (SELECT COUNT(*) FROM links WHERE from_node_id = n.id OR to_node_id = n.id) as link_count
      FROM nodes n 
      WHERE n.parent_id IS NULL 
      ORDER BY n.position
    `);
    
    // Process line breaks for display
    const processedNodes = nodes.map(node => {
      console.log(`Node ${node.id} content from DB:`, JSON.stringify(node.content));
      const newContent = node.content ? node.content.replace(/\\n/g, '\n') : node.content;
      console.log(`Node ${node.id} content after replace:`, JSON.stringify(newContent));
      return {
        ...node,
        content: newContent,
        content_zh: node.content_zh ? node.content_zh.replace(/\\n/g, '\n') : node.content_zh
      };
    });
    
    res.json(processedNodes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get children of a node
 * GET /api/nodes/:id/children
 */
exports.getChildNodes = async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db;
    
    // Get children with link counts
    const nodes = await db.all(`
      SELECT n.*, 
        (SELECT COUNT(*) FROM links WHERE from_node_id = n.id OR to_node_id = n.id) as link_count
      FROM nodes n 
      WHERE n.parent_id = ? 
      ORDER BY n.position
    `, id);
    
    // Process line breaks for display
    const processedNodes = nodes.map(node => {
      console.log(`Node ${node.id} content from DB:`, JSON.stringify(node.content));
      const newContent = node.content ? node.content.replace(/\\n/g, '\n') : node.content;
      console.log(`Node ${node.id} content after replace:`, JSON.stringify(newContent));
      return {
        ...node,
        content: newContent,
        content_zh: node.content_zh ? node.content_zh.replace(/\\n/g, '\n') : node.content_zh
      };
    });
    
    res.json(processedNodes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Create a new node
 * POST /api/nodes
 */
exports.createNode = async (req, res) => {
  try {
    const { content, content_zh, parent_id, position } = req.body;
    const db = req.db;
    const now = Date.now();
    const id = uuidv4();
    
    await db.run(
      'INSERT INTO nodes (id, content, content_zh, parent_id, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, content, content_zh, parent_id, position, now, now]
    );
    
    const node = await db.get('SELECT * FROM nodes WHERE id = ?', id);
    res.status(201).json(node);
  } catch (error) {
    res.status(500).json({ error: error.message }); // If there was a duplicate, the database would reject it with a UNIQUE constraint error
  }
};

/**
 * Update a node
 * PUT /api/nodes/:id
 */
exports.updateNode = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, content_zh, parent_id, position, is_expanded, node_size } = req.body;
    const db = req.db;
    const now = Date.now();
    
    let query = 'UPDATE nodes SET updated_at = ?';
    const params = [now];
    
    // Dynamic query building - only update fields that are provided
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
    
    if (node_size !== undefined) {
      query += ', node_size = ?';
      params.push(node_size);
    }
    
    query += ' WHERE id = ?'; // The query is finalized by adding a WHERE clause to specify which node to update based on its ID. The id is added to the parameters array.
    params.push(id);
    
    // Add these logging statements before the database update
    console.log('Executing update with query:', query);
    console.log('Executing update with params:', JSON.stringify(params));
    
    await db.run(query, params);
    const node = await db.get('SELECT * FROM nodes WHERE id = ?', id); // Fetching the Updated Node: After the update, this line retrieves the complete record of the updated node from the database using its ID. This is useful for returning the full details of the node in the response.
    
    // Add this logging statement after fetching the updated node
    console.log('Node after update from DB:', JSON.stringify(node));
    
    res.json(node);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete a node
 * DELETE /api/nodes/:id
 */
exports.deleteNode = async (req, res) => {
  try {
    const { id } = req.params; // Extract the node ID from the request parameters
    const db = req.db; // Get the database connection from the request object
    
    // Start a transaction
    await db.run('BEGIN TRANSACTION');
    
    // Recursive function to delete children
    const deleteChildren = async (nodeId) => { // takes a nodeId as an argument.
      const children = await db.all('SELECT id FROM nodes WHERE parent_id = ?', nodeId); // retrieves all nodes that have the current node as their parent.
      for (const child of children) {
        await deleteChildren(child.id); // For each child node found, the function calls itself recursively to delete that child's children, ensuring that all descendants are deleted before the parent node.
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
    res.status(204).send(); // indicate that the deletion was successful and there is no content to return.
  } catch (error) {
    await db.run('ROLLBACK');
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get a single node by ID
 * GET /api/nodes/:id
 */
exports.getNodeById = async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db;
    const node = await db.get('SELECT * FROM nodes WHERE id = ?', id);
    
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    // Process line breaks for display
    const processedNode = {
      ...node,
      content: node.content ? node.content.replace(/\\n/g, '\n') : node.content,
      content_zh: node.content_zh ? node.content_zh.replace(/\\n/g, '\n') : node.content_zh
    };
    
    console.log(`Node ${id} content from DB:`, JSON.stringify(node.content));
    const newContent = node.content ? node.content.replace(/\\n/g, '\n') : node.content;
    console.log(`Node ${id} content after replace:`, JSON.stringify(newContent));
    
    res.json(processedNode);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Reorder nodes (when dragging)
 * POST /api/nodes/reorder
 */
exports.reorderNodes = async (req, res) => {
  try {
    const { nodeId, newParentId, newPosition } = req.body;
    const db = req.db;
    
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
};

/**
 * Toggle node expansion
 * POST /api/nodes/:id/toggle
 */
exports.toggleNode = async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db;
    const node = await db.get('SELECT is_expanded FROM nodes WHERE id = ?', id);
    
    await db.run(
      'UPDATE nodes SET is_expanded = ?, updated_at = ? WHERE id = ?',
      [!node.is_expanded, Date.now(), id]
    );
    
    res.json({ id, is_expanded: !node.is_expanded });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Shift node positions
 * POST /api/nodes/reorder/shift
 */
exports.shiftNodePositions = async (req, res) => {
  try {
    const { parentId, position, shift } = req.body;
    const db = req.db;
    
    // Input validation
    if (shift === undefined || position === undefined) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
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
    const db = req.db;
    await db.run('ROLLBACK');
    res.status(500).json({ error: 'Failed to update node positions' });
  }
};

/**
 * Search for nodes
 * GET /api/nodes/search
 */
exports.searchNodes = async (req, res) => {
  try {
    const query = req.query.q;
    const lang = req.query.lang || 'en'; // Optional language parameter
    const hasMarkdown = req.query.has_markdown === 'true'; // Markdown parameter
    const advanced = req.query.advanced === 'true'; // Advanced search parameter
    
    const db = req.db;
    
    // Base WHERE clause
    let whereClause = '';
    const params = [];
    
    // Build WHERE clause based on parameters
    if (query && query.length >= 2) {
      if (advanced) {
        // Parse advanced query with logical operators
        const contentField = lang === 'zh' ? 'content_zh' : 'content';
        const { clause, queryParams } = parseAdvancedQuery(query, contentField);
        
        whereClause = `WHERE ${clause}`;
        params.push(...queryParams);
      } else {
        // Simple search (existing functionality)
        const searchQuery = `%${query}%`;
        const contentField = lang === 'zh' ? 'content_zh' : 'content';
        
        whereClause = `WHERE (n.${contentField} LIKE ? OR n.content LIKE ? OR n.content_zh LIKE ?)`;
        params.push(searchQuery, searchQuery, searchQuery);
      }
    }
    
    // Add markdown filter if requested
    if (hasMarkdown) {
      whereClause = whereClause ? `${whereClause} AND n.has_markdown = 1` : 'WHERE n.has_markdown = 1';
    }
    
    // If no search query and no has_markdown filter, return empty array
    if (!whereClause) {
      return res.json([]);
    }
    
    // Modified query to include timestamps and join with parent nodes to get their content
    const sqlQuery = `
      SELECT 
        n.id, 
        n.content, 
        n.content_zh, 
        n.parent_id,
        n.is_expanded,
        n.has_markdown,
        n.position,
        n.created_at,
        n.updated_at,
        (SELECT COUNT(*) FROM links WHERE from_node_id = n.id OR to_node_id = n.id) as link_count,
        p.content as parent_content,
        p.content_zh as parent_content_zh
      FROM 
        nodes n
      LEFT JOIN 
        nodes p ON n.parent_id = p.id
      ${whereClause}
      ORDER BY 
        n.content
      LIMIT 100
    `;
    
    const nodes = await db.all(sqlQuery, params);
    
    // When returning nodes, ensure line breaks are preserved
    const processedNodes = nodes.map(node => ({
      ...node,
      content: node.content ? node.content.replace(/\\n/g, '\n') : node.content,
      content_zh: node.content_zh ? node.content_zh.replace(/\\n/g, '\n') : node.content_zh
    }));
    
    res.json(processedNodes);
  } catch (error) {
    console.error('Error searching nodes:', error);
    res.status(500).json({ error: 'Error searching nodes' });
  }
};

/**
 * Parse advanced search query with logical operators
 * @param {string} query - The query string with logical operators
 * @param {string} contentField - The field to search in ('content' or 'content_zh')
 * @returns {Object} Object with clause and queryParams
 */
function parseAdvancedQuery(query, contentField) {
  // Regular expressions for parsing
  const quotedPhraseRegex = /"(.*?)"/g;
  const wholeWordRegex = /w:(\w+)/g;
  const wildcardRegex = /(\w+)\*/g;
  
  // Replace tokens to preserve them during parsing
  let tokenizedQuery = query;
  const tokens = [];
  let tokenIndex = 0;
  
  // Save quoted phrases as tokens
  let match;
  while ((match = quotedPhraseRegex.exec(query)) !== null) {
    const tokenKey = `__TOKEN${tokenIndex}__`;
    tokens[tokenIndex] = { type: 'phrase', value: match[1] };
    tokenizedQuery = tokenizedQuery.replace(match[0], tokenKey);
    tokenIndex++;
  }
  
  // Save whole word searches as tokens
  while ((match = wholeWordRegex.exec(query)) !== null) {
    const tokenKey = `__TOKEN${tokenIndex}__`;
    tokens[tokenIndex] = { type: 'whole', value: match[1] };
    tokenizedQuery = tokenizedQuery.replace(match[0], tokenKey);
    tokenIndex++;
  }
  
  // Save wildcard searches as tokens
  while ((match = wildcardRegex.exec(query)) !== null) {
    const tokenKey = `__TOKEN${tokenIndex}__`;
    tokens[tokenIndex] = { type: 'wildcard', value: match[1] };
    tokenizedQuery = tokenizedQuery.replace(match[0], tokenKey);
    tokenIndex++;
  }
  
  // Split by logical operators
  const parts = [];
  const operators = [];
  
  // Handle AND operator
  tokenizedQuery.split(/\bAND\b/).forEach((andPart, index) => {
    if (index > 0) operators.push('AND');
    
    // Handle OR operator within AND blocks
    const orParts = andPart.split(/\bOR\b/);
    if (orParts.length > 1) {
      // This is an OR block
      orParts.forEach((orPart, orIndex) => {
        if (orIndex > 0) operators.push('OR');
        
        // Handle NOT operator
        const notParts = orPart.split(/\bNOT\b/);
        if (notParts.length > 1) {
          // This has a NOT clause
          notParts.forEach((notPart, notIndex) => {
            if (notIndex > 0) operators.push('NOT');
            parts.push(notPart.trim());
          });
        } else {
          parts.push(orPart.trim());
        }
      });
    } else {
      // Handle NOT operator in a non-OR block
      const notParts = andPart.split(/\bNOT\b/);
      if (notParts.length > 1) {
        // This has a NOT clause
        notParts.forEach((notPart, notIndex) => {
          if (notIndex > 0) operators.push('NOT');
          parts.push(notPart.trim());
        });
      } else {
        parts.push(andPart.trim());
      }
    }
  });
  
  // Clean up the parts to remove empty entries
  const cleanParts = parts.filter(part => part.trim() !== '');
  
  // Build the SQL clause
  let clause = '';
  const queryParams = [];
  
  for (let i = 0; i < cleanParts.length; i++) {
    let part = cleanParts[i];
    
    // Restore tokens
    for (let j = 0; j < tokens.length; j++) {
      const tokenKey = `__TOKEN${j}__`;
      if (part.includes(tokenKey)) {
        const token = tokens[j];
        part = part.replace(tokenKey, token.value);
      }
    }
    
    let partClause = '';
    
    // Check if this part is a token
    const tokenMatch = part.match(/__TOKEN(\d+)__/);
    if (tokenMatch) {
      const tokenId = parseInt(tokenMatch[1]);
      const token = tokens[tokenId];
      
      if (token.type === 'phrase') {
        // Exact phrase search
        partClause = `(n.${contentField} LIKE ? OR n.content LIKE ? OR n.content_zh LIKE ?)`;
        queryParams.push(`%${token.value}%`, `%${token.value}%`, `%${token.value}%`);
      } else if (token.type === 'whole') {
        // Whole word search using word boundaries in LIKE
        partClause = `(n.${contentField} REGEXP ? OR n.content REGEXP ? OR n.content_zh REGEXP ?)`;
        queryParams.push(`\\b${token.value}\\b`, `\\b${token.value}\\b`, `\\b${token.value}\\b`);
      } else if (token.type === 'wildcard') {
        // Wildcard search (prefix search)
        partClause = `(n.${contentField} LIKE ? OR n.content LIKE ? OR n.content_zh LIKE ?)`;
        queryParams.push(`${token.value}%`, `${token.value}%`, `${token.value}%`);
      }
    } else if (part.startsWith('w:')) {
      // Whole word search
      const word = part.substring(2);
      partClause = `(n.${contentField} REGEXP ? OR n.content REGEXP ? OR n.content_zh REGEXP ?)`;
      queryParams.push(`\\b${word}\\b`, `\\b${word}\\b`, `\\b${word}\\b`);
    } else {
      // Normal substring search
      partClause = `(n.${contentField} LIKE ? OR n.content LIKE ? OR n.content_zh LIKE ?)`;
      queryParams.push(`%${part}%`, `%${part}%`, `%${part}%`);
    }
    
    // Add the operator
    if (i === 0) {
      clause = partClause;
    } else {
      const operator = operators[i - 1];
      if (operator === 'AND') {
        clause = `${clause} AND ${partClause}`;
      } else if (operator === 'OR') {
        clause = `${clause} OR ${partClause}`;
      } else if (operator === 'NOT') {
        clause = `${clause} AND NOT ${partClause}`;
      }
    }
  }
  
  return { clause, queryParams };
}

/**
 * Get a single node by sequence ID
 * GET /api/nodes/sequence/:sequence_id
 */
exports.getNodeBySequenceId = async (req, res) => {
  try {
    const { sequence_id } = req.params;
    
    // Validate input
    const sequenceIdNum = parseInt(sequence_id);
    if (isNaN(sequenceIdNum) || sequenceIdNum <= 0) {
      return res.status(400).json({ error: 'Invalid sequence ID format' });
    }
    
    const db = req.db;
    const node = await db.get('SELECT * FROM nodes WHERE sequence_id = ?', sequenceIdNum);
    
    if (!node) {
      return res.status(404).json({ error: 'Node not found with the provided sequence ID' });
    }
    
    res.json(node);
  } catch (error) {
    console.error(`Error retrieving node by sequence ID ${req.params.sequence_id}:`, error);
    res.status(500).json({ error: 'Database error when retrieving node by sequence ID' });
  }
};

// Add additional controller functions for other node operations...
// (Remaining operations like indenting, outdenting, fixing positions, etc.)